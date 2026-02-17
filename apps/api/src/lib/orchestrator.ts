import { getSupabase, OpportunityBrief, SourcePack, EnhancedProduct, BrandingOutput, sendDailySummaryEmail } from '@s1/shared';
import { runMarketIntelAgent } from '../agents/market-intel.agent.js';
import { runAssetSourcingAgent } from '../agents/asset-sourcing.agent.js';
import { runEnhancementAgent } from '../agents/enhancement.agent.js';
import { runBrandingAgent } from '../agents/branding.agent.js';
import { runListingAgent } from '../agents/listing.agent.js';
import { runOptimizationAgent } from '../agents/optimization.agent.js';

// ═══════════════════════════════════════════
// MASTER ORCHESTRATOR
// ═══════════════════════════════════════════
//
// Chains all agents sequentially:
//   MarketIntel → AssetSourcing → Enhancement → Branding → Listing
//
// Design:
//   - Sequential per-niche: each niche runs through the full pipeline
//   - Fail-forward: if one niche fails, log it and continue to the next
//   - Approval gate: if any agent needs_approval, that niche stops
//   - Configurable: top N niches processed (default 3)

interface NicheResult {
    niche: string;
    status: 'completed' | 'failed' | 'needs_approval';
    stage_reached: string;
    error?: string;
    product_id?: string;
    listings?: Array<{ platform: string; id: string; url: string }>;
}

export interface PipelineResult {
    run_id: string;
    started_at: string;
    completed_at: string;
    niches_processed: number;
    niches_completed: number;
    niches_failed: number;
    niches_pending_approval: number;
    results: NicheResult[];
}

/**
 * Create a task record for an agent and return the task ID.
 */
async function createTask(
    type: string,
    input: Record<string, unknown>
): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('tasks')
        .insert({ type, status: 'pending', input })
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(`Failed to create ${type} task: ${error?.message}`);
    }
    return data.id;
}

/**
 * Check if a task completed successfully or was routed to approval.
 */
async function getTaskStatus(
    taskId: string
): Promise<{ status: string; output: Record<string, unknown> | null }> {
    const supabase = getSupabase();
    const { data } = await supabase
        .from('tasks')
        .select('status, output')
        .eq('id', taskId)
        .single();

    return {
        status: data?.status ?? 'unknown',
        output: data?.output as Record<string, unknown> | null,
    };
}

// ─────────────────────────────────────
// Daily Pipeline
// ─────────────────────────────────────

/**
 * Run the full daily pipeline:
 *   1. MarketIntel → top N niches
 *   2. For each niche: AssetSourcing → Enhancement → Branding → Listing
 *
 * @param maxNiches — how many top niches to process (default 3)
 */
export async function runDailyPipeline(maxNiches: number = 3): Promise<PipelineResult> {
    const startedAt = new Date().toISOString();
    const runId = `pipeline_${Date.now()}`;

    console.log(`\n═══ DAILY PIPELINE START (${runId}) ═══\n`);

    const results: NicheResult[] = [];

    // ─── Stage 1: MarketIntel ───
    console.log('[Pipeline] Stage 1: MarketIntel — finding niches...');

    const marketIntelTaskId = await createTask('market_intel', {});
    let briefs: OpportunityBrief[] = [];

    try {
        briefs = await runMarketIntelAgent(marketIntelTaskId);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Pipeline] MarketIntel failed: ${message}`);
        return {
            run_id: runId,
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            niches_processed: 0,
            niches_completed: 0,
            niches_failed: 1,
            niches_pending_approval: 0,
            results: [{ niche: 'market_intel', status: 'failed', stage_reached: 'market_intel', error: message }],
        };
    }

    // Check if MarketIntel was routed to approval
    const marketIntelStatus = await getTaskStatus(marketIntelTaskId);
    if (marketIntelStatus.status === 'needs_approval') {
        console.log('[Pipeline] MarketIntel needs approval — stopping pipeline');
        return {
            run_id: runId,
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            niches_processed: 0,
            niches_completed: 0,
            niches_failed: 0,
            niches_pending_approval: 1,
            results: [{ niche: 'market_intel', status: 'needs_approval', stage_reached: 'market_intel' }],
        };
    }

    // Take the top N niches by confidence score
    const topBriefs = briefs
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, maxNiches);

    console.log(`[Pipeline] Found ${briefs.length} niches, processing top ${topBriefs.length}:\n`);
    topBriefs.forEach((b, i) => console.log(`  ${i + 1}. ${b.niche} (confidence: ${b.confidence_score})`));
    console.log('');

    // ─── Stage 2-5: Per-niche pipeline ───
    for (let i = 0; i < topBriefs.length; i++) {
        const brief = topBriefs[i];
        console.log(`\n─── Niche ${i + 1}/${topBriefs.length}: "${brief.niche}" ───\n`);

        const nicheResult = await processNiche(brief);
        results.push(nicheResult);

        console.log(`[Pipeline] Niche "${brief.niche}" → ${nicheResult.status} (reached: ${nicheResult.stage_reached})`);
    }

    const completedAt = new Date().toISOString();
    const pipeline: PipelineResult = {
        run_id: runId,
        started_at: startedAt,
        completed_at: completedAt,
        niches_processed: results.length,
        niches_completed: results.filter((r) => r.status === 'completed').length,
        niches_failed: results.filter((r) => r.status === 'failed').length,
        niches_pending_approval: results.filter((r) => r.status === 'needs_approval').length,
        results,
    };

    console.log(`\n═══ DAILY PIPELINE COMPLETE ═══`);
    console.log(`  Processed: ${pipeline.niches_processed}`);
    console.log(`  Completed: ${pipeline.niches_completed}`);
    console.log(`  Failed: ${pipeline.niches_failed}`);
    console.log(`  Pending approval: ${pipeline.niches_pending_approval}\n`);

    return pipeline;
}

/**
 * Process a single niche through the full pipeline:
 *   AssetSourcing → Enhancement → Branding → Listing
 */
async function processNiche(brief: OpportunityBrief): Promise<NicheResult> {
    const niche = brief.niche;

    // ─── Stage 2: AssetSourcing ───
    console.log(`[${niche}] Stage 2: AssetSourcing...`);
    let sourcePack: SourcePack;

    try {
        const taskId = await createTask('asset_sourcing', { niche, positioning: brief.positioning });
        sourcePack = await runAssetSourcingAgent(taskId, niche, brief.positioning);

        const status = await getTaskStatus(taskId);
        if (status.status === 'needs_approval') {
            return { niche, status: 'needs_approval', stage_reached: 'asset_sourcing' };
        }
    } catch (error) {
        return { niche, status: 'failed', stage_reached: 'asset_sourcing', error: errorMessage(error) };
    }

    // ─── Stage 3: Enhancement ───
    console.log(`[${niche}] Stage 3: Enhancement...`);
    let enhancedProduct: EnhancedProduct;
    let productId: string | undefined;

    try {
        const taskId = await createTask('enhancement', { niche });
        enhancedProduct = await runEnhancementAgent(taskId, niche, sourcePack);

        const status = await getTaskStatus(taskId);
        if (status.status === 'needs_approval') {
            return { niche, status: 'needs_approval', stage_reached: 'enhancement' };
        }

        // Extract product_id from task output
        productId = (status.output as Record<string, unknown> | null)?.product_id as string | undefined;
    } catch (error) {
        return { niche, status: 'failed', stage_reached: 'enhancement', error: errorMessage(error) };
    }

    if (!productId) {
        return { niche, status: 'failed', stage_reached: 'enhancement', error: 'No product_id returned' };
    }

    // ─── Stage 4: Branding ───
    console.log(`[${niche}] Stage 4: Branding...`);
    let branding: BrandingOutput;

    try {
        const title = `${niche} — Complete Bundle`;
        const description = enhancedProduct.documentation?.readme ?? '';
        const price = enhancedProduct.variants.find((v) => v.name === 'Pro')?.suggested_price ?? 39;

        const taskId = await createTask('branding', { product_id: productId, niche });
        branding = await runBrandingAgent(taskId, productId, title, niche, description, price);

        const status = await getTaskStatus(taskId);
        if (status.status === 'needs_approval') {
            return { niche, status: 'needs_approval', stage_reached: 'branding', product_id: productId };
        }
    } catch (error) {
        return { niche, status: 'failed', stage_reached: 'branding', error: errorMessage(error), product_id: productId };
    }

    // ─── Stage 5: Listing ───
    console.log(`[${niche}] Stage 5: Listing...`);

    try {
        const title = branding.seo_title || `${niche} — Complete Bundle`;
        const description = branding.product_description || '';
        const price = enhancedProduct.variants.find((v) => v.name === 'Pro')?.suggested_price ?? 39;

        const taskId = await createTask('listing', { product_id: productId, niche });
        const listingResult = await runListingAgent(taskId, productId, title, description, price, branding);

        const status = await getTaskStatus(taskId);
        if (status.status === 'needs_approval') {
            return { niche, status: 'needs_approval', stage_reached: 'listing', product_id: productId };
        }

        return {
            niche,
            status: 'completed',
            stage_reached: 'listing',
            product_id: productId,
            listings: listingResult.listings,
        };
    } catch (error) {
        return { niche, status: 'failed', stage_reached: 'listing', error: errorMessage(error), product_id: productId };
    }
}

// ─────────────────────────────────────
// Weekly Optimization
// ─────────────────────────────────────

/**
 * Run the Optimization agent across all live listings.
 * Called weekly (Mondays) via GitHub Actions.
 */
export async function runWeeklyOptimization(): Promise<{ task_id: string; status: string }> {
    console.log('\n═══ WEEKLY OPTIMIZATION START ═══\n');

    const taskId = await createTask('optimization', {});
    try {
        await runOptimizationAgent(taskId);
        const status = await getTaskStatus(taskId);
        console.log(`[Optimization] Complete — status: ${status.status}`);
        return { task_id: taskId, status: status.status };
    } catch (error) {
        console.error(`[Optimization] Failed: ${errorMessage(error)}`);
        return { task_id: taskId, status: 'failed' };
    }
}

// ─────────────────────────────────────
// Daily Summary
// ─────────────────────────────────────

/**
 * Compute daily metrics and send summary email.
 */
export async function sendDailySummary(): Promise<void> {
    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];

    // Revenue today
    const { data: sales } = await supabase
        .from('sales')
        .select('amount_gross, platform_fee, amount_net')
        .gte('sale_date', `${today}T00:00:00`)
        .lte('sale_date', `${today}T23:59:59`);

    const revenue_gross = sales?.reduce((sum, s) => sum + (Number(s.amount_gross) || 0), 0) ?? 0;
    const revenue_net = sales?.reduce((sum, s) => sum + (Number(s.amount_net) || 0), 0) ?? 0;
    const units_sold = sales?.length ?? 0;

    // Pending approvals
    const { count: pending_approvals } = await supabase
        .from('approvals_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

    // Tasks today
    const { count: tasks_completed } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`);

    const { count: tasks_failed } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('completed_at', `${today}T00:00:00`);

    // Upsert daily metrics
    await supabase.from('metrics_daily').upsert({
        date: today,
        system: 'digital_products',
        revenue_gross,
        revenue_net,
        units_sold,
        metadata: { pending_approvals: pending_approvals ?? 0 },
    });

    // Send email
    await sendDailySummaryEmail({
        revenue_gross,
        revenue_net,
        units_sold,
        pending_approvals: pending_approvals ?? 0,
        tasks_completed: tasks_completed ?? 0,
        tasks_failed: tasks_failed ?? 0,
    });

    console.log(`[Daily Summary] Revenue: $${revenue_net.toFixed(2)} net | Units: ${units_sold} | Pending: ${pending_approvals ?? 0}`);
}

// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
