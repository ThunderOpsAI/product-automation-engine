// ═══════════════════════════════════════════
// SYSTEM 1: DIGITAL ARBITRAGE FACTORY — TYPES
// ═══════════════════════════════════════════

// ─────────────────────
// Agent Output Interfaces
// ─────────────────────

export interface OpportunityBrief {
    niche: string;
    category: string;
    confidence_score: number; // 1–10
    demand_signals: {
        best_seller_count: number;
        avg_reviews: number;
        search_volume_estimate: string;
    };
    competition: {
        total_listings: number;
        saturation_level: 'low' | 'medium' | 'high';
    };
    pricing: {
        suggested_price: number;
        price_range: [number, number];
    };
    positioning: string;
    evidence: {
        top_performers: Array<{ url: string; sales_estimate: number }>;
    };
}

export interface SourceItem {
    type: 'public_domain' | 'cc0' | 'purchased' | 'original';
    url?: string;
    license: string; // must include license URL or identifier
    files: string[]; // paths in Supabase storage
    quality_score: number; // 1–10
}

export interface SourcePack {
    sources: SourceItem[];
    compliance_notes: string;
    confidence_score: number;
}

export interface ProductVariant {
    name: 'Beginner' | 'Pro' | 'Complete';
    files: string[];
    suggested_price: number;
}

export interface EnhancedProduct {
    files: string[];
    variants: ProductVariant[];
    documentation: {
        readme: string;
        quick_start: string;
        faq: string;
    };
    quality_score: number; // must be 8+ to proceed autonomously
}

export interface BrandingOutput {
    cover_image: string; // URL in Supabase Storage
    thumbnails: string[]; // Multiple sizes
    product_description: string; // HTML formatted for marketplace
    seo_title: string; // Primary keyword + modifier + value word
    tags: string[]; // 5–13 tags
    faq: Array<{ question: string; answer: string }>;
}

export interface ExperimentProposal {
    listing_id: string;
    type: 'price' | 'title' | 'thumbnail';
    current_value: unknown;
    proposed_value: unknown;
    hypothesis: string;
    expected_lift_pct: number;
    priority: number; // 1–10, higher = more impactful but riskier
    data_points: number; // traffic volume used for decision
}

export interface OptimizationOutput {
    experiments: ExperimentProposal[];
}

export interface SupportOutput {
    action: 'auto_respond' | 'refund' | 'escalate';
    response?: string; // sent to customer if auto_respond
    refund_amount?: number;
    escalation_reason?: string;
    escalation_priority: 'low' | 'medium' | 'high';
}

// ─────────────────────
// Task System
// ─────────────────────

export type AgentType =
    | 'market_intel'
    | 'asset_sourcing'
    | 'enhancement'
    | 'branding'
    | 'listing'
    | 'optimization'
    | 'support_triage';

export type TaskStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'needs_approval'
    | 'failed';

export interface TaskInput {
    type: AgentType;
    priority?: number; // 1–10, default 5
    input: Record<string, unknown>;
}

export interface TaskOutput {
    status: TaskStatus;
    output?: unknown;
}

// Per-agent confidence thresholds
export const AGENT_THRESHOLDS: Record<AgentType, number> = {
    market_intel: 7,
    asset_sourcing: 7,
    enhancement: 8,
    branding: 7,
    listing: 8,
    optimization: 6,
    support_triage: 6,
};

// ─────────────────────
// Database Row Types
// ─────────────────────

export interface ProductRow {
    id: string;
    niche: string;
    title: string;
    description: string | null;
    price_usd: number | null;
    status: 'draft' | 'pending_approval' | 'approved' | 'listed' | 'paused' | 'removed';
    confidence_score: number | null;
    source_type: 'public_domain' | 'cc0' | 'purchased' | 'original' | null;
    license_notes: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
}

export interface ProductVersionRow {
    id: string;
    product_id: string;
    version: number;
    artifacts_path: string | null;
    changelog: string | null;
    quality_score: number | null;
    created_at: string;
}

export interface ListingRow {
    id: string;
    product_id: string;
    platform: 'gumroad' | 'etsy';
    platform_listing_id: string | null;
    url: string | null;
    tags: string[] | null;
    seo_title: string | null;
    thumbnail_url: string | null;
    status: 'live' | 'paused' | 'removed' | null;
    views_total: number;
    conversion_rate: number | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
}

export interface SaleRow {
    id: string;
    listing_id: string;
    platform: string | null;
    platform_sale_id: string | null;
    customer_email: string | null;
    amount_gross: number | null;
    platform_fee: number | null;
    amount_net: number | null;
    sale_date: string | null;
    refunded: boolean;
    refund_date: string | null;
    metadata: Record<string, unknown> | null;
}

export interface ExperimentRow {
    id: string;
    listing_id: string;
    type: 'price' | 'title' | 'thumbnail' | null;
    control_value: unknown;
    variant_value: unknown;
    hypothesis: string | null;
    status: 'proposed' | 'running' | 'complete' | 'rejected';
    started_at: string | null;
    ended_at: string | null;
    result_lift_pct: number | null;
    result_winner: 'control' | 'variant' | null;
    created_at: string;
}

export interface SupportTicketRow {
    id: string;
    sale_id: string | null;
    platform: string | null;
    customer_email: string | null;
    message: string | null;
    action_taken: 'auto_respond' | 'refund' | 'escalate' | null;
    response_sent: string | null;
    escalation_reason: string | null;
    escalation_priority: 'low' | 'medium' | 'high' | null;
    resolved: boolean;
    created_at: string;
}

export interface TaskRow {
    id: string;
    type: string;
    status: TaskStatus;
    priority: number;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    evidence: Record<string, unknown> | null;
    confidence_score: number | null;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface ApprovalQueueRow {
    id: string;
    task_id: string;
    system: string | null;
    reason: string | null;
    context: Record<string, unknown> | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_at: string | null;
    reviewed_by: string | null;
}

export interface MetricsDailyRow {
    date: string;
    system: string;
    revenue_gross: number;
    revenue_net: number;
    units_sold: number;
    metadata: Record<string, unknown> | null;
}

// ─────────────────────
// Rate Limits
// ─────────────────────

export const RATE_LIMITS = {
    gemini_api: 50, // requests per minute
    gumroad_api: 100, // per hour
    etsy_api: 40, // per hour (Etsy is strict)
    image_generation: 20, // per hour
    email_sending: 50, // per day (conservative start)
} as const;

// ─────────────────────
// Approved Source Domains
// ─────────────────────

export const APPROVED_SOURCES = [
    'archive.org',
    'commons.wikimedia.org',
    'github.com',
    'gutenberg.org',
    'data.gov',
    'nasa.gov',
] as const;
