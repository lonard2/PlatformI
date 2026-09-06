import type { DisruptionAlert } from "@/types/transit";

export type SeverityRollup = "CRITICAL" | "WARNING" | "INFO" | "NORMAL";

/**
 * Single source of truth for the persistent-chrome severity rollup: the
 * header Activity icon and the mobile nav badge must never disagree.
 */
export function getHighestSeverity(activeAlerts: DisruptionAlert[]): SeverityRollup {
  const active = activeAlerts.filter((a) => a.status === "ACTIVE");
  if (active.some((a) => a.severity === "CRITICAL")) return "CRITICAL";
  if (active.some((a) => a.severity === "WARNING")) return "WARNING";
  if (active.some((a) => a.severity === "INFO")) return "INFO";
  return "NORMAL";
}
