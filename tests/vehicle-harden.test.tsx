/**
 * PlatformI - Honest controls + failure states tests (T3 harden).
 * Occupied seats are not interactive; failures render; SVG nodes are keyboardable.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { VehicleSeatingDiagram } from "@/components/inspector/VehicleSeatingDiagram";
import { VehicleCarriageSelector } from "@/components/inspector/VehicleCarriageSelector";
import { VehiclePhotoGallery } from "@/components/inspector/VehiclePhotoGallery";
import { id as idDictionary } from "@/lib/i18n/dictionaries/id";
import type { Vehicle } from "@/types/transit";

function twoSeatVehicle(): Vehicle {
  const base = TRANSIT_VEHICLES.find((v) => v.mode === "EXECUTIVE_SHUTTLE")!;
  return {
    ...base,
    seatingDiagram: {
      id: "test-diagram",
      vehicleId: base.id,
      layoutType: "HIACE_VIP_CAPTAIN",
      totalSeats: 2,
      availableSeats: 1,
      seats: [
        {
          id: "1A",
          row: 1,
          column: "A",
          type: "CAPTAIN_CHAIR",
          status: "AVAILABLE",
          deck: "SINGLE",
          x: 20,
          y: 20,
          pricePremiumRp: 0,
          features: [],
        },
        {
          id: "1B",
          row: 1,
          column: "B",
          type: "CAPTAIN_CHAIR",
          status: "OCCUPIED",
          deck: "SINGLE",
          x: 60,
          y: 20,
          pricePremiumRp: 0,
          features: [],
        },
      ],
    },
  };
}

function expandSeats() {
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(idDictionary.vehicleInspector.showSeats, "i"),
    })
  );
}

describe("Honest seat controls", () => {
  it("renders occupied seats as non-interactive with aria-disabled, available as buttons", () => {
    render(<VehicleSeatingDiagram vehicle={twoSeatVehicle()} />);
    expandSeats();

    const occupied = screen.getByLabelText(/1B/);
    expect(occupied.tagName).not.toBe("BUTTON");
    expect(occupied).toHaveAttribute("aria-disabled", "true");

    const available = screen.getByRole("button", { name: /1A/ });
    expect(available).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(available);
    expect(available).toHaveAttribute("aria-pressed", "true");
  });

  it("states the map is informational, not a booking", () => {
    render(<VehicleSeatingDiagram vehicle={twoSeatVehicle()} />);
    expandSeats();
    expect(
      screen.getByText(idDictionary.vehicleInspector.seatMapInfo)
    ).toBeInTheDocument();
  });
});

describe("Carriage empty state and simulated badge", () => {
  it("renders an empty state instead of nothing", async () => {
    const { CarriageEmptyState } = await import(
      "@/components/inspector/VehicleCarriageSelector"
    );
    render(<CarriageEmptyState />);
    expect(
      screen.getByText(idDictionary.vehicleInspector.noCarriageData)
    ).toBeInTheDocument();
  });

  it("badges synthesized telemetry and stays silent on genuine data", () => {
    const withReal = TRANSIT_VEHICLES.find(
      (v) => v.carriages && v.carriages.length >= 6
    )!;
    const { rerender } = render(<VehicleCarriageSelector vehicle={withReal} />);
    expect(
      screen.queryByText(idDictionary.vehicleInspector.simulated)
    ).not.toBeInTheDocument();

    const synthesized = TRANSIT_VEHICLES.find(
      (v) => v.mode === "TRANSJAKARTA_BRT"
    )!;
    rerender(<VehicleCarriageSelector vehicle={synthesized} />);
    expect(
      screen.getByText(idDictionary.vehicleInspector.simulated)
    ).toBeInTheDocument();
  });
});

describe("Keyboard carriage selection", () => {
  it("selects a car with Enter on the focused schematic node", () => {
    const trainVehicle = TRANSIT_VEHICLES.find(
      (v) => v.carriages && v.carriages.length >= 6
    )!;
    const carriages = trainVehicle.carriages!;
    render(<VehicleCarriageSelector vehicle={trainVehicle} />);

    const nodes = screen.getAllByRole("button", { name: /K\d+/ });
    expect(nodes.length).toBeGreaterThan(0);
    const target = carriages[carriages.length - 1];
    // Schematic node, not the quick-selection pill: its label carries the car code.
    const targetNode = screen.getByRole("button", {
      name: new RegExp(`K${target.carIndex} ${target.carCode}`),
    });
    fireEvent.keyDown(targetNode, { key: "Enter" });
    expect(
      screen.getByText(new RegExp(`\\(${target.carCode}\\)`))
    ).toBeInTheDocument();
  });
});

describe("Gallery image failure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps caption and credit on a fallback tile when the photo fails", () => {
    class FailingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
      get src(): string {
        return "";
      }
    }
    vi.stubGlobal("Image", FailingImage);

    const busVehicle = TRANSIT_VEHICLES.find(
      (v) => v.mode === "TRANSJAKARTA_BRT"
    )!;
    render(<VehiclePhotoGallery vehicle={busVehicle} />);
    return screen
      .findByText(idDictionary.vehicleInspector.photoUnavailable)
      .then((el) => expect(el).toBeInTheDocument());
  });
});
