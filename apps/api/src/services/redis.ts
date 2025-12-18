import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

// Singleton instance
export const redis = new Redis(redisConfig);

export const closeRedis = async () => {
    await redis.quit();
};
