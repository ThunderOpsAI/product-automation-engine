# SKILL: Brand & Packaging Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Create visuals and copy that convert browsers into buyers  
**Trigger:** After Enhancement Agent produces a quality 8+/10 product

---

## Output Interface

```typescript
interface BrandingOutput {
  cover_image: string;           // URL/path to generated cover image
  thumbnails: string[];          // Multiple size/variant thumbnails
  product_description: string;   // HTML formatted for marketplace
  seo_title: string;             // Optimised title for search
  tags: string[];                // Marketplace tags for discoverability
  faq: Array<{
    question: string;
    answer: string;
  }>;
}
```

---

## Cover Image Generation
- **Technology:** DALL-E or Stable Diffusion API
- Style: Clean, professional, product-focused
- Formats: Cover image + multiple thumbnail sizes

---

## Copywriting Principles

| Principle | Description |
|-----------|-------------|
| Outcome-focused | Describe what the buyer *gets*, not what the product *is* |
| Specific | Use numbers, timeframes, concrete results |
| Niche-aware | Speak directly to the target persona |
| SEO-ready | Title must include primary search keyword |

### Copy structure:
1. **Hook** — One-line outcome statement
2. **Who it's for** — Target persona
3. **What's inside** — Bullet list of key contents
4. **Why it's different** — Unique positioning
5. **FAQ** — Answer top 5 buyer objections

---

## SEO Title Formula
```
[Keyword] + [Niche Modifier] + [Value Word]
Examples:
- "ADHD Daily Planner for Remote Workers — Printable PDF Bundle"
- "Freelance Contract Templates Pack — 12 Editable Legal Documents"
```

---

## Tag Strategy
- 5–10 tags per listing
- Mix: broad category + specific niche + use-case
- Example: `planner`, `adhd`, `remote work`, `printable`, `productivity`, `digital download`

---

## Notes
- Copy should read as if written by a human expert, not an AI
- Product description is HTML-formatted for Gumroad/Etsy rich text fields
- Output feeds directly into the **Listing Agent**
- Cover image + thumbnail paths must be confirmed uploaded to storage before listing proceeds
