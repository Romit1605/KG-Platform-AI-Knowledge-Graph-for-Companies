import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User.js";
import { env } from "../env.js";
import { verifyJWT } from "../middleware/auth.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  POST /auth/register                                               */
/* ------------------------------------------------------------------ */

const RegisterBody = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
});

router.post(
    "/auth/register",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = RegisterBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const { email, password, name } = parsed.data;

            const existing = await UserModel.findOne({ email });
            if (existing) {
                res.status(409).json({
                    ok: false,
                    error: "Email already registered",
                });
                return;
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await UserModel.create({ email, passwordHash, name });

            const token = jwt.sign(
                { userId: user._id.toString(), email: user.email },
                env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.json({
                ok: true,
                token,
                user: { id: user._id, email: user.email, name: user.name },
            });
        } catch (err: any) {
            console.error("[Auth] Register error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  POST /auth/login                                                  */
/* ------------------------------------------------------------------ */

const LoginBody = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

router.post(
    "/auth/login",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = LoginBody.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ ok: false, error: parsed.error.flatten() });
                return;
            }

            const { email, password } = parsed.data;

            const user = await UserModel.findOne({ email });
            if (!user) {
                res.status(401).json({ ok: false, error: "Invalid credentials" });
                return;
            }

            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) {
                res.status(401).json({ ok: false, error: "Invalid credentials" });
                return;
            }

            const token = jwt.sign(
                { userId: user._id.toString(), email: user.email },
                env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.json({
                ok: true,
                token,
                user: { id: user._id, email: user.email, name: user.name },
            });
        } catch (err: any) {
            console.error("[Auth] Login error:", err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

/* ------------------------------------------------------------------ */
/*  GET /auth/me                                                      */
/* ------------------------------------------------------------------ */

router.get(
    "/auth/me",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await UserModel.findById(req.user!.userId).select(
                "-passwordHash"
            );
            if (!user) {
                res.status(404).json({ ok: false, error: "User not found" });
                return;
            }
            res.json({
                ok: true,
                user: { id: user._id, email: user.email, name: user.name },
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
