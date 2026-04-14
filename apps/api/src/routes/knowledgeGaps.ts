import { Router, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { optionalJWT } from "../middleware/auth.js";
import { KnowledgeGapModel } from "../models/KnowledgeGap.js";
import { suggestGapOwners } from "../utils/knowledgeGap.js";
import { env, requireOpenAIKey } from "../env.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /knowledge-gaps                                                */
/* ------------------------------------------------------------------ */

router.get(
    "/knowledge-gaps",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const status = req.query.status as string | undefined;
            const workspaceId = (req.query.workspaceId as string) || "default";
            const filter: Record<string, any> = { workspaceId };
            if (status) filter.status = status;

            const gaps = await KnowledgeGapModel.find(filter)
                .sort({ count: -1, lastAskedAt: -1 })
                .limit(100)
                .lean();

            res.json({ ok: true, gaps });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /knowledge-gaps/:id/status                                    */
/* ------------------------------------------------------------------ */

const StatusBody = z.object({
    status: z.enum(["open", "in_progress", "resolved"]),
});

router.post(
    "/knowledge-gaps/:id/status",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = StatusBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }
            const gap = await KnowledgeGapModel.findByIdAndUpdate(
                req.params.id,
                { status: parsed.data.status },
                { new: true }
            );
            if (!gap) {
                res.status(404).json({ ok: false, error: "Gap not found" });
                return;
            }
            res.json({ ok: true, gap });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /knowledge-gaps/:id/suggest-doc                               */
/*  Uses LLM to generate doc outline from gap examples                 */
/* ------------------------------------------------------------------ */

router.post(
    "/knowledge-gaps/:id/suggest-doc",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const gap = await KnowledgeGapModel.findById(req.params.id);
            if (!gap) {
                res.status(404).json({ ok: false, error: "Gap not found" });
                return;
            }

            requireOpenAIKey();
            const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

            const exampleQuestions = gap.examples
                .slice(-10)
                .map((e) => `- ${e.question}`)
                .join("\n");

            const completion = await openai.chat.completions.create({
                model: env.OPENAI_CHAT_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You are a technical documentation planner.
Given a set of repeated unanswered questions, generate a documentation page that would fill this knowledge gap.
Return JSON: {"title": "...", "outline": "A markdown outline with sections and bullet points"}`,
                    },
                    {
                        role: "user",
                        content: `These questions were asked repeatedly but couldn't be answered well:\n${exampleQuestions}\n\nCore topic: "${gap.question}"`,
                    },
                ],
                temperature: 0.3,
                response_format: { type: "json_object" },
            });

            const raw = completion.choices[0]?.message?.content || "{}";
            const parsed = JSON.parse(raw);

            // Also suggest owners
            const owners = await suggestGapOwners(gap.question);

            // Update gap
            gap.suggestedDocsToCreate.push({
                title: parsed.title || "Untitled",
                outline: parsed.outline || "",
            });
            gap.suggestedOwners = owners;
            await gap.save();

            res.json({
                ok: true,
                suggestedDoc: { title: parsed.title, outline: parsed.outline },
                suggestedOwners: owners,
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
