import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IWorkspace extends MongoDoc {
    name: string;
    ownerId: string;
    createdAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>({
    name: { type: String, required: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const WorkspaceModel = mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
