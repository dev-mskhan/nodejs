import jwt from "jsonwebtoken";
import type { Request } from "express";

export interface UserPayload {
    userId: string;
    email: string;
    role: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "shk-rtujwt123access";

/**
 * Extracts and verifies the access token from signed cookies or Authorization header.
 */
export const getAuthContextUser = (req: Request): UserPayload | null => {
    // 1. Try to read from signed cookies
    let token = req.signedCookies?.access_token;

    // 2. Try to read from Authorization header if cookie not present
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as UserPayload;
        return decoded;
    } catch (err) {
        console.warn("[Gateway Auth] Token verification failed:", err instanceof Error ? err.message : err);
        return null;
    }
};
