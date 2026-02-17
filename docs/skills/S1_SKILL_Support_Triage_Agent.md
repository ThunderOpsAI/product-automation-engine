# SKILL: Support Triage Agent

**System:** 1 — Digital Arbitrage Factory  
**Mission:** Auto-respond to simple support requests, process refunds, escalate complex issues  
**Trigger:** On every incoming customer support message

---

## Output Interface

```typescript
interface SupportOutput {
  action: 'auto_respond' | 'refund' | 'escalate';
  response?: string;           // Message sent to customer
  refund_amount?: number;      // Amount refunded (in dollars)
  escalation_reason?: string;  // Why it was escalated to human
}
```

---

## Decision Tree

```
Incoming support message
        │
        ├── Is it a simple how-to question?
        │         └── YES → auto_respond with canned + AI answer
        │
        ├── Is it a refund request?
        │         ├── < 7 days since purchase → refund (no questions asked)
        │         └── ≥ 7 days → escalate to human
        │
        ├── Is it a technical issue?
        │         └── escalate to human
        │
        └── Is it an angry/complaint message?
                  └── escalate to human
```

---

## Auto-Respond Cases

| Trigger | Response Type |
|---------|--------------|
| "How do I download?" | Resend download link + instructions |
| "What format is this?" | State file types included |
| "Is this compatible with X?" | State compatibility info from product docs |
| "I haven't received my file" | Resend delivery email + Gumroad link |

---

## Auto-Refund Policy
- **< 7 days** from purchase date: Full refund, no questions asked
- Refund is processed via Gumroad/Stripe API automatically
- Customer receives automated confirmation email
- Sale is updated in `sales` table with `refunded = TRUE`

---

## Escalation Cases
Escalate to human approval queue when:
- Refund request is **≥ 7 days** after purchase
- Customer is expressing anger or threatening dispute/chargeback
- Technical issue that can't be resolved with standard docs
- Request doesn't fit any known category (unknown edge case)

---

## Escalation Format
```typescript
{
  action: 'escalate',
  escalation_reason: 'Customer requesting refund 14 days post-purchase, claiming product was misrepresented',
  original_message: '...',
  customer_id: '...',
  purchase_date: '...',
  purchase_amount: 29.00
}
```

---

## Notes
- Every interaction (auto or escalated) is logged with timestamp and outcome
- Auto-responses are reviewed monthly for quality — update templates as needed
- Target: ≥ 80% of support tickets resolved without human intervention
- Escalation rate > 20% is a signal to improve product documentation or listing clarity
