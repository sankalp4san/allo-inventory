import { Redis } from "@upstash/redis";

// Upstash Redis client for idempotency and distributed operations
// Falls back gracefully if Redis is not configured
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.warn("Redis not configured, idempotency features will be disabled:", error);
}

export { redis };
export default redis;
