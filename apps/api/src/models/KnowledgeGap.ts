import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface ISuggestedOwner {
    personName: string;
    score: number;
    reason: string;
}

export interface ISuggestedDoc {
    title: string;
    outline: string;
}

export interface IGapExample {
    question: string;
    createdAt: Date;
    userId?: string;
}

export interface IKnowledgeGap extends MongoDoc {
    workspaceId: string;
    question: string;
    normalizedQuestion: string;
    count: number;
    lastAskedAt: Date;
    avgRetrievalScore: number;
    status: "open" | "in_progress" | "resolved";
    suggestedOwners: ISuggestedOwner[];
    suggestedDocsToCreate: ISuggestedDoc[];
    examples: IGapExample[];
}

const KnowledgeGapSchema = new Schema<IKnowledgeGap>({
    workspaceId: { type: String, default: "default", index: true },
    question: { type: String, required: true },
    normalizedQuestion: { type: String, required: true },
    count: { type: Number, default: 1 },
    lastAskedAt: { type: Date, default: Date.now },
    avgRetrievalScore: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["open", "in_progress", "resolved"],
        default: "open",
    },
    suggestedOwners: {
        type: [{ personName: String, score: Number, reason: String }],
        default: [],
    },
    suggestedDocsToCreate: {
        type: [{ title: String, outline: String }],
        default: [],
    },
    examples: {
        type: [{ question: String, createdAt: Date, userId: String }],
        default: [],
    },
});

KnowledgeGapSchema.index({ normalizedQuestion: 1, workspaceId: 1 });

export const KnowledgeGapModel = mongoose.model<IKnowledgeGap>(
    "KnowledgeGap",
    KnowledgeGapSchema
);
