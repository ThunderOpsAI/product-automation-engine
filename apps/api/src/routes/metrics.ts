import { Router, Request, Response } from 'express';
import { getSupabase } from '@s1/shared';

const router = Router();

/**
 * GET /api/metrics/daily
 * Get daily revenue snapshots for System 1.
 * Query params: ?days=7 (default 30)
 */
router.get('/daily', async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const supabase = getSupabase();

        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('metrics_daily')
            .select('*')
            .eq('system', 'digital_products')
            .gte('date', since.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch metrics: ${error.message}`);
        }

        // Compute summary
        const summary = {
            total_revenue_gross: 0,
            total_revenue_net: 0,
            total_units: 0,
            days: data?.length ?? 0,
        };

        for (const row of data ?? []) {
            summary.total_revenue_gross += Number(row.revenue_gross);
            summary.total_revenue_net += Number(row.revenue_net);
            summary.total_units += row.units_sold;
        }

        res.json({ summary, daily: data || [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
