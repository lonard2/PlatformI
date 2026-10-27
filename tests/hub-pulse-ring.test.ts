/**
 * RED: hub pulse rings fire only for the selected stop and journey
 * endpoints — never as ambient decoration on every large marker.
 */
import { describe, it, expect } from "vitest";
import { shouldPulseRing } from "@/components/map/HubMarkerLayer";

describe("hub pulse ring gating", () => {
  const endpoints = new Set(["stop-b"]);

  it("pulses the selected stop", () => {
    expect(shouldPulseRing("stop-a", "stop-a", endpoints)).toBe(true);
  });

  it("pulses journey endpoints even when not selected", () => {
    expect(shouldPulseRing("stop-b", "stop-a", endpoints)).toBe(true);
  });

  it("stays quiet on ordinary hubs and stops", () => {
    expect(shouldPulseRing("stop-c", "stop-a", endpoints)).toBe(false);
    expect(shouldPulseRing("stop-c", null, new Set())).toBe(false);
  });
});
