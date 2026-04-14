"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GapExample {
    question: string;
    createdAt: string;
    userId?: string;
}

interface SuggestedOwner {
    personName: string;
    score: number;
    reason: string;
}

interface SuggestedDoc {
    title: string;
    outline: string;
}

interface KnowledgeGap {
    _id: string;
    question: string;
    count: number;
    avgRetrievalScore: number;
    status: string;
    lastAskedAt: string;
    examples: GapExample[];
    suggestedOwners: SuggestedOwner[];
    suggestedDocsToCreate: SuggestedDoc[];
}

export default function KnowledgeGapsPage() {
    const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("open");
    const [selected, setSelected] = useState<KnowledgeGap | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generatedDoc, setGeneratedDoc] = useState<{ title: string; outline: string } | null>(null);

    useEffect(() => {
        fetchGaps();
    }, [statusFilter]);

    async function fetchGaps() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/knowledge-gaps?status=${statusFilter}`);
            const data = await res.json();
            if (data.ok) setGaps(data.gaps);
        } catch {}
        setLoading(false);
    }

    async function changeStatus(id: string, status: string) {
        try {
            await fetch(`${API}/knowledge-gaps/${id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            fetchGaps();
            if (selected?._id === id) {
                setSelected((prev) => (prev ? { ...prev, status } : null));
            }
        } catch {}
    }

    async function generateDocOutline(id: string) {
        setGenerating(true);
        setGeneratedDoc(null);
        try {
            const res = await fetch(`${API}/knowledge-gaps/${id}/suggest-doc`, {
                method: "POST",
            });
            const data = await res.json();
            if (data.ok) {
                setGeneratedDoc(data.suggestedDoc);
                fetchGaps();
            }
        } catch {}
        setGenerating(false);
    }

    const scoreColor = (score: number) => {
        if (score < 0.2) return "text-red-400";
        if (score < 0.35) return "text-yellow-400";
        return "text-green-400";
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">🔍 Knowledge Gaps</h1>
            <p className="page-subtitle">
                Questions that couldn&apos;t be answered well. Track, assign, and create documentation to fill gaps.
            </p>

            {/* Status filter */}
            <div className="mt-6 flex gap-2">
                {["open", "in_progress", "resolved"].map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setSelected(null); }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            statusFilter === s
                                ? "bg-brand-500 text-white"
                                : "bg-dark-300 text-gray-400 hover:text-white"
                        }`}
                    >
                        {s.replace("_", " ")}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : gaps.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No knowledge gaps with status &quot;{statusFilter}&quot;.
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gap list */}
                    <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">{gaps.length} gap(s)</div>
                        {gaps.map((gap) => (
                            <button
                                key={gap._id}
                                onClick={() => { setSelected(gap); setGeneratedDoc(null); }}
                                className={`result-card w-full text-left ${
                                    selected?._id === gap._id ? "ring-1 ring-brand-500" : ""
                                }`}
                            >
                                <div className="font-semibold text-white text-xs line-clamp-2">
                                    {gap.question}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                                    <span className="text-gray-400">Asked {gap.count}×</span>
                                    <span className={scoreColor(gap.avgRetrievalScore)}>
                                        Score: {gap.avgRetrievalScore.toFixed(2)}
                                    </span>
                                    <span className="text-gray-600">
                                        {new Date(gap.lastAskedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Detail panel */}
                    <div className="card">
                        {selected ? (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-white">
                                    {selected.question}
                                </h3>
                                <div className="flex gap-2 text-[10px]">
                                    <span className="px-2 py-0.5 rounded-full bg-dark-300 text-gray-400">
                                        {selected.count}× asked
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full bg-dark-300 ${scoreColor(selected.avgRetrievalScore)}`}>
                                        Score: {selected.avgRetrievalScore.toFixed(2)}
                                    </span>
                                </div>

                                {/* Status change */}
                                <div className="flex gap-2">
                                    {["open", "in_progress", "resolved"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => changeStatus(selected._id, s)}
                                            className={`px-2 py-1 rounded text-[10px] font-medium ${
                                                selected.status === s
                                                    ? "bg-brand-500 text-white"
                                                    : "bg-dark-400 text-gray-500 hover:text-white"
                                            }`}
                                        >
                                            {s.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>

                                {/* Examples */}
                                {selected.examples.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                            Recent examples
                                        </h4>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {selected.examples.slice(-5).map((ex, i) => (
                                                <div key={i} className="text-[10px] text-gray-500">
                                                    &quot;{ex.question}&quot;
                                                    <span className="ml-1 text-gray-700">
                                                        {new Date(ex.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Suggested owners */}
                                {selected.suggestedOwners.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                            Suggested owners
                                        </h4>
                                        {selected.suggestedOwners.map((o, i) => (
                                            <div key={i} className="text-xs text-gray-300">
                                                👤 {o.personName} (score: {o.score})
                                                <span className="text-[10px] text-gray-600 ml-1">{o.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Generate doc */}
                                <button
                                    onClick={() => generateDocOutline(selected._id)}
                                    disabled={generating}
                                    className="btn-primary w-full"
                                >
                                    {generating ? "Generating..." : "📝 Generate Doc Outline"}
                                </button>

                                {generatedDoc && (
                                    <div className="mt-2 p-3 rounded bg-dark-400 border border-dark-200">
                                        <h4 className="text-xs font-semibold text-brand-400">{generatedDoc.title}</h4>
                                        <pre className="text-[10px] text-gray-400 mt-1 whitespace-pre-wrap">
                                            {generatedDoc.outline}
                                        </pre>
                                    </div>
                                )}

                                {/* Existing suggested docs */}
                                {selected.suggestedDocsToCreate.length > 0 && !generatedDoc && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 mb-1">
                                            Previously generated outlines
                                        </h4>
                                        {selected.suggestedDocsToCreate.map((d, i) => (
                                            <div key={i} className="text-xs text-gray-500 mb-1">
                                                📄 {d.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 text-center py-8">
                                Select a knowledge gap to view details
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
