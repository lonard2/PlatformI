/**
 * PlatformI - Pseudonymous session identity and anti-spam cooldown state.
 *
 * Survives component unmount and page close/reopen within the same tab
 * lifetime. SESSION_ID is the pseudonymous identity the community feed
 * uses to mark your own reports ("You" chip).
 *
 * ponytail: module-level state is intentional — the cooldown must outlive
 * the component but does not need to survive a page reload (a reload is a
 * new browser session; the server enforces the real rate limit).
 */

export const SESSION_ID = crypto.randomUUID();

export const COOLDOWN_SECONDS = 60;

const lastSubmitByVehicle = new Map<string, number>();
let lastOwnSubmitAt = 0;
const spotlitReportIds = new Set<string>();

export function setLastSubmitNow(vehicleId: string): void {
  lastSubmitByVehicle.set(vehicleId, Date.now());
  lastOwnSubmitAt = Date.now();
}

export function getLastOwnSubmitAt(): number {
  return lastOwnSubmitAt;
}

export function isSpotlit(id: string): boolean {
  return spotlitReportIds.has(id);
}

export function markSpotlit(id: string): void {
  spotlitReportIds.add(id);
}

export function setCooldownRemaining(vehicleId: string, seconds: number): void {
  lastSubmitByVehicle.set(vehicleId, Date.now() - (COOLDOWN_SECONDS - seconds) * 1000);
}

export function getCooldownRemaining(vehicleId: string | null | undefined): number {
  if (!vehicleId) return 0;
  const last = lastSubmitByVehicle.get(vehicleId);
  if (last === undefined) return 0;
  const elapsed = Math.floor((Date.now() - last) / 1000);
  return Math.max(0, COOLDOWN_SECONDS - elapsed);
}
