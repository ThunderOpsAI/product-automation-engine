import { callGeminiJSON, getSupabase, BrandingOutput, generateCoverImage, generateThumbnails } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 4: BRAND & PACKAGING
// ═══════════════════════════════════════════
//
// Mission: Create visuals, copy, and SEO optimisation for products.
// Output: BrandingOutput (cover image, thumbnails, description, tags, FAQ)
// Threshold: 7

const BRANDING_SYSTEM_PROMPT = `You are a digital product branding and copywriting specialist.
Your job is to create compelling marketplace listings that convert browsers into buyers.

SEO Title Formula: [Primary Keyword] + [Niche Modifier] + [Value Word]
Example: "Ultimate Budget Planner | Personal Finance Template | Instant Download"

Description principles:
- Lead with the OUTCOME, not features
- Use benefit-focused bullet points
- Include social proof language ("thousands of downloads", "bestseller in category")
- End with a strong call to action
- Format in HTML for marketplace compatibility

Copy structure:
1. Hook — one-line outcome statement
2. Who it's for — target persona
3. What's inside — bullet list of key contents
4. Why it's different — unique positioning
5. FAQ — answer top 5 buyer objections

Tag strategy:
- 5-13 tags per listing
- Mix of broad category tags and specific long-tail tags
- Include seasonal/trending variations where relevant

Write in Australian English (colour, organise, optimise, etc.).

You MUST respond with valid JSON only.`;

const BRANDING_PROMPT = `Create marketplace branding for this digital product:

PRODUCT TITLE: {title}
NICHE: {niche}
DESCRIPTION: {description}
PRICE: ${'{price}'} USD

Provide:
1. product_description: HTML-formatted marketplace description (outcome-focused, buyer objections addressed)
2. seo_title: optimised title following the formula [keyword] + [modifier] + [value word]
3. tags: 5-13 marketplace tags
4. faq: 5 buyer objections as {question, answer} pairs
5. cover_image_prompt: describe the ideal cover image (1600x900) for generation
6. thumbnail_prompt: describe the ideal thumbnail style (400x400) for generation

For cover_image_prompt and thumbnail_prompt, provide detailed text prompts for AI image generation.
Set cover_image and thumbnails to empty strings for now — they'll be populated after image generation.

Respond with JSON matching the BrandingOutput interface.`;

/**
 * Run the Branding agent.
 * Creates SEO-optimised copy, product descriptions, tags, and generates images via Replicate.
 */
export async function runBrandingAgent(
    taskId: string,
    productId: string,
    title: string,
    niche: string,
    description: string,
    price: number
): Promise<BrandingOutput> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        const prompt = BRANDING_PROMPT
            .replace('{title}', title)
            .replace('{niche}', niche)
            .replace('{description}', description)
            .replace('{price}', String(price));

        const branding = await callGeminiJSON<BrandingOutput & {
            cover_image_prompt?: string;
            thumbnail_prompt?: string;
        }>({
            prompt,
            system: BRANDING_SYSTEM_PROMPT,
            maxTokens: 5000,
            temperature: 0.7,
        });

        // Validate required fields
        if (!branding.seo_title || !branding.product_description) {
            throw new Error('Branding must include seo_title and product_description');
        }

        if (!branding.tags || branding.tags.length < 5) {
            throw new Error('Branding must include at least 5 tags');
        }

        // Generate cover image via Replicate (1600×900)
        const coverImagePrompt = branding.cover_image_prompt
            ?? `Professional product cover for ${niche}: ${title}`;
        const coverImage = await generateCoverImage(coverImagePrompt);
        branding.cover_image = coverImage.url;

        // Generate thumbnails via Replicate (3 × 400×400)
        const thumbnailPrompt = branding.thumbnail_prompt
            ?? `Product thumbnail for ${niche}: ${title}`;
        const thumbnails = await generateThumbnails(thumbnailPrompt, 3);
        branding.thumbnails = thumbnails.map((t) => t.url);

        // Score the branding output
        const score = scoreBrandingOutput(branding);

        await completeTask(
            taskId,
            'branding',
            {
                branding,
                product_id: productId,
            },
            score,
            {
                tag_count: branding.tags.length,
                faq_count: branding.faq?.length ?? 0,
                description_length: branding.product_description.length,
                cover_image_generated: !!branding.cover_image,
                thumbnails_generated: branding.thumbnails.length,
            }
        );

        return branding;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
            .eq('id', taskId);
        throw error;
    }
}

/**
 * Score branding output quality based on completeness and content quality.
 */
function scoreBrandingOutput(branding: BrandingOutput): number {
    let score = 5; // base score

    // SEO title quality
    if (branding.seo_title.includes('|') || branding.seo_title.includes('—')) score += 1;
    if (branding.seo_title.length >= 30 && branding.seo_title.length <= 80) score += 1;

    // Tag quantity
    if (branding.tags.length >= 8) score += 1;

    // FAQ completeness
    if (branding.faq && branding.faq.length >= 5) score += 1;

    // Description length (rich descriptions convert better)
    if (branding.product_description.length >= 500) score += 1;

    return Math.min(score, 10);
}
