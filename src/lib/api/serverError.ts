/**
 * PlatformI - Production-safe API error bodies.
 *
 * Internal failure details help debugging in development but must never
 * reach clients in production. Call sites spread prodDetails() where they
 * used to inline `details: ...`; serverError() covers whole bodies.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

export function prodDetails(err: unknown): { details?: string } {
  if (process.env.NODE_ENV === "production") return {};
  if (err instanceof Error) return { details: err.message };
  if (typeof err === "string") return { details: err };
  return { details: "Unknown error" };
}

export function serverError(message: string, err?: unknown): { error: string; details?: string } {
  return { error: message, ...prodDetails(err ?? "Unknown error") };
}
