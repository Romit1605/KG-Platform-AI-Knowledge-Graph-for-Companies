import { Router, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { optionalJWT } from "../middleware/auth.js";
import { AutoDocModel } from "../models/AutoDoc.js";
import { IncidentModel } from "../models/Incident.js";
import { ChatLogModel } from "../models/ChatLog.js";
import { DocumentModel } from "../models/Document.js";
import { NotificationModel } from "../models/Notification.js";
import { env, requireOpenAIKey } from "../env.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /auto-docs — list auto-generated docs                         */
/* ------------------------------------------------------------------ */

router.get(
    "/auto-docs",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const workspaceId = (req.query.workspaceId as string) || "default";
            const type = req.query.type as string | undefined;
            const filter: Record<string, any> = { workspaceId };
            if (type) filter.type = type;

            const docs = await AutoDocModel.find(filter)
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            res.json({ ok: true, autoDocs: docs });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /auto-docs/from-incident                                      */
/* ------------------------------------------------------------------ */

const FromIncidentBody = z.object({
    incidentId: z.string().min(1),
    workspaceId: z.string().optional().default("default"),
});

router.post(
    "/auto-docs/from-incident",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = FromIncidentBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const incident = await IncidentModel.findById(parsed.data.incidentId);
            if (!incident) {
                res.status(404).json({ ok: false, error: "Incident not found" });
                return;
            }

            requireOpenAIKey();
            const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

            const timelineText = incident.timeline
                .map(
                    (e) =>
                        `[${new Date(e.timestamp).toISOString()}] ${e.type}: ${e.description}${e.author ? ` (by ${e.author})` : ""}`
                )
                .join("\n");

            const completion = await openai.chat.completions.create({
                model: env.OPENAI_CHAT_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You are a technical writer. Generate a detailed postmortem document in Markdown from the given incident data. Include: Summary, Impact, Timeline, Root Cause, Resolution, Action Items, Lessons Learned.`,
                    },
                    {
                        role: "user",
                        content: `Incident: ${incident.title}\nSystem: ${incident.system}\nStatus: ${incident.status}\n\nTimeline:\n${timelineText}`,
                    },
                ],
                temperature: 0.3,
            });

            const markdown =
                completion.choices[0]?.message?.content || "# Postmortem\n\nNo content generated.";

            const autoDoc = await AutoDocModel.create({
                workspaceId: parsed.data.workspaceId,
                type: "postmortem",
                title: `Postmortem: ${incident.title}`,
                markdown,
                sourceRefs: { incidentId: incident._id.toString() },
                createdBy: req.user?.userId || "system",
            });

            res.json({ ok: true, autoDoc });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /auto-docs/from-chats — Generate FAQ from recent chats       */
/* ------------------------------------------------------------------ */

const FromChatsBody = z.object({
    topic: z.string().optional(),
    days: z.number().optional().default(7),
    workspaceId: z.string().optional().default("default"),
});

router.post(
    "/auto-docs/from-chats",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = FromChatsBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const { topic, days, workspaceId } = parsed.data;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const filter: Record<string, any> = {
                workspaceId,
                createdAt: { $gte: since },
            };
            if (topic) {
                filter.question = { $regex: topic, $options: "i" };
            }

            const chats = await ChatLogModel.find(filter)
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            if (chats.length === 0) {
                res.status(404).json({ ok: false, error: "No chats found for the given filter" });
                return;
            }

            requireOpenAIKey();
            const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

            const qaPairs = chats
                .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
                .join("\n\n---\n\n");

            const completion = await openai.chat.completions.create({
                model: env.OPENAI_CHAT_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You are a technical writer. From the following Q&A pairs, generate a well-organized FAQ document in Markdown. Group related questions, deduplicate, and provide clear answers. Include a title, table of contents, and categorized sections.`,
                    },
                    { role: "user", content: qaPairs },
                ],
                temperature: 0.3,
            });

            const markdown =
                completion.choices[0]?.message?.content || "# FAQ\n\nNo content generated.";

            const autoDoc = await AutoDocModel.create({
                workspaceId,
                type: "faq",
                title: topic ? `FAQ: ${topic}` : `FAQ — Last ${days} days`,
                markdown,
                sourceRefs: { chatLogIds: chats.map((c) => c._id.toString()) },
                createdBy: req.user?.userId || "system",
            });

            res.json({ ok: true, autoDoc });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /auto-docs/from-doc — Generate runbook or change summary      */
/* ------------------------------------------------------------------ */

const FromDocBody = z.object({
    docId: z.string().min(1),
    type: z.enum(["runbook", "change_summary"]).default("runbook"),
    workspaceId: z.string().optional().default("default"),
});

router.post(
    "/auto-docs/from-doc",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = FromDocBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const doc = await DocumentModel.findById(parsed.data.docId);
            if (!doc) {
                res.status(404).json({ ok: false, error: "Document not found" });
                return;
            }

            requireOpenAIKey();
            const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

            const promptMap = {
                runbook: `You are a technical writer. Convert the following document into a structured runbook in Markdown with: Prerequisites, Step-by-step instructions, Verification steps, Troubleshooting, Rollback procedure.`,
                change_summary: `You are a technical writer. Summarize the following document as a change summary in Markdown with: Overview of changes, Affected systems, Impact assessment, Required actions.`,
            };

            const completion = await openai.chat.completions.create({
                model: env.OPENAI_CHAT_MODEL,
                messages: [
                    { role: "system", content: promptMap[parsed.data.type] },
                    {
                        role: "user",
                        content: `Title: ${doc.title}\nAuthor: ${doc.author || "Unknown"}\n\n${doc.text.slice(0, 8000)}`,
                    },
                ],
                temperature: 0.3,
            });

            const markdown =
                completion.choices[0]?.message?.content || `# ${parsed.data.type}\n\nNo content generated.`;

            const autoDoc = await AutoDocModel.create({
                workspaceId: parsed.data.workspaceId,
                type: parsed.data.type,
                title: `${parsed.data.type === "runbook" ? "Runbook" : "Change Summary"}: ${doc.title}`,
                markdown,
                sourceRefs: { docId: doc._id.toString() },
                createdBy: req.user?.userId || "system",
            });

            res.json({ ok: true, autoDoc });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /auto-docs/:id/publish — Ingest AutoDoc into Documents KB     */
/* ------------------------------------------------------------------ */

router.post(
    "/auto-docs/:id/publish",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const autoDoc = await AutoDocModel.findById(req.params.id);
            if (!autoDoc) {
                res.status(404).json({ ok: false, error: "AutoDoc not found" });
                return;
            }

            const doc = await DocumentModel.create({
                title: autoDoc.title,
                text: autoDoc.markdown,
                author: "AutoDoc Generator",
                source: "autodoc",
                workspaceId: autoDoc.workspaceId,
                tags: [autoDoc.type, "auto-generated"],
                visibility: "public",
            });

            await NotificationModel.create({
                workspaceId: autoDoc.workspaceId,
                type: "doc_updated",
                title: `AutoDoc published: ${autoDoc.title}`,
                message: `A new ${autoDoc.type} document was published to the knowledge base.`,
                linkUrl: `/documents`,
                severity: "low",
            });

            res.json({ ok: true, documentId: doc._id });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
