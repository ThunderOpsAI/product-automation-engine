import { getSupabase } from './supabase.js';

// ═══════════════════════════════════════════
// EMAIL HELPER — Resend API
// ═══════════════════════════════════════════

interface EmailParams {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

/**
 * Send an email via the Resend API.
 * Falls back to console.log if RESEND_API_KEY is not set (dev mode).
 */
export async function sendEmail(params: EmailParams): Promise<{ id: string } | null> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = params.from ?? `System 1 <noreply@${process.env.RESEND_DOMAIN ?? 'notifications.example.com'}>`;

    if (!apiKey) {
        console.log('[Email] STUB (no RESEND_API_KEY): Would send email:', {
            to: params.to,
            subject: params.subject,
        });
        return null;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [params.to],
                subject: params.subject,
                html: params.html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Email] Resend API error:', error);
            return null;
        }

        const result = await response.json() as { id: string };
        console.log(`[Email] Sent to ${params.to}: ${params.subject} (id: ${result.id})`);
        return result;
    } catch (error) {
        console.error('[Email] Failed to send:', error);
        return null;
    }
}

// ─────────────────────────────────────
// Email Templates
// ─────────────────────────────────────

/**
 * Send a refund confirmation email to a customer.
 */
export async function sendRefundConfirmationEmail(
    customerEmail: string,
    productTitle: string,
    refundAmount: number
): Promise<void> {
    await sendEmail({
        to: customerEmail,
        subject: 'Your refund has been processed',
        html: `
            <h2>Refund Confirmation</h2>
            <p>G'day,</p>
            <p>Your refund of <strong>$${refundAmount.toFixed(2)} USD</strong> for <strong>${productTitle}</strong> has been processed.</p>
            <p>The refund should appear in your account within 5–10 business days, depending on your payment provider.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Cheers,<br>Support Team</p>
        `.trim(),
    });
}

/**
 * Send a daily summary email to the operator.
 */
export async function sendDailySummaryEmail(summary: {
    revenue_gross: number;
    revenue_net: number;
    units_sold: number;
    pending_approvals: number;
    tasks_completed: number;
    tasks_failed: number;
}): Promise<void> {
    const operatorEmail = process.env.OPERATOR_EMAIL;
    if (!operatorEmail) {
        console.log('[Email] No OPERATOR_EMAIL set, skipping daily summary');
        return;
    }

    await sendEmail({
        to: operatorEmail,
        subject: `Daily Summary — $${summary.revenue_net.toFixed(2)} net revenue`,
        html: `
            <h2>System 1 — Daily Summary</h2>
            <table style="border-collapse: collapse; width: 100%;">
                <tr><td><strong>Revenue (Gross)</strong></td><td>$${summary.revenue_gross.toFixed(2)}</td></tr>
                <tr><td><strong>Revenue (Net)</strong></td><td>$${summary.revenue_net.toFixed(2)}</td></tr>
                <tr><td><strong>Units Sold</strong></td><td>${summary.units_sold}</td></tr>
                <tr><td><strong>Pending Approvals</strong></td><td>${summary.pending_approvals}</td></tr>
                <tr><td><strong>Tasks Completed</strong></td><td>${summary.tasks_completed}</td></tr>
                <tr><td><strong>Tasks Failed</strong></td><td>${summary.tasks_failed}</td></tr>
            </table>
            ${summary.pending_approvals > 0 ? '<p style="color: #e67e22;"><strong>⚠️ You have pending approvals that need attention.</strong></p>' : ''}
        `.trim(),
    });
}
