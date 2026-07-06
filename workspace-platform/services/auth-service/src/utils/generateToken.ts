import jwt from "jsonwebtoken";
import type { Response } from "express";
import env from "../config/env.js";

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export interface UserLike {
    _id: unknown;
    email: string;
    role?: string;
}

export const createJwtPayload = (user: UserLike): JwtPayload => ({
    userId: String(user._id),
    email: user.email,
    role: user.role ?? "user",
});

export const generateAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, env.jwt.accessSecret, {
        expiresIn: env.jwt.accessExpires,
    });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, env.jwt.refreshSecret, {
        expiresIn: env.jwt.refreshExpires,
    });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
};

export const attachCookieToResponse = (
    res: Response,
    accessToken: string,
    refreshToken: string
): void => {
    const isProduction = env.nodeEnv === "production";

    res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: isProduction,
        signed: true,
        maxAge: 15 * 60 * 1000, // 15 minutes
        sameSite: "strict",
    });

    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        signed: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "strict",
    });
};
