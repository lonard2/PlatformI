/**
 * PlatformI - Shared vehicle operational run card.
 *
 * Single source for the run/trainset/fleet/depot cell grid previously
 * duplicated across the vehicle sheet specs tab and the technical specs
 * section. Two visual variants preserve each call site's exact copy:
 * "sheet" (operator chip, category-dependent depot label) and "specs"
 * (authentic-telemetry chip, cyan frame).
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React from "react";
import { Radio } from "lucide-react";
import type { Vehicle } from "@/types/transit";
import { useTranslation } from "@/lib/i18n";

interface VehicleOpsRunCardProps {
  vehicle: Vehicle;
  variant: "sheet" | "specs";
  /** Right-side header chip for the sheet variant (operator or mode name). */
  operatorLabel?: string;
}

export function VehicleOpsRunCard({ vehicle, variant, operatorLabel }: VehicleOpsRunCardProps) {
  const { t } = useTranslation();
  const isSheet = variant === "sheet";

  return (
    <div
      className={`p-3.5 rounded-xl space-y-2.5 text-xs font-mono ${
        isSheet
          ? "bg-slate-950/90 border border-slate-800"
          : "bg-slate-950/80 border border-cyan-500/30"
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          {vehicle.category === "RAIL" || !isSheet
            ? t.vehicleInspector.operationalDetails
            : t.vehicleInspector.fleetRunInfo}
        </span>
        {isSheet ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
            {operatorLabel ?? vehicle.operatorName ?? ""}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">{t.vehicleInspector.authenticTelemetry}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Run Number / Nomor Dinas */}
        {vehicle.runNumber && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.common.runNumber}:
            </span>
            <strong className="text-cyan-300 text-xs font-bold">
              {vehicle.runNumber}
            </strong>
          </div>
        )}

        {/* Trainset Number (Rail only) */}
        {vehicle.trainsetNumber && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.common.trainset}:
            </span>
            <strong className="text-white text-xs font-bold">
              {vehicle.trainsetNumber}
            </strong>
          </div>
        )}

        {/* Total Trainsets on Line (Rail only) */}
        {vehicle.totalTrainsets && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {isSheet ? `${t.vehicleInspector.totalFleetOnLine}:` : t.vehicleInspector.totalTrainsetsOnLine}
            </span>
            <strong className="text-emerald-400 text-xs font-bold">
              {vehicle.totalTrainsets} {isSheet ? t.common.trainset : t.vehicleInspector.trainsetUnit}
            </strong>
          </div>
        )}

        {/* Car Formation (Rail only) */}
        {vehicle.carFormation && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.common.formation}:
            </span>
            <strong className="text-slate-200 text-xs font-bold truncate block">
              {vehicle.carFormation}
            </strong>
          </div>
        )}

        {/* Bus Fleet Number (Bus only) */}
        {vehicle.fleetNumber && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.common.fleetNumber}:
            </span>
            <strong className="text-white text-xs font-bold">
              {vehicle.fleetNumber}
            </strong>
          </div>
        )}

        {/* License Plate (Bus only) */}
        {vehicle.licensePlate && (
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.common.licensePlate}:
            </span>
            <strong className="text-amber-300 text-xs font-bold">
              {vehicle.licensePlate}
            </strong>
          </div>
        )}

        {/* Home Depot */}
        {vehicle.depotHome && (
          <div className="col-span-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {vehicle.category === "RAIL" || !isSheet
                ? `${t.common.depot}:`
                : `${t.vehicleInspector.poolBase}:`}
            </span>
            <strong className="text-slate-200 text-xs font-bold">
              {vehicle.depotHome}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
