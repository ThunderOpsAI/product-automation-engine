import { callGeminiJSON, getSupabase, OpportunityBrief } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 1: MARKET INTELLIGENCE
// ═══════════════════════════════════════════
//
// Mission: Research trending digital product niches on Gumroad/Etsy.
// Output: OpportunityBrief[] ranked by (demand × price_potential) / competition
// Threshold: 7 (below → needs human approval)

const MARKET_INTEL_SYSTEM_PROMPT = `You are a digital product market researcher.
Your job is to identify profitable niches for digital products (templates, guides, toolkits, planners, checklists, etc.) that can be sold on Gumroad and Etsy.

Focus on:
- High demand, low competition niches
- Products that can be created from public domain or CC0 assets
- Niches where the audience actively searches and purchases
- Price points between $19 and $79 USD

AVOID:
- Oversaturated niches (Notion templates, generic productivity)
- Niches requiring deep expertise you cannot verify (medical, legal)

FOCUS ON UTILITY over aesthetics.

You MUST respond with valid JSON only. No markdown, no explanations outside the JSON.`;

const MARKET_INTEL_PROMPT = `Analyse marketplace data and identify 10 profitable product opportunities where:
- Demand exists (proven sales, reviews, search volume)
- Competition is manageable (not oversaturated)
- Products can be created from public domain / CC0 / licensed assets
- Price point is $19–79

For each niche, provide:
1. Specific niche name (e.g., "ADHD-friendly daily planners for remote workers")
2. category
3. confidence_score (1-10)
4. demand_signals: best_seller_count, avg_reviews, search_volume_estimate
5. competition: total_listings, saturation_level (low/medium/high)
6. pricing: suggested_price (USD), price_range [min, max]
7. positioning: one sentence on how to differentiate
8. evidence: top_performers array with url and sales_estimate

Rank by: (demand × price potential) / competition

AVOID:
- Oversaturated niches (Notion templates, generic productivity)
- Niches requiring deep expertise you cannot verify (medical, legal)

FOCUS ON UTILITY over aesthetics.

OUTPUT: Valid JSON array of OpportunityBrief objects only. No prose.

If confidence < 7 for ALL opportunities, set a top-level flag: { "needs_human_review": true, "opportunities": [...] }`;

/**
 * Run the MarketIntel agent.
 * Calls Gemini to research niches, evaluates each opportunity,
 * and routes via completeTask() based on confidence threshold.
 */
export async function runMarketIntelAgent(taskId: string): Promise<OpportunityBrief[]> {
    const supabase = getSupabase();

    // Update task status to running
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        // Call Gemini for market research
        const briefs = await callGeminiJSON<OpportunityBrief[]>({
            prompt: MARKET_INTEL_PROMPT,
            system: MARKET_INTEL_SYSTEM_PROMPT,
            maxTokens: 4000,
            temperature: 0.8,
        });

        // Validate and score each brief
        const validBriefs = briefs.filter(
            (b) => b.niche && b.confidence_score >= 1 && b.confidence_score <= 10
        );

        if (validBriefs.length === 0) {
            throw new Error('No valid opportunity briefs returned from Gemini');
        }

        // Find the highest confidence score across all briefs
        const maxConfidence = Math.max(...validBriefs.map((b) => b.confidence_score));

        // Complete the task — routes to approval if below threshold
        await completeTask(
            taskId,
            'market_intel',
            { briefs: validBriefs },
            maxConfidence,
            {
                total_briefs: validBriefs.length,
                avg_confidence:
                    validBriefs.reduce((sum, b) => sum + b.confidence_score, 0) / validBriefs.length,
                highest_confidence: maxConfidence,
            }
        );

        return validBriefs;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await supabase
            .from('tasks')
            .update({
                status: 'failed',
                error_message: message,
                completed_at: new Date().toISOString(),
            })
            .eq('id', taskId);

        throw error;
    }
}
