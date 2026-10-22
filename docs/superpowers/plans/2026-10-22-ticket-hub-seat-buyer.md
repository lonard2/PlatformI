# Ticket Hub, Seat Maps, and Per-Mode Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers find intercity trips by search or board, pick class and seat on a per-vehicle map, and check out with a strict per-mode form that never shows fake choices.

**Architecture:** Add a search-first ticket hub reusing the existing purchase modal and wallet; introduce a data-driven sales matrix plus per-vehicle seat-map components and a buyer form with account prefill and manual fallback.

**Tech Stack:** Next.js 16 App Router, React, Zustand, Vitest, framer-motion, Lucide icons.

**Spec:** docs/superpowers/specs/2026-10-22-intercity-gateway-ticketing-design.md (§6.2 ticket hub, §6.3 buyer, §6.4 seat and class, §6.5 per-mode matrix)

## Global Constraints
- Zero placeholder stubs: every function, component, type, and endpoint fully implemented.
- Zero raw emojis: Lucide SVG icons only.
- Strict TypeScript typing: no `any` types; domain models typed via `src/types/transit.ts`.
- Six-locale i18n (en, id, ja, zh, ko, ar): identical key sets, Indonesian proper nouns untranslated.
- Responsive: mobile bottom drawer, tablet split-view, desktop multi-column.
- Verify before every push: `npx tsc --noEmit`, `npm test`, `git diff --check`; one commit per task with push to `origin main`.

## Review Focus
- A KAI economy buyer never sees meal or drop-off fields; expect them absent from the DOM, not merely hidden.
- An AKAP buyer sees terminal and agen pickup only; expect no free-text address field in the DOM.
- A shuttle buyer sees drop-off as a fixed operator list; expect an invalid custom address to be unsubmittable.
- A ja-locale buyer sees seat, class, meal, and baggage labels localized; expect no hardcoded English in new JSX.
- A blocked seat cannot be selected by click or keyboard; expect focusable available seats only.

---

### Task 1: Data-driven per-mode sales matrix

**Files:**
- Create: `src/lib/transit/salesMatrix.ts`
- Test: `tests/sales-matrix.test.ts`

**Interfaces:**
- Consumes: `TransitMode` from `src/types/transit.ts`.
- Produces: `getSalesRules(mode: TransitMode, serviceClass?: string) -> { seatMap: boolean; meal: "included" | "paid" | "none"; baggage: "included" | "paid" | "none"; dropOff: "operator-list" | "none"; idRequired: boolean }`; `OPERATOR_POINT_LISTS: Record<string, string[]>`.

Rules pinned from spec: rail has no drop-off ever; Argo Executive meal is paid not free (only Luxury and Suite include it); LCC flight meal and baggage are paid while full-service includes them; AKAP has no door drop-off; shuttle drop-off is operator-list only.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getSalesRules } from "@/lib/transit/salesMatrix";
describe("sales matrix", () => {
  it("gives rail no drop-off and Argo Executive no free meal", () => {
    expect(getSalesRules("KAI_INTERCITY", "Eksekutif").dropOff).toBe("none");
    expect(getSalesRules("KAI_INTERCITY", "Eksekutif").meal).toBe("paid");
    expect(getSalesRules("KAI_INTERCITY", "Luxury").meal).toBe("included");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sales-matrix.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Implement `src/lib/transit/salesMatrix.ts` with the exact signature above and a lookup covering rail, Whoosh, LCC flight, full-service flight, AKAP, shuttle, PELNI, and speedboat**

Unknown future modes default to the strictest safe rule: seat map on, meal none, drop-off none, ID required.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sales-matrix.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transit/salesMatrix.ts tests/sales-matrix.test.ts
git commit -m "feat(ticket): per-mode sales matrix"
```

### Task 2: Per-vehicle visual seat and deck maps

**Files:**
- Create: `src/components/ticketing/SeatMap.tsx`
- Test: `tests/seat-map.test.tsx`

**Interfaces:**
- Consumes: `getSalesRules` from Task 1; seat layout for bus 2-2, sleeper 1-1-1, train coach, flight rows, ship deck.
- Produces: `<SeatMap vehicleType={string} occupiedSeatIds={string[]} selectedSeatId={string | null} onSelect={seatId: string) => void} />` with keyboard-operable available seats and blocked seats unfocusable.

- [ ] **Step 1: Write the failing test**

```tsx
it("blocks occupied seats from selection", () => {
  render(<SeatMap vehicleType="AKAP_2_2" occupiedSeatIds={["1A"]} selectedSeatId={null} onSelect={() => {}} />);
  expect(screen.getByLabelText(/1A/)).toHaveAttribute("aria-disabled", "true");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seat-map.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement `SeatMap.tsx` with SVG or button-grid seats, class-driven layout switching, and locale-aware labels via existing `vehicleLabels` helpers**

Class change re-renders the map and price input; never allow selecting a blocked seat.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seat-map.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/SeatMap.tsx tests/seat-map.test.tsx
git commit -m "feat(ticket): visual seat and deck maps"
```

### Task 3: Buyer form with account prefill and manual fallback

**Files:**
- Create: `src/components/ticketing/BuyerForm.tsx`
- Test: `tests/buyer-form.test.tsx`

**Interfaces:**
- Consumes: `getSalesRules` from Task 1 (for conditional ID, meal, drop-off visibility).
- Produces: `<BuyerForm prefill={{ fullName?, phone?, email? }} mode={TransitMode} serviceClass={string} onValid={(buyer) => void} />` where buyer is `{ fullName: string; phone: string; email: string; sex?: string; address?: string; idNumber?: string; meal?: string; prayerNote?: string; dropOffPointId?: string }`.

Validation pinned: full name, phone, and email always required; ID required exactly when the matrix says so; drop-off value must come from the operator list, never free text.

- [ ] **Step 1: Write the failing test**

```tsx
it("requires email and blocks custom drop-off", () => {
  render(<BuyerForm mode="EXECUTIVE_SHUTTLE" serviceClass="VIP" onValid={() => {}} />);
  expect(screen.getByLabelText(/email/i)).toBeRequired();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/buyer-form.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement `BuyerForm.tsx` with account prefill, manual fallback, and strict per-mode field visibility (rail never renders drop-off; AKAP never renders address-as-drop-off)**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/buyer-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/BuyerForm.tsx tests/buyer-form.test.tsx
git commit -m "feat(ticket): buyer form with prefill and fallback"
```

### Task 4: Search-first intercity ticket hub reusing purchase modal and wallet

**Files:**
- Create: `src/components/ticketing/IntercityTicketHub.tsx`
- Modify: `src/components/ticketing/TicketPurchaseModal.tsx` (accept intercity run preselect)
- Test: `tests/ticket-hub.test.tsx`

**Interfaces:**
- Consumes: `/api/intercity/routes` lookup; `SeatMap` from Task 2; `BuyerForm` from Task 3; `getSalesRules` from Task 1.
- Produces: `<IntercityTicketHub initialMode?: TransitMode />` with mode, company, origin, destination, and date filters feeding the same checkout and wallet as city tickets.

- [ ] **Step 1: Write the failing test**

```tsx
it("searches by mode and company then opens checkout", () => {
  render(<IntercityTicketHub />);
  expect(screen.getByLabelText(/mode/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ticket-hub.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement `IntercityTicketHub.tsx` with the 1-trip, 2-class-and-seat, 3-buyer, 4-wallet step flow; board entry preselects the run, search entry starts from filters**

Search stays open without login; checkout collects the buyer record from Task 3.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/ticket-hub.test.tsx tests/sales-matrix.test.ts` (PASS); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/ticketing/IntercityTicketHub.tsx src/components/ticketing/TicketPurchaseModal.tsx tests/ticket-hub.test.tsx
git commit -m "feat(ticket): search-first intercity ticket hub"
```
