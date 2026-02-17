# SYSTEM 1: DIGITAL ARBITRAGE FACTORY
## Complete Build Specification

> **Goal:** $1,000–3,000/month automated revenue by Month 2  
> **Stack:** TypeScript · Supabase · Vercel/Railway · GitHub Actions · Gemini API  
> **Human time:** 30 min/day (approvals only)  
> **Budget (System 1 slice):** ~$200–450/mo running costs + $200–400 one-time ads

---

## WHAT THIS SYSTEM DOES

System 1 is a fully automated pipeline that:
1. Researches trending digital product niches on Gumroad and Etsy
2. Finds legal, licensable source materials (public domain, CC0)
3. Enhances raw assets into premium, polished products
4. Creates marketplace-ready cover images, SEO copy, and tags
5. Lists products on Gumroad and Etsy
6. Continuously A/B tests pricing, titles, thumbnails
7. Handles customer support and refunds without human input

The operator only approves niche selections (once, ~30 min) and reviews low-confidence products (<8/10) before they go live.

---

## REVENUE MODEL

```
Acquisition (public domain / CC0 assets)
        ↓
Enhancement (Gemini + formatting tools)
        ↓
Distribution (Gumroad + Etsy listings)
        ↓
Optimization (A/B testing weekly)

Revenue tiers:
  Low ticket:  $9–19   (volume, email capture, upsell funnel)
  Mid ticket:  $29–59  (primary revenue driver)
  Bundle:      $79–149 (upsell to existing buyers)

Target math (Month 2):
  10 SKUs × $19 avg × 6 sales/day = $3,420/mo gross
  After 30% Gumroad fees + ~5% refunds = ~$2,400/mo net
```

---

## AGENT ARCHITECTURE

Seven agents form the complete pipeline. Each outputs a `confidence_score` (1–10). Anything below the threshold for that agent auto-routes to the human approval queue.

```
[1. MarketIntel]  ──→  [2. AssetSourcing]  ──→  [3. Enhancement]
                                                        ↓
[7. SupportTriage] ←──  [6. Optimization]  ←──  [4. Brand&Packaging]
        ↑                       ↑                      ↓
   (always on)           (weekly cron)           [5. Listing]
```

### Agent 1: MarketIntel
- **Trigger:** Daily cron (6am) or on-demand
- **Input:** Scraped Gumroad + Etsy marketplace data, demand signals
- **Output:** `OpportunityBrief[]` — 10 ranked niches
- **Threshold:** confidence ≥ 7, else full set queued for human
- **Ranking formula:** `(demand × price_potential) / competition`

```typescript
interface OpportunityBrief {
  niche: string;
  category: string;
  confidence_score: number;       // 1–10
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
```

**Gemini prompt:**
```
You are a digital product market researcher.

Analyze the marketplace data provided and identify 10 profitable product opportunities where:
- Demand exists (proven sales, reviews, search volume)
- Competition is manageable (not oversaturated)
- Products can be created from public domain / CC0 / licensed assets
- Price point is $19–79

For each niche provide:
1. Specific niche name (e.g., "ADHD-friendly daily planners for remote workers")
2. Confidence score (1–10)
3. Demand signals (quantified)
4. Competition analysis
5. Suggested positioning
6. Evidence (top performers with estimated sales)

Rank by: (demand × price potential) / competition

AVOID:
- Oversaturated niches (Notion templates, generic productivity)
- Niches requiring deep expertise you cannot verify (medical, legal)

FOCUS ON UTILITY over aesthetics.

OUTPUT: Valid JSON array of OpportunityBrief objects only. No prose.

If confidence < 7 for ALL opportunities, set a top-level flag: { "needs_human_review": true, "opportunities": [...] }
```

---

### Agent 2: AssetSourcing
- **Trigger:** After niche approved by operator
- **Input:** Approved `OpportunityBrief`
- **Output:** `SourcePack`
- **Threshold:** confidence ≥ 7, else queue for compliance review
- **Hard rule:** NEVER use copyrighted materials without a verified, documented license

```typescript
interface SourcePack {
  sources: Array<{
    type: 'public_domain' | 'cc0' | 'purchased' | 'original';
    url?: string;
    license: string;       // must include license URL or identifier
    files: string[];       // paths in Supabase storage
    quality_score: number; // 1–10
  }>;
  compliance_notes: string;
  confidence_score: number;
}
```

**Approved sources (in priority order):**
1. `archive.org` — public domain texts, documents, datasets
2. `commons.wikimedia.org` — CC0 images, diagrams, illustrations
3. `github.com` — open source repos with permissive licenses
4. Operator's own purchased asset libraries
5. AI-generated original content (DALL-E / Gemini output = operator-owned)

---

### Agent 3: Enhancement
- **Trigger:** After AssetSourcing completes
- **Input:** `SourcePack`
- **Output:** `EnhancedProduct`
- **Threshold:** quality_score ≥ 8, else queue for human review BEFORE passing to branding

```typescript
interface EnhancedProduct {
  files: string[];
  variants: Array<{
    name: 'Beginner' | 'Pro' | 'Complete';
    files: string[];
    suggested_price: number;
  }>;
  documentation: {
    readme: string;
    quick_start: string;
    faq: string;
  };
  quality_score: number; // must be 8+ to proceed autonomously
}
```

**Enhancement tasks (in order):**
1. Reformat and clean layout/typography
2. Add niche-specific worked examples
3. Write annotations and explanatory commentary
4. Create a beginner guide (reduces refunds)
5. Package into 3 variant tiers (Beginner / Pro / Complete)
6. Write README, Quick Start, and FAQ

**Variant pricing:**
| Tier | Contents | Price range |
|------|----------|-------------|
| Beginner | Core product only | $9–19 |
| Pro | Full product + advanced content | $29–59 |
| Complete | Everything + bonus resources | $79–149 |

---

### Agent 4: Brand & Packaging
- **Trigger:** After Enhancement passes quality gate
- **Input:** `EnhancedProduct` + niche context
- **Output:** `BrandingOutput`
- **Threshold:** inherits Enhancement quality gate (8+)

```typescript
interface BrandingOutput {
  cover_image: string;           // URL in Supabase Storage
  thumbnails: string[];          // Multiple sizes
  product_description: string;   // HTML formatted for marketplace
  seo_title: string;             // Primary keyword + modifier + value word
  tags: string[];                // 5–13 tags
  faq: Array<{ question: string; answer: string }>;
}
```

**Copy principles:**
- Outcome-focused, not feature-focused ("Save 3 hours/week" not "Includes 47 templates")
- Specific numbers outperform vague claims
- Address top 5 objections in FAQ
- HTML-formatted for Gumroad/Etsy rich text

**SEO title formula:**
```
[Primary keyword] + [Niche modifier] + [Value word]
Examples:
  "Freelance Contract Templates — 12 Editable Legal Documents for Designers"
  "ADHD Daily Planner Printable — Focus System for Remote Workers"
```

**Image generation:**
- Tool: Replicate (Stable Diffusion) or DALL-E API
- Style: Clean, professional, product-mock-up style
- Output: 1 cover (1600×900) + 3 thumbnails (400×400)
- Budget: ~$0.04–0.08 per product set

---

### Agent 5: Listing
- **Trigger:** After BrandingOutput completed
- **Input:** `EnhancedProduct` + `BrandingOutput`
- **Output:** Live marketplace listing(s)
- **Threshold:** Product confidence ≥ 8 required before listing

```typescript
// Gumroad
async function createGumroadListing(product: Product, branding: BrandingOutput) {
  const listing = await gumroadAPI.products.create({
    name: branding.seo_title,
    description: branding.product_description,
    price: product.price * 100,  // Gumroad uses cents
    file_url: await getProductDownloadUrl(product.id),
    cover_image_url: branding.cover_image,
    tags: branding.tags.join(',')
  });

  await db.listings.insert({
    product_id: product.id,
    platform: 'gumroad',
    platform_listing_id: listing.id,
    url: listing.share_url,
    status: 'live'
  });
}

// Etsy (list same product on second platform)
async function createEtsyListing(product: Product, branding: BrandingOutput) {
  const listing = await etsyAPI.listings.create({
    title: branding.seo_title,
    description: htmlToText(branding.product_description),
    price: { amount: product.price * 100, divisor: 100, currency_code: 'USD' },
    quantity: 999,
    taxonomy_id: DIGITAL_DOWNLOADS_TAXONOMY_ID,
    tags: branding.tags.slice(0, 13),  // Etsy max 13 tags
    type: 'download',
    digital_link_id: await uploadEtsyDigitalFile(product.id)
  });

  await db.listings.insert({
    product_id: product.id,
    platform: 'etsy',
    platform_listing_id: String(listing.listing_id),
    url: listing.url,
    status: 'live'
  });
}
```

**Pre-listing checklist (automated):**
- [ ] Product file URL resolves (200 status)
- [ ] Cover image URL resolves
- [ ] SEO title within platform limits (Gumroad: 255 chars, Etsy: 140 chars)
- [ ] HTML description renders correctly
- [ ] Price set in correct format
- [ ] Tags within platform limits
- [ ] License/compliance notes stored in DB

---

### Agent 6: Optimization
- **Trigger:** Weekly cron (Monday 7am)
- **Input:** All live listing performance data (views, conversion, revenue)
- **Output:** `OptimizationOutput`
- **Threshold:** experiments with priority < 8 auto-apply; ≥ 8 queued for approval

```typescript
interface OptimizationOutput {
  experiments: Array<{
    listing_id: string;
    type: 'price' | 'title' | 'thumbnail';
    current_value: any;
    proposed_value: any;
    hypothesis: string;
    expected_lift_pct: number;
    priority: number;       // 1–10
    data_points: number;    // traffic volume used for decision
  }>;
}
```

**Decision rules:**
- Minimum 50 views before any experiment runs (insufficient data otherwise)
- Conversion benchmark: >0.5% = hold, <0.5% = test
- Only 1 experiment per listing at a time
- Minimum 7 days per experiment before switching
- Price test range: ±20% of current price
- All changes logged with before/after data for learning

**Gemini prompt for experiment generation:**
```
You are a conversion rate optimizer for digital products.

Given this listing performance data: {listing_data}
And this competitor landscape: {competitor_data}

Propose up to 3 A/B experiments ranked by expected impact.
For each experiment:
- Type (price/title/thumbnail)
- Current value
- Proposed value
- Specific hypothesis with data backing
- Expected lift % and confidence
- Priority score 1–10

Rules:
- Only propose price changes within ±20% of current
- Title changes must preserve primary SEO keyword
- Minimum 50 views required before recommending experiment

OUTPUT: JSON OptimizationOutput only.
```

---

### Agent 7: Support Triage
- **Trigger:** Real-time on every incoming support message
- **Input:** Customer message, purchase record, product info
- **Output:** `SupportOutput`

```typescript
interface SupportOutput {
  action: 'auto_respond' | 'refund' | 'escalate';
  response?: string;           // sent to customer if auto_respond
  refund_amount?: number;
  escalation_reason?: string;
  escalation_priority: 'low' | 'medium' | 'high';
}
```

**Decision matrix:**

| Condition | Action |
|-----------|--------|
| "How do I download?" | auto_respond — resend download link |
| "What format is this?" | auto_respond — state file types |
| "I can't open the file" | auto_respond — troubleshooting steps |
| "Is this compatible with X?" | auto_respond — from product docs |
| Refund request, < 7 days | refund — full, no questions |
| Refund request, ≥ 7 days | escalate — medium priority |
| Angry message / threat of dispute | escalate — high priority |
| Unknown / doesn't fit patterns | escalate — low priority |

**Auto-refund flow:**
```typescript
async function processAutoRefund(saleId: string) {
  const sale = await db.sales.findById(saleId);
  const daysSincePurchase = daysBetween(sale.sale_date, new Date());

  if (daysSincePurchase <= 7) {
    await gumroadAPI.refund(sale.platform_sale_id);  // or Stripe
    await db.sales.update(saleId, { refunded: true });
    await sendEmail({
      to: sale.customer_email,
      subject: 'Your refund has been processed',
      body: REFUND_CONFIRMATION_TEMPLATE
    });
  }
}
```

---

## DATABASE SCHEMA

### System 1 Tables

```sql
-- Products master record
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price_usd DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'draft',
  -- status values: 'draft' | 'pending_approval' | 'approved' | 'listed' | 'paused' | 'removed'
  confidence_score INTEGER,
  source_type VARCHAR(50),  -- 'public_domain' | 'cc0' | 'purchased' | 'original'
  license_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Version history (track enhancements over time)
CREATE TABLE product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  version INTEGER NOT NULL,
  artifacts_path TEXT,       -- Supabase Storage path
  changelog TEXT,
  quality_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Marketplace listings (one product → many platforms)
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(50) NOT NULL,          -- 'gumroad' | 'etsy'
  platform_listing_id VARCHAR(255),
  url TEXT,
  tags TEXT[],
  seo_title VARCHAR(500),
  thumbnail_url TEXT,
  status VARCHAR(50),                     -- 'live' | 'paused' | 'removed'
  views_total INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4),           -- e.g. 0.0082 = 0.82%
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Individual sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  platform VARCHAR(50),
  platform_sale_id VARCHAR(255),          -- for refund API calls
  customer_email VARCHAR(255),            -- for support lookup
  amount_gross DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  amount_net DECIMAL(10,2),
  sale_date TIMESTAMP,
  refunded BOOLEAN DEFAULT FALSE,
  refund_date TIMESTAMP,
  metadata JSONB
);

-- A/B experiments
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  type VARCHAR(50),                        -- 'price' | 'title' | 'thumbnail'
  control_value JSONB,
  variant_value JSONB,
  hypothesis TEXT,
  status VARCHAR(50) DEFAULT 'running',   -- 'proposed' | 'running' | 'complete' | 'rejected'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  result_lift_pct DECIMAL(5,2),
  result_winner VARCHAR(10),              -- 'control' | 'variant'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  platform VARCHAR(50),
  customer_email VARCHAR(255),
  message TEXT,
  action_taken VARCHAR(50),              -- 'auto_respond' | 'refund' | 'escalate'
  response_sent TEXT,
  escalation_reason TEXT,
  escalation_priority VARCHAR(20),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Shared Foundation Tables

```sql
-- All agent task executions
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  input JSONB,
  output JSONB,
  evidence JSONB,
  confidence_score INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Human review queue
CREATE TABLE approvals_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  system VARCHAR(50),                    -- 'digital_products'
  reason TEXT,
  context JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

-- Daily revenue snapshots
CREATE TABLE metrics_daily (
  date DATE,
  system VARCHAR(50),
  revenue_gross DECIMAL(10,2) DEFAULT 0,
  revenue_net DECIMAL(10,2) DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  metadata JSONB,
  PRIMARY KEY (date, system)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_approvals_status ON approvals_queue(status);
CREATE INDEX idx_listings_platform ON listings(platform, status);
CREATE INDEX idx_sales_date ON sales(sale_date);
```

---

## API ENDPOINTS

### Task Router (Vercel/Railway — TypeScript/Node)

```typescript
// POST /api/tasks/create
// Creates and queues an agent task
interface TaskInput {
  type: 'market_intel' | 'asset_sourcing' | 'enhancement'
      | 'branding' | 'listing' | 'optimization' | 'support_triage';
  priority?: number;  // 1–10, default 5
  input: Record<string, any>;
}

// GET /api/approvals/queue
// Returns all pending items needing human review
// Response: ApprovalQueueItem[]

// POST /api/approvals/:id/approve
// Body: { decision: 'approve' | 'reject', notes?: string }

// POST /api/approvals/:id/reject
// Body: { reason: string }

// GET /api/metrics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns daily metrics for System 1

// GET /api/products
// Returns all products with status

// GET /api/listings
// Returns all live listings with performance data

// POST /api/support/incoming
// Webhook endpoint for Gumroad/Etsy support messages
// Triggers Support Triage Agent
```

### Confidence Threshold Logic

```typescript
// Core guardrail — runs on every agent completion
async function completeTask(taskId: string, output: any, confidence: number) {
  const THRESHOLDS = {
    market_intel:  7,
    asset_sourcing: 7,
    enhancement:   8,  // higher bar — quality affects sales + refunds
    branding:      7,
    listing:       8,  // must not list low-quality products
    optimization:  6,  // lower bar — experiments are reversible
    support_triage: 6
  };

  const task = await db.tasks.findById(taskId);
  const threshold = THRESHOLDS[task.type] ?? 7;

  if (confidence < threshold) {
    await db.approvals_queue.insert({
      task_id: taskId,
      system: 'digital_products',
      reason: `Confidence ${confidence}/10 below threshold ${threshold}/10`,
      context: output,
      status: 'pending'
    });
    await db.tasks.update(taskId, { status: 'needs_approval', confidence_score: confidence });
    return { status: 'needs_approval' };
  }

  await db.tasks.update(taskId, {
    status: 'completed',
    output,
    confidence_score: confidence,
    completed_at: new Date()
  });
  return { status: 'completed', output };
}
```

---

## ORCHESTRATION

### GitHub Actions — Daily Pipeline

```yaml
name: System 1 Daily Pipeline
on:
  schedule:
    - cron: '0 6 * * *'   # 6am UTC daily
  workflow_dispatch:        # manual trigger

jobs:
  market-intel:
    runs-on: ubuntu-latest
    steps:
      - name: Run MarketIntel Agent
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/tasks/create \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"type": "market_intel", "priority": 7, "input": {}}'

  optimization:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 6 * * 1'  # Mondays only for optimization
    steps:
      - name: Run Optimization Agent
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/tasks/create \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"type": "optimization", "priority": 5, "input": {}}'

  daily-summary:
    runs-on: ubuntu-latest
    needs: [market-intel]
    steps:
      - name: Send Daily Summary Email
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/notifications/daily-summary \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"
```

### Rate Limits (Enforce in Middleware)

```typescript
const RATE_LIMITS = {
  gemini_api:          50,   // requests per minute
  gumroad_api:        100,   // per hour
  etsy_api:            40,   // per hour (Etsy is strict)
  image_generation:    20,   // per hour
  email_sending:       50,   // per day (conservative start)
};
```

---

## DAILY SUMMARY EMAIL

Sent every morning at 6am. This is the operator's entire management interface.

```typescript
async function sendDailySummary() {
  const metrics    = await db.metrics_daily.findByDate(today(), 'digital_products');
  const approvals  = await db.approvals_queue.count({ status: 'pending', system: 'digital_products' });
  const newSales   = await db.sales.countSince(yesterday());
  const liveCount  = await db.listings.count({ status: 'live' });
  const errors     = await getRecentErrors('digital_products');

  const body = `
📊 SYSTEM 1 DAILY SUMMARY — ${new Date().toLocaleDateString()}

💰 REVENUE (Last 24h)
  Gross:      $${metrics.revenue_gross}
  Net:        $${metrics.revenue_net}
  Units sold: ${metrics.units_sold}
  Live SKUs:  ${liveCount}

⚠️  NEEDS YOUR ATTENTION (${approvals} items)
${approvals > 0
  ? `→ Review now: ${process.env.DASHBOARD_URL}/approvals`
  : '→ Nothing pending ✓'}

🆕 PIPELINE ACTIVITY
  New sales today:      ${newSales}
  Products in queue:    ${await db.products.count({ status: 'draft' })}
  Experiments running:  ${await db.experiments.count({ status: 'running' })}

❌ ERRORS
${errors.length > 0 ? errors.map(e => `  • ${e}`).join('\n') : '  None ✓'}
  `;

  await sendEmail({
    to: process.env.OPERATOR_EMAIL,
    subject: `[S1] $${metrics.revenue_net} net · ${approvals} approvals pending`,
    body
  });
}
```

---

## COMPLIANCE + SAFETY GUARDRAILS

```typescript
// Run before EVERY asset sourcing operation
async function validateAssetCompliance(source: SourceItem): Promise<boolean> {
  const checks = [
    () => hasValidLicense(source),          // license field must be populated
    () => licensePermitsCommercialUse(source), // CC-BY-NC = NOT permitted
    () => sourceUrlIsApproved(source.url),   // only approved domains
    () => noPersonalDataInContent(source),   // no PII in source files
  ];

  for (const check of checks) {
    if (!await check()) {
      await logComplianceFailure(source, check.name);
      return false;
    }
  }
  return true;
}

// Approved source domains
const APPROVED_SOURCES = [
  'archive.org',
  'commons.wikimedia.org',
  'github.com',
  'gutenberg.org',
  'data.gov',
  'nasa.gov',
  // add more as vetted
];
```

---

## 30-DAY EXECUTION PLAN

### Days 1–3: Foundation
**Automated build includes:**
- Supabase schema (all tables above)
- Task Router API (all endpoints)
- GitHub Actions orchestrator
- Approval queue dashboard (Next.js)
- Daily summary email
- Rate limiting middleware

**You do:**
- Create Supabase project, Vercel/Railway project
- Add API keys to GitHub secrets: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GUMROAD_ACCESS_TOKEN`, `OPERATOR_EMAIL`, `RESEND_API_KEY`
- Run `pnpm db:migrate` to create tables
- Test with mock tasks

---

### Days 4–7: Market Intelligence
**Automated:**
- MarketIntel Agent runs, generates 30 opportunity briefs
- Briefs appear in approval dashboard ranked by score

**You do (30 min):**
- Open `/approvals` dashboard
- Review top 30 briefs
- Approve 10 niches to build
- Click Approve on each — pipeline triggers automatically

**Expected output:** 10 approved `OpportunityBrief` objects, AssetSourcing queued for each

---

### Days 8–14: First 5 Products
**Automated:**
- AssetSourcing Agent finds CC0 / public domain materials
- Enhancement Agent transforms them into polished products
- Brand & Packaging Agent generates covers + copy
- Products with quality ≥ 8 auto-list on Gumroad + Etsy
- Products with quality < 8 appear in approval queue

**You do (20 min/day):**
- Check approval queue each morning (via daily email link)
- For each pending product: preview it, approve or reject with notes
- Rejections feed back to Enhancement Agent for revision

**Expected output:** 5 products live by Day 14

---

### Days 15–18: Launch + Early Traffic
**Automated:**
- All 5 listings live and indexed
- Support Triage Agent active
- Metrics tracked in `metrics_daily`

**Optional (you, 30 min once):**
- Set up $50 Pinterest promoted pin on 1–2 products for data

**You do (15 min/day):**
- Read daily email
- Monitor support escalations (aim: zero)

---

### Days 19–24: Scale to 10 Products
**Automated:**
- Repeat pipeline for SKUs 6–10
- Create 1 bundle product (combine 3 existing products at $99)

**You do (20 min/day):**
- Same approval process as Days 8–14

**Expected output:** 10 SKUs live, 1 bundle by Day 24

---

### Days 25–30: Optimize
**Automated:**
- Optimization Agent runs Monday (Day 28)
- A/B experiments proposed for all listings with >50 views
- Low-priority experiments (<8) auto-apply
- High-priority (≥8) appear in approval queue

**You do (15 min/day):**
- Approve/reject optimization experiments
- Review conversion data

**Expected outcome by Day 30:**
- 10 SKUs live across Gumroad + Etsy
- 5–25 sales
- $300–1,000 gross revenue
- Fully autonomous pipeline running daily

---

## BUDGET ALLOCATION (SYSTEM 1)

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Replicate / DALL-E (images) | $20–50 | ~$0.05/product, 400–1000 products |
| Supabase Pro (shared) | $25 | Shared with all systems |
| Vercel/Railway (shared) | $20 | Shared with all systems |
| Gumroad fee | 10% of revenue | Taken at sale |
| Etsy listing fee | $0.20/listing | + 6.5% transaction fee |
| Resend email (shared) | $20 | Shared |
| Optional Pinterest ads | $200–400 | One-time test |
| **Running total (no ads)** | **~$65–95/mo** | Before revenue share |
| **Break-even** | **~$130–190/mo gross** | Covers all costs |

---

## SUCCESS METRICS

| Milestone | Target | Alert if below |
|-----------|--------|----------------|
| Week 2 | 5 products listed, 10+ views each | < 3 products = pipeline issue |
| Week 4 | 10 SKUs, 5+ sales, conversion >0.5% | < 2 sales = niche or copy problem |
| Month 2 | $1,000+ gross, refund rate <10% | > 15% refunds = quality issue |
| Month 6 | $2,000–5,000/mo, 20+ SKUs, >1% conversion | Stagnation = add niches |

---

## RISK MITIGATION

| Risk | Detection | Fix |
|------|-----------|-----|
| No sales after 30 days | Daily email shows $0 | Rotate 3 niches, slash price 30%, add free sample tier |
| Platform suppression (Gumroad/Etsy) | Listings stop showing in search | Multi-platform from Day 1; check ToS compliance |
| High refund rate (>15%) | `sales` table refund ratio | Add better previews, strengthen documentation, raise quality threshold to 9 |
| Copyright claim | Marketplace takedown notice | Immediate suspend listing, audit all assets, document all licenses |
| Agent failure / API error | Error count in daily email | Retry logic built in; fallback queues to approval dashboard |
| Low quality outputs | quality_score distribution | Tighten Enhancement prompt, raise threshold from 8 to 9 |

---

## ENVIRONMENT VARIABLES REQUIRED

```bash
# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # for server-side only

# Marketplace
GUMROAD_ACCESS_TOKEN=...
ETSY_API_KEY=...
ETSY_API_SECRET=...

# Image generation
REPLICATE_API_TOKEN=...       # or OPENAI_API_KEY for DALL-E

# Email
RESEND_API_KEY=re_...
OPERATOR_EMAIL=you@yourdomain.com

# App
API_URL=https://your-api.vercel.app
DASHBOARD_URL=https://your-dashboard.vercel.app
NODE_ENV=production
```

---

## FIRST THING TO BUILD

See `S1_GEMINI_CODE_PROMPT.md` for the detailed build instruction to begin construction.
