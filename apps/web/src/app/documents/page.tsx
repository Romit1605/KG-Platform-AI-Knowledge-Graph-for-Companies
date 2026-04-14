"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Doc {
    _id: string;
    title: string;
    author?: string;
    source?: string;
    tags?: string[];
    visibility?: string;
    createdAt: string;
}

export default function DocumentsPage() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [tagFilter, setTagFilter] = useState("");

    useEffect(() => {
        fetchDocs();
    }, [tagFilter]);

    async function fetchDocs() {
        setLoading(true);
        try {
            const url = tagFilter
                ? `${API}/documents?tag=${encodeURIComponent(tagFilter)}`
                : `${API}/documents`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.ok) setDocs(data.documents);
        } catch {}
        setLoading(false);
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">📄 Documents</h1>
            <p className="page-subtitle">
                Browse all ingested documents. Click a document to view version history.
            </p>

            <div className="mt-6 flex gap-3">
                <input
                    className="input-field flex-1"
                    placeholder="Filter by tag..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : docs.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No documents found. Ingest some documents first.
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    <div className="text-xs text-gray-500 font-medium">
                        {docs.length} document(s)
                    </div>
                    {docs.map((doc) => (
                        <Link
                            key={doc._id}
                            href={`/documents/${doc._id}/history`}
                            className="result-card block"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-semibold text-white text-sm">
                                        {doc.title}
                                    </div>
                                    {doc.author && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            by {doc.author}
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-600">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            {doc.tags && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {doc.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                                {doc.source && (
                                    <span className="text-[10px] text-gray-600">
                                        source: {doc.source}
                                    </span>
                                )}
                                {doc.visibility && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            doc.visibility === "private"
                                                ? "bg-yellow-500/10 text-yellow-400"
                                                : "bg-green-500/10 text-green-400"
                                        }`}
                                    >
                                        {doc.visibility}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
