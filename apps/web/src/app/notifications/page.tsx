"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    linkUrl?: string;
    readAt?: string;
    severity: string;
    createdAt: string;
}

interface WeeklyDigest {
    newDocs: number;
    incidents: number;
    autoDocs: number;
    openGaps: number;
    highlights: string[];
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [digest, setDigest] = useState<WeeklyDigest | null>(null);
    const [showDigest, setShowDigest] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const headers: Record<string, string> = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API}/notifications`, { headers });
            const data = await res.json();
            if (data.ok) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    async function markRead(id: string) {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;
            await fetch(`${API}/notifications/${id}/read`, { method: "POST", headers });
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {}
    }

    async function fetchDigest() {
        try {
            const res = await fetch(`${API}/notifications/digest/weekly`);
            const data = await res.json();
            if (data.ok) {
                setDigest(data.digest);
                setShowDigest(true);
            }
        } catch {}
    }

    const typeIcon: Record<string, string> = {
        doc_updated: "📄",
        incident_started: "🚨",
        knowledge_gap_spike: "🔍",
        new_topic: "🏷️",
        expert_needed: "👤",
        autodoc_published: "🤖",
    };

    const severityColor: Record<string, string> = {
        low: "border-l-gray-600",
        med: "border-l-yellow-500",
        high: "border-l-red-500",
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">🔔 Notifications</h1>
                    <p className="page-subtitle">
                        Stay updated on knowledge changes, incidents, and alerts.
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-brand-500 text-white text-xs font-bold">
                            {unreadCount} unread
                        </span>
                    )}
                    <button onClick={fetchDigest} className="btn-primary text-xs">
                        📊 Weekly Digest
                    </button>
                </div>
            </div>

            {/* Weekly digest panel */}
            {showDigest && digest && (
                <div className="card mt-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xs font-semibold text-white">📊 Weekly Summary</h3>
                        <button
                            onClick={() => setShowDigest(false)}
                            className="text-gray-500 hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-brand-400">{digest.newDocs}</div>
                            <div className="text-[10px] text-gray-500">New Docs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-red-400">{digest.incidents}</div>
                            <div className="text-[10px] text-gray-500">Incidents</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-emerald-400">{digest.autoDocs}</div>
                            <div className="text-[10px] text-gray-500">Auto Docs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400">{digest.openGaps}</div>
                            <div className="text-[10px] text-gray-500">Open Gaps</div>
                        </div>
                    </div>
                    {digest.highlights.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <h4 className="text-[10px] text-gray-400 font-semibold">Highlights</h4>
                            {digest.highlights.map((h, i) => (
                                <div key={i} className="text-[10px] text-gray-300">• {h}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No notifications yet.
                </div>
            ) : (
                <div className="mt-6 space-y-2">
                    {notifications.map((n) => (
                        <div
                            key={n._id}
                            className={`result-card border-l-2 ${severityColor[n.severity] || "border-l-gray-600"} ${
                                !n.readAt ? "bg-dark-200/50" : ""
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-sm">{typeIcon[n.type] || "📌"}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white line-clamp-1">
                                            {n.title}
                                        </span>
                                        {!n.readAt && (
                                            <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                        {n.message}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] text-gray-700">
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                            n.severity === "high"
                                                ? "bg-red-500/20 text-red-400"
                                                : n.severity === "med"
                                                ? "bg-yellow-500/20 text-yellow-400"
                                                : "bg-gray-500/20 text-gray-400"
                                        }`}>
                                            {n.severity}
                                        </span>
                                    </div>
                                </div>
                                {!n.readAt && (
                                    <button
                                        onClick={() => markRead(n._id)}
                                        className="text-[10px] text-gray-500 hover:text-brand-400 whitespace-nowrap"
                                    >
                                        Mark read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
