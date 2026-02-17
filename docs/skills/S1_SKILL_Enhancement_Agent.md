# SKILL: Enhancement Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Transform sourced assets into premium, sellable products  
**Trigger:** After AssetSourcing Agent completes a SourcePack

---

## Output Interface

```typescript
interface EnhancedProduct {
  files: string[];             // paths to enhanced files
  variants: Array<{
    name: string;              // 'Beginner', 'Pro', 'Complete'
    files: string[];
    suggested_price: number;
  }>;
  documentation: {
    readme: string;
    quick_start: string;
    faq: string;
  };
  quality_score: number;       // Must be 8+/10 to proceed autonomously
}
```

---

## Enhancement Tasks

The agent performs the following transformations on raw source materials:

1. **Formatting** — Clean, consistent layout and typography
2. **Examples** — Add practical, niche-specific usage examples
3. **Annotations** — Commentary, explanations, context where helpful
4. **Beginner guides** — Onboarding docs for non-expert buyers
5. **Variants** — Package into tiers (Beginner / Pro / Complete)
6. **Documentation** — README, Quick Start guide, FAQ

---

## Quality Gate

| Score | Action |
|-------|--------|
| 8–10 | Proceed autonomously to Brand & Packaging Agent |
| <8   | Auto-queue for human approval |

> Quality must be **8+/10** before a product moves forward. This is non-negotiable.

---

## Variant Pricing Strategy

| Variant | Description | Price Range |
|---------|-------------|-------------|
| Beginner | Core product, simplified | $9–19 |
| Pro | Full product + advanced content | $29–59 |
| Complete | Everything + bonus resources | $79–149 |

---

## Notes
- The goal is to create products that feel premium and hand-crafted, not scraped
- Documentation quality matters as much as the core product — buyers judge by README quality
- Output feeds directly into the **Brand & Packaging Agent**
- Every enhanced product gets logged with a version number in `product_versions` table
