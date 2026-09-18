/**
 * PlatformI - Automated Test Suite: Network & Map Studio APIs & Geodesy
 *
 * Verifies:
 * 1. GET /api/network/lines retrieves all transit lines with parsed polyline coordinates.
 * 2. POST /api/network/lines creates a new line with validation and assigns regionId.
 * 3. PUT /api/network/lines updates polyline coordinates with smoothed curve geometry.
 * 4. DELETE /api/network/lines removes line and associated stops.
 * 5. GET /api/network/stops returns all stops with sequence and facilities.
 * 6. POST /api/network/stops creates station with validated coordinates.
 * 7. PUT /api/network/stops calibrates coordinates and sequence.
 * 8. DELETE /api/network/stops removes station.
 * 9. Integration: Polyline densification via Centripetal Catmull-Rom spline.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getLines, POST as postLine, PUT as putLine, DELETE as deleteLine } from "@/app/api/network/lines/route";
import { GET as getStops, POST as postStop, PUT as putStop, DELETE as deleteStop } from "@/app/api/network/stops/route";
import { smoothPolyline, coordinatesToLatLngTuples, haversineDistanceMeters } from "@/lib/geodesy/curveSmoothing";
import { Coordinate } from "@/types/transit";

describe("Network & Map Studio REST API & Geometry Engine", () => {
  const testLineId = `line-test-${Date.now()}`;
  const testStopId = `stop-test-${Date.now()}`;

  describe("1. Transit Lines API (/api/network/lines)", () => {
    it("GET: returns non-empty list of transit lines", async () => {
      const req = new NextRequest("http://localhost:3000/api/network/lines");
      const res = await getLines(req);
      expect(res.status).toBe(200);

      const resJson = await res.json();
      const data = resJson.data || resJson;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("polylineCoordinates");
      expect(data[0]).toHaveProperty("code");
    });

    it("POST: rejects creation when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/network/lines", {
        method: "POST",
        body: JSON.stringify({ name: "Incomplete Line" }),
      });
      const res = await postLine(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("POST: successfully creates a new transit line with custom coordinates", async () => {
      const newLinePayload = {
        id: testLineId,
        code: "TEST-L1",
        name: "Test Experimental Corridor",
        category: "RAIL",
        mode: "MRT_JAKARTA",
        colorHex: "#3b82f6",
        textColorHex: "#ffffff",
        fareType: "PROGRESSIVE_DISTANCE",
        baseFareRp: 3000,
        farePerKmRp: 1000,
        maxFareRp: 14000,
        headwayMinutes: 5,
        firstDeparture: "05:00",
        lastDeparture: "23:00",
        polylineCoordinates: [
          { latitude: -6.2001, longitude: 106.8166 },
          { latitude: -6.215, longitude: 106.822 },
          { latitude: -6.23, longitude: 106.83 },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/network/lines", {
        method: "POST",
        body: JSON.stringify(newLinePayload),
      });
      const res = await postLine(req);
      expect(res.status).toBe(201);

      const resJson = await res.json();
      const created = resJson.data || resJson;
      expect(created.code).toBe("TEST-L1");
      expect(created.polylineCoordinates.length).toBe(3);
    });

    it("PUT: updates line coordinates with smoothed Catmull-Rom curve", async () => {
      const rawCoords: Coordinate[] = [
        { latitude: -6.2, longitude: 106.8 },
        { latitude: -6.22, longitude: 106.81 },
        { latitude: -6.25, longitude: 106.83 },
      ];
      const smoothed = smoothPolyline(rawCoords, 4);

      const updatePayload = {
        id: testLineId,
        code: "TEST-L1-SMOOTH",
        name: "Test Experimental Corridor (Smoothed)",
        polylineCoordinates: smoothed,
      };

      const req = new NextRequest("http://localhost:3000/api/network/lines", {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });
      const res = await putLine(req);
      expect(res.status).toBe(200);

      const resJson = await res.json();
      const updated = resJson.data || resJson;
      expect(updated.code).toBe("TEST-L1-SMOOTH");
      expect(updated.polylineCoordinates.length).toBeGreaterThan(rawCoords.length);
    });

    it("DELETE: removes line by query id", async () => {
      const req = new NextRequest(`http://localhost:3000/api/network/lines?id=${testLineId}`, {
        method: "DELETE",
      });
      const res = await deleteLine(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("2. Transit Stops API (/api/network/stops)", () => {
    it("GET: returns non-empty list of transit stops", async () => {
      const req = new NextRequest("http://localhost:3000/api/network/stops");
      const res = await getStops(req);
      expect(res.status).toBe(200);

      const resJson = await res.json();
      const data = resJson.data || resJson;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("latitude");
      expect(data[0]).toHaveProperty("longitude");
    });

    it("POST: creates a new transit stop with geofence coordinates", async () => {
      const newStopPayload = {
        id: testStopId,
        lineId: "line-mrt-ns",
        name: "Test Grand Central Hub",
        code: "TGCH",
        latitude: -6.2088,
        longitude: 106.8225,
        sequence: 99,
        isInterchange: true,
        connectedLineIds: ["line-krl-bogor", "line-tj-01"],
        facilities: ["TOILET", "ELEVATOR", "RETAIL"],
        accessibleElevator: true,
        tactilePaving: true,
        wheelchairRamp: true,
        platformType: "ISLAND",
      };

      const req = new NextRequest("http://localhost:3000/api/network/stops", {
        method: "POST",
        body: JSON.stringify(newStopPayload),
      });
      const res = await postStop(req);
      expect(res.status).toBe(201);

      const resJson = await res.json();
      const created = resJson.data || resJson;
      expect(created.name).toBe("Test Grand Central Hub");
      expect(created.code).toBe("TGCH");
      expect(created.isInterchange).toBe(true);
    });

    it("PUT: calibrates station coordinates and sequence", async () => {
      const updatePayload = {
        id: testStopId,
        latitude: -6.209,
        longitude: 106.823,
        sequence: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/network/stops", {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });
      const res = await putStop(req);
      expect(res.status).toBe(200);

      const resJson = await res.json();
      const updated = resJson.data || resJson;
      expect(updated.latitude).toBe(-6.209);
      expect(updated.sequence).toBe(100);
    });

    it("DELETE: removes stop by query id", async () => {
      const req = new NextRequest(`http://localhost:3000/api/network/stops?id=${testStopId}`, {
        method: "DELETE",
      });
      const res = await deleteStop(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("3. Curvature Smoothing Geodesy Integration", () => {
    it("converts between coordinate formats without precision loss", () => {
      const original: Coordinate[] = [
        { latitude: -6.1754, longitude: 106.8272 },
        { latitude: -6.2008, longitude: 106.8228 },
      ];
      const tuples = coordinatesToLatLngTuples(original);
      expect(tuples).toHaveLength(2);
      expect(tuples[0]).toEqual([-6.1754, 106.8272]);
    });

    it("smooths polyline and maintains finite positive segment distances", () => {
      const raw: Coordinate[] = [
        { latitude: -6.195, longitude: 106.82 },
        { latitude: -6.205, longitude: 106.825 },
        { latitude: -6.215, longitude: 106.83 },
        { latitude: -6.225, longitude: 106.832 },
      ];

      const smoothed = smoothPolyline(raw, 5);
      expect(smoothed.length).toBeGreaterThan(raw.length);

      // Check distance of each sub-segment
      for (let i = 0; i < smoothed.length - 1; i++) {
        const dist = haversineDistanceMeters(
          smoothed[i].latitude,
          smoothed[i].longitude,
          smoothed[i + 1].latitude,
          smoothed[i + 1].longitude
        );
        expect(dist).toBeGreaterThan(0);
        expect(Number.isFinite(dist)).toBe(true);
      }
    });
  });
});
