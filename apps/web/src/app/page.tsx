import Link from "next/link";

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            {/* Hero */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl shadow-brand-500/30 mb-8">
                KG
            </div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-brand-200 to-brand-400 bg-clip-text text-transparent mb-4">
                AI Knowledge Graph
            </h1>
            <p className="text-gray-400 max-w-lg mb-10 text-lg leading-relaxed">
                Ingest documents, extract knowledge, and explore connections using
                AI-powered semantic search, RAG chat, and interactive graph
                visualization.
            </p>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                <Link
                    href="/ingest"
                    className="card hover:border-brand-500/30 transition-all group text-left"
                >
                    <div className="text-2xl mb-2">📥</div>
                    <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                        Ingest
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Add documents</div>
                </Link>
                <Link
                    href="/search"
                    className="card hover:border-brand-500/30 transition-all group text-left"
                >
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                        Search
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Semantic search</div>
                </Link>
                <Link
                    href="/chat"
                    className="card hover:border-brand-500/30 transition-all group text-left"
                >
                    <div className="text-2xl mb-2">💬</div>
                    <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                        Chat
                    </div>
                    <div className="text-xs text-gray-500 mt-1">RAG assistant</div>
                </Link>
                <Link
                    href="/graph"
                    className="card hover:border-brand-500/30 transition-all group text-left"
                >
                    <div className="text-2xl mb-2">🕸️</div>
                    <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                        Graph
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Knowledge map</div>
                </Link>
            </div>
        </div>
    );
}
