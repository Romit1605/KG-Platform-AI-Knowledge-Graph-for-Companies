import { Request, Response, NextFunction } from "express";
import {
    WorkspaceMemberModel,
    WorkspaceRole,
} from "../models/WorkspaceMember.js";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
};

/**
 * Middleware factory that checks the authenticated user has at least `minRole`
 * in the workspace identified by workspaceId (from body, query, or params).
 */
export function requireWorkspaceRole(minRole: WorkspaceRole) {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ ok: false, error: "Authentication required" });
            return;
        }

        const workspaceId =
            req.body?.workspaceId ||
            req.query?.workspaceId ||
            req.params?.workspaceId;

        if (!workspaceId) {
            res.status(400).json({ ok: false, error: "workspaceId is required" });
            return;
        }

        const member = await WorkspaceMemberModel.findOne({
            userId: req.user.userId,
            workspaceId,
        });

        if (!member) {
            res.status(403).json({
                ok: false,
                error: "Not a member of this workspace",
            });
            return;
        }

        if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minRole]) {
            res.status(403).json({
                ok: false,
                error: `Requires ${minRole} role or higher`,
            });
            return;
        }

        next();
    };
}
