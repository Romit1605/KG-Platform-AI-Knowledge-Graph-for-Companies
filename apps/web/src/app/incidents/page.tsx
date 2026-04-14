"use client";

import { useState, useEffect, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimelineEvent {
    timestamp: string;
    type: string;
    description: string;
    author?: string;
}

interface Incident {
    _id: string;
    title: string;
    system: string;
    status: string;
    timeline: TimelineEvent[];
    createdBy: string;
    createdAt: string;
    resolvedAt?: string;
}

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"list" | "create">("list");
    const [selected, setSelected] = useState<Incident | null>(null);

    // Create form
    const [title, setTitle] = useState("");
    const [system, setSystem] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);

    // Event form
    const [eventType, setEventType] = useState("update");
    const [eventDesc, setEventDesc] = useState("");
    const [addingEvent, setAddingEvent] = useState(false);

    // Context
    const [context, setContext] = useState<any>(null);
    const [contextLoading, setContextLoading] = useState(false);

    // Postmortem
    const [postmortem, setPostmortem] = useState<string | null>(null);
    const [postmortemLoading, setPostmortemLoading] = useState(false);

    useEffect(() => {
        fetchIncidents();
    }, []);

    async function fetchIncidents() {
        setLoading(true);
        try {
            const token = localStorage.getItem("kg_token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${API}/incidents`, { headers });
            const data = await res.json();
            if (data.ok) setIncidents(data.incidents);
        } catch {}
        setLoading(false);
    }

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!title.trim() || !system.trim()) return;
        setCreating(true);
        try {
            const token = localStorage.getItem("kg_token");
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${API}/incidents/start`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    title: title.trim(),
                    system: system.trim(),
                    description: description.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setTitle("");
                setSystem("");
                setDescription("");
                setActiveTab("list");
                fetchIncidents();
            }
        } catch {}
        setCreating(false);
    }

    async function addEvent(incidentId: string) {
        if (!eventDesc.trim()) return;
        setAddingEvent(true);
        try {
            const token = localStorage.getItem("kg_token");
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            await fetch(`${API}/incidents/${incidentId}/event`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    type: eventType,
                    description: eventDesc.trim(),
                }),
            });
            setEventDesc("");
            fetchIncidents();
            // Refresh selected
            const res = await fetch(`${API}/incidents`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            if (data.ok) {
                const updated = data.incidents.find(
                    (inc: Incident) => inc._id === incidentId
                );
                if (updated) setSelected(updated);
            }
        } catch {}
        setAddingEvent(false);
    }

    async function fetchContext(incidentId: string) {
        setContextLoading(true);
        setContext(null);
        try {
            const res = await fetch(`${API}/incidents/${incidentId}/context`);
            const data = await res.json();
            if (data.ok) setContext(data);
        } catch {}
        setContextLoading(false);
    }

    async function generatePostmortem(incidentId: string) {
        setPostmortemLoading(true);
        setPostmortem(null);
        try {
            const token = localStorage.getItem("kg_token");
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${API}/incidents/${incidentId}/postmortem`, {
                method: "POST",
                headers,
            });
            const data = await res.json();
            if (data.ok) setPostmortem(data.postmortem);
        } catch {}
        setPostmortemLoading(false);
    }

    const statusColors: Record<string, string> = {
        active: "bg-red-500/20 text-red-400",
        investigating: "bg-yellow-500/20 text-yellow-400",
        mitigating: "bg-blue-500/20 text-blue-400",
        resolved: "bg-green-500/20 text-green-400",
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">🚨 Incident Response</h1>
            <p className="page-subtitle">
                Start and manage incidents. Track timelines, search related knowledge,
                and generate postmortems with AI.
            </p>

            {/* Tabs */}
            <div className="mt-6 flex gap-2">
                <button
                    onClick={() => {
                        setActiveTab("list");
                        setSelected(null);
                    }}
                    className={`px-4 py-2 rounded text-xs font-medium transition ${
                        activeTab === "list"
                            ? "bg-brand-500 text-white"
                            : "bg-dark-300 text-gray-400 hover:text-white"
                    }`}
                >
                    Active Incidents
                </button>
                <button
                    onClick={() => setActiveTab("create")}
                    className={`px-4 py-2 rounded text-xs font-medium transition ${
                        activeTab === "create"
                            ? "bg-brand-500 text-white"
                            : "bg-dark-300 text-gray-400 hover:text-white"
                    }`}
                >
                    + Start Incident
                </button>
            </div>

            {/* Create Form */}
            {activeTab === "create" && (
                <form onSubmit={handleCreate} className="mt-6 card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Start New Incident</h3>
                    <input
                        className="input-field w-full"
                        placeholder="Incident title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <input
                        className="input-field w-full"
                        placeholder="Affected system"
                        value={system}
                        onChange={(e) => setSystem(e.target.value)}
                        required
                    />
                    <textarea
                        className="input-field w-full"
                        placeholder="Initial description (optional)"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <button className="btn-primary" disabled={creating}>
                        {creating ? "Creating..." : "Start Incident"}
                    </button>
                </form>
            )}

            {/* Incident List */}
            {activeTab === "list" && !selected && (
                <>
                    {loading ? (
                        <div className="mt-6 text-center text-gray-500 text-sm">Loading...</div>
                    ) : incidents.length === 0 ? (
                        <div className="mt-6 text-center text-gray-500 text-sm">
                            No incidents. Click &quot;Start Incident&quot; to create one.
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {incidents.map((inc) => (
                                <button
                                    key={inc._id}
                                    onClick={() => {
                                        setSelected(inc);
                                        setContext(null);
                                        setPostmortem(null);
                                    }}
                                    className="result-card w-full text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-white text-sm">
                                            {inc.title}
                                        </div>
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                statusColors[inc.status] || "bg-dark-300 text-gray-400"
                                            }`}
                                        >
                                            {inc.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        System: {inc.system} • {inc.timeline.length} event(s)
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Incident Detail */}
            {selected && (
                <div className="mt-6 space-y-4">
                    <button
                        onClick={() => setSelected(null)}
                        className="text-xs text-brand-400 hover:underline"
                    >
                        ← Back to list
                    </button>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">
                                {selected.title}
                            </h3>
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    statusColors[selected.status] || ""
                                }`}
                            >
                                {selected.status}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            System: {selected.system} • Created:{" "}
                            {new Date(selected.createdAt).toLocaleString()}
                        </div>

                        {/* Timeline */}
                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-gray-400 mb-2">
                                Timeline
                            </h4>
                            <div className="space-y-2 border-l border-dark-200 pl-4">
                                {selected.timeline.map((evt, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-brand-500" />
                                        <div className="text-[10px] text-gray-600">
                                            {new Date(evt.timestamp).toLocaleString()} •{" "}
                                            <span className="font-medium text-gray-400">
                                                {evt.type}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-300">
                                            {evt.description}
                                        </div>
                                        {evt.author && (
                                            <div className="text-[10px] text-gray-600">
                                                — {evt.author}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Event */}
                        {selected.status !== "resolved" && (
                            <div className="mt-4 flex gap-2">
                                <select
                                    className="input-field"
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value)}
                                >
                                    <option value="update">update</option>
                                    <option value="investigating">investigating</option>
                                    <option value="mitigation">mitigation</option>
                                    <option value="escalation">escalation</option>
                                    <option value="resolved">resolved</option>
                                </select>
                                <input
                                    className="input-field flex-1"
                                    placeholder="Describe what happened..."
                                    value={eventDesc}
                                    onChange={(e) => setEventDesc(e.target.value)}
                                />
                                <button
                                    className="btn-primary"
                                    disabled={addingEvent || !eventDesc.trim()}
                                    onClick={() => addEvent(selected._id)}
                                >
                                    {addingEvent ? "..." : "Add"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchContext(selected._id)}
                            className="btn-primary"
                            disabled={contextLoading}
                        >
                            {contextLoading ? "Loading..." : "🔍 Fetch Related Knowledge"}
                        </button>
                        <button
                            onClick={() => generatePostmortem(selected._id)}
                            className="btn-primary"
                            disabled={postmortemLoading}
                        >
                            {postmortemLoading ? "Generating..." : "📝 Generate Postmortem"}
                        </button>
                    </div>

                    {/* Context */}
                    {context && (
                        <div className="card">
                            <h4 className="text-sm font-semibold text-white mb-2">
                                Related Knowledge
                            </h4>
                            {context.relatedDocuments?.length > 0 ? (
                                <div className="space-y-2">
                                    {context.relatedDocuments.map((doc: any, i: number) => (
                                        <div key={i} className="result-card">
                                            <div className="text-xs font-semibold text-white">
                                                {doc.title}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                                                {doc.text}
                                            </div>
                                            <div className="text-[10px] text-brand-400 mt-0.5">
                                                Score: {doc.score?.toFixed(3)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500">
                                    No related documents found.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Postmortem */}
                    {postmortem && (
                        <div className="card">
                            <h4 className="text-sm font-semibold text-white mb-2">
                                AI-Generated Postmortem
                            </h4>
                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-xs text-gray-300">
                                {postmortem}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
