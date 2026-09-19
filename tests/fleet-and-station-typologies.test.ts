import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  StationType,
  StationScale,
  Stop,
  Line,
  DepartureBoardItem,
  TimetableRun,
  Vehicle,
} from "../src/types/transit";
import { generateDepartureBoard } from "../src/components/inspector/HubDetailSheet";
import { id as idDictionary } from "../src/lib/i18n/dictionaries/id";
import {
  GET as getVehicles,
  POST as postVehicle,
  PUT as putVehicle,
  DELETE as deleteVehicle,
} from "../src/app/api/fleet/vehicles/route";
import {
  GET as getStops,
  POST as postStop,
  PUT as putStop,
  DELETE as deleteStop,
} from "../src/app/api/network/stops/route";

describe("Domain Model: Station Typologies & Timetable Runs", () => {
  it("validates station typology and scale assignments", () => {
    const hubStop: Partial<Stop> = {
      id: "stop-dka-tod",
      lineId: "line-mrt-ns",
      name: "Dukuh Atas TOD",
      code: "DKA",
      latitude: -6.2008,
      longitude: 106.8228,
      sequence: 5,
      isInterchange: true,
      connectedLineIds: ["line-krl-cikarang", "line-lrt-cibubur", "line-tj-corridor-1"],
      facilities: ["Escalator", "Elevator", "Skybridge", "Retail Area", "Tap In/Out Gate"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "TOD",
      scale: "BIG",
    };

    expect(hubStop.stationType).toBe("TOD");
    expect(hubStop.scale).toBe("BIG");

    const smallShelter: Partial<Stop> = {
      id: "stop-shelter-karet",
      name: "Karet Sudirman",
      code: "KRT",
      stationType: "BUS_SHELTER",
      scale: "SMALL",
    };
    expect(smallShelter.stationType).toBe("BUS_SHELTER");
    expect(smallShelter.scale).toBe("SMALL");

    const terminalStop: Partial<Stop> = {
      id: "stop-pulo-gebang",
      name: "Terminal Pulo Gebang",
      code: "PLG",
      stationType: "BUS_TERMINAL",
      scale: "BIG",
    };
    expect(terminalStop.stationType).toBe("BUS_TERMINAL");
    expect(terminalStop.scale).toBe("BIG");
  });

  it("validates all station typology enum variations", () => {
    const validTypologies: StationType[] = [
      "TOD",
      "RAIL_STATION",
      "BUS_TERMINAL",
      "AIRPORT_TERMINAL",
      "HARBOR_PORT",
      "BUS_SHELTER",
    ];
    expect(validTypologies).toHaveLength(6);

    const validScales: StationScale[] = ["SMALL", "MEDIUM", "BIG"];
    expect(validScales).toHaveLength(3);
  });

  it("validates rich timetable departure items with airline and rail notes", () => {
    const flightDeparture: Partial<DepartureBoardItem> = {
      tripId: "trip-ga404",
      lineCode: "GA-404",
      origin: "Soekarno-Hatta (CGK)",
      destination: "Ngurah Rai (DPS)",
      operatorName: "Garuda Indonesia",
      serviceClass: "Business & Economy",
      gateOrBay: "Gate 14",
      baggageBelt: "Belt 5",
      notes: "Boarding gate closes 15m prior to departure",
      transitStopsSummary: "Direct Non-Stop",
    };

    expect(flightDeparture.operatorName).toBe("Garuda Indonesia");
    expect(flightDeparture.origin).toBe("Soekarno-Hatta (CGK)");
    expect(flightDeparture.serviceClass).toBe("Business & Economy");
    expect(flightDeparture.gateOrBay).toBe("Gate 14");
    expect(flightDeparture.baggageBelt).toBe("Belt 5");
    expect(flightDeparture.notes).toContain("closes 15m prior");
    expect(flightDeparture.transitStopsSummary).toBe("Direct Non-Stop");
  });

  it("validates TimetableRun interface schema with authentic schedule runs", () => {
    const railRun: TimetableRun = {
      id: "run-argo-bromo-01",
      lineId: "line-kai-intercity",
      tripCode: "KA-01",
      origin: "Gambir (GMR)",
      destination: "Surabaya Pasarturi (SBI)",
      departureTime: "08:20",
      arrivalTime: "16:25",
      operatorName: "PT Kereta Api Indonesia (Persero)",
      serviceClass: "Luxury & Eksekutif",
      gateOrBay: "Jalur 3",
      notes: "Prioritas Keberangkatan Jalur Utara",
      baggageBelt: undefined,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    };

    expect(railRun.id).toBe("run-argo-bromo-01");
    expect(railRun.departureTime).toMatch(/^([01]\d|2[0-3]):([0-5]\d)$/);
    expect(railRun.arrivalTime).toMatch(/^([01]\d|2[0-3]):([0-5]\d)$/);
    expect(railRun.daysOfWeek).toContain(0);
    expect(railRun.daysOfWeek).toHaveLength(7);
    expect(railRun.serviceClass).toBe("Luxury & Eksekutif");
  });

  it("validates vehicle divergence fields: delayMinutes, speedModifier, and detourCoordinates", () => {
    const divergingVehicle: Partial<Vehicle> = {
      id: "veh-tj-corridor-1-08",
      lineId: "line-tj-corridor-1",
      vehicleCode: "TJ-008",
      delayMinutes: 12,
      speedModifier: 0.65,
      detourCoordinates: [
        { latitude: -6.215, longitude: 106.82 },
        { latitude: -6.22, longitude: 106.825 },
        { latitude: -6.225, longitude: 106.83 },
      ],
    };

    expect(divergingVehicle.delayMinutes).toBe(12);
    expect(divergingVehicle.speedModifier).toBeCloseTo(0.65);
    expect(divergingVehicle.detourCoordinates).toHaveLength(3);
    expect(divergingVehicle.detourCoordinates?.[0].latitude).toBe(-6.215);
  });
});

describe("Timetable Engine: generateDepartureBoard Rich Metadata Generation", () => {
  it("generates rich Aviation departure metadata with airlines, gate, serviceClass, baggageBelt, and origin", () => {
    const cgkStop: Stop = {
      id: "stop-cgk-t3",
      lineId: "line-air-cgk-dps",
      name: "Bandara Internasional Soekarno-Hatta Terminal 3",
      code: "CGK",
      latitude: -6.1275,
      longitude: 106.6537,
      sequence: 1,
      isInterchange: true,
      connectedLineIds: [],
      facilities: ["Gate Lounge", "Baggage Claim", "Customs", "SkyTrain"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "AIRPORT_TERMINAL",
      scale: "BIG",
    };

    const airLine: Line = {
      id: "line-air-cgk-dps",
      regionId: "region-national",
      code: "GA-404",
      name: "Garuda Indonesia (CGK - DPS)",
      category: "AVIATION",
      mode: "AIRPORT_COMMERCIAL",
      colorHex: "#0EA5E9",
      textColorHex: "#FFFFFF",
      fareType: "DYNAMIC_TIERED",
      baseFareRp: 1200000,
      farePerKmRp: 800,
      maxFareRp: 2500000,
      headwayMinutes: 30,
      firstDeparture: "05:00",
      lastDeparture: "23:00",
      polylineCoordinates: [],
    };

    const departures = generateDepartureBoard(cgkStop, [airLine], idDictionary);
    expect(departures.length).toBe(3);

    const firstDeparture = departures[0];
    expect(firstDeparture.origin).toBe("Soekarno-Hatta (CGK)");
    expect(firstDeparture.destination).toBe("DPS");
    expect(firstDeparture.gateOrBay).toMatch(/^Gate \d+$/);
    expect(firstDeparture.serviceClass).toBe("Business & Economy Class");
    expect(firstDeparture.baggageBelt).toMatch(/^Belt \d+$/);
    expect(firstDeparture.notes).toContain("Boarding gate closes 15 minutes prior");
    expect(["Garuda Indonesia", "Citilink", "Batik Air"]).toContain(firstDeparture.operatorName);
    expect(firstDeparture.transitStopsSummary).toBe("Direct Flight Non-Stop");
  });

  it("generates rich Rail departure metadata (Whoosh & KAI Intercity) with origin, track/peron, and Wi-Fi notes", () => {
    const hlmStop: Stop = {
      id: "stop-hlm-hsr",
      lineId: "line-whoosh-hsr",
      name: "Stasiun Halim HSR",
      code: "HLM",
      latitude: -6.2445,
      longitude: 106.8867,
      sequence: 1,
      isInterchange: true,
      connectedLineIds: ["line-kai-intercity"],
      facilities: ["Peron Tinggi", "Waiting Lounge VIP", "Retail & Cafe"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "TOD",
      scale: "BIG",
    };

    const whooshLine: Line = {
      id: "line-whoosh-hsr",
      regionId: "region-jabodetabek",
      code: "WHOOSH",
      name: "Whoosh HSR (Halim - Tegalluar)",
      category: "RAIL",
      mode: "WHOOSH_HSR",
      colorHex: "#C41230",
      textColorHex: "#FFFFFF",
      fareType: "DYNAMIC_TIERED",
      baseFareRp: 250000,
      farePerKmRp: 1500,
      maxFareRp: 600000,
      headwayMinutes: 40,
      firstDeparture: "06:00",
      lastDeparture: "21:30",
      polylineCoordinates: [],
    };

    const intercityLine: Line = {
      id: "line-kai-intercity",
      regionId: "region-national",
      code: "KA-01",
      name: "Argo Bromo Anggrek (Gambir - Surabaya)",
      category: "RAIL",
      mode: "KAI_INTERCITY",
      colorHex: "#003366",
      textColorHex: "#FFFFFF",
      fareType: "DYNAMIC_TIERED",
      baseFareRp: 450000,
      farePerKmRp: 800,
      maxFareRp: 1200000,
      headwayMinutes: 120,
      firstDeparture: "08:00",
      lastDeparture: "22:00",
      polylineCoordinates: [],
    };

    const departures = generateDepartureBoard(hlmStop, [whooshLine, intercityLine], idDictionary);
    expect(departures.length).toBe(6);

    const whooshItem = departures.find((d) => d.mode === "WHOOSH_HSR");
    expect(whooshItem).toBeDefined();
    expect(whooshItem?.origin).toBe("Stasiun Halim HSR");
    expect(whooshItem?.destination).toBe("Stasiun Tegalluar Summarecon");
    expect(whooshItem?.serviceClass).toBe("Premium Economy & First Class");
    expect(whooshItem?.gateOrBay).toMatch(/^Peron \d+ \(Jalur \d+\)$/);
    expect(whooshItem?.notes).toContain("Direct Express bypasses intermediate stops");
    expect(whooshItem?.operatorName).toBe("PT Kereta Cepat Indonesia China (KCIC)");

    const kaiItem = departures.find((d) => d.mode === "KAI_INTERCITY");
    expect(kaiItem).toBeDefined();
    expect(["Stasiun Gambir (GMR)", "Pasar Senen (PSE)"]).toContain(kaiItem?.origin);
    expect(kaiItem?.serviceClass).toBe("Eksekutif New Gen & Luxury Suite");
    expect(kaiItem?.gateOrBay).toMatch(/^Peron \d+ \(Jalur \d+\)$/);
    expect(kaiItem?.operatorName).toBe("PT Kereta Api Indonesia (Persero)");
  });

  it("generates rich Executive Shuttle departure metadata with pool origins, bay, and MBZ notes", () => {
    const fxStop: Stop = {
      id: "stop-fx-sudirman",
      lineId: "line-shuttle-fx-bdg",
      name: "Pool fX Sudirman",
      code: "FXS",
      latitude: -6.2248,
      longitude: 106.8043,
      sequence: 1,
      isInterchange: false,
      connectedLineIds: [],
      facilities: ["AC Waiting Lounge", "Ticket Counter", "Water Dispenser"],
      accessibleElevator: false,
      tactilePaving: false,
      wheelchairRamp: true,
      stationType: "BUS_TERMINAL",
      scale: "MEDIUM",
    };

    const shuttleLine: Line = {
      id: "line-shuttle-fx-bdg",
      regionId: "region-jabodetabek",
      code: "SHT-01",
      name: "DayTrans (fX Sudirman - Pasteur Bandung)",
      category: "BUS",
      mode: "EXECUTIVE_SHUTTLE",
      colorHex: "#06B6D4",
      textColorHex: "#FFFFFF",
      fareType: "FLAT",
      baseFareRp: 130000,
      farePerKmRp: 0,
      maxFareRp: 130000,
      headwayMinutes: 45,
      firstDeparture: "05:30",
      lastDeparture: "21:30",
      polylineCoordinates: [],
    };

    const departures = generateDepartureBoard(fxStop, [shuttleLine], idDictionary);
    expect(departures.length).toBe(3);

    const shuttleItem = departures[0];
    expect(shuttleItem.origin).toBe("Pool fX Sudirman");
    expect(shuttleItem.destination).toBe("Pasteur Bandung");
    expect(shuttleItem.gateOrBay).toMatch(/^Bay \d+$/);
    expect(shuttleItem.serviceClass).toBe("VIP 8-Seater Captain Recliner");
    expect(shuttleItem.notes).toBe("Direct via Tol Layang MBZ. Max luggage allowance 20kg.");
    expect(["DayTrans Executive Shuttle", "CitiTrans Executive Travel"]).toContain(shuttleItem.operatorName);
    expect(shuttleItem.transitStopsSummary).toBe("Pool fX Sudirman -> Tol Layang MBZ -> Pasteur Bandung");
  });

  it("generates rich TransJakarta BRT & Mikrotrans metadata with 24h AMARI and Rp 0 JakLingko notes", () => {
    const blokMStop: Stop = {
      id: "stop-tj-blok-m",
      lineId: "line-tj-1",
      name: "Halte Blok M",
      code: "BLM",
      latitude: -6.2442,
      longitude: 106.7981,
      sequence: 1,
      isInterchange: true,
      connectedLineIds: ["line-jak-10"],
      facilities: ["Platform Screen Doors", "Tap In/Out Gate", "Bridge Access"],
      accessibleElevator: true,
      tactilePaving: true,
      wheelchairRamp: true,
      stationType: "BUS_TERMINAL",
      scale: "BIG",
    };

    const tjBrtLine: Line = {
      id: "line-tj-1",
      regionId: "region-jabodetabek",
      code: "1",
      name: "Koridor 1 (Blok M - Kota)",
      category: "BUS",
      mode: "TRANSJAKARTA_BRT",
      colorHex: "#D9252A",
      textColorHex: "#FFFFFF",
      fareType: "FLAT",
      baseFareRp: 3500,
      farePerKmRp: 0,
      maxFareRp: 3500,
      headwayMinutes: 5,
      firstDeparture: "05:00",
      lastDeparture: "23:59",
      polylineCoordinates: [],
    };

    const mikrotransLine: Line = {
      id: "line-jak-10",
      regionId: "region-jabodetabek",
      code: "JAK.10",
      name: "Mikrotrans JAK.10 (Tanah Abang - Kota)",
      category: "BUS",
      mode: "MIKROTRANS",
      colorHex: "#00A39D",
      textColorHex: "#FFFFFF",
      fareType: "FREE_TAP",
      baseFareRp: 0,
      farePerKmRp: 0,
      maxFareRp: 0,
      headwayMinutes: 10,
      firstDeparture: "05:00",
      lastDeparture: "22:00",
      polylineCoordinates: [],
    };

    const departures = generateDepartureBoard(blokMStop, [tjBrtLine, mikrotransLine], idDictionary);
    expect(departures.length).toBe(6);

    const brtItem = departures.find((d) => d.mode === "TRANSJAKARTA_BRT");
    expect(brtItem).toBeDefined();
    expect(brtItem?.origin).toBe("Blok M");
    expect(brtItem?.destination).toBe("Kota");
    expect(brtItem?.serviceClass).toBe("BRT Standard Rapid");
    expect(brtItem?.notes).toBe("Angkutan AMARI beroperasi 24 Jam.");
    expect(brtItem?.operatorName).toBe("PT Transportasi Jakarta");

    const mikroItem = departures.find((d) => d.mode === "MIKROTRANS");
    expect(mikroItem).toBeDefined();
    expect(mikroItem?.origin).toBe("Tanah Abang");
    expect(mikroItem?.destination).toBe("Kota");
    expect(mikroItem?.serviceClass).toBe("JakLingko AC & Non-AC Angkot");
    expect(mikroItem?.notes).toBe("Tarif Rp 0 dengan tap kartu JakLingko / Kartu Multi Trip.");
    expect(mikroItem?.operatorName).toBe("JakLingko (Koperasi Wahana Kalpika)");
  });
});

describe("Fleet Persistence REST API (/api/fleet/vehicles)", () => {
  const testVehicleCode = `TEST-${Date.now().toString(36).toUpperCase()}`;
  let createdVehicleId = "";

  it("GET: returns list of vehicles with success flag and count", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles");
    const res = await getVehicles(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.count).toBe("number");
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const sample = json.data[0];
    expect(sample).toHaveProperty("id");
    expect(sample).toHaveProperty("vehicleCode");
    expect(sample).toHaveProperty("name");
    expect(sample).toHaveProperty("lineId");
    expect(sample).toHaveProperty("speedKmh");
    expect(sample).toHaveProperty("status");
  });

  it("POST: rejects creation with 400 when required fields are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles", {
      method: "POST",
      body: JSON.stringify({ name: "Incomplete Vehicle" }),
    });
    const res = await postVehicle(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  it("POST: creates a new vehicle and returns 201 with created vehicle payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles", {
      method: "POST",
      body: JSON.stringify({
        vehicleCode: testVehicleCode,
        name: "Test Custom Bus",
        lineId: "line-tj-corridor-1",
        category: "BUS",
        mode: "TRANSJAKARTA_BRT",
        speedKmh: 45,
        coachbuilder: "Laksana Karoseri",
        chassis: "Mercedes-Benz OH 1626",
      }),
    });
    const res = await postVehicle(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.vehicleCode).toBe(testVehicleCode);
    expect(json.data.name).toBe("Test Custom Bus");
    expect(json.data.coachbuilder).toBe("Laksana Karoseri");
    expect(json.data.chassis).toBe("Mercedes-Benz OH 1626");

    createdVehicleId = json.data.id;
    expect(createdVehicleId).toBeDefined();
  });

  it("PUT: updates vehicle properties (status, speed, crowd level)", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles", {
      method: "PUT",
      body: JSON.stringify({
        id: createdVehicleId,
        status: "CONGESTION_HOLD",
        speedKmh: 0,
        crowdLevel: "LEVEL_4_FULL_CRUSH",
      }),
    });
    const res = await putVehicle(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("CONGESTION_HOLD");
    expect(json.data.speedKmh).toBe(0);
    expect(json.data.crowdLevel).toBe("LEVEL_4_FULL_CRUSH");
  });

  it("PUT: returns 400 when id or vehicleCode is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles", {
      method: "PUT",
      body: JSON.stringify({
        speedKmh: 55,
      }),
    });
    const res = await putVehicle(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("DELETE: deletes vehicle by id query param", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/fleet/vehicles?id=${createdVehicleId}`,
      { method: "DELETE" }
    );
    const res = await deleteVehicle(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain("deleted successfully");
  });

  it("DELETE: returns 400 when id and vehicleCode query param are omitted", async () => {
    const req = new NextRequest("http://localhost:3000/api/fleet/vehicles", {
      method: "DELETE",
    });
    const res = await deleteVehicle(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
  });
});

describe("Station Typologies & Scale REST API (/api/network/stops)", () => {
  const testStopId = `stop-test-typology-${Date.now()}`;

  it("GET: returns transit stops with mapped stationType and scale properties", async () => {
    const req = new NextRequest("http://localhost:3000/api/network/stops");
    const res = await getStops(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const firstStop = json.data[0];
    expect(firstStop).toHaveProperty("stationType");
    expect(firstStop).toHaveProperty("scale");
  });

  it("POST: persists stop with explicit stationType and scale", async () => {
    const req = new NextRequest("http://localhost:3000/api/network/stops", {
      method: "POST",
      body: JSON.stringify({
        id: testStopId,
        lineId: "line-mrt-ns",
        name: "Test Station Hub",
        code: "TSTH",
        latitude: -6.2,
        longitude: 106.8,
        sequence: 99,
        isInterchange: true,
        stationType: "TOD",
        scale: "BIG",
        platformType: "ISLAND",
      }),
    });

    const res = await postStop(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.stationType).toBe("TOD");
    expect(json.data.scale).toBe("BIG");
    expect(json.data.platformType).toBe("ISLAND");
  });

  it("PUT: updates stop stationType and scale dynamically", async () => {
    const req = new NextRequest("http://localhost:3000/api/network/stops", {
      method: "PUT",
      body: JSON.stringify({
        id: testStopId,
        stationType: "BUS_TERMINAL",
        scale: "MEDIUM",
      }),
    });

    const res = await putStop(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.stationType).toBe("BUS_TERMINAL");
    expect(json.data.scale).toBe("MEDIUM");
  });

  it("GET: retrieves updated stop retaining stationType and scale", async () => {
    const req = new NextRequest("http://localhost:3000/api/network/stops");
    const res = await getStops(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const found = json.data.find((s: Stop) => s.id === testStopId);
    expect(found).toBeDefined();
    expect(found.stationType).toBe("BUS_TERMINAL");
    expect(found.scale).toBe("MEDIUM");
  });

  it("DELETE: removes test stop from persistence", async () => {
    const req = new NextRequest(`http://localhost:3000/api/network/stops?id=${testStopId}`, {
      method: "DELETE",
    });
    const res = await deleteStop(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
