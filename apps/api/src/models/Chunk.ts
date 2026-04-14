import mongoose, { Schema, Document as MongoDoc } from "mongoose";

export interface IChunk extends MongoDoc {
    docId: string;
    chunkIndex: number;
    text: string;
    qdrantId: string;
}

const ChunkSchema = new Schema<IChunk>({
    docId: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    qdrantId: { type: String, required: true },
});

export const ChunkModel = mongoose.model<IChunk>("Chunk", ChunkSchema);
