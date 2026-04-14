import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IDocumentVersion extends MongoDoc {
    documentId: string;
    versionNumber: number;
    title: string;
    content: string;
    createdAt: Date;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>({
    documentId: { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

DocumentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });

export const DocumentVersionModel = mongoose.model<IDocumentVersion>(
    "DocumentVersion",
    DocumentVersionSchema
);
