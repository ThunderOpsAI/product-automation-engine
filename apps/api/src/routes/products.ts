import { Router, Request, Response } from 'express';
import { getSupabase } from '@s1/shared';

const router = Router();

/**
 * GET /api/products
 * List all products with their status.
 * Query params: ?status=draft (optional filter)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const supabase = getSupabase();
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.status) {
            query = query.eq('status', req.query.status as string);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch products: ${error.message}`);
        }

        res.json({ products: data || [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
