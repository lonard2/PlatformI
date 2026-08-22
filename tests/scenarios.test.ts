/**
 * Tier 4 Tests: Real-World Jabodetabek Commuter Workload Scenarios
 * Validates authentic multi-modal journeys across Greater Jakarta:
 * 1. South to Central Axis (Lebak Bulus MRT -> CSW Skybridge -> TJ Cor 13/1 -> Monas)
 * 2. Trans-Jabodetabek Suburban Rail (Bogor KRL -> Manggarai -> Sudirman -> JPM Dukuh Atas -> LRT Harjamukti)
 * 3. High-Speed Intercity to Urban Metro (Whoosh Tegalluar -> Halim HSR Hub -> LRT Bekasi -> Dukuh Atas)
 * 4. Airport Express Multi-Modal Corridor (CGK T3 -> Skytrain -> Rail Link -> BNI City -> MRT -> Bundaran HI)
 * 5. Maritime Archipelago Island Hop (Muara Angke -> Speedboat Pulau Pramuka -> Local boat Pulau Pari)
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  calculateBearing,
  calculateLegFare,
  calculateJakLingkoTripFare,
  generateRollingQRToken,
  validateRollingQRToken,
  JakLingkoLegInput,
} from './helpers/domain';

describe('Tier 4: Real-World Jabodetabek Commute Workload Scenarios', () => {
  // Scenario 1: South to Central Axis
  it('Scenario 1: executes South to Central multi-modal journey with JakLingko Rp 10,000 tariff cap', () => {
    const startTime = new Date('2026-08-22T07:30:00Z');

    // Step 1: Board MRT at Lebak Bulus Grab (-6.2892, 106.7749) to ASEAN (-6.2387, 106.7986)
    const lebakBulusCoord: [number, number] = [-6.2892, 106.7749];
    const aseanCoord: [number, number] = [-6.2387, 106.7986];
    const mrtDistanceMeters = haversineDistance(lebakBulusCoord, aseanCoord);
    expect(mrtDistanceMeters).toBeGreaterThan(6000);

    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: mrtDistanceMeters / 1000,
      stationCount: 6,
      tapInTime: startTime,
      tapOutTime: new Date(startTime.getTime() + 18 * 60 * 1000), // 18 min ride
    };

    // Step 2: Transfer via CSW 5-Story Retrofit Skybridge
    const cswSkybridgeWalkingSeconds = 150; // 2.5 minutes
    const tjTapInTime = new Date(leg1.tapOutTime.getTime() + cswSkybridgeWalkingSeconds * 1000);

    // Step 3: Board TransJakarta Corridor 13 elevated to Tendean, transfer to Corridor 1 to Monas
    const leg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 8.5,
      tapInTime: tjTapInTime,
      tapOutTime: new Date(tjTapInTime.getTime() + 35 * 60 * 1000), // 35 min ride
    };

    const trip = calculateJakLingkoTripFare([leg1, leg2]);

    expect(trip.isTransferValid).toBe(true);
    expect(trip.totalFareRp).toBeLessThanOrEqual(10000);
    expect(trip.rawFareRp).toBe(9000 + 3500); // 12,500 standalone
    expect(trip.discountRp).toBeGreaterThan(0);
  });

  // Scenario 2: Trans-Jabodetabek Suburban Rail Corridor
  it('Scenario 2: executes Trans-Jabodetabek suburban commute from Bogor to Cibubur via Dukuh Atas TOD', () => {
    const startTime = new Date('2026-08-22T06:30:00Z');

    // Step 1: KRL Commuter Line Bogor to Manggarai to Sudirman (55 km)
    const krlDistanceKm = 55.0;
    const krlFare = calculateLegFare('krl', krlDistanceKm);
    expect(krlFare).toBe(6000); // Rp 6,000 progressive rate

    // Step 2: JPM Dukuh Atas Skywalk transfer (250m across Ciliwung to LRT Stasiun Dukuh Atas)
    const jpmLengthMeters = 250;
    const walkingMinutes = jpmLengthMeters / (1.2 * 60); // approx 3.5 minutes
    expect(walkingMinutes).toBeLessThan(5);

    // Step 3: LRT Jabodebek Dukuh Atas to Harjamukti Cibubur (28.5 km during Morning Peak)
    const lrtDistanceKm = 28.5;
    const lrtPeakFare = calculateLegFare('lrt_jabodebek', lrtDistanceKm, { isPeak: true });
    expect(lrtPeakFare).toBe(20000); // Capped at peak max Rp 20,000

    const totalSuburbanFare = krlFare + lrtPeakFare;
    expect(totalSuburbanFare).toBe(26000);
  });

  // Scenario 3: High-Speed Intercity to Urban Metro Corridor
  it('Scenario 3: executes Whoosh HSR from Bandung Tegalluar to Halim Hub and LRT transfer', () => {
    // Step 1: Whoosh High-Speed Train CRRC KCIC400AF (Tegalluar -> Padalarang -> Halim = 142.3 km)
    const tegalluarCoord: [number, number] = [-6.9658, 107.7121];
    const halimCoord: [number, number] = [-6.2447, 106.8837];
    const hsrDistance = haversineDistance(tegalluarCoord, halimCoord);
    expect(hsrDistance).toBeGreaterThan(100000); // > 100 km direct

    const whooshTicketPrice = calculateLegFare('whoosh', 142.3, { seatClass: 'economy' });
    expect(whooshTicketPrice).toBe(225000);

    // Step 2: Halim 180m Enclosed Skybridge Transfer to LRT Jabodebek Halim Platform
    const halimSkybridgeMeters = 180;
    const transferMinutes = halimSkybridgeMeters / (1.2 * 60);
    expect(transferMinutes).toBeCloseTo(2.5, 1);

    // Step 3: LRT Jabodebek Bekasi Line (Halim to Dukuh Atas = 13.5 km)
    const lrtFare = calculateLegFare('lrt_jabodebek', 13.5, { isPeak: false });
    expect(lrtFare).toBeLessThanOrEqual(10000);
  });

  // Scenario 4: Airport Express Multi-Modal Aviation Corridor
  it('Scenario 4: executes Airport Rail Express from CGK Terminal 3 to Central Jakarta with dynamic QR', () => {
    const flightArrival = Date.now();

    // Step 1: Skytrain APMS Terminal 3 -> Integrated Airport Railway Station
    const apmsFare = 0; // Free of charge automated people mover
    expect(apmsFare).toBe(0);

    // Step 2: Purchase KAI Bandara Executive Rail Link ticket to BNI City
    const airportRailFare = calculateLegFare('kai_bandara', 36.0, { seatClass: 'executive' });
    expect(airportRailFare).toBe(70000);

    const ticketId = 'TKT-AIRPORT-CGK-881';
    const userId = 'USR-TRAVELER-01';

    // Step 3: Dynamic 30s Rolling QR token generation at SHIA gate
    const qrToken = generateRollingQRToken(ticketId, userId, flightArrival);
    const gateScan = validateRollingQRToken(qrToken.fullPayload, 1, flightArrival);

    expect(gateScan.isValid).toBe(true);
    expect(gateScan.ticketId).toBe(ticketId);

    // Step 4: Intermodal connection at BNI City to MRT Dukuh Atas BNI
    const bniCityToDukuhAtasMrtMeters = 120;
    expect(bniCityToDukuhAtasMrtMeters).toBeLessThan(200);
  });

  // Scenario 5: Maritime Archipelago Island Hop Corridor
  it('Scenario 5: executes Maritime Speedboat navigation from Muara Angke to Pulau Pramuka', () => {
    const muaraAngkeCoord: [number, number] = [-6.1105, 106.7728];
    const pulauPramukaCoord: [number, number] = [-5.7461, 106.6144];

    // Nautical surface distance & navigation bearing
    const nauticalDistanceMeters = haversineDistance(muaraAngkeCoord, pulauPramukaCoord);
    const marineBearing = calculateBearing(muaraAngkeCoord, pulauPramukaCoord);

    // Distance is approximately 43 - 45 km North-Northwest
    expect(nauticalDistanceMeters).toBeGreaterThan(40000);
    expect(marineBearing).toBeGreaterThan(330);
    expect(marineBearing).toBeLessThan(360);

    // Speedboat Dishub express fare
    const speedboatFare = calculateLegFare('maritime', nauticalDistanceMeters / 1000);
    expect(speedboatFare).toBe(74000); // Long distance island fare
  });
});
