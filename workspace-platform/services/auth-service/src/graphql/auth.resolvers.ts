import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import crypto from "crypto";
import env from "../config/env.js";
import {
    createJwtPayload,
    generateAccessToken,
    generateRefreshToken,
    attachCookieToResponse,
    verifyRefreshToken,
} from "../utils/generateToken.js";
import { emailProducer, KAFKA_TOPICS } from "../config/kafka.js";
import { RedisService } from "../services/redis.service.js";
import type { Request, Response } from "express";

interface GraphQLContext {
    req: Request;
    res: Response;
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

export const resolvers = {
    Query: {
        me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
            if (!context.user) {
                throw new ApiError(401, "Not authenticated");
            }
            const user = await User.findById(context.user.userId);
            if (!user) throw new ApiError(404, "User not found");
            if (user.isBanned) throw new ApiError(403, "User account is banned");
            return {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isBanned: user.isBanned,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
            };
        },
    },

    Mutation: {
        signup: async (
            _parent: unknown,
            { name, email, password }: Record<string, string>
        ) => {
            const session = await User.startSession();
            session.startTransaction();
            try {
                const existing = await User.findOne({ email }).session(session);
                if (existing) throw new ApiError(409, "Email already in use");

                const verificationToken = crypto.randomBytes(32).toString("hex");
                const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

                const userDocs = await User.create(
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

                const createdUser = userDocs[0];
                if (!createdUser) {
                    throw new ApiError(500, "User creation failed");
                }

                await session.commitTransaction();

                const verifyUrl = `${env.clientUrl}/verify-email/${verificationToken}`;
                await emailProducer.sendJSON(KAFKA_TOPICS.EMAIL_EVENTS, String(createdUser._id), {
                    type: "verification",
                    to: email,
                    subject: "Verify your email",
                    html: `<a href="${verifyUrl}">Click here to verify your email</a>`,
                });

                return {
                    success: true,
                    message: "Signup successful. Please verify your email.",
                };
            } catch (err) {
                await session.abortTransaction();
                if (err instanceof ApiError) throw err;
                throw new ApiError(500, "Failed to signup");
            } finally {
                session.endSession();
            }
        },

        verifyEmail: async (
            _parent: unknown,
            { token }: { token: string },
            context: GraphQLContext
        ) => {
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
            attachCookieToResponse(context.res, accessToken, refreshToken);

            return {
                success: true,
                message: "Email verified successfully",
                user: {
                    id: String(user._id),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    isBanned: user.isBanned,
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                },
            };
        },

        login: async (
            _parent: unknown,
            { email, password }: Record<string, string>,
            context: GraphQLContext
        ) => {
            const user = await User.findOne({ email }).select("+password");
            if (!user || !(await user.comparePassword(password))) {
                throw new ApiError(401, "Invalid email or password");
            }

            if (!user.isVerified) throw new ApiError(403, "Please verify your email first");
            if (user.isBanned) throw new ApiError(403, "Your account has been banned");

            const payload = createJwtPayload(user);
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            user.refreshToken = refreshToken;
            await user.save();

            await RedisService.cacheRefreshToken(String(user._id), refreshToken);
            attachCookieToResponse(context.res, accessToken, refreshToken);

            return {
                success: true,
                message: "Login successful",
                user: {
                    id: String(user._id),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    isBanned: user.isBanned,
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                },
            };
        },

        refreshToken: async (
            _parent: unknown,
            _args: unknown,
            context: GraphQLContext
        ) => {
            const token = context.req.signedCookies?.refresh_token;
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
            attachCookieToResponse(context.res, accessToken, refreshToken);

            return {
                success: true,
                message: "Token refreshed successfully",
            };
        },

        logout: async (
            _parent: unknown,
            _args: unknown,
            context: GraphQLContext
        ) => {
            const token = context.req.signedCookies?.refresh_token;
            if (token) {
                const user = await User.findOneAndUpdate(
                    { refreshToken: token },
                    { refreshToken: undefined }
                );
                if (user) {
                    await RedisService.deleteRefreshToken(String(user._id));
                }
                await RedisService.blacklistToken(token, 7 * 24 * 60 * 60);
            }
            context.res.clearCookie("refresh_token");
            context.res.clearCookie("access_token");
            return {
                success: true,
                message: "Logged out successfully",
            };
        },

        forgotPassword: async (
            _parent: unknown,
            { email }: { email: string }
        ) => {
            const user = await User.findOne({ email });
            if (!user) throw new ApiError(404, "No account with that email");

            const resetToken = crypto.randomBytes(32).toString("hex");
            user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
            user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
            await user.save();

            const resetUrl = `${env.clientUrl}/reset-password/${resetToken}`;
            await emailProducer.sendJSON(KAFKA_TOPICS.EMAIL_EVENTS, String(user._id), {
                type: "reset-password",
                to: email,
                subject: "Reset your password",
                html: `<a href="${resetUrl}">Click here to reset your password</a>`,
            });

            return {
                success: true,
                message: "Password reset email sent",
            };
        },

        resetPassword: async (
            _parent: unknown,
            { password, token }: Record<string, string>
        ) => {
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

            return {
                success: true,
                message: "Password reset successful",
            };
        },
    },
};
