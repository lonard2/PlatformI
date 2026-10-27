# Remaining data-authoring gaps — todos (each commitable + pushable)

Audit follow-up. Region is single-record today; identity/photos are deploy-only; check-ins have no moderation.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | fix | Post-deploy vehicle identity edit in telemetry modal (9 fields, PUT, field-scoped undo, shift-log entry) | RED→GREEN `tests/fleet-identity-edit.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Photo attach/list/remove in telemetry modal (URL + caption + credit + tag via PUT photos) | RED→GREEN `tests/fleet-photo-attach.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | fix | Crowdsource moderation: DELETE check-in API + OCC feed section with remove action | RED→GREEN `tests/crowdsource-moderation.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | fix | Region CRUD API + studio manager dialog (scalars + validated GeoJSON boundary) | RED→GREEN `tests/region-crud.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
