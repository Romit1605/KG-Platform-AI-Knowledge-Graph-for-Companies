import { Router, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { DocumentModel } from "../models/Document.js";
import { DocumentVersionModel } from "../models/DocumentVersion.js";
import { ChunkModel } from "../models/Chunk.js";
import { chunkText } from "../utils/chunker.js";
import { embedTexts } from "../utils/embeddings.js";
import { qdrantClient } from "../db/qdrant.js";
import { computeDiff } from "../utils/diffEngine.js";
import { env } from "../env.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /documents                                                    */
/* ------------------------------------------------------------------ */

router.get(
    "/documents",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { workspaceId, tag } = req.query;
            const filter: any = {};

            if (workspaceId) filter.workspaceId = workspaceId;
            if (tag) filter.tags = tag;

            const docs = await DocumentModel.find(filter)
                .select("title author source tags workspaceId visibility createdAt")
                .sort({ createdAt: -1 })
                .limit(100);

            res.json({ ok: true, documents: docs });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  PUT /documents/:id  — Update a document (triggers versioning)     */
/* ------------------------------------------------------------------ */

const UpdateBody = z.object({
    title: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
});

router.put(
    "/documents/:id",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = UpdateBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const doc = await DocumentModel.findById(req.params.id);
            if (!doc) {
                res.status(404).json({ ok: false, error: "Document not found" });
                return;
            }

            // Determine next version number
            const lastVersion = await DocumentVersionModel.findOne({
                documentId: doc._id.toString(),
            }).sort({ versionNumber: -1 });
            const nextVersion = (lastVersion?.versionNumber || 0) + 1;

            // Save current state as a version
            await DocumentVersionModel.create({
                documentId: doc._id.toString(),
                versionNumber: nextVersion,
                title: doc.title,
                content: doc.text,
            });

            // Determine what changed
            const newTitle = parsed.data.title || doc.title;
            const newText = parsed.data.text || doc.text;
            const textChanged = newText !== doc.text;

            // Update document
            doc.title = newTitle;
            if (parsed.data.text) doc.text = newText;
            await doc.save();

            // Re-embed only if text changed
            if (textChanged) {
                // Delete old chunks from Qdrant
                const oldChunks = await ChunkModel.find({
                    docId: doc._id.toString(),
                });
                const oldIds = oldChunks
                    .map((c) => c.qdrantId)
                    .filter(Boolean);
                if (oldIds.length > 0) {
                    await qdrantClient.delete(env.QDRANT_COLLECTION, {
                        wait: true,
                        points: oldIds,
                    });
                }

                // Remove old chunks from Mongo
                await ChunkModel.deleteMany({ docId: doc._id.toString() });

                // Re-chunk and re-embed
                const chunks = chunkText(newText);
                const vectors = await embedTexts(chunks.map((c) => c.text));

                const qdrantPoints = chunks.map((chunk, i) => ({
                    id: uuidv4(),
                    vector: vectors[i],
                    payload: {
                        docId: doc._id.toString(),
                        chunkIndex: chunk.index,
                        title: newTitle,
                        author: doc.author || "",
                        text: chunk.text,
                        workspaceId: doc.workspaceId || "",
                    },
                }));

                await qdrantClient.upsert(env.QDRANT_COLLECTION, {
                    wait: true,
                    points: qdrantPoints,
                });

                await ChunkModel.insertMany(
                    chunks.map((chunk, i) => ({
                        docId: doc._id.toString(),
                        chunkIndex: chunk.index,
                        text: chunk.text,
                        qdrantId: qdrantPoints[i].id,
                    }))
                );
            }

            res.json({
                ok: true,
                version: nextVersion,
                textChanged,
            });
        } catch (err: any) {
            console.error("[Documents] Update error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /documents/:id/versions                                       */
/* ------------------------------------------------------------------ */

router.get(
    "/documents/:id/versions",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const versions = await DocumentVersionModel.find({
                documentId: req.params.id,
            })
                .select("versionNumber title createdAt")
                .sort({ versionNumber: -1 });

            res.json({ ok: true, versions });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /documents/:id/diff?v1=&v2=                                   */
/* ------------------------------------------------------------------ */

router.get(
    "/documents/:id/diff",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const v1 = parseInt(req.query.v1 as string, 10);
            const v2 = parseInt(req.query.v2 as string, 10);

            if (isNaN(v1) || isNaN(v2)) {
                res.status(400).json({
                    ok: false,
                    error: "v1 and v2 query params (version numbers) are required",
                });
                return;
            }

            const [ver1, ver2] = await Promise.all([
                DocumentVersionModel.findOne({
                    documentId: req.params.id,
                    versionNumber: v1,
                }),
                DocumentVersionModel.findOne({
                    documentId: req.params.id,
                    versionNumber: v2,
                }),
            ]);

            if (!ver1 || !ver2) {
                res.status(404).json({
                    ok: false,
                    error: "One or both versions not found",
                });
                return;
            }

            const diff = computeDiff(ver1.content, ver2.content);
            res.json({ ok: true, v1, v2, diff });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
