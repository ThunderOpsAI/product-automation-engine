import { getSupabase } from '@s1/shared';
import { AGENT_THRESHOLDS, AgentType, TaskStatus } from '@s1/shared';

// ═══════════════════════════════════════════
// Core Task Completion Logic
// ═══════════════════════════════════════════

/**
 * Complete an agent task and route it based on confidence threshold.
 *
 * If confidence >= agent-specific threshold → mark completed, proceed to next step.
 * If confidence < threshold → add to approvals_queue for human review.
 *
 * Per-agent thresholds:
 *   market_intel:   7
 *   asset_sourcing: 7
 *   enhancement:    8
 *   branding:       7
 *   listing:        8
 *   optimization:   6 (uses priority semantics)
 *   support_triage: 6
 */
export async function completeTask(
    taskId: string,
    agentType: AgentType,
    output: Record<string, unknown>,
    confidence: number,
    evidence?: Record<string, unknown>
): Promise<{ status: TaskStatus; approvalId?: string }> {
    const supabase = getSupabase();
    const threshold = AGENT_THRESHOLDS[agentType];

    if (confidence >= threshold) {
        // Above threshold: complete automatically
        const { error: updateError } = await supabase
            .from('tasks')
            .update({
                status: 'completed',
                output,
                evidence: evidence ?? null,
                confidence_score: confidence,
                completed_at: new Date().toISOString(),
            })
            .eq('id', taskId);

        if (updateError) {
            throw new Error(`Failed to update task: ${updateError.message}`);
        }

        return { status: 'completed' };
    }

    // Below threshold: queue for human approval
    const { error: updateError } = await supabase
        .from('tasks')
        .update({
            status: 'needs_approval',
            output,
            evidence: evidence ?? null,
            confidence_score: confidence,
        })
        .eq('id', taskId);

    if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
    }

    const { data: approval, error: approvalError } = await supabase
        .from('approvals_queue')
        .insert({
            task_id: taskId,
            system: 'digital_products',
            reason: `${agentType} confidence ${confidence} below threshold ${threshold}`,
            context: {
                agent_type: agentType,
                confidence,
                threshold,
                output_summary: summariseOutput(output),
            },
            status: 'pending',
        })
        .select('id')
        .single();

    if (approvalError) {
        throw new Error(`Failed to create approval: ${approvalError.message}`);
    }

    return {
        status: 'needs_approval',
        approvalId: approval?.id,
    };
}

/**
 * Create a short summary of agent output for the approval context.
 * This avoids dumping the full output into the context JSONB.
 */
function summariseOutput(output: Record<string, unknown>): string {
    // If it has a title, use that
    if (typeof output.title === 'string') return output.title;
    // If it has a niche, use that
    if (typeof output.niche === 'string') return output.niche;
    // If it's an array, describe the count
    if (Array.isArray(output)) return `${output.length} items`;
    // Fallback: list top-level keys
    return Object.keys(output).slice(0, 5).join(', ');
}
