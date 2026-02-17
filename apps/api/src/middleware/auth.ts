import { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════
// Auth Middleware
// ═══════════════════════════════════════════

/**
 * Bearer token auth middleware.
 * Validates requests against the API_KEY environment variable.
 * In development, if API_KEY is not set, all requests are allowed.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKey = process.env.API_KEY;

    // Skip auth in development if no key is set
    if (!apiKey || process.env.NODE_ENV === 'development') {
        next();
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.slice(7);
    if (token !== apiKey) {
        res.status(403).json({ error: 'Invalid API key' });
        return;
    }

    next();
}
