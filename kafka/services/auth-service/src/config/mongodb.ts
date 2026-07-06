import mongoose from "mongoose";    
import ApiError from "@workspace/shared/src/utils/apiError.js";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI!);
        console.log(`MongoDB Connected: ${connection.connection.host}`);
    } catch (error) {
        throw new ApiError(500, "MongoDB connection failed");
    }
}

export default connectDB;