# Phase 3: Finished Money Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intercity tickets move real money through a complete, idempotent lifecycle — reservation → OCC-confirmed payment → fulfillment → refund — while urban stays an honest quote-only flow.

**Architecture:** A `PaymentProvider` interface with `createCharge` / `confirmPayment` / `refundPayment` plus a shared webhook envelope; `ManualSettlementProvider` as the first real implementation (commuter pays off-app, OCC finance confirms with a proof reference). PSP adapters (Midtrans/Xendit/Stripe) plug the same interface later without touching lifecycle code. New `FINANCE_OFFICER` (confirm payments, issue refunds) and `FINANCE_SUPERVISOR` (approve refunds ≥ Rp500.000) operator roles gate every money mutation; every money state change writes an audit entry.

**Tech Stack:** Next.js 16 App Router routes, Prisma 7 (Postgres primary, SQLite dev parity), HMAC operator sessions (existing `adminAuthService`), `tsx` verification scripts, vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-platformi-robustness-design.md` (Phase 3 + Q1a intercity-first, Q2 guest + member flows, Phase 0 Postgres decision). User decisions: option (1) provider-abstraction + OCC-confirmed settlement; dedicated finance roles; guest purchase stays; urban keeps visible purchase windows.

## Global Constraints

- Zero placeholder stubs; zero emojis (Lucide only); strict TypeScript, no `any`.
- TDD with RED→GREEN per task; each task ships as its own commit + push to `origin main`.
- Verify before push: `npx tsc --noEmit`, `npm test`, `impeccable detect --json` on touched files, `git diff --check`.
- 6-locale i18n parity when user-facing copy changes.
- No real PSP keys in the repo; sandbox credentials (if ever added) come from the operator, never committed.
- Never invent operator identities: new finance operators ship exactly like existing ones (registry entries in `adminAuthService`, credentials supplied by the operator).
- `dev.db` ignored and untouched by commits; shared-DB test norms hold (clean up created rows in `afterEach`).

## Review Focus

- Double charging: the same money must never confirm twice — idempotency key + `paidAt` guard must both hold, even on retry storms.
- Money without authorization: every confirm/refund path must reject non-finance roles, including direct API calls that bypass the UI.
- Refund of a used ticket: gate-scanned (`gateScannedAt` set / `COMPLETED`) tickets must stay non-refundable even for finance roles.
- Silent urban "purchases": after this phase no code path may mark an urban ticket `ACTIVE` without a completed payment.
- Stale OCC queues: the finance queue must never show already-paid/refunded tickets as actionable (stale-read double confirm).

## File Structure

- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma` (Ticket += `paymentStatus`, `paidAt`, `paymentRef`, `paymentMethod`, `idempotencyKey? @unique`, `refundReason?`, `refundedAt?`; keep everything else byte-identical)
- Create: `src/lib/ticketing/paymentProvider.ts` (interface + shared types + webhook envelope validation)
- Create: `src/lib/ticketing/manualSettlementProvider.ts` (OCC-confirmed implementation)
- Create: `src/app/api/ticketing/webhook/[provider]/route.ts` (shared envelope → provider dispatch)
- Modify: `src/app/api/ticketing/purchase/route.ts` (Idempotency-Key header support; never auto-marks paid)
- Modify: `src/app/api/ticketing/refund/route.ts` (finance-role gate + supervisor threshold + audit entries)
- Modify: `src/lib/services/adminAuthService.ts` (FINANCE_OFFICER, FINANCE_SUPERVISOR roles + registry entries with operator-supplied credentials)
- Create: `src/app/admin/finance/page.tsx` (unpaid queue + confirm/reject; refund list with supervisor approval)
- Modify: `src/components/ticketing/IntercityTicketHub.tsx` (WAITING → payment instructions → polling → ACTIVE)
- Modify: `src/components/ticketing/TicketPurchaseModal.tsx` (urban becomes reserve/quote-only; no ACTIVE without payment)
- Create tests: `tests/ticketing-idempotency.test.ts`, `tests/ticketing-manual-settlement.test.ts`, `tests/ticketing-finance-authz.test.ts`, `tests/ticketing-urban-quote.test.ts`

---

### Task 1: Money model + explicit idempotency keys

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`
- Modify: `src/app/api/ticketing/purchase/route.ts`
- Test: `tests/ticketing-idempotency.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces: `Ticket` carries `paymentStatus: "UNPAID" | "PAID" | "REFUNDED"`, `paidAt: Date | null`, `paymentRef: string | null`, `paymentMethod: string | null`, `idempotencyKey: string | null @unique`, `refundReason: string | null`, `refundedAt: Date | null`. `POST /api/ticketing/purchase` accepts optional `Idempotency-Key` header; a repeated key returns the original ticket with `idempotentReplay: true` and creates nothing new.

- [ ] **Step 1: Write the failing test**

```ts
describe("ticketing idempotency", () => {
  it("replays the same ticket for a repeated Idempotency-Key without creating a second row", async () => {
    const key = `idem-${Date.now()}`;
    const first = await purchase({ ...validIntercityBody, idempotencyKey: key });
    const second = await purchase({ ...validIntercityBody, idempotencyKey: key });
    expect(second.status).toBe(201);
    expect(second.json.idempotentReplay).toBe(true);
    expect(second.json.ticketNumber).toBe(first.json.ticketNumber);
    expect(await db.ticket.count({ where: { idempotencyKey: key } })).toBe(1);
  });
  it("rejects a reused key with a conflicting payload", async () => {
    // same key, different totalFareRp → 409, no new row
  });
});
```

(Concrete valid body: one intercity leg, e.g. KAI_INTERCITY virtual refs, smallest viable fixture. Clean up created tickets in `afterEach`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticketing-idempotency.test.ts`
Expected: FAIL (no `idempotencyKey` column; header ignored).

- [ ] **Step 3: Add the columns and the header contract**

Add the six fields to `Ticket` in both schema files (identical blocks; parity test covers). `prisma db push` both dialects. Purchase route: read `Idempotency-Key` header; on hit, return stored ticket with `idempotentReplay: true`; on miss with a *conflicting* payload for a used key, 409; store the key at creation. Never mark paid here.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/ticketing-idempotency.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, suite green.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/schema.postgresql.prisma src/app/api/ticketing/purchase/route.ts tests/ticketing-idempotency.test.ts
git commit -m "feat(ticketing): idempotency keys on purchase"
git push origin main
```

---

### Task 2: Provider abstraction + manual settlement

**Files:**
- Create: `src/lib/ticketing/paymentProvider.ts`, `src/lib/ticketing/manualSettlementProvider.ts`
- Create: `src/app/api/ticketing/webhook/[provider]/route.ts`
- Test: `tests/ticketing-manual-settlement.test.ts` (pure unit tests of the provider + webhook dispatch; no network)

**Interfaces:**
- Consumes: Task 1 (ticket identity + idempotency).
- Produces: `PaymentProvider { id: "manual" | string; createCharge(input): { paymentRef, instructions, amountRp, expiresAt }; confirmPayment(ref, proof, actor): TicketUpdate; refundPayment(ref, reason, actor): TicketUpdate }` where `TicketUpdate = { paymentStatus, paidAt?, refundedAt?, refundReason? }`. Webhook route validates a shared envelope `{ provider, event, payload, signature? }` and dispatches to the registered provider; unknown provider → 404, malformed envelope → 400 (both covered by tests).

- [ ] **Step 1: Write the failing test**

```ts
describe("manual settlement provider", () => {
  it("creates a charge with human-readable transfer instructions", ...);
  it("confirms only with a finance actor and a proof reference", ...); // non-finance actor throws
  it("refuses double confirmation (already PAID stays PAID, single paidAt)", ...);
  it("refunds an unused ticket and blocks refunds after gate scan", ...);
  it("webhook route rejects unknown providers and malformed envelopes", ...); // via route handler with Request objects
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticketing-manual-settlement.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the interface, the manual provider, and the webhook route**

Pure functions wherever possible; the provider never touches `db` directly — it returns `TicketUpdate` objects and the route applies them. Manual confirmation requires `role` to be finance-gated by the caller (route checks `requireFinanceRole`, see Task 3; the provider itself validates the actor argument). PSP adapter slot documented in a code comment with the exact interface a future adapter must satisfy.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/ticketing-manual-settlement.test.ts && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ticketing/paymentProvider.ts src/lib/ticketing/manualSettlementProvider.ts "src/app/api/ticketing/webhook/[provider]/route.ts" tests/ticketing-manual-settlement.test.ts
git commit -m "feat(ticketing): payment provider abstraction with manual settlement"
git push origin main
```

---

### Task 3: Finance roles + OCC finance queue + gated refund

**Files:**
- Modify: `src/lib/services/adminAuthService.ts` (FINANCE_OFFICER, FINANCE_SUPERVISOR + registry entries; credentials supplied by the operator — never hardcoded test secrets in committed code)
- Create: `src/app/api/admin/finance/confirm/route.ts`, `src/app/api/admin/finance/refunds/route.ts` (or extend existing refund route — implementer picks the narrower diff)
- Create: `src/app/admin/finance/page.tsx` (unpaid intercity queue + confirm/reject; refunds list with supervisor approval path)
- Test: `tests/ticketing-finance-authz.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: `requireFinanceRole(req, action: "confirm" | "refund")` helper; refunds ≥ Rp500.000 require FINANCE_SUPERVISOR; every money state change writes an audit entry (existing shift/audit log mechanism — verify which one during implementation).

- [ ] **Step 1: Write the failing test**

```ts
describe("finance authorization", () => {
  it("rejects confirmPayment from non-finance roles", ...); // e.g. LINE_CONTROLLER → 403
  it("allows FINANCE_OFFICER to confirm an UNPAID intercity ticket", ...);
  it("requires FINANCE_SUPERVISOR for refunds at or above Rp500.000", ...);
  it("still blocks refunds after gate scan, even for finance roles", ...);
  it("writes an audit entry for every confirm/refund", ...);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticketing-finance-authz.test.ts`
Expected: FAIL (roles/endpoints do not exist).

- [ ] **Step 3: Implement roles, gates, queue, and audited refund**

Wire the existing OCC refund two-step (scanner page: lookup → confirm) to the gated path rather than duplicating it — extend where narrower, replace only if the old path cannot carry actor + audit fields.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/ticketing-finance-authz.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/adminAuthService.ts src/app/api/admin/finance src/app/admin/finance "src/app/(admin-routes-touched)" tests/ticketing-finance-authz.test.ts
git commit -m "feat(ticketing): finance roles and OCC finance queue"
git push origin main
```

---

### Task 4: Intercity money flow end-to-end (guest + member)

**Files:**
- Modify: `src/components/ticketing/IntercityTicketHub.tsx`
- Test: extend `tests/ticketing-manual-settlement.test.ts` or new `tests/ticketing-intercity-flow.test.ts` (component-level: reserve → instructions → paid status after OCC confirm, for guest and member)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: hub creates WAITING reservations (never ACTIVE without payment); shows transfer instructions with the reservation code; polls status until OCC confirms; guest flow works with lookup code + phone; member flow attaches `claimedByUserId` (already wired in Phase 2.5).

- [ ] **Step 1: Write the failing test**

Component/integration test proving: reserve → status stays WAITING (not ACTIVE), instructions render the payment ref, and a simulated OCC confirm (via the finance endpoint with a finance session) flips it to ACTIVE and the UI reflects it — once for a guest purchase, once for a member purchase.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticketing-intercity-flow.test.ts`
Expected: FAIL (no payment step exists; reservations go straight to ACTIVE).

- [ ] **Step 3: Implement the hub payment step**

No auto-ACTIVE on create. Keep `claimedByUserId` behavior untouched.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/ticketing-intercity-flow.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/IntercityTicketHub.tsx tests/ticketing-intercity-flow.test.ts "src/lib/i18n (if copy changed)"
git commit -m "feat(ticketing): intercity reserve-then-pay flow for guest and member"
git push origin main
```

---

### Task 5: Urban goes quote-only (no money without payment)

**Files:**
- Modify: `src/components/ticketing/TicketPurchaseModal.tsx`
- Test: `tests/ticketing-urban-quote.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: urban purchases create WAITING reservations (quotes) and never ACTIVE; the modal's simulated instant-payment methods become a visible "Reserve / get quote" action with honest copy (new i18n keys ×6).

- [ ] **Step 1: Write the failing test**

Assert: urban purchase returns WAITING (not ACTIVE), no `paidAt` set, wallet shows the quote state; the modal offers reserve/quote, not instant payment.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticketing-urban-quote.test.ts`
Expected: FAIL (urban currently mints ACTIVE tickets).

- [ ] **Step 3: Implement the quote-only flow**

Remove the simulated instant-payment path; keep every existing purchase window/entry point visible (per decision: windows stay, money doesn't move). Copy changes need ×6 i18n + types.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/ticketing-urban-quote.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/TicketPurchaseModal.tsx tests/ticketing-urban-quote.test.ts "src/lib/i18n (if copy changed)"
git commit -m "fix(ticketing): urban purchases are quotes, never paid tickets"
git push origin main
```

---

## Self-Review

1. **Spec coverage**: Phase 1 (GTFS freshness) and Phase 2 (honest commuter surface + crowdsource trust display) are prior plans, not this one — no overlap. Phase 3 scope (money path, intercity-first, guest + member, Postgres already done in Phase 0, authZ hardening belongs to Phase 4 except finance gates which *are* this phase): every Phase 3 design-doc bullet maps to a task above. Urban quote-only + windows-visible matches the "all modes purchasable or at least have purchase windows" ruling (windows now, money later).
2. **Step scan**: each step is one checkable action (write test / run-expect-FAIL / implement / run-expect-PASS / commit). No step asks for more than one reasonable thing.
3. **Type consistency**: `TicketUpdate { paymentStatus, paidAt?, refundedAt?, refundReason? }`, `requireFinanceRole(req, action)`, envelope `{ provider, event, payload, signature? }` — names used identically across tasks.
4. **Review Focus**: each of the 5 lines names its owning task's test (double-charge → Task 1 idempotency test; unauthorized money → Task 3 authz test; used-ticket refund → Task 3 + existing scanner test; silent urban ACTIVE → Task 5 test; stale queue → Task 3 queue test must assert already-paid/refunded tickets are not actionable).
5. **Proportion**: plan is shorter than the code it will produce (no bodies, no copy); interfaces and test names carry the decisions.

## Execution Handoff

Plan complete and saved to `.impeccable/plans/2026-10-30-phase3-money.md`. Please review the plan. Does it capture what you want? If so, say the word and I'll start Task 1 (money model + idempotency) using our native in-session workflow.
