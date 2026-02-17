import { Router, Request, Response } from 'express';
import { getSupabase } from '@s1/shared';

const router = Router();

/**
 * GET /api/listings
 * List live listings with performance data.
 * Query params: ?platform=gumroad (optional filter)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const supabase = getSupabase();
        let query = supabase
            .from('listings')
            .select(`
        *,
        products (
          id,
          title,
          niche,
          price_usd
        )
      `)
            .order('created_at', { ascending: false });

        if (req.query.platform) {
            query = query.eq('platform', req.query.platform as string);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch listings: ${error.message}`);
        }

        res.json({ listings: data || [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
