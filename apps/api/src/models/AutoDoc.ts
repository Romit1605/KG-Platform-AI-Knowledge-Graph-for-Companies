import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IAutoDoc extends MongoDoc {
    workspaceId: string;
    type: "postmortem" | "runbook" | "change_summary" | "faq";
    title: string;
    markdown: string;
    sourceRefs: {
        incidentId?: string;
        docId?: string;
        chatLogIds?: string[];
        githubRepo?: string;
    };
    createdBy: string;
    createdAt: Date;
}

const AutoDocSchema = new Schema<IAutoDoc>({
    workspaceId: { type: String, default: "default", index: true },
    type: {
        type: String,
        enum: ["postmortem", "runbook", "change_summary", "faq"],
        required: true,
    },
    title: { type: String, required: true },
    markdown: { type: String, required: true },
    sourceRefs: {
        type: {
            incidentId: String,
            docId: String,
            chatLogIds: [String],
            githubRepo: String,
        },
        default: {},
    },
    createdBy: { type: String, default: "system" },
    createdAt: { type: Date, default: Date.now },
});

AutoDocSchema.index({ workspaceId: 1, createdAt: -1 });

export const AutoDocModel = mongoose.model<IAutoDoc>("AutoDoc", AutoDocSchema);
