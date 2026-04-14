import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface ITimelineEvent {
    timestamp: Date;
    type: string;
    description: string;
    author?: string;
}

export interface IIncident extends MongoDoc {
    title: string;
    system: string;
    status: "active" | "investigating" | "mitigating" | "resolved";
    timeline: ITimelineEvent[];
    createdBy: string;
    workspaceId?: string;
    createdAt: Date;
    resolvedAt?: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>({
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: String },
});

const IncidentSchema = new Schema<IIncident>({
    title: { type: String, required: true },
    system: { type: String, required: true },
    status: {
        type: String,
        enum: ["active", "investigating", "mitigating", "resolved"],
        default: "active",
    },
    timeline: [TimelineEventSchema],
    createdBy: { type: String, required: true },
    workspaceId: { type: String, index: true },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
});

export const IncidentModel = mongoose.model<IIncident>("Incident", IncidentSchema);
