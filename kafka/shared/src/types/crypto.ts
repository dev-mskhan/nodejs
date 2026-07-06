import { Types } from "mongoose";

interface JwtPayload {
    userId: Types.ObjectId;
    email: string;
    name: string;
}

export type { JwtPayload };