# SYSTEM 1: Agent Pipeline & Architecture

**System:** 1 — Digital Arbitrage Factory  
**Overview:** How all 7 agents connect to form the end-to-end pipeline

---

## Pipeline Flow

```
[MarketIntel Agent]
        │
        │  OpportunityBrief[] (top 10 niches)
        │  ← Human approves which 3 to build
        ▼
[AssetSourcing Agent]
        │
        │  SourcePack (licensed materials)
        ▼
[Enhancement Agent]
        │
        │  EnhancedProduct (quality score 8+/10)
        │  ← If <8: Human approval required
        ▼
[Brand & Packaging Agent]
        │
        │  BrandingOutput (cover, copy, SEO)
        ▼
[Listing Agent]
        │
        │  Publishes to Gumroad / Etsy
        ▼
[Optimization Agent]  ←── Runs weekly on all live listings
        │
        │  A/B experiments (auto or human-approved)
        
[Support Triage Agent]  ←── Triggered on every support message
        │
        ├── Auto-respond (simple questions)
        ├── Auto-refund (< 7 days)
        └── Escalate → Human approval queue
```

---

## Agent Summary Table

| # | Agent | Input | Output | Auto-threshold |
|---|-------|-------|--------|----------------|
| 1 | MarketIntel | Marketplace data | 10 OpportunityBriefs | Confidence ≥ 7 |
| 2 | AssetSourcing | Approved niche | SourcePack | Confidence ≥ 7 |
| 3 | Enhancement | SourcePack | EnhancedProduct | Quality ≥ 8 |
| 4 | Brand & Packaging | EnhancedProduct | BrandingOutput | Quality ≥ 8 |
| 5 | Listing | BrandingOutput | Live marketplace listing | Confidence ≥ 8 |
| 6 | Optimization | Live listing data | A/B experiment proposals | Priority < 8 |
| 7 | Support Triage | Support message | Response / Refund / Escalation | < 7 days = auto-refund |

---

## Confidence Score Rules (All Agents)

| Score | Action |
|-------|--------|
| ≥ agent threshold | Proceed autonomously |
| < agent threshold | Auto-queue for human approval before next step |

Per-agent thresholds:
| Agent | Threshold |
|-------|-----------|
| MarketIntel | 7 |
| AssetSourcing | 7 |
| Enhancement | 8 |
| Branding | 7 |
| Listing | 8 |
| Optimization | 6 (uses priority, not confidence) |
| Support Triage | 6 |

---

## Orchestration
- **Technology:** GitHub Actions (cron) or n8n
- **Daily pipeline:** MarketIntel + Optimization run on schedule
- **Event-driven:** Asset, Enhancement, Branding, Listing run when triggered by previous agent completing
- **Support:** Triggered in real-time on incoming messages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Orchestrator | GitHub Actions / n8n |
| Agent runtime | Node.js / TypeScript on Vercel or Railway |
| Database | Supabase (Postgres + Storage) |
| AI calls | Google Gemini API (gemini-2.0-flash) |
| Image generation | DALL-E or Stable Diffusion API |
| Marketplace APIs | Gumroad API, Etsy API |
| Email | Resend / Postmark |
| Payments | Gumroad checkout / Stripe |

---

## Human Touch Points (30 min/day)

| When | What | Time |
|------|------|------|
| Day 4–7 | Approve top 10 niches | 30 min (once) |
| Days 8–24 | Review products with quality < 8 | ~20 min/day |
| Daily | Check approval queue | 10 min |
| Weekly | Review Optimization Agent proposals | 15 min |
| As needed | Handle escalated support | 5–10 min |
