import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import crypto from "crypto";
import env from "../config/env.js";
import { attachCookieToResponse, generateAccessToken, generateRefreshToken, createJwtPayload } from "../utils/generateToken.js";
import { emailProducer, KAFKA_TOPICS } from "../config/kafka.js";
import { RedisService } from "../services/redis.service.js";

export const signup = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const session = await User.startSession();
    session.startTransaction();

    try {
        const existing = await User.findOne({ email }).session(session);
        if (existing) throw new ApiError(409, "Email already in use");

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

        const user = await User.create(
            [
                {
                    name,
                    email,
                    password,
                    emailVerificationToken: hashedToken,
                    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
            ],
            { session }
        );

        const createdUser = user[0];
        if (!createdUser) {
            throw new ApiError(500, "User creation failed");
        }

        await session.commitTransaction();

        res.status(201).json(new ApiResponse(201, null, "Signup successful. Please verify your email."));

        const verifyUrl = `${env.clientUrl}/verify-email/${verificationToken}`;
        await emailProducer.sendJSON(KAFKA_TOPICS.EMAIL_EVENTS, String(createdUser._id), {
            type: "verification",
            to: email,
            subject: "Verify your email",
            html: `<a href="${verifyUrl}">Click here to verify your email</a>`,
        });
        return;
    } catch (err) {
        await session.abortTransaction();
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, "Failed to signup");
    } finally {
        session.endSession();
    }
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const token = req.params.token as string;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) throw new ApiError(400, "Invalid or expired verification token");

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    const payload = createJwtPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    await RedisService.cacheRefreshToken(String(user._id), refreshToken);
    attachCookieToResponse(res, accessToken, refreshToken);

    return res.json(new ApiResponse(200, user, "Email verified successfully"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password)))
        throw new ApiError(401, "Invalid email or password");

    if (!user.isVerified) throw new ApiError(403, "Please verify your email first");
    if (user.isBanned) throw new ApiError(403, "Your account has been banned");

    const payload = createJwtPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    await RedisService.cacheRefreshToken(String(user._id), refreshToken);
    attachCookieToResponse(res, accessToken, refreshToken);

    res.status(200).json(new ApiResponse(200, user, "Login successful"));
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.signedCookies?.refresh_token;
    if (!token) throw new ApiError(401, "No refresh token");

    const isBlacklisted = await RedisService.isTokenBlacklisted(token);
    if (isBlacklisted) throw new ApiError(401, "Refresh token is blacklisted");

    const user = await User.findOne({ refreshToken: token }).select("+refreshToken");
    if (!user) throw new ApiError(401, "Invalid refresh token");

    const cachedToken = await RedisService.getRefreshToken(String(user._id));
    if (cachedToken && cachedToken !== token) {
        throw new ApiError(401, "Session expired or invalidated");
    }

    const payload = createJwtPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    await RedisService.cacheRefreshToken(String(user._id), refreshToken);
    attachCookieToResponse(res, accessToken, refreshToken);

    res.status(200).json(new ApiResponse(200, null, "Token refreshed"));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.signedCookies?.refresh_token;
    if (token) {
        const user = await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: undefined });
        if (user) {
            await RedisService.deleteRefreshToken(String(user._id));
        }
        await RedisService.blacklistToken(token, 7 * 24 * 60 * 60); // Blacklist for 7 days
    }
    res
        .clearCookie("refresh_token")
        .clearCookie("access_token")
        .json(new ApiResponse(200, null, "Logged out successfully"));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "No account with that email");

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    res.json(new ApiResponse(200, null, "Password reset email sent"));

    const resetUrl = `${env.clientUrl}/reset-password/${resetToken}`;
    await emailProducer.sendJSON(KAFKA_TOPICS.EMAIL_EVENTS, String(user._id), {
        type: "reset-password",
        to: email,
        subject: "Reset your password",
        html: `<a href="${resetUrl}">Click here to reset your password</a>`,
    });
    return;
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;
    const token = req.params.token as string;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) throw new ApiError(400, "Invalid or expired reset token");

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json(new ApiResponse(200, null, "Password reset successful"));
});
