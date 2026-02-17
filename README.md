# System 1: Digital Arbitrage Factory

> Autonomous digital product creation and sales pipeline  
> **Target:** $1,000–3,000/month by Month 2  
> **Human time:** 30 min/day (approvals only)

---

## What It Does

Seven AI agents (powered by Google Gemini) form an end-to-end pipeline that:

1. **Researches** trending digital product niches on Gumroad and Etsy
2. **Sources** legal, licensable materials (public domain, CC0)
3. **Enhances** raw assets into premium, polished products
4. **Brands & packages** with cover images, SEO copy, and tags
5. **Lists** products on Gumroad and Etsy
6. **Optimises** pricing, titles, and thumbnails via A/B testing
7. **Handles** customer support and refunds automatically

You only approve niche selections and review low-confidence products before they go live.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js 20+ |
| Framework | Express (API) + Next.js 14 (Dashboard) |
| Database | Supabase (Postgres + Storage) |
| AI | Google Gemini API |
| Image Generation | Replicate API (Stable Diffusion) |
| Marketplace | Gumroad API + Etsy API |
| Email | Resend API |
| Orchestration | GitHub Actions (cron) |
| Hosting | Vercel or Railway |

---

## Project Structure

```
product-automation-engine/
├── .github/workflows/        # GitHub Actions cron jobs
├── apps/
│   ├── api/                  # Express API (task router + agents)
│   └── dashboard/            # Next.js approval dashboard
├── packages/
│   └── shared/               # Types, Gemini helper, Supabase client
├── supabase/
│   └── migrations/           # Database schema
├── docs/                     # All documentation
│   ├── operations/           # Overview, pipeline architecture, operator checklist
│   ├── phases/               # Phase 1–4 build phases
│   ├── skills/               # 7 agent skill specifications
│   └── technical/            # Master build spec, DB schema, success metrics
└── pnpm-workspace.yaml
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in your API keys (see docs/operations/S1_OPERATOR_CHECKLIST.md)

# Run database migration
pnpm db:migrate

# Seed with test data
pnpm db:seed

# Start API server
pnpm --filter api dev

# Start dashboard
pnpm --filter dashboard dev
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [Master Build Spec](docs/technical/S1_MASTER_BUILD_SPEC.md) | Complete system specification |
| [Agent Pipeline](docs/operations/S1_AGENT_PIPELINE_ARCHITECTURE.md) | How the 7 agents connect |
| [Operator Checklist](docs/operations/S1_OPERATOR_CHECKLIST.md) | Day-by-day human guide |
| [Database Schema](docs/technical/S1_DATABASE_SCHEMA.md) | All Supabase tables |
| [Success Metrics](docs/technical/System1_Success_Metrics_FULL.md) | Week-by-week targets |

---

## Environment Variables

```bash
GEMINI_API_KEY=           # Google AI Studio
GEMINI_MODEL=gemini-2.0-flash
SUPABASE_URL=             # Supabase project URL
SUPABASE_ANON_KEY=        # Supabase anon key
SUPABASE_SERVICE_KEY=     # Supabase service key (server-side only)
GUMROAD_ACCESS_TOKEN=     # Gumroad seller API token
ETSY_API_KEY=             # Etsy developer API key
ETSY_API_SECRET=          # Etsy developer API secret
REPLICATE_API_TOKEN=      # Replicate (image generation)
RESEND_API_KEY=           # Resend (transactional email)
OPERATOR_EMAIL=           # Your email for daily summaries
API_URL=                  # Deployed API URL
DASHBOARD_URL=            # Deployed dashboard URL
```
