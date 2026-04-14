import OpenAI from "openai";
import { env, requireOpenAIKey } from "../env.js";

let client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!client) {
        const key = requireOpenAIKey();
        client = new OpenAI({ apiKey: key });
    }
    return client;
}

/**
 * Embed a single text string and return the vector.
 */
export async function embedText(text: string): Promise<number[]> {
    const openai = getClient();
    const res = await openai.embeddings.create({
        model: env.OPENAI_EMBED_MODEL,
        input: text,
    });
    return res.data[0].embedding;
}

/**
 * Embed multiple texts in a single batch and return vectors.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const openai = getClient();
    const res = await openai.embeddings.create({
        model: env.OPENAI_EMBED_MODEL,
        input: texts,
    });
    return res.data.map((d) => d.embedding);
}
