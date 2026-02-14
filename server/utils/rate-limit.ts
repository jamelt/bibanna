import type { H3Event } from 'h3'

interface SlidingWindowEntry {
  count: number
  resetAt: number
}

const windows = new Map<string, SlidingWindowEntry>()

const CLEANUP_INTERVAL_MS = 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) {
      windows.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 }
}

export function enforceRateLimit(
  event: H3Event,
  prefix: string,
  maxRequests: number,
  windowMs: number,
) {
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const key = `${prefix}:${ip}`

  const result = checkRateLimit(key, maxRequests, windowMs)

  if (!result.allowed) {
    setResponseHeader(event, 'retry-after', String(Math.ceil(result.retryAfterMs / 1000)))
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    })
  }
}
