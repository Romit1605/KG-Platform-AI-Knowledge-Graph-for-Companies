"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AutoDoc {
    _id: string;
    type: string;
    title: string;
    markdown: string;
    createdBy: string;
    createdAt: string;
    sourceRefs: {
        incidentId?: string;
        docId?: string;
        chatLogIds?: string[];
        githubRepo?: string;
    };
}

export default function AutoDocsPage() {
    const [docs, setDocs] = useState<AutoDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("");
    const [selected, setSelected] = useState<AutoDoc | null>(null);
    const [genType, setGenType] = useState<"from-incident" | "from-chats" | "from-doc">("from-chats");
    const [genInput, setGenInput] = useState("");
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        fetchDocs();
    }, [typeFilter]);

    async function fetchDocs() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (typeFilter) params.set("type", typeFilter);
            const res = await fetch(`${API}/auto-docs?${params}`);
            const data = await res.json();
            if (data.ok) setDocs(data.docs);
        } catch {}
        setLoading(false);
    }

    async function generate() {
        setGenerating(true);
        try {
            const body: Record<string, string> = {};
            if (genType === "from-incident") body.incidentId = genInput;
            if (genType === "from-doc") body.docId = genInput;
            // from-chats needs no special input
            const res = await fetch(`${API}/auto-docs/${genType}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                fetchDocs();
                setSelected(data.doc);
            }
        } catch {}
        setGenerating(false);
    }

    async function publish(id: string) {
        setPublishing(true);
        try {
            const res = await fetch(`${API}/auto-docs/${id}/publish`, {
                method: "POST",
            });
            const data = await res.json();
            if (data.ok) {
                fetchDocs();
                alert("Published to Knowledge Base!");
            }
        } catch {}
        setPublishing(false);
    }

    const types = ["postmortem", "runbook", "change_summary", "faq"];
    const typeLabels: Record<string, string> = {
        postmortem: "🔥 Postmortem",
        runbook: "📋 Runbook",
        change_summary: "📝 Change Summary",
        faq: "❓ FAQ",
    };

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="page-title">📄 Auto-generated Docs</h1>
            <p className="page-subtitle">
                AI-generated documentation from incidents, chat logs, and existing docs.
            </p>

            {/* Generator */}
            <div className="card mt-6">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">Generate New</h3>
                <div className="flex flex-wrap gap-2 items-end">
                    <select
                        value={genType}
                        onChange={(e) => setGenType(e.target.value as typeof genType)}
                        className="input text-xs w-48"
                    >
                        <option value="from-chats">From Recent Chats (FAQ)</option>
                        <option value="from-incident">From Incident</option>
                        <option value="from-doc">From Document</option>
                    </select>
                    {genType !== "from-chats" && (
                        <input
                            className="input text-xs flex-1"
                            placeholder={genType === "from-incident" ? "Incident ID" : "Document ID"}
                            value={genInput}
                            onChange={(e) => setGenInput(e.target.value)}
                        />
                    )}
                    <button
                        onClick={generate}
                        disabled={generating}
                        className="btn-primary text-xs"
                    >
                        {generating ? "Generating..." : "Generate"}
                    </button>
                </div>
            </div>

            {/* Type filter */}
            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => { setTypeFilter(""); setSelected(null); }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                        !typeFilter ? "bg-brand-500 text-white" : "bg-dark-300 text-gray-400 hover:text-white"
                    }`}
                >
                    All
                </button>
                {types.map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTypeFilter(t); setSelected(null); }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            typeFilter === t
                                ? "bg-brand-500 text-white"
                                : "bg-dark-300 text-gray-400 hover:text-white"
                        }`}
                    >
                        {typeLabels[t]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : docs.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No auto-generated docs yet. Use the generator above.
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Doc list */}
                    <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
                        {docs.map((doc) => (
                            <button
                                key={doc._id}
                                onClick={() => setSelected(doc)}
                                className={`result-card w-full text-left ${
                                    selected?._id === doc._id ? "ring-1 ring-brand-500" : ""
                                }`}
                            >
                                <div className="text-[10px] text-brand-400 font-medium">
                                    {typeLabels[doc.type] || doc.type}
                                </div>
                                <div className="text-xs text-white font-semibold line-clamp-2 mt-0.5">
                                    {doc.title}
                                </div>
                                <div className="text-[10px] text-gray-600 mt-1">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Markdown preview */}
                    <div className="lg:col-span-3 card">
                        {selected ? (
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <span className="text-[10px] text-brand-400 font-medium">
                                            {typeLabels[selected.type]}
                                        </span>
                                        <h3 className="text-sm font-semibold text-white mt-0.5">
                                            {selected.title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => publish(selected._id)}
                                        disabled={publishing}
                                        className="btn-primary text-[10px]"
                                    >
                                        {publishing ? "Publishing..." : "📤 Publish to KB"}
                                    </button>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none text-xs text-gray-300 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                    {selected.markdown}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 text-center py-12">
                                Select a document to preview
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
