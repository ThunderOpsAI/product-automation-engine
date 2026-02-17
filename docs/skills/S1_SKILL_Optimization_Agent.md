# SKILL: Optimization Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** A/B test prices, titles, and thumbnails to improve conversion  
**Trigger:** Weekly, or when a listing has enough traffic data

---

## Output Interface

```typescript
interface OptimizationOutput {
  experiments: Array<{
    type: 'price' | 'title' | 'thumbnail';
    current_value: any;
    proposed_value: any;
    hypothesis: string;
    priority: number;   // 1–10, higher = more impactful but riskier
  }>;
}
```

---

## Experiment Types

| Type | What Changes | Example |
|------|-------------|---------|
| `price` | Listed price adjusted up or down | $29 → $24 or $29 → $39 |
| `title` | SEO title rewritten | Add keyword, change hook word |
| `thumbnail` | Cover image swapped | Different style, color, layout |

---

## Priority Threshold
- **Priority < 8:** Agent can implement autonomously
- **Priority ≥ 8:** Queued for human approval before going live

---

## Decision Logic
Experiments are proposed based on:
1. **Current conversion rate** vs benchmark (>0.5% = good, <0.5% = needs help)
2. **Traffic volume** — minimum data threshold before testing
3. **Competitive scan** — what top-performing listings in same niche look like
4. **Price elasticity signals** — are buyers hesitating at current price?

---

## Experiment Hypothesis Format
Each proposed experiment must include a clear hypothesis:
```
"Changing title from [X] to [Y] will improve CTR because [reason based on data]"
"Reducing price from $39 to $29 will increase conversion because competitor avg is $27"
```

---

## Weekly Cadence
1. Pull conversion data for all live listings
2. Identify listings with conversion < 0.5% or declining trend
3. Generate experiments ranked by priority
4. Auto-apply low-priority experiments (< 8)
5. Queue high-priority experiments for human review
6. Log all changes with before/after data

---

## Notes
- Never run more than 1 experiment per listing at a time (can't isolate variables)
- Wait minimum 7 days per experiment before switching again
- All experiment results logged for learning — over time the agent builds a pattern library of what works per niche
