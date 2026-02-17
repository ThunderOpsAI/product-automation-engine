import { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS } from '@s1/shared';

// ═══════════════════════════════════════════
// Rate Limiting Middleware
// ═══════════════════════════════════════════

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory rate limit store (replace with Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

type RateLimitService = keyof typeof RATE_LIMITS;

/**
 * Create a rate limiting middleware for a specific service.
 * Uses a sliding window approach with in-memory storage.
 */
export function rateLimitMiddleware(service: RateLimitService) {
    const limit = RATE_LIMITS[service];

    // Window size in ms: per-minute for API, per-hour for integrations, per-day for email
    const windowMs =
        service === 'gemini_api'
            ? 60_000 // 1 minute
            : service === 'email_sending'
                ? 86_400_000 // 24 hours
                : 3_600_000; // 1 hour

    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${service}:${req.ip}`;
        const now = Date.now();
        const entry = rateLimitStore.get(key);

        if (!entry || now > entry.resetAt) {
            // New window
            rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (entry.count >= limit) {
            const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
            res.status(429).json({
                error: 'Rate limit exceeded',
                service,
                limit,
                retry_after_seconds: retryAfterSec,
            });
            return;
        }

        entry.count++;
        next();
    };
}

/**
 * Global API rate limiter — limits total requests per IP.
 */
export function globalRateLimit(maxPerMinute: number = 120) {
    return rateLimitMiddleware('gemini_api'); // reuse the same mechanism
}
