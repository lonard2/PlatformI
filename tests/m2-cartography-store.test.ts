/**
 * Milestone 2 Test Suite: Responsive Cartography, Spherical Geodesy & Zustand Store
 * Validates:
 * - Pure spherical geodesy functions (Haversine, bearing, polyline interpolation, nearest point projection, next-stop ETA)
 * - Zustand reactive store state transitions (modes, categories, selection, speed, tiles, viewport)
 * - Mode constants completeness & integrity across all 20 transit modes
 *
 * Rules: Zero placeholder stubs, zero raw emojis, authentic test assertions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  haversineDistance,
  calculateBearing,
  calculatePolylineLength,
  interpolatePositionAlongPolyline,
  crossTrackError,
  alongTrackDistance,
  findNearestPointOnPolyline,
  calculateNextStopEta,
  EARTH_RADIUS_METERS,
} from "../src/lib/math/geodesy";
import {
  TRANSIT_MODE_CONFIG,
  TRANSIT_CATEGORY_CONFIG,
  TILE_LAYERS,
  SIMULATION_SPEED_OPTIONS,
  JAKARTA_MAP_CENTER,
  JAKARTA_DEFAULT_ZOOM,
} from "../src/lib/constants/modes";
import { useTransitStore } from "../src/lib/stores/useTransitStore";
import { Coordinate, TransitMode } from "../src/types/transit";

describe("Milestone 2: Pure Spherical Geodesy Library", () => {
  it("calculates Haversine distance supporting both Coordinate objects and tuple coordinates", () => {
    const coordObj1: Coordinate = { latitude: -6.2088, longitude: 106.8456 }; // Jakarta center
    const coordObj2: Coordinate = { latitude: -6.1754, longitude: 106.8272 }; // Monas
    const tuple1: [number, number] = [-6.2088, 106.8456];
    const tuple2: [number, number] = [-6.1754, 106.8272];

    const distFromObjects = haversineDistance(coordObj1, coordObj2);
    const distFromTuples = haversineDistance(tuple1, tuple2);

    expect(distFromObjects).toBeCloseTo(distFromTuples, 4);
    expect(distFromObjects).toBeGreaterThan(4000);
    expect(distFromObjects).toBeLessThan(4500);
  });

  it("calculates Great Circle initial bearing accurately for all 4 cardinal angles", () => {
    const center: [number, number] = [0, 0];
    const north: [number, number] = [1, 0];
    const east: [number, number] = [0, 1];
    const south: [number, number] = [-1, 0];
    const west: [number, number] = [0, -1];

    expect(calculateBearing(center, north)).toBeCloseTo(0, 1);
    expect(calculateBearing(center, east)).toBeCloseTo(90, 1);
    expect(calculateBearing(center, south)).toBeCloseTo(180, 1);
    expect(calculateBearing(center, west)).toBeCloseTo(270, 1);
  });

  it("finds nearest point on polyline with accurate along-track distance and segment projection", () => {
    const polyline: Coordinate[] = [
      { latitude: -6.2892, longitude: 106.7749 }, // Lebak Bulus
      { latitude: -6.2443, longitude: 106.7981 }, // Blok M
      { latitude: -6.1928, longitude: 106.8231 }, // Bundaran HI
    ];

    // Point close to Blok M
    const queryPoint: Coordinate = { latitude: -6.2440, longitude: 106.7980 };
    const nearest = findNearestPointOnPolyline(queryPoint, polyline);

    expect(nearest.distanceMeters).toBeLessThan(100);
    expect(nearest.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(nearest.alongTrackMeters).toBeGreaterThan(0);
    expect(nearest.nearestPoint.latitude).toBeCloseTo(-6.244, 2);
  });

  it("calculates next-stop ETA correctly with speed multiplier and intermediate dwell time", () => {
    const currentDist = 1000;
    const nextStopDist = 3500; // 2500m remaining
    const speedKmh = 50; // 13.889 m/s
    const dwell = 30; // 30s dwell

    // 1x speed: travel time = 2500 / 13.889 = 180s. Total = 180 + 30 = 210s.
    const eta1x = calculateNextStopEta(currentDist, nextStopDist, speedKmh, 1, dwell);
    expect(eta1x).toBe(210);

    // 2x speed: travel time = 2500 / 27.778 = 90s. Total = 90 + 30 = 120s.
    const eta2x = calculateNextStopEta(currentDist, nextStopDist, speedKmh, 2, dwell);
    expect(eta2x).toBe(120);

    // 0x (paused): returns Infinity
    const eta0x = calculateNextStopEta(currentDist, nextStopDist, speedKmh, 0, dwell);
    expect(eta0x).toBe(Infinity);
  });

  it("handles edge cases: empty polyline, single-point polyline, zero distance without crashing", () => {
    const emptyPolyline: Coordinate[] = [];
    const singlePolyline: Coordinate[] = [{ latitude: -6.2088, longitude: 106.8456 }];

    expect(calculatePolylineLength(emptyPolyline)).toBe(0);
    expect(calculatePolylineLength(singlePolyline)).toBe(0);

    const interpEmpty = interpolatePositionAlongPolyline(emptyPolyline, 100);
    expect(interpEmpty.position[0]).toBe(0);

    const interpSingle = interpolatePositionAlongPolyline(singlePolyline, 100);
    expect(interpSingle.position[0]).toBeCloseTo(-6.2088, 4);

    const nearestEmpty = findNearestPointOnPolyline({ latitude: 0, longitude: 0 }, emptyPolyline);
    expect(nearestEmpty.distanceMeters).toBe(Infinity);
  });
});

describe("Milestone 2: Transit Mode Metadata & Cartography Configurations", () => {
  it("provides comprehensive metadata for all 20 transit modes", () => {
    const modes = Object.keys(TRANSIT_MODE_CONFIG) as TransitMode[];
    expect(modes.length).toBe(20);

    for (const mode of modes) {
      const cfg = TRANSIT_MODE_CONFIG[mode];
      expect(cfg.mode).toBe(mode);
      expect(cfg.name.length).toBeGreaterThan(3);
      expect(cfg.shortName.length).toBeGreaterThan(1);
      expect(cfg.operator.length).toBeGreaterThan(2);
      expect(cfg.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cfg.textColorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cfg.iconName.length).toBeGreaterThan(2);
      expect(cfg.speedProfile.cruisingSpeedKmh).toBeGreaterThan(0);
      expect(cfg.speedProfile.maxSpeedKmh).toBeGreaterThanOrEqual(cfg.speedProfile.cruisingSpeedKmh);
      expect(cfg.speedProfile.standardDwellSeconds).toBeGreaterThan(0);
      expect(cfg.fareDescription.length).toBeGreaterThan(3);
    }
  });

  it("defines all 4 multimodal categories with authentic mode assignments", () => {
    const categories = Object.keys(TRANSIT_CATEGORY_CONFIG);
    expect(categories).toContain("RAIL");
    expect(categories).toContain("BUS");
    expect(categories).toContain("AVIATION");
    expect(categories).toContain("MARITIME");

    expect(TRANSIT_CATEGORY_CONFIG.RAIL.modes.length).toBeGreaterThanOrEqual(10);
    expect(TRANSIT_CATEGORY_CONFIG.BUS.modes.length).toBeGreaterThanOrEqual(5);
    expect(TRANSIT_CATEGORY_CONFIG.AVIATION.modes.length).toBeGreaterThanOrEqual(1);
    expect(TRANSIT_CATEGORY_CONFIG.MARITIME.modes.length).toBeGreaterThanOrEqual(2);
  });

  it("configures 4 distinct cartography basemap tile layers", () => {
    const tiles = Object.keys(TILE_LAYERS);
    expect(tiles).toEqual(["dark", "light", "satellite", "streets"]);

    for (const tileId of tiles) {
      const tile = TILE_LAYERS[tileId as keyof typeof TILE_LAYERS];
      expect(tile.url).toContain("{z}");
      expect(tile.url).toContain("{x}");
      expect(tile.url).toContain("{y}");
      expect(tile.maxZoom).toBeGreaterThanOrEqual(18);
    }
  });

  it("defines 4 simulation speed multiplier options", () => {
    expect(SIMULATION_SPEED_OPTIONS.length).toBe(4);
    const values = SIMULATION_SPEED_OPTIONS.map((o) => o.value);
    expect(values).toEqual([0, 1, 2, 5]);
  });
});

describe("Milestone 2: Zustand useTransitStore Reactive State", () => {
  beforeEach(() => {
    useTransitStore.getState().resetViewport();
    useTransitStore.getState().selectAllModes();
    useTransitStore.getState().clearSelection();
    useTransitStore.getState().setSimulationSpeed(1);
    useTransitStore.getState().setTileLayer("dark");
  });

  it("manages viewport center, zoom, and reset functions", () => {
    const store = useTransitStore.getState();
    expect(store.viewportCenter).toEqual(JAKARTA_MAP_CENTER);
    expect(store.viewportZoom).toBe(JAKARTA_DEFAULT_ZOOM);

    store.setViewport([-6.1754, 106.8272], 15);
    expect(useTransitStore.getState().viewportCenter).toEqual([-6.1754, 106.8272]);
    expect(useTransitStore.getState().viewportZoom).toBe(15);

    useTransitStore.getState().resetViewport();
    expect(useTransitStore.getState().viewportCenter).toEqual(JAKARTA_MAP_CENTER);
    expect(useTransitStore.getState().viewportZoom).toBe(JAKARTA_DEFAULT_ZOOM);
  });

  it("toggles mode filters and maintains active mode queries", () => {
    const store = useTransitStore.getState();
    expect(store.isModeActive("MRT_JAKARTA")).toBe(true);

    store.toggleMode("MRT_JAKARTA");
    expect(useTransitStore.getState().isModeActive("MRT_JAKARTA")).toBe(false);

    useTransitStore.getState().toggleMode("MRT_JAKARTA");
    expect(useTransitStore.getState().isModeActive("MRT_JAKARTA")).toBe(true);

    useTransitStore.getState().clearAllModes();
    expect(useTransitStore.getState().selectedModes.length).toBe(0);

    useTransitStore.getState().selectAllModes();
    expect(useTransitStore.getState().selectedModes.length).toBe(20);
  });

  it("toggles category filters and synchronizes underlying modes", () => {
    const store = useTransitStore.getState();
    expect(store.isCategoryActive("RAIL")).toBe(true);

    // Deactivate RAIL
    store.toggleCategory("RAIL");
    expect(useTransitStore.getState().isCategoryActive("RAIL")).toBe(false);
    expect(useTransitStore.getState().isModeActive("MRT_JAKARTA")).toBe(false);
    expect(useTransitStore.getState().isModeActive("WHOOSH_HSR")).toBe(false);

    // Reactivate RAIL
    useTransitStore.getState().toggleCategory("RAIL");
    expect(useTransitStore.getState().isCategoryActive("RAIL")).toBe(true);
    expect(useTransitStore.getState().isModeActive("MRT_JAKARTA")).toBe(true);
  });

  it("manages entity selection and opens appropriate inspector drawers", () => {
    const store = useTransitStore.getState();
    expect(store.selectedVehicleId).toBeNull();
    expect(store.activeDrawer).toBeNull();

    store.selectVehicle("veh-mrt-ts01");
    expect(useTransitStore.getState().selectedVehicleId).toBe("veh-mrt-ts01");
    expect(useTransitStore.getState().activeDrawer).toBe("vehicle");

    useTransitStore.getState().selectStop("stop-mrt-dka");
    expect(useTransitStore.getState().selectedStopId).toBe("stop-mrt-dka");
    expect(useTransitStore.getState().selectedVehicleId).toBeNull();
    expect(useTransitStore.getState().activeDrawer).toBe("hub");

    useTransitStore.getState().clearSelection();
    expect(useTransitStore.getState().selectedStopId).toBeNull();
    expect(useTransitStore.getState().activeDrawer).toBeNull();
  });

  it("updates simulation clock speed multiplier and basemap tiles", () => {
    useTransitStore.getState().setSimulationSpeed(5);
    expect(useTransitStore.getState().simulationSpeed).toBe(5);

    useTransitStore.getState().setTileLayer("satellite");
    expect(useTransitStore.getState().activeTileLayer).toBe("satellite");

    useTransitStore.getState().toggleTheme();
    expect(useTransitStore.getState().theme).toBe("light");
  });
});
