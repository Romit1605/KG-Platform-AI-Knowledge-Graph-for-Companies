import { Router, Request, Response } from "express";
import { optionalJWT, verifyJWT } from "../middleware/auth.js";
import { NotificationModel } from "../models/Notification.js";
import { DocumentModel } from "../models/Document.js";
import { IncidentModel } from "../models/Incident.js";
import { AutoDocModel } from "../models/AutoDoc.js";
import { KnowledgeGapModel } from "../models/KnowledgeGap.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /notifications                                                 */
/* ------------------------------------------------------------------ */

router.get(
    "/notifications",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const workspaceId = (req.query.workspaceId as string) || "default";
            const userId = req.user?.userId;

            const filter: Record<string, any> = {
                workspaceId,
                $or: [{ userId: null }, { userId: { $exists: false } }],
            };
            // Include user-specific notifs if authenticated
            if (userId) {
                filter.$or.push({ userId });
            }

            const notifications = await NotificationModel.find(filter)
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            const unreadCount = await NotificationModel.countDocuments({
                ...filter,
                readAt: null,
            });

            res.json({ ok: true, notifications, unreadCount });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /notifications/:id/read                                       */
/* ------------------------------------------------------------------ */

router.post(
    "/notifications/:id/read",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const notif = await NotificationModel.findByIdAndUpdate(
                req.params.id,
                { readAt: new Date() },
                { new: true }
            );
            if (!notif) {
                res.status(404).json({ ok: false, error: "Notification not found" });
                return;
            }
            res.json({ ok: true, notification: notif });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /digest/weekly — weekly digest summary                         */
/* ------------------------------------------------------------------ */

router.get(
    "/digest/weekly",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const workspaceId = (req.query.workspaceId as string) || "default";
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const wsFilter = {
                $or: [
                    { workspaceId },
                    { workspaceId: { $exists: false } },
                    { workspaceId: "default" },
                ],
            };

            const [newDocs, incidents, autoDocs, gaps, notifications] =
                await Promise.all([
                    DocumentModel.countDocuments({
                        ...wsFilter,
                        createdAt: { $gte: since },
                    }),
                    IncidentModel.countDocuments({
                        ...wsFilter,
                        createdAt: { $gte: since },
                    }),
                    AutoDocModel.countDocuments({
                        ...wsFilter,
                        createdAt: { $gte: since },
                    }),
                    KnowledgeGapModel.countDocuments({
                        workspaceId,
                        lastAskedAt: { $gte: since },
                        status: "open",
                    }),
                    NotificationModel.find({
                        workspaceId,
                        createdAt: { $gte: since },
                        severity: "high",
                    })
                        .sort({ createdAt: -1 })
                        .limit(10)
                        .lean(),
                ]);

            res.json({
                ok: true,
                digest: {
                    period: {
                        from: since.toISOString(),
                        to: new Date().toISOString(),
                    },
                    summary: {
                        newDocuments: newDocs,
                        incidents,
                        autoDocs,
                        openKnowledgeGaps: gaps,
                    },
                    highlights: notifications,
                },
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
