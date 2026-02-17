import { callGeminiJSON, getSupabase, OptimizationOutput, ExperimentProposal } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 6: OPTIMIZATION
// ═══════════════════════════════════════════
//
// Mission: Propose and manage A/B experiments on live listings.
// Output: OptimizationOutput with experiment proposals
// Threshold: 6 (lower bar — experiments are reversible)
// Key: Priority < 8 auto-applies; Priority ≥ 8 queued for human approval

const OPTIMIZATION_SYSTEM_PROMPT = `You are a conversion rate optimiser for digital products.
Your job is to propose A/B experiments that improve sales performance.

Experiment types:
- price: Test different price points (±20% of current)
- title: Test different SEO titles
- thumbnail: Test different cover images

Rules:
- Max 1 active experiment per listing
- Min 7 days between experiments on the same listing
- Need at least 50 views before proposing experiments
- All changes must be logged with before/after data

Priority scoring (1-10):
- 1-5: Low-impact, safe experiments (auto-apply)
- 6-7: Medium-impact experiments (auto-apply)
- 8-10: High-impact or risky experiments (needs human approval)

Write in Australian English.
You MUST respond with valid JSON only.`;

const OPTIMIZATION_PROMPT = `Analyse these listings and propose A/B experiments:

LISTINGS:
{listings}

For each listing with opportunities, propose experiments:
- listing_id
- type: 'price' | 'title' | 'thumbnail'
- current_value
- proposed_value
- hypothesis: "If we [change], then [metric] will [improve] because [reason]"
- expected_lift_pct
- priority: 1-10 (8+ means needs human approval)
- data_points: number of views used for this analysis

Return JSON: { "experiments": [...] }`;

/**
 * Run the Optimization agent.
 * Analyses live listings and proposes A/B experiments.
 * Auto-applies experiments with priority < 8.
 * Routes priority ≥ 8 experiments to human approval.
 */
export async function runOptimizationAgent(taskId: string): Promise<OptimizationOutput> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        // Get live listings with enough traffic
        const { data: listings } = await supabase
            .from('listings')
            .select(`
        id,
        product_id,
        platform,
        seo_title,
        url,
        views_total,
        conversion_rate,
        products (
          title,
          price_usd,
          niche
        )
      `)
            .eq('status', 'live')
            .gte('views_total', 50);

        if (!listings || listings.length === 0) {
            // No listings with enough traffic yet
            await completeTask(
                taskId,
                'optimization',
                { experiments: [], reason: 'No listings with 50+ views yet' },
                8, // High confidence — nothing to do
                { eligible_listings: 0 }
            );
            return { experiments: [] };
        }

        // Check for active experiments (max 1 per listing)
        const { data: activeExperiments } = await supabase
            .from('experiments')
            .select('listing_id')
            .eq('status', 'running');

        const activeListingIds = new Set(activeExperiments?.map((e) => e.listing_id) ?? []);

        // Check 7-day cooldown: listings with experiments completed in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentExperiments } = await supabase
            .from('experiments')
            .select('listing_id')
            .eq('status', 'complete')
            .gte('ended_at', sevenDaysAgo);

        const cooldownListingIds = new Set(recentExperiments?.map((e) => e.listing_id) ?? []);

        // Filter out listings with active experiments OR in cooldown period
        const eligibleListings = listings.filter(
            (l) => !activeListingIds.has(l.id) && !cooldownListingIds.has(l.id)
        );

        if (eligibleListings.length === 0) {
            await completeTask(
                taskId,
                'optimization',
                { experiments: [], reason: 'All eligible listings have active experiments or are in 7-day cooldown' },
                8,
                {
                    eligible_listings: 0,
                    active_experiments: activeListingIds.size,
                    in_cooldown: cooldownListingIds.size,
                }
            );
            return { experiments: [] };
        }

        // Call Gemini for experiment proposals
        const prompt = OPTIMIZATION_PROMPT.replace(
            '{listings}',
            JSON.stringify(eligibleListings, null, 2)
        );

        const result = await callGeminiJSON<OptimizationOutput>({
            prompt,
            system: OPTIMIZATION_SYSTEM_PROMPT,
            maxTokens: 4000,
            temperature: 0.6,
        });

        // Build a price lookup from eligible listings for ±20% cap
        const listingPrices = new Map<string, number>();
        for (const l of eligibleListings) {
            const product = l.products as unknown as { price_usd?: number } | null;
            if (product?.price_usd) {
                listingPrices.set(l.id, product.price_usd);
            }
        }

        // Process experiments
        const autoApplied: ExperimentProposal[] = [];
        const needsApproval: ExperimentProposal[] = [];
        const rejected: Array<{ experiment: ExperimentProposal; reason: string }> = [];

        for (const experiment of result.experiments) {
            // Enforce ±20% price cap for price experiments
            if (experiment.type === 'price') {
                const currentPrice = listingPrices.get(experiment.listing_id);
                const proposedPrice = Number(experiment.proposed_value);

                if (currentPrice && proposedPrice) {
                    const maxPrice = currentPrice * 1.2;
                    const minPrice = currentPrice * 0.8;

                    if (proposedPrice < minPrice || proposedPrice > maxPrice) {
                        rejected.push({
                            experiment,
                            reason: `Price change $${currentPrice} → $${proposedPrice} exceeds ±20% cap ($${minPrice.toFixed(2)}–$${maxPrice.toFixed(2)})`,
                        });
                        console.log(`[Optimization] Rejected: price outside ±20% range for listing ${experiment.listing_id}`);
                        continue;
                    }
                }
            }

            if (experiment.priority >= 8) {
                needsApproval.push(experiment);
            } else {
                autoApplied.push(experiment);

                // Record auto-applied experiment
                await supabase.from('experiments').insert({
                    listing_id: experiment.listing_id,
                    type: experiment.type,
                    control_value: experiment.current_value as Record<string, unknown>,
                    variant_value: experiment.proposed_value as Record<string, unknown>,
                    hypothesis: experiment.hypothesis,
                    status: 'running',
                    started_at: new Date().toISOString(),
                });
            }
        }

        // Route via completeTask
        const maxPriority = Math.max(
            ...result.experiments.map((e) => e.priority),
            0
        );

        await completeTask(
            taskId,
            'optimization',
            {
                experiments: result.experiments,
                auto_applied: autoApplied.length,
                needs_approval: needsApproval.length,
            },
            maxPriority > 0 ? Math.min(10 - maxPriority + 6, 10) : 8,
            {
                total_experiments: result.experiments.length,
                auto_applied: autoApplied.length,
                needs_approval: needsApproval.length,
                eligible_listings: eligibleListings.length,
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
