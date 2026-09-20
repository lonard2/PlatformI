import { describe, it, expect } from "vitest";
import { Stop, Line, TimetableRun } from "../src/types/transit";
import {
  cascadeStopTimes,
  generateBatchTimetableRuns,
  shiftRunSchedule,
  timeStringToMinutes,
  minutesToTimeString,
} from "../src/lib/simulation/timetableMatrix";
import { generateDepartureBoard } from "../src/components/inspector/HubDetailSheet";
import { id as idDictionary } from "../src/lib/i18n/dictionaries/id";

describe("Timetable Matrix & Stop-by-Trip Scheduling Suite", () => {
  const dummyStops: Stop[] = [
    {
      id: "stop-mrt-lbk",
      lineId: "line-mrt-ns",
      name: "Stasiun Lebak Bulus Grab",
      code: "LBK",
      latitude: -6.2891,
      longitude: 106.7744,
      sequence: 1,
      isInterchange: false,
      connectedLineIds: [],
      facilities: ["Elevator", "Escalator"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
    {
      id: "stop-mrt-ftm",
      lineId: "line-mrt-ns",
      name: "Stasiun Fatmawati Indomaret",
      code: "FTM",
      latitude: -6.2926,
      longitude: 106.7925,
      sequence: 2,
      isInterchange: false,
      connectedLineIds: [],
      facilities: ["Elevator"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
    {
      id: "stop-mrt-cpt",
      lineId: "line-mrt-ns",
      name: "Stasiun Cipete Raya",
      code: "CPT",
      latitude: -6.2785,
      longitude: 106.7974,
      sequence: 3,
      isInterchange: false,
      connectedLineIds: [],
      facilities: ["Elevator"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
    {
      id: "stop-mrt-blm",
      lineId: "line-mrt-ns",
      name: "Stasiun Blok M BCA",
      code: "BLM",
      latitude: -6.2444,
      longitude: 106.7981,
      sequence: 4,
      isInterchange: true,
      connectedLineIds: ["line-tj-cor-1"],
      facilities: ["Elevator", "Skybridge"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "TOD",
    },
    {
      id: "stop-mrt-bhi",
      lineId: "line-mrt-ns",
      name: "Stasiun Bundaran HI Bank DKI",
      code: "BHI",
      latitude: -6.1931,
      longitude: 106.823,
      sequence: 5,
      isInterchange: true,
      connectedLineIds: ["line-tj-cor-1"],
      facilities: ["Elevator", "Skybridge"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
    },
  ];

  const dummyLine: Line = {
    id: "line-mrt-ns",
    regionId: "reg-jkt",
    code: "M",
    name: "MRT Jakarta Lin Utara-Selatan (Lebak Bulus - Bundaran HI)",
    category: "RAIL",
    mode: "MRT_JAKARTA",
    colorHex: "#0D9488",
    textColorHex: "#FFFFFF",
    fareType: "PROGRESSIVE_DISTANCE",
    baseFareRp: 3000,
    farePerKmRp: 1000,
    maxFareRp: 14000,
    headwayMinutes: 5,
    firstDeparture: "05:00",
    lastDeparture: "23:00",
    polylineCoordinates: dummyStops.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    stops: dummyStops,
  };

  describe("Time utilities", () => {
    it("converts between HH:mm string and minutes correctly", () => {
      expect(timeStringToMinutes("00:00")).toBe(0);
      expect(timeStringToMinutes("06:30")).toBe(390);
      expect(timeStringToMinutes("23:59")).toBe(1439);

      expect(minutesToTimeString(0)).toBe("00:00");
      expect(minutesToTimeString(390)).toBe("06:30");
      expect(minutesToTimeString(1439)).toBe("23:59");
      expect(minutesToTimeString(1445)).toBe("00:05"); // Rollover
    });
  });

  describe("cascadeStopTimes", () => {
    it("computes sequential arrival and departure times for each stop", () => {
      const stopTimes = cascadeStopTimes("06:00", dummyStops, "MRT_JAKARTA");
      expect(stopTimes.length).toBe(dummyStops.length);

      // Origin stop
      expect(stopTimes[0].stopId).toBe("stop-mrt-lbk");
      expect(stopTimes[0].departureTime).toBe("06:00");

      // Intermediate stops must be strictly ascending in chronological time
      for (let i = 1; i < stopTimes.length; i++) {
        const prevDep = timeStringToMinutes(stopTimes[i - 1].departureTime);
        const currArr = timeStringToMinutes(stopTimes[i].arrivalTime);
        const currDep = timeStringToMinutes(stopTimes[i].departureTime);

        expect(currArr).toBeGreaterThan(prevDep);
        expect(currDep).toBeGreaterThanOrEqual(currArr);
      }

      // Terminus arrival
      const terminus = stopTimes[stopTimes.length - 1];
      expect(terminus.stopId).toBe("stop-mrt-bhi");
      expect(timeStringToMinutes(terminus.arrivalTime)).toBeGreaterThan(timeStringToMinutes("06:00"));
    });

    it("respects express bypass (isBypass = true)", () => {
      const existing = [
        {
          stopId: "stop-mrt-cpt",
          stopName: "Stasiun Cipete Raya",
          stopSequence: 3,
          arrivalTime: "06:08",
          departureTime: "06:08",
          isBypass: true,
        },
      ];

      const stopTimes = cascadeStopTimes("06:00", dummyStops, "MRT_JAKARTA", existing);
      const bypassed = stopTimes.find((st) => st.stopId === "stop-mrt-cpt");
      expect(bypassed).toBeDefined();
      expect(bypassed?.isBypass).toBe(true);
      expect(bypassed?.dwellSeconds).toBe(0);
    });
  });

  describe("generateBatchTimetableRuns (Pola Operasi)", () => {
    it("generates an entire high-frequency sequence with correct headway", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "06:00",
        endTime: "07:00",
        headwayMinutes: 10,
        runCodePrefix: "M-1",
        startRunNumber: 101,
        serviceClass: "Standard Metro",
        notes: "Morning Peak",
      });

      // 06:00, 06:10, 06:20, 06:30, 06:40, 06:50, 07:00 => 7 runs
      expect(runs.length).toBe(7);
      expect(runs[0].tripCode).toBe("M-1-101");
      expect(runs[0].departureTime).toBe("06:00");
      expect(runs[1].tripCode).toBe("M-1-102");
      expect(runs[1].departureTime).toBe("06:10");
      expect(runs[6].tripCode).toBe("M-1-107");
      expect(runs[6].departureTime).toBe("07:00");

      // Each run must have full stopTimes
      runs.forEach((r) => {
        expect(r.stopTimes?.length).toBe(dummyStops.length);
        expect(r.origin).toBe("Stasiun Lebak Bulus Grab");
        expect(r.destination).toBe("Stasiun Bundaran HI Bank DKI");
      });
    });
  });

  describe("shiftRunSchedule", () => {
    it("shifts departure, arrival, and all stopTimes by delta minutes", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "06:00",
        endTime: "06:10",
        headwayMinutes: 10,
        runCodePrefix: "M-1",
      });

      const original = runs[0];
      const shifted = shiftRunSchedule(original, 5);

      expect(shifted.departureTime).toBe("06:05");
      expect(timeStringToMinutes(shifted.arrivalTime)).toBe(
        timeStringToMinutes(original.arrivalTime) + 5
      );

      // Check intermediate stopTimes
      expect(shifted.stopTimes?.[0].departureTime).toBe("06:05");
      const origStop1Arr = timeStringToMinutes(original.stopTimes![1].arrivalTime);
      const shiftedStop1Arr = timeStringToMinutes(shifted.stopTimes![1].arrivalTime);
      expect(shiftedStop1Arr).toBe(origStop1Arr + 5);
    });
  });

  describe("HubDetailSheet Integration with Matrix stopTimes", () => {
    it("uses intermediate station scheduled arrival time rather than origin terminus time", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "07:00",
        endTime: "07:00",
        headwayMinutes: 10,
        runCodePrefix: "M-1",
        startRunNumber: 101,
      });

      const intermediateStop = dummyStops[3]; // Blok M BCA
      expect(intermediateStop.name).toBe("Stasiun Blok M BCA");

      const departures = generateDepartureBoard(
        intermediateStop,
        [dummyLine],
        idDictionary,
        runs
      );

      const targetTrip = departures.find((d) => d.runNumber === "M-1-101");
      expect(targetTrip).toBeDefined();

      // At Blok M, departure time must NOT be 07:00 (origin time). It must be Blok M's intermediate time!
      expect(targetTrip?.scheduledTime).not.toBe("07:00");
      expect(timeStringToMinutes(targetTrip!.scheduledTime)).toBeGreaterThan(
        timeStringToMinutes("07:00")
      );
    });

    it("omits or skips run from departure board if the stop is marked as an express bypass", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "07:00",
        endTime: "07:00",
        headwayMinutes: 10,
        runCodePrefix: "M-EXP",
        startRunNumber: 1,
      });

      // Mark Cipete Raya as express bypass
      runs[0].stopTimes![2].isBypass = true;

      const cipeteStop = dummyStops[2]; // Stasiun Cipete Raya
      const departures = generateDepartureBoard(cipeteStop, [dummyLine], idDictionary, runs);

      // Bypassed stop should not appear on regular passenger boarding departure board
      const expressTrip = departures.find((d) => d.runNumber === "M-EXP-001");
      expect(expressTrip).toBeUndefined();
    });
  });
});
