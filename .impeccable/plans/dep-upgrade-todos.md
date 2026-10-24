# Dependency upgrade — execution todos (2026-10-24)

Goal: Node.js line + all npm deps at very latest stable. Zero regressions:
verify with `npx tsc --noEmit`, `npm test`, `next build`, `git diff --check`.
One commit + push per step. Ledger in this file.

| # | Todo | Status | Commit |
|---|------|--------|--------|
| 0 | Toolchain: upgrade npm 12→11, confirm Node line latest, pin engines + .nvmrc | DONE | — |
| 1 | package.json bumps (latest stable; prisma 7.x not RC) + install | DONE | — |
| 2 | Tailwind v3→v4 migration (CSS-first, @tailwindcss/postcss, dark variant) | TODO | — |
| 3 | Fix fallout: Next 16, TS 7, vitest 5, prisma 7, framer-motion 14, lucide 1.x, jest-dom 7, jsdom 30 | TODO | — |
| 4 | Full verification: tsc + tests + next build + detect | TODO | — |

## Ledger
- Setup: standing norm is direct-to-main per-task commits with push.
- npm 12.2.1 cannot reliably install a lockfileVersion-3 tree; upgrading npm first is a prerequisite, not scope creep.
- Todo 0: system npm 12.2.1 cannot be upgraded in place (registry policy blocks global remote installs); npm 11.21.1 installed to user space and used for this upgrade. Node stays 26.12.0 (brew metadata stale, 26.12.1 bottle unreachable here); pinned via .nvmrc + engines. Ruling: no brew/Node surgery beyond this; user-space npm only.
- Todo 1: install clean with npm 11 (128 added, 99 removed, 87 changed). Ruling: push Todo 1 only once tsc is green again — stacking local commits over a red tree, pushing in order at green points. Pushing red main would violate the verify-before-push norm.
- Todo 2: kept tailwind.config.ts via @config (no v4 theme rewrite); darkMode array to string; autoprefixer retained (harmless with v4 Lightning CSS). Ruling: minimal-migration over CSS-first rewrite — full theme port is a separate redesign task.
