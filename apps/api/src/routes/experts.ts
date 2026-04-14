import { Router, Request, Response } from "express";
import { getNeo4jDriver } from "../db/neo4j.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /experts?topic=                                               */
/* ------------------------------------------------------------------ */

router.get(
    "/experts",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const topic = (req.query.topic as string) || "";
            const driver = getNeo4jDriver();
            const session = driver.session();

            try {
                let query: string;
                let params: Record<string, any> = {};

                if (topic) {
                    query = `
                        MATCH (p:Person)
                        OPTIONAL MATCH (p)-[:AUTHORED]->(d:Document)
                        OPTIONAL MATCH (p)-[:EXPERT_IN]->(c:Concept)
                        OPTIONAL MATCH (p)-[:MENTIONED_IN]->(d2:Document)
                        OPTIONAL MATCH (p)-[r]-()
                        WITH p,
                             COUNT(DISTINCT d) AS authored,
                             COLLECT(DISTINCT d.title) AS docTitles,
                             COUNT(DISTINCT CASE WHEN c.name =~ ('(?i).*' + $topic + '.*') THEN c END) AS topicMentions,
                             COUNT(DISTINCT r) AS connections
                        WHERE authored > 0 OR topicMentions > 0
                        RETURN p.name AS name,
                               (5 * authored + 3 * topicMentions + 2 * connections) AS score,
                               docTitles AS evidence,
                               authored,
                               topicMentions,
                               connections
                        ORDER BY score DESC
                        LIMIT 20
                    `;
                    params = { topic };
                } else {
                    query = `
                        MATCH (p:Person)
                        OPTIONAL MATCH (p)-[:AUTHORED]->(d:Document)
                        OPTIONAL MATCH (p)-[:EXPERT_IN]->(c:Concept)
                        OPTIONAL MATCH (p)-[r]-()
                        WITH p,
                             COUNT(DISTINCT d) AS authored,
                             COLLECT(DISTINCT d.title) AS docTitles,
                             COUNT(DISTINCT c) AS topicMentions,
                             COUNT(DISTINCT r) AS connections
                        RETURN p.name AS name,
                               (5 * authored + 3 * topicMentions + 2 * connections) AS score,
                               docTitles AS evidence,
                               authored,
                               topicMentions,
                               connections
                        ORDER BY score DESC
                        LIMIT 20
                    `;
                }

                const result = await session.run(query, params);

                const experts = result.records.map((r) => ({
                    name: r.get("name"),
                    score: typeof r.get("score") === "object"
                        ? (r.get("score") as any).toNumber()
                        : r.get("score"),
                    evidence: r.get("evidence") || [],
                    authored: typeof r.get("authored") === "object"
                        ? (r.get("authored") as any).toNumber()
                        : r.get("authored"),
                    topicMentions: typeof r.get("topicMentions") === "object"
                        ? (r.get("topicMentions") as any).toNumber()
                        : r.get("topicMentions"),
                    connections: typeof r.get("connections") === "object"
                        ? (r.get("connections") as any).toNumber()
                        : r.get("connections"),
                }));

                res.json({ ok: true, topic: topic || "all", experts });
            } finally {
                await session.close();
            }
        } catch (err: any) {
            console.error("[Experts] Error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
