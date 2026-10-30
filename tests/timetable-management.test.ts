import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";

const OPS_COOKIE = `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER"))}`;

function authed(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: { ...init?.headers, cookie: OPS_COOKIE },
  });
}
import {
  GET as getTimetables,
  POST as postTimetable,
  PUT as putTimetable,
  DELETE as deleteTimetable,
} from "../src/app/api/network/timetables/route";
import { DEFAULT_TIMETABLE_RUNS } from "../src/lib/data/defaultTimetables";
import { TimetableRun, Stop, Line } from "../src/types/transit";
import { generateDepartureBoard } from "../src/components/inspector/HubDetailSheet";
import { id as idDictionary } from "../src/lib/i18n/dictionaries/id";

describe("Timetable & Schedule Management Suite", () => {
  describe("REST API: /api/network/timetables", () => {
    it("GET: retrieves list of scheduled timetable runs", async () => {
      const req = authed("http://localhost:3000/api/network/timetables");
      const res = await getTimetables(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBeGreaterThanOrEqual(DEFAULT_TIMETABLE_RUNS.length);
      expect(Array.isArray(json.data)).toBe(true);

      // Verify authentic Whoosh run exists
      const whooshRun = json.data.find((r: TimetableRun) => r.tripCode === "G1012");
      expect(whooshRun).toBeDefined();
      expect(whooshRun.origin).toBe("Stasiun Halim HSR");
      expect(whooshRun.destination).toBe("Stasiun Tegalluar Summarecon");
      expect(whooshRun.operatorName).toBe("PT Kereta Cepat Indonesia China (KCIC)");

      // Verify authentic Garuda run exists
      const gaRun = json.data.find((r: TimetableRun) => r.tripCode === "GA-404");
      expect(gaRun).toBeDefined();
      expect(gaRun.gateOrBay).toContain("Gate 14");
      expect(gaRun.baggageBelt).toBe("Belt 4");
    });

    it("GET: filters by lineId, origin, destination, and search query", async () => {
      // Filter by lineId
      const lineReq = authed(
        "http://localhost:3000/api/network/timetables?lineId=line-whoosh-hsr"
      );
      const lineRes = await getTimetables(lineReq);
      const lineJson = await lineRes.json();
      expect(lineJson.success).toBe(true);
      expect(lineJson.data.every((r: TimetableRun) => r.lineId === "line-whoosh-hsr")).toBe(true);

      // Filter by origin
      const originReq = authed(
        "http://localhost:3000/api/network/timetables?origin=Halim"
      );
      const originRes = await getTimetables(originReq);
      const originJson = await originRes.json();
      expect(originJson.success).toBe(true);
      expect(originJson.data.some((r: TimetableRun) => r.origin.includes("Halim"))).toBe(true);

      // Filter by search query
      const searchReq = authed(
        "http://localhost:3000/api/network/timetables?search=Garuda"
      );
      const searchRes = await getTimetables(searchReq);
      const searchJson = await searchRes.json();
      expect(searchJson.success).toBe(true);
      expect(searchJson.data.every((r: TimetableRun) => r.operatorName.includes("Garuda"))).toBe(true);
    });

    it("POST: validates required fields and time formats", async () => {
      // Missing tripCode
      const missingReq = authed("http://localhost:3000/api/network/timetables", {
        method: "POST",
        body: JSON.stringify({
          lineId: "line-whoosh-hsr",
          origin: "Halim",
          destination: "Tegalluar",
          departureTime: "08:00",
          arrivalTime: "08:45",
          operatorName: "KCIC",
        }),
      });
      const missingRes = await postTimetable(missingReq);
      expect(missingRes.status).toBe(400);
      const missingJson = await missingRes.json();
      expect(missingJson.success).toBe(false);
      expect(missingJson.error).toContain("Missing required fields");

      // Invalid time format
      const invalidTimeReq = authed("http://localhost:3000/api/network/timetables", {
        method: "POST",
        body: JSON.stringify({
          tripCode: "G9999",
          lineId: "line-whoosh-hsr",
          origin: "Halim",
          destination: "Tegalluar",
          departureTime: "25:70", // Invalid hour and minute
          arrivalTime: "08:45",
          operatorName: "KCIC",
        }),
      });
      const invalidTimeRes = await postTimetable(invalidTimeReq);
      expect(invalidTimeRes.status).toBe(400);
      const invalidTimeJson = await invalidTimeRes.json();
      expect(invalidTimeJson.success).toBe(false);
      expect(invalidTimeJson.error).toContain("Invalid time format");
    });

    it("POST: creates a valid timetable run", async () => {
      const validPayload: Partial<TimetableRun> = {
        id: "run-test-whoosh-extra",
        lineId: "line-whoosh-hsr",
        tripCode: "G1099",
        origin: "Stasiun Halim HSR",
        destination: "Stasiun Tegalluar Summarecon",
        departureTime: "21:30",
        arrivalTime: "22:15",
        operatorName: "PT Kereta Cepat Indonesia China (KCIC)",
        serviceClass: "VIP High-Speed Night Express",
        gateOrBay: "Gate 3 (Peron Layang)",
        notes: "Direct Night High-Speed Service",
        daysOfWeek: [5, 6, 0],
      };

      const req = authed("http://localhost:3000/api/network/timetables", {
        method: "POST",
        body: JSON.stringify(validPayload),
      });
      const res = await postTimetable(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.tripCode).toBe("G1099");
      expect(json.data.gateOrBay).toBe("Gate 3 (Peron Layang)");
      expect(json.data.serviceClass).toBe("VIP High-Speed Night Express");
    });

    it("PUT: updates existing timetable run attributes", async () => {
      // Update the previously created run
      const updatePayload = {
        id: "run-test-whoosh-extra",
        departureTime: "21:45",
        arrivalTime: "22:30",
        gateOrBay: "Gate 4 (Peron 2)",
        notes: "Departure shifted by 15 mins for track maintenance.",
      };

      const req = authed("http://localhost:3000/api/network/timetables", {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });
      const res = await putTimetable(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.departureTime).toBe("21:45");
      expect(json.data.arrivalTime).toBe("22:30");
      expect(json.data.gateOrBay).toBe("Gate 4 (Peron 2)");
      expect(json.data.notes).toContain("track maintenance");
    });

    it("DELETE: removes scheduled run by id", async () => {
      // Missing id
      const missingIdReq = authed("http://localhost:3000/api/network/timetables", {
        method: "DELETE",
      });
      const missingIdRes = await deleteTimetable(missingIdReq);
      expect(missingIdRes.status).toBe(400);

      // Valid delete
      const delReq = authed(
        "http://localhost:3000/api/network/timetables?id=run-test-whoosh-extra",
        { method: "DELETE" }
      );
      const delRes = await deleteTimetable(delReq);
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(true);

      // Verify deletion in GET
      const getReq = authed("http://localhost:3000/api/network/timetables?search=G1099");
      const getRes = await getTimetables(getReq);
      const getJson = await getRes.json();
      expect(getJson.data.some((r: TimetableRun) => r.id === "run-test-whoosh-extra")).toBe(false);
    });
  });

  describe("Integration: HubDetailSheet Departure Board Sync", () => {
    it("merges and displays custom timetable runs in station departure board", () => {
      const dummyStop: Stop = {
        id: "stop-halim-hsr",
        lineId: "line-whoosh-hsr",
        name: "Stasiun Halim HSR",
        code: "HLM",
        latitude: -6.2443,
        longitude: 106.8858,
        sequence: 1,
        isInterchange: true,
        connectedLineIds: ["line-lrt-cibubur", "line-lrt-bekasi"],
        facilities: ["Elevator", "Skybridge", "VIP Lounge"],
        accessibleElevator: true,
        tactilePaving: true,
        wheelchairRamp: true,
        stationType: "TOD",
        scale: "BIG",
      };

      const dummyLines: Line[] = [
        {
          id: "line-whoosh-hsr",
          regionId: "reg-jkt",
          code: "WHS",
          name: "Whoosh High-Speed Rail (Halim - Tegalluar)",
          category: "RAIL",
          mode: "WHOOSH_HSR",
          colorHex: "#991B1B",
          textColorHex: "#FFFFFF",
          fareType: "PROGRESSIVE_DISTANCE",
          baseFareRp: 150000,
          farePerKmRp: 1000,
          maxFareRp: 300000,
          headwayMinutes: 30,
          firstDeparture: "06:00",
          lastDeparture: "22:00",
          polylineCoordinates: [
            { latitude: -6.2443, longitude: 106.8858 },
            { latitude: -6.9458, longitude: 107.6987 },
          ],
          stops: [dummyStop],
        },
      ];

      const customRuns: TimetableRun[] = [
        {
          id: "run-custom-special-01",
          lineId: "line-whoosh-hsr",
          tripCode: "G1050-VIP",
          origin: "Stasiun Halim HSR",
          destination: "Stasiun Tegalluar Summarecon",
          departureTime: "05:15",
          arrivalTime: "06:00",
          operatorName: "PT Kereta Cepat Indonesia China (KCIC)",
          serviceClass: "Royal VIP Suite Car",
          gateOrBay: "Gate 1 (Peron VIP)",
          notes: "Dawn high-speed shuttle with hot breakfast tray service.",
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ];

      const departures = generateDepartureBoard(dummyStop, dummyLines, idDictionary, customRuns);

      // Verify that the custom run was seamlessly incorporated into the departure board
      const customItem = departures.find((d) => d.runNumber === "G1050-VIP");
      expect(customItem).toBeDefined();
      expect(customItem?.origin).toBe("Stasiun Halim HSR");
      expect(customItem?.destination).toBe("Stasiun Tegalluar Summarecon");
      expect(customItem?.serviceClass).toBe("Royal VIP Suite Car");
      expect(customItem?.gateOrBay).toBe("Gate 1 (Peron VIP)");
      expect(customItem?.notes).toContain("Dawn high-speed shuttle");
      expect(customItem?.scheduledTime).toBe("05:15");

      // Departures must be ordered by scheduled time ascending
      for (let i = 1; i < departures.length; i++) {
        expect(departures[i].scheduledTime >= departures[i - 1].scheduledTime).toBe(true);
      }
    });
  });
});

describe("Adaptive departure board (scale, past rows, window clipping)", () => {
  const baseStop: Stop = {
    id: "stop-test-adaptive",
    lineId: "line-test-bus",
    name: "Halte Uji Adaptif",
    code: "TST",
    latitude: -6.2,
    longitude: 106.8,
    sequence: 1,
    isInterchange: false,
    connectedLineIds: [],
    facilities: [],
    accessibleElevator: false,
    tactilePaving: false,
    wheelchairRamp: false,
    stationType: "BUS_SHELTER",
    scale: "SMALL",
  };

  const baseLine: Line = {
    id: "line-test-bus",
    regionId: "reg-jkt",
    code: "TST",
    name: "Test Line (A - B)",
    category: "BUS",
    mode: "TRANSJAKARTA_BRT",
    colorHex: "#D9252A",
    textColorHex: "#FFFFFF",
    fareType: "FLAT",
    baseFareRp: 3500,
    farePerKmRp: 0,
    maxFareRp: 3500,
    headwayMinutes: 10,
    firstDeparture: "00:00",
    lastDeparture: "24:00",
    polylineCoordinates: [],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00+07:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scales upcoming rows by stop size with at most 3 past rows", () => {
    const cases: Array<[Stop["scale"], number]> = [
      ["SMALL", 5],
      ["MEDIUM", 8],
      ["BIG", 10],
    ];
    for (const [scale, upcoming] of cases) {
      const board = generateDepartureBoard(
        { ...baseStop, scale },
        [baseLine],
        idDictionary
      );
      const past = board.filter((d) => d.status === "DEPARTED");
      const next = board.filter((d) => d.status !== "DEPARTED");
      expect(next.length).toBe(upcoming);
      expect(past.length).toBe(3);
      expect(board.length).toBe(upcoming + 3);
    }
  });

  it("marks past rows DEPARTED and keeps chronological order", () => {
    const board = generateDepartureBoard(baseStop, [baseLine], idDictionary);
    expect(board.filter((d) => d.status === "DEPARTED").length).toBe(3);
    for (let i = 1; i < board.length; i++) {
      expect(board[i].scheduledTime >= board[i - 1].scheduledTime).toBe(true);
    }
  });

  it("clips everything outside the operating window and empties pre-service boards", () => {
    const narrow = {
      ...baseLine,
      firstDeparture: "10:00",
      lastDeparture: "11:00",
    };
    vi.setSystemTime(new Date("2026-01-15T10:30:00+07:00"));
    const board = generateDepartureBoard(baseStop, [narrow], idDictionary);
    // 10:30 + k*10min within [10:00, 11:00): 10:30, 10:40, 10:50 upcoming
    expect(board.filter((d) => d.status !== "DEPARTED").length).toBe(3);
    expect(board.filter((d) => d.status === "DEPARTED").length).toBeLessThanOrEqual(3);

    vi.setSystemTime(new Date("2026-01-15T04:30:00+07:00"));
    expect(generateDepartureBoard(baseStop, [narrow], idDictionary).length).toBe(0);
  });

  it("exposes the earlier-departures label in all locales", async () => {
    const en = (await import("../src/lib/i18n/dictionaries/en")).en;
    expect(en.hubInspector.earlierDepartures).toBe("Earlier departures");
    expect(idDictionary.hubInspector.earlierDepartures).toBeTruthy();
  });
});

describe("Timetable overflow dialog grouping", () => {
  it("groups capped rows by line in first-appearance order", async () => {
    const {
      groupTimetableByLine,
      TIMETABLE_DIALOG_ROW_CAP,
      TIMETABLE_OVERFLOW_THRESHOLD,
    } = await import("../src/components/inspector/TimetableDialog");
    const { en } = await import("../src/lib/i18n/dictionaries/en");
    expect(en.hubInspector.fullTimetable).toBe("Full timetable");
    expect(en.hubInspector.scheduleAttribution).toBe("Schedule data: PT Transportasi Jakarta");

    const mk = (tripId: string, lineCode: string, lineName: string) => ({
      tripId,
      lineCode,
      lineName,
      destination: `${lineCode} dest`,
      mode: "TRANSJAKARTA_BRT",
      scheduledTime: "10.00",
      estimatedTime: "10.00",
      status: "ON_TIME",
      platform: "Bay 1",
      crowdLevel: "LEVEL_2_FEW_SEATS",
    });

    const rows = [mk("t1", "1", "Koridor 1"), mk("t2", "2", "Koridor 2"), mk("t3", "1", "Koridor 1")];
    const groups = groupTimetableByLine(rows as never, [
      { code: "1", colorHex: "#FF0000" },
      { code: "2", colorHex: "#00FF00" },
    ] as never);
    expect(groups.map((g) => g.lineCode)).toEqual(["1", "2"]);
    expect(groups[0].items.map((i) => i.tripId)).toEqual(["t1", "t3"]);
    expect(groups[0].colorHex).toBe("#FF0000");

    const many = Array.from({ length: TIMETABLE_DIALOG_ROW_CAP + 15 }, (_, i) =>
      mk(`t${i}`, "1", "Koridor 1")
    );
    expect(groupTimetableByLine(many as never, [] as never)[0].items.length).toBe(
      TIMETABLE_DIALOG_ROW_CAP
    );
    expect(TIMETABLE_OVERFLOW_THRESHOLD).toBe(20);
  });
});
