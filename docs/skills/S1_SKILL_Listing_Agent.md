# SKILL: Listing Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Publish products to Gumroad and/or Etsy marketplaces  
**Trigger:** After Brand & Packaging Agent delivers BrandingOutput

---

## Supported Platforms
- **Gumroad** — Primary (digital downloads, instant delivery)
- **Etsy** — Secondary (broader discovery, digital product category)

---

## Gumroad Listing Function

```typescript
async function createGumroadListing(product: Product, branding: BrandingOutput) {
  const listing = await gumroadAPI.products.create({
    name: branding.seo_title,
    description: branding.product_description,
    price: product.price * 100,               // Gumroad uses cents
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
```

---

## Pre-Listing Checklist
Before publishing, agent verifies:

- [ ] Product file URL is valid and accessible
- [ ] Cover image is uploaded and URL resolves
- [ ] SEO title is within platform character limits
- [ ] Description is HTML-formatted correctly
- [ ] Price is set (in cents for Gumroad)
- [ ] Tags are within platform limits
- [ ] License/compliance notes are logged

---

## Post-Listing Actions
1. Store `platform_listing_id` and live URL in `listings` table
2. Set listing `status = 'live'`
3. Trigger **Optimization Agent** to begin baseline tracking
4. Log creation event with timestamp

---

## Database Write (listings table)

```sql
INSERT INTO listings (
  product_id,
  platform,
  platform_listing_id,
  url,
  tags,
  seo_title,
  thumbnail_url,
  status
) VALUES (...)
```

---

## Notes
- Agent does **not** list products with confidence score < 8 — these route to approval queue first
- Multi-platform listing (both Gumroad + Etsy) is recommended from Day 1 for risk diversification
- Output feeds directly into the **Optimization Agent** for A/B testing
