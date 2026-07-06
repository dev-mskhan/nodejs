import {Redis} from 'ioredis';
import RedisMock from 'ioredis-mock';
import env from './env.js';
export const redisConnection = {
    host: new URL(env.redis.url).hostname,
    port: Number(new URL(env.redis.url).port) || 6379,
    maxRetriesPerRequest: null,
};

export const getRedisClient = (): Redis => {
  // Local testing: use mock (no Redis container needed)
  if (process.env.USE_MOCK_REDIS === 'true') {
    return new RedisMock() as unknown as Redis;
  }
  
  // Container / production: real Redis
  return new Redis(env.redis.url!);
};

const redis = getRedisClient();
redis.on("connect", () => console.log("Redis connected"));

redis.on("ready", () => {
    console.log("Redis ready");
});

redis.on("error", (err: Error) => {
    console.error("Redis error:", err.message);
});
export default redis;