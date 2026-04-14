import { Router, Request, Response } from "express";
import { z } from "zod";
import { WorkspaceModel } from "../models/Workspace.js";
import {
    WorkspaceMemberModel,
} from "../models/WorkspaceMember.js";
import { UserModel } from "../models/User.js";
import { verifyJWT } from "../middleware/auth.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  POST /workspaces — create a workspace (auth required)             */
/* ------------------------------------------------------------------ */

const CreateBody = z.object({
    name: z.string().min(1, "Workspace name is required"),
});

router.post(
    "/workspaces",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = CreateBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const workspace = await WorkspaceModel.create({
                name: parsed.data.name,
                ownerId: req.user!.userId,
            });

            // Owner becomes admin
            await WorkspaceMemberModel.create({
                userId: req.user!.userId,
                workspaceId: workspace._id.toString(),
                role: "admin",
            });

            res.json({ ok: true, workspace });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /workspaces — list user's workspaces (auth required)          */
/* ------------------------------------------------------------------ */

router.get(
    "/workspaces",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const memberships = await WorkspaceMemberModel.find({
                userId: req.user!.userId,
            });

            const workspaceIds = memberships.map((m) => m.workspaceId);
            const workspaces = await WorkspaceModel.find({
                _id: { $in: workspaceIds },
            });

            const result = workspaces.map((ws) => {
                const membership = memberships.find(
                    (m) => m.workspaceId === ws._id.toString()
                );
                return {
                    id: ws._id,
                    name: ws.name,
                    role: membership?.role || "viewer",
                    ownerId: ws.ownerId,
                    createdAt: ws.createdAt,
                };
            });

            res.json({ ok: true, workspaces: result });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /workspaces/:id/members — add a member (admin only)          */
/* ------------------------------------------------------------------ */

const AddMemberBody = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "editor", "viewer"]),
});

router.post(
    "/workspaces/:id/members",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            // Check caller is admin
            const callerMembership = await WorkspaceMemberModel.findOne({
                userId: req.user!.userId,
                workspaceId: req.params.id,
            });

            if (!callerMembership || callerMembership.role !== "admin") {
                res.status(403).json({
                    ok: false,
                    error: "Only admins can add members",
                });
                return;
            }

            const parsed = AddMemberBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const user = await UserModel.findOne({ email: parsed.data.email });
            if (!user) {
                res.status(404).json({
                    ok: false,
                    error: "User not found with that email",
                });
                return;
            }

            // Upsert membership
            await WorkspaceMemberModel.findOneAndUpdate(
                {
                    userId: user._id.toString(),
                    workspaceId: req.params.id,
                },
                { role: parsed.data.role },
                { upsert: true }
            );

            res.json({
                ok: true,
                member: {
                    userId: user._id,
                    email: user.email,
                    name: user.name,
                    role: parsed.data.role,
                },
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /workspaces/:id/members                                       */
/* ------------------------------------------------------------------ */

router.get(
    "/workspaces/:id/members",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const members = await WorkspaceMemberModel.find({
                workspaceId: req.params.id,
            });

            const userIds = members.map((m) => m.userId);
            const users = await UserModel.find({ _id: { $in: userIds } }).select(
                "email name"
            );

            const result = members.map((m) => {
                const user = users.find(
                    (u) => u._id.toString() === m.userId
                );
                return {
                    userId: m.userId,
                    email: user?.email || "",
                    name: user?.name || "",
                    role: m.role,
                };
            });

            res.json({ ok: true, members: result });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
