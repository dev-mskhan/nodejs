import { Request, Response, NextFunction } from "express";

interface ApiErrorLike {
    statusCode?: number;
    message: string;
    stack?: string;
}

export const errorHandler = (
    err: ApiErrorLike,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = err.statusCode ?? 500;
    const message = err.message || "Internal Server Error";

    console.error(`[Error] ${statusCode} - ${message}`, err.stack ?? "");

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
