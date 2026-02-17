import { Router, Request, Response } from 'express';
import { runDailyPipeline, runWeeklyOptimization, sendDailySummary } from '../lib/orchestrator.js';

const router = Router();

/**
 * POST /api/pipeline/run-daily
 * Trigger the full daily pipeline: MarketIntel → AssetSourcing → Enhancement → Branding → Listing
 *
 * Body (optional): { max_niches?: number }  — defaults to 3
 */
router.post('/run-daily', async (req: Request, res: Response) => {
    try {
        const { max_niches = 3 } = req.body as { max_niches?: number };

        // Run pipeline asynchronously — respond immediately
        res.status(202).json({
            message: 'Daily pipeline started',
            max_niches,
            note: 'Pipeline runs in the background. Check /api/tasks for progress.',
        });

        // Fire-and-forget (runs after response is sent)
        runDailyPipeline(max_niches).catch((err) => {
            console.error('[Pipeline] Unhandled error:', err);
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/pipeline/run-optimization
 * Trigger the weekly optimization pass on all live listings.
 */
router.post('/run-optimization', async (req: Request, res: Response) => {
    try {
        res.status(202).json({
            message: 'Optimization pass started',
            note: 'Running in the background. Check /api/tasks for progress.',
        });

        runWeeklyOptimization().catch((err) => {
            console.error('[Optimization] Unhandled error:', err);
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
