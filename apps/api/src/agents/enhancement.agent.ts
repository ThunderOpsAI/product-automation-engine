import { callGeminiJSON, getSupabase, EnhancedProduct, SourcePack } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 3: ENHANCEMENT
// ═══════════════════════════════════════════
//
// Mission: Transform raw assets into premium digital products.
// Output: EnhancedProduct with 3-tier variants (Beginner/Pro/Complete)
// Threshold: 8 (higher bar — quality directly affects sales + refunds)

const ENHANCEMENT_SYSTEM_PROMPT = `You are a digital product enhancement specialist.
Your job is to transform raw public domain or CC0 assets into premium, polished digital products.

For each product, create 3 tiers:
- Beginner ($9-19): Core content only, simple formatting
- Pro ($29-59): Enhanced with examples, templates, and guides
- Complete ($79-149): Everything in Pro plus advanced materials, bonus content, and premium formatting

Quality standards:
- Professional formatting and layout
- Clear, actionable content
- Worked examples where applicable
- Table of contents and navigation
- Consistent branding throughout

You MUST respond with valid JSON only.`;

const ENHANCEMENT_PROMPT = `Transform these raw assets into a premium digital product:

NICHE: {niche}
SOURCE MATERIALS: {sources}

Create an enhanced product with:
1. files: list of output files to create
2. variants: 3 tiers (Beginner, Pro, Complete) with files and suggested_price
3. documentation:
   - readme: product overview and what's included
   - quick_start: 3-step getting started guide
   - faq: 5 common questions and answers
4. quality_score: 1-10 self-assessment of output quality

Quality criteria:
- Score 8+: Professional quality, ready for marketplace
- Score 6-7: Needs improvement before listing
- Score <6: Major issues, reject and retry

Respond with JSON matching the EnhancedProduct interface.`;

/**
 * Run the Enhancement agent.
 * Takes sourced assets, calls Gemini to enhance into a premium product,
 * and routes via completeTask() — requires confidence ≥ 8 to auto-proceed.
 */
export async function runEnhancementAgent(
    taskId: string,
    niche: string,
    sourcePack: SourcePack
): Promise<EnhancedProduct> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        const prompt = ENHANCEMENT_PROMPT
            .replace('{niche}', niche)
            .replace('{sources}', JSON.stringify(sourcePack.sources, null, 2));

        const product = await callGeminiJSON<EnhancedProduct>({
            prompt,
            system: ENHANCEMENT_SYSTEM_PROMPT,
            maxTokens: 6000,
            temperature: 0.6,
        });

        // Validate the product has required structure
        if (!product.variants || product.variants.length !== 3) {
            throw new Error('Enhancement must produce exactly 3 variants (Beginner/Pro/Complete)');
        }

        if (!product.documentation?.readme || !product.documentation?.quick_start) {
            throw new Error('Enhancement must include readme and quick_start documentation');
        }

        // Create product record in DB
        const { data: productRecord } = await supabase
            .from('products')
            .insert({
                niche,
                title: `${niche} — Complete Bundle`,
                description: product.documentation.readme,
                price_usd: product.variants.find((v) => v.name === 'Pro')?.suggested_price ?? 39,
                status: product.quality_score >= 8 ? 'approved' : 'pending_approval',
                confidence_score: product.quality_score,
                source_type: sourcePack.sources[0]?.type ?? 'public_domain',
                license_notes: sourcePack.compliance_notes,
            })
            .select('id')
            .single();

        // Log version history in product_versions table (spec requirement)
        if (productRecord?.id) {
            await supabase.from('product_versions').insert({
                product_id: productRecord.id,
                version: 1,
                artifacts_path: product.files.join(', '),
                changelog: 'Initial enhancement from source materials',
                quality_score: product.quality_score,
            });
        }

        await completeTask(
            taskId,
            'enhancement',
            {
                product,
                product_id: productRecord?.id,
            },
            product.quality_score,
            {
                variant_count: product.variants.length,
                has_documentation: true,
                quality_score: product.quality_score,
            }
        );

        return product;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
            .eq('id', taskId);
        throw error;
    }
}
