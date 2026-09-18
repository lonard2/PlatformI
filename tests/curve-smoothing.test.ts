/**
 * Automated Vitest Suite: Cartographic Curve Smoothing & Spline Interpolation
 * Tests Centripetal Catmull-Rom math, endpoint fidelity, coordinate conversions, and distance.
 */

import { describe, it, expect } from "vitest";
import {
  smoothPolyline,
  haversineDistanceMeters,
  coordinatesToLatLngTuples,
  latLngTuplesToCoordinates,
} from "@/lib/geodesy/curveSmoothing";
import { Coordinate } from "@/types/transit";

describe("Cartographic Curve Smoothing (Centripetal Catmull-Rom)", () => {
  it("preserves empty or single-point input without modification", () => {
    expect(smoothPolyline([])).toEqual([]);
    const single: Coordinate[] = [{ latitude: -6.2, longitude: 106.8 }];
    expect(smoothPolyline(single)).toEqual(single);
  });

  it("linearly densifies two-point line segment", () => {
    const p1: Coordinate = { latitude: -6.2, longitude: 106.8 };
    const p2: Coordinate = { latitude: -6.25, longitude: 106.85 };
    const result = smoothPolyline([p1, p2], { stepsPerSegment: 4 });

    expect(result.length).toBe(5);
    expect(result[0].latitude).toBe(p1.latitude);
    expect(result[0].longitude).toBe(p1.longitude);
    expect(result[result.length - 1].latitude).toBe(p2.latitude);
    expect(result[result.length - 1].longitude).toBe(p2.longitude);
  });

  it("smooths multi-point transit route with exact start and end coordinate match", () => {
    // Sparse route: Bundaran HI (-6.1929, 106.8236) -> Dukuh Atas (-6.2008, 106.8228) -> Setiabudi (-6.2088, 106.8220)
    const rawStops: Coordinate[] = [
      { latitude: -6.1929, longitude: 106.8236 },
      { latitude: -6.2008, longitude: 106.8228 },
      { latitude: -6.2088, longitude: 106.822 },
      { latitude: -6.2168, longitude: 106.8215 },
    ];

    const smoothed = smoothPolyline(rawStops, { stepsPerSegment: 6 });

    // Ensure densified length > raw points
    expect(smoothed.length).toBeGreaterThan(rawStops.length);

    // Exact terminal matches
    expect(smoothed[0].latitude).toBeCloseTo(rawStops[0].latitude, 4);
    expect(smoothed[0].longitude).toBeCloseTo(rawStops[0].longitude, 4);
    expect(smoothed[smoothed.length - 1].latitude).toBeCloseTo(
      rawStops[rawStops.length - 1].latitude,
      4
    );
    expect(smoothed[smoothed.length - 1].longitude).toBeCloseTo(
      rawStops[rawStops.length - 1].longitude,
      4
    );

    // Ensure zero NaN or null values
    smoothed.forEach((coord) => {
      expect(Number.isFinite(coord.latitude)).toBe(true);
      expect(Number.isFinite(coord.longitude)).toBe(true);
    });
  });

  it("calculates accurate Haversine geodesic distance", () => {
    // Jakarta Monas to Bundaran HI (~2.3 km)
    const dist = haversineDistanceMeters(-6.1754, 106.8272, -6.1929, 106.8236);
    expect(dist).toBeGreaterThan(1800);
    expect(dist).toBeLessThan(2500);
  });

  it("bi-directionally converts between Coordinate objects and [lat, lng] tuples", () => {
    const coords: Coordinate[] = [
      { latitude: -6.1929, longitude: 106.8236 },
      { latitude: -6.2008, longitude: 106.8228 },
    ];

    const tuples = coordinatesToLatLngTuples(coords);
    expect(tuples).toEqual([
      [-6.1929, 106.8236],
      [-6.2008, 106.8228],
    ]);

    const backToCoords = latLngTuplesToCoordinates(tuples);
    expect(backToCoords).toEqual(coords);
  });
});
