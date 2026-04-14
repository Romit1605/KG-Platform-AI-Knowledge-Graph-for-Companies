import { diffLines } from "diff";

export interface DiffChange {
    type: "added" | "removed" | "unchanged";
    value: string;
}

export interface DiffResult {
    changes: DiffChange[];
    summary: {
        added: number;
        removed: number;
        unchanged: number;
    };
}

export function computeDiff(oldText: string, newText: string): DiffResult {
    const rawChanges = diffLines(oldText, newText);
    const result: DiffResult = {
        changes: [],
        summary: { added: 0, removed: 0, unchanged: 0 },
    };

    for (const change of rawChanges) {
        const lineCount =
            (change.value.match(/\n/g) || []).length +
            (change.value.endsWith("\n") ? 0 : 1);

        if (change.added) {
            result.changes.push({ type: "added", value: change.value });
            result.summary.added += lineCount;
        } else if (change.removed) {
            result.changes.push({ type: "removed", value: change.value });
            result.summary.removed += lineCount;
        } else {
            result.changes.push({ type: "unchanged", value: change.value });
            result.summary.unchanged += lineCount;
        }
    }

    return result;
}
