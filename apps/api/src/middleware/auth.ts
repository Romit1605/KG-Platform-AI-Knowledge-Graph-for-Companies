import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface JWTPayload {
    userId: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export function verifyJWT(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({
            ok: false,
            error: "Missing or invalid authorization header",
        });
        return;
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ ok: false, error: "Invalid or expired token" });
    }
}

/** Sets req.user if token present but does not block unauthorized requests */
export function optionalJWT(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
        const token = header.slice(7);
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
            req.user = payload;
        } catch {
            // ignore invalid tokens for optional auth
        }
    }
    next();
}
