import { Router, Request, Response } from "express";
import { z } from "zod";
import { qdrantClient } from "../db/qdrant.js";
import { embedText } from "../utils/embeddings.js";
import { env } from "../env.js";

const router = Router();

const SearchQuery = z.object({
    q: z.string().min(1, "query is required"),
});

router.get("/search", async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = SearchQuery.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({ ok: false, error: parsed.error.flatten() });
            return;
        }

        const { q } = parsed.data;

        // Embed query
        let queryVector: number[];
        try {
            queryVector = await embedText(q);
        } catch (err: any) {
            if (err.message?.includes("OPENAI_API_KEY")) {
                res.status(400).json({ ok: false, error: err.message });
                return;
            }
            throw err;
        }

        // Search Qdrant
        const results = await qdrantClient.search(env.QDRANT_COLLECTION, {
            vector: queryVector,
            limit: 8,
            with_payload: true,
        });

        const chunks = results.map((r) => ({
            score: r.score,
            text: (r.payload as any)?.text || "",
            docId: (r.payload as any)?.docId || "",
            chunkIndex: (r.payload as any)?.chunkIndex ?? 0,
            title: (r.payload as any)?.title || "",
            author: (r.payload as any)?.author || "",
        }));

        res.json({ ok: true, query: q, results: chunks });
    } catch (err: any) {
        console.error("[Search] Error:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
