import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client singleton.
 * Uses SUPABASE_SERVICE_KEY for server-side operations (bypasses RLS).
 * Falls back to SUPABASE_ANON_KEY if service key is not set.
 */
export function getSupabase(): SupabaseClient {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error(
                'SUPABASE_URL and either SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY are required'
            );
        }

        supabaseClient = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return supabaseClient;
}

/**
 * Reset the Supabase client (useful for testing).
 */
export function resetSupabase(): void {
    supabaseClient = null;
}
