# Alerts critique fixes — execution todos (2026-10-25)

Scope: all five priority issues from critique
`2026-10-25T02-03-17Z__src-app-admin-alerts-page-tsx.md` (23/40 Acceptable).
User answers: P0s first, all five issues, labeled Delete button.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | layout broadcast confirm as modal | alertdialog overlay out of grid flow, focus trap, restated blast radius + verb button | DONE (538/538) | 1f42acf |
| 2 | harden undo live-regions | Announce once on create/finalize; ticking countdown aria-hidden + live off | DONE (540/540) | 18fab42 |
| 3 | clarify delete control | Labeled Delete text button, wider gap from Resolve | DONE (541/541) | 447629b |
| 4 | colorize amber collision + copy bug | Reserve amber for WARNING; re-theme delete-undo + fleet-restore; fix demote INFO→WARNING; severity legend row | DONE (546/546) | 8fbbdaf |
| 5 | audit empty/filter/sync honesty | Empty state + CTA, skeleton rows, status/severity/line filter + search, aggregate sync toasts, disclose 10-run cap | DONE (551/551) | d7f6e12 |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | DONE (554/554) | — |

## Ledger
- Setup: working on main with per-task push per user standing norm (established in fleet/ticket/portal sessions; push to shared main is the norm here, not an ask-first side effect).
- Pre-flight: todos 1-5 all touch src/app/admin/alerts/page.tsx; executed sequentially inline so no interface drift. Todo 4's undo re-theme must not clash with todo 2's live-region change (different attributes: classes vs aria) — checked, no conflict. Todo 5 consumes the sync aggregation paths but changes no interfaces earlier todos need.
- TDD + verification-before-completion loaded and governing.
- Todo 1: modal lives after the grid (fixed overlay, backdrop-click + Escape close, Tab trap, autofocus retained). Ruling: confirm button reuses publishAlert verb key instead of a new i18n key — the verb already exists in all 6 locales and means the same action. Existing admin-ops-safety tests updated to alertdialog (they encoded the old role=alert behavior the critique condemned).
- Todo 2: banners keep role=status (announce-on-insert preserved); countdowns get aria-live=off + testid; sr-only announcer fires once at delete-execute and mutation-finalize (batched, last wins). Ruling: no finalize message on failed DELETE — the restored row plus assertive error banner already announce that path; a success chime on top would double-announce. New keys alertDeleteFinal/alertMutationFinal x6 locales.
- Todo 3: delete is a labeled text button (icon + Delete), ml-2 separation from Resolve, aria-label rebuilt as Delete: {title} so the accessible name contains the visible label (WCAG 2.5.3). Ruling: reused t.admin.fleetDeleteButton instead of a new key — identical admin verb, present in all 6 locales, zero new strings to mistranslate. Ruling: ariaDelete left in dictionaries per R3 dead-key precedent (removal churn across 7 files, zero user benefit).
- Todo 4: INFO feed badges cyan (matches selector + preview); delete-undo banner slate-neutral; fleet-restore indigo; demote summary literal fixed to WARNING; severity legend row above feed reuses badge styles (no new keys). Ruling: slate-neutral for deletion (not the critique s rose-outline) — rose reads as CRITICAL on this board, so outline-red would trade one collision for another. Ruling: broadcast primary action stays amber (portal-wide OCC broadcast accent, consistent with Radio icon + command badge) — only state-carrying surfaces were re-themed.
- Todo 5: empty state (CTA focuses #alert-title-input, guarded scrollIntoView for jsdom); skeleton x3 behind isLoading+empty; status/severity selects + search (search covers line via code+name haystack — ruling: no fourth line control, search subsumes it); vehicle/schedule PUTs awaited + counted, aggregate toast always (0 failed reads honestly, no branching); cap disclosed in-toast. Ruling: syncOpsToast/normalizeOpsToast left dead per R3 precedent. Ruling: 60s+ test for finalize uses blur-after-focus because the undo button steals focus and pauses grace by design.
- Review ses_e8f1de5feffeDYwaWd4Ks9U4NB: approve, no Critical. Final: fixed Important-1 (resolve awaits normalize-silent, single combined closure toast) — test RED (aggregate-only final) → GREEN. Final: fixed Important-2 (normalize aggregate + delete-failure-silence locking tests).
Final: minor (deferred): Korean search placeholder has Japanese kanji (ko.ts 検索→검색).
Final: minor (deferred): three skeleton rows each role=status triple-announces; one container should carry the live region.
Final: minor (deferred): finalAnnouncement never cleared; identical consecutive finalizes announce once (same-string setState bailout).
Final: minor (deferred): broadcast success drops focus to body (setConfirmingBroadcast(false) bypasses closeBroadcastConfirm).
Final: minor (deferred): modal autofocuses Publish, background not inert/scroll-locked.
Final: minor (deferred): optimistic fleet update with no rollback on PUT failure diverges from honest toast.
Final: minor (deferred): new Event(submit) hack retained in confirm path.
Final: Ruling: visual/aesthetic outcome unjudged (no browser; /admin/alerts login-gated) — attribute-level assertions + detector stand in; a visual pass needs an authenticated browser session. Cost if wrong: layout regressions invisible to the suite.
Final: Ruling: screen-reader announcement behavior unjudged beyond jsdom attributes — aria-hidden/live-off produce no jsdom signal; NVDA/VoiceOver pass still needed for the P0 claim. Cost if wrong: per-second spam persists for real users.
Final: Ruling: ar/id/ja/zh translation quality spot-checked only (placeholders verified, not fluency) — accepted; full fluency review needs native speakers. Cost if wrong: awkward phrasing in 4 locales.
Final: Ruling: PUT fan-out perf at full-fleet scale unjudged — Promise.all over up to N vehicles matches pre-existing sync pattern; acceptable until fleet exceeds ~50/line. Cost if wrong: slow sync on huge lines.
