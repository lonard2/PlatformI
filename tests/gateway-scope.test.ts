/**
 * RED: gateway-mode geometry — point-in-polygon and segment clipping keep
 * schematic intercity tails inside the active region instead of drawing
 * straight lines to Surabaya, Jogja, Bandung, and open sea.
 */
import { describe, it, expect } from "vitest";
import {
  GATEWAY_MODES,
  pointInPolygon,
  clipPolylineToPolygon,
  gatewayVisibleSegments,
} from "@/lib/geodesy/regionClip";
import type { Coordinate } from "@/types/transit";

// Jabodetabek boundary box from the seeded region record.
const JAKARTA_BOX: Coordinate[] = [
  { latitude: -6.08, longitude: 106.65 },
  { latitude: -6.08, longitude: 107.05 },
  { latitude: -6.42, longitude: 107.05 },
  { latitude: -6.42, longitude: 106.65 },
];

const KAI_TAIL: Coordinate[] = [
  { latitude: -6.18, longitude: 106.83 },
  { latitude: -6.17, longitude: 106.84 },
  { latitude: -6.22, longitude: 106.87 },
  { latitude: -6.24, longitude: 107.0 },
  { latitude: -6.7, longitude: 108.55 },
  { latitude: -7.01, longitude: 110.44 },
  { latitude: -7.26, longitude: 112.75 },
];

describe("gateway geometry clipping", () => {
  it("covers exactly the intercity gateway modes", () => {
    expect([...GATEWAY_MODES].sort()).toEqual(
      ["AKAP_INTERCITY_BUS", "EXECUTIVE_SHUTTLE", "KAI_INTERCITY", "MARITIME_PELNI"].sort()
    );
  });

  it("classifies inside, outside, and edge points", () => {
    expect(pointInPolygon(-6.2, 106.83, JAKARTA_BOX)).toBe(true);
    expect(pointInPolygon(-7.26, 112.75, JAKARTA_BOX)).toBe(false);
    expect(pointInPolygon(-6.08, 106.8, JAKARTA_BOX)).toBe(true);
  });

  it("clips the Surabaya tail to contiguous in-region segments", () => {
    const segments = clipPolylineToPolygon(KAI_TAIL, JAKARTA_BOX);
    expect(segments.length).toBe(1);
    expect(segments[0]?.length).toBe(4);
    for (const seg of segments) {
      for (const p of seg) {
        expect(p.longitude).toBeLessThanOrEqual(107.05);
      }
    }
  });

  it("keeps fully inside polylines whole and drops fully outside ones", () => {
    const inside: Coordinate[] = [
      { latitude: -6.2, longitude: 106.83 },
      { latitude: -6.25, longitude: 106.9 },
    ];
    expect(clipPolylineToPolygon(inside, JAKARTA_BOX)).toEqual([inside]);
    const outside: Coordinate[] = [
      { latitude: -7.0, longitude: 110.0 },
      { latitude: -7.2, longitude: 111.0 },
    ];
    expect(clipPolylineToPolygon(outside, JAKARTA_BOX)).toEqual([]);
  });

  it("fails open when the boundary is unknown", () => {
    expect(clipPolylineToPolygon(KAI_TAIL, [])).toEqual([KAI_TAIL]);
    expect(pointInPolygon(-7.26, 112.75, [])).toBe(true);
  });

  it("passes full-corridor modes through untouched", () => {
    const line = { mode: "WHOOSH_HSR", polylineCoordinates: KAI_TAIL } as unknown as Parameters<
      typeof gatewayVisibleSegments
    >[0];
    expect(gatewayVisibleSegments(line, JAKARTA_BOX)).toEqual([KAI_TAIL]);
    const kai = { ...line, mode: "KAI_INTERCITY" } as unknown as Parameters<
      typeof gatewayVisibleSegments
    >[0];
    const clipped = gatewayVisibleSegments(kai, JAKARTA_BOX);
    expect(clipped.length).toBe(1);
    expect(clipped[0]?.length).toBe(4);
  });
});
