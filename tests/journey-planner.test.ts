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
import {
  resolvePlannedJourney,
  findMatchingStop,
  journeyHasRoute,
  getStopSuggestions,
} from "../src/lib/services/journeyPlanner";
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

  it("accurately finds matching stops with exact, stripped prefix, and substring strategies", () => {
    // Exact
    expect(findMatchingStop("Lebak Bulus Grab", TRANSIT_STOPS)?.name).toContain("Lebak Bulus");
    // Case insensitive
    expect(findMatchingStop("lebak bulus grab", TRANSIT_STOPS)?.name).toContain("Lebak Bulus");
    // Stripped transit prefix
    expect(findMatchingStop("Stasiun Dukuh Atas BNI", TRANSIT_STOPS)?.name).toContain("Dukuh Atas");
    // Substring
    expect(findMatchingStop("Halim", TRANSIT_STOPS)?.name).toContain("Halim");
    // Unknown returns null
    expect(findMatchingStop("TotallyUnknownStop123", TRANSIT_STOPS)).toBeNull();
    // Empty returns null
    expect(findMatchingStop("", TRANSIT_STOPS)).toBeNull();
    expect(findMatchingStop("   ", TRANSIT_STOPS)).toBeNull();
  });

  it("routes far pairs deterministically instead of claiming nothing exists", () => {
    // Pair from different networks without a direct or 1-transfer stop.
    // The 2-transfer BFS resolves it with real estimates, never fake fares.
    const journey = resolvePlannedJourney(
      "Stasiun Lebak Bulus Grab",
      "Stasiun Kereta Cepat Padalarang",
      TRANSIT_STOPS,
      TRANSIT_LINES
    );

    expect(journey).not.toBeNull();
    if (!journey) return;

    expect(journey.directLines).toHaveLength(0);
    expect(journey.transferOption).toBeUndefined();
    expect(journey.transferLegs).toBeDefined();
    expect(journey.transferLegs!.length).toBeGreaterThan(0);
    expect(journey.transferLegs!.length).toBeLessThanOrEqual(2);
    expect(journey.candidateLines.length).toBeGreaterThan(0);
    expect(journey.estimatedFareRp).toBeLessThanOrEqual(10000);
  });

  it("reports a route only when candidate lines exist", () => {
    // Routable pair: the planner found candidate lines, so the UI may claim a route
    const routed = resolvePlannedJourney(
      "Lebak Bulus Grab",
      "Bundaran HI Bank DKI",
      TRANSIT_STOPS,
      TRANSIT_LINES
    );
    expect(journeyHasRoute(routed)).toBe(true);

    // Far pair: resolved stops exist, and the 2-transfer BFS claims a route
    const farPair = resolvePlannedJourney(
      "Stasiun Lebak Bulus Grab",
      "Stasiun Kereta Cepat Padalarang",
      TRANSIT_STOPS,
      TRANSIT_LINES
    );
    expect(journeyHasRoute(farPair)).toBe(true);

    // No journey at all is never a route
    expect(journeyHasRoute(null)).toBe(false);
  });

  it("ranks stop suggestions with prefix matches first and caps at six", () => {    const suggestions = getStopSuggestions("Halim", TRANSIT_STOPS, TRANSIT_LINES);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    const names = suggestions.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const s of suggestions) {
      expect(s.name.toLowerCase()).toContain("halim");
      expect(s.lineCode).toBeTruthy();
    }

    expect(getStopSuggestions("", TRANSIT_STOPS, TRANSIT_LINES)).toEqual([]);
    expect(getStopSuggestions("   ", TRANSIT_STOPS, TRANSIT_LINES)).toEqual([]);
  });

  it("finds a deterministic 2-transfer itinerary when direct and 1-transfer fail", () => {
    const stop = (
      id: string,
      lineId: string,
      name: string,
      lat: number,
      lng: number,
    ) => ({
      id,
      lineId,
      name,
      code: id,
      latitude: lat,
      longitude: lng,
      sequence: 1,
      isInterchange: false,
      connectedLineIds: [] as string[],
      facilities: [] as string[],
      accessibleElevator: false,
      tactilePaving: false,
      wheelchairRamp: false,
    });
    const line = (id: string, code: string) => ({
      id,
      regionId: "r1",
      code,
      name: code,
      category: "BUS" as const,
      mode: "TRANSJAKARTA_BRT" as const,
      colorHex: "#06B6D4",
      textColorHex: "#ffffff",
      fareType: "FLAT" as const,
      baseFareRp: 3500,
      farePerKmRp: 0,
      maxFareRp: 3500,
      headwayMinutes: 5,
      firstDeparture: "05:00",
      lastDeparture: "22:00",
      polylineCoordinates: [],
    });
    const stops = [
      stop("s-o", "line-a", "Origin Terminal", -6.2, 106.8),
      stop("s-h1a", "line-a", "Hub One", -6.21, 106.81),
      stop("s-h1b", "line-b", "Hub One", -6.21, 106.81),
      stop("s-h2b", "line-b", "Hub Two", -6.22, 106.82),
      stop("s-h2c", "line-c", "Hub Two", -6.22, 106.82),
      stop("s-d", "line-c", "Destination Terminal", -6.23, 106.83),
    ];
    const lines = [line("line-a", "A"), line("line-b", "B"), line("line-c", "C")];

    const journey = resolvePlannedJourney("Origin Terminal", "Destination Terminal", stops, lines);

    expect(journey).not.toBeNull();
    if (!journey) return;
    expect(journey.directLines).toHaveLength(0);
    expect(journey.transferLegs).toBeDefined();
    expect(journey.transferLegs!.length).toBeGreaterThan(0);
    expect(journey.transferLegs!.length).toBeLessThanOrEqual(2);
    expect(journey.transferLegs![0].lines.map((l) => l.id)).toEqual([
      "line-a",
      "line-b",
      "line-c",
    ]);
    expect(journey.transferLegs![0].transferStops.map((t) => t.name)).toEqual([
      "Hub One",
      "Hub Two",
    ]);
    expect(journeyHasRoute(journey)).toBe(true);
    expect(journey.estimatedFareRp).toBeLessThanOrEqual(10000);
  });
});
