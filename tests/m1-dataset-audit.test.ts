import { describe, it, expect } from "vitest";
import {
  JABODETABEK_REGION,
  TRANSIT_LINES,
  TRANSIT_STOPS,
  TRANSIT_VEHICLES,
  VEHICLE_TECHNICAL_SPECS,
  DISRUPTION_ALERTS,
  generateSleeper111Seats,
  generateSuperExec21Seats,
  generateExecutive22Seats,
  generateCommuterLongitudinalSeats,
  generateHiAceCaptainSeats,
} from "../src/lib/data/jakarta-dataset";
import db from "../src/lib/db";
import fs from "fs";
import path from "path";

// Bounding box for Jabodetabek & West Java Transit Network
// Covers Greater Jakarta, Bodetabek, Thousand Islands, Bandung (Whoosh), and AKAP routes to Central Java
const NETWORK_BOUNDING_BOX = {
  minLat: -8.0, // Extends to Central Java (Jogja/Solo) for AKAP
  maxLat: -5.5, // Extends north to Thousand Islands (Pulau Harapan / Pramuka)
  minLon: 106.0, // Extends west to Rangkasbitung / Banten / Merak
  maxLon: 111.0, // Extends east to Central Java (Jogja) for AKAP
};

// Jakarta & Bodetabek Core Urban Rail/Bus Bounding Box
const CORE_JABODETABEK_BBOX = {
  minLat: -7.1, // Extends to Tegalluar (Bandung)
  maxLat: -5.7, // Thousand Islands
  minLon: 106.2, // Rangkasbitung
  maxLon: 107.8, // Tegalluar
};

describe("Challenger 2 Empirical Verification: Milestone 1 Dataset & Specs", () => {
  // 1. Geographic & Coordinate Bounding Box Verification
  describe("1. Geographic & Coordinate Bounding Box Verification", () => {
    it("Region boundary coordinates should form a valid bounding box around Jabodetabek", () => {
      expect(JABODETABEK_REGION.id).toBe("reg-jabodetabek-01");
      expect(JABODETABEK_REGION.centerLatitude).toBeCloseTo(-6.2088, 2);
      expect(JABODETABEK_REGION.centerLongitude).toBeCloseTo(106.8456, 2);
      expect(JABODETABEK_REGION.boundaryCoordinates.length).toBe(4);

      for (const coord of JABODETABEK_REGION.boundaryCoordinates) {
        expect(coord.latitude).toBeLessThan(0); // South
        expect(coord.longitude).toBeGreaterThan(100); // East
        expect(coord.latitude).toBeGreaterThan(CORE_JABODETABEK_BBOX.minLat);
        expect(coord.latitude).toBeLessThan(CORE_JABODETABEK_BBOX.maxLat);
        expect(coord.longitude).toBeGreaterThan(CORE_JABODETABEK_BBOX.minLon);
        expect(coord.longitude).toBeLessThan(CORE_JABODETABEK_BBOX.maxLon);
      }
    });

    it("All 16 transit line polyline coordinates should fall within geographic network bounds", () => {
      expect(TRANSIT_LINES.length).toBe(16);

      for (const line of TRANSIT_LINES) {
        expect(line.polylineCoordinates.length).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < line.polylineCoordinates.length; i++) {
          const pt = line.polylineCoordinates[i];
          expect(pt.latitude).toBeLessThan(0);
          expect(pt.longitude).toBeGreaterThan(100);
          expect(pt.latitude).toBeGreaterThan(NETWORK_BOUNDING_BOX.minLat);
          expect(pt.latitude).toBeLessThan(NETWORK_BOUNDING_BOX.maxLat);
          expect(pt.longitude).toBeGreaterThan(NETWORK_BOUNDING_BOX.minLon);
          expect(pt.longitude).toBeLessThan(NETWORK_BOUNDING_BOX.maxLon);

          // Check consecutive node distance is reasonable (< 500 km per hop)
          if (i > 0) {
            const prev = line.polylineCoordinates[i - 1];
            const dLat = Math.abs(pt.latitude - prev.latitude);
            const dLon = Math.abs(pt.longitude - prev.longitude);
            expect(dLat).toBeLessThan(3.0); // max 3 degrees lat per hop
            expect(dLon).toBeLessThan(4.0); // max 4 degrees lon per hop
          }
        }
      }
    });

    it("All defined transit stops should have authentic coordinates within network bounds", () => {
      expect(TRANSIT_STOPS.length).toBe(20);

      for (const stop of TRANSIT_STOPS) {
        expect(stop.latitude).toBeLessThan(0);
        expect(stop.longitude).toBeGreaterThan(100);
        expect(stop.latitude).toBeGreaterThan(CORE_JABODETABEK_BBOX.minLat);
        expect(stop.latitude).toBeLessThan(CORE_JABODETABEK_BBOX.maxLat);
        expect(stop.longitude).toBeGreaterThan(CORE_JABODETABEK_BBOX.minLon);
        expect(stop.longitude).toBeLessThan(CORE_JABODETABEK_BBOX.maxLon);
      }
    });
  });

  // 2. Coachbuilder, Chassis & Seating Diagram Specifications
  describe("2. Coachbuilder, Chassis & Seating Diagram Specifications", () => {
    it("Should verify coachbuilder technical specs are authentic and structurally valid", () => {
      expect(VEHICLE_TECHNICAL_SPECS.length).toBe(6);

      const knownBuilders = ["Laksana", "Nippon Sharyo", "CRRC", "Baze", "PT PAL"];

      for (const spec of VEHICLE_TECHNICAL_SPECS) {
        // Coachbuilder verification
        const hasKnownBuilder = knownBuilders.some((b) => spec.coachbuilder.includes(b));
        expect(hasKnownBuilder).toBe(true);

        // Dimensions and capacity
        expect(spec.lengthMeters).toBeGreaterThan(5.0); // Min length > 5m (HiAce is ~5.9m)
        expect(spec.lengthMeters).toBeLessThan(300.0); // Max length < 300m (8-car HSR is ~209m)
        expect(spec.passengerCapacity).toBeGreaterThan(4); // Min capacity > 4 (HiAce VIP is 8)
        expect(spec.passengerCapacity).toBeLessThan(3000); // Max capacity < 3000 (Ratangga is 1950)
        expect(spec.maxSpeedKmh).toBeGreaterThan(50);
        expect(spec.maxSpeedKmh).toBeLessThan(450);

        // String fields non-empty
        expect(spec.powertrain.length).toBeGreaterThan(10);
        expect(spec.engineOutput.length).toBeGreaterThan(5);
        expect(spec.torque.length).toBeGreaterThan(5);
        expect(spec.transmission.length).toBeGreaterThan(5);
        expect(spec.suspensionType.length).toBeGreaterThan(5);
        expect(spec.historicalNotes.length).toBeGreaterThan(30);
        expect(spec.safetyFeatures.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("Should verify all dynamic seating diagram generators produce valid seat layouts", () => {
      // 1. Sleeper 1-1-1
      const sleeper = generateSleeper111Seats("test-sleeper");
      expect(sleeper.layoutType).toBe("SLEEPER_1_1_1");
      expect(sleeper.totalSeats).toBe(21);
      expect(sleeper.seats.length).toBe(21);
      expect(sleeper.availableSeats).toBeGreaterThan(0);
      expect(sleeper.availableSeats).toBeLessThanOrEqual(21);
      expect(sleeper.seats[0].type).toBe("SLEEPER_SUITE");
      expect(sleeper.seats[0].pricePremiumRp).toBe(75000);

      // 2. Super Exec 2-1
      const superExec = generateSuperExec21Seats("test-superexec");
      expect(superExec.layoutType).toBe("EXECUTIVE_2_1");
      expect(superExec.totalSeats).toBe(21);
      expect(superExec.seats.length).toBe(21);
      expect(superExec.availableSeats).toBeGreaterThan(0);
      expect(superExec.seats[0].type).toBe("EXECUTIVE_RECLINER");

      // 3. Exec 2-2
      const exec22 = generateExecutive22Seats("test-exec22");
      expect(exec22.layoutType).toBe("SUPER_EXEC_2_2");
      expect(exec22.totalSeats).toBe(32);
      expect(exec22.seats.length).toBe(32);
      expect(exec22.seats[0].type).toBe("STANDARD_COACH");

      // 4. Commuter Longitudinal
      const commuter = generateCommuterLongitudinalSeats("test-commuter");
      expect(commuter.layoutType).toBe("COMMUTER_LONGITUDINAL");
      expect(commuter.totalSeats).toBe(24);
      expect(commuter.seats.length).toBe(24);
      const prioritySeats = commuter.seats.filter((s) => s.type === "PRIORITY_ACCESSIBLE");
      const wheelchairBays = commuter.seats.filter((s) => s.type === "WHEELCHAIR_BAY");
      expect(prioritySeats.length).toBe(3);
      expect(wheelchairBays.length).toBe(1);

      // 5. HiAce Captain
      const hiace = generateHiAceCaptainSeats("test-hiace");
      expect(hiace.layoutType).toBe("HIACE_VIP_CAPTAIN");
      expect(hiace.totalSeats).toBe(7); // Note: Spec says 8 capacity, diagram defines 7 seats
      expect(hiace.seats.length).toBe(7);
      const captainSeats = hiace.seats.filter((s) => s.type === "CAPTAIN_CHAIR");
      expect(captainSeats.length).toBe(4);
    });
  });

  // 3. Multi-modal Line Coverage Verification
  describe("3. Multi-modal Line Coverage Verification", () => {
    it("Should cover all mandatory transit categories and modes", () => {
      const modes = new Set(TRANSIT_LINES.map((l) => l.mode));
      const categories = new Set(TRANSIT_LINES.map((l) => l.category));

      expect(categories.has("RAIL")).toBe(true);
      expect(categories.has("BUS")).toBe(true);
      expect(categories.has("AVIATION")).toBe(true);
      expect(categories.has("MARITIME")).toBe(true);

      expect(modes.has("MRT_JAKARTA")).toBe(true);
      expect(modes.has("LRT_JABODEBEK_CIBUBUR")).toBe(true);
      expect(modes.has("LRT_JABODEBEK_BEKASI")).toBe(true);
      expect(modes.has("LRT_JAKARTA")).toBe(true);
      expect(modes.has("KRL_BOGOR")).toBe(true);
      expect(modes.has("KRL_CIKARANG")).toBe(true);
      expect(modes.has("KRL_RANGKASBITUNG")).toBe(true);
      expect(modes.has("WHOOSH_HSR")).toBe(true);
      expect(modes.has("KAI_BANDARA")).toBe(true);
      expect(modes.has("TRANSJAKARTA_BRT")).toBe(true);
      expect(modes.has("MIKROTRANS")).toBe(true);
      expect(modes.has("AKAP_INTERCITY_BUS")).toBe(true);
      expect(modes.has("EXECUTIVE_SHUTTLE")).toBe(true);
      expect(modes.has("AIRPORT_COMMERCIAL")).toBe(true);
      expect(modes.has("MARITIME_SPEEDBOAT")).toBe(true);
    });
  });

  // 4. Code Standards & Absence of Placeholders/Emojis
  describe("4. Code Standards & Absence of Placeholders/Emojis", () => {
    it("Should verify zero placeholder stubs across all code files", () => {
      const rootDir = path.resolve(__dirname, "..");
      const forbiddenSubstrings = ["TODO", "TBD", "FIXME", "DUMMY_STUB", "PLACEHOLDER_DATA"];

      function scanDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === ".agents" ||
            entry.name === "dev.db" ||
            entry.name === "dev.db-journal"
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (
            fullPath.endsWith(".ts") ||
            fullPath.endsWith(".tsx") ||
            fullPath.endsWith(".css") ||
            fullPath.endsWith(".prisma")
          ) {
            const content = fs.readFileSync(fullPath, "utf-8");
            for (const pattern of forbiddenSubstrings) {
              if (fullPath.includes("m1-dataset-audit.test.ts")) continue;
              expect(
                content.includes(pattern),
                `Found placeholder ${pattern} in ${fullPath}`
              ).toBe(false);
            }
          }
        }
      }

      scanDir(rootDir);
    });

    it("Should verify zero raw emojis across all source code and schema files", () => {
      const rootDir = path.resolve(__dirname, "..");
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

      function scanForEmojis(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === ".agents" ||
            entry.name === "dev.db" ||
            entry.name === "dev.db-journal"
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanForEmojis(fullPath);
          } else if (
            fullPath.endsWith(".ts") ||
            fullPath.endsWith(".tsx") ||
            fullPath.endsWith(".css") ||
            fullPath.endsWith(".prisma")
          ) {
            const content = fs.readFileSync(fullPath, "utf-8");
            expect(
              emojiRegex.test(content),
              `Found raw emoji in ${fullPath}`
            ).toBe(false);
          }
        }
      }

      scanForEmojis(rootDir);
    });
  });

  // 5. Database Relational Persistence & Integrity
  describe("5. Database Relational Persistence & Integrity", () => {
    it("Should query SQLite via Prisma and verify exact seeded counts and relationships", async () => {
      const regionCount = await db.region.count();
      const lineCount = await db.line.count();
      const stopCount = await db.stop.count();
      const vehicleCount = await db.vehicle.count();
      const techSpecCount = await db.technicalSpec.count();
      const photoCount = await db.photoGallery.count();
      const alertCount = await db.disruptionAlert.count();
      const ticketCount = await db.ticket.count();
      const checkinCount = await db.crowdsourceCheckIn.count();

      expect(regionCount).toBe(1);
      expect(lineCount).toBe(16);
      expect(stopCount).toBe(20);
      expect(vehicleCount).toBe(6);
      expect(techSpecCount).toBe(6);
      expect(photoCount).toBe(6);
      expect(alertCount).toBe(3);
      expect(ticketCount).toBeGreaterThanOrEqual(1);
      expect(checkinCount).toBeGreaterThanOrEqual(1);

      // Relational integrity check
      const vehicles = await db.vehicle.findMany({
        include: {
          line: true,
          technicalSpec: true,
          photos: true,
        },
      });

      for (const v of vehicles) {
        expect(v.line).toBeDefined();
        expect(v.technicalSpec).toBeDefined();
        expect(v.photos.length).toBeGreaterThan(0);
        expect(v.technicalSpec?.coachbuilder.length).toBeGreaterThan(3);
      }
    });
  });
});
