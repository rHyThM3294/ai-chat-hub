interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_TRACKED_CLIENTS = 5000;

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

type HeaderValue = string | string[] | undefined;

export function getClientIp(headers: Record<string, HeaderValue>): string {
  const forwarded = headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedValue) {
    const first = forwardedValue.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers["x-real-ip"];
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
  if (realIpValue) return realIpValue;
  return "unknown";
}
