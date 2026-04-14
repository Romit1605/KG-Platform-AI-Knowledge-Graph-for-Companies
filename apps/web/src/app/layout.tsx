"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import "./globals.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const NAV_SECTIONS = [
    {
        title: "Core",
        items: [
            { href: "/ingest", label: "Ingest", icon: "📥", desc: "Add documents" },
            { href: "/connectors", label: "Connectors", icon: "🔌", desc: "External sources" },
            { href: "/search", label: "Search", icon: "🔍", desc: "Semantic search" },
            { href: "/chat", label: "Chat", icon: "💬", desc: "RAG + Mentor" },
            { href: "/graph", label: "Graph", icon: "🕸️", desc: "Explorer" },
        ],
    },
    {
        title: "Knowledge",
        items: [
            { href: "/documents", label: "Documents", icon: "📄", desc: "Document library" },
            { href: "/experts", label: "Experts", icon: "👤", desc: "Find experts" },
            { href: "/topics", label: "Topics", icon: "🏷️", desc: "Topic clusters" },
            { href: "/recommended", label: "Recommended", icon: "✨", desc: "For you" },
        ],
    },
    {
        title: "Intelligence",
        items: [
            { href: "/knowledge-gaps", label: "Gaps", icon: "🔍", desc: "Knowledge gaps" },
            { href: "/auto-docs", label: "Auto Docs", icon: "📝", desc: "AI-generated docs" },
            { href: "/heatmap", label: "Heatmap", icon: "🗺️", desc: "Expertise map" },
            { href: "/timeline", label: "Timeline", icon: "📅", desc: "Knowledge events" },
        ],
    },
    {
        title: "Operations",
        items: [
            { href: "/incidents", label: "Incidents", icon: "🚨", desc: "Incident response" },
            { href: "/workspaces", label: "Workspaces", icon: "🏢", desc: "Team spaces" },
            { href: "/admin/feedback", label: "Feedback", icon: "📊", desc: "Quality scores" },
        ],
    },
];

function NotificationBell() {
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        async function fetchCount() {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                const headers: Record<string, string> = {};
                if (token) headers.Authorization = `Bearer ${token}`;
                const res = await fetch(`${API}/notifications`, { headers });
                const data = await res.json();
                if (data.ok) setUnread(data.unreadCount || 0);
            } catch {}
        }
        fetchCount();
        const interval = setInterval(fetchCount, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <Link href="/notifications" className="relative p-1 hover:bg-dark-300 rounded transition">
            <span className="text-lg">🔔</span>
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                </span>
            )}
        </Link>
    );
}

function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col w-[260px] bg-surface-800/50 backdrop-blur-2xl border-r border-white/5">
            {/* Logo + Bell */}
            <div className="flex items-center justify-between px-6 py-6">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/30">
                        KG
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm tracking-tight">
                            KG Platform
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                            Knowledge Graph
                        </div>
                    </div>
                </Link>
                <NotificationBell />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 mt-2 space-y-4 overflow-y-auto">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                            {section.title}
                        </div>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <div>
                                            <div className="text-sm">{item.label}</div>
                                            <div className="text-[10px] text-gray-500">
                                                {item.desc}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Auth / Footer */}
            <div className="px-4 py-3 border-t border-white/5 space-y-2">
                {user ? (
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400 truncate">
                            {user.name || user.email}
                        </div>
                        <button
                            onClick={logout}
                            className="text-[10px] text-gray-500 hover:text-red-400 transition"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="block text-xs text-brand-400 hover:text-brand-300 transition"
                    >
                        Sign In →
                    </Link>
                )}
                <div className="text-[10px] text-gray-600">
                    Powered by OpenAI · Neo4j · Qdrant
                </div>
            </div>
        </aside>
    );
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <title>KG Platform — AI Knowledge Graph</title>
                <meta
                    name="description"
                    content="AI-powered knowledge graph platform for document ingestion, semantic search, RAG chat, and graph visualization."
                />
            </head>
            <body className="flex min-h-screen">
                <AuthProvider>
                    <Sidebar />
                    {/* Main */}
                    <main className="ml-[260px] flex-1 p-8 min-h-screen">{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
