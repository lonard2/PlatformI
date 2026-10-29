/**
 * RED: artifact provenance — generatedAt (ISO-8601 UTC) and feedFingerprint
 * are required; missing or malformed provenance fails validation.
 */
import { describe, it, expect } from "vitest";
import { validateDerivedArtifact } from "@/lib/services/gtfsSchedule";

const BASE = {
  generatedNote: "x",
  feedUrl: "https://example.invalid/f.zip",
  allowedServices: ["SH"],
  lines: {},
};

describe("artifact provenance", () => {
  it("rejects an artifact with no generatedAt", () => {
    expect(
      validateDerivedArtifact({ ...BASE, lines: {} } as never)
    ).toContainEqual(expect.stringMatching(/generatedAt/i));
  });

  it("rejects a malformed generatedAt", () => {
    expect(
      validateDerivedArtifact({
        ...BASE,
        generatedAt: "22 Agu 2026",
        lines: {},
      } as never)
    ).toContainEqual(expect.stringMatching(/generatedAt/i));
  });

  it("accepts ISO-8601 UTC provenance", () => {
    const errors = validateDerivedArtifact({
      ...BASE,
      generatedAt: "2026-10-29T00:00:00Z",
      feedFingerprint: "sha256:abc",
      lines: {},
    } as never);
    expect(
      errors.filter((e) => /generatedAt|fingerprint/i.test(e))
    ).toEqual([]);
  });
});
