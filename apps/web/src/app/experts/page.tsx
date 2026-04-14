"use client";

import { useState, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Expert {
    person: string;
    score: number;
    authored: number;
    mentioned: number;
    connections: number;
}

export default function ExpertsPage() {
    const [topic, setTopic] = useState("");
    const [experts, setExperts] = useState<Expert[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    async function handleSearch(e: FormEvent) {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setExperts([]);
        setSearched(true);
        try {
            const res = await fetch(
                `${API}/experts?topic=${encodeURIComponent(topic.trim())}`
            );
            const data = await res.json();
            if (data.ok) setExperts(data.experts);
        } catch {}
        setLoading(false);
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">👤 Expertise Finder</h1>
            <p className="page-subtitle">
                Search for domain experts by topic. Results are ranked by authorship,
                mentions, and knowledge-graph connections.
            </p>

            <form onSubmit={handleSearch} className="mt-6 flex gap-3">
                <input
                    className="input-field flex-1"
                    placeholder="Enter a topic, e.g. Kubernetes, CI/CD, Auth..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
                <button className="btn-primary" disabled={loading || !topic.trim()}>
                    {loading ? "Searching..." : "Find Experts"}
                </button>
            </form>

            {loading && (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    Querying knowledge graph...
                </div>
            )}

            {!loading && searched && experts.length === 0 && (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No experts found for &quot;{topic}&quot;. Try a broader topic.
                </div>
            )}

            {experts.length > 0 && (
                <div className="mt-6 space-y-3">
                    <div className="text-xs text-gray-500 font-medium">
                        {experts.length} expert(s) for &quot;{topic}&quot;
                    </div>
                    {experts.map((expert, i) => (
                        <div key={expert.person} className="result-card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-brand-400 w-8 text-center">
                                        #{i + 1}
                                    </span>
                                    <div>
                                        <div className="font-semibold text-white text-sm">
                                            {expert.person}
                                        </div>
                                        <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                                            <span>📝 {expert.authored} authored</span>
                                            <span>📌 {expert.mentioned} mentions</span>
                                            <span>🔗 {expert.connections} connections</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-brand-400">
                                        {expert.score}
                                    </div>
                                    <div className="text-[10px] text-gray-600">score</div>
                                </div>
                            </div>

                            {/* Score bar */}
                            <div className="mt-2 h-1.5 rounded-full bg-dark-300 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-brand-500"
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (expert.score /
                                                Math.max(...experts.map((e) => e.score))) *
                                                100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
