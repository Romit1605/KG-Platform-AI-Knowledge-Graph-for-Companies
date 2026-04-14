"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TopicInfo {
    tag: string;
    count: number;
}

interface TopicDoc {
    _id: string;
    title: string;
    author?: string;
    createdAt: string;
}

export default function TopicsPage() {
    const [topics, setTopics] = useState<TopicInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [topicDocs, setTopicDocs] = useState<TopicDoc[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);

    useEffect(() => {
        fetchTopics();
    }, []);

    async function fetchTopics() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/topics`);
            const data = await res.json();
            if (data.ok) setTopics(data.topics);
        } catch {}
        setLoading(false);
    }

    async function selectTopic(tag: string) {
        setSelectedTopic(tag);
        setDocsLoading(true);
        setTopicDocs([]);
        try {
            const res = await fetch(
                `${API}/topics/${encodeURIComponent(tag)}/documents`
            );
            const data = await res.json();
            if (data.ok) setTopicDocs(data.documents);
        } catch {}
        setDocsLoading(false);
    }

    const maxCount = Math.max(...topics.map((t) => t.count), 1);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="page-title">🏷️ Topic Clusters</h1>
            <p className="page-subtitle">
                Automatically extracted topics from all ingested documents. Click a topic
                to see associated documents.
            </p>

            {loading ? (
                <div className="mt-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : topics.length === 0 ? (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    No topics found. Ingest documents with taxonomy extraction enabled.
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Topic Cloud */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-white mb-4">
                            All Topics ({topics.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {topics.map((topic) => {
                                const scale = 0.7 + (topic.count / maxCount) * 0.6;
                                const isActive = selectedTopic === topic.tag;
                                return (
                                    <button
                                        key={topic.tag}
                                        onClick={() => selectTopic(topic.tag)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-brand-500 text-white"
                                                : "bg-dark-300 text-gray-400 hover:bg-dark-200 hover:text-gray-300"
                                        }`}
                                        style={{ fontSize: `${scale}rem` }}
                                    >
                                        {topic.tag}
                                        <span className="ml-1 opacity-60">({topic.count})</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Documents for selected topic */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-white mb-4">
                            {selectedTopic
                                ? `Documents tagged "${selectedTopic}"`
                                : "Select a topic to view documents"}
                        </h3>
                        {docsLoading ? (
                            <div className="text-gray-500 text-xs">Loading...</div>
                        ) : !selectedTopic ? (
                            <div className="text-gray-600 text-xs">
                                Click a topic from the cloud to view its documents.
                            </div>
                        ) : topicDocs.length === 0 ? (
                            <div className="text-gray-500 text-xs">
                                No documents found for this topic.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {topicDocs.map((doc) => (
                                    <div key={doc._id} className="result-card">
                                        <div className="font-semibold text-white text-xs">
                                            {doc.title}
                                        </div>
                                        {doc.author && (
                                            <div className="text-[10px] text-gray-500 mt-0.5">
                                                by {doc.author}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-gray-600 mt-0.5">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
