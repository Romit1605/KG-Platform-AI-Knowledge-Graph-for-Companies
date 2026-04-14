import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IDocument extends MongoDoc {
    title: string;
    author?: string;
    text: string;
    source?: string;
    workspaceId?: string;
    visibility: "public" | "private";
    tags: string[];
    trustScore: number;
    lastReviewedAt?: Date;
    updatedBy?: string;
    createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
    title: { type: String, required: true },
    author: { type: String, default: "" },
    text: { type: String, required: true },
    source: { type: String, default: "" },
    workspaceId: { type: String, index: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    tags: { type: [String], default: [] },
    trustScore: { type: Number, default: 50 },
    lastReviewedAt: { type: Date },
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const DocumentModel = mongoose.model<IDocument>("Document", DocumentSchema);
