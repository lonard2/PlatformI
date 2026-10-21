/**
 * PlatformI - Shared Operating Status Language
 *
 * One 4-state scale for system health, spoken the same way in the rail, the
 * banner, and the status drawer: a coloured dot plus the word, never colour
 * alone. Alert severities (CRITICAL/WARNING/INFO) map onto it; OFF_HOURS is a
 * schedule state, not a disruption.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis.
 */

"use client";

import React from "react";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { DisruptionSeverity, ServiceOperatingStatus } from "@/types/transit";

export const OPERATING_STATUS_ORDER: ServiceOperatingStatus[] = [
  "NORMAL",
  "LIMITED",
  "SUSPENDED",
  "OFF_HOURS",
];

export const OPERATING_STATUS_COLORS: Record<ServiceOperatingStatus, string> = {
  NORMAL: "#10b981",
  LIMITED: "#f59e0b",
  SUSPENDED: "#f43f5e",
  OFF_HOURS: "#64748b",
};

export const OPERATING_STATUS_CHIP: Record<ServiceOperatingStatus, string> = {
  NORMAL: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
  LIMITED: "bg-amber-950/80 border-amber-500/40 text-amber-300",
  SUSPENDED: "bg-rose-950/80 border-rose-500/40 text-rose-300",
  OFF_HOURS: "bg-slate-900/90 border-slate-700 text-slate-300",
};

/** Alert severities speak CRITICAL/WARNING/INFO; operations speak the 4-state scale. */
export function operatingStatusForSeverity(
  severity: DisruptionSeverity
): ServiceOperatingStatus {
  switch (severity) {
    case "CRITICAL":
      return "SUSPENDED";
    case "WARNING":
      return "LIMITED";
    default:
      return "NORMAL";
  }
}

export function operatingStatusLabel(
  status: ServiceOperatingStatus,
  t: TranslationDictionary
): string {
  switch (status) {
    case "NORMAL":
      return t.navigation.serviceNormal;
    case "LIMITED":
      return t.navigation.serviceLimited;
    case "SUSPENDED":
      return t.navigation.serviceSuspended;
    case "OFF_HOURS":
      return t.navigation.serviceOffHours;
  }
}

interface OperatingStatusMarkProps {
  status: ServiceOperatingStatus;
  t: TranslationDictionary;
  className?: string;
}

/** Dot plus word in the status colour. The word carries the meaning. */
export function OperatingStatusMark({ status, t, className }: OperatingStatusMarkProps) {
  const color = OPERATING_STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? "text-[10px] font-mono font-bold whitespace-nowrap"}`}
      style={{ color }}
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {operatingStatusLabel(status, t)}
    </span>
  );
}
