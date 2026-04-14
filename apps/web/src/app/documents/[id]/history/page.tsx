"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Version {
    _id: string;
    versionNumber: number;
    title: string;
    createdAt: string;
}

interface DiffChange {
    type: "added" | "removed" | "unchanged";
    value: string;
    lineStart: number;
    lineEnd: number;
}

interface DiffResult {
    changes: DiffChange[];
    summary: { added: number; removed: number; unchanged: number };
}

export default function DocumentHistoryPage() {
    const params = useParams();
    const docId = params.id as string;

    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [diff, setDiff] = useState<DiffResult | null>(null);
    const [diffLoading, setDiffLoading] = useState(false);
    const [v1, setV1] = useState<number | null>(null);
    const [v2, setV2] = useState<number | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [docId]);

    async function fetchVersions() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/documents/${docId}/versions`);
            const data = await res.json();
            if (data.ok) setVersions(data.versions);
        } catch {}
        setLoading(false);
    }

    async function fetchDiff() {
        if (v1 == null || v2 == null || v1 === v2) return;
        setDiffLoading(true);
        setDiff(null);
        try {
            const res = await fetch(
                `${API}/documents/${docId}/diff?v1=${v1}&v2=${v2}`
            );
            const data = await res.json();
            if (data.ok) setDiff(data.diff);
        } catch {}
        setDiffLoading(false);
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">📜 Document Version History</h1>
            <p className="page-subtitle">
                View all versions of this document and compare changes between versions.
            </p>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : versions.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No versions recorded yet. Update the document to create a version.
                </div>
            ) : (
                <>
                    {/* Version List */}
                    <div className="mt-6 space-y-2">
                        <div className="text-xs text-gray-500 font-medium">
                            {versions.length} version(s)
                        </div>
                        {versions.map((ver) => (
                            <div key={ver._id} className="result-card flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-white">
                                        v{ver.versionNumber}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        &quot;{ver.title}&quot;
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-600">
                                    {new Date(ver.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Diff Compare */}
                    <div className="mt-8 card">
                        <h3 className="text-sm font-semibold text-white mb-3">
                            Compare Versions
                        </h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-1">
                                    From version
                                </label>
                                <select
                                    className="input-field w-full"
                                    value={v1 ?? ""}
                                    onChange={(e) => setV1(Number(e.target.value) || null)}
                                >
                                    <option value="">Select...</option>
                                    {versions.map((v) => (
                                        <option key={v.versionNumber} value={v.versionNumber}>
                                            v{v.versionNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-1">
                                    To version
                                </label>
                                <select
                                    className="input-field w-full"
                                    value={v2 ?? ""}
                                    onChange={(e) => setV2(Number(e.target.value) || null)}
                                >
                                    <option value="">Select...</option>
                                    {versions.map((v) => (
                                        <option key={v.versionNumber} value={v.versionNumber}>
                                            v{v.versionNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="btn-primary"
                                disabled={v1 == null || v2 == null || v1 === v2}
                                onClick={fetchDiff}
                            >
                                Compare
                            </button>
                        </div>
                    </div>

                    {/* Diff Output */}
                    {diffLoading && (
                        <div className="mt-6 text-center text-gray-500 text-sm">
                            Computing diff...
                        </div>
                    )}
                    {diff && (
                        <div className="mt-6 card">
                            <div className="flex gap-4 text-xs mb-3">
                                <span className="text-green-400">
                                    +{diff.summary.added} added
                                </span>
                                <span className="text-red-400">
                                    -{diff.summary.removed} removed
                                </span>
                                <span className="text-gray-500">
                                    {diff.summary.unchanged} unchanged
                                </span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto rounded border border-dark-300 bg-dark-400 p-3 font-mono text-xs">
                                {diff.changes.map((change, i) => (
                                    <pre
                                        key={i}
                                        className={`whitespace-pre-wrap ${
                                            change.type === "added"
                                                ? "bg-green-500/10 text-green-300"
                                                : change.type === "removed"
                                                ? "bg-red-500/10 text-red-300"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        {change.type === "added"
                                            ? "+"
                                            : change.type === "removed"
                                            ? "-"
                                            : " "}
                                        {change.value}
                                    </pre>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
