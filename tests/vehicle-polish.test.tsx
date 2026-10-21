/**
 * PlatformI - Polish gate tests (T6).
 * Type ramp compliance and 44px touch honesty on the vehicle sheet.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { VehicleDetailSheet } from "@/components/inspector/VehicleDetailSheet";
import { VehicleCarriageSelector } from "@/components/inspector/VehicleCarriageSelector";
import { id as idDictionary } from "@/lib/i18n/dictionaries/id";

describe("Polish gate", () => {
  it("keeps pill percentages on the DESIGN.md ramp (10px label, never 9px)", () => {
    const trainVehicle = TRANSIT_VEHICLES.find(
      (v) => v.carriages && v.carriages.length >= 6
    )!;
    const { container } = render(
      <VehicleCarriageSelector vehicle={trainVehicle} />
    );
    const pctSpans = Array.from(container.querySelectorAll("span")).filter(
      (el) => /^\d+%$/.test(el.textContent ?? "")
    );
    expect(pctSpans.length).toBeGreaterThan(0);
    for (const el of pctSpans) {
      expect(el.className).not.toContain("text-[9px]");
    }
  });

  it("gives the sheet close button an honest 44px target and affordance", () => {
    const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
    render(<VehicleDetailSheet vehicleId={mrtVehicle.id} onClose={() => {}} />);
    const closeBtn = screen.getByRole("button", {
      name: idDictionary.common.close,
    });
    expect(closeBtn.className).toMatch(/w-11/);
    expect(closeBtn.className).toMatch(/h-11/);
  });
});
