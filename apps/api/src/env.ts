import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from repo root (two levels up from apps/api/src)
dotenv.config({ path: resolve(__dirname, "../../../.env") });

export const env = {
    PORT: parseInt(process.env.PORT || "8000", 10),
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/kg",
    NEO4J_URI: process.env.NEO4J_URI || "bolt://localhost:7687",
    NEO4J_USER: process.env.NEO4J_USER || "neo4j",
    NEO4J_PASS: process.env.NEO4J_PASS || "password123",
    QDRANT_URL: process.env.QDRANT_URL || "http://localhost:6333",
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION || "kg_chunks",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_EMBED_MODEL: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    JWT_SECRET: process.env.JWT_SECRET || "dev_jwt_secret_fallback",
};

export function requireOpenAIKey(): string {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === "your_key_here") {
        throw new Error("OPENAI_API_KEY is not set. Please set it in your .env file.");
    }
    return env.OPENAI_API_KEY;
}
