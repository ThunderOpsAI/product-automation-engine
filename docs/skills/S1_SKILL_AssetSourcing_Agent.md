# SKILL: AssetSourcing Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Find legal source materials for product creation  
**Trigger:** After niche is approved by MarketIntel Agent

---

## Output Interface

```typescript
interface SourcePack {
  sources: Array<{
    type: 'public_domain' | 'cc0' | 'purchased' | 'original';
    url?: string;
    license: string;
    files: string[];
    quality_score: number;
  }>;
  compliance_notes: string;
  confidence_score: number;
}
```

---

## Approved Source Types

| Type | Description | Examples |
|------|-------------|---------|
| `public_domain` | No copyright, free to use | archive.org, US government publications |
| `cc0` | Creative Commons Zero — no rights reserved | Wikimedia Commons, Unsplash |
| `purchased` | Licensed assets bought by operator | Stock libraries, paid asset packs |
| `original` | Created fresh by enhancement/AI agents | Generated content, original writing |

---

## Approved Sources
- **archive.org** — Public domain texts, media, documents
- **Wikimedia Commons** — CC0 images, diagrams, datasets
- **Open source repositories** — GitHub-hosted public domain code/content
- **User-owned assets** — Operator's own purchased or created content

---

## Hard Rules
- **NEVER** use copyrighted materials without a clear, verified license
- All source materials must have a documented `license` field
- Compliance notes are required in every SourcePack output
- If `confidence_score < 7`, auto-queue for human compliance review

---

## Guardrails
- Every asset sourced must be traceable to a license URL or file
- Quality score per source must be logged
- Compliance flag triggers immediate human review before enhancement begins

---

## Notes
- Output feeds directly into the **Enhancement Agent**
- Compliance notes are stored permanently in the database for audit trail
- When in doubt, mark as `needs_approval` rather than proceeding
