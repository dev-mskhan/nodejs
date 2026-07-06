import type { NextFunction, Request, Response } from "express";
import ApiError from "../utils/apiError.js";
import { success, ZodError } from "zod";
import mongoose from "mongoose";

const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    if (err instanceof ZodError) {
        statusCode = 400;
        message = err.issues.map((err: any) => err.message).join(", ");
    }
    else if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = "Invalid resource id";
    }

    // duplicate key
    else if (err.code === 11000) {
        statusCode = 400;
        message = "Duplicate field value";
    }

    else if (err instanceof Error) {
        message = err.message;
    }
    res.status(statusCode).json({ success: false, message, stack: process.env.NODE_ENV === "development" ? err.stack : undefined });
}

export default errorMiddleware;