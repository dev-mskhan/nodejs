import type { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError.js";
import type { JwtPayload } from "@workspace/shared/src/types/crypto.js";
import { verifyAccessToken } from "@workspace/auth-service/src/utils/jwt.js";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.signedCookies?.accessToken;

    if(!token) {
        throw new ApiError(401, "Unauthorized");
    }
    try {
        const decodedToken = verifyAccessToken(token);
        (req as Request & {user: JwtPayload}).user = decodedToken as JwtPayload;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid token");
    }
} 
export default authMiddleware;