import { Router, Request, Response } from "express";
import { z } from "zod";
import {
    parseSlackExport,
    parseDiscordLog,
    fetchGitHubDocs,
    parseMarkdownFiles,
} from "../utils/connectorParsers.js";
import { ingestDocument } from "../utils/ingestPipeline.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  POST /connectors/slack                                            */
/* ------------------------------------------------------------------ */

const SlackBody = z.object({
    channels: z.array(
        z.object({
            name: z.string().optional(),
            messages: z.array(z.any()),
        })
    ),
    workspaceId: z.string().optional(),
});

router.post(
    "/connectors/slack",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = SlackBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const docs = parseSlackExport(parsed.data.channels);
            const results = [];

            for (const doc of docs) {
                try {
                    const result = await ingestDocument({
                        title: doc.title,
                        author: doc.author,
                        text: doc.text,
                        source: "slack",
                        workspaceId: parsed.data.workspaceId,
                    });
                    results.push({ ok: true, docId: result.docId, title: doc.title });
                } catch (err: any) {
                    results.push({ ok: false, title: doc.title, error: err.message });
                }
            }

            res.json({ ok: true, source: "slack", ingested: results });
        } catch (err: any) {
            console.error("[Connector:Slack] Error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /connectors/discord                                          */
/* ------------------------------------------------------------------ */

const DiscordBody = z.object({
    messages: z.array(z.any()),
    workspaceId: z.string().optional(),
});

router.post(
    "/connectors/discord",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = DiscordBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const docs = parseDiscordLog(parsed.data.messages);
            const results = [];

            for (const doc of docs) {
                try {
                    const result = await ingestDocument({
                        title: doc.title,
                        author: doc.author,
                        text: doc.text,
                        source: "discord",
                        workspaceId: parsed.data.workspaceId,
                    });
                    results.push({ ok: true, docId: result.docId, title: doc.title });
                } catch (err: any) {
                    results.push({ ok: false, title: doc.title, error: err.message });
                }
            }

            res.json({ ok: true, source: "discord", ingested: results });
        } catch (err: any) {
            console.error("[Connector:Discord] Error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /connectors/github                                           */
/* ------------------------------------------------------------------ */

const GitHubBody = z.object({
    repoUrl: z.string().url(),
    workspaceId: z.string().optional(),
});

router.post(
    "/connectors/github",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = GitHubBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const docs = await fetchGitHubDocs(parsed.data.repoUrl);
            const results = [];

            for (const doc of docs) {
                try {
                    const result = await ingestDocument({
                        title: doc.title,
                        author: doc.author,
                        text: doc.text,
                        source: `github:${parsed.data.repoUrl}`,
                        workspaceId: parsed.data.workspaceId,
                    });
                    results.push({ ok: true, docId: result.docId, title: doc.title });
                } catch (err: any) {
                    results.push({ ok: false, title: doc.title, error: err.message });
                }
            }

            res.json({ ok: true, source: "github", ingested: results });
        } catch (err: any) {
            console.error("[Connector:GitHub] Error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /connectors/markdown                                         */
/* ------------------------------------------------------------------ */

const MarkdownBody = z.object({
    files: z.array(
        z.object({
            name: z.string(),
            content: z.string(),
        })
    ),
    workspaceId: z.string().optional(),
});

router.post(
    "/connectors/markdown",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = MarkdownBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const docs = parseMarkdownFiles(parsed.data.files);
            const results = [];

            for (const doc of docs) {
                try {
                    const result = await ingestDocument({
                        title: doc.title,
                        author: doc.author,
                        text: doc.text,
                        source: "markdown",
                        workspaceId: parsed.data.workspaceId,
                    });
                    results.push({ ok: true, docId: result.docId, title: doc.title });
                } catch (err: any) {
                    results.push({ ok: false, title: doc.title, error: err.message });
                }
            }

            res.json({ ok: true, source: "markdown", ingested: results });
        } catch (err: any) {
            console.error("[Connector:Markdown] Error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
