# Phase 5 — Finished trust path

**Goal:** close the crowdsource loop — members flag bad reports, flagged
reports quietly count less but stay visible, OCC dismisses or removes with
a recorded outcome, members see their own standing.

**Conventions (all tasks):** TDD RED→GREEN per task; strict TS, no `any`;
zero emoji; each task = own commit + push to `origin main`; verify (`tsc`,
full suite, `impeccable detect --json`, `git diff --check`); 6-locale
parity on user-copy changes; `dev.db` never committed.

**Design lock (from the robustness spec + identity matrix):**
- Flagging is member-only (one flag per member per report, rate-limited);
  guests may report but not flag — flag brigading must cost an account.
- Down-weight is quiet and universal: at ≥2 distinct-member flags the
  report's aggregation weight ×0.25 (verified reporters get no immunity);
  the report stays visible in the feed.
- OCC closes the loop per report: dismiss (flags cleared, weight
  restored) or remove (existing hard delete, flags cascade).
- Standing is derived, never stored: submitted/active/flagged counts from
  live rows; removed = submitted − active. No tombstones, no retention.

## Schema (both dialects, parity test stays green)

- `CrowdsourceCheckIn.flagCount Int @default(0)` — distinct-member flags.
- `CrowdsourceFlag`: `id`, `checkInId` FK cascade, `memberId`,
  `reason String`, `createdAt`, `@@unique([checkInId, memberId])`.

---

### Task 1: Flag endpoint + quiet down-weight in aggregation

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`,
  `src/app/api/crowdsource/flag/route.ts` (new: POST flag, DELETE dismiss),
  `src/app/api/crowdsource/checkin/route.ts` (aggregation × weight factor),
  `src/app/api/crowdsource/feed/route.ts` (`flagged` boolean, no counts),
  `src/lib/services/memberTrust.ts` (threshold + factor constants).
- Test: `tests/crowdsource-flags.test.ts`.

**Interfaces:**
- Consumes: `requireMember`, `reporterWeightFor`, `db`.
- Produces: POST flag → 201 (idempotent replay for same member+report);
  401 anonymous; 429 over rate; aggregation multiplies
  `weight × (flagCount ≥ 2 ? 0.25 : 1)`; feed exposes `flagged`.

- [ ] **Step 1: Write the failing test** — flag without session 401;
  member flags → flagCount 1, weight unchanged; second distinct member
  flags → weight quarters in the vehicle aggregate; duplicate flag
  idempotent; feed marks `flagged` without counts.
- [ ] **Step 2: Run test to verify it fails** — missing table/route.
- [ ] **Step 3: Implement** — migrate both dialects (`db push` sqlite +
  pg), wire aggregation + feed.
- [ ] **Step 4: Verify** — new test + `tsc` + full suite.
- [ ] **Step 5: Commit** — `feat(trust): flag reports with quiet down-weight` + push.

### Task 2: OCC flag queue closes the loop

**Files:**
- Modify: `src/app/api/crowdsource/flags/route.ts` (new operator-only
  GET queue: flagged reports with reasons + counts), fleet board queue
  section (add dismiss alongside remove), `DELETE /api/crowdsource/flag`
  restricted to operators for dismiss.
- Test: extend `tests/crowdsource-flags.test.ts` (queue 401/200, dismiss
  restores weight, remove cascades flags) + board interaction test.

**Interfaces:**
- Consumes: Task 1 flag rows, `requireOperator`.
- Produces: queue lists only flagCount > 0; dismiss deletes flags and
  restores weight; remove path unchanged (cascade).

- [ ] **Step 1–5:** same loop. Commit — `feat(trust): OCC flag review queue` + push.

### Task 3: Member standing in the account panel

**Files:**
- Modify: `src/app/api/members/reports/route.ts` (new member-only GET:
  own reports with flag status + derived counts), `MemberAccountPanel`
  standing section, i18n ×6.
- Test: `tests/member-standing.test.ts` — own reports listed with flagged
  state and reasons; other members' reports invisible; anonymous 401.

**Interfaces:**
- Consumes: `requireMember`, flag rows.
- Produces: `{ reports: [{ id, vehicleId, crowdLevel, timestamp,
  flagCount, flagged }], submitted, active, flagged }`; panel copy states
  removal is final and standing recovers with new reports.

- [ ] **Step 1–5:** same loop. Commit — `feat(trust): member report standing` + push.

---

## Self-Review

1. **Spec coverage:** Goal 4 trust path — authorized writes (Phase 4),
   anti-gaming (Task 1: member-only + unique + rate-limited flags),
   OCC moderation closing the loop (Task 2: dismiss/remove with recorded
   outcome = flags cleared vs rows deleted), standing/appeal visibility
   (Task 3).
2. **Out of scope:** appeal-reversal workflow (dismiss IS the reversal),
   report tombstones, guest flagging, new regions/data.
3. **Review focus:** Task 1 idempotent duplicate flags; threshold edge
   (exactly 2); verified reporters down-weighted equally; feed never
   leaks flag counts or flagger identities.
4. **Proportion:** plan names interfaces + test files, no bodies.
