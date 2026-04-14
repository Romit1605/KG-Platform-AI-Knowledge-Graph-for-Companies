import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface INotification extends MongoDoc {
    workspaceId: string;
    userId?: string;
    type:
        | "doc_updated"
        | "incident_started"
        | "knowledge_gap_spike"
        | "new_topic"
        | "expert_needed"
        | "autodoc_published";
    title: string;
    message: string;
    linkUrl?: string;
    readAt?: Date;
    createdAt: Date;
    severity: "low" | "med" | "high";
}

const NotificationSchema = new Schema<INotification>({
    workspaceId: { type: String, default: "default", index: true },
    userId: { type: String },
    type: {
        type: String,
        enum: [
            "doc_updated",
            "incident_started",
            "knowledge_gap_spike",
            "new_topic",
            "expert_needed",
            "autodoc_published",
        ],
        required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    linkUrl: { type: String },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    severity: { type: String, enum: ["low", "med", "high"], default: "low" },
});

NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ workspaceId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>(
    "Notification",
    NotificationSchema
);
