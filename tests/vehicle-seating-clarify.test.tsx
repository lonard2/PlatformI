/**
 * PlatformI - Seating tab clarify tests (T1).
 * Stepper + emptiest-car default + Show-seats disclosure. Enthusiast content
 * (full seat matrix) must remain intact behind the disclosure, never removed.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { VehicleCarriageSelector } from "@/components/inspector/VehicleCarriageSelector";
import { VehicleSeatingDiagram } from "@/components/inspector/VehicleSeatingDiagram";
import { id as idDictionary } from "@/lib/i18n/dictionaries/id";

describe("Seating clarify: stepper and emptiest-car default", () => {
  it("exposes a pure emptiest-car helper preferring the lowest occupancy", async () => {
    const { findEmptiestCarIndex } = await import(
      "@/components/inspector/VehicleCarriageSelector"
    );
    expect(
      findEmptiestCarIndex([
        { carIndex: 1, occupancyPercent: 80 },
        { carIndex: 2, occupancyPercent: 10 },
        { carIndex: 3, occupancyPercent: 45 },
      ] as never)
    ).toBe(2);
    expect(findEmptiestCarIndex([])).toBe(1);
  });

  it("defaults selection to the emptiest car and steps through cars", () => {
    const trainVehicle = TRANSIT_VEHICLES.find(
      (v) => v.carriages && v.carriages.length >= 6
    )!;
    const carriages = trainVehicle.carriages!;
    const emptiest = carriages.reduce((a, b) =>
      b.occupancyPercent < a.occupancyPercent ? b : a
    );

    render(<VehicleCarriageSelector vehicle={trainVehicle} />);

    expect(
      screen.getByText(new RegExp(`\\(${emptiest.carCode}\\)`))
    ).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /berikutnya|next car/i });
    fireEvent.click(nextBtn);
    const idx = carriages.findIndex((c) => c.carIndex === emptiest.carIndex);
    const following = carriages[(idx + 1) % carriages.length];
    expect(
      screen.getByText(new RegExp(`\\(${following.carCode}\\)`))
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(idDictionary.vehicleInspector.emptiest, "i") })
    );
    expect(
      screen.getByText(new RegExp(`\\(${emptiest.carCode}\\)`))
    ).toBeInTheDocument();
  });
});

describe("Seating clarify: seat matrix behind a disclosure", () => {
  it("collapses the matrix by default and keeps every seat behind the toggle", () => {
    const rosaliaVehicle = TRANSIT_VEHICLES.find(
      (v) => v.mode === "AKAP_INTERCITY_BUS"
    )!;
    render(<VehicleSeatingDiagram vehicle={rosaliaVehicle} />);

    expect(screen.queryByText("1A")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", {
      name: new RegExp(idDictionary.vehicleInspector.showSeats, "i"),
    });
    fireEvent.click(toggle);

    const seatCount = rosaliaVehicle.seatingDiagram?.seats.length ?? 0;
    expect(seatCount).toBeGreaterThan(0);
    expect(screen.getByText("1A")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(idDictionary.vehicleInspector.hideSeats, "i"),
      })
    );
    expect(screen.queryByText("1A")).not.toBeInTheDocument();
  });
});
