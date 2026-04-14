import { Router, Request, Response } from "express";
import { getNeo4jDriver } from "../db/neo4j.js";
import { DocumentModel } from "../models/Document.js";
import { ChunkModel } from "../models/Chunk.js";
import { qdrantClient } from "../db/qdrant.js";
import { embedText } from "../utils/embeddings.js";
import { env } from "../env.js";

const router = Router();

router.get("/graph", async (req: Request, res: Response): Promise<void> => {
    try {
        const docId = req.query.docId as string | undefined;
        const driver = getNeo4jDriver();
        const session = driver.session();

        try {
            let query: string;
            let params: Record<string, any> = {};

            if (docId) {
                // Get graph for a specific document
                query = `
          MATCH (d:Document {docId: $docId})-[r]->(n)
          OPTIONAL MATCH (n)-[r2]->(m)
          RETURN d, r, n, r2, m
        `;
                params = { docId };
            } else {
                // Get entire graph (limited)
                query = `
          MATCH (a)-[r]->(b)
          RETURN a, r, b
          LIMIT 200
        `;
            }

            const result = await session.run(query, params);

            const nodesMap = new Map<string, any>();
            const links: any[] = [];

            for (const record of result.records) {
                const fields = record.keys;

                for (const key of fields) {
                    const val = record.get(key);
                    if (!val) continue;

                    // Node
                    if (val.identity !== undefined && val.labels) {
                        const id = val.identity.toString();
                        if (!nodesMap.has(id)) {
                            nodesMap.set(id, {
                                id,
                                label: val.properties.name || val.properties.title || val.properties.docId || id,
                                type: val.labels[0] || "Unknown",
                                ...val.properties,
                            });
                        }
                    }

                    // Relationship
                    if (val.start !== undefined && val.end !== undefined && val.type) {
                        links.push({
                            source: val.start.toString(),
                            target: val.end.toString(),
                            type: val.type,
                        });
                    }
                }
            }

            // Deduplicate links
            const linkSet = new Set<string>();
            const uniqueLinks = links.filter((l) => {
                const key = `${l.source}-${l.type}-${l.target}`;
                if (linkSet.has(key)) return false;
                linkSet.add(key);
                return true;
            });

            res.json({
                ok: true,
                nodes: Array.from(nodesMap.values()),
                links: uniqueLinks,
            });
        } finally {
            await session.close();
        }
    } catch (err: any) {
        console.error("[Graph] Error:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

/* ------------------------------------------------------------------ */
/*  GET /graph/entity?name= — entity detail + related docs            */
/* ------------------------------------------------------------------ */

router.get(
    "/graph/entity",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const name = req.query.name as string;
            if (!name) {
                res.status(400).json({ ok: false, error: "name query param required" });
                return;
            }

            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                // Connected nodes
                const result = await session.run(
                    `MATCH (n)-[r]-(m)
                     WHERE n.name = $name OR n.title = $name
                     RETURN n, type(r) AS relType, m
                     LIMIT 50`,
                    { name }
                );

                const connections: any[] = [];
                let entityProps: any = null;

                for (const record of result.records) {
                    const n = record.get("n");
                    if (!entityProps && n.properties) {
                        entityProps = { ...n.properties, labels: n.labels };
                    }
                    const m = record.get("m");
                    connections.push({
                        relType: record.get("relType"),
                        node: {
                            label: m.properties.name || m.properties.title || "",
                            type: m.labels?.[0] || "Unknown",
                            ...m.properties,
                        },
                    });
                }

                // Related documents mentioning this entity
                const docs = await DocumentModel.find({
                    $or: [
                        { text: { $regex: name, $options: "i" } },
                        { title: { $regex: name, $options: "i" } },
                    ],
                })
                    .select("title author tags createdAt")
                    .limit(10)
                    .lean();

                // Top evidence chunks
                const chunks = await ChunkModel.find({
                    text: { $regex: name, $options: "i" },
                })
                    .limit(5)
                    .lean();

                res.json({
                    ok: true,
                    entity: entityProps,
                    connections,
                    documents: docs,
                    evidenceChunks: chunks.map((c) => ({
                        docId: c.docId,
                        chunkIndex: c.chunkIndex,
                        text: c.text.slice(0, 300),
                    })),
                });
            } finally {
                await session.close();
            }
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /graph/explain?from=&to= — why two entities are linked        */
/* ------------------------------------------------------------------ */

router.get(
    "/graph/explain",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const from = req.query.from as string;
            const to = req.query.to as string;
            if (!from || !to) {
                res.status(400).json({ ok: false, error: "from and to query params required" });
                return;
            }

            // Documents mentioning both entities
            const docs = await DocumentModel.find({
                text: { $regex: from, $options: "i" },
                $and: [{ text: { $regex: to, $options: "i" } }],
            })
                .select("title author tags createdAt")
                .limit(10)
                .lean();

            // Try vector search for relationship evidence
            let evidenceChunks: any[] = [];
            try {
                const queryVector = await embedText(`${from} ${to} relationship`);
                const results = await qdrantClient.search(env.QDRANT_COLLECTION, {
                    vector: queryVector,
                    limit: 5,
                    with_payload: true,
                });
                evidenceChunks = results.map((r) => ({
                    docId: (r.payload as any)?.docId || "",
                    title: (r.payload as any)?.title || "",
                    text: ((r.payload as any)?.text || "").slice(0, 300),
                    score: r.score,
                }));
            } catch {}

            // Neo4j direct relationships
            const driver = getNeo4jDriver();
            const session = driver.session();
            let relationships: any[] = [];
            try {
                const result = await session.run(
                    `MATCH (a)-[r]-(b)
                     WHERE (a.name = $from OR a.title = $from)
                       AND (b.name = $to OR b.title = $to)
                     RETURN type(r) AS relType, properties(r) AS props
                     LIMIT 10`,
                    { from, to }
                );
                relationships = result.records.map((r) => ({
                    type: r.get("relType"),
                    properties: r.get("props"),
                }));
            } finally {
                await session.close();
            }

            res.json({
                ok: true,
                from,
                to,
                directRelationships: relationships,
                coMentionedDocs: docs,
                evidenceChunks,
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /graph/path?from=&to=&maxHops=4 — shortest path               */
/* ------------------------------------------------------------------ */

router.get(
    "/graph/path",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const from = req.query.from as string;
            const to = req.query.to as string;
            const maxHops = Math.min(
                parseInt((req.query.maxHops as string) || "4", 10),
                6
            );
            if (!from || !to) {
                res.status(400).json({ ok: false, error: "from and to required" });
                return;
            }

            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                const result = await session.run(
                    `MATCH (a), (b)
                     WHERE (a.name = $from OR a.title = $from)
                       AND (b.name = $to OR b.title = $to)
                     MATCH p = shortestPath((a)-[*..${maxHops}]-(b))
                     RETURN nodes(p) AS nodes, relationships(p) AS rels
                     LIMIT 1`,
                    { from, to }
                );

                if (result.records.length === 0) {
                    res.json({ ok: true, found: false, path: null });
                    return;
                }

                const record = result.records[0];
                const nodes = (record.get("nodes") as any[]).map((n) => ({
                    id: n.identity.toString(),
                    label: n.properties.name || n.properties.title || n.identity.toString(),
                    type: n.labels?.[0] || "Unknown",
                    ...n.properties,
                }));

                const rels = (record.get("rels") as any[]).map((r) => ({
                    source: r.start.toString(),
                    target: r.end.toString(),
                    type: r.type,
                }));

                res.json({ ok: true, found: true, path: { nodes, relationships: rels } });
            } finally {
                await session.close();
            }
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
