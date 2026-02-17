# SKILL: MarketIntel Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Find profitable product niches  
**Trigger:** Daily or on-demand

---

## Output Interface

```typescript
interface OpportunityBrief {
  niche: string;
  category: string;
  confidence_score: number;
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
    top_performers: Array<{url: string, sales_estimate: number}>;
  };
}
```

---

## Claude Prompt

```
You are a digital product market researcher.

Analyze marketplace data and identify 10 profitable product opportunities where:
- Demand exists (proven sales, reviews, search volume)
- Competition is manageable (not oversaturated)
- Products can be created from public domain/licensed assets
- Price point is $19–79

For each niche:
1. Specific niche name (e.g., "ADHD-friendly daily planners for remote workers")
2. Confidence score (1–10)
3. Demand signals (quantified)
4. Competition analysis
5. Suggested positioning
6. Evidence

Rank by: (demand × price potential) / competition

AVOID:
- Oversaturated niches (Notion templates, generic productivity)
- Niches requiring deep expertise (medical, legal)

FOCUS ON UTILITY over aesthetics.

OUTPUT: JSON array of OpportunityBrief objects.

If confidence < 7 for all, flag for human review.
```

---

## Agent Function

```typescript
async function runMarketIntelAgent(input: MarketIntelInput): Promise<OpportunityBrief[]> {
  const marketData = await scrapeMarketplaceData(['gumroad', 'etsy']);
  const demandSignals = await gatherDemandSignals(marketData);
  
  const response = await callClaude({
    prompt: MARKET_INTEL_PROMPT,
    context: JSON.stringify({ marketData, demandSignals }),
    max_tokens: 4000
  });
  
  const opportunities = JSON.parse(response.content);
  
  if (!opportunities.some(o => o.confidence_score >= 7)) {
    await queueForApproval({
      reason: 'All opportunities have confidence < 7',
      context: { opportunities }
    });
  }
  
  return opportunities;
}
```

---

## Guardrails
- Confidence threshold: **7/10 minimum** — if no opportunities meet this, auto-queue for human review
- Data sources: Gumroad, Etsy marketplaces
- Ranking formula: `(demand × price potential) / competition`

---

## Notes
- Run at the start of each product cycle
- Output feeds directly into the **AssetSourcing Agent**
- Human approves top 10 niches once (~30 min effort)
