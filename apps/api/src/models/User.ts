import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IUser extends MongoDoc {
    email: string;
    passwordHash: string;
    name: string;
    roleTitle?: string;
    team?: string;
    interests: string[];
    lastActiveAt?: Date;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    roleTitle: { type: String, default: "" },
    team: { type: String, default: "" },
    interests: { type: [String], default: [] },
    lastActiveAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model<IUser>("User", UserSchema);
