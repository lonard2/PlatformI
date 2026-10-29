# Phase 2.5: Member Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in members with passkey auth, guest→member ticket claiming, and the incentive surface (verified weight, history, saved trips, cooldown relief) — the identity contract Phases 3 and 4 build on.

**Architecture:** New `Member` (+`SavedTrip`) models; WebAuthn passkey ceremonies via `@simplewebauthn/server` reusing the operator HMAC-cookie session pattern (`adminAuthService.ts`); guest tickets claimed by lookup-code + phone into `claimedByUserId`; verified weight plugs into Phase 2's `crowdTrust` as a multiplier input (no flag-rule changes).

**Tech Stack:** Prisma 7 (Postgres-first; model added to both schemas per parity rule), `@simplewebauthn/server` + browser, HMAC-SHA256 httpOnly cookies (same construction as operator sessions), vitest, 6-locale i18n.

**Spec:** `docs/superpowers/specs/2026-10-29-platformi-robustness-design.md` (Q2 identity matrix + Phase 2.5 decision: guests stay fully functional; admin/partners untouched on the operator system).

**Explicit non-goals (binding):** no password auth (nothing to hash, no reset flows); no social login / partner SSO; no migration of past crowd reports (SESSION_ID is per-tab random — unlinkable by design, stated in UI copy, not silently dropped); operator auth untouched.

## Global Constraints

- Zero placeholder stubs; zero emojis (Lucide only); strict TypeScript, no `any`.
- TDD with RED→GREEN per task; each task ships as its own commit + push to `origin main`.
- Verify before push: `npx tsc --noEmit`, `npm test`, `impeccable detect --json` on touched files, `git diff --check`.
- 6-locale i18n parity when keys change.
- No invented data; `dev.db` ignored and untouched; shared-DB test norms hold.

## Review Focus

- Session fixation: a fresh session id must be issued at login, never inherited from the anonymous visit.
- Credential replay: WebAuthn challenges single-use with expiry; counter rollback rejected.
- Claim hijacking: ticket claim requires lookup-code + phone match (existing guest-lookup rule), never phone alone.
- Cookie flags: httpOnly + Secure (prod) + SameSite=Lax on the member session cookie.
- Verified-weight gaming: multiplier capped and logged; flags still apply to verified reports (weight never grants immunity).

## File Structure

- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma` (add `Member`, `SavedTrip`; no relations beyond member→trips/tickets link via `claimedByUserId`)
- Create: `src/lib/services/memberAuthService.ts` (HMAC sessions mirroring operator pattern, member-shaped)
- Create: `src/app/api/members/register|login|logout|me/route.ts` (passkey ceremonies + session)
- Modify: `src/app/api/ticketing/purchase/route.ts` (attribute `claimedByUserId` when member session present; guests unchanged)
- Create: `src/app/api/members/claim/route.ts` (code + phone → claim)
- Modify: `src/lib/services/crowdTrust.ts` (accept reporter weight multiplier input; rules unchanged)
- Modify: `src/app/api/crowdsource/checkin|feed/route.ts` (pass member weight through; guests default weight)
- Create: `src/components/settings/MemberAccountPanel.tsx` (register/login/history/saved trips; placement inside existing settings surface)
- Create tests: `tests/member-auth.test.ts`, `tests/member-claim.test.ts`, `tests/member-incentives.test.ts`

---

### Task 1: Member model + passkey auth + sessions

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`
- Create: `src/lib/services/memberAuthService.ts`, `src/app/api/members/{register,login,logout,me}/route.ts`
- Test: `tests/member-auth.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces: `Member { id, phone?, email?, displayName, passkeyCredentialJson?, role: "MEMBER"|"PARTNER", verifiedAt?, createdAt }`; session cookie `platformi_member_session` (HMAC, httpOnly, 30-day); `requireMember(req): Member | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
// memberAuthService: createMember, startRegistration, finishRegistration,
// startLogin, finishLogin, mintSession, requireMember — mock WebAuthn
// ceremony responses, assert: session cookie set httpOnly; replayed
// challenge rejected; role defaults to MEMBER.
```

(Concrete assertions follow the existing operator-session test patterns; pin httpOnly + SameSite=Lax + 30-day expiry on the cookie, a fresh session id issued at login that differs from any pre-login cookie, and replayed-challenge rejection.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/member-auth.test.ts`
Expected: FAIL (no member module exists).

- [ ] **Step 3: Implement model, service, routes**

`Member` + `SavedTrip { id, memberId, origin, destination, label, createdAt }` in both schemas (parity test covers). `memberAuthService.ts`: HMAC session construction mirroring `adminAuthService.ts` (separate secret env, separate cookie name), WebAuthn registration/login via `@simplewebauthn/server` with single-use expiring challenges and counter checks. Routes: register (begin/finish), login (begin/finish), logout (clear cookie), me (session → profile). `db push` both dialects (sqlite always; pg when reachable per Phase 0 norms).

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/member-auth.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/schema.postgresql.prisma src/lib/services/memberAuthService.ts src/app/api/members tests/member-auth.test.ts package.json
git commit -m "feat(identity): member model with passkey auth and sessions"
git push origin main
```

---

### Task 2: Guest→member ticket claiming + purchase attribution

**Files:**
- Create: `src/app/api/members/claim/route.ts`
- Modify: `src/app/api/ticketing/purchase/route.ts`
- Test: `tests/member-claim.test.ts`

**Interfaces:**
- Consumes: Task 1 (`requireMember`).
- Produces: claim by lookup-code + phone sets `claimedByUserId`; purchase with a member session sets it at creation; guests byte-identical to today.

- [ ] **Step 1: Write the failing test**

```ts
// claim with correct code+phone transfers the ticket; wrong phone rejects;
// purchase under a member session records claimedByUserId; guest purchase
// leaves it null (existing behavior pinned).
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/member-claim.test.ts`
Expected: FAIL (no claim route).

- [ ] **Step 3: Implement claim + attribution**

Claim route: find ticket by lookup code, verify phone matches guest record, set `claimedByUserId`, return the ticket. Purchase route: when `requireMember(req)` yields a member, set `claimedByUserId` at creation. No changes to guest validation, pricing, or idempotency.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/member-claim.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/claim src/app/api/ticketing/purchase tests/member-claim.test.ts
git commit -m "feat(identity): guest ticket claiming and member attribution"
git push origin main
```

---

### Task 3: Incentive surface (verified weight, history, saved trips, cooldown relief)

**Files:**
- Modify: `src/lib/services/crowdTrust.ts`, `src/app/api/crowdsource/checkin|feed/route.ts`
- Create: `src/components/settings/MemberAccountPanel.tsx`, saved-trips endpoints (under `src/app/api/members/`)
- Test: `tests/member-incentives.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2, Phase 2 `flagReport` (rules unchanged; gains a `reporterWeight` multiplier input, guests default 1.0, verified capped at the documented constant).
- Produces: verified reports count more but never bypass flags; member sees purchase history, saved trips, cooldown relief.

- [ ] **Step 1: Write the failing test**

```ts
// verified reporter weight multiplies the decay weight (capped at the
// constant even for stacked signals); flags still fire on verified
// reports; cooldown remaining is shorter for verified members; saved-trip
// CRUD round-trips; purchase history lists claimed + member-created
// tickets only.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/member-incentives.test.ts`
Expected: FAIL (no weight input exists).

- [ ] **Step 3: Implement weight plumbing + panel + saved trips**

`crowdTrust`: accept `reporterWeight` (default 1.0; verified constant, capped). Feed/checkin routes: resolve weight from session (member+verified → constant, else 1.0). Cooldown: verified members get the reduced interval (named constant, both client display and server enforcement read it). `MemberAccountPanel`: register/login state, purchase history, saved trips CRUD, cooldown/standing explainer (copy keys ×6). Saved-trips endpoints with ownership checks (member reads/writes own rows only).

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/member-incentives.test.ts tests/crowd-anomaly.test.tsx tests/crowd-submit.test.tsx && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/crowdTrust.ts src/app/api/crowdsource src/app/api/members src/components/settings src/lib/i18n tests/member-incentives.test.ts
git commit -m "feat(identity): verified weight, history, saved trips, cooldown relief"
git push origin main
```
