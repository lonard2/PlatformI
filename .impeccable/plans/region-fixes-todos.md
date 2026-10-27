# Region picker fixes + more countries — todos (each commitable + pushable)

1. Picker dropdown opens inside headers (`z-30`) while the transport bar
   below is also `z-30` and later in the DOM, so it paints over the sheet.
2. Only Indonesia exists; add Malaysia, Singapore, Thailand metros.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | data | Add MY/SG/TH metro regions (records only) + country names in picker grouping | RED→GREEN `tests/region-switch.test.ts` (extended), `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Raise header chrome above transport bar so the picker sheet is never covered | RED→GREEN `tests/region-picker-chrome.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
