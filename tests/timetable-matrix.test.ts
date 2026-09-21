import { describe, it, expect } from "vitest";
import { Stop, Line, TimetableRun } from "../src/types/transit";
import {
  cascadeStopTimes,
  generateBatchTimetableRuns,
  shiftRunSchedule,
  timeStringToMinutes,
  minutesToTimeString,
  validateStopTimeChronology,
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

  describe("Late-Night Stabling, Short-Turn & Incident Divergence Suite", () => {
    it("generates late-night depot stabling runs when includeLateNightStabling is enabled", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "21:30",
        endTime: "22:30",
        headwayMinutes: 30,
        runCodePrefix: "M-NIGHT",
        startRunNumber: 1,
        includeLateNightStabling: true,
        stablingStopId: "stop-mrt-blm", // Stasiun Blok M BCA (Pocket Track / Stabling)
        lateNightStartTime: "22:00",
      });

      // 21:30 (REGULAR), 22:00 (NIGHT_DEPOT_STABLING), 22:30 (NIGHT_DEPOT_STABLING) => 3 runs
      expect(runs.length).toBe(3);

      const regularRun = runs[0];
      expect(regularRun.departureTime).toBe("21:30");
      expect(regularRun.tripType).toBe("REGULAR");
      expect(regularRun.destination).toBe("Stasiun Bundaran HI Bank DKI");

      const stablingRun1 = runs[1];
      expect(stablingRun1.departureTime).toBe("22:00");
      expect(stablingRun1.tripType).toBe("NIGHT_DEPOT_STABLING");
      expect(stablingRun1.divergenceReason).toBe("DEPOT_PULL_IN");
      expect(stablingRun1.destination).toContain("Masuk Dipo");
      expect(stablingRun1.terminatedEarlyStopId).toBe("stop-mrt-blm");

      // Check stopTimes: stops up to Blok M (index 0..3) must be active, stop at Bundaran HI (index 4) must be terminated
      expect(stablingRun1.stopTimes?.[3].stopId).toBe("stop-mrt-blm");
      expect(stablingRun1.stopTimes?.[3].isTerminatedEarly).toBe(false);
      expect(stablingRun1.stopTimes?.[4].stopId).toBe("stop-mrt-bhi");
      expect(stablingRun1.stopTimes?.[4].isTerminatedEarly).toBe(true);
      expect(stablingRun1.stopTimes?.[4].arrivalTime).toBe("--:--");
    });

    it("omits early-terminated runs from departure boards at stations beyond the early termination point", () => {
      const runs = generateBatchTimetableRuns({
        lineId: "line-mrt-ns",
        operatorName: "PT MRT Jakarta",
        stops: dummyStops,
        modeCategory: "MRT_JAKARTA",
        startTime: "22:00",
        endTime: "22:00",
        headwayMinutes: 10,
        runCodePrefix: "M-STAB",
        startRunNumber: 1,
        includeLateNightStabling: true,
        stablingStopId: "stop-mrt-blm", // Terminates at Blok M
        lateNightStartTime: "22:00",
      });

      const stablingRun = runs[0];
      expect(stablingRun.terminatedEarlyStopId).toBe("stop-mrt-blm");

      // 1. Board at Lebak Bulus (Origin): Should display the stabling train heading to Blok M (Masuk Dipo)
      const lebakBulusStop = dummyStops[0];
      const originDepartures = generateDepartureBoard(lebakBulusStop, [dummyLine], idDictionary, [
        stablingRun,
      ]);
      const boardItemAtOrigin = originDepartures.find((d) => d.runNumber === "M-STAB-001");
      expect(boardItemAtOrigin).toBeDefined();
      expect(boardItemAtOrigin?.tripType).toBe("NIGHT_DEPOT_STABLING");
      expect(boardItemAtOrigin?.destination).toContain("Blok M BCA (Masuk Dipo)");

      // 2. Board at Bundaran HI (Station past Blok M): Should NOT show the train since it terminated early!
      const bundaranHiStop = dummyStops[4];
      const downstreamDepartures = generateDepartureBoard(
        bundaranHiStop,
        [dummyLine],
        idDictionary,
        [stablingRun]
      );
      const boardItemDownstream = downstreamDepartures.find((d) => d.runNumber === "M-STAB-001");
      expect(boardItemDownstream).toBeUndefined();
    });

    it("correctly models incident route divergence (Rekayasa Pola Operasi Akibat Kendala)", () => {
      const baseRun: TimetableRun = {
        id: "run-incident-01",
        lineId: "line-mrt-ns",
        tripCode: "M-DIV-999",
        origin: dummyStops[0].name,
        destination: "Stasiun Fatmawati Indomaret (Rekayasa)",
        departureTime: "14:00",
        arrivalTime: "14:08",
        operatorName: "PT MRT Jakarta",
        tripType: "ROUTE_DIVERGENCE",
        divergenceReason: "INCIDENT_DISRUPTION",
        divergenceDescription: "Rekayasa Pola Operasi imbas perbaikan wesel darurat di Stasiun Blok M",
        terminatedEarlyStopId: "stop-mrt-ftm",
        stopTimes: cascadeStopTimes("14:00", dummyStops, "MRT_JAKARTA", undefined, "stop-mrt-ftm"),
      };

      // Stations 0 and 1 are served
      expect(baseRun.stopTimes?.[0].isTerminatedEarly).toBe(false);
      expect(baseRun.stopTimes?.[1].isTerminatedEarly).toBe(false);

      // Stations 2, 3, 4 are terminated early
      expect(baseRun.stopTimes?.[2].isTerminatedEarly).toBe(true);
      expect(baseRun.stopTimes?.[3].isTerminatedEarly).toBe(true);
      expect(baseRun.stopTimes?.[4].isTerminatedEarly).toBe(true);

      // Station at Fatmawati should display the departure with divergence reason
      const fatmawatiStop = dummyStops[1];
      const ftmDepartures = generateDepartureBoard(fatmawatiStop, [dummyLine], idDictionary, [
        baseRun,
      ]);
      const ftmItem = ftmDepartures.find((d) => d.runNumber === "M-DIV-999");
      expect(ftmItem).toBeDefined();
      expect(ftmItem?.tripType).toBe("ROUTE_DIVERGENCE");
      expect(ftmItem?.divergenceReason).toBe("INCIDENT_DISRUPTION");
      expect(ftmItem?.divergenceDescription).toContain("perbaikan wesel darurat");
    });
  });

  describe("Chronological Dwell Sanity & Operational Error Prevention Guardrails", () => {
    const sampleStopTimes = [
      {
        stopId: "stop-1",
        stopName: "Stasiun Lebak Bulus",
        stopSequence: 1,
        arrivalTime: "08:00",
        departureTime: "08:00",
        dwellSeconds: 60,
      },
      {
        stopId: "stop-2",
        stopName: "Stasiun Fatmawati",
        stopSequence: 2,
        arrivalTime: "08:05",
        departureTime: "08:06",
        dwellSeconds: 60,
      },
      {
        stopId: "stop-3",
        stopName: "Stasiun Cipete Raya",
        stopSequence: 3,
        arrivalTime: "08:11",
        departureTime: "08:12",
        dwellSeconds: 60,
      },
      {
        stopId: "stop-4",
        stopName: "Stasiun Blok M",
        stopSequence: 4,
        arrivalTime: "08:18",
        departureTime: "08:20",
        dwellSeconds: 120,
      },
    ];

    it("accepts valid chronological stop times with positive dwell", () => {
      const result = validateStopTimeChronology({
        arrivalTime: "08:05",
        departureTime: "08:07",
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it("rejects invalid time formats", () => {
      const result = validateStopTimeChronology({
        arrivalTime: "8:5",
        departureTime: "08:07",
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Format waktu harus HH:mm");
    });

    it("strictly rejects negative dwell (departure preceding arrival at same stop)", () => {
      const result = validateStopTimeChronology({
        arrivalTime: "08:10",
        departureTime: "08:08", // Departs 2 minutes BEFORE arriving!
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("dwell negatif");
    });

    it("strictly rejects backwards time travel against preceding station departure", () => {
      // Station 0 departs at 08:00. Trying to set Station 1 arrival to 07:55.
      const result = validateStopTimeChronology({
        arrivalTime: "07:55",
        departureTime: "07:58",
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("tidak boleh mendahului waktu keberangkatan stasiun sebelumnya");
      expect(result.errorMessage).toContain("Lebak Bulus");
    });

    it("strictly rejects downstream collision when cascadeDownstream is false", () => {
      // Station 3 (index 2) arrives at 08:11. Trying to set Station 2 (index 1) departure to 08:15 without cascading.
      const result = validateStopTimeChronology({
        arrivalTime: "08:05",
        departureTime: "08:15", // Departs Fatmawati after already arriving at Cipete Raya!
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("tidak boleh mendahului waktu kedatangan stasiun berikutnya");
      expect(result.errorMessage).toContain("Cipete Raya");
    });

    it("permits downstream changes when cascadeDownstream is enabled", () => {
      // When cascadeDownstream is true, setting Fatmawati departure to 08:15 is valid because downstream will be shifted
      const result = validateStopTimeChronology({
        arrivalTime: "08:05",
        departureTime: "08:15",
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(true);
    });

    it("correctly validates midnight-crossing overnight trips", () => {
      const overnightStops = [
        {
          stopId: "stop-n1",
          stopName: "Stasiun Gambir",
          stopSequence: 1,
          arrivalTime: "23:45",
          departureTime: "23:50",
          dwellSeconds: 300,
        },
        {
          stopId: "stop-n2",
          stopName: "Stasiun Cirebon",
          stopSequence: 2,
          arrivalTime: "02:15",
          departureTime: "02:25",
          dwellSeconds: 600,
        },
      ];

      // Station 2 arrives at 02:15 after departure at 23:50 from Station 1
      const result = validateStopTimeChronology({
        arrivalTime: "02:15",
        departureTime: "02:25",
        stopIndex: 1,
        allStopTimes: overnightStops,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(true);
    });

    it("allows express bypass stops without dwell constraints", () => {
      const result = validateStopTimeChronology({
        arrivalTime: "08:05",
        departureTime: "08:05",
        isBypass: true,
        stopIndex: 1,
        allStopTimes: sampleStopTimes,
        cascadeDownstream: true,
      });

      expect(result.isValid).toBe(true);
    });
  });
});
