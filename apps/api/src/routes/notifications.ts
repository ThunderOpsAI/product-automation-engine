import { Router, Request, Response } from 'express';
import { sendDailySummary } from '../lib/orchestrator.js';

const router = Router();

/**
 * POST /api/notifications/daily-summary
 * Compute daily metrics and send summary email to operator.
 */
router.post('/daily-summary', async (req: Request, res: Response) => {
    try {
        await sendDailySummary();
        res.json({ message: 'Daily summary sent' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
