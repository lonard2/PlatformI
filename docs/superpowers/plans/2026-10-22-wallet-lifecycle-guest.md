# Wallet Reservation Lifecycle and Guest Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell intercity tickets as wallet reservations with code and QR, viewable and cancellable with success, waiting, failed, and refund flows, including logged-out guests.

**Architecture:** Extend the Ticket model with guest and lifecycle fields, harden the ticketing APIs around a bare-minimal reservation contract, and unify the wallet UI with a dedicated guest lookup path keyed by code plus phone.

**Tech Stack:** Prisma with SQLite, Next.js App Router API routes, React with DynamicQRCode, Vitest.

**Spec:** docs/superpowers/specs/2026-10-22-intercity-gateway-ticketing-design.md (§2 goals, §3 non-goals, §6.2 guest flow, §6.7 wallet contract)

## Global Constraints
- Zero placeholder stubs: every function, component, type, and endpoint fully implemented.
- Zero raw emojis: Lucide SVG icons only.
- Strict TypeScript typing: no `any` types; domain models typed via `src/types/transit.ts`.
- Six-locale i18n (en, id, ja, zh, ko, ar): identical key sets, Indonesian proper nouns untranslated.
- Responsive: mobile bottom drawer, tablet split-view, desktop multi-column.
- Verify before every push: `npx tsc --noEmit`, `npm test`, `git diff --check`; one commit per task with push to `origin main`.

## Review Focus
- A guest who bought logged out sees ticket info by code plus phone but never sees saved card details; expect payment fields absent for guests.
- A refunded ticket cannot be scanned at the gate; expect the QR validation endpoint to reject it with a clear reason.
- A duplicate purchase click does not create two reservations; expect idempotent ticket numbers per buyer plus trip plus date.
- A ja-locale guest sees reservation states and lookup labels localized; expect no hardcoded English in new JSX.
- A support lookup with phone plus trip date plus ID plus operator narrows to one ticket; expect no cross-guest leakage when two guests share a phone number.

---

### Task 1: Ticket model extension for guests and lifecycle states

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/transit.ts`
- Test: `tests/wallet-lifecycle.test.ts`

**Interfaces:**
- Consumes: existing `Ticket` and `TicketStatus`.
- Produces: `TicketStatus` extended with `"WAITING" | "FAILED" | "REFUNDED"`; `Ticket` extended with `guestEmail?: string; guestPhone?: string; idNumber?: string; seatId?: string; serviceClass?: string; reservationCode: string; claimedByUserId?: string | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
describe("wallet lifecycle model", () => {
  it("supports waiting, refunded, and guest claim fields", async () => {
    const m = await import("@/types/transit");
    const t: m.Ticket = m as unknown as m.Ticket;
    expect(t).toBeDefined();
  });
});
```

Refine to assert the new status union members and guest fields exist at type level.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wallet-lifecycle.test.ts`
Expected: FAIL (fields missing).

- [ ] **Step 3: Implement Prisma `Ticket` changes plus TypeScript types with exact names above; run `npx prisma validate` and `npx prisma generate`**

Payment credentials are never added to the model by design.

- [ ] **Step 4: Run test plus Prisma validate to verify**

Run: `npx vitest run tests/wallet-lifecycle.test.ts` (PASS); `npx prisma validate` (clean); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/types/transit.ts tests/wallet-lifecycle.test.ts
git commit -m "feat(wallet): guest and lifecycle ticket fields"
```

### Task 2: Reservation APIs with success, waiting, failed, and refund flows

**Files:**
- Modify: `src/app/api/ticketing/purchase/route.ts`
- Modify: `src/app/api/ticketing/validate/route.ts`
- Create: `src/app/api/ticketing/refund/route.ts`
- Create: `src/app/api/ticketing/guest-lookup/route.ts`
- Test: `tests/wallet-lifecycle.test.ts` (API cases)

**Interfaces:**
- Consumes: extended `Ticket` from Task 1; buyer record from the ticket-hub plan.
- Produces: `POST /api/ticketing/purchase -> { ticketNumber, reservationCode, status }` idempotent per buyer plus trip plus date; `POST /api/ticketing/refund -> { status: "REFUNDED" }` rejecting already-completed gate scans; `GET /api/ticketing/guest-lookup?code=&phone= -> { ticket }` with no payment data; `POST /api/ticketing/validate` rejects `REFUNDED`, `FAILED`, and `EXPIRED` with a reason.

- [ ] **Step 1: Write the failing test**

```ts
it("refuses to validate a refunded ticket", async () => {
  const res = await validateTicket({ ticketNumber: "TKT-REFUNDED-01" });
  expect(res.valid).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wallet-lifecycle.test.ts`
Expected: FAIL (refund flow missing).

- [ ] **Step 3: Implement purchase idempotency, waiting and failed states, refund transition, and guest lookup returning ticket info only (PDF and email handoff reuse `ticketNumber` and `reservationCode`)**

Logged-out purchases create unclaimed tickets with `userId` set to a guest marker and `guestPhone` plus `guestEmail` recorded; claiming sets `claimedByUserId` on later login.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/wallet-lifecycle.test.ts tests/ticketing.test.ts` (PASS); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ticketing/purchase/route.ts src/app/api/ticketing/validate/route.ts src/app/api/ticketing/refund/route.ts src/app/api/ticketing/guest-lookup/route.ts tests/wallet-lifecycle.test.ts
git commit -m "feat(wallet): reservation lifecycle and guest lookup APIs"
```

### Task 3: Wallet UI with guest lookup and QR states

**Files:**
- Modify: `src/components/ticketing/DigitalPassWallet.tsx`
- Modify: `src/components/ticketing/DynamicQRCode.tsx`
- Create: `src/components/ticketing/GuestTicketLookup.tsx`
- Test: `tests/wallet-ui.test.tsx`

**Interfaces:**
- Consumes: reservation APIs from Task 2.
- Produces: `<GuestTicketLookup onFound={(ticket) => void} />` accepting code plus phone with support fallback fields (trip date, ID, operator plus journey and route name); wallet shows success, waiting, failed, and refunded states with matching QR behavior.

- [ ] **Step 1: Write the failing test**

```tsx
it("finds a guest ticket by code plus phone", () => {
  render(<GuestTicketLookup onFound={() => {}} />);
  expect(screen.getByLabelText(/ticket code/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wallet-ui.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement `GuestTicketLookup.tsx` plus wallet state rendering; QR renders only for active reservations and shows the refunded or expired reason otherwise**

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/wallet-ui.test.tsx` (PASS); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/DigitalPassWallet.tsx src/components/ticketing/DynamicQRCode.tsx src/components/ticketing/GuestTicketLookup.tsx tests/wallet-ui.test.tsx
git commit -m "feat(wallet): guest lookup and reservation states in UI"
```
