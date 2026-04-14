"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TYPE_COLORS: Record<string, string> = {
    Document: "#818cf8",
    Person: "#f472b6",
    Organization: "#34d399",
    Company: "#34d399",
    Location: "#fbbf24",
    Technology: "#60a5fa",
    Concept: "#a78bfa",
    Event: "#fb923c",
    Product: "#f87171",
    Topic: "#c084fc",
    Unknown: "#6b7280",
};

interface GraphNode {
    id: string;
    label: string;
    type: string;
    [key: string]: any;
}

interface GraphLink {
    source: string;
    target: string;
    type: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

interface EntityDetail {
    entity: { name: string; type: string };
    connectedNodes: { name: string; type: string; relationship: string }[];
    mentionedInDocs: { _id: string; title: string }[];
}

interface ExplainResult {
    from: string;
    to: string;
    coMentionedDocs: { _id: string; title: string }[];
    directRelationships: { type: string }[];
    vectorEvidence: string[];
}

interface PathResult {
    path: { name: string; type: string; relationship?: string }[];
}

export default function GraphPage() {
    const [docId, setDocId] = useState("");
    const [loading, setLoading] = useState(false);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [error, setError] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // v2: entity search
    const [entitySearch, setEntitySearch] = useState("");
    const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
    const [entityLoading, setEntityLoading] = useState(false);

    // v2: path search
    const [pathFrom, setPathFrom] = useState("");
    const [pathTo, setPathTo] = useState("");
    const [pathResult, setPathResult] = useState<PathResult | null>(null);
    const [pathLoading, setPathLoading] = useState(false);

    // v2: explain edge
    const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
    const [explainLoading, setExplainLoading] = useState(false);

    // v2: selected node
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    useEffect(() => {
        function updateDimensions() {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: Math.max(500, window.innerHeight - 360),
                });
            }
        }
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    async function handleFetch(e?: React.FormEvent) {
        e?.preventDefault();
        setLoading(true);
        setError("");
        setGraphData(null);
        setSelectedNode(null);
        setEntityDetail(null);
        setExplainResult(null);
        setPathResult(null);

        try {
            const url = docId.trim()
                ? `${API}/graph?docId=${encodeURIComponent(docId.trim())}`
                : `${API}/graph`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Graph fetch failed");

            setGraphData({ nodes: data.nodes || [], links: data.links || [] });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function searchEntity() {
        if (!entitySearch.trim()) return;
        setEntityLoading(true);
        setEntityDetail(null);
        try {
            const res = await fetch(`${API}/graph/entity?name=${encodeURIComponent(entitySearch.trim())}`);
            const data = await res.json();
            if (data.ok) setEntityDetail(data);
        } catch {}
        setEntityLoading(false);
    }

    async function findPath() {
        if (!pathFrom.trim() || !pathTo.trim()) return;
        setPathLoading(true);
        setPathResult(null);
        try {
            const res = await fetch(
                `${API}/graph/path?from=${encodeURIComponent(pathFrom.trim())}&to=${encodeURIComponent(pathTo.trim())}`
            );
            const data = await res.json();
            if (data.ok) setPathResult(data);
        } catch {}
        setPathLoading(false);
    }

    async function explainEdge(from: string, to: string) {
        setExplainLoading(true);
        setExplainResult(null);
        try {
            const res = await fetch(
                `${API}/graph/explain?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
            );
            const data = await res.json();
            if (data.ok) setExplainResult(data);
        } catch {}
        setExplainLoading(false);
    }

    const nodeCanvasObject = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.label || node.id;
            const type = node.type || "Unknown";
            const color = TYPE_COLORS[type] || TYPE_COLORS.Unknown;
            const isSelected = selectedNode?.id === node.id;
            const radius = isSelected ? 10 : type === "Document" ? 8 : 6;
            const fontSize = Math.max(10 / globalScale, 3);

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            // Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = isSelected ? 16 : 8;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Selection ring
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, radius + 3, 0, 2 * Math.PI);
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Label
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#e2e8f0";
            const truncated =
                label.length > 20 ? label.slice(0, 18) + "…" : label;
            ctx.fillText(truncated, node.x!, node.y! + radius + 2);
        },
        [selectedNode]
    );

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode(node);
        setEntitySearch(node.label || node.id);
        setEntityDetail(null);
    }, []);

    const handleLinkClick = useCallback((link: any) => {
        const from = typeof link.source === "object" ? link.source.label || link.source.id : link.source;
        const to = typeof link.target === "object" ? link.target.label || link.target.id : link.target;
        explainEdge(from, to);
    }, []);

    return (
        <div className="mx-auto">
            <h1 className="page-title">🕸️ Knowledge Graph Explorer</h1>
            <p className="page-subtitle">
                Visualize, search, and explore entity relationships across your knowledge base.
            </p>

            {/* Top controls */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Load graph */}
                <form onSubmit={handleFetch} className="flex gap-2">
                    <input
                        className="input-field flex-1 text-xs"
                        placeholder="Doc ID (empty = full graph)"
                        value={docId}
                        onChange={(e) => setDocId(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="btn-primary text-xs">
                        {loading ? "..." : "Load"}
                    </button>
                </form>

                {/* Entity search */}
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1 text-xs"
                        placeholder="Search entity..."
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchEntity()}
                    />
                    <button
                        onClick={searchEntity}
                        disabled={entityLoading}
                        className="btn-primary text-xs"
                    >
                        {entityLoading ? "..." : "🔍"}
                    </button>
                </div>

                {/* Path search */}
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1 text-xs"
                        placeholder="From entity"
                        value={pathFrom}
                        onChange={(e) => setPathFrom(e.target.value)}
                    />
                    <input
                        className="input-field flex-1 text-xs"
                        placeholder="To entity"
                        value={pathTo}
                        onChange={(e) => setPathTo(e.target.value)}
                    />
                    <button
                        onClick={findPath}
                        disabled={pathLoading}
                        className="btn-primary text-xs"
                    >
                        {pathLoading ? "..." : "Path"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Legend */}
            {graphData && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(TYPE_COLORS)
                        .filter(([type]) =>
                            graphData.nodes.some((n) => n.type === type)
                        )
                        .map(([type, color]) => (
                            <span
                                key={type}
                                className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium px-2 py-1 rounded-full bg-surface-800/60 border border-white/5"
                            >
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                {type}
                            </span>
                        ))}
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Graph canvas */}
                <div
                    ref={containerRef}
                    className="lg:col-span-3 card p-2 overflow-hidden force-graph-container"
                >
                    {graphData ? (
                        graphData.nodes.length > 0 ? (
                            <ForceGraph2D
                                graphData={graphData}
                                width={dimensions.width - 20}
                                height={dimensions.height}
                                backgroundColor="rgba(0,0,0,0)"
                                nodeCanvasObject={nodeCanvasObject}
                                onNodeClick={handleNodeClick}
                                onLinkClick={handleLinkClick}
                                linkColor={() => "rgba(99, 102, 241, 0.3)"}
                                linkWidth={1.5}
                                linkDirectionalArrowLength={4}
                                linkDirectionalArrowRelPos={1}
                                linkLabel={(link: any) => link.type}
                                cooldownTicks={100}
                                nodePointerAreaPaint={(node: any, color, ctx) => {
                                    ctx.beginPath();
                                    ctx.arc(node.x!, node.y!, 10, 0, 2 * Math.PI);
                                    ctx.fillStyle = color;
                                    ctx.fill();
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                                No graph data found. Try ingesting a document first.
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
                            Click &quot;Load&quot; to visualize the knowledge graph.
                        </div>
                    )}
                </div>

                {/* Right sidebar — details */}
                <div className="card space-y-4 max-h-[70vh] overflow-y-auto">
                    <h3 className="text-xs font-semibold text-gray-400">Details</h3>

                    {/* Selected node info */}
                    {selectedNode && (
                        <div>
                            <div className="text-xs font-semibold text-white">{selectedNode.label}</div>
                            <div className="text-[10px] text-gray-500">Type: {selectedNode.type}</div>
                            <button
                                onClick={searchEntity}
                                className="mt-1 text-[10px] text-brand-400 hover:underline"
                            >
                                Explore this entity →
                            </button>
                        </div>
                    )}

                    {/* Entity detail */}
                    {entityDetail && (
                        <div>
                            <h4 className="text-[10px] font-semibold text-brand-400 mb-1">
                                {entityDetail.entity.name} ({entityDetail.entity.type})
                            </h4>
                            {entityDetail.connectedNodes.length > 0 && (
                                <div className="mb-2">
                                    <div className="text-[9px] text-gray-600 font-medium mb-0.5">
                                        Connected ({entityDetail.connectedNodes.length})
                                    </div>
                                    {entityDetail.connectedNodes.slice(0, 10).map((cn, i) => (
                                        <div key={i} className="text-[10px] text-gray-400">
                                            <span className="text-gray-600">{cn.relationship}</span> → {cn.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {entityDetail.mentionedInDocs.length > 0 && (
                                <div>
                                    <div className="text-[9px] text-gray-600 font-medium mb-0.5">
                                        Documents ({entityDetail.mentionedInDocs.length})
                                    </div>
                                    {entityDetail.mentionedInDocs.slice(0, 5).map((d) => (
                                        <div key={d._id} className="text-[10px] text-gray-400 truncate">
                                            📄 {d.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explain edge */}
                    {explainLoading && (
                        <div className="text-[10px] text-gray-500">Explaining relationship...</div>
                    )}
                    {explainResult && (
                        <div>
                            <h4 className="text-[10px] font-semibold text-brand-400 mb-1">
                                {explainResult.from} ↔ {explainResult.to}
                            </h4>
                            {explainResult.directRelationships.length > 0 && (
                                <div className="text-[10px] text-gray-400 mb-1">
                                    Direct: {explainResult.directRelationships.map((r) => r.type).join(", ")}
                                </div>
                            )}
                            {explainResult.coMentionedDocs.length > 0 && (
                                <div className="mb-1">
                                    <div className="text-[9px] text-gray-600">Co-mentioned in:</div>
                                    {explainResult.coMentionedDocs.slice(0, 3).map((d) => (
                                        <div key={d._id} className="text-[10px] text-gray-400 truncate">
                                            📄 {d.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {explainResult.vectorEvidence.length > 0 && (
                                <div>
                                    <div className="text-[9px] text-gray-600">Vector evidence:</div>
                                    {explainResult.vectorEvidence.slice(0, 2).map((e, i) => (
                                        <div key={i} className="text-[9px] text-gray-500 line-clamp-2">
                                            &quot;{e}&quot;
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Path result */}
                    {pathResult && (
                        <div>
                            <h4 className="text-[10px] font-semibold text-brand-400 mb-1">
                                Shortest Path ({pathResult.path.length} nodes)
                            </h4>
                            <div className="space-y-0.5">
                                {pathResult.path.map((step, i) => (
                                    <div key={i} className="text-[10px] text-gray-400">
                                        {i > 0 && (
                                            <span className="text-gray-600 text-[9px]">
                                                —{step.relationship || "?"}→{" "}
                                            </span>
                                        )}
                                        <span className="text-white">{step.name}</span>
                                        <span className="text-gray-600 ml-1">({step.type})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!selectedNode && !entityDetail && !explainResult && !pathResult && (
                        <div className="text-[10px] text-gray-700 text-center py-4">
                            Click a node or edge for details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
