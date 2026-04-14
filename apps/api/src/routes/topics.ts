import { Router, Request, Response } from "express";
import { DocumentModel } from "../models/Document.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /topics — list all unique tags with document counts           */
/* ------------------------------------------------------------------ */

router.get(
    "/topics",
    async (_req: Request, res: Response): Promise<void> => {
        try {
            const agg = await DocumentModel.aggregate([
                { $unwind: "$tags" },
                {
                    $group: {
                        _id: "$tags",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]);

            const topics = agg.map((t) => ({ topic: t._id, count: t.count }));
            res.json({ ok: true, topics });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /topics/:topic/documents                                      */
/* ------------------------------------------------------------------ */

router.get(
    "/topics/:topic/documents",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const topic = decodeURIComponent(req.params.topic as string);
            const docs = await DocumentModel.find({ tags: topic })
                .select("title author tags source createdAt")
                .sort({ createdAt: -1 })
                .limit(50);

            res.json({ ok: true, topic, documents: docs });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
