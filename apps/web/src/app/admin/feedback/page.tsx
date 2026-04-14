"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FeedbackItem {
    _id: string;
    question: string;
    answer: string;
    rating: number;
    sources: { docId: string; chunkIndex: number }[];
    userId?: string;
    createdAt: string;
}

interface FeedbackStats {
    total: number;
    avgRating: number;
    distribution: Record<string, number>;
}

export default function FeedbackPage() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "low" | "high">("all");

    useEffect(() => {
        fetchFeedback();
    }, []);

    async function fetchFeedback() {
        setLoading(true);
        try {
            const token = localStorage.getItem("kg_token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${API}/feedback`, { headers });
            const data = await res.json();
            if (data.ok) {
                setFeedback(data.feedback);
                setStats(data.stats);
            }
        } catch {}
        setLoading(false);
    }

    const filteredFeedback = feedback.filter((f) => {
        if (filter === "low") return f.rating <= 2;
        if (filter === "high") return f.rating >= 4;
        return true;
    });

    const ratingColor = (r: number) => {
        if (r >= 4) return "text-green-400";
        if (r >= 3) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">📊 Feedback & Quality Scores</h1>
            <p className="page-subtitle">
                View user feedback on RAG answers. Track quality trends and identify
                low-rated responses that need improvement.
            </p>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : (
                <>
                    {/* Stats Cards */}
                    {stats && (
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="card text-center">
                                <div className="text-2xl font-bold text-white">
                                    {stats.total}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    Total Feedback
                                </div>
                            </div>
                            <div className="card text-center">
                                <div
                                    className={`text-2xl font-bold ${ratingColor(
                                        stats.avgRating
                                    )}`}
                                >
                                    {stats.avgRating.toFixed(1)}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    Avg Rating
                                </div>
                            </div>
                            <div className="card text-center">
                                <div className="text-2xl font-bold text-green-400">
                                    {feedback.filter((f) => f.rating >= 4).length}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Good (4-5)</div>
                            </div>
                            <div className="card text-center">
                                <div className="text-2xl font-bold text-red-400">
                                    {feedback.filter((f) => f.rating <= 2).length}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Poor (1-2)</div>
                            </div>
                        </div>
                    )}

                    {/* Rating Distribution */}
                    {stats?.distribution && (
                        <div className="mt-4 card">
                            <h3 className="text-xs font-semibold text-gray-400 mb-3">
                                Rating Distribution
                            </h3>
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((r) => {
                                    const count = stats.distribution[String(r)] || 0;
                                    const pct =
                                        stats.total > 0
                                            ? (count / stats.total) * 100
                                            : 0;
                                    return (
                                        <div key={r} className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400 w-4 text-right">
                                                {r}★
                                            </span>
                                            <div className="flex-1 h-2 bg-dark-300 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        r >= 4
                                                            ? "bg-green-500"
                                                            : r === 3
                                                            ? "bg-yellow-500"
                                                            : "bg-red-500"
                                                    }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-600 w-8">
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter */}
                    <div className="mt-6 flex gap-2">
                        {(["all", "high", "low"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                                    filter === f
                                        ? "bg-brand-500 text-white"
                                        : "bg-dark-300 text-gray-400 hover:text-white"
                                }`}
                            >
                                {f === "all"
                                    ? "All"
                                    : f === "high"
                                    ? "Good (4-5)"
                                    : "Poor (1-2)"}
                            </button>
                        ))}
                    </div>

                    {/* Feedback List */}
                    {filteredFeedback.length === 0 ? (
                        <div className="mt-6 text-center text-gray-500 text-sm">
                            No feedback matching filter.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {filteredFeedback.map((f) => (
                                <div key={f._id} className="result-card">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-white">
                                                Q: {f.question}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 line-clamp-3">
                                                A: {f.answer}
                                            </div>
                                        </div>
                                        <div className="ml-3 text-right flex-shrink-0">
                                            <div
                                                className={`text-lg font-bold ${ratingColor(
                                                    f.rating
                                                )}`}
                                            >
                                                {f.rating}★
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                                        <span>
                                            {new Date(f.createdAt).toLocaleString()}
                                        </span>
                                        {f.sources.length > 0 && (
                                            <span>{f.sources.length} source(s)</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
