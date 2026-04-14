"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimelineItem {
    date: string;
    type: string;
    title: string;
    description: string;
    linkUrl?: string;
    tags: string[];
}

export default function TimelinePage() {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(90);
    const [topicFilter, setTopicFilter] = useState("");

    useEffect(() => {
        fetchTimeline();
    }, [days, topicFilter]);

    async function fetchTimeline() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ days: String(days) });
            if (topicFilter) params.set("topic", topicFilter);
            const res = await fetch(`${API}/timeline?${params}`);
            const data = await res.json();
            if (data.ok) setItems(data.items);
        } catch {}
        setLoading(false);
    }

    const typeIcon: Record<string, string> = {
        doc_created: "📄",
        doc_version: "🔄",
        incident: "🚨",
        autodoc_published: "🤖",
    };

    const typeColor: Record<string, string> = {
        doc_created: "border-blue-500",
        doc_version: "border-purple-500",
        incident: "border-red-500",
        autodoc_published: "border-emerald-500",
    };

    const typeBg: Record<string, string> = {
        doc_created: "bg-blue-500/20 text-blue-400",
        doc_version: "bg-purple-500/20 text-purple-400",
        incident: "bg-red-500/20 text-red-400",
        autodoc_published: "bg-emerald-500/20 text-emerald-400",
    };

    // Group items by date
    const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
        const date = new Date(item.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">📅 Knowledge Timeline</h1>
            <p className="page-subtitle">
                Chronological view of knowledge events — document creation, updates, incidents, and auto-generated docs.
            </p>

            <div className="mt-4 flex flex-wrap gap-4 items-center">
                <label className="text-xs text-gray-400">
                    Days:
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="input ml-2 w-24 text-xs"
                    >
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>180 days</option>
                        <option value={365}>1 year</option>
                    </select>
                </label>
                <label className="text-xs text-gray-400 flex-1">
                    Topic filter:
                    <input
                        className="input ml-2 text-xs w-48"
                        placeholder="e.g. kubernetes"
                        value={topicFilter}
                        onChange={(e) => setTopicFilter(e.target.value)}
                    />
                </label>
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-3 flex-wrap">
                {Object.entries(typeIcon).map(([type, icon]) => (
                    <span key={type} className={`text-[10px] px-2 py-0.5 rounded-full ${typeBg[type]}`}>
                        {icon} {type.replace("_", " ")}
                    </span>
                ))}
            </div>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading timeline...</div>
            ) : items.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">No events in this time range.</div>
            ) : (
                <div className="mt-6 relative">
                    {/* Vertical line */}
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-dark-200" />

                    {Object.entries(grouped).map(([date, dateItems]) => (
                        <div key={date} className="mb-6">
                            <div className="relative pl-8 mb-2">
                                <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-dark-300 border-2 border-gray-600" />
                                <span className="text-xs font-semibold text-gray-400">{date}</span>
                            </div>
                            <div className="space-y-2 pl-8">
                                {dateItems.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`result-card border-l-2 ${typeColor[item.type] || "border-gray-600"}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-sm">{typeIcon[item.type] || "📌"}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-white line-clamp-1">
                                                    {item.title}
                                                </div>
                                                {item.description && (
                                                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                                        {item.description}
                                                    </div>
                                                )}
                                                {item.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {item.tags.slice(0, 5).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="text-[9px] px-1.5 py-0.5 rounded bg-dark-300 text-gray-500"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-700 whitespace-nowrap">
                                                {new Date(item.date).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
