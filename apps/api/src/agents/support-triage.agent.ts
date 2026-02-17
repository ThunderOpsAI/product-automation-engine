import { callGeminiJSON, getSupabase, SupportOutput, sendRefundConfirmationEmail } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 7: SUPPORT TRIAGE
// ═══════════════════════════════════════════
//
// Mission: Classify and handle customer support messages.
// Output: SupportOutput (auto-respond, refund, or escalate)
// Threshold: 6 (lower bar)

const SUPPORT_SYSTEM_PROMPT = `You are a customer support triage agent for a digital product store.
Your job is to classify incoming support messages and determine the appropriate action.

Decision tree:
1. DOWNLOAD ISSUE → auto_respond with re-download link instructions
2. FORMAT/COMPATIBILITY QUESTION → auto_respond with format details
3. REFUND REQUEST (purchase < 7 days) → refund automatically
4. REFUND REQUEST (purchase ≥ 7 days) → escalate to human
5. COMPLAINT ABOUT QUALITY → escalate with high priority
6. GENERAL QUESTION → auto_respond if you can, otherwise escalate

Auto-refund policy:
- Refund automatically if purchase was within the last 7 days
- No questions asked for first refund
- Second refund from same email → escalate

Escalation priority:
- low: general questions, non-urgent
- medium: quality complaints, repeat customers
- high: legal threats, public complaints, fraud indicators

Write responses in Australian English (colour, organise, etc.).
You MUST respond with valid JSON only.`;

const SUPPORT_PROMPT = `Classify this support message and determine the action:

PLATFORM: {platform}
CUSTOMER: {email}
MESSAGE: {message}
PURCHASE DATE: {purchase_date}
DAYS SINCE PURCHASE: {days_since_purchase}

Respond with:
- action: 'auto_respond' | 'refund' | 'escalate'
- response: message to send to customer (if auto_respond)
- refund_amount: amount to refund (if refund)
- escalation_reason: why this needs human review (if escalate)
- escalation_priority: 'low' | 'medium' | 'high'

JSON format matching SupportOutput interface.`;

/**
 * Run the Support Triage agent.
 * Classifies a customer message and takes appropriate action.
 */
export async function runSupportTriageAgent(
    taskId: string,
    ticketId: string
): Promise<SupportOutput> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        // Get the support ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            throw new Error(`Support ticket not found: ${ticketId}`);
        }

        // Look up purchase info
        let purchaseDate: string | null = null;
        let daysSincePurchase = 999;

        if (ticket.sale_id) {
            const { data: sale } = await supabase
                .from('sales')
                .select('sale_date')
                .eq('id', ticket.sale_id)
                .single();

            if (sale?.sale_date) {
                purchaseDate = sale.sale_date;
                daysSincePurchase = Math.floor(
                    (Date.now() - new Date(sale.sale_date).getTime()) / (1000 * 60 * 60 * 24)
                );
            }
        }

        const prompt = SUPPORT_PROMPT
            .replace('{platform}', ticket.platform || 'unknown')
            .replace('{email}', ticket.customer_email || 'unknown')
            .replace('{message}', ticket.message || '')
            .replace('{purchase_date}', purchaseDate || 'unknown')
            .replace('{days_since_purchase}', String(daysSincePurchase));

        const result = await callGeminiJSON<SupportOutput>({
            prompt,
            system: SUPPORT_SYSTEM_PROMPT,
            maxTokens: 2000,
            temperature: 0.3, // Low temperature for consistent triage
        });

        // Update the ticket with the action taken
        await supabase
            .from('support_tickets')
            .update({
                action_taken: result.action,
                response_sent: result.response || null,
                escalation_reason: result.escalation_reason || null,
                escalation_priority: result.escalation_priority || null,
                resolved: result.action !== 'escalate',
            })
            .eq('id', ticketId);

        // Handle refund if applicable
        if (result.action === 'refund' && ticket.sale_id) {
            // TODO: Call actual platform refund API
            console.log(`[Support Agent] STUB: Would refund sale ${ticket.sale_id}`);

            await supabase
                .from('sales')
                .update({
                    refunded: true,
                    refund_date: new Date().toISOString(),
                })
                .eq('id', ticket.sale_id);

            // Send refund confirmation email via Resend (spec requirement)
            if (ticket.customer_email) {
                // Look up product title for the email
                const { data: sale } = await supabase
                    .from('sales')
                    .select('product_id, amount_usd, products(title)')
                    .eq('id', ticket.sale_id)
                    .single();

                const productTitle = (sale?.products as unknown as { title?: string })?.title ?? 'your product';
                const refundAmount = result.refund_amount ?? sale?.amount_usd ?? 0;

                await sendRefundConfirmationEmail(
                    ticket.customer_email,
                    productTitle,
                    refundAmount
                );
            }
        }

        // Determine confidence based on action
        const confidence =
            result.action === 'auto_respond' ? 8 :
                result.action === 'refund' && daysSincePurchase <= 7 ? 8 :
                    result.action === 'escalate' ? 6 : 7;

        await completeTask(
            taskId,
            'support_triage',
            {
                action: result.action,
                ticket_id: ticketId,
                escalation_priority: result.escalation_priority,
            },
            confidence,
            {
                platform: ticket.platform,
                action: result.action,
                days_since_purchase: daysSincePurchase,
            }
        );

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
            .eq('id', taskId);
        throw error;
    }
}
