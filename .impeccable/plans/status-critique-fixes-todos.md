# Service-status critique fixes — todos (each commitable + pushable)

Critique 2026-10-27: 18/40 Poor (re-baselined from 31; scope growth, not regression).
User rulings: region parity first; passenger voice across the whole status
surface (drawer + banner + header entry); all five issues.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | P0: scope drawer + banner to active region (lines, alerts, counts, calendar, uptime); honest empty-region note at zero lines | RED→GREEN `tests/status-region.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable shape` | P1: per-alert action row (View on map + Plan alternate prefilling journey) | RED→GREEN `tests/status-alert-actions.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable quieter` | P1: banner persistence (no auto-minimize with active alerts, labeled Status pill, mobile entry) | RED→GREEN `tests/status-banner-persist.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable clarify` | P2: passenger-voice pass over drawer + banner + header entry copy (INFO badge split out) | RED→GREEN `tests/status-copy.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable colorize` | P3: values on trend bars + visible 98% target gridline, chart demoted below per-line list | RED→GREEN `tests/status-trend-values.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`. Final step after all five: `$impeccable polish` if needed + re-run critique.
