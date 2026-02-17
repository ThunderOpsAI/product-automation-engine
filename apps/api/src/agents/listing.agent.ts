import { getSupabase, BrandingOutput } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 5: LISTING
// ═══════════════════════════════════════════
//
// Mission: Publish products to Gumroad and Etsy.
// Output: Live listings with platform IDs
// Threshold: 8 (must not list low-quality products)
// Key: Idempotent — won't duplicate existing listings

/**
 * Pre-listing validation checklist.
 * All checks must pass before we create a listing.
 */
function validateListingReadiness(params: {
    productId: string;
    title: string;
    description: string;
    price: number;
    branding: BrandingOutput;
}): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!params.title || params.title.length < 10) {
        issues.push('Title too short (minimum 10 characters)');
    }

    if (!params.description || params.description.length < 100) {
        issues.push('Description too short (minimum 100 characters)');
    }

    if (params.price < 9 || params.price > 149) {
        issues.push(`Price $${params.price} outside valid range ($9–$149)`);
    }

    if (!params.branding.seo_title) {
        issues.push('Missing SEO title');
    }

    // Platform-specific SEO title character limits (spec requirement)
    if (params.branding.seo_title) {
        if (params.branding.seo_title.length > 255) {
            issues.push(`SEO title exceeds Gumroad limit (${params.branding.seo_title.length}/255 chars)`);
        }
        if (params.branding.seo_title.length > 140) {
            issues.push(`SEO title exceeds Etsy limit (${params.branding.seo_title.length}/140 chars) — will be truncated on Etsy`);
        }
    }

    if (!params.branding.tags || params.branding.tags.length < 5) {
        issues.push('Insufficient tags (minimum 5)');
    }

    // Etsy max 13 tags
    if (params.branding.tags && params.branding.tags.length > 13) {
        issues.push(`Too many tags for Etsy (${params.branding.tags.length}/13 max) — excess tags will be trimmed`);
    }

    if (!params.branding.product_description) {
        issues.push('Missing product description');
    }

    // Cover image must exist (spec: cover image URL resolves)
    if (!params.branding.cover_image) {
        issues.push('Missing cover image — must be generated before listing');
    }

    return { ready: issues.length === 0, issues };
}

/**
 * Stub: Create listing on Gumroad.
 * Replace with actual Gumroad API call once account is set up.
 */
async function createGumroadListing(params: {
    title: string;
    description: string;
    price: number;
    tags: string[];
}): Promise<{ id: string; url: string }> {
    // TODO: Replace with actual Gumroad API call
    // const response = await fetch('https://api.gumroad.com/v2/products', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.GUMROAD_ACCESS_TOKEN}` },
    //   body: JSON.stringify({ name: params.title, ... })
    // });

    console.log('[Listing Agent] STUB: Would create Gumroad listing:', params.title);
    return {
        id: `gumroad_stub_${Date.now()}`,
        url: `https://youraccount.gumroad.com/l/stub-${Date.now()}`,
    };
}

/**
 * Stub: Create listing on Etsy.
 * Replace with actual Etsy API call once account is set up.
 */
async function createEtsyListing(params: {
    title: string;
    description: string;
    price: number;
    tags: string[];
}): Promise<{ id: string; url: string }> {
    // TODO: Replace with actual Etsy API call

    console.log('[Listing Agent] STUB: Would create Etsy listing:', params.title);
    return {
        id: `etsy_stub_${Date.now()}`,
        url: `https://www.etsy.com/listing/stub-${Date.now()}`,
    };
}

/**
 * Run the Listing agent.
 * Creates listings on Gumroad and Etsy for an approved product.
 * Idempotent: checks for existing listings before creating new ones.
 */
export async function runListingAgent(
    taskId: string,
    productId: string,
    title: string,
    description: string,
    price: number,
    branding: BrandingOutput
): Promise<{ listings: Array<{ platform: string; id: string; url: string }> }> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        // Pre-listing validation
        const validation = validateListingReadiness({
            productId,
            title: branding.seo_title || title,
            description: branding.product_description || description,
            price,
            branding,
        });

        if (!validation.ready) {
            await completeTask(
                taskId,
                'listing',
                { validation_failed: true, issues: validation.issues },
                3, // Low confidence — force human review
                { issues: validation.issues }
            );
            return { listings: [] };
        }

        // Check for existing listings (idempotency)
        const { data: existingListings } = await supabase
            .from('listings')
            .select('platform, platform_listing_id')
            .eq('product_id', productId)
            .in('status', ['live', 'paused']);

        const existingPlatforms = new Set(existingListings?.map((l) => l.platform) ?? []);
        const newListings: Array<{ platform: string; id: string; url: string }> = [];

        // Create Gumroad listing if not exists
        if (!existingPlatforms.has('gumroad')) {
            const gumroad = await createGumroadListing({
                title: branding.seo_title || title,
                description: branding.product_description || description,
                price,
                tags: branding.tags,
            });

            await supabase.from('listings').insert({
                product_id: productId,
                platform: 'gumroad',
                platform_listing_id: gumroad.id,
                url: gumroad.url,
                tags: branding.tags,
                seo_title: branding.seo_title,
                thumbnail_url: branding.cover_image,
                status: 'live',
                views_total: 0,
            });

            newListings.push({ platform: 'gumroad', ...gumroad });
        }

        // Create Etsy listing if not exists
        if (!existingPlatforms.has('etsy')) {
            const etsy = await createEtsyListing({
                title: branding.seo_title || title,
                description: branding.product_description || description,
                price,
                tags: branding.tags,
            });

            await supabase.from('listings').insert({
                product_id: productId,
                platform: 'etsy',
                platform_listing_id: etsy.id,
                url: etsy.url,
                tags: branding.tags,
                seo_title: branding.seo_title,
                thumbnail_url: branding.cover_image,
                status: 'live',
                views_total: 0,
            });

            newListings.push({ platform: 'etsy', ...etsy });
        }

        // Update product status
        await supabase
            .from('products')
            .update({ status: 'listed' })
            .eq('id', productId);

        const confidence = newListings.length > 0 ? 9 : 8;

        await completeTask(
            taskId,
            'listing',
            { listings: newListings, skipped_existing: existingPlatforms.size },
            confidence,
            {
                new_listings: newListings.length,
                existing_listings: existingPlatforms.size,
                platforms: newListings.map((l) => l.platform),
            }
        );

        return { listings: newListings };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
            .eq('id', taskId);
        throw error;
    }
}
