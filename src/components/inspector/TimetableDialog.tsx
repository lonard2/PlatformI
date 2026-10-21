/**
 * PlatformI - Timetable Overflow Dialog
 *
 * Focused full-timetable view for stops whose boards exceed ~20 departures.
 * Groups the soonest rows by line in a scrollable modal capped at 60 rows.
 * Escape dismissal, focus trap, and focus restore follow the house dialog
 * pattern (useDialogFocusTrap). Rendered inside the inspector sheet so the
 * sheet-level Escape handler yields to it while it is open.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { X } from "lucide-react";
import type { DepartureBoardItem, Line } from "@/types/transit";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";

export const TIMETABLE_OVERFLOW_THRESHOLD = 20;
export const TIMETABLE_DIALOG_ROW_CAP = 60;

export interface TimetableLineGroup {
  lineCode: string;
  lineName: string;
  colorHex: string;
  items: DepartureBoardItem[];
}

/**
 * Groups departures by line code in first-appearance order, capped at the
 * dialog row budget (soonest first — callers pass time-sorted boards).
 */
export function groupTimetableByLine(
  departures: DepartureBoardItem[],
  lines: Line[],
  cap: number = TIMETABLE_DIALOG_ROW_CAP
): TimetableLineGroup[] {
  const groups: TimetableLineGroup[] = [];
  const byCode = new Map<string, TimetableLineGroup>();
  for (const item of departures.slice(0, cap)) {
    let group = byCode.get(item.lineCode);
    if (!group) {
      const line = lines.find((l) => l.code === item.lineCode);
      group = {
        lineCode: item.lineCode,
        lineName: item.lineName,
        colorHex: line?.colorHex ?? "#94A3B8",
        items: [],
      };
      byCode.set(item.lineCode, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

function statusStyle(status: DepartureBoardItem["status"]): string {
  switch (status) {
    case "BOARDING":
      return "bg-amber-950/80 border-amber-500/40 text-amber-400";
    case "DELAYED":
      return "bg-rose-950/80 border-rose-500/40 text-rose-400";
    case "DEPARTED":
      return "bg-slate-800/80 border-slate-600/40 text-slate-400";
    default:
      return "bg-emerald-950/80 border-emerald-500/40 text-emerald-400";
  }
}

function statusLabel(status: DepartureBoardItem["status"], t: TranslationDictionary): string {
  switch (status) {
    case "BOARDING":
      return t.common.boarding;
    case "DELAYED":
      return t.common.delayed;
    case "DEPARTED":
      return t.common.departed;
    default:
      return t.common.onTime;
  }
}

interface TimetableDialogProps {
  open: boolean;
  onClose: () => void;
  departures: DepartureBoardItem[];
  lines: Line[];
  t: TranslationDictionary;
}

export function TimetableDialog({ open, onClose, departures, lines, t }: TimetableDialogProps) {
  const { containerRef } = useDialogFocusTrap<HTMLDivElement>({
    isOpen: open,
    onClose,
    autoFocus: true,
  });

  if (!open) return null;

  const groups = groupTimetableByLine(departures, lines);
  const shown = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-dialog-title"
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <h2 id="timetable-dialog-title" className="text-sm font-bold text-white truncate">
            {t.hubInspector.fullTimetable} ({shown})
          </h2>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {groups.map((group) => (
            <section key={group.lineCode} aria-label={group.lineName}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0"
                  style={{
                    backgroundColor: `${group.colorHex}20`,
                    color: group.colorHex,
                    border: `1px solid ${group.colorHex}60`,
                  }}
                >
                  {group.lineCode}
                </span>
                <span className="text-[11px] text-slate-400 truncate">{group.lineName}</span>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li
                    key={item.tripId}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/70 text-xs"
                  >
                    <span className="font-mono font-bold text-cyan-300 shrink-0">
                      {item.scheduledTime}
                    </span>
                    <span className="text-slate-200 truncate min-w-0 flex-1">
                      {item.destination}
                    </span>
                    <span className="text-slate-500 font-mono hidden sm:inline shrink-0">
                      {item.platform}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 ${statusStyle(item.status)}`}
                    >
                      {statusLabel(item.status, t)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
