import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { IUser } from "../models/User.js";
import type { JwtPayload } from "@workspace/shared/src/types/crypto.js";

export const generateAccessToken = (payload: JwtPayload) =>
    jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "2h" });

export const generateRefreshToken = (payload: JwtPayload) =>
    jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });

export const createJwtPayload = (user: IUser): JwtPayload => {
    const payload: JwtPayload = {
        userId: user._id,
        name: user.name,
        email: user.email
    };
    return payload;
};
export const attachCookieToResponse = (
    res: Response,
    access_token: string,
    refresh_token: string,
) => {
    res.cookie("access_token", access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        signed: true,
        maxAge: 2 * 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        signed: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const verifyRefreshToken = (token: string) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };

export const verifyAccessToken = (token: string) =>
    jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
        name: string;
    };