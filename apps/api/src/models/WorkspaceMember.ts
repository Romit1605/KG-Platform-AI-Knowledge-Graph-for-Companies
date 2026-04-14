import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export type WorkspaceRole = "admin" | "editor" | "viewer";

export interface IWorkspaceMember extends MongoDoc {
    userId: string;
    workspaceId: string;
    role: WorkspaceRole;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>({
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    role: { type: String, enum: ["admin", "editor", "viewer"], required: true },
});

WorkspaceMemberSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

export const WorkspaceMemberModel = mongoose.model<IWorkspaceMember>(
    "WorkspaceMember",
    WorkspaceMemberSchema
);
