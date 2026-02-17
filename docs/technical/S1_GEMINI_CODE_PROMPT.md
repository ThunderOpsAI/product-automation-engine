# SYSTEM 1: Gemini Build Prompt

> **How to use:** This is a complete reference for the build steps. The monorepo structure and all specifications are defined here.

---

```
BUILD: System 1 — Digital Arbitrage Factory
GOAL: Autonomous digital product creation and sales pipeline
TARGET: $1,000–3,000/month by Month 2 with 30 min/day human oversight

═══════════════════════════════════════════
STACK
═══════════════════════════════════════════

Language:      TypeScript (strict mode)
Runtime:       Node.js 20+
Framework:     Express (API) + Next.js 14 (dashboard)
Database:      Supabase (Postgres + Storage + Auth)
Hosting:       Vercel (API + dashboard) or Railway
Orchestration: GitHub Actions (cron jobs)
AI:            Google Gemini API (gemini-2.0-flash)
Image gen:     Replicate API (Stable Diffusion)
Email:         Resend API
Marketplace:   Gumroad API + Etsy API
Payments:      Gumroad checkout (primary) + Stripe (fallback)

Package manager: pnpm
Monorepo:      /apps/api, /apps/dashboard, /packages/shared

═══════════════════════════════════════════
WHAT TO BUILD — IN ORDER
═══════════════════════════════════════════

STEP 1: DATABASE LAYER
─────────────────────
Create Supabase migration file at /supabase/migrations/001_system1.sql

Tables to create:
  • tasks (shared foundation)
  • approvals_queue (shared foundation)
  • metrics_daily (shared foundation)
  • products
  • product_versions
  • listings
  • sales
  • experiments
  • support_tickets

Full schema is in S1_MASTER_BUILD_SPEC.md — use it exactly.

Add indexes:
  idx_tasks_status, idx_approvals_status,
  idx_listings_platform, idx_sales_date

─────────────────────
STEP 2: SHARED TYPES
─────────────────────
Create /packages/shared/src/types.ts with:
  • OpportunityBrief
  • SourcePack
  • EnhancedProduct
  • BrandingOutput
  • OptimizationOutput
  • SupportOutput
  • TaskInput, TaskOutput
  • All DB row types

─────────────────────
STEP 3: TASK ROUTER API
─────────────────────
Create /apps/api/src with Express app.

Endpoints:
  POST   /api/tasks/create
  GET    /api/tasks/:id
  GET    /api/approvals/queue
  POST   /api/approvals/:id/approve
  POST   /api/approvals/:id/reject
  GET    /api/metrics/daily
  GET    /api/products
  GET    /api/listings
  POST   /api/support/incoming   (webhook for marketplace support msgs)
  POST   /api/notifications/daily-summary

Core logic:
  • completeTask() with per-agent confidence thresholds
  • Rate limiting middleware (gemini_api: 50/min, gumroad: 100/hr, etsy: 40/hr)
  • Error logging to tasks.error_message

Confidence thresholds by agent type:
  market_intel:   7
  asset_sourcing: 7
  enhancement:    8
  branding:       7
  listing:        8
  optimization:   6
  support_triage: 6

─────────────────────
STEP 4: AGENT MODULES
─────────────────────
Create /apps/api/src/agents/ with one file per agent:

market-intel.agent.ts
  • Gathers marketplace data (Gumroad bestsellers + Etsy digital downloads)
  • Calls Gemini with MARKET_INTEL_PROMPT (full prompt in S1_MASTER_BUILD_SPEC.md)
  • Returns OpportunityBrief[] ranked by (demand × price) / competition
  • If no opportunity ≥ 7 confidence, auto-queues for approval

asset-sourcing.agent.ts
  • Given approved niche, searches: archive.org, commons.wikimedia.org, github.com
  • Validates license for commercial use
  • Downloads + stores in Supabase Storage
  • Returns SourcePack with compliance_notes

enhancement.agent.ts
  • Takes SourcePack, calls Gemini to:
    - Reformat and improve layout
    - Add worked examples
    - Write annotations
    - Create 3-tier variants (Beginner/Pro/Complete)
    - Write README + Quick Start + FAQ
  • quality_score must be ≥ 8 to pass autonomously

branding.agent.ts
  • Generates cover image via Replicate API (1600×900)
  • Generates 3 thumbnails (400×400)
  • Calls Gemini to write:
    - SEO title: [keyword] + [niche modifier] + [value word]
    - HTML product description (outcome-focused)
    - 5–13 tags
    - FAQ (5 buyer objections)

listing.agent.ts
  • Creates listing on Gumroad via API
  • Creates listing on Etsy via API
  • Validates all fields before posting
  • Stores listing records in DB

optimization.agent.ts
  • Pulls all live listings with ≥ 50 views
  • Calls Gemini to propose A/B experiments
  • Auto-applies experiments with priority < 8
  • Queues priority ≥ 8 for human approval
  • Max 1 active experiment per listing
  • Min 7 days between experiments

support-triage.agent.ts
  • Classifies incoming message
  • Auto-responds for known question types
  • Auto-refunds if purchase < 7 days old
  • Escalates with priority for everything else

─────────────────────
STEP 5: GEMINI HELPER
─────────────────────
Create /packages/shared/src/gemini.ts

function callGemini({ prompt, context, system?, maxTokens? })
  • Uses gemini-2.0-flash (configurable via GEMINI_MODEL env var)
  • Retries up to 3 times on 429/500 errors
  • Respects 50 req/min rate limit
  • Logs all calls to tasks table

─────────────────────
STEP 6: ORCHESTRATOR
─────────────────────
Create /.github/workflows/system1-daily.yml

Schedule: cron '0 6 * * *'  (6am UTC daily)
Jobs:
  1. trigger market-intel agent
  2. trigger optimization agent (Mondays only)
  3. trigger daily-summary email

Also create workflow_dispatch for manual triggering.

─────────────────────
STEP 7: APPROVAL DASHBOARD
─────────────────────
Create /apps/dashboard with Next.js 14 app router.

Pages:
  /                  → Today's metrics overview
  /approvals         → Pending items (main daily view)
  /approvals/:id     → Detail view with approve/reject
  /products          → All products and status
  /listings          → Live listings with performance
  /experiments       → Active A/B tests

/approvals is the most important page. For each pending item show:
  • Agent type + timestamp
  • Confidence score
  • The actual output (product preview, niche brief, etc.)
  • Reason it was flagged
  • Approve button (green) + Reject button (red) + Notes field

─────────────────────
STEP 8: DAILY SUMMARY EMAIL
─────────────────────
Create /apps/api/src/notifications/daily-summary.ts

Email content:
  • Revenue last 24h (gross + net)
  • Units sold
  • Live SKU count
  • Approval queue count (with link if > 0)
  • New products in pipeline
  • Running experiments count
  • Error count (with details if > 0)

Subject: [S1] $XX.XX net · N approvals pending
Send via Resend API to OPERATOR_EMAIL

═══════════════════════════════════════════
MOCK DATA FOR TESTING
═══════════════════════════════════════════

Create /apps/api/src/mocks/ with realistic test data:
  • 5 OpportunityBrief objects (mix of confidence scores including <7)
  • 2 SourcePack objects
  • 2 EnhancedProduct objects (one with quality 8, one with quality 6)
  • 1 BrandingOutput
  • Sample support messages (download question, refund request <7 days, angry message)

Create seed script: pnpm db:seed
Create test script: pnpm test:agents (runs pipeline with mocks, verifies approval routing)

═══════════════════════════════════════════
ENVIRONMENT VARIABLES
═══════════════════════════════════════════

Required (add to .env.local and GitHub Secrets):
  GEMINI_API_KEY
  GEMINI_MODEL=gemini-2.0-flash
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_KEY
  GUMROAD_ACCESS_TOKEN
  ETSY_API_KEY
  ETSY_API_SECRET
  REPLICATE_API_TOKEN
  RESEND_API_KEY
  OPERATOR_EMAIL
  API_URL
  DASHBOARD_URL

═══════════════════════════════════════════
FILE STRUCTURE
═══════════════════════════════════════════

/
├── .github/
│   └── workflows/
│       └── system1-daily.yml
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── agents/
│   │       │   ├── market-intel.agent.ts
│   │       │   ├── asset-sourcing.agent.ts
│   │       │   ├── enhancement.agent.ts
│   │       │   ├── branding.agent.ts
│   │       │   ├── listing.agent.ts
│   │       │   ├── optimization.agent.ts
│   │       │   └── support-triage.agent.ts
│   │       ├── routes/
│   │       │   ├── tasks.ts
│   │       │   ├── approvals.ts
│   │       │   ├── metrics.ts
│   │       │   ├── products.ts
│   │       │   ├── listings.ts
│   │       │   └── support.ts
│   │       ├── notifications/
│   │       │   └── daily-summary.ts
│   │       ├── middleware/
│   │       │   ├── rate-limit.ts
│   │       │   └── auth.ts
│   │       ├── mocks/
│   │       │   └── test-data.ts
│   │       └── index.ts
│   └── dashboard/
│       └── src/
│           └── app/
│               ├── page.tsx           (metrics overview)
│               ├── approvals/
│               │   ├── page.tsx
│               │   └── [id]/page.tsx
│               ├── products/page.tsx
│               ├── listings/page.tsx
│               └── experiments/page.tsx
├── packages/
│   └── shared/
│       └── src/
│           ├── types.ts
│           ├── gemini.ts
│           └── supabase.ts
├── supabase/
│   └── migrations/
│       └── 001_system1.sql
├── package.json
└── pnpm-workspace.yaml

═══════════════════════════════════════════
FIRST MILESTONE (build this first, verify it works)
═══════════════════════════════════════════

1. Database migrated (all tables exist in Supabase)
2. Task Router running locally on port 3001
3. POST /api/tasks/create accepts a { type: "market_intel" } task
4. MarketIntel agent runs with mock data and returns 5 OpportunityBriefs
5. 2 briefs have confidence < 7 → they appear in approvals_queue table
6. GET /api/approvals/queue returns those 2 items
7. Dashboard at localhost:3000/approvals shows them with Approve/Reject buttons
8. Clicking Approve updates status in DB and logs reviewed_by + reviewed_at

Once this works end-to-end, build the remaining agents.

═══════════════════════════════════════════
REFERENCE
═══════════════════════════════════════════

Full agent prompts, all TypeScript interfaces, database schema, and API
specifications are in: S1_MASTER_BUILD_SPEC.md

Reference that document for any details not covered here.

Use TypeScript strict mode throughout.
```
