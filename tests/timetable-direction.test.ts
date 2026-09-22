/**
 * PlatformI - Bi-Directional Corridor Filtering & Asymmetric Headway Test Suite
 *
 * Validates:
 * 1. Direction determination (determineRunDirection) for Outbound (Arah Hilir) vs Inbound (Arah Mudik).
 * 2. Headway analytics & asymmetry detection (computeCorridorHeadwayStats).
 * 3. Bi-directional batch schedule synthesis with asymmetric headways & authentic numbering.
 * 4. Downstream chronological stop cascading across reversed inbound sequences.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { describe, it, expect } from "vitest";
import { Stop, TimetableRun } from "@/types/transit";
import {
  determineRunDirection,
  computeCorridorHeadwayStats,
  generateBatchTimetableRuns,
  getOrderedLineStops,
  cascadeStopTimes,
} from "@/lib/simulation/timetableMatrix";

const MOCK_LINE_STOPS: Stop[] = [
  {
    id: "stn-lebak-bulus",
    lineId: "line-mrt-ns",
    name: "Stasiun Lebak Bulus Grab",
    code: "LBB",
    latitude: -6.2892,
    longitude: 106.7745,
    sequence: 1,
    isInterchange: false,
    connectedLineIds: [],
    facilities: ["ELEVATOR"],
    accessibleElevator: true,
    tactilePaving: true,
    wheelchairRamp: true,
  },
  {
    id: "stn-fatmawati",
    lineId: "line-mrt-ns",
    name: "Stasiun Fatmawati Indomaret",
    code: "FTM",
    latitude: -6.2925,
    longitude: 106.7938,
    sequence: 2,
    isInterchange: false,
    connectedLineIds: [],
    facilities: ["ELEVATOR"],
    accessibleElevator: true,
    tactilePaving: true,
    wheelchairRamp: true,
  },
  {
    id: "stn-blok-m",
    lineId: "line-mrt-ns",
    name: "Stasiun Blok M BCA",
    code: "BLM",
    latitude: -6.2444,
    longitude: 106.7981,
    sequence: 3,
    isInterchange: true,
    connectedLineIds: ["line-tj-cor-1"],
    facilities: ["ELEVATOR"],
    accessibleElevator: true,
    tactilePaving: true,
    wheelchairRamp: true,
  },
  {
    id: "stn-bundaran-hi",
    lineId: "line-mrt-ns",
    name: "Stasiun Bundaran HI Bank DKI",
    code: "BHI",
    latitude: -6.1928,
    longitude: 106.823,
    sequence: 4,
    isInterchange: true,
    connectedLineIds: ["line-tj-cor-1"],
    facilities: ["ELEVATOR"],
    accessibleElevator: true,
    tactilePaving: true,
    wheelchairRamp: true,
  },
];

describe("Bi-Directional Corridor Filtering & Direction Engine", () => {
  describe("determineRunDirection", () => {
    it("respects explicit direction property if present on run", () => {
      const runOutbound: TimetableRun = {
        id: "run-1",
        lineId: "line-mrt-ns",
        tripCode: "M-1-101",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "06:00",
        arrivalTime: "06:30",
        operatorName: "PT MRT Jakarta",
        direction: "OUTBOUND",
      };

      const runInbound: TimetableRun = {
        id: "run-2",
        lineId: "line-mrt-ns",
        tripCode: "M-1-102",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Lebak Bulus Grab",
        departureTime: "06:00",
        arrivalTime: "06:30",
        operatorName: "PT MRT Jakarta",
        direction: "INBOUND",
      };

      expect(determineRunDirection(runOutbound, MOCK_LINE_STOPS)).toBe("OUTBOUND");
      expect(determineRunDirection(runInbound, MOCK_LINE_STOPS)).toBe("INBOUND");
    });

    it("infers Outbound (Arah Hilir) from origin/destination matching line terminus stops", () => {
      const run: TimetableRun = {
        id: "run-out-inferred",
        lineId: "line-mrt-ns",
        tripCode: "M-1-103",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "07:00",
        arrivalTime: "07:30",
        operatorName: "PT MRT Jakarta",
      };

      expect(determineRunDirection(run, MOCK_LINE_STOPS)).toBe("OUTBOUND");
    });

    it("infers Inbound (Arah Mudik) when origin matches the final line terminus", () => {
      const run: TimetableRun = {
        id: "run-in-inferred",
        lineId: "line-mrt-ns",
        tripCode: "M-1-104",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Lebak Bulus Grab",
        departureTime: "07:00",
        arrivalTime: "07:30",
        operatorName: "PT MRT Jakarta",
      };

      expect(determineRunDirection(run, MOCK_LINE_STOPS)).toBe("INBOUND");
    });

    it("infers direction from stopTimes stopId sequence when strings differ", () => {
      const runInbound: TimetableRun = {
        id: "run-stops-seq",
        lineId: "line-mrt-ns",
        tripCode: "M-1-106",
        origin: "Bundaran HI",
        destination: "Lebak Bulus",
        departureTime: "08:00",
        arrivalTime: "08:30",
        operatorName: "PT MRT Jakarta",
        stopTimes: [
          {
            stopId: "stn-bundaran-hi",
            stopName: "Stasiun Bundaran HI Bank DKI",
            stopSequence: 1,
            arrivalTime: "08:00",
            departureTime: "08:00",
          },
          {
            stopId: "stn-fatmawati",
            stopName: "Stasiun Fatmawati Indomaret",
            stopSequence: 2,
            arrivalTime: "08:20",
            departureTime: "08:21",
          },
          {
            stopId: "stn-lebak-bulus",
            stopName: "Stasiun Lebak Bulus Grab",
            stopSequence: 3,
            arrivalTime: "08:30",
            departureTime: "08:30",
          },
        ],
      };

      expect(determineRunDirection(runInbound, MOCK_LINE_STOPS)).toBe("INBOUND");
    });
  });

  describe("computeCorridorHeadwayStats", () => {
    it("detects asymmetric headways between Outbound and Inbound runs", () => {
      // Outbound runs: 5 min headway (06:00, 06:05, 06:10, 06:15)
      const outboundRuns: TimetableRun[] = [
        {
          id: "ob-1",
          lineId: "line-mrt-ns",
          tripCode: "M-1-101",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:00",
          arrivalTime: "06:30",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
        {
          id: "ob-2",
          lineId: "line-mrt-ns",
          tripCode: "M-1-103",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:05",
          arrivalTime: "06:35",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
        {
          id: "ob-3",
          lineId: "line-mrt-ns",
          tripCode: "M-1-105",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:10",
          arrivalTime: "06:40",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
        {
          id: "ob-4",
          lineId: "line-mrt-ns",
          tripCode: "M-1-107",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:15",
          arrivalTime: "06:45",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
      ];

      // Inbound runs: 10 min headway (06:00, 06:10, 06:20)
      const inboundRuns: TimetableRun[] = [
        {
          id: "ib-1",
          lineId: "line-mrt-ns",
          tripCode: "M-1-102",
          origin: "Stasiun Bundaran HI Bank DKI",
          destination: "Stasiun Lebak Bulus Grab",
          departureTime: "06:00",
          arrivalTime: "06:30",
          operatorName: "PT MRT Jakarta",
          direction: "INBOUND",
        },
        {
          id: "ib-2",
          lineId: "line-mrt-ns",
          tripCode: "M-1-104",
          origin: "Stasiun Bundaran HI Bank DKI",
          destination: "Stasiun Lebak Bulus Grab",
          departureTime: "06:10",
          arrivalTime: "06:40",
          operatorName: "PT MRT Jakarta",
          direction: "INBOUND",
        },
        {
          id: "ib-3",
          lineId: "line-mrt-ns",
          tripCode: "M-1-106",
          origin: "Stasiun Bundaran HI Bank DKI",
          destination: "Stasiun Lebak Bulus Grab",
          departureTime: "06:20",
          arrivalTime: "06:50",
          operatorName: "PT MRT Jakarta",
          direction: "INBOUND",
        },
      ];

      const allRuns = [...outboundRuns, ...inboundRuns];
      const stats = computeCorridorHeadwayStats(allRuns, MOCK_LINE_STOPS);

      expect(stats.outboundCount).toBe(4);
      expect(stats.inboundCount).toBe(3);
      expect(stats.averageHeadwayOutboundMinutes).toBe(5);
      expect(stats.averageHeadwayInboundMinutes).toBe(10);
      expect(stats.isAsymmetric).toBe(true);
      expect(stats.minHeadwayOutboundMinutes).toBe(5);
      expect(stats.minHeadwayInboundMinutes).toBe(10);
    });

    it("identifies symmetric headways correctly", () => {
      const runs: TimetableRun[] = [
        {
          id: "s-ob-1",
          lineId: "line-mrt-ns",
          tripCode: "M-1-101",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:00",
          arrivalTime: "06:30",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
        {
          id: "s-ob-2",
          lineId: "line-mrt-ns",
          tripCode: "M-1-103",
          origin: "Stasiun Lebak Bulus Grab",
          destination: "Stasiun Bundaran HI Bank DKI",
          departureTime: "06:05",
          arrivalTime: "06:35",
          operatorName: "PT MRT Jakarta",
          direction: "OUTBOUND",
        },
        {
          id: "s-ib-1",
          lineId: "line-mrt-ns",
          tripCode: "M-1-102",
          origin: "Stasiun Bundaran HI Bank DKI",
          destination: "Stasiun Lebak Bulus Grab",
          departureTime: "06:00",
          arrivalTime: "06:30",
          operatorName: "PT MRT Jakarta",
          direction: "INBOUND",
        },
        {
          id: "s-ib-2",
          lineId: "line-mrt-ns",
          tripCode: "M-1-104",
          origin: "Stasiun Bundaran HI Bank DKI",
          destination: "Stasiun Lebak Bulus Grab",
          departureTime: "06:05",
          arrivalTime: "06:35",
          operatorName: "PT MRT Jakarta",
          direction: "INBOUND",
        },
      ];

      const stats = computeCorridorHeadwayStats(runs, MOCK_LINE_STOPS);
      expect(stats.averageHeadwayOutboundMinutes).toBe(5);
      expect(stats.averageHeadwayInboundMinutes).toBe(5);
      expect(stats.isAsymmetric).toBe(false);
    });
  });

  describe("generateBatchTimetableRuns with Bi-Directional & Asymmetric Headways", () => {
    it("generates Outbound runs starting at stop 1 and ending at stop N", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: MOCK_LINE_STOPS,
        modeCategory: "MRT_JAKARTA",
        startTime: "06:00",
        endTime: "06:20",
        headwayMinutes: 10,
        runCodePrefix: "M-1",
        direction: "OUTBOUND",
      });

      expect(runs.length).toBe(3); // 06:00, 06:10, 06:20
      runs.forEach((r) => {
        expect(r.direction).toBe("OUTBOUND");
        expect(r.origin).toBe("Stasiun Lebak Bulus Grab");
        expect(r.destination).toBe("Stasiun Bundaran HI Bank DKI");
        expect(r.stopTimes?.[0]?.stopId).toBe("stn-lebak-bulus");
        expect(r.stopTimes?.[r.stopTimes.length - 1]?.stopId).toBe("stn-bundaran-hi");
      });
    });

    it("generates Inbound runs starting at stop N and ending at stop 1", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: MOCK_LINE_STOPS,
        modeCategory: "MRT_JAKARTA",
        startTime: "06:00",
        endTime: "06:20",
        headwayMinutes: 10,
        runCodePrefix: "M-1",
        direction: "INBOUND",
      });

      expect(runs.length).toBe(3);
      runs.forEach((r) => {
        expect(r.direction).toBe("INBOUND");
        expect(r.origin).toBe("Stasiun Bundaran HI Bank DKI");
        expect(r.destination).toBe("Stasiun Lebak Bulus Grab");
        expect(r.stopTimes?.[0]?.stopId).toBe("stn-bundaran-hi");
        expect(r.stopTimes?.[r.stopTimes.length - 1]?.stopId).toBe("stn-lebak-bulus");
      });
    });

    it("generates Bi-Directional runs with asymmetric headways and authentic odd/even train numbers", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: MOCK_LINE_STOPS,
        modeCategory: "MRT_JAKARTA",
        startTime: "06:00",
        endTime: "06:30",
        headwayMinutes: 10, // Outbound: 06:00, 06:10, 06:20, 06:30 (4 trips)
        asymmetricInboundHeadwayMinutes: 15, // Inbound: 06:00, 06:15, 06:30 (3 trips)
        runCodePrefix: "M-1",
        startRunNumber: 101,
        direction: "BOTH",
      });

      expect(runs.length).toBe(7);

      const outboundTrips = runs.filter((r) => r.direction === "OUTBOUND");
      const inboundTrips = runs.filter((r) => r.direction === "INBOUND");

      expect(outboundTrips.length).toBe(4);
      expect(inboundTrips.length).toBe(3);

      // Verify authentic railway train numbers: odd for Outbound, even for Inbound
      expect(outboundTrips.map((r) => r.tripCode)).toEqual([
        "M-1-101",
        "M-1-103",
        "M-1-105",
        "M-1-107",
      ]);
      expect(inboundTrips.map((r) => r.tripCode)).toEqual([
        "M-1-102",
        "M-1-104",
        "M-1-106",
      ]);
    });
  });

  describe("Inbound Downstream Stop Time Cascading", () => {
    it("cascades stop times along reversed line stops for inbound runs", () => {
      const inboundStops = getOrderedLineStops(MOCK_LINE_STOPS, "INBOUND");
      expect(inboundStops[0].id).toBe("stn-bundaran-hi");
      expect(inboundStops[inboundStops.length - 1].id).toBe("stn-lebak-bulus");

      const stopTimes = cascadeStopTimes("08:00", inboundStops, "MRT_JAKARTA");

      expect(stopTimes[0].stopId).toBe("stn-bundaran-hi");
      expect(stopTimes[0].departureTime).toBe("08:00");

      expect(stopTimes[stopTimes.length - 1].stopId).toBe("stn-lebak-bulus");
      expect(stopTimes[stopTimes.length - 1].arrivalTime > "08:00").toBe(true);
    });
  });
});
