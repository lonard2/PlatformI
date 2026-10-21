# Homepage cycle 12 — todos (from 2026-10-21 critique 28/40)

Scope: 5 fixes + final polish. Each ships as its own commit + push.
Rules: ponytail (minimum code), no emoji, strict TS, verify before every push
(`npx tsc --noEmit`, `npm test`, `impeccable detect --json`, `git diff --check`).

| # | Command | Fix | Status | Commit |
|---|---------|-----|--------|--------|
| 1 | clarify | Journey entry: ranked listbox combobox replacing datalist | DONE | 10e1c82 |
| 2 | colorize | NORMAL state always labelled, not colour-only | DONE | 38743df |
| 3 | layout | Mobile chrome diet (chip row, banner, bottom-sheet planner) | DONE | 310743e |
| 4 | overdrive | 2-transfer deterministic planner (Full BFS, top-2) | DONE | cf9caeb |
| 5 | audit | Wire tray/sector status to activeAlerts + last-synced timestamp | DONE | 4c08bc7 |
| 6 | polish | Final pass over the whole path | DONE | 22d5fc5 |
