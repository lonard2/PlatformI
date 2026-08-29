/**
 * PlatformI - Pseudonymous session identity and anti-spam cooldown state.
 *
 * Survives component unmount and page close/reopen within the same tab
 * lifetime. The session ID is a stable pseudonymous identifier surfaced
 * in the success banner so users understand what the community sees.
 *
 * ponytail: module-level state is intentional — the cooldown must outlive
 * the component but does not need to survive a page reload (a reload is a
 * new browser session; the server enforces the real rate limit).
 */

export const SESSION_ID = crypto.randomUUID();

let lastSubmitAt = 0;
export const COOLDOWN_SECONDS = 60;

export function setLastSubmitNow(): void {
  lastSubmitAt = Date.now();
}

export function getCooldownRemaining(): number {
  const elapsed = Math.floor((Date.now() - lastSubmitAt) / 1000);
  return Math.max(0, COOLDOWN_SECONDS - elapsed);
}
