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
  generatePathFromStops,
  lineToGeoJSON,
  parseGeoJSONToLine,
  snapRouteToRoads,
  simplifyPolyline,
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

  it("generates smoothed route path from ordered transit stops", () => {
    const stops = [
      { latitude: -6.1929, longitude: 106.8236, sequence: 1 },
      { latitude: -6.2008, longitude: 106.8228, sequence: 2 },
      { latitude: -6.2088, longitude: 106.822, sequence: 3 },
    ];

    const path = generatePathFromStops(stops, true);
    expect(path.length).toBeGreaterThan(stops.length);
    expect(path[0].latitude).toBeCloseTo(stops[0].latitude, 4);
    expect(path[path.length - 1].latitude).toBeCloseTo(stops[2].latitude, 4);
  });

  it("exports and imports standard RFC 7946 GeoJSON FeatureCollections", () => {
    const mockLine = {
      id: "line-test-geojson",
      code: "GEO-1",
      name: "GeoJSON Test Corridor",
      polylineCoordinates: [
        { latitude: -6.1929, longitude: 106.8236 },
        { latitude: -6.2008, longitude: 106.8228 },
      ],
    };

    const mockStops = [
      {
        id: "stop-g1",
        name: "Station Alpha",
        code: "STA",
        latitude: -6.1929,
        longitude: 106.8236,
        sequence: 1,
        isInterchange: true,
      },
    ];

    const geojson = lineToGeoJSON(mockLine, mockStops);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(2);

    const serialized = JSON.stringify(geojson);
    const parsed = parseGeoJSONToLine(serialized);

    expect(parsed.code).toBe("GEO-1");
    expect(parsed.polylineCoordinates).toHaveLength(2);
    expect(parsed.stops).toHaveLength(1);
    expect(parsed.stops[0].name).toBe("Station Alpha");
    expect(parsed.stops[0].isInterchange).toBe(true);
  });

  it("snaps route to road network with graceful Catmull-Rom fallback", async () => {
    const rawCoords: Coordinate[] = [
      { latitude: -6.1929, longitude: 106.8236 },
      { latitude: -6.2008, longitude: 106.8228 },
    ];

    const result = await snapRouteToRoads(rawCoords, 500);
    expect(result.length).toBeGreaterThanOrEqual(rawCoords.length);
    expect(result[0].latitude).toBeCloseTo(rawCoords[0].latitude, 3);
  });

  it("simplifies dense polyline paths using Douglas-Peucker algorithm", () => {
    // Collinear points along a line plus a few slight deviations
    const straightLineWithNoise: Coordinate[] = [
      { latitude: -6.1929, longitude: 106.8236 },
      { latitude: -6.1949, longitude: 106.8236 }, // directly collinear
      { latitude: -6.1969, longitude: 106.8236 }, // directly collinear
      { latitude: -6.1989, longitude: 106.8236 }, // directly collinear
      { latitude: -6.2008, longitude: 106.8228 }, // sharp turn
    ];

    const simplified = simplifyPolyline(straightLineWithNoise, 30);
    expect(simplified.length).toBeLessThan(straightLineWithNoise.length);
    expect(simplified[0].latitude).toBeCloseTo(straightLineWithNoise[0].latitude, 4);
    expect(simplified[simplified.length - 1].latitude).toBeCloseTo(
      straightLineWithNoise[straightLineWithNoise.length - 1].latitude,
      4
    );
  });
});
