/**
 * Tier 1 & Tier 2 Tests: Multi-Modal Fare Engine & JakLingko Integrated Tariff Cap
 * Validates mode-specific distance matrices, peak/off-peak rates, early-bird discounts,
 * and the 3-hour Rp 10,000 JakLingko integration boundary conditions.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLegFare,
  calculateJakLingkoTripFare,
  JakLingkoLegInput,
} from './helpers/domain';

describe('Tier 1: Mode-Specific Fare Calculation Formulas', () => {
  it('calculates TransJakarta BRT flat fare for standard and early-bird hours', () => {
    const standardFare = calculateLegFare('tj_brt', 15.6, { departureHour: 10 });
    const earlyBirdFare = calculateLegFare('tj_brt', 15.6, { departureHour: 6 });
    const nonBrtFare = calculateLegFare('tj_non_brt', 12.0, { departureHour: 14 });

    expect(standardFare).toBe(3500);
    expect(earlyBirdFare).toBe(2000);
    expect(nonBrtFare).toBe(3500);
  });

  it('calculates MikroTrans JakLingko feeder fare as Rp 0 subsidized', () => {
    const mikroFareShort = calculateLegFare('mikrotrans', 3.5);
    const mikroFareLong = calculateLegFare('mikrotrans', 18.2);

    expect(mikroFareShort).toBe(0);
    expect(mikroFareLong).toBe(0);
  });

  it('calculates MRT Jakarta progressive station-based rate with maximum cap of Rp 14,000', () => {
    // 1 station (e.g. Lebak Bulus to Fatmawati) -> Rp 3,000 + 1 * 1,000 = Rp 4,000
    const oneStation = calculateLegFare('mrt', 2.1, { stationCount: 1 });
    // 5 stations (e.g. Lebak Bulus to Blok M) -> Rp 3,000 + 5 * 1,000 = Rp 8,000
    const fiveStations = calculateLegFare('mrt', 8.5, { stationCount: 5 });
    // 13 stations (Full line: Lebak Bulus to Bundaran HI) -> 3,000 + 13 * 1,000 = 16,000 -> Capped at 14,000
    const fullLine = calculateLegFare('mrt', 15.7, { stationCount: 13 });

    expect(oneStation).toBe(4000);
    expect(fiveStations).toBe(8000);
    expect(fullLine).toBe(14000);
  });

  it('calculates LRT Jabodebek progressive distance rate with peak and off-peak caps', () => {
    const distanceKm = 28.5; // Dukuh Atas to Harjamukti Cibubur
    // Formula: 5000 + ceil(28.5 - 1) * 700 = 5000 + 28 * 700 = 5000 + 19600 = 24600

    const peakFare = calculateLegFare('lrt_jabodebek', distanceKm, { isPeak: true });
    const offPeakFare = calculateLegFare('lrt_jabodebek', distanceKm, { isPeak: false });

    // Peak max cap = Rp 20,000; Off-peak max cap = Rp 10,000
    expect(peakFare).toBe(20000);
    expect(offPeakFare).toBe(10000);
  });

  it('calculates KRL Commuter Line progressive segment-based fare', () => {
    // Short trip <= 25 km (e.g. Sudirman to Manggarai = 3.5 km)
    const shortTrip = calculateLegFare('krl', 3.5);
    // Medium trip (e.g. Jakarta Kota to Depok = 33 km) -> 3000 + ceil(8 / 10) * 1000 = 4000
    const mediumTrip = calculateLegFare('krl', 33.0);
    // Long suburban trip (Bogor to Jakarta Kota = 55 km) -> 3000 + ceil(30 / 10) * 1000 = 6000
    const bogorLine = calculateLegFare('krl', 55.0);

    expect(shortTrip).toBe(3000);
    expect(mediumTrip).toBe(4000);
    expect(bogorLine).toBe(6000);
  });

  it('calculates Whoosh High-Speed Rail tiered class pricing', () => {
    const economyFare = calculateLegFare('whoosh', 142.3, { seatClass: 'economy' });
    const businessFare = calculateLegFare('whoosh', 142.3, { seatClass: 'business' });
    const firstFare = calculateLegFare('whoosh', 142.3, { seatClass: 'first' });

    expect(economyFare).toBe(225000);
    expect(businessFare).toBe(450000);
    expect(firstFare).toBe(600000);
  });

  it('calculates Airport Rail Link and Maritime Speedboat tariffs', () => {
    const airportExecutive = calculateLegFare('kai_bandara', 36.0, { seatClass: 'executive' });
    const airportPremium = calculateLegFare('kai_bandara', 36.0);
    const shortIslandHop = calculateLegFare('maritime', 18.0);
    const longIslandHop = calculateLegFare('maritime', 42.0);

    expect(airportExecutive).toBe(70000);
    expect(airportPremium).toBe(50000);
    expect(shortIslandHop).toBe(54000);
    expect(longIslandHop).toBe(74000);
  });
});

describe('Tier 2: Boundary & Corner Fare Conditions (JakLingko 3-Hour Tariff Cap)', () => {
  it('returns baseline fare for zero-distance trip without negative calculation', () => {
    const zeroMrt = calculateLegFare('mrt', 0, { stationCount: 0 });
    const zeroTJ = calculateLegFare('tj_brt', 0);
    const zeroLrt = calculateLegFare('lrt_jabodebek', 0);

    expect(zeroMrt).toBe(3000);
    expect(zeroTJ).toBe(3500);
    expect(zeroLrt).toBe(5000);
  });

  it('clamps negative distance input to zero baseline safely', () => {
    const negativeMrt = calculateLegFare('mrt', -10);
    expect(negativeMrt).toBe(3000);
    expect(negativeMrt).toBeGreaterThan(0);
  });

  it('enforces Rp 10,000 JakLingko integrated cap on multi-modal MRT + TransJakarta + LRT journey', () => {
    const baseTime = new Date('2026-08-22T08:00:00Z');

    // Leg 1: MRT Lebak Bulus to CSW (8.5 km, 20 min) -> raw Rp 8,000
    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: 8.5,
      stationCount: 5,
      tapInTime: new Date(baseTime.getTime()),
      tapOutTime: new Date(baseTime.getTime() + 20 * 60 * 1000),
    };

    // Leg 2: TransJakarta Corridor 13 CSW to Dukuh Atas (6.0 km, 25 min, transfer gap = 10 min) -> raw Rp 3,500
    const leg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 6.0,
      tapInTime: new Date(baseTime.getTime() + 30 * 60 * 1000),
      tapOutTime: new Date(baseTime.getTime() + 55 * 60 * 1000),
    };

    // Leg 3: LRT Jabodebek Dukuh Atas to Harjamukti (28.5 km, 45 min, transfer gap = 15 min) -> raw Rp 20,000 (peak)
    const leg3: JakLingkoLegInput = {
      mode: 'lrt_jabodebek',
      distanceKm: 28.5,
      isPeak: true,
      tapInTime: new Date(baseTime.getTime() + 70 * 60 * 1000),
      tapOutTime: new Date(baseTime.getTime() + 115 * 60 * 1000),
    };

    const trip = calculateJakLingkoTripFare([leg1, leg2, leg3]);

    expect(trip.rawFareRp).toBe(8000 + 3500 + 20000); // Rp 31,500 standalone
    expect(trip.totalFareRp).toBe(10000); // Strictly capped at Rp 10,000
    expect(trip.isCapped).toBe(true);
    expect(trip.discountRp).toBe(21500); // Commuter saves Rp 21,500
    expect(trip.isTransferValid).toBe(true);
  });

  it('enforces JakLingko cap at exact 3-hour boundary: 179 minutes 59 seconds (within window)', () => {
    const baseTime = new Date('2026-08-22T08:00:00Z');

    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: 10.0,
      stationCount: 8,
      tapInTime: new Date(baseTime.getTime()),
      tapOutTime: new Date(baseTime.getTime() + 40 * 60 * 1000),
    };

    // Final tap-out at exactly 179 minutes 59 seconds (10,799,000 ms)
    const leg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 15.0,
      tapInTime: new Date(baseTime.getTime() + 60 * 60 * 1000),
      tapOutTime: new Date(baseTime.getTime() + (179 * 60 + 59) * 1000),
    };

    const result = calculateJakLingkoTripFare([leg1, leg2]);

    expect(result.isTransferValid).toBe(true);
    expect(result.totalFareRp).toBeLessThanOrEqual(10000);
  });

  it('invalidates JakLingko cap at exact 3-hour boundary: 180 minutes 01 seconds (exceeded window)', () => {
    const baseTime = new Date('2026-08-22T08:00:00Z');

    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: 10.0,
      stationCount: 8,
      tapInTime: new Date(baseTime.getTime()),
      tapOutTime: new Date(baseTime.getTime() + 40 * 60 * 1000),
    };

    // Final tap-out at 180 minutes 01 seconds (10,801,000 ms) -> Exceeds 180 min rule
    const leg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 15.0,
      tapInTime: new Date(baseTime.getTime() + 60 * 60 * 1000),
      tapOutTime: new Date(baseTime.getTime() + (180 * 60 + 1) * 1000),
    };

    const result = calculateJakLingkoTripFare([leg1, leg2]);

    expect(result.isTransferValid).toBe(false);
    expect(result.totalFareRp).toBe(result.rawFareRp); // Fallback to unintegrated sum
    expect(result.discountRp).toBe(0);
  });

  it('validates transfer gap within 45-minute limit (44m 59s) and rejects when exceeded (45m 01s)', () => {
    const baseTime = new Date('2026-08-22T08:00:00Z');

    const leg1: JakLingkoLegInput = {
      mode: 'mrt',
      distanceKm: 5.0,
      tapInTime: new Date(baseTime.getTime()),
      tapOutTime: new Date(baseTime.getTime() + 15 * 60 * 1000),
    };

    // Case A: Transfer gap = 44m 59s (valid)
    const validLeg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 5.0,
      tapInTime: new Date(baseTime.getTime() + (15 * 60 + 44 * 60 + 59) * 1000),
      tapOutTime: new Date(baseTime.getTime() + 80 * 60 * 1000),
    };

    const validResult = calculateJakLingkoTripFare([leg1, validLeg2]);
    expect(validResult.isTransferValid).toBe(true);

    // Case B: Transfer gap = 45m 01s (invalid)
    const invalidLeg2: JakLingkoLegInput = {
      mode: 'tj_brt',
      distanceKm: 5.0,
      tapInTime: new Date(baseTime.getTime() + (15 * 60 + 45 * 60 + 1) * 1000),
      tapOutTime: new Date(baseTime.getTime() + 80 * 60 * 1000),
    };

    const invalidResult = calculateJakLingkoTripFare([leg1, invalidLeg2]);
    expect(invalidResult.isTransferValid).toBe(false);
    expect(invalidResult.totalFareRp).toBe(invalidResult.rawFareRp);
  });
});
