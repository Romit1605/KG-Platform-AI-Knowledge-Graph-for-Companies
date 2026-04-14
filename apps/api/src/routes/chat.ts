import { Router, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { qdrantClient } from "../db/qdrant.js";
import { embedText } from "../utils/embeddings.js";
import { env, requireOpenAIKey } from "../env.js";
import { optionalJWT } from "../middleware/auth.js";
import { ChatLogModel } from "../models/ChatLog.js";
import { updateKnowledgeGapFromChat } from "../utils/knowledgeGap.js";
import { getNeo4jDriver } from "../db/neo4j.js";
import { DocumentModel } from "../models/Document.js";

const router = Router();

const ChatBody = z.object({
    question: z.string().min(1, "question is required"),
    mode: z.enum(["normal", "mentor"]).optional().default("normal"),
    workspaceId: z.string().optional().default("default"),
});

router.post("/chat", optionalJWT, async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = ChatBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ ok: false, error: parsed.error.flatten() });
            return;
        }

        const { question, mode, workspaceId } = parsed.data;

        // Embed query
        let queryVector: number[];
        try {
            queryVector = await embedText(question);
        } catch (err: any) {
            if (err.message?.includes("OPENAI_API_KEY")) {
                res.status(400).json({ ok: false, error: err.message });
                return;
            }
            throw err;
        }

        // Vector search top 6
        const results = await qdrantClient.search(env.QDRANT_COLLECTION, {
            vector: queryVector,
            limit: 6,
            with_payload: true,
        });

        // Build context
        const sources = results.map((r, i) => ({
            ref: `[${i + 1}]`,
            docId: (r.payload as any)?.docId || "",
            chunkIndex: (r.payload as any)?.chunkIndex ?? 0,
            title: (r.payload as any)?.title || "",
            text: (r.payload as any)?.text || "",
            qdrantId: typeof r.id === "string" ? r.id : String(r.id),
            score: r.score ?? 0,
        }));

        // Compute retrieval score (avg of top source scores, normalized 0..1)
        const avgScore =
            sources.length > 0
                ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
                : 0;

        const contextStr = sources
            .map((s) => `${s.ref} (Doc: ${s.title})\n${s.text}`)
            .join("\n\n---\n\n");

        // Ask LLM
        requireOpenAIKey();
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: env.OPENAI_CHAT_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using the reference numbers like [1], [2], etc.
If the context doesn't contain enough information, say so.

Context:
${contextStr}`,
                },
                { role: "user", content: question },
            ],
            temperature: 0.3,
        });

        const answer = completion.choices[0]?.message?.content || "No answer generated.";

        // --- Log ChatLog + gap detection (fire-and-forget) ---
        const chatLog = await ChatLogModel.create({
            workspaceId,
            userId: req.user?.userId,
            question,
            answer,
            retrievalScore: parseFloat(avgScore.toFixed(4)),
            sources: sources.map((s) => ({
                docId: s.docId,
                chunkIndex: s.chunkIndex,
                qdrantId: s.qdrantId,
                score: s.score,
            })),
            mode,
        });
        updateKnowledgeGapFromChat(chatLog).catch((e) =>
            console.error("[Chat] gap detection error:", e)
        );

        // --- Mentor mode extras ---
        let mentor: any = undefined;
        if (mode === "mentor") {
            try {
                mentor = await buildMentorExtras(question, sources, workspaceId);
            } catch (e) {
                console.error("[Chat] mentor extras error:", e);
                mentor = { recommendedDocs: [], experts: [], nextActions: [] };
            }
        }

        res.json({
            ok: true,
            question,
            answer,
            sources: sources.map(({ ref, docId, chunkIndex, title, score }) => ({
                ref,
                docId,
                chunkIndex,
                title,
                score,
            })),
            retrievalScore: parseFloat(avgScore.toFixed(4)),
            mode,
            ...(mentor ? { mentor } : {}),
        });
    } catch (err: any) {
        console.error("[Chat] Error:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

/* ------------------------------------------------------------------ */
/*  Mentor mode helper                                                 */
/* ------------------------------------------------------------------ */

async function buildMentorExtras(
    question: string,
    sources: { docId: string; title: string; score: number }[],
    workspaceId: string
) {
    // 1) Recommended docs — top 3 related documents not already in sources
    const sourceDocIds = sources.map((s) => s.docId).filter(Boolean);
    const recommendedDocs = await DocumentModel.find({
        _id: { $nin: sourceDocIds },
        $or: [
            { workspaceId },
            { workspaceId: { $exists: false } },
            { workspaceId: "default" },
        ],
    })
        .sort({ trustScore: -1, createdAt: -1 })
        .limit(3)
        .select("title author tags trustScore")
        .lean();

    // 2) Expert suggestions via Neo4j
    let experts: { person: string; score: number }[] = [];
    try {
        const driver = getNeo4jDriver();
        const session = driver.session();
        try {
            const keywords = question
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .split(/\s+/)
                .filter((w) => w.length > 3)
                .slice(0, 5);
            if (keywords.length > 0) {
                const result = await session.run(
                    `UNWIND $keywords AS kw
                     MATCH (p:Person)-[]->(n)
                     WHERE toLower(n.name) CONTAINS kw
                     WITH p, count(*) AS score
                     RETURN p.name AS person, score
                     ORDER BY score DESC
                     LIMIT 3`,
                    { keywords }
                );
                experts = result.records.map((r) => ({
                    person: r.get("person"),
                    score:
                        typeof r.get("score") === "object"
                            ? (r.get("score") as any).toNumber()
                            : r.get("score"),
                }));
            }
        } finally {
            await session.close();
        }
    } catch {}

    // 3) Next actions
    const nextActions = [
        "Review the recommended documents for deeper context",
        "Reach out to suggested experts for clarification",
        "If this topic is unclear, consider creating internal documentation",
    ];

    return { recommendedDocs, experts, nextActions };
}

export default router;
