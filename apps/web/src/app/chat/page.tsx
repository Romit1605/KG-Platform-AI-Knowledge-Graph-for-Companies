"use client";

import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Source {
    ref: string;
    docId: string;
    chunkIndex: number;
    title: string;
    qdrantId?: string;
    score?: number;
}

interface MentorExtras {
    recommendedDocs: { _id: string; title: string; trustScore: number }[];
    experts: { name: string; type: string }[];
    nextActions: string[];
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    retrievalScore?: number;
    mentor?: MentorExtras;
}

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState("");
    const [mentorMode, setMentorMode] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || loading) return;
        const question = input.trim();
        setInput("");
        setError("");

        setMessages((prev) => [...prev, { role: "user", content: question }]);
        setLoading(true);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${API}/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    question,
                    mode: mentorMode ? "mentor" : "normal",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Chat failed");

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.answer,
                    sources: data.sources,
                    retrievalScore: data.retrievalScore,
                    mentor: data.mentor,
                },
            ]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">💬 RAG Chat</h1>
                    <p className="page-subtitle">
                        Ask questions about your ingested documents. Answers come with
                        citations.
                    </p>
                </div>
                {/* Mentor mode toggle */}
                <button
                    onClick={() => setMentorMode(!mentorMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        mentorMode
                            ? "bg-brand-500 text-white"
                            : "bg-dark-300 text-gray-400 hover:text-white"
                    }`}
                >
                    <span>{mentorMode ? "🎓" : "💬"}</span>
                    {mentorMode ? "Mentor Mode" : "Normal Mode"}
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 mt-6 overflow-y-auto space-y-4 pr-2">
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 text-sm mt-20">
                        {mentorMode
                            ? "🎓 Mentor mode active. Ask a question to get an answer with recommended docs, experts, and next actions."
                            : "Ask a question to get started. Make sure you\u2019ve ingested some documents first."}
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                    ? "bg-brand-500/20 border border-brand-500/20 text-white"
                                    : "bg-surface-800/60 border border-white/5 text-gray-200"
                                }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                            </p>

                            {/* Retrieval score */}
                            {msg.retrievalScore !== undefined && (
                                <div className="mt-2 text-[10px] text-gray-600">
                                    Retrieval confidence:{" "}
                                    <span className={
                                        msg.retrievalScore > 0.5
                                            ? "text-green-400"
                                            : msg.retrievalScore > 0.3
                                            ? "text-yellow-400"
                                            : "text-red-400"
                                    }>
                                        {(msg.retrievalScore * 100).toFixed(0)}%
                                    </span>
                                </div>
                            )}

                            {/* Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="text-[10px] text-gray-500 font-medium mb-1.5">
                                        Sources
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {msg.sources.map((s, j) => (
                                            <span
                                                key={j}
                                                className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-medium"
                                                title={`Doc: ${s.docId}, Chunk: ${s.chunkIndex}${s.score ? `, Score: ${s.score.toFixed(2)}` : ""}`}
                                            >
                                                {s.ref} {s.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mentor extras */}
                            {msg.mentor && (
                                <div className="mt-3 pt-3 border-t border-brand-500/20 space-y-2">
                                    {/* Recommended docs */}
                                    {msg.mentor.recommendedDocs.length > 0 && (
                                        <div>
                                            <div className="text-[10px] text-brand-400 font-semibold mb-0.5">
                                                📚 Recommended Reading
                                            </div>
                                            {msg.mentor.recommendedDocs.map((doc) => (
                                                <div key={doc._id} className="text-[10px] text-gray-400">
                                                    📄 {doc.title}
                                                    <span className="text-gray-600 ml-1">
                                                        (trust: {doc.trustScore})
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Experts */}
                                    {msg.mentor.experts.length > 0 && (
                                        <div>
                                            <div className="text-[10px] text-brand-400 font-semibold mb-0.5">
                                                👤 Experts to Contact
                                            </div>
                                            {msg.mentor.experts.map((exp, j) => (
                                                <div key={j} className="text-[10px] text-gray-400">
                                                    {exp.name}
                                                    <span className="text-gray-600 ml-1">
                                                        ({exp.type})
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Next actions */}
                                    {msg.mentor.nextActions.length > 0 && (
                                        <div>
                                            <div className="text-[10px] text-brand-400 font-semibold mb-0.5">
                                                🎯 Suggested Next Actions
                                            </div>
                                            {msg.mentor.nextActions.map((action, j) => (
                                                <div key={j} className="text-[10px] text-gray-400">
                                                    • {action}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-surface-800/60 border border-white/5 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                                <div
                                    className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                                    style={{ animationDelay: "0.1s" }}
                                />
                                <div
                                    className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                                    style={{ animationDelay: "0.2s" }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-3">
                    {error}
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-3 mt-4 pb-2">
                <textarea
                    className="textarea-field flex-1 h-12 min-h-[48px] max-h-32"
                    placeholder={mentorMode ? "Ask your mentor a question..." : "Ask a question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button type="submit" disabled={loading} className="btn-primary h-12">
                    Send
                </button>
            </form>
        </div>
    );
}
