"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Workspace {
    id: string;
    name: string;
    role: string;
    createdAt: string;
}

export default function WorkspacesPage() {
    const { token } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Add member form
    const [addMemberWs, setAddMemberWs] = useState<string | null>(null);
    const [memberEmail, setMemberEmail] = useState("");
    const [memberRole, setMemberRole] = useState("viewer");
    const [addMsg, setAddMsg] = useState("");

    useEffect(() => {
        if (token) fetchWorkspaces();
    }, [token]);

    async function fetchWorkspaces() {
        try {
            const res = await fetch(`${API}/workspaces`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.ok) setWorkspaces(data.workspaces);
        } catch {}
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/workspaces`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setNewName("");
            fetchWorkspaces();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault();
        setAddMsg("");
        try {
            const res = await fetch(`${API}/workspaces/${addMemberWs}/members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email: memberEmail, role: memberRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setAddMsg(`Added ${memberEmail} as ${memberRole}`);
            setMemberEmail("");
        } catch (err: any) {
            setAddMsg(err.message);
        }
    }

    if (!token) {
        return (
            <div className="max-w-3xl mx-auto">
                <h1 className="page-title">🏢 Workspaces</h1>
                <p className="page-subtitle mt-2">
                    Please <a href="/login" className="text-brand-400 underline">log in</a> to manage workspaces.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="page-title">🏢 Workspaces</h1>
            <p className="page-subtitle">
                Create and manage team workspaces with role-based access.
            </p>

            {/* Create form */}
            <form onSubmit={handleCreate} className="mt-6 flex gap-3">
                <input
                    className="input-field flex-1"
                    placeholder="New workspace name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button type="submit" disabled={loading} className="btn-primary">
                    Create
                </button>
            </form>

            {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Workspace list */}
            <div className="mt-6 space-y-3">
                {workspaces.map((ws) => (
                    <div key={ws.id} className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-white">{ws.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Role: <span className="text-brand-400">{ws.role}</span> · ID: {ws.id}
                                </div>
                            </div>
                            <button
                                className="text-xs text-gray-400 hover:text-brand-400 transition-colors px-3 py-1.5 rounded-lg bg-surface-700/50"
                                onClick={() =>
                                    setAddMemberWs(addMemberWs === ws.id ? null : ws.id)
                                }
                            >
                                {addMemberWs === ws.id ? "Close" : "+ Member"}
                            </button>
                        </div>

                        {addMemberWs === ws.id && (
                            <form
                                onSubmit={handleAddMember}
                                className="mt-4 pt-4 border-t border-white/5 flex gap-2 items-end"
                            >
                                <div className="flex-1">
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                        Email
                                    </label>
                                    <input
                                        className="input-field text-sm"
                                        placeholder="user@email.com"
                                        value={memberEmail}
                                        onChange={(e) => setMemberEmail(e.target.value)}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                        Role
                                    </label>
                                    <select
                                        className="input-field text-sm"
                                        value={memberRole}
                                        onChange={(e) => setMemberRole(e.target.value)}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary text-sm h-[42px]">
                                    Add
                                </button>
                            </form>
                        )}

                        {addMemberWs === ws.id && addMsg && (
                            <div className="mt-2 text-xs text-gray-400">{addMsg}</div>
                        )}
                    </div>
                ))}

                {workspaces.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-8">
                        No workspaces yet. Create one above.
                    </div>
                )}
            </div>
        </div>
    );
}
