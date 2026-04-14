import OpenAI from "openai";
import { env, requireOpenAIKey } from "../env.js";
import { getNeo4jDriver } from "../db/neo4j.js";

/* ------------------------------------------------------------------ */
/*  Allowlists to prevent Cypher injection                            */
/* ------------------------------------------------------------------ */

const ALLOWED_LABELS = new Set([
    "Person", "Organization", "Company", "Location", "Technology",
    "Concept", "Event", "Product", "Document", "Topic",
]);

const ALLOWED_REL_TYPES = new Set([
    "WORKS_AT", "FOUNDED", "ACQUIRED", "LOCATED_IN", "USES",
    "RELATED_TO", "PART_OF", "MENTIONS", "EXPERT_IN", "CREATED",
    "COLLABORATED_WITH", "INVESTED_IN", "DEVELOPED", "PUBLISHED",
]);

function sanitizeLabel(label: string): string {
    const clean = label.replace(/[^a-zA-Z0-9_]/g, "").trim();
    return ALLOWED_LABELS.has(clean) ? clean : "Concept";
}

function sanitizeRelType(rel: string): string {
    const clean = rel.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase().trim();
    return ALLOWED_REL_TYPES.has(clean) ? clean : "RELATED_TO";
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ExtractedEntity {
    name: string;
    type: string;
}

export interface ExtractedRelation {
    source: string;
    target: string;
    type: string;
}

export interface ExtractionResult {
    entities: ExtractedEntity[];
    relations: ExtractedRelation[];
    topics: string[];
}

/* ------------------------------------------------------------------ */
/*  LLM extraction                                                    */
/* ------------------------------------------------------------------ */

const EXTRACT_SYSTEM_PROMPT = `You are a knowledge graph extraction engine.
Given a document, extract:
1. entities: array of {name, type} where type is one of: Person, Organization, Company, Location, Technology, Concept, Event, Product, Topic
2. relations: array of {source, target, type} where type is one of: WORKS_AT, FOUNDED, ACQUIRED, LOCATED_IN, USES, RELATED_TO, PART_OF, MENTIONS, EXPERT_IN, CREATED, COLLABORATED_WITH, INVESTED_IN, DEVELOPED, PUBLISHED
3. topics: array of topic strings (max 5)

Return ONLY valid JSON with keys: entities, relations, topics.
Do not include markdown code fences.`;

export async function extractGraph(
    title: string,
    text: string,
    author?: string
): Promise<ExtractionResult> {
    requireOpenAIKey();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const userContent = `Title: ${title}\nAuthor: ${author || "Unknown"}\n\nText:\n${text.slice(0, 4000)}`;

    const res = await openai.chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        messages: [
            { role: "system", content: EXTRACT_SYSTEM_PROMPT },
            { role: "user", content: userContent },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content || "{}";
    let parsed: ExtractionResult;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = { entities: [], relations: [], topics: [] };
    }

    // Sanitize labels & relationship types
    parsed.entities = (parsed.entities || []).map((e) => ({
        name: e.name,
        type: sanitizeLabel(e.type),
    }));
    parsed.relations = (parsed.relations || []).map((r) => ({
        source: r.source,
        target: r.target,
        type: sanitizeRelType(r.type),
    }));
    parsed.topics = (parsed.topics || []).slice(0, 5);

    return parsed;
}

/* ------------------------------------------------------------------ */
/*  Neo4j writer                                                      */
/* ------------------------------------------------------------------ */

export async function writeGraphToNeo4j(
    docId: string,
    title: string,
    author: string | undefined,
    extracted: ExtractionResult
): Promise<void> {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        // Create Document node
        await session.run(
            `MERGE (d:Document {docId: $docId}) SET d.title = $title`,
            { docId, title }
        );

        // Create entity nodes and MENTIONS relationships
        for (const entity of extracted.entities) {
            const label = sanitizeLabel(entity.type);
            // Use parameterised query; label is from allowlist so safe to interpolate
            await session.run(
                `MERGE (e:${label} {name: $name})
         WITH e
         MATCH (d:Document {docId: $docId})
         MERGE (d)-[:MENTIONS]->(e)`,
                { name: entity.name, docId }
            );
        }

        // Create relations between entities
        for (const rel of extracted.relations) {
            const relType = sanitizeRelType(rel.type);
            await session.run(
                `MATCH (a {name: $source}), (b {name: $target})
         MERGE (a)-[:${relType}]->(b)`,
                { source: rel.source, target: rel.target }
            );
        }

        // Create author EXPERT_IN topics
        if (author) {
            // AUTHORED relationship
            await session.run(
                `MERGE (p:Person {name: $author})
         WITH p
         MATCH (d:Document {docId: $docId})
         MERGE (p)-[:AUTHORED]->(d)`,
                { author, docId }
            );

            for (const topic of extracted.topics) {
                await session.run(
                    `MERGE (p:Person {name: $author})
           MERGE (c:Concept {name: $topic})
           MERGE (p)-[:EXPERT_IN]->(c)`,
                    { author, topic }
                );
            }
        }
    } finally {
        await session.close();
    }
}
