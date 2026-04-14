import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IChatLogSource {
    docId: string;
    chunkIndex: number;
    qdrantId?: string;
    score: number;
}

export interface IChatLog extends MongoDoc {
    workspaceId: string;
    userId?: string;
    question: string;
    answer: string;
    createdAt: Date;
    retrievalScore: number;
    sources: IChatLogSource[];
    mode: "normal" | "mentor";
}

const ChatLogSchema = new Schema<IChatLog>({
    workspaceId: { type: String, default: "default", index: true },
    userId: { type: String },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    retrievalScore: { type: Number, default: 0 },
    sources: {
        type: [
            {
                docId: String,
                chunkIndex: Number,
                qdrantId: String,
                score: Number,
            },
        ],
        default: [],
    },
    mode: { type: String, enum: ["normal", "mentor"], default: "normal" },
});

ChatLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const ChatLogModel = mongoose.model<IChatLog>("ChatLog", ChatLogSchema);
