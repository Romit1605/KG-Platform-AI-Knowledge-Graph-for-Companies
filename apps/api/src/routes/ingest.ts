import { Router, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { DocumentModel } from "../models/Document.js";
import { ChunkModel } from "../models/Chunk.js";
import { chunkText } from "../utils/chunker.js";
import { embedTexts } from "../utils/embeddings.js";
import { extractGraph, writeGraphToNeo4j } from "../utils/graphExtractor.js";
import { extractTags } from "../utils/taxonomyExtractor.js";
import { qdrantClient } from "../db/qdrant.js";
import { env } from "../env.js";

const router = Router();

const IngestBody = z.object({
    title: z.string().min(1, "title is required"),
    author: z.string().optional().default(""),
    text: z.string().min(1, "text is required"),
    source: z.string().optional().default(""),
    workspaceId: z.string().optional(),
});

router.post("/ingest", async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate
        const parsed = IngestBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ ok: false, error: parsed.error.flatten() });
            return;
        }

        const { title, author, text, source } = parsed.data;
        const workspaceId = parsed.data.workspaceId;

        // 0. Extract tags (best-effort)
        let tags: string[] = [];
        try {
            tags = await extractTags(title, text);
        } catch { /* taxonomy is non-critical */ }

        // 1. Save doc in Mongo
        const doc = await DocumentModel.create({
            title, author, text, source,
            workspaceId: workspaceId || undefined,
            visibility: workspaceId ? "private" : "public",
            tags,
        });
        const docId = doc._id.toString();

        // 2. Chunk text
        const chunks = chunkText(text);

        // 3. Embed all chunks
        let vectors: number[][];
        try {
            vectors = await embedTexts(chunks.map((c) => c.text));
        } catch (err: any) {
            if (err.message?.includes("OPENAI_API_KEY")) {
                res.status(400).json({ ok: false, error: err.message });
                return;
            }
            throw err;
        }

        // 4. Upsert vectors into Qdrant + save chunk docs in Mongo
        const qdrantPoints = chunks.map((chunk, i) => ({
            id: uuidv4(),
            vector: vectors[i],
            payload: {
                docId,
                chunkIndex: chunk.index,
                title,
                author: author || "",
                text: chunk.text,
                workspaceId: workspaceId || "",
            },
        }));

        await qdrantClient.upsert(env.QDRANT_COLLECTION, {
            wait: true,
            points: qdrantPoints,
        });

        // 5. Save chunks in Mongo
        const chunkDocs = await ChunkModel.insertMany(
            chunks.map((chunk, i) => ({
                docId,
                chunkIndex: chunk.index,
                text: chunk.text,
                qdrantId: qdrantPoints[i].id,
            }))
        );

        // 6. Extract graph entities/relations/topics using LLM
        let extracted;
        try {
            extracted = await extractGraph(title, text, author);
        } catch (err: any) {
            if (err.message?.includes("OPENAI_API_KEY")) {
                res.status(400).json({ ok: false, error: err.message });
                return;
            }
            throw err;
        }

        // 7. Write to Neo4j
        await writeGraphToNeo4j(docId, title, author, extracted);

        res.json({
            ok: true,
            docId,
            chunks: chunkDocs.length,
            extracted,
        });
    } catch (err: any) {
        console.error("[Ingest] Error:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
