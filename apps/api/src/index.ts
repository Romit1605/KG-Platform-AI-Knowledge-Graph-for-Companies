import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { connectMongo } from "./db/mongo.js";
import { ensureQdrantCollection } from "./db/qdrant.js";
import { connectNeo4j } from "./db/neo4j.js";

import healthRouter from "./routes/health.js";
import ingestRouter from "./routes/ingest.js";
import searchRouter from "./routes/search.js";
import chatRouter from "./routes/chat.js";
import graphRouter from "./routes/graph.js";
import authRouter from "./routes/auth.js";
import connectorsRouter from "./routes/connectors.js";
import documentsRouter from "./routes/documents.js";
import expertsRouter from "./routes/experts.js";
import topicsRouter from "./routes/topics.js";
import incidentsRouter from "./routes/incidents.js";
import feedbackRouter from "./routes/feedback.js";
import workspacesRouter from "./routes/workspaces.js";
import knowledgeGapsRouter from "./routes/knowledgeGaps.js";
import autoDocsRouter from "./routes/autoDocs.js";
import heatmapRouter from "./routes/heatmap.js";
import timelineRouter from "./routes/timeline.js";
import recommendationsRouter from "./routes/recommendations.js";
import notificationsRouter from "./routes/notifications.js";

async function main() {
    // Connect to databases
    await connectMongo();
    await ensureQdrantCollection();
    await connectNeo4j();

    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: "10mb" }));

    // Routes
    app.use(healthRouter);
    app.use(ingestRouter);
    app.use(searchRouter);
    app.use(chatRouter);
    app.use(graphRouter);
    app.use(authRouter);
    app.use(connectorsRouter);
    app.use(documentsRouter);
    app.use(expertsRouter);
    app.use(topicsRouter);
    app.use(incidentsRouter);
    app.use(feedbackRouter);
    app.use(workspacesRouter);
    app.use(knowledgeGapsRouter);
    app.use(autoDocsRouter);
    app.use(heatmapRouter);
    app.use(timelineRouter);
    app.use(recommendationsRouter);
    app.use(notificationsRouter);

    // Global error handler
    app.use(
        (
            err: Error,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction
        ) => {
            console.error("[Server] Unhandled error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    );

    app.listen(env.PORT, () => {
        console.log(`[Server] API running on http://localhost:${env.PORT}`);
    });
}

main().catch((err) => {
    console.error("[Server] Fatal:", err);
    process.exit(1);
});
