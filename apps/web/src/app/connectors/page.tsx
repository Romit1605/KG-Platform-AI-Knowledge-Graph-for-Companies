"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "slack" | "discord" | "github" | "markdown";

export default function ConnectorsPage() {
    const [tab, setTab] = useState<Tab>("slack");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    // Slack
    const [slackJson, setSlackJson] = useState("");

    // Discord
    const [discordJson, setDiscordJson] = useState("");

    // GitHub
    const [repoUrl, setRepoUrl] = useState("");

    // Markdown
    const [mdFiles, setMdFiles] = useState<{ name: string; content: string }[]>([]);

    async function handleSlack(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const channels = JSON.parse(slackJson);
            const res = await fetch(`${API}/connectors/slack`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channels: Array.isArray(channels) ? channels : [channels] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDiscord(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const messages = JSON.parse(discordJson);
            const res = await fetch(`${API}/connectors/discord`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGitHub(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch(`${API}/connectors/github`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkdown(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch(`${API}/connectors/markdown`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: mdFiles }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files) return;
        const readers: Promise<{ name: string; content: string }>[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            readers.push(
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () =>
                        resolve({ name: file.name, content: reader.result as string });
                    reader.readAsText(file);
                })
            );
        }
        Promise.all(readers).then(setMdFiles);
    }

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: "slack", label: "Slack", icon: "💬" },
        { key: "discord", label: "Discord", icon: "🎮" },
        { key: "github", label: "GitHub", icon: "🐙" },
        { key: "markdown", label: "Markdown", icon: "📝" },
    ];

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">🔌 Source Connectors</h1>
            <p className="page-subtitle">
                Import knowledge from external sources into the knowledge graph.
            </p>

            {/* Tabs */}
            <div className="mt-6 flex gap-2">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setTab(t.key); setResult(null); setError(""); }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            tab === t.key
                                ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Slack */}
            {tab === "slack" && (
                <form onSubmit={handleSlack} className="card mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Slack Export JSON
                        </label>
                        <textarea
                            className="textarea-field h-48 font-mono text-xs"
                            placeholder={'[\n  {\n    "name": "general",\n    "messages": [\n      {"user": "alice", "text": "Hello world", "ts": "1234"}\n    ]\n  }\n]'}
                            value={slackJson}
                            onChange={(e) => setSlackJson(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? "Importing..." : "Import Slack Data"}
                    </button>
                </form>
            )}

            {/* Discord */}
            {tab === "discord" && (
                <form onSubmit={handleDiscord} className="card mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Discord Messages JSON
                        </label>
                        <textarea
                            className="textarea-field h-48 font-mono text-xs"
                            placeholder={'[\n  {"author":{"username":"bob"}, "content":"Hey team", "timestamp":"2024-01-01T10:00:00Z"}\n]'}
                            value={discordJson}
                            onChange={(e) => setDiscordJson(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? "Importing..." : "Import Discord Data"}
                    </button>
                </form>
            )}

            {/* GitHub */}
            {tab === "github" && (
                <form onSubmit={handleGitHub} className="card mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Repository URL
                        </label>
                        <input
                            className="input-field"
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            required
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                            Will fetch README and /docs folder from the public repository.
                        </p>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? "Fetching..." : "Import GitHub Docs"}
                    </button>
                </form>
            )}

            {/* Markdown */}
            {tab === "markdown" && (
                <form onSubmit={handleMarkdown} className="card mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Upload .md Files
                        </label>
                        <input
                            type="file"
                            accept=".md"
                            multiple
                            className="input-field text-sm"
                            onChange={handleFileUpload}
                        />
                        {mdFiles.length > 0 && (
                            <div className="mt-2 text-xs text-gray-400">
                                {mdFiles.length} file(s) selected: {mdFiles.map((f) => f.name).join(", ")}
                            </div>
                        )}
                    </div>
                    <button type="submit" disabled={loading || mdFiles.length === 0} className="btn-primary w-full">
                        {loading ? "Importing..." : "Import Markdown Files"}
                    </button>
                </form>
            )}

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="card mt-4">
                    <h2 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Import Complete
                    </h2>
                    <pre className="text-xs text-gray-300 bg-surface-900/50 rounded-xl p-4 overflow-auto max-h-80">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
