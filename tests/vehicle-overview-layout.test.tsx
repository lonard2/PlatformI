/**
 * PlatformI - Overview layout tests (T4).
 * Gallery leads the Overview tab; line/fare/headway collapse to one compact
 * row with zero content removed.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TRANSIT_VEHICLES, TRANSIT_LINES } from "@/lib/data/jakarta-dataset";
import { VehicleDetailSheet } from "@/components/inspector/VehicleDetailSheet";
import { id as idDictionary } from "@/lib/i18n/dictionaries/id";

describe("Overview layout", () => {
  it("leads with the photo gallery before the telemetry gauges", () => {
    const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
    render(<VehicleDetailSheet vehicleId={mrtVehicle.id} onClose={() => {}} />);

    const galleryTitle = screen.getByText(
      idDictionary.vehicleInspector.photoGalleryTitle
    );
    const speedLabel = screen.getByText(idDictionary.vehicleInspector.speed);
    expect(
      Boolean(
        galleryTitle.compareDocumentPosition(speedLabel) &
          Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
  });

  it("keeps line, fare, and headway in one compact row with nothing removed", () => {
    const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
    const line = TRANSIT_LINES.find((l) => l.id === mrtVehicle.lineId);
    render(<VehicleDetailSheet vehicleId={mrtVehicle.id} onClose={() => {}} />);

    expect(screen.getByText(line!.name)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(idDictionary.vehicleInspector.fareLabel, "i"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(idDictionary.vehicleInspector.headwayLabel, "i")
      )
    ).toBeInTheDocument();

    // Compact: fare text lives inside the same row element as the line name.
    const nameRow = screen.getByText(line!.name).closest("div")!;
    expect(nameRow.textContent).toMatch(
      new RegExp(idDictionary.vehicleInspector.fareLabel, "i")
    );
    expect(nameRow.textContent).toMatch(
      new RegExp(idDictionary.vehicleInspector.headwayLabel, "i")
    );
  });
});
