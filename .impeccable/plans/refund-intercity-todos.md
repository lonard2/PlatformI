# Ticket refund surface + intercity admin — todos (each commitable + pushable)

Context: audit of 12 Prisma models vs OCC UI. Refund API (`POST /api/ticketing/refund`, idempotent, 409 on gate-used) has zero UI callers; intercity operators/boarding points are GET-only + seed-frozen with no OCC page.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | fix | OCC refund panel on scanner page: code+phone lookup via guest-lookup, refundable-state gate, two-step confirm, result + shift-log entry | RED→GREEN `tests/scanner-refund.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Intercity write APIs: POST/PUT/DELETE operators; POST/PUT/DELETE boarding points route | RED→GREEN `tests/intercity-write.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | fix | OCC intercity page: operator list + boarding points, add/edit/delete modals, nav link | RED→GREEN `tests/intercity-admin.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
