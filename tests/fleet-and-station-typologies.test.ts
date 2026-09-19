import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  StationType,
  StationScale,
  Stop,
  DepartureBoardItem,
  TimetableRun,
  Vehicle,
} from "../src/types/transit";
import {
  GET as getVehicles,
  POST as postVehicle,
  PUT as putVehicle,
  DELETE as deleteVehicle,
} from "../src/app/api/fleet/vehicles/route";

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
