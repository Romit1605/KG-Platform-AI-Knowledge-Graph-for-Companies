"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface HeatmapData {
    topics: string[];
    people: string[];
    matrix: number[][];
    evidenceMap: Record<string, { docTitles: string[] }>;
}

export default function HeatmapPage() {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [topTopics, setTopTopics] = useState(20);
    const [topPeople, setTopPeople] = useState(20);
    const [hoveredCell, setHoveredCell] = useState<{ topic: string; person: string; score: number } | null>(null);
    const [selectedEvidence, setSelectedEvidence] = useState<{ key: string; docs: string[] } | null>(null);

    useEffect(() => {
        fetchHeatmap();
    }, [topTopics, topPeople]);

    async function fetchHeatmap() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/heatmap?topTopics=${topTopics}&topPeople=${topPeople}`);
            const d = await res.json();
            if (d.ok) setData(d);
        } catch {}
        setLoading(false);
    }

    const cellColor = (score: number) => {
        if (score === 0) return "bg-dark-300";
        if (score <= 3) return "bg-emerald-900/40";
        if (score <= 8) return "bg-emerald-700/50";
        if (score <= 15) return "bg-emerald-500/60";
        return "bg-emerald-400/70";
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="page-title">🗺️ Knowledge Heatmap</h1>
            <p className="page-subtitle">
                Topics × People matrix — see who knows what across the organization.
            </p>

            <div className="mt-4 flex gap-4 items-center">
                <label className="text-xs text-gray-400">
                    Top topics:
                    <input
                        type="number"
                        min={5}
                        max={50}
                        value={topTopics}
                        onChange={(e) => setTopTopics(Number(e.target.value))}
                        className="input ml-2 w-16 text-xs"
                    />
                </label>
                <label className="text-xs text-gray-400">
                    Top people:
                    <input
                        type="number"
                        min={5}
                        max={50}
                        value={topPeople}
                        onChange={(e) => setTopPeople(Number(e.target.value))}
                        className="input ml-2 w-16 text-xs"
                    />
                </label>
            </div>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading heatmap...</div>
            ) : !data || data.topics.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    Not enough data for heatmap. Ingest some documents first.
                </div>
            ) : (
                <div className="mt-6">
                    {/* Legend */}
                    <div className="flex gap-2 items-center mb-4">
                        <span className="text-[10px] text-gray-500">Low</span>
                        <span className="w-4 h-4 rounded bg-dark-300" />
                        <span className="w-4 h-4 rounded bg-emerald-900/40" />
                        <span className="w-4 h-4 rounded bg-emerald-700/50" />
                        <span className="w-4 h-4 rounded bg-emerald-500/60" />
                        <span className="w-4 h-4 rounded bg-emerald-400/70" />
                        <span className="text-[10px] text-gray-500">High</span>
                    </div>

                    <div className="overflow-auto max-h-[65vh]">
                        <table className="border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 bg-dark-100 p-1" />
                                    {data.topics.map((topic) => (
                                        <th
                                            key={topic}
                                            className="p-1 text-[9px] text-gray-500 font-normal max-w-[60px] truncate -rotate-45 origin-bottom-left"
                                            title={topic}
                                        >
                                            {topic}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.people.map((person, pi) => (
                                    <tr key={person}>
                                        <td className="sticky left-0 z-10 bg-dark-100 text-[10px] text-gray-400 pr-2 whitespace-nowrap font-medium">
                                            {person}
                                        </td>
                                        {data.topics.map((topic, ti) => {
                                            const score = data.matrix[pi]?.[ti] ?? 0;
                                            const key = `${topic}::${person}`;
                                            return (
                                                <td
                                                    key={topic}
                                                    className={`w-6 h-6 min-w-[24px] border border-dark-100 cursor-pointer transition-all hover:ring-1 hover:ring-brand-500 ${cellColor(score)}`}
                                                    title={`${person} × ${topic}: ${score}`}
                                                    onMouseEnter={() =>
                                                        setHoveredCell({ topic, person, score })
                                                    }
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                    onClick={() => {
                                                        const evidence = data.evidenceMap[key];
                                                        if (evidence) {
                                                            setSelectedEvidence({
                                                                key,
                                                                docs: evidence.docTitles,
                                                            });
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Hover tooltip */}
                    {hoveredCell && (
                        <div className="mt-2 text-xs text-gray-400">
                            <span className="text-white font-medium">{hoveredCell.person}</span>
                            {" × "}
                            <span className="text-brand-400">{hoveredCell.topic}</span>
                            {" — Score: "}
                            <span className="text-white">{hoveredCell.score}</span>
                        </div>
                    )}

                    {/* Evidence panel */}
                    {selectedEvidence && (
                        <div className="mt-4 card">
                            <div className="flex justify-between items-start">
                                <h4 className="text-xs font-semibold text-white">
                                    Evidence: {selectedEvidence.key.replace("::", " × ")}
                                </h4>
                                <button
                                    onClick={() => setSelectedEvidence(null)}
                                    className="text-gray-500 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {selectedEvidence.docs.length > 0 ? (
                                    selectedEvidence.docs.map((d, i) => (
                                        <div key={i} className="text-[10px] text-gray-400">
                                            📄 {d}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[10px] text-gray-600">
                                        No documents found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
