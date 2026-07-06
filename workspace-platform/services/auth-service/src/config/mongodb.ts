import mongoose from "mongoose";
import env from "./env.js";

let isConnected: boolean = false;

export const connectDB = async (): Promise<void> => {
    if (env.nodeEnv === "test") return;
    if (isConnected) return;
    try {
        await mongoose.connect(env.mongo.uri);
        isConnected = true;
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        process.exit(1);
    }
}

export const disconnectDB = async (): Promise<void> => {
    await mongoose.disconnect()
    isConnected = false
    console.log('[MongoDB] Disconnected')
}