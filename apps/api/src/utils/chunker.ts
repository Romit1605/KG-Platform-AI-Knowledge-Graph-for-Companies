export interface ChunkResult {
    text: string;
    index: number;
}

/**
 * Simple string chunker. Splits text into chunks of maxChars with overlap.
 */
export function chunkText(
    text: string,
    maxChars: number = 1200,
    overlap: number = 200
): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
        const end = Math.min(start + maxChars, text.length);
        chunks.push({
            text: text.slice(start, end),
            index,
        });
        index++;
        start += maxChars - overlap;
        if (start >= text.length) break;
    }

    return chunks;
}
