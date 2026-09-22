import { describe, it, expect } from "vitest";
import { Stop, TimetableRun } from "../src/types/transit";
import {
  computeStationDistances,
  computeRunStringlineTrajectory,
  detectTrajectoryIntersections,
  timeStringToMinutes,
  minutesToTimeString,
} from "../src/lib/simulation/timetableMatrix";

describe("Graphical Stringline / Marey Chart Engine (GAPEKA Zugdiagramm)", () => {
  const sampleStops: Stop[] = [
    {
      id: "stop-1",
      lineId: "line-mrt",
      name: "Stasiun Lebak Bulus Grab",
      code: "LBK",
      latitude: -6.2891,
      longitude: 106.7744,
      sequence: 1,
      isInterchange: false,
      connectedLineIds: [],
      facilities: [],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
    {
      id: "stop-2",
      lineId: "line-mrt",
      name: "Stasiun Fatmawati Indomaret",
      code: "FTM",
      latitude: -6.2926,
      longitude: 106.7925,
      sequence: 2,
      isInterchange: false,
      connectedLineIds: [],
      facilities: [],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
    {
      id: "stop-3",
      lineId: "line-mrt",
      name: "Stasiun Blok M BCA",
      code: "BLM",
      latitude: -6.2444,
      longitude: 106.7981,
      sequence: 3,
      isInterchange: true,
      connectedLineIds: [],
      facilities: [],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "TOD",
    },
    {
      id: "stop-4",
      lineId: "line-mrt",
      name: "Stasiun Bundaran HI Bank DKI",
      code: "BHI",
      latitude: -6.1931,
      longitude: 106.8231,
      sequence: 4,
      isInterchange: true,
      connectedLineIds: [],
      facilities: [],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
  ];

  describe("computeStationDistances", () => {
    it("computes cumulative kilometers along stops using real geographic Haversine distance", () => {
      const distances = computeStationDistances(sampleStops, true);
      expect(distances).toHaveLength(4);
      expect(distances[0].cumulativeKm).toBe(0);
      expect(distances[0].fraction).toBe(0);
      expect(distances[1].cumulativeKm).toBeGreaterThan(1.5);
      expect(distances[3].cumulativeKm).toBeGreaterThan(10);
      expect(distances[3].fraction).toBe(1.0);
    });

    it("supports uniform station spacing mode when requested", () => {
      const uniformDistances = computeStationDistances(sampleStops, false);
      expect(uniformDistances).toHaveLength(4);
      expect(uniformDistances[0].fraction).toBe(0);
      expect(uniformDistances[1].fraction).toBeCloseTo(0.333, 2);
      expect(uniformDistances[2].fraction).toBeCloseTo(0.666, 2);
      expect(uniformDistances[3].fraction).toBe(1.0);
    });

    it("handles edge cases gracefully (empty stops or single stop)", () => {
      expect(computeStationDistances([])).toEqual([]);
      const single = computeStationDistances([sampleStops[0]]);
      expect(single).toHaveLength(1);
      expect(single[0].fraction).toBe(0);
      expect(single[0].cumulativeKm).toBe(0);
    });
  });

  describe("computeRunStringlineTrajectory", () => {
    const distances = computeStationDistances(sampleStops, true);

    it("plots Outbound trajectory from top (y=0) to bottom (y=1) with horizontal dwell steps", () => {
      const outboundRun: TimetableRun = {
        id: "run-out-1",
        lineId: "line-mrt",
        tripCode: "M-101",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "08:00",
        arrivalTime: "08:30",
        operatorName: "MRT Jakarta",
        stopTimes: [
          {
            stopId: "stop-1",
            stopName: "Stasiun Lebak Bulus Grab",
            stopSequence: 1,
            arrivalTime: "08:00",
            departureTime: "08:00",
          },
          {
            stopId: "stop-2",
            stopName: "Stasiun Fatmawati Indomaret",
            stopSequence: 2,
            arrivalTime: "08:06",
            departureTime: "08:08", // 2 min dwell
          },
          {
            stopId: "stop-3",
            stopName: "Stasiun Blok M BCA",
            stopSequence: 3,
            arrivalTime: "08:18",
            departureTime: "08:20", // 2 min dwell
          },
          {
            stopId: "stop-4",
            stopName: "Stasiun Bundaran HI Bank DKI",
            stopSequence: 4,
            arrivalTime: "08:30",
            departureTime: "08:30",
          },
        ],
      };

      const traj = computeRunStringlineTrajectory({
        run: outboundRun,
        stops: sampleStops,
        distances,
        lineColor: "#00a3e0",
      });

      expect(traj).not.toBeNull();
      expect(traj?.direction).toBe("OUTBOUND");
      expect(traj?.startTimeMinutes).toBe(timeStringToMinutes("08:00"));
      expect(traj?.endTimeMinutes).toBe(timeStringToMinutes("08:30"));
      expect(traj?.totalDurationMinutes).toBe(30);
      expect(traj?.color).toBe("#00a3e0");

      // Vertices: Origin (1) + Fatmawati dwell (2) + Blok M dwell (2) + Terminus (1) = 6 vertices
      expect(traj?.vertices).toHaveLength(6);
      expect(traj?.vertices[0].fraction).toBe(0);
      expect(traj?.vertices[traj.vertices.length - 1].fraction).toBe(1.0);

      // Verify horizontal dwell plateau at stop-2
      const dwellArr = traj?.vertices[1];
      const dwellDep = traj?.vertices[2];
      expect(dwellArr?.stopId).toBe("stop-2");
      expect(dwellDep?.stopId).toBe("stop-2");
      expect(dwellArr?.fraction).toBe(dwellDep?.fraction); // Same Y coordinate
      expect(dwellDep?.timeMinutes).toBeGreaterThan(dwellArr?.timeMinutes ?? 0); // Time elapsed
    });

    it("plots Inbound trajectory from bottom (y=1) to top (y=0)", () => {
      const inboundRun: TimetableRun = {
        id: "run-in-1",
        lineId: "line-mrt",
        tripCode: "M-102",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Lebak Bulus Grab",
        departureTime: "08:05",
        arrivalTime: "08:35",
        operatorName: "MRT Jakarta",
        stopTimes: [
          {
            stopId: "stop-4",
            stopName: "Stasiun Bundaran HI Bank DKI",
            stopSequence: 1,
            arrivalTime: "08:05",
            departureTime: "08:05",
          },
          {
            stopId: "stop-3",
            stopName: "Stasiun Blok M BCA",
            stopSequence: 2,
            arrivalTime: "08:15",
            departureTime: "08:16",
          },
          {
            stopId: "stop-2",
            stopName: "Stasiun Fatmawati Indomaret",
            stopSequence: 3,
            arrivalTime: "08:26",
            departureTime: "08:27",
          },
          {
            stopId: "stop-1",
            stopName: "Stasiun Lebak Bulus Grab",
            stopSequence: 4,
            arrivalTime: "08:35",
            departureTime: "08:35",
          },
        ],
      };

      const traj = computeRunStringlineTrajectory({
        run: inboundRun,
        stops: sampleStops,
        distances,
      });

      expect(traj).not.toBeNull();
      expect(traj?.direction).toBe("INBOUND");
      expect(traj?.vertices[0].fraction).toBe(1.0); // Starts at Bundaran HI
      expect(traj?.vertices[traj.vertices.length - 1].fraction).toBe(0); // Ends at Lebak Bulus
    });

    it("applies special line styles and colors for depot stabling and divergence runs", () => {
      const stablingRun: TimetableRun = {
        id: "run-stabling",
        lineId: "line-mrt",
        tripCode: "M-DIPO-01",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Blok M BCA (Dipo)",
        departureTime: "23:30",
        arrivalTime: "23:45",
        operatorName: "MRT Jakarta",
        tripType: "NIGHT_DEPOT_STABLING",
        stopTimes: [
          {
            stopId: "stop-4",
            stopName: "Stasiun Bundaran HI Bank DKI",
            stopSequence: 1,
            arrivalTime: "23:30",
            departureTime: "23:30",
          },
          {
            stopId: "stop-3",
            stopName: "Stasiun Blok M BCA",
            stopSequence: 2,
            arrivalTime: "23:45",
            departureTime: "23:45",
          },
        ],
      };

      const traj = computeRunStringlineTrajectory({
        run: stablingRun,
        stops: sampleStops,
        distances,
      });

      expect(traj?.lineStyle).toBe("DASHED_INDIGO");
      expect(traj?.color).toBe("#818cf8");
    });
  });

  describe("detectTrajectoryIntersections", () => {
    const distances = computeStationDistances(sampleStops, true);

    it("detects crossing meets (Persilangan) between opposing Outbound and Inbound trains", () => {
      const outboundRun: TimetableRun = {
        id: "run-out",
        lineId: "line-mrt",
        tripCode: "M-OUT",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "08:00",
        arrivalTime: "08:30",
        operatorName: "MRT Jakarta",
        stopTimes: [
          { stopId: "stop-1", stopName: "Stasiun Lebak Bulus Grab", stopSequence: 1, arrivalTime: "08:00", departureTime: "08:00" },
          { stopId: "stop-2", stopName: "Stasiun Fatmawati Indomaret", stopSequence: 2, arrivalTime: "08:10", departureTime: "08:10" },
          { stopId: "stop-3", stopName: "Stasiun Blok M BCA", stopSequence: 3, arrivalTime: "08:20", departureTime: "08:20" },
          { stopId: "stop-4", stopName: "Stasiun Bundaran HI Bank DKI", stopSequence: 4, arrivalTime: "08:30", departureTime: "08:30" },
        ],
      };

      const inboundRun: TimetableRun = {
        id: "run-in",
        lineId: "line-mrt",
        tripCode: "M-IN",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Lebak Bulus Grab",
        departureTime: "08:00",
        arrivalTime: "08:30",
        operatorName: "MRT Jakarta",
        stopTimes: [
          { stopId: "stop-4", stopName: "Stasiun Bundaran HI Bank DKI", stopSequence: 1, arrivalTime: "08:00", departureTime: "08:00" },
          { stopId: "stop-3", stopName: "Stasiun Blok M BCA", stopSequence: 2, arrivalTime: "08:10", departureTime: "08:10" },
          { stopId: "stop-2", stopName: "Stasiun Fatmawati Indomaret", stopSequence: 3, arrivalTime: "08:20", departureTime: "08:20" },
          { stopId: "stop-1", stopName: "Stasiun Lebak Bulus Grab", stopSequence: 4, arrivalTime: "08:30", departureTime: "08:30" },
        ],
      };

      const trajOut = computeRunStringlineTrajectory({ run: outboundRun, stops: sampleStops, distances })!;
      const trajIn = computeRunStringlineTrajectory({ run: inboundRun, stops: sampleStops, distances })!;

      const intersections = detectTrajectoryIntersections([trajOut, trajIn], distances);
      expect(intersections.length).toBeGreaterThanOrEqual(1);
      expect(intersections[0].type).toBe("CROSSING_MEET");
      expect(intersections[0].timeMinutes).toBeGreaterThan(timeStringToMinutes("08:10"));
      expect(intersections[0].timeMinutes).toBeLessThan(timeStringToMinutes("08:20"));
    });

    it("detects overtakes (Penyusulan) when a fast express overtakes a slower preceding train", () => {
      const slowRun: TimetableRun = {
        id: "run-slow",
        lineId: "line-mrt",
        tripCode: "LOCAL-1",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "08:00",
        arrivalTime: "08:40",
        operatorName: "MRT Jakarta",
        stopTimes: [
          { stopId: "stop-1", stopName: "Stasiun Lebak Bulus Grab", stopSequence: 1, arrivalTime: "08:00", departureTime: "08:00" },
          { stopId: "stop-2", stopName: "Stasiun Fatmawati Indomaret", stopSequence: 2, arrivalTime: "08:12", departureTime: "08:15" },
          { stopId: "stop-3", stopName: "Stasiun Blok M BCA", stopSequence: 3, arrivalTime: "08:28", departureTime: "08:30" },
          { stopId: "stop-4", stopName: "Stasiun Bundaran HI Bank DKI", stopSequence: 4, arrivalTime: "08:40", departureTime: "08:40" },
        ],
      };

      const fastExpressRun: TimetableRun = {
        id: "run-fast",
        lineId: "line-mrt",
        tripCode: "EXPRESS-2",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "08:08", // Departs 8 mins later
        arrivalTime: "08:25", // Arrives 15 mins earlier
        operatorName: "MRT Jakarta",
        stopTimes: [
          { stopId: "stop-1", stopName: "Stasiun Lebak Bulus Grab", stopSequence: 1, arrivalTime: "08:08", departureTime: "08:08" },
          { stopId: "stop-2", stopName: "Stasiun Fatmawati Indomaret", stopSequence: 2, arrivalTime: "08:13", departureTime: "08:13", isBypass: true },
          { stopId: "stop-3", stopName: "Stasiun Blok M BCA", stopSequence: 3, arrivalTime: "08:19", departureTime: "08:19", isBypass: true },
          { stopId: "stop-4", stopName: "Stasiun Bundaran HI Bank DKI", stopSequence: 4, arrivalTime: "08:25", departureTime: "08:25" },
        ],
      };

      const trajSlow = computeRunStringlineTrajectory({ run: slowRun, stops: sampleStops, distances })!;
      const trajFast = computeRunStringlineTrajectory({ run: fastExpressRun, stops: sampleStops, distances })!;

      const intersections = detectTrajectoryIntersections([trajSlow, trajFast], distances);
      expect(intersections.length).toBeGreaterThanOrEqual(1);
      expect(intersections[0].type).toBe("OVERTAKE");
    });

    it("smoothly interpolates intermediate stops when stopTimes is undefined, avoiding saw-tooth zig-zags", () => {
      const runWithoutStopTimes: TimetableRun = {
        id: "run-no-stops",
        lineId: "line-mrt",
        tripCode: "M-NO-STOP",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "06:00",
        arrivalTime: "06:30",
        operatorName: "MRT Jakarta",
      };

      const traj = computeRunStringlineTrajectory({
        run: runWithoutStopTimes,
        stops: sampleStops,
        distances,
      });

      expect(traj).not.toBeNull();
      expect(traj?.vertices).toHaveLength(4);
      // Vertices must have strictly non-decreasing time
      for (let i = 1; i < traj!.vertices.length; i++) {
        expect(traj!.vertices[i].timeMinutes).toBeGreaterThanOrEqual(traj!.vertices[i - 1].timeMinutes);
      }
    });

    it("guarantees zero duplicate intersection IDs between opposing runs without explicit stopTimes", () => {
      const runA: TimetableRun = {
        id: "run-mrt-101",
        lineId: "line-mrt",
        tripCode: "M-101",
        origin: "Stasiun Lebak Bulus Grab",
        destination: "Stasiun Bundaran HI Bank DKI",
        departureTime: "06:00",
        arrivalTime: "06:30",
        operatorName: "MRT Jakarta",
      };

      const runB: TimetableRun = {
        id: "run-batch-line-mrt-ns-M-1-102-1789871604059-102",
        lineId: "line-mrt",
        tripCode: "M-102",
        origin: "Stasiun Bundaran HI Bank DKI",
        destination: "Stasiun Lebak Bulus Grab",
        departureTime: "06:10",
        arrivalTime: "06:40",
        operatorName: "MRT Jakarta",
      };

      const trajA = computeRunStringlineTrajectory({ run: runA, stops: sampleStops, distances })!;
      const trajB = computeRunStringlineTrajectory({ run: runB, stops: sampleStops, distances })!;

      const intersections = detectTrajectoryIntersections([trajA, trajB], distances);
      expect(intersections.length).toBeGreaterThan(0);

      // Verify all IDs are completely unique
      const ids = intersections.map((int) => int.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

