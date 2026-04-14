import mongoose from "mongoose";
import { env } from "../env.js";

export async function connectMongo(): Promise<void> {
    try {
        await mongoose.connect(env.MONGO_URI);
        console.log("[Mongo] Connected to", env.MONGO_URI);
    } catch (err) {
        console.error("[Mongo] Connection failed:", err);
        process.exit(1);
    }
}
