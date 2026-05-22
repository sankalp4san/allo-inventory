/**
 * Idempotency Middleware
 *
 * Ensures that POST requests with the same Idempotency-Key header
 * return the original response without repeating the side effect.
 *
 * Strategy:
 * 1. Client sends `Idempotency-Key` header (typically a UUID)
 * 2. Before processing, check Redis for cached response under that key
 * 3. If found → return cached response (no side effect repeated)
 * 4. If not found → process request, cache response in Redis with 24h TTL
 *
 * Fallback: If Redis is unavailable, the idempotencyKey unique constraint
 * on the Reservation model provides database-level deduplication.
 */

import redis from "@/lib/redis";

interface CachedResponse {
  status: number;
  body: unknown;
}

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
const KEY_PREFIX = "idempotency:";

/**
 * Check if a response for this idempotency key already exists.
 * Returns the cached response if found, null otherwise.
 */
export async function getIdempotentResponse(
  key: string
): Promise<CachedResponse | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get<CachedResponse>(`${KEY_PREFIX}${key}`);
    return cached || null;
  } catch (error) {
    console.warn("Redis get failed for idempotency check:", error);
    return null;
  }
}

/**
 * Store the response for this idempotency key in Redis.
 */
export async function setIdempotentResponse(
  key: string,
  status: number,
  body: unknown
): Promise<void> {
  if (!redis) return;

  try {
    await redis.set(
      `${KEY_PREFIX}${key}`,
      { status, body } as CachedResponse,
      { ex: IDEMPOTENCY_TTL_SECONDS }
    );
  } catch (error) {
    console.warn("Redis set failed for idempotency storage:", error);
  }
}

/**
 * Extract the Idempotency-Key header from a request.
 */
export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get("idempotency-key") || null;
}
