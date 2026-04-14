import { IChatLog } from "../models/ChatLog.js";
import { KnowledgeGapModel } from "../models/KnowledgeGap.js";
import { NotificationModel } from "../models/Notification.js";
import { getNeo4jDriver } from "../db/neo4j.js";
import { extractTags } from "./taxonomyExtractor.js";

/* ------------------------------------------------------------------ */
/*  Normalize question for dedup: lowercase, remove punctuation,      */
/*  strip common stopwords, trim whitespace                            */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "like",
    "through", "after", "over", "between", "out", "against", "during",
    "without", "before", "under", "around", "among", "i", "me", "my",
    "we", "our", "you", "your", "he", "him", "she", "her", "it", "its",
    "they", "them", "their", "what", "which", "who", "whom", "this",
    "that", "these", "those", "am", "and", "but", "or", "not", "no",
    "so", "if", "then", "than", "too", "very", "just", "how", "why",
    "where", "when",
]);

export function normalizeQuestion(q: string): string {
    return q
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOPWORDS.has(w))
        .sort()
        .join(" ");
}

/* ------------------------------------------------------------------ */
/*  Knowledge gap threshold constants                                  */
/* ------------------------------------------------------------------ */

const LOW_RETRIEVAL_THRESHOLD = 0.35;
const MIN_SOURCES = 2;
const SPIKE_COUNT = 3;
const MAX_EXAMPLES = 20;

/* ------------------------------------------------------------------ */
/*  updateKnowledgeGapFromChat                                         */
/* ------------------------------------------------------------------ */

export async function updateKnowledgeGapFromChat(
    chatLog: IChatLog
): Promise<void> {
    const isLowQuality =
        chatLog.retrievalScore < LOW_RETRIEVAL_THRESHOLD ||
        chatLog.sources.length < MIN_SOURCES;

    if (!isLowQuality) return;

    const normalized = normalizeQuestion(chatLog.question);
    if (!normalized) return;

    const gap = await KnowledgeGapModel.findOneAndUpdate(
        { normalizedQuestion: normalized, workspaceId: chatLog.workspaceId },
        {
            $inc: { count: 1 },
            $set: {
                lastAskedAt: new Date(),
                question: chatLog.question, // keep latest wording
            },
            $push: {
                examples: {
                    $each: [
                        {
                            question: chatLog.question,
                            createdAt: new Date(),
                            userId: chatLog.userId,
                        },
                    ],
                    $slice: -MAX_EXAMPLES,
                },
            },
            $setOnInsert: {
                normalizedQuestion: normalized,
                workspaceId: chatLog.workspaceId,
                status: "open",
                suggestedOwners: [],
                suggestedDocsToCreate: [],
            },
        },
        { upsert: true, new: true }
    );

    // Compute rolling average retrieval score
    if (gap) {
        const newAvg =
            (gap.avgRetrievalScore * (gap.count - 1) + chatLog.retrievalScore) /
            gap.count;
        gap.avgRetrievalScore = parseFloat(newAvg.toFixed(4));
        await gap.save();

        // Spike detection – create notification for workspace admins
        if (gap.count >= SPIKE_COUNT && gap.avgRetrievalScore < LOW_RETRIEVAL_THRESHOLD) {
            const existingNotif = await NotificationModel.findOne({
                workspaceId: chatLog.workspaceId,
                type: "knowledge_gap_spike",
                linkUrl: `/knowledge-gaps`,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                title: { $regex: normalized.slice(0, 30) },
            });
            if (!existingNotif) {
                await NotificationModel.create({
                    workspaceId: chatLog.workspaceId,
                    type: "knowledge_gap_spike",
                    title: `Knowledge gap spike: "${gap.question.slice(0, 60)}"`,
                    message: `Asked ${gap.count} times with avg retrieval score ${gap.avgRetrievalScore.toFixed(2)}`,
                    linkUrl: "/knowledge-gaps",
                    severity: "high",
                });
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Suggest owners from Neo4j expertise graph                          */
/* ------------------------------------------------------------------ */

export async function suggestGapOwners(
    question: string
): Promise<{ personName: string; score: number; reason: string }[]> {
    try {
        const tags = await extractTags("Question", question);
        if (tags.length === 0) return [];

        const driver = getNeo4jDriver();
        const session = driver.session();
        try {
            const result = await session.run(
                `UNWIND $topics AS topic
                 MATCH (p:Person)
                 OPTIONAL MATCH (p)-[:AUTHORED]->(d:Document)
                   WHERE ANY(t IN $topics WHERE d.title CONTAINS t OR d.name CONTAINS t)
                 OPTIONAL MATCH (p)-[:MENTIONS|EXPERT_IN]->(n)
                   WHERE ANY(t IN $topics WHERE n.name CONTAINS t)
                 WITH p,
                   count(DISTINCT d) AS authored,
                   count(DISTINCT n) AS related
                 WHERE authored + related > 0
                 RETURN p.name AS person,
                   authored * 5 + related * 3 AS score
                 ORDER BY score DESC
                 LIMIT 5`,
                { topics: tags }
            );
            return result.records.map((r) => ({
                personName: r.get("person"),
                score:
                    typeof r.get("score") === "object"
                        ? (r.get("score") as any).toNumber()
                        : r.get("score"),
                reason: `Expert in: ${tags.join(", ")}`,
            }));
        } finally {
            await session.close();
        }
    } catch {
        return [];
    }
}
