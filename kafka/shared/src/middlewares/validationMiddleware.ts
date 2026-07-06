import type { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError.js";

type Source = "body" | "query" | "params";

const validateRequest = (schema: ZodSchema, ...sources: Source[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
        const data = Object.fromEntries(sources.map(s => [s, req[s as keyof Request]]));

        const result = schema.safeParse(data);
        if (!result.success) {
            const message = result.error.issues
                .map(e => `${e.path.join(".")}: ${e.message}`)
                .join(", ");
            return next(new ApiError(422, message));
        }

        (req as any).validated = result.data;
        next();
    };

export default validateRequest;