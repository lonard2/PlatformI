/**
 * PlatformI - VehicleOpsRunCard tests (T5 distill).
 * One shared card renders the run/trainset/fleet cells for both the sheet
 * specs tab and the technical specs section with zero content removed.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";

describe("VehicleOpsRunCard", () => {
  it("renders rail run cells in both variants with identical values", async () => {
    const { VehicleOpsRunCard } = await import(
      "@/components/inspector/VehicleOpsRunCard"
    );
    const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
    const { rerender } = render(
      <VehicleOpsRunCard vehicle={mrtVehicle} variant="sheet" operatorLabel="PT MRT Jakarta" />
    );
    expect(screen.getByText(mrtVehicle.runNumber!)).toBeInTheDocument();
    expect(screen.getByText(mrtVehicle.trainsetNumber!)).toBeInTheDocument();
    expect(screen.getByText(mrtVehicle.depotHome!)).toBeInTheDocument();

    rerender(<VehicleOpsRunCard vehicle={mrtVehicle} variant="specs" />);
    expect(screen.getByText(mrtVehicle.runNumber!)).toBeInTheDocument();
    expect(screen.getByText(mrtVehicle.trainsetNumber!)).toBeInTheDocument();
    expect(screen.getByText(mrtVehicle.depotHome!)).toBeInTheDocument();
  });

  it("renders bus fleet cells with pool-base labeling", async () => {
    const { VehicleOpsRunCard } = await import(
      "@/components/inspector/VehicleOpsRunCard"
    );
    const busVehicle = TRANSIT_VEHICLES.find(
      (v) => v.mode === "TRANSJAKARTA_BRT"
    )!;
    render(
      <VehicleOpsRunCard vehicle={busVehicle} variant="sheet" operatorLabel="PT Transportasi Jakarta" />
    );
    expect(screen.getByText(busVehicle.fleetNumber!)).toBeInTheDocument();
    expect(screen.getByText(busVehicle.licensePlate!)).toBeInTheDocument();
  });
});
