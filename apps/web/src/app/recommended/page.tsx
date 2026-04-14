"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RecommendedDoc {
    _id: string;
    title: string;
    source: string;
    tags: string[];
    trustScore: number;
    createdAt: string;
    reasons: string[];
    score: number;
}

export default function RecommendedPage() {
    const [docs, setDocs] = useState<RecommendedDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchRecommendations = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) {
                setError("Login required. Recommendations are personalized to your profile.");
                setLoading(false);
                return;
            }
            const res = await fetch(`${API}/recommendations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.ok) setDocs(data.recommendations);
            else setError(data.error || "Failed to load recommendations");
        } catch {
            setError("Failed to connect to API");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const trustColor = (score: number) => {
        if (score >= 70) return "text-green-400";
        if (score >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">✨ Recommended for You</h1>
            <p className="page-subtitle">
                Personalized document recommendations based on your interests, team, and activity.
            </p>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading recommendations...</div>
            ) : error ? (
                <div className="mt-8 text-center text-gray-500 text-sm">{error}</div>
            ) : docs.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No recommendations yet. Start chatting and ingesting docs to get personalized suggestions.
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    {docs.map((doc, i) => (
                        <div key={doc._id} className="result-card">
                            <div className="flex items-start gap-3">
                                <span className="text-lg font-bold text-dark-200 select-none">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white line-clamp-1">
                                        {doc.title}
                                    </div>
                                    <div className="flex gap-2 mt-1 text-[10px]">
                                        <span className="text-gray-500">{doc.source}</span>
                                        <span className={trustColor(doc.trustScore)}>
                                            Trust: {doc.trustScore}
                                        </span>
                                        <span className="text-gray-700">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Reason chips */}
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {doc.reasons.map((reason, ri) => (
                                            <span
                                                key={ri}
                                                className="text-[9px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-medium"
                                            >
                                                {reason}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Tags */}
                                    {doc.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                            {doc.tags.slice(0, 6).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="text-[9px] px-1.5 py-0.5 rounded bg-dark-300 text-gray-500"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-600">Score</div>
                                    <div className="text-sm font-bold text-brand-400">
                                        {doc.score}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
