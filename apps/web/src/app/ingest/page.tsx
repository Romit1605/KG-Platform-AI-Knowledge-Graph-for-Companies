"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function IngestPage() {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [text, setText] = useState("");
    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await fetch(`${API}/ingest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, author, text, source }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Ingest failed");
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">📥 Ingest Document</h1>
            <p className="page-subtitle">
                Add a document to the knowledge graph. It will be chunked, embedded, and
                entities will be extracted.
            </p>

            <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Title *
                        </label>
                        <input
                            className="input-field"
                            placeholder="Document title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Author
                        </label>
                        <input
                            className="input-field"
                            placeholder="Author name"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Source
                    </label>
                    <input
                        className="input-field"
                        placeholder="URL or reference"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Text *
                    </label>
                    <textarea
                        className="textarea-field h-48"
                        placeholder="Paste document text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        "Ingest Document"
                    )}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="card mt-6">
                    <h2 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Ingestion Successful
                    </h2>
                    <pre className="text-xs text-gray-300 bg-surface-900/50 rounded-xl p-4 overflow-auto max-h-96">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
