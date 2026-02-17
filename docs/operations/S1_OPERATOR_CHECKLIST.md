# SYSTEM 1: Operator Setup Checklist
## Your Complete Day-by-Day Guide — From Zero to First Sale

> **You are the approvals layer.** Everything else is automated.  
> **Your total time commitment:** ~30 min/day after setup  
> **Every action you need to take is marked ✋ — ignore everything else**

---

## PRE-LAUNCH: Before You Touch Anything (2 hours, once)

### 1. Create Accounts

- [ ] **Supabase** — https://supabase.com → New project → Note your URL + anon key + service key
- [ ] **Vercel** — https://vercel.com → Connect GitHub account
- [ ] **Gumroad** — https://gumroad.com → Creator account → Settings → API → Generate access token
- [ ] **Etsy** — https://etsy.com/developers → Create app → Note API key + secret
- [ ] **Replicate** — https://replicate.com → Note API token (for image generation, ~$0.05/image)
- [ ] **Resend** — https://resend.com → Add your domain → Note API key (transactional email)
- [ ] **GitHub** — Create new private repo: `autonomous-monetization`

### 2. Add GitHub Secrets

Navigate to: **GitHub repo → Settings → Secrets and variables → Actions**

Add each of these as a secret:

| Secret Name | Where to find it |
|-------------|-----------------|
| `GEMINI_API_KEY` | https://aistudio.google.com → API keys |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API |
| `GUMROAD_ACCESS_TOKEN` | Gumroad → Settings → Applications |
| `ETSY_API_KEY` | Etsy Developer Portal → App |
| `ETSY_API_SECRET` | Etsy Developer Portal → App |
| `REPLICATE_API_TOKEN` | Replicate → Account → API Tokens |
| `RESEND_API_KEY` | Resend → API Keys |
| `OPERATOR_EMAIL` | Your email address |
| `API_URL` | Set after Vercel deploy (step below) |
| `DASHBOARD_URL` | Set after Vercel deploy (step below) |

### 3. Run Initial Build

The automated build creates:
- Full TypeScript codebase
- Database migration file
- All 7 agent modules
- Approval dashboard (Next.js)
- GitHub Actions workflow

**You review the code, then:**
- [ ] Push to GitHub
- [ ] `pnpm supabase db push` (runs migration, creates all tables)
- [ ] Deploy to Vercel: `vercel deploy --prod`
- [ ] Note your API URL and Dashboard URL → add back to GitHub Secrets as `API_URL` and `DASHBOARD_URL`
- [ ] Run `pnpm test:agents` to verify approval routing works with mock data

**Expected: All 8 tables exist in Supabase, API returns 200, dashboard loads**

---

## DAYS 1–3: Foundation Verification

### ✋ Day 1 — Verify Infrastructure (15 min)

- [ ] Open your dashboard URL in browser → should load with mock data
- [ ] Navigate to `/approvals` → should show 2 mock pending items
- [ ] Click Approve on one → status should change in Supabase `approvals_queue` table
- [ ] Check Supabase → Tables → verify `tasks`, `products`, `listings`, `sales` all exist
- [ ] Confirm GitHub Actions → Actions tab → "System 1 Daily Pipeline" workflow exists

### ✋ Day 2 — Send First Test Email (5 min)

- [ ] Trigger daily summary manually: `curl -X POST $API_URL/api/notifications/daily-summary`
- [ ] Check your inbox → you should receive the summary email
- [ ] Confirm subject line format: `[S1] $0.00 net · 2 approvals pending`

### ✋ Day 3 — Trigger First Real Agent Run (10 min)

- [ ] In GitHub: Actions → "System 1 Daily Pipeline" → "Run workflow"
- [ ] Wait ~3 minutes
- [ ] Check dashboard `/approvals` — MarketIntel results should appear
- [ ] Check your email — daily summary should arrive
- [ ] If errors: check Actions log, fix with Claude Code if needed

**Gate:** Do not proceed to Day 4 until you can see real MarketIntel output in your approval dashboard.

---

## DAYS 4–7: Market Intelligence

### ✋ Day 4 — Review First Opportunity Briefs (30 min — most important session)

The pipeline has now generated 30 opportunity briefs. Your job is to pick 10.

**Open:** `[your dashboard]/approvals`

**For each brief, look at:**
- Niche specificity (specific = good: "ADHD planners for remote workers" > "planners")
- Confidence score (7+ preferred, will accept 6 with strong evidence)
- Saturation level (low or medium only — reject high)
- Price potential ($29+ preferred)
- Top performer evidence (are there real products making money in this space?)

**Approve 10, reject the rest.**

**Niches to avoid:**
- Anything with "Notion templates" in the name (oversaturated)
- Generic productivity (too broad)
- Medical, legal, financial advice content (liability)
- Anything you genuinely couldn't stand behind

Once you approve 10, the AssetSourcing Agent automatically triggers for each.

**Expected by Day 7:** 10 AssetSourcing jobs running, first SourcePacks arriving

### ✋ Day 5–6 — Optional: Spot-Check Asset Sources (10 min)

- [ ] In Supabase → `tasks` table → filter by `type = 'asset_sourcing'`
- [ ] Look at 2–3 completed tasks → check `output.sources[].license` fields
- [ ] Verify licenses are populated and say something like "CC0", "Public Domain", "MIT"
- [ ] If any say "unknown" or are blank → flag that SourcePack for manual review

**You don't need to do this daily — just once to build confidence the compliance guardrails work.**

---

## DAYS 8–14: First 5 Products Live

### ✋ Daily Check (10–20 min/day)

**Morning routine:**
1. Read your daily summary email (arrives 6am)
2. If approval count > 0 → open dashboard link in email
3. For each pending product, ask yourself:

> "Would I be comfortable if a customer sent this to a friend?"

If YES → Approve  
If NO → Reject (add a note explaining what's missing — Enhancement Agent will revise)

**Common rejection reasons and what to write:**
| Issue | Note to add |
|-------|-------------|
| FAQ only has 2 answers | "Need 5 FAQ entries answering: compatibility, refund policy, file format, how to use, who it's for" |
| No worked examples | "Add 3 concrete examples showing the product in use" |
| README is generic | "Make README niche-specific — mention the specific job title/role this helps" |
| Weak cover image | "Regenerate cover — needs to look like a premium product mockup, not a flat PDF icon" |

### ✋ Day 10 — Verify First Live Listing (5 min)

By Day 10 you should have at least 1 product live on Gumroad.

- [ ] Check `listings` table in Supabase → `status = 'live'`
- [ ] Click the `url` field → opens Gumroad listing → does it look good?
- [ ] Buy it yourself with a test purchase (Gumroad has a test mode)
- [ ] Confirm you receive the download link via email
- [ ] Refund immediately after test

**Gate:** Do not consider the pipeline working until you've made a successful test purchase.

---

## DAYS 15–18: Launch + Traffic Monitoring

### ✋ Daily Check (10–15 min)

Morning email will now show:
- View counts per listing
- First sales (hopefully!)
- Support tickets resolved (or escalated to you)

**If 0 views after Day 15:** The listing exists but isn't getting discovered. Options:
1. Check SEO title — does it contain the most searched keyword for that niche?
2. Add more relevant tags (up to 13 on Etsy, unlimited on Gumroad)
3. Optional: run $50 Pinterest promoted pin (see bonus section below)

**If views but 0 sales:** Conversion problem. Options:
1. Check product description — is the hook compelling?
2. Is the price right? Check what competitors charge
3. Is the cover image professional-looking?
→ Trigger Optimization Agent manually if needed

### ✋ Day 15 — Optional Paid Traffic Test ($50 budget)

If you want data faster:

**Pinterest Ads:**
1. Create Pinterest Business account
2. Create a pin with your best product cover image
3. Promoted pin: target keywords from your niche brief
4. Budget: $50, run for 7 days
5. Track: views → Gumroad page → purchase

This isn't required — just accelerates learning.

---

## DAYS 19–24: Scale to 10 SKUs

### ✋ Same daily routine as Days 8–14

Now approving products 6–10. You're now faster at this — should take 10–15 min/day.

### ✋ Day 21 — Create a Bundle Product

Once you have 5+ live products, bundle 3 complementary ones:

In your dashboard → Products → select 3 related products → Create Bundle
- Price the bundle at 2× the highest individual price (e.g., 3 × $29 products → bundle at $59)
- This is pure margin — no new assets needed
- Enhancement Agent writes the bundle description automatically

**Bundles typically convert 20–40% better than individual products for repeat visitors.**

---

## DAYS 25–30: Optimization Loop

### ✋ Monday Morning — Optimization Review (15 min)

Every Monday the Optimization Agent runs and proposes A/B experiments.

Check your email → open `/experiments` dashboard

**For each proposed experiment:**
- Priority < 8: Already applied automatically (nothing to do — just monitor)
- Priority ≥ 8: Review the hypothesis and data → Approve or Reject

**Good experiments to approve:**
- Price test backed by competitor data (e.g., "3 of top 5 competitors charge $49, we charge $29")
- Title test that adds a high-volume keyword to existing title
- Any experiment on a listing with >100 views and <0.5% conversion

**Experiments to reject:**
- Price increase > 30% (too aggressive without more data)
- Title completely changed (loses any SEO equity already built)
- Running experiment on listing with < 50 views (too little data)

---

## ONGOING: The 30 Min/Day Routine

Once everything is running (after Day 30), your daily routine is:

### Morning (10 min)
1. Read daily summary email
2. If approvals pending → open link, process them
3. If errors flagged → open dashboard, check error details

### Weekly Monday (15 min)
1. Review Optimization Agent experiment proposals
2. Approve/reject A/B tests
3. Check overall revenue vs target

### Monthly (30 min)
1. Review top 5 and bottom 5 performing listings
2. Pause listings with <0.2% conversion after 200+ views
3. Brief MarketIntel Agent to find 3 new niches (replace paused products)
4. Check refund rate — if >10%, investigate which products, add better previews

---

## ESCALATIONS: What the System Handles (vs What You Handle)

### System handles automatically (you see nothing):
- Download how-to questions
- File format/compatibility questions
- Refunds within 7 days
- All A/B experiments with priority < 8

### System sends to your approval queue:
- Confidence scores below threshold
- Products with quality < 8 before listing
- A/B experiments with priority ≥ 8
- Refund requests > 7 days old
- Angry customers or dispute threats

### Escalated support messages — how to handle:
When you see an escalated ticket:
1. Read the customer message
2. Check the purchase date and amount
3. Decide: refund, partial refund, or respond with explanation
4. Click Resolve in dashboard → type your response → send

**Golden rule:** If in doubt, refund. A $29 refund is worth more than a chargeback or bad review.

---

## REVENUE TARGETS & ALERT THRESHOLDS

| Week | Expected Revenue | Alert if below |
|------|-----------------|----------------|
| Week 2 | First sale(s) | 0 sales = listing or niche issue |
| Week 4 | $50–200 gross | < $20 = reassess niches |
| Month 2 | $500–1,500 gross | < $200 = rotate top 3 niches |
| Month 3 | $1,000–3,000 gross | < $500 = add more SKUs |

**If revenue is below target at any milestone:**
1. Don't panic — organic discovery takes 4–6 weeks on Etsy/Gumroad
2. Check conversion rates (should be ≥ 0.5% — if not, fix copy/price)
3. Check view counts (if <50/product, discovery is the problem — add tags, try Pinterest)
4. Check refund rate (if >15%, quality is the problem — raise enhancement threshold to 9)

---

## MONTHLY COST TRACKER

Track this in a spreadsheet to know your real margin:

| Line item | Month 1 | Month 2 | Ongoing |
|-----------|---------|---------|---------|
| Supabase Pro | $25 | $25 | $25 |
| Vercel/Railway | $20 | $20 | $20 |
| Resend email | $20 | $20 | $20 |
| Claude API | ~$15 | ~$30 | ~$30–60 |
| Replicate (images) | ~$10 | ~$25 | ~$20–50 |
| Gumroad fees (10%) | varies | varies | 10% of gross |
| Etsy fees (6.5%) | varies | varies | 6.5% of gross |
| Pinterest ads (optional) | $0–50 | $0 | $0 |
| **Break-even gross revenue** | **~$130** | **~$150** | **~$150** |

At $1,000 gross/month: costs ~$200–250 = **$750–800 net = 75–80% margin**

---

## QUICK REFERENCE: Approval Decision Guide

| What the system shows you | Typical time to decide | Default action |
|-----------------------|----------------------|----------------|
| Niche brief (MarketIntel) | 2 min | Approve if saturation = low/medium and confidence ≥ 6 |
| Asset source compliance | 1 min | Approve if license is populated and source is known |
| Product quality (Enhancement) | 3 min | Approve if ≥ 7 and docs look good; reject with specific notes if not |
| High-priority experiment | 2 min | Approve if hypothesis includes competitor data |
| Refund > 7 days | 2 min | Default: approve refund unless clear abuse pattern |
| Angry customer | 3 min | Default: full refund + apology |

**Target: clear your approval queue in under 15 min/day.**  
If it's taking longer, something is wrong with the quality thresholds — raise the bar.
