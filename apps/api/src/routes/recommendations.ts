import { Router, Request, Response } from "express";
import { verifyJWT } from "../middleware/auth.js";
import { ChatLogModel } from "../models/ChatLog.js";
import { DocumentModel } from "../models/Document.js";
import { UserModel } from "../models/User.js";
import { extractTags } from "../utils/taxonomyExtractor.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /recommendations — personalized doc recommendations            */
/* ------------------------------------------------------------------ */

router.get(
    "/recommendations",
    verifyJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user!.userId;
            const workspaceId = (req.query.workspaceId as string) || "default";

            // 1) Fetch user profile
            const user = await UserModel.findById(userId)
                .select("interests team roleTitle")
                .lean();

            // 2) Get user's recent chat topics (last 14 days)
            const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const recentChats = await ChatLogModel.find({
                userId,
                workspaceId,
                createdAt: { $gte: since },
            })
                .sort({ createdAt: -1 })
                .limit(20)
                .select("question")
                .lean();

            // Extract topic vector from recent questions
            let chatTopics: string[] = [];
            if (recentChats.length > 0) {
                const combinedQuestions = recentChats
                    .map((c) => c.question)
                    .join("\n");
                try {
                    chatTopics = await extractTags("User Questions", combinedQuestions);
                } catch {
                    // If LLM unavailable, extract keywords manually
                    chatTopics = combinedQuestions
                        .toLowerCase()
                        .replace(/[^\w\s]/g, "")
                        .split(/\s+/)
                        .filter((w) => w.length > 4)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .slice(0, 10);
                }
            }

            // Combine user interests + chat topics
            const allTopics = [
                ...(user?.interests || []),
                ...chatTopics,
            ].filter((v, i, a) => a.indexOf(v) === i);

            // 3) Score documents
            const wsFilter = {
                $or: [
                    { workspaceId },
                    { workspaceId: { $exists: false } },
                    { workspaceId: "default" },
                ],
                visibility: "public",
            };

            const allDocs = await DocumentModel.find(wsFilter)
                .select("title author tags trustScore createdAt source")
                .sort({ createdAt: -1 })
                .limit(200)
                .lean();

            const now = Date.now();
            const scoredDocs = allDocs.map((doc) => {
                let score = 0;
                const reasons: string[] = [];

                // Topic overlap
                const overlap = (doc.tags || []).filter((t) =>
                    allTopics.some(
                        (ut) =>
                            ut.toLowerCase() === t.toLowerCase() ||
                            t.toLowerCase().includes(ut.toLowerCase())
                    )
                );
                if (overlap.length > 0) {
                    score += overlap.length * 10;
                    reasons.push(`Matches your interests: ${overlap.join(", ")}`);
                }

                // Trust score bonus
                if (doc.trustScore > 70) {
                    score += 5;
                    reasons.push("Highly trusted document");
                }

                // Freshness boost (docs updated in last 7 days)
                const ageMs = now - new Date(doc.createdAt).getTime();
                const ageDays = ageMs / (24 * 60 * 60 * 1000);
                if (ageDays < 7) {
                    score += 8;
                    reasons.push("Recently added");
                } else if (ageDays < 30) {
                    score += 3;
                    reasons.push("Updated this month");
                }

                // Team relevance (if user has team and doc is tagged with it)
                if (user?.team) {
                    const teamMatch = (doc.tags || []).some(
                        (t) =>
                            t.toLowerCase().includes(user.team!.toLowerCase())
                    );
                    if (teamMatch) {
                        score += 7;
                        reasons.push("Related to your team");
                    }
                }

                return {
                    _id: doc._id,
                    title: doc.title,
                    author: doc.author,
                    tags: doc.tags,
                    trustScore: doc.trustScore,
                    createdAt: doc.createdAt,
                    score,
                    reasons,
                };
            });

            // Sort by score descending and return top 20
            scoredDocs.sort((a, b) => b.score - a.score);
            const recommendations = scoredDocs
                .filter((d) => d.score > 0)
                .slice(0, 20);

            res.json({
                ok: true,
                recommendations,
                userTopics: allTopics,
            });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
