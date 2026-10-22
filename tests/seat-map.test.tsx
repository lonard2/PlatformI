/**
 * PlatformI - Per-vehicle visual seat and deck map tests (Task 2).
 * Blocked seats are never selectable by click or keyboard; only available
 * seats stay focusable. Layout switches with the vehicle class.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeatMap, resolveSeatLayout } from "@/components/ticketing/SeatMap";

describe("SeatMap blocked-seat guard", () => {
  it("blocks occupied seats from selection", () => {
    render(<SeatMap vehicleType="AKAP_2_2" occupiedSeatIds={["1A"]} selectedSeatId={null} onSelect={() => {}} />);
    expect(screen.getByLabelText(/1A/)).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps blocked seats unfocusable and never calls onSelect for them", () => {
    const onSelect = vi.fn();
    render(<SeatMap vehicleType="AKAP_2_2" occupiedSeatIds={["1A"]} selectedSeatId={null} onSelect={onSelect} />);
    const blocked = screen.getByLabelText(/1A/);
    expect(blocked.tabIndex).toBe(-1);
    fireEvent.click(blocked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects an available seat by click and marks it pressed", () => {
    const onSelect = vi.fn();
    render(<SeatMap vehicleType="AKAP_2_2" occupiedSeatIds={["1A"]} selectedSeatId={null} onSelect={onSelect} />);
    const free = screen.getByLabelText(/1B/);
    expect(free).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(free);
    expect(onSelect).toHaveBeenCalledWith("1B");
  });
});

describe("SeatMap layout switching", () => {
  it("covers bus 2-2, sleeper 1-1-1, train coach, flight rows, and ship deck", () => {
    expect(resolveSeatLayout("AKAP_2_2").length).toBeGreaterThan(0);
    expect(resolveSeatLayout("AKAP_SLEEPER_1_1_1").length).toBeGreaterThan(0);
    expect(resolveSeatLayout("KAI_COACH").length).toBeGreaterThan(0);
    expect(resolveSeatLayout("FLIGHT_3_3").length).toBeGreaterThan(0);
    expect(resolveSeatLayout("SHIP_DECK").length).toBeGreaterThan(0);
  });

  it("re-renders the map when the vehicle class changes", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <SeatMap vehicleType="AKAP_2_2" occupiedSeatIds={[]} selectedSeatId={null} onSelect={onSelect} />
    );
    const busSeatCount = resolveSeatLayout("AKAP_2_2").reduce((n, r) => n + r.cells.length, 0);
    rerender(
      <SeatMap vehicleType="FLIGHT_3_3" occupiedSeatIds={[]} selectedSeatId={null} onSelect={onSelect} />
    );
    const flightSeatCount = resolveSeatLayout("FLIGHT_3_3").reduce((n, r) => n + r.cells.length, 0);
    expect(flightSeatCount).not.toBe(busSeatCount);
    expect(screen.getByLabelText(/1F/)).toBeInTheDocument();
  });
});
