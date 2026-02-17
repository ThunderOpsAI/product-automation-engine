import { Router, Request, Response } from 'express';
import { getSupabase } from '@s1/shared';

const router = Router();

/**
 * GET /api/approvals/queue
 * List all pending approval items.
 */
router.get('/queue', async (_req: Request, res: Response) => {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('approvals_queue')
            .select(`
        id,
        task_id,
        system,
        reason,
        context,
        status,
        reviewed_at,
        reviewed_by,
        tasks (
          id,
          type,
          status,
          priority,
          output,
          confidence_score,
          created_at
        )
      `)
            .eq('status', 'pending')
            .order('task_id', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch approvals: ${error.message}`);
        }

        res.json({ approvals: data || [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/approvals/:id/approve
 * Approve a pending item.
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, reviewed_by = 'operator' } = req.body as {
            notes?: string;
            reviewed_by?: string;
        };

        const supabase = getSupabase();

        // Update approval record
        const { data: approval, error: approvalError } = await supabase
            .from('approvals_queue')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by,
            })
            .eq('id', id)
            .eq('status', 'pending')
            .select('task_id')
            .single();

        if (approvalError || !approval) {
            res.status(404).json({ error: 'Approval not found or already reviewed' });
            return;
        }

        // Update the associated task
        const { error: taskError } = await supabase
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', approval.task_id);

        if (taskError) {
            throw new Error(`Failed to update task: ${taskError.message}`);
        }

        res.json({ status: 'approved', task_id: approval.task_id, notes });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

/**
 * POST /api/approvals/:id/reject
 * Reject a pending item.
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason, reviewed_by = 'operator' } = req.body as {
            reason?: string;
            reviewed_by?: string;
        };

        const supabase = getSupabase();

        const { data: approval, error: approvalError } = await supabase
            .from('approvals_queue')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by,
            })
            .eq('id', id)
            .eq('status', 'pending')
            .select('task_id')
            .single();

        if (approvalError || !approval) {
            res.status(404).json({ error: 'Approval not found or already reviewed' });
            return;
        }

        // Update the associated task
        const { error: taskError } = await supabase
            .from('tasks')
            .update({
                status: 'failed',
                error_message: reason || 'Rejected by operator',
            })
            .eq('id', approval.task_id);

        if (taskError) {
            throw new Error(`Failed to update task: ${taskError.message}`);
        }

        res.json({ status: 'rejected', task_id: approval.task_id, reason });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
