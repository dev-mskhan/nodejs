import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
    [ip: string]: number[];
}

const store: RateLimitStore = {};

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // Max 100 requests per window

/**
 * Basic in-memory sliding window rate limiter middleware.
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    if (!store[ip]) {
        store[ip] = [];
    }

    // Filter out requests older than the window
    store[ip] = store[ip].filter((timestamp) => now - timestamp < WINDOW_MS);

    if (store[ip].length >= MAX_REQUESTS) {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: "Too many requests. Please try again later.",
        });
        return;
    }

    store[ip].push(now);
    
    // Set headers
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - store[ip].length);

    next();
};
