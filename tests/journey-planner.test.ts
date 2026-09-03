/**
 * PlatformI - Journey Planner & Map Binding Test Suite
 * Validates:
 * - Deterministic journey resolution from stop names
 * - Direct route matching and candidate line extraction
 * - 1-transfer interchange path resolution
 * - Geodesic distance, duration, and JakLingko fare estimation
 * - Store lifecycle for planned journeys
 *
 * Rules: Zero placeholder stubs, zero emojis, strict assertions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resolvePlannedJourney } from "../src/lib/services/journeyPlanner";
import { useTransitStore } from "../src/lib/stores/useTransitStore";
import { TRANSIT_STOPS, TRANSIT_LINES } from "../src/lib/data/jakarta-dataset";

describe("Deterministic Journey Planning & Map Binding", () => {
  beforeEach(() => {
    useTransitStore.getState().clearPlannedJourney();
  });

  it("returns null for empty, whitespace, or identical origin and destination", () => {
    expect(resolvePlannedJourney("", "", TRANSIT_STOPS, TRANSIT_LINES)).toBeNull();
    expect(resolvePlannedJourney("   ", "Dukuh Atas", TRANSIT_STOPS, TRANSIT_LINES)).toBeNull();
    expect(resolvePlannedJourney("Dukuh Atas", "Dukuh Atas", TRANSIT_STOPS, TRANSIT_LINES)).toBeNull();
    expect(resolvePlannedJourney("Unknown Stop XYZ", "Another Stop ABC", TRANSIT_STOPS, TRANSIT_LINES)).toBeNull();
  });

  it("resolves direct route for stations on the same line (e.g. MRT North-South)", () => {
    const origin = "Lebak Bulus Grab";
    const dest = "Bundaran HI Bank DKI";

    const journey = resolvePlannedJourney(origin, dest, TRANSIT_STOPS, TRANSIT_LINES);

    expect(journey).not.toBeNull();
    if (!journey) return;

    expect(journey.originStop.name).toContain("Lebak Bulus");
    expect(journey.destinationStop.name).toContain("Bundaran HI");
    expect(journey.directLines.length).toBeGreaterThan(0);
    expect(journey.directLines.some((l) => l.code === "M" || l.id === "line-mrt-ns")).toBe(true);
    expect(journey.candidateLines.length).toBeGreaterThan(0);
    expect(journey.distanceKm).toBeGreaterThan(5);
    expect(journey.estimatedDurationMinutes).toBeGreaterThan(10);
    expect(journey.estimatedFareRp).toBeGreaterThan(0);
  });

  it("resolves route case-insensitively with leading/trailing whitespace", () => {
    const origin = "  lebak bulus grab  ";
    const dest = "BUNDARAN HI BANK DKI";

    const journey = resolvePlannedJourney(origin, dest, TRANSIT_STOPS, TRANSIT_LINES);

    expect(journey).not.toBeNull();
    if (!journey) return;

    expect(journey.originStop.name).toContain("Lebak Bulus");
    expect(journey.destinationStop.name).toContain("Bundaran HI");
  });

  it("resolves candidate lines when transfer is required", () => {
    // Halim to an MRT station that requires interchange
    const origin = "Stasiun Halim";
    const dest = "Blok M BCA";

    const journey = resolvePlannedJourney(origin, dest, TRANSIT_STOPS, TRANSIT_LINES);

    expect(journey).not.toBeNull();
    if (!journey) return;

    expect(journey.originStop.name).toContain("Halim");
    expect(journey.destinationStop.name).toContain("Blok M");
    expect(journey.candidateLines.length).toBeGreaterThan(0);
    expect(journey.distanceKm).toBeGreaterThan(0);
    expect(journey.estimatedFareRp).toBeLessThanOrEqual(10000); // JakLingko cap enforced
  });

  it("correctly manages plannedJourney state in useTransitStore", () => {
    expect(useTransitStore.getState().plannedJourney).toBeNull();

    const journey = resolvePlannedJourney(
      "Lebak Bulus Grab",
      "Bundaran HI Bank DKI",
      TRANSIT_STOPS,
      TRANSIT_LINES
    );
    expect(journey).not.toBeNull();

    useTransitStore.getState().setPlannedJourney(journey);
    expect(useTransitStore.getState().plannedJourney).toEqual(journey);

    useTransitStore.getState().clearPlannedJourney();
    expect(useTransitStore.getState().plannedJourney).toBeNull();
  });
});
