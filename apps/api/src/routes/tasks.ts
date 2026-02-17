import { Router, Request, Response } from 'express';
import { getSupabase, AgentType } from '@s1/shared';

const router = Router();

/**
 * POST /api/tasks/create
 * Create and queue a new agent task.
 */
router.post('/create', async (req: Request, res: Response) => {
    try {
        const { type, priority = 5, input = {} } = req.body as {
            type: AgentType;
            priority?: number;
            input?: Record<string, unknown>;
        };

        if (!type) {
            res.status(400).json({ error: 'Missing required field: type' });
            return;
        }

        const validTypes: AgentType[] = [
            'market_intel',
            'asset_sourcing',
            'enhancement',
            'branding',
            'listing',
            'optimization',
            'support_triage',
        ];

        if (!validTypes.includes(type)) {
            res.status(400).json({ error: `Invalid agent type: ${type}`, valid_types: validTypes });
            return;
        }

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                type,
                status: 'pending',
                priority,
                input,
            })
            .select('id, type, status, priority, created_at')
            .single();

        if (error) {
            throw new Error(`Failed to create task: ${error.message}`);
        }

        res.status(201).json({ task: data });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

/**
 * GET /api/tasks/:id
 * Get task status and output.
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({ task: data });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
