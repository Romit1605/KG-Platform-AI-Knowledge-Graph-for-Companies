import { Router, Request, Response } from "express";
import { z } from "zod";
import { FeedbackModel } from "../models/Feedback.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  POST /feedback                                                    */
/* ------------------------------------------------------------------ */

const FeedbackBody = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    rating: z.number().min(1).max(5),
    sources: z
        .array(z.object({ docId: z.string(), chunkIndex: z.number() }))
        .optional()
        .default([]),
    userId: z.string().optional(),
    workspaceId: z.string().optional(),
});

router.post(
    "/feedback",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = FeedbackBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const feedback = await FeedbackModel.create(parsed.data);
            res.json({ ok: true, feedbackId: feedback._id });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /feedback — admin list of all feedback                        */
/* ------------------------------------------------------------------ */

router.get(
    "/feedback",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const sort = req.query.sort === "low" ? 1 : -1;
            const feedback = await FeedbackModel.find()
                .sort({ rating: sort, createdAt: -1 })
                .limit(100);

            // Compute stats
            const all = await FeedbackModel.find().select("rating");
            const total = all.length;
            const avg =
                total > 0
                    ? all.reduce((s, f) => s + f.rating, 0) / total
                    : 0;

            res.json({
                ok: true,
                stats: {
                    total,
                    averageRating: Math.round(avg * 100) / 100,
                },
                feedback,
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
