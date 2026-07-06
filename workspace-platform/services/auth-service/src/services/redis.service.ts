import redis from "../config/redis.js";

const REFRESH_TOKEN_PREFIX = "refresh:";
const BLACKLIST_PREFIX = "blacklist:";

export class RedisService {
    static async cacheRefreshToken(
        userId: string,
        token: string,
        ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
    ): Promise<void> {
        await redis.set(`${REFRESH_TOKEN_PREFIX}${userId}`, token, "EX", ttlSeconds);
    }

    static async getRefreshToken(userId: string): Promise<string | null> {
        return redis.get(`${REFRESH_TOKEN_PREFIX}${userId}`);
    }

    static async deleteRefreshToken(userId: string): Promise<void> {
        await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
    }

    static async blacklistToken(
        token: string,
        ttlSeconds: number = 15 * 60 // 15 minutes
    ): Promise<void> {
        await redis.set(`${BLACKLIST_PREFIX}${token}`, "1", "EX", ttlSeconds);
    }

    static async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
        return result !== null;
    }
}
