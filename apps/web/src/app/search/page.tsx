"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
    score: number;
    text: string;
    docId: string;
    chunkIndex: number;
    title: string;
    author: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError("");
        setResults([]);
        setSearched(true);

        try {
            const res = await fetch(
                `${API}/search?q=${encodeURIComponent(query.trim())}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Search failed");
            setResults(data.results || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">🔍 Semantic Search</h1>
            <p className="page-subtitle">
                Search across all ingested documents using AI-powered vector similarity.
            </p>

            <form onSubmit={handleSearch} className="mt-6 flex gap-3">
                <input
                    className="input-field flex-1"
                    placeholder="Search for anything..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "..." : "Search"}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {searched && !loading && results.length === 0 && !error && (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No results found. Try ingesting some documents first.
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-6 space-y-3">
                    <div className="text-xs text-gray-500 font-medium">
                        {results.length} result{results.length > 1 ? "s" : ""} found
                    </div>
                    {results.map((r, i) => (
                        <div key={i} className="result-card">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-brand-400">
                                        {r.title}
                                    </span>
                                    {r.author && (
                                        <span className="text-[10px] text-gray-500">
                                            by {r.author}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-600">
                                        Chunk #{r.chunkIndex}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-medium">
                                        {(r.score * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
                                {r.text}
                            </p>
                            <div className="mt-2 text-[10px] text-gray-600 font-mono">
                                docId: {r.docId}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
