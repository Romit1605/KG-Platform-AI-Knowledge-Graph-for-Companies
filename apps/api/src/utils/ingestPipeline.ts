import { v4 as uuidv4 } from "uuid";
import { DocumentModel } from "../models/Document.js";
import { ChunkModel } from "../models/Chunk.js";
import { chunkText } from "./chunker.js";
import { embedTexts } from "./embeddings.js";
import { extractGraph, writeGraphToNeo4j } from "./graphExtractor.js";
import { extractTags } from "./taxonomyExtractor.js";
import { qdrantClient } from "../db/qdrant.js";
import { env } from "../env.js";

export interface IngestInput {
    title: string;
    author?: string;
    text: string;
    source?: string;
    workspaceId?: string;
}

export interface IngestResult {
    docId: string;
    chunks: number;
    extracted: any;
    tags: string[];
}

/**
 * Shared ingestion pipeline used by the main /ingest route and all connectors.
 * 1. Extract tags  2. Save doc  3. Chunk  4. Embed  5. Qdrant  6. Chunks in Mongo
 * 7. Extract graph  8. Write Neo4j
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
    const { title, author = "", text, source = "", workspaceId } = input;

    // 1. Extract tags (non-critical – swallow errors)
    let tags: string[] = [];
    try {
        tags = await extractTags(title, text);
    } catch {
        /* taxonomy extraction is best-effort */
    }

    // 2. Save doc in Mongo
    const doc = await DocumentModel.create({
        title,
        author,
        text,
        source,
        workspaceId: workspaceId || undefined,
        visibility: workspaceId ? "private" : "public",
        tags,
    });
    const docId = doc._id.toString();

    // 3. Chunk text
    const chunks = chunkText(text);

    // 4. Embed all chunks
    const vectors = await embedTexts(chunks.map((c) => c.text));

    // 5. Upsert vectors into Qdrant
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

    // 6. Save chunks in Mongo
    await ChunkModel.insertMany(
        chunks.map((chunk, i) => ({
            docId,
            chunkIndex: chunk.index,
            text: chunk.text,
            qdrantId: qdrantPoints[i].id,
        }))
    );

    // 7. Extract graph
    const extracted = await extractGraph(title, text, author);

    // 8. Write to Neo4j
    await writeGraphToNeo4j(docId, title, author, extracted);

    return { docId, chunks: chunks.length, extracted, tags };
}
