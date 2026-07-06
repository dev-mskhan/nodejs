import ApiError from "@workspace/shared/src/utils/apiError.js";
import {Redis} from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

redis.on("connect", () => {
    console.log("Redis connected");
}).on("error", (err) => {
    throw new ApiError(500, "Redis connection failed");
})

export default redis;