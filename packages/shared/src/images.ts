import { getSupabase } from './supabase.js';

// ═══════════════════════════════════════════
// IMAGE GENERATION HELPER — Replicate API
// ═══════════════════════════════════════════

interface ImageGenerationParams {
    prompt: string;
    width?: number;
    height?: number;
    num_outputs?: number;
}

interface GeneratedImage {
    url: string;
    storagePath: string;
}

/**
 * Generate images via Replicate API (Stable Diffusion).
 * Falls back to placeholder URLs if REPLICATE_API_TOKEN is not set (dev mode).
 *
 * After generation, uploads images to Supabase Storage and returns storage paths.
 */
export async function generateImages(
    params: ImageGenerationParams
): Promise<GeneratedImage[]> {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    const supabase = getSupabase();

    if (!apiToken) {
        console.log('[ImageGen] STUB (no REPLICATE_API_TOKEN): Would generate image:', params.prompt);
        const stubs: GeneratedImage[] = [];
        const count = params.num_outputs ?? 1;
        for (let i = 0; i < count; i++) {
            stubs.push({
                url: `https://placehold.co/${params.width ?? 1600}x${params.height ?? 900}/2d3436/ffffff?text=Product+Image+${i + 1}`,
                storagePath: `product-images/stub-${Date.now()}-${i}.png`,
            });
        }
        return stubs;
    }

    try {
        // Start prediction on Replicate
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Stable Diffusion XL
                version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
                input: {
                    prompt: params.prompt,
                    width: params.width ?? 1600,
                    height: params.height ?? 900,
                    num_outputs: params.num_outputs ?? 1,
                    guidance_scale: 7.5,
                    num_inference_steps: 25,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Replicate API error: ${error}`);
        }

        const prediction = await response.json() as { id: string; urls: { get: string } };

        // Poll for completion
        let result: { status: string; output?: string[] } | null = null;
        for (let i = 0; i < 60; i++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const pollResponse = await fetch(prediction.urls.get, {
                headers: { 'Authorization': `Bearer ${apiToken}` },
            });
            result = await pollResponse.json() as { status: string; output?: string[] };

            if (result.status === 'succeeded') break;
            if (result.status === 'failed') throw new Error('Image generation failed');
        }

        if (!result?.output || result.output.length === 0) {
            throw new Error('No images generated');
        }

        // Upload generated images to Supabase Storage
        const images: GeneratedImage[] = [];

        for (let i = 0; i < result.output.length; i++) {
            const imageUrl = result.output[i];
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();

            const storagePath = `product-images/${Date.now()}-${i}.png`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(storagePath, imageBuffer, {
                    contentType: 'image/png',
                    upsert: false,
                });

            if (uploadError) {
                console.error(`[ImageGen] Storage upload failed for image ${i}:`, uploadError);
                // Fall back to the raw URL from Replicate
                images.push({ url: imageUrl, storagePath: '' });
                continue;
            }

            const { data: publicUrl } = supabase.storage
                .from('assets')
                .getPublicUrl(storagePath);

            images.push({
                url: publicUrl.publicUrl,
                storagePath,
            });
        }

        console.log(`[ImageGen] Generated ${images.length} images`);
        return images;
    } catch (error) {
        console.error('[ImageGen] Failed:', error);
        throw error;
    }
}

/**
 * Generate a product cover image (1600×900).
 */
export async function generateCoverImage(prompt: string): Promise<GeneratedImage> {
    const images = await generateImages({
        prompt: `Professional product cover image, clean design, marketplace-ready: ${prompt}`,
        width: 1600,
        height: 900,
        num_outputs: 1,
    });
    return images[0];
}

/**
 * Generate product thumbnails (400×400).
 */
export async function generateThumbnails(
    prompt: string,
    count: number = 3
): Promise<GeneratedImage[]> {
    return generateImages({
        prompt: `Product thumbnail, clean square design, marketplace-ready: ${prompt}`,
        width: 400,
        height: 400,
        num_outputs: count,
    });
}
