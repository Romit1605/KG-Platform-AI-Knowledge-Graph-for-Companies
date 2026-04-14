import { Router, Request, Response } from "express";
import { optionalJWT } from "../middleware/auth.js";
import { DocumentModel } from "../models/Document.js";
import { FeedbackModel } from "../models/Feedback.js";
import { getNeo4jDriver } from "../db/neo4j.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /heatmap — expertise matrix: topics × people                   */
/* ------------------------------------------------------------------ */

router.get(
    "/heatmap",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const topTopics = Math.min(
                parseInt((req.query.topTopics as string) || "20", 10),
                50
            );
            const topPeople = Math.min(
                parseInt((req.query.topPeople as string) || "20", 10),
                50
            );
            const workspaceId = (req.query.workspaceId as string) || "default";

            // 1) Get top topics from document tags
            const topicAgg = await DocumentModel.aggregate([
                {
                    $match: {
                        $or: [
                            { workspaceId },
                            { workspaceId: { $exists: false } },
                            { workspaceId: "default" },
                        ],
                    },
                },
                { $unwind: "$tags" },
                { $group: { _id: "$tags", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: topTopics },
            ]);
            const topics: string[] = topicAgg.map((t) => t._id);

            if (topics.length === 0) {
                res.json({ ok: true, topics: [], people: [], matrix: [], evidenceMap: {} });
                return;
            }

            // 2) Get people from Neo4j who have connections to anything
            const driver = getNeo4jDriver();
            const session = driver.session();
            let people: string[] = [];
            const matrix: number[][] = [];
            const evidenceMap: Record<string, { docId: string; title: string }[]> = {};

            try {
                // Get top people
                const peopleResult = await session.run(
                    `MATCH (p:Person)-[r]->()
                     WITH p, count(r) AS rels
                     ORDER BY rels DESC
                     LIMIT $limit
                     RETURN p.name AS name`,
                    { limit: topPeople }
                );
                people = peopleResult.records.map((r) => r.get("name"));

                if (people.length === 0) {
                    res.json({ ok: true, topics, people: [], matrix: [], evidenceMap: {} });
                    return;
                }

                // 3) Build matrix: for each topic × person, compute score
                for (let ti = 0; ti < topics.length; ti++) {
                    const row: number[] = [];
                    for (let pi = 0; pi < people.length; pi++) {
                        const topic = topics[ti];
                        const person = people[pi];
                        const cellKey = `${ti}-${pi}`;

                        // +5 per authored document with this tag
                        const authoredDocs = await DocumentModel.find({
                            author: { $regex: person, $options: "i" },
                            tags: topic,
                            $or: [
                                { workspaceId },
                                { workspaceId: { $exists: false } },
                                { workspaceId: "default" },
                            ],
                        })
                            .select("_id title")
                            .limit(20)
                            .lean();

                        let score = authoredDocs.length * 5;
                        evidenceMap[cellKey] = authoredDocs.map((d) => ({
                            docId: d._id.toString(),
                            title: d.title,
                        }));

                        // Neo4j: +3 per MENTIONS, +2 per EXPERT_IN
                        try {
                            const neoResult = await session.run(
                                `MATCH (p:Person {name: $person})-[r]->(n)
                                 WHERE toLower(n.name) CONTAINS toLower($topic)
                                 RETURN type(r) AS relType, count(*) AS cnt`,
                                { person, topic }
                            );
                            for (const rec of neoResult.records) {
                                const relType = rec.get("relType");
                                const cnt =
                                    typeof rec.get("cnt") === "object"
                                        ? (rec.get("cnt") as any).toNumber()
                                        : rec.get("cnt");
                                if (relType === "MENTIONS") score += cnt * 3;
                                else if (relType === "EXPERT_IN") score += cnt * 2;
                                else score += cnt;
                            }
                        } catch {}

                        // +1 per helpful feedback on topic sources
                        try {
                            const feedbackCount = await FeedbackModel.countDocuments({
                                workspaceId,
                                rating: { $gte: 4 },
                                question: { $regex: topic, $options: "i" },
                            });
                            score += Math.min(feedbackCount, 5);
                        } catch {}

                        row.push(score);
                    }
                    matrix.push(row);
                }
            } finally {
                await session.close();
            }

            res.json({ ok: true, topics, people, matrix, evidenceMap });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
