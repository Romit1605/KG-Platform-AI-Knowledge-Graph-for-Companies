import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IFeedback extends MongoDoc {
    question: string;
    answer: string;
    rating: number;
    sources: { docId: string; chunkIndex: number }[];
    userId?: string;
    workspaceId?: string;
    createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    sources: [
        {
            docId: { type: String },
            chunkIndex: { type: Number },
        },
    ],
    userId: { type: String },
    workspaceId: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const FeedbackModel = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
