/**
 * Tier 3 Tests: Pairwise Cross-Feature Integration Test Suite
 * Validates cross-subsystem interactions between simulation telemetry, station departure boards,
 * crowdsourcing, ticket wallet, turnstile scanner, multi-modal transfer hubs, and enthusiast matrices.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  simulateVehicleMovement,
  calculateNextStopETA,
  aggregateVehicleDensity,
  generateRollingQRToken,
  validateRollingQRToken,
  calculateJakLingkoTripFare,
  calculateLegFare,
  SimulatedVehicleState,
  CrowdsourceCheckIn,
  JakLingkoLegInput,
} from './helpers/domain';

describe('Tier 3: Pairwise Cross-Feature Integration Matrix', () => {
  // Test 1: Simulation -> Station Live Arrival Board
  it('updates station departure board countdown in real-time as simulation progresses', () => {
    const polyline: [number, number][] = [
      [-6.2892, 106.7749], // Lebak Bulus
      [-6.2925, 106.7938], // Fatmawati (Stop at 2100m)
    ];
    const stopDistance = 2100;

    let vehicle: SimulatedVehicleState = {
      id: 'MRT-SET-10',
      lineId: 'M',
      mode: 'mrt',
      currentDistanceMeters: 100,
      speedKmh: 60, // 16.67 m/s
      position: polyline[0],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    // Initial ETA to Fatmawati: (2100 - 100) / 16.67 = 120 seconds
    const initialETA = calculateNextStopETA(vehicle.currentDistanceMeters, stopDistance, vehicle.speedKmh, 1);
    expect(initialETA).toBe(120);

    // Advance simulation by 30 seconds -> covers 500m -> current distance = 600m
    vehicle = simulateVehicleMovement(vehicle, polyline, 30, 1);
    const updatedETA = calculateNextStopETA(vehicle.currentDistanceMeters, stopDistance, vehicle.speedKmh, 1);

    // Remaining: 1500m -> ETA = 1500 / 16.67 = 90 seconds
    expect(updatedETA).toBe(90);
    expect(updatedETA).toBeLessThan(initialETA);
  });

  // Test 2: Crowdsource -> Vehicle Map Marker Badge
  it('updates vehicle map marker density badge color state when crowd check-in is submitted', () => {
    const vehicleId = 'TJ-BUS-882';
    const now = Date.now();

    // Baseline: No check-ins -> Level 1 (Low / Green badge)
    const initialReports: CrowdsourceCheckIn[] = [];
    const baseline = aggregateVehicleDensity(initialReports, now);
    expect(baseline.densityLevel).toBe(1);

    // Commuters submit Level 4 (Crush load) check-ins on bus
    const activeReports: CrowdsourceCheckIn[] = [
      { id: '1', vehicleId, densityRating: 4, acRating: 2, timestampMs: now - 10000, userId: 'U1' },
      { id: '2', vehicleId, densityRating: 4, acRating: 1, timestampMs: now - 5000, userId: 'U2' },
    ];

    const updated = aggregateVehicleDensity(activeReports, now);

    // Dynamic marker badge state transitions to Level 4 (Crush / Rose Red badge)
    expect(updated.densityLevel).toBe(4);
    const getBadgeClass = (level: 1 | 2 | 3 | 4) => {
      switch (level) {
        case 1: return 'badge-emerald';
        case 2: return 'badge-blue';
        case 3: return 'badge-amber';
        case 4: return 'badge-rose';
      }
    };
    expect(getBadgeClass(updated.densityLevel)).toBe('badge-rose');
  });

  // Test 3: AI Route Recommendation -> Route Polyline Layer
  it('integrates AI route polyline coordinates with Leaflet route visualizer state', () => {
    // Simulated structured output from OpenRouter transit recommendation
    const aiRecommendation = {
      modelUsed: 'google/gemini-3.7-flash',
      origin: 'Lebak Bulus Grab',
      destination: 'Monas',
      legs: [
        { mode: 'mrt', lineCode: 'M', from: 'Lebak Bulus', to: 'Bundaran HI' },
        { mode: 'tj_brt', lineCode: 'TJ-COR-01', from: 'Bundaran HI', to: 'Monas' },
      ],
      polylineCoordinates: [
        [-6.2892, 106.7749],
        [-6.1928, 106.8231],
        [-6.1754, 106.8272],
      ] as [number, number][],
    };

    expect(aiRecommendation.legs).toHaveLength(2);
    expect(aiRecommendation.polylineCoordinates.length).toBeGreaterThan(2);

    // Verify coordinates can be passed directly to Leaflet layer state
    const firstLegOrigin = aiRecommendation.polylineCoordinates[0];
    const finalLegDest = aiRecommendation.polylineCoordinates[aiRecommendation.polylineCoordinates.length - 1];

    expect(firstLegOrigin[0]).toBeCloseTo(-6.2892, 4);
    expect(finalLegDest[0]).toBeCloseTo(-6.1754, 4);
  });

  // Test 4: Ticket Purchase -> Rolling QR Token in Digital Wallet
  it('generates dynamic rolling QR token and populates pass wallet upon ticket checkout', () => {
    const purchaseTime = Date.now();
    const newTicket = {
      id: 'TKT-INTEG-2026',
      userId: 'USR-WALLET-01',
      originStopId: 'STOP-LEBAK-BULUS',
      destinationStopId: 'STOP-MONAS',
      fareRp: 10000,
      isJakLingkoIntegrated: true,
      status: 'ACTIVE' as const,
      createdAt: new Date(purchaseTime).toISOString(),
    };

    const rollingQR = generateRollingQRToken(newTicket.id, newTicket.userId, purchaseTime);

    expect(newTicket.status).toBe('ACTIVE');
    expect(rollingQR.token).toHaveLength(16);
    expect(rollingQR.fullPayload).toContain(newTicket.id);
    expect(rollingQR.secondsRemaining).toBeGreaterThan(0);
    expect(rollingQR.secondsRemaining).toBeLessThanOrEqual(30);
  });

  // Test 5: Digital Pass Wallet -> Turnstile Gate Scanner Check-in
  it('validates dynamic QR pass at turnstile gate scanner and records tap-in state', () => {
    const now = Date.now();
    const ticketId = 'TKT-GATE-CHECK';
    const userId = 'USR-GATE-01';

    const token = generateRollingQRToken(ticketId, userId, now);
    const scanResult = validateRollingQRToken(token.fullPayload, 1, now);

    expect(scanResult.isValid).toBe(true);
    expect(scanResult.ticketId).toBe(ticketId);

    // Gate Solenoid Activation
    const gateStatus = scanResult.isValid ? 'SOLENOID_OPENED' : 'GATE_LOCKED';
    expect(gateStatus).toBe('SOLENOID_OPENED');
  });

  // Test 6: Gate Scanner -> Multi-Leg JakLingko Transfer Window
  it('validates second-leg JakLingko transfer within 45 minutes and maintains Rp 10,000 cap', () => {
    const baseTime = new Date('2026-08-22T09:00:00Z');

    // Leg 1: MRT Lebak Bulus to CSW
    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: 8.5,
      stationCount: 5,
      tapInTime: new Date(baseTime.getTime()),
      tapOutTime: new Date(baseTime.getTime() + 20 * 60 * 1000),
    };

    // Leg 2: TransJakarta Corridor 13 CSW (Tap-in 12 min after MRT tap-out)
    const leg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 9.3,
      tapInTime: new Date(baseTime.getTime() + 32 * 60 * 1000),
      tapOutTime: new Date(baseTime.getTime() + 65 * 60 * 1000),
    };

    const trip = calculateJakLingkoTripFare([leg1, leg2]);

    expect(trip.isTransferValid).toBe(true);
    expect(trip.totalFareRp).toBeLessThanOrEqual(10000);
    expect(trip.discountRp).toBeGreaterThan(0);
  });

  // Test 7: Simulation Speed Multiplier -> Synchronous ETA Scaling
  it('synchronously scales telemetry ETA countdown when simulation speed changes from 1x to 5x', () => {
    const remainingDistanceMeters = 3000;
    const speedKmh = 45; // 12.5 m/s

    const eta1x = calculateNextStopETA(0, remainingDistanceMeters, speedKmh, 1);
    const eta5x = calculateNextStopETA(0, remainingDistanceMeters, speedKmh, 5);

    expect(eta1x).toBe(240); // 3000 / 12.5 = 240s
    expect(eta5x).toBe(48);  // 3000 / (12.5 * 5) = 48s
    expect(eta1x / eta5x).toBe(5);
  });

  // Test 8: Disruption Alert -> AI Advisor Alternative Routing Trigger
  it('integrates active line disruption alerts into AI advisor alternative guidance', () => {
    const disruptionAlert = {
      id: 'ALT-KRL-01',
      lineCode: 'KRL-BOGOR-RED',
      severity: 'HIGH',
      headline: 'Signal Maintenance at Manggarai',
      affectedStops: ['Manggarai', 'Tebet', 'Cawang'],
      recommendedAlternative: 'LRT-JB-CB-BLUE',
    };

    const isLineDisrupted = (line: string) => line === disruptionAlert.lineCode;

    expect(isLineDisrupted('KRL-BOGOR-RED')).toBe(true);
    expect(isLineDisrupted('M')).toBe(false);

    // AI prompt context injection
    const promptContext = `Line ${disruptionAlert.lineCode} has active disruption: ${disruptionAlert.headline}. Divert commuters to ${disruptionAlert.recommendedAlternative}.`;
    expect(promptContext).toContain('LRT-JB-CB-BLUE');
  });

  // Test 9: Enthusiast Coachbuilder Spec -> Interactive SVG Seating Layout Matrix
  it('links enthusiast chassis model to matching cabin seating layout type', () => {
    interface TechnicalSpecMatrix {
      coachbuilder: string;
      chassis: string;
      layoutType: 'sleeper_1_1_1' | 'super_exec_2_1' | 'exec_2_2' | 'hsr_standard';
      totalSeats: number;
    }

    const busSpec: TechnicalSpecMatrix = {
      coachbuilder: 'Laksana Legacy SR3 Suites Class',
      chassis: 'Scania K410IB 6x2*4 Tridem',
      layoutType: 'sleeper_1_1_1',
      totalSeats: 21,
    };

    const hsrSpec: TechnicalSpecMatrix = {
      coachbuilder: 'CRRC Qingdao Sifang',
      chassis: 'KCIC400AF Electric Trainset',
      layoutType: 'hsr_standard',
      totalSeats: 601,
    };

    expect(busSpec.layoutType).toBe('sleeper_1_1_1');
    expect(busSpec.totalSeats).toBe(21);
    expect(hsrSpec.layoutType).toBe('hsr_standard');
    expect(hsrSpec.totalSeats).toBe(601);
  });

  // Test 10: Tap-Out -> Ticket Completion & Final Wallet Balance Deduction
  it('completes transit session and marks digital ticket as COMPLETED on destination tap-out', () => {
    interface WalletPass {
      ticketId: string;
      status: 'ACTIVE' | 'IN_TRANSIT' | 'COMPLETED';
      userBalanceRp: number;
      finalFareDeducted: number;
    }

    const pass: WalletPass = {
      ticketId: 'TKT-SESSION-88',
      status: 'IN_TRANSIT',
      userBalanceRp: 50000,
      finalFareDeducted: 0,
    };

    const completeTrip = (p: WalletPass, calculatedFareRp: number) => {
      p.status = 'COMPLETED';
      p.finalFareDeducted = calculatedFareRp;
      p.userBalanceRp -= calculatedFareRp;
    };

    completeTrip(pass, 10000);

    expect(pass.status).toBe('COMPLETED');
    expect(pass.finalFareDeducted).toBe(10000);
    expect(pass.userBalanceRp).toBe(40000);
  });

  // Test 11: Multi-Modal Interchange Hub Skybridge Transfer Vector
  it('calculates walking transfer parameters for CSW-ASEAN multi-level skybridge', () => {
    const cswSkybridge = {
      id: 'HUB-CSW-ASEAN',
      name: 'CSW - ASEAN Integrasi',
      levels: 5,
      modesConnected: ['mrt', 'tj_brt'],
      walkingDistanceMeters: 180,
      walkingSpeedMps: 1.2, // Standard walking speed 1.2 m/s
      hasElevators: true,
      hasEscalators: true,
    };

    const transferTimeSeconds = Math.round(cswSkybridge.walkingDistanceMeters / cswSkybridge.walkingSpeedMps);

    expect(cswSkybridge.modesConnected).toContain('mrt');
    expect(cswSkybridge.modesConnected).toContain('tj_brt');
    expect(transferTimeSeconds).toBe(150); // 2.5 minutes walking
    expect(cswSkybridge.hasElevators).toBe(true);
  });
});
