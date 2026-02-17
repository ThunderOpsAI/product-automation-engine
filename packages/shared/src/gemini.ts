import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

// ─────────────────────
// Gemini API Helper
// ─────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export interface GeminiCallOptions {
    prompt: string;
    context?: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface GeminiCallResult {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Call the Gemini API with retry logic.
 *
 * - Retries up to 3 times on 429 (rate limit) or 500 (server error)
 * - Uses exponential backoff between retries
 * - Model is configurable via GEMINI_MODEL env var (default: gemini-2.0-flash)
 */
export async function callGemini(options: GeminiCallOptions): Promise<GeminiCallResult> {
    const { prompt, context, system, maxTokens = 4000, temperature = 0.7 } = options;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const client = getClient();

    const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: system,
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
        },
    });

    const fullPrompt = context ? `${prompt}\n\nContext:\n${context}` : prompt;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result: GenerateContentResult = await model.generateContent(fullPrompt);
            const response = result.response;
            const text = response.text();

            return {
                content: text,
                usage: response.usageMetadata
                    ? {
                        promptTokens: response.usageMetadata.promptTokenCount ?? 0,
                        completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
                        totalTokens: response.usageMetadata.totalTokenCount ?? 0,
                    }
                    : undefined,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = lastError.message.toLowerCase();

            // Retry on rate limit (429) or server errors (500)
            const isRetryable =
                errorMessage.includes('429') ||
                errorMessage.includes('rate') ||
                errorMessage.includes('500') ||
                errorMessage.includes('internal');

            if (isRetryable && attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `[Gemini] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`
                );
                await sleep(delay);
                continue;
            }

            throw lastError;
        }
    }

    throw lastError ?? new Error('Gemini call failed after all retries');
}

/**
 * Call Gemini and parse the response as JSON.
 * Strips markdown code fences if present.
 */
export async function callGeminiJSON<T = unknown>(options: GeminiCallOptions): Promise<T> {
    const result = await callGemini(options);
    let content = result.content.trim();

    // Strip markdown code fences if present
    if (content.startsWith('```json')) {
        content = content.slice(7);
    } else if (content.startsWith('```')) {
        content = content.slice(3);
    }
    if (content.endsWith('```')) {
        content = content.slice(0, -3);
    }
    content = content.trim();

    try {
        return JSON.parse(content) as T;
    } catch {
        throw new Error(
            `Failed to parse Gemini response as JSON. Response starts with: "${content.slice(0, 100)}..."`
        );
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
