import { Router, Request, Response } from 'express';
import { getSupabase } from '@s1/shared';

const router = Router();

/**
 * POST /api/support/incoming
 * Webhook endpoint for incoming marketplace support messages.
 * This is called by Gumroad/Etsy webhooks or manually.
 */
router.post('/incoming', async (req: Request, res: Response) => {
    try {
        const { platform, customer_email, message, sale_id } = req.body as {
            platform: string;
            customer_email: string;
            message: string;
            sale_id?: string;
        };

        if (!platform || !customer_email || !message) {
            res.status(400).json({
                error: 'Missing required fields: platform, customer_email, message',
            });
            return;
        }

        const supabase = getSupabase();

        // Create a support ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                platform,
                customer_email,
                message,
                sale_id: sale_id || null,
                action_taken: null,
                resolved: false,
            })
            .select('id')
            .single();

        if (ticketError) {
            throw new Error(`Failed to create support ticket: ${ticketError.message}`);
        }

        // Create a task for the support triage agent to process
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                type: 'support_triage',
                status: 'pending',
                priority: 5,
                input: {
                    ticket_id: ticket?.id,
                    platform,
                    customer_email,
                    message,
                    sale_id,
                },
            })
            .select('id')
            .single();

        if (taskError) {
            throw new Error(`Failed to create triage task: ${taskError.message}`);
        }

        res.status(201).json({
            ticket_id: ticket?.id,
            task_id: task?.id,
            status: 'queued_for_triage',
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
