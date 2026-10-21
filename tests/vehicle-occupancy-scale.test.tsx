/**
 * PlatformI - Occupancy scale tests (T2 colorize).
 * Thresholds are shared, labeled, and rendered with numeric ranges —
 * never color-alone.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { VehicleCarriageSelector } from "@/components/inspector/VehicleCarriageSelector";
import { getOccupancyBand, OCCUPANCY_BANDS } from "@/lib/vehicle/occupancy";

describe("Occupancy scale helper", () => {
  it("maps boundary percentages to labeled bands", () => {
    expect(OCCUPANCY_BANDS).toHaveLength(4);
    expect(getOccupancyBand(0).labelKey).toBe("seatsAvailable");
    expect(getOccupancyBand(49).labelKey).toBe("seatsAvailable");
    expect(getOccupancyBand(50).labelKey).toBe("fewSeats");
    expect(getOccupancyBand(74).labelKey).toBe("fewSeats");
    expect(getOccupancyBand(75).labelKey).toBe("standingOnly");
    expect(getOccupancyBand(89).labelKey).toBe("standingOnly");
    expect(getOccupancyBand(90).labelKey).toBe("fullCrowded");
    expect(getOccupancyBand(100).labelKey).toBe("fullCrowded");
  });

  it("covers 0-100 with contiguous ranges", () => {
    expect(OCCUPANCY_BANDS[0].min).toBe(0);
    for (let i = 1; i < OCCUPANCY_BANDS.length; i++) {
      expect(OCCUPANCY_BANDS[i].min).toBe(OCCUPANCY_BANDS[i - 1].max + 1);
    }
    expect(OCCUPANCY_BANDS[OCCUPANCY_BANDS.length - 1].max).toBe(100);
  });
});

describe("Occupancy legend rendering", () => {
  it("shows numeric ranges with text labels next to the pills", () => {
    const trainVehicle = TRANSIT_VEHICLES.find(
      (v) => v.carriages && v.carriages.length >= 6
    )!;
    render(<VehicleCarriageSelector vehicle={trainVehicle} />);

    expect(screen.getByText(/0–49/)).toBeInTheDocument();
    expect(screen.getByText(/50–74/)).toBeInTheDocument();
    expect(screen.getByText(/75–89/)).toBeInTheDocument();
    expect(screen.getByText(/90–100/)).toBeInTheDocument();
  });
});
