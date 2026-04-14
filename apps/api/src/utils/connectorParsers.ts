/* ------------------------------------------------------------------ */
/*  Slack Export Parser                                                */
/* ------------------------------------------------------------------ */

export interface SlackMessage {
    user?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
    reply_count?: number;
    [key: string]: any;
}

export interface SlackChannel {
    name?: string;
    messages?: SlackMessage[];
    [key: string]: any;
}

export function parseSlackExport(
    data: SlackChannel[]
): { title: string; text: string; author: string }[] {
    const results: { title: string; text: string; author: string }[] = [];

    for (const channel of data) {
        const channelName = channel.name || "unknown-channel";
        const messages = channel.messages || [];

        const threads = new Map<string, SlackMessage[]>();
        const standalone: SlackMessage[] = [];

        for (const msg of messages) {
            if (msg.thread_ts && msg.thread_ts !== msg.ts) {
                const thread = threads.get(msg.thread_ts) || [];
                thread.push(msg);
                threads.set(msg.thread_ts, thread);
            } else if (msg.thread_ts && msg.reply_count) {
                const thread = threads.get(msg.ts!) || [];
                thread.unshift(msg);
                threads.set(msg.ts!, thread);
            } else {
                standalone.push(msg);
            }
        }

        for (const [ts, threadMsgs] of threads) {
            const text = threadMsgs
                .map((m) => `${m.user || "unknown"}: ${m.text || ""}`)
                .join("\n");
            results.push({
                title: `Slack #${channelName} thread ${ts}`,
                text,
                author: threadMsgs[0]?.user || "unknown",
            });
        }

        if (standalone.length > 0) {
            const text = standalone
                .map((m) => `${m.user || "unknown"}: ${m.text || ""}`)
                .join("\n");
            results.push({
                title: `Slack #${channelName}`,
                text,
                author: "channel",
            });
        }
    }

    return results;
}

/* ------------------------------------------------------------------ */
/*  Discord Chat Log Parser                                           */
/* ------------------------------------------------------------------ */

export interface DiscordMessage {
    author?: { username?: string };
    content?: string;
    timestamp?: string;
    [key: string]: any;
}

export function parseDiscordLog(
    messages: DiscordMessage[]
): { title: string; text: string; author: string }[] {
    const results: { title: string; text: string; author: string }[] = [];
    const segments: DiscordMessage[][] = [];
    let current: DiscordMessage[] = [];

    for (const msg of messages) {
        if (current.length > 0 && msg.timestamp) {
            const prev = current[current.length - 1];
            const gap =
                new Date(msg.timestamp).getTime() -
                new Date(prev.timestamp || "").getTime();
            if (gap > 10 * 60 * 1000) {
                segments.push(current);
                current = [];
            }
        }
        current.push(msg);
    }
    if (current.length > 0) segments.push(current);

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const text = seg
            .map(
                (m) =>
                    `${m.author?.username || "unknown"}: ${m.content || ""}`
            )
            .join("\n");
        results.push({
            title: `Discord conversation segment ${i + 1}`,
            text,
            author: seg[0]?.author?.username || "unknown",
        });
    }

    return results;
}

/* ------------------------------------------------------------------ */
/*  GitHub Repo Parser                                                */
/* ------------------------------------------------------------------ */

export async function fetchGitHubDocs(
    repoUrl: string
): Promise<{ title: string; text: string; author: string }[]> {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match)
        throw new Error(
            "Invalid GitHub URL format. Expected: https://github.com/owner/repo"
        );

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    const results: { title: string; text: string; author: string }[] = [];

    // Fetch README
    try {
        const readmeRes = await fetch(
            `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
            { headers: { Accept: "application/vnd.github.v3.raw" } }
        );
        if (readmeRes.ok) {
            const readme = await readmeRes.text();
            results.push({
                title: `${owner}/${cleanRepo} - README`,
                text: stripMarkdown(readme),
                author: owner,
            });
        }
    } catch {
        /* skip */
    }

    // Fetch /docs folder
    try {
        const docsRes = await fetch(
            `https://api.github.com/repos/${owner}/${cleanRepo}/contents/docs`,
            { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (docsRes.ok) {
            const files: any[] = (await docsRes.json()) as any[];
            for (const file of files) {
                if (
                    file.type === "file" &&
                    (file.name.endsWith(".md") || file.name.endsWith(".txt"))
                ) {
                    try {
                        const contentRes = await fetch(file.download_url);
                        if (contentRes.ok) {
                            const content = await contentRes.text();
                            results.push({
                                title: `${owner}/${cleanRepo} - docs/${file.name}`,
                                text: file.name.endsWith(".md")
                                    ? stripMarkdown(content)
                                    : content,
                                author: owner,
                            });
                        }
                    } catch {
                        /* skip */
                    }
                }
            }
        }
    } catch {
        /* skip */
    }

    if (results.length === 0) {
        throw new Error("No documentation found in repository");
    }

    return results;
}

/* ------------------------------------------------------------------ */
/*  Markdown File Parser                                              */
/* ------------------------------------------------------------------ */

export function parseMarkdownFiles(
    files: { name: string; content: string }[]
): { title: string; text: string; author: string }[] {
    return files.map((file) => {
        const titleMatch = file.content.match(/^#\s+(.+)/m);
        const title = titleMatch
            ? titleMatch[1]
            : file.name.replace(/\.md$/, "");
        return {
            title,
            text: stripMarkdown(file.content),
            author: "",
        };
    });
}

/* ------------------------------------------------------------------ */
/*  Markdown to plain text                                            */
/* ------------------------------------------------------------------ */

function stripMarkdown(md: string): string {
    return md
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
        .replace(/^\s*[-*+]\s+/gm, "- ")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/^>\s+/gm, "")
        .replace(/^---+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
