/**
 * PlatformI - Per-vehicle visual seat and deck maps for intercity checkout.
 * Button-grid seats with class-driven layout switching: bus 2-2, sleeper
 * 1-1-1, train coach 2-2, flight rows 3-3, and ship deck 2-2. Available seats
 * stay keyboard-operable native buttons; blocked seats render disabled with
 * tabIndex -1 so they can never receive focus or fire onSelect by click or
 * keyboard. All labels resolve through the locale dictionaries and the
 * existing vehicleLabels helpers, so no hardcoded English ships in the JSX.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide icons.
 */

"use client";

import React, { useMemo } from "react";
import { Armchair } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getSeatTypeLabel } from "@/lib/transit/vehicleLabels";

export interface SeatMapSeatCell {
  kind: "seat";
  id: string;
  seatType: string;
}

export interface SeatMapAisleCell {
  kind: "aisle";
}

export type SeatMapCell = SeatMapSeatCell | SeatMapAisleCell;

export interface SeatMapRow {
  rowNumber: number;
  cells: SeatMapCell[];
}

export interface SeatMapProps {
  vehicleType: string;
  occupiedSeatIds: string[];
  selectedSeatId: string | null;
  onSelect: (seatId: string) => void;
}

const AISLE = "AISLE";

function buildRows(rowCount: number, columns: string[], seatType: string): SeatMapRow[] {
  const rows: SeatMapRow[] = [];
  for (let row = 1; row <= rowCount; row += 1) {
    rows.push({
      rowNumber: row,
      cells: columns.map((column): SeatMapCell =>
        column === AISLE
          ? { kind: "aisle" }
          : { kind: "seat", id: `${row}${column}`, seatType }
      ),
    });
  }
  return rows;
}

/**
 * Resolves the seat grid for a vehicle class. Unknown future classes fall
 * back to the AKAP 2-2 bus grid so checkout never renders an empty map.
 */
export function resolveSeatLayout(vehicleType: string): SeatMapRow[] {
  const key = vehicleType.toUpperCase();
  if (key.includes("SLEEPER") || key.includes("1_1_1")) {
    return buildRows(8, ["A", AISLE, "B", AISLE, "C"], "SLEEPER_SUITE");
  }
  if (
    key.includes("FLIGHT") ||
    key.includes("AVIATION") ||
    key.includes("3_3") ||
    key.includes("AIRPORT")
  ) {
    return buildRows(10, ["A", "B", "C", AISLE, "D", "E", "F"], "STANDARD_COACH");
  }
  if (
    key.includes("SHIP") ||
    key.includes("PELNI") ||
    key.includes("BOAT") ||
    key.includes("DECK") ||
    key.includes("MARITIME")
  ) {
    return buildRows(7, ["A", "B", AISLE, "C", "D"], "STANDARD_COACH");
  }
  if (
    key.includes("TRAIN") ||
    key.includes("KAI") ||
    key.includes("COACH") ||
    key.includes("WHOOSH") ||
    key.includes("RAIL")
  ) {
    return buildRows(8, ["A", "B", AISLE, "C", "D"], "STANDARD_COACH");
  }
  return buildRows(10, ["A", "B", AISLE, "C", "D"], "EXECUTIVE_RECLINER");
}

export const SeatMap: React.FC<SeatMapProps> = ({
  vehicleType,
  occupiedSeatIds,
  selectedSeatId,
  onSelect,
}) => {
  const { t } = useTranslation();
  const rows = useMemo(() => resolveSeatLayout(vehicleType), [vehicleType]);
  const occupied = useMemo(() => new Set<string>(occupiedSeatIds), [occupiedSeatIds]);

  const handleSelect = (seatId: string): void => {
    if (occupied.has(seatId)) return;
    onSelect(seatId);
  };

  return (
    <div
      role="group"
      aria-label={t.vehicleInspector.seatLayoutTitle}
      className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
        <Armchair aria-hidden="true" className="h-4 w-4 text-cyan-400" />
        <span>{t.vehicleInspector.seatLayoutTitle}</span>
      </div>

      <p className="text-[11px] text-slate-500">{t.vehicleInspector.seatMapInfo}</p>

      <div className="flex items-center justify-center gap-2 border-b border-slate-800/60 pb-2 text-[10px] uppercase tracking-wide text-slate-400">
        <span>{t.vehicleInspector.frontOfVehicle}</span>
      </div>

      <div className="space-y-1.5 overflow-x-auto">
        {rows.map((row) => (
          <div key={row.rowNumber} className="flex items-center justify-center gap-1.5 sm:gap-2">
            {row.cells.map((cell, cellIndex) =>
              cell.kind === "aisle" ? (
                <span key={`aisle-${cellIndex}`} aria-hidden="true" className="w-4 shrink-0 sm:w-6" />
              ) : occupied.has(cell.id) ? (
                <button
                  key={cell.id}
                  type="button"
                  disabled
                  tabIndex={-1}
                  aria-disabled="true"
                  aria-label={`${t.vehicleInspector.seat} ${cell.id} - ${t.vehicleInspector.occupied}`}
                  title={`${t.vehicleInspector.seat} ${cell.id} - ${getSeatTypeLabel(cell.seatType, t)}`}
                  className="h-10 w-10 shrink-0 cursor-not-allowed rounded-lg border border-rose-800/50 bg-rose-950/40 font-mono text-[11px] font-bold text-rose-500 opacity-60 sm:h-11 sm:w-11"
                >
                  <span aria-hidden="true">{cell.id}</span>
                </button>
              ) : (
                <button
                  key={cell.id}
                  type="button"
                  aria-pressed={selectedSeatId === cell.id}
                  aria-label={`${t.vehicleInspector.seat} ${cell.id} - ${t.vehicleInspector.available}`}
                  title={`${t.vehicleInspector.seat} ${cell.id} - ${getSeatTypeLabel(cell.seatType, t)}`}
                  onClick={() => handleSelect(cell.id)}
                  className={`h-10 w-10 shrink-0 rounded-lg border font-mono text-[11px] font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:h-11 sm:w-11 ${
                    selectedSeatId === cell.id
                      ? "scale-105 border-cyan-300 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50"
                      : "border-emerald-500/50 bg-emerald-950/80 text-emerald-300 hover:scale-105 hover:border-cyan-400"
                  }`}
                >
                  <span aria-hidden="true">{cell.id}</span>
                </button>
              )
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-slate-800/60 pt-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span>{t.vehicleInspector.rearOfVehicle}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-2 text-[10px] font-mono">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded bg-emerald-500/70" />
          <span className="text-emerald-300">{t.vehicleInspector.available}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded bg-rose-800/70" />
          <span className="text-rose-300">{t.vehicleInspector.occupied}</span>
        </span>
        {selectedSeatId !== null && (
          <span className="text-cyan-300">
            {t.vehicleInspector.seat} #{selectedSeatId}
          </span>
        )}
      </div>
    </div>
  );
};
