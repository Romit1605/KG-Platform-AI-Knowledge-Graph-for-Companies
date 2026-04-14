import { Router, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { IncidentModel } from "../models/Incident.js";
import { DocumentModel } from "../models/Document.js";
import { env, requireOpenAIKey } from "../env.js";
import { qdrantClient } from "../db/qdrant.js";
import { embedText } from "../utils/embeddings.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /incidents                                                    */
/* ------------------------------------------------------------------ */

router.get(
    "/incidents",
    async (_req: Request, res: Response): Promise<void> => {
        try {
            const incidents = await IncidentModel.find()
                .sort({ createdAt: -1 })
                .limit(50);
            res.json({ ok: true, incidents });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /incidents/start                                             */
/* ------------------------------------------------------------------ */

const StartBody = z.object({
    title: z.string().min(1),
    system: z.string().min(1),
    createdBy: z.string().min(1),
    workspaceId: z.string().optional(),
});

router.post(
    "/incidents/start",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = StartBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const incident = await IncidentModel.create({
                ...parsed.data,
                status: "active",
                timeline: [
                    {
                        type: "created",
                        description: `Incident opened: ${parsed.data.title}`,
                        author: parsed.data.createdBy,
                    },
                ],
            });

            res.json({ ok: true, incident });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /incidents/:id/event                                        */
/* ------------------------------------------------------------------ */

const EventBody = z.object({
    type: z.string().min(1),
    description: z.string().min(1),
    author: z.string().optional(),
    status: z
        .enum(["active", "investigating", "mitigating", "resolved"])
        .optional(),
});

router.post(
    "/incidents/:id/event",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = EventBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const incident = await IncidentModel.findById(req.params.id);
            if (!incident) {
                res.status(404).json({ ok: false, error: "Incident not found" });
                return;
            }

            incident.timeline.push({
                timestamp: new Date(),
                type: parsed.data.type,
                description: parsed.data.description,
                author: parsed.data.author,
            });

            if (parsed.data.status) {
                incident.status = parsed.data.status;
                if (parsed.data.status === "resolved") {
                    incident.resolvedAt = new Date();
                }
            }

            await incident.save();
            res.json({ ok: true, incident });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /incidents/:id/context — related docs, past incidents         */
/* ------------------------------------------------------------------ */

router.get(
    "/incidents/:id/context",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const incident = await IncidentModel.findById(req.params.id);
            if (!incident) {
                res.status(404).json({ ok: false, error: "Incident not found" });
                return;
            }

            // Search for related documents using vector search
            let relatedDocs: any[] = [];
            try {
                const queryVector = await embedText(
                    `${incident.title} ${incident.system}`
                );
                const results = await qdrantClient.search(env.QDRANT_COLLECTION, {
                    vector: queryVector,
                    limit: 5,
                    with_payload: true,
                });
                relatedDocs = results.map((r) => ({
                    title: (r.payload as any)?.title || "",
                    docId: (r.payload as any)?.docId || "",
                    text: ((r.payload as any)?.text || "").slice(0, 300),
                    score: r.score,
                }));
            } catch {
                /* vector search may fail without API key */
            }

            // Find past incidents for same system
            const pastIncidents = await IncidentModel.find({
                system: incident.system,
                _id: { $ne: incident._id },
                status: "resolved",
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("title system status createdAt resolvedAt");

            // Find runbook-like documents
            const runbooks = await DocumentModel.find({
                $or: [
                    { tags: { $in: ["Runbook", "runbook", "Operations", "Incident"] } },
                    { title: { $regex: incident.system, $options: "i" } },
                ],
            })
                .limit(5)
                .select("title author source createdAt");

            res.json({
                ok: true,
                incident: {
                    title: incident.title,
                    system: incident.system,
                    status: incident.status,
                },
                relatedDocs,
                pastIncidents,
                runbooks,
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /incidents/:id/postmortem — LLM-generated report             */
/* ------------------------------------------------------------------ */

router.post(
    "/incidents/:id/postmortem",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const incident = await IncidentModel.findById(req.params.id);
            if (!incident) {
                res.status(404).json({ ok: false, error: "Incident not found" });
                return;
            }

            requireOpenAIKey();
            const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

            const timelineText = incident.timeline
                .map(
                    (e) =>
                        `[${e.timestamp.toISOString()}] ${e.type}: ${e.description}${e.author ? ` (by ${e.author})` : ""}`
                )
                .join("\n");

            const completion = await openai.chat.completions.create({
                model: env.OPENAI_CHAT_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You are a site reliability engineer. Generate a comprehensive postmortem report in markdown format. Include: Summary, Impact, Timeline, Root Cause, Resolution, Action Items, Lessons Learned.`,
                    },
                    {
                        role: "user",
                        content: `Incident: ${incident.title}\nSystem: ${incident.system}\nStatus: ${incident.status}\nCreated: ${incident.createdAt.toISOString()}\n${incident.resolvedAt ? `Resolved: ${incident.resolvedAt.toISOString()}` : ""}\n\nTimeline:\n${timelineText}`,
                    },
                ],
                temperature: 0.3,
            });

            const postmortem =
                completion.choices[0]?.message?.content ||
                "Failed to generate postmortem.";

            res.json({ ok: true, postmortem });
        } catch (err: any) {
            if (err.message?.includes("OPENAI_API_KEY")) {
                res.status(400).json({ ok: false, error: err.message });
                return;
            }
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
