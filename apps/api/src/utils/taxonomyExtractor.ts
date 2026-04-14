import OpenAI from "openai";
import { env, requireOpenAIKey } from "../env.js";

const TAXONOMY_PROMPT = `You are a document taxonomy engine.
Given a document, extract 3-7 topic tags that best categorize it.
Use tags from this preferred list when applicable:
DevOps, Onboarding, Security, Infrastructure, Backend, Frontend, Database, API,
Testing, CI/CD, Monitoring, Architecture, Cloud, Kubernetes, Docker, Networking,
Machine Learning, Data Science, Documentation, Management, HR, Finance, Legal,
Marketing, Sales, Engineering, Design, Product, Mobile, Web, Performance, Compliance

Return ONLY valid JSON: {"tags": ["tag1", "tag2", ...]}
Do not include markdown code fences.`;

export async function extractTags(
    title: string,
    text: string
): Promise<string[]> {
    requireOpenAIKey();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const res = await openai.chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        messages: [
            { role: "system", content: TAXONOMY_PROMPT },
            {
                role: "user",
                content: `Title: ${title}\n\nText:\n${text.slice(0, 3000)}`,
            },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content || "{}";
    try {
        const parsed = JSON.parse(raw);
        return (parsed.tags || []).slice(0, 7);
    } catch {
        return [];
    }
}
