import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../env.js";

export const qdrantClient = new QdrantClient({ url: env.QDRANT_URL });

const VECTOR_SIZE = 1536;

export async function ensureQdrantCollection(): Promise<void> {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(
            (c) => c.name === env.QDRANT_COLLECTION
        );

        if (!exists) {
            await qdrantClient.createCollection(env.QDRANT_COLLECTION, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: "Cosine",
                },
            });
            console.log(`[Qdrant] Created collection "${env.QDRANT_COLLECTION}"`);
        } else {
            console.log(`[Qdrant] Collection "${env.QDRANT_COLLECTION}" already exists`);
        }
    } catch (err) {
        console.error("[Qdrant] Failed to ensure collection:", err);
        process.exit(1);
    }
}
