---
target: admin panel, for timetable tab
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:/Users/lonard/Desktop/PlatformI/src/app/admin/timetables/page.tsx"
target_fingerprint: "sha256:61b63479edec325fce0504acc42e8c0ada70311ecf1b85cb1be6e25d37c3a06f"
target_path: /Users/lonard/Desktop/PlatformI/src/app/admin/timetables/page.tsx
timestamp: 2026-09-21T09-15-43Z
slug: src-app-admin-timetables-page-tsx
---
# Operational Design Review: PlatformI Timetable Management & Dispatch Cockpit

Method: dual-agent (A: fb6c9a5a-23a7-4729-918a-dd0bb3db2365 · B: 7d6b227e-32ac-4244-aecc-cbc4afb6c04d)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 2.5/4 | Lacks optimistic loading telemetry during headway shift (±5m) and in-cell cascading stop recalculation. |
| 2 | Match System / Real World | 3.5/4 | High resonance with Jakarta OCC rail/BRT patterns (Jalur/Peron, Masuk Dipo, Relasi Pendek, Rekayasa Insiden, KLB). |
| 3 | User Control and Freedom | 2.5/4 | Single-run deletion has undo grace, but Batch Generator has zero safety confirmation for "Replace Existing Line Runs". |
| 4 | Consistency and Standards | 2.5/4 | Bimodal language dissonance: English system labels juxtaposed with untranslated Indonesian operational copy. |
| 5 | Error Prevention | 1.5/4 | CRITICAL: In-cell edit permits negative dwell times (T_arr > T_dep) and non-chronological arrival before previous stop departure. |
| 6 | Recognition Rather Than Recall | 3.5/4 | Timeband shifts (Peak AM, Day, Peak PM, Night) and authentic preset templates orient dispatchers quickly. |
| 7 | Flexibility and Efficiency | 2.5/4 | Quick ±5m shift buttons exist, but lacks downstream bulk headway cascading and keyboard arrow-key matrix navigation. |
| 8 | Aesthetic and Minimalist Design | 3.0/4 | Midnight cockpit aesthetic (#070b14) is focused, but top global KPI tiles waste vertical corridor real estate. |
| 9 | Error Recovery | 2.5/4 | In-modal errors surface clearly, but in-cell errors are squeezed into 9px strings that clip on compact screens. |
| 10 | Help and Documentation | 2.0/4 | Relies on passive title tooltips; lacks keyboard navigation guide or headway tension formulas. |
| **Total** | | **27/40** | **Needs Work (Operational Precision Required)** |

## Design Specificity Verdict

### LLM Assessment (Design Director Review)
**78% Authentic Transit OCC / 22% Leaky SaaS CRUD Abstraction.**
PlatformI successfully transcends standard generic SaaS tables by implementing the industry-standard **Stop-by-Trip Cross-Tabular Matrix** (the tabular equivalent of the Indonesian Grafik Perjalanan Kereta Api / GAPEKA). It models genuine Jakarta operational paradigms: *Dinas Masuk Dipo* (depot pull-in), *Relasi Pendek* (short-turn terminal truncation), *Rekayasa Insiden* (disruption route divergence), and *Kereta Luar Biasa (KLB)*. However, SaaS abstraction leaks through via destructive checkboxes in the batch modal without safety gates, desktop spreadsheet clicking instead of roving keyboard navigation, and language bifurcation.

### Deterministic Scan (Impeccable Mechanical Detector)
- **Exit Code**: `2` (1 Primary Warning, 10 Advisory findings)
- **Primary Warning (`ai-color-palette`)**:
  - `src/app/admin/timetables/page.tsx:636`: `text-indigo-300` on KPI card heading for "Assigned Gates/Bays". Violates PlatformI's established color system (cyan/blue/emerald/amber/rose).
- **Advisory Quality Findings (`design-system-font-size`)**:
  - 10 occurrences of ad-hoc `text-[9px]` classes across `page.tsx` (L917) and `TimetableMatrixGrid.tsx` (L477, L482, L488, L501, L562, L637, L650, L683, L717, L748) falling below the documented `DESIGN.md` typography ramp minimum (`label`: 10px / 0.625rem).
- **BatchScheduleModal.tsx**: Clean pass (0 findings).

### Visual Overlays
Browser automation is not attached in this CLI session. No interactive visual DOM overlay or layout shift overlay could be presented. Static AST and pattern inspection was utilized.

## Overall Impression
The timetable matrix grid is a high-ambition, operationally grounded tool that gives PlatformI the feel of a real railway and bus dispatch room. The single biggest opportunity is transforming it from a "mouse-driven spreadsheet" into an enterprise-grade keyboard-navigable OCC console with chronological causality enforcement.

## What's Working
1. **Station-by-Trip Cross-Tabular Architecture**: Sticky station column freezing with orthogonal trip columns correctly represents real-world timetable headway progressions.
2. **Deep Operational Divergence Modeling**: Automated downstream stop omissions and distinctive badge treatments for *Masuk Dipo*, *Relasi Pendek*, and *Rekayasa Insiden*.
3. **Kinetic Runtime Physics**: Stop times cascade dynamically with realistic dwell times and speed parameters across Whoosh, MRT, LRT, and BRT modes.

## Priority Issues

### [P0] What: Zero Sequential Chronological Sanity in In-Cell Edit
- **Why it matters**: Controllers can accidentally enter departure times before arrival times or arrivals before previous stop departures, corrupting passenger ETAs and simulation feeds.
- **Fix**: Validate $T_{\text{dep}} \ge T_{\text{arr}}$ and $T_{\text{arr}} \ge T_{\text{dep(prev\_stop)}}$ before persisting changes.
- **Suggested command**: `/impeccable harden`

### [P1] What: Destructive Unconfirmed Line Run Wipe in Batch Generator
- **Why it matters**: The `Replace Existing Line Runs` checkbox immediately executes an un-alerted deletion of existing runs upon submission, risking irreversible schedule data loss.
- **Fix**: Display a rose warning badge with the count of runs to be replaced and require secondary confirmation or diff review.
- **Suggested command**: `/impeccable clarify`

### [P2] What: Modal Accessibility Deficit & Missing Focus Trap on Rekayasa Dialog
- **Why it matters**: The divergence modal in `TimetableMatrixGrid.tsx` is an un-trapped container without `role="dialog"`, allowing focus to bleed into background matrix cells and ignoring `Escape`.
- **Fix**: Integrate `useDialogFocusTrap`, `role="dialog"`, and `aria-modal="true"`.
- **Suggested command**: `/impeccable audit`

### [P3] What: Violent Layout Shift (CLS) on In-Cell Editor Expansion
- **Why it matters**: Clicking a dwell time expands the cell from 48px to 240px inside the `<td>`, drastically pushing down all sibling rows and breaking spatial tracking.
- **Fix**: Anchor the in-cell dwell editor as a floating popover above the cell rather than expanding table row heights.
- **Suggested command**: `/impeccable layout`

### [P4] What: Absence of Keyboard Roving Tabindex for Dispatchers
- **Why it matters**: OCC controllers working with numeric keypads must constantly switch between mouse and keyboard to edit adjacent station dwells.
- **Fix**: Implement WAI-ARIA Data Grid roving tabindex with arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`).
- **Suggested command**: `/impeccable adapt`

## Persona Red Flags
- **Operator Budi (Senior Dispatcher)**: Must manually click `+5m` up to 36 times to adjust peak headway, risking state race conditions without a bulk downstream shift action.
- **Specialist Dewi (Network Planner)**: Cannot synthesize multi-timeband schedules without multiple modal passes, where a forgotten `replaceExisting` checkbox destroys previous work.
- **Junior Controller Andi (Trainee)**: Can easily input negative dwell times without immediate validation feedback or chronological guardrails.

## Minor Observations & Provocative Questions
1. **Contrast Violation**: Track number labels using `text-[9px] text-slate-500` yield a 3.1:1 contrast ratio against `#070b14`, below WCAG AA 4.5:1.
2. **Synchronous window.confirm**: Deleting runs in `page.tsx` uses browser-native `window.confirm`, freezing thread execution and breaking glassmorphic immersion.
3. **Macro KPI Clutter**: Four top cards display system-wide metrics that push the active corridor matrix down by 120px.
4. *Provocative Question*: Why are dispatchers editing static text clock strings instead of manipulating dwell seconds and headway tension deltas directly?
