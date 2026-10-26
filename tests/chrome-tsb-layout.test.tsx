/**
 * RED: mobile systems row — open on first visit with a truthful toggle
 * label, preference persisted across mounts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

const ROW_TESTID = "tsb-systems-row";

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    activeAlerts: [],
    activeDrawer: null,
  });
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("mobile systems row", () => {
  it("names the toggle for what it does, not the route list", async () => {
    render(<TransportationSystemBar />);
    const toggles = await screen.findAllByRole("button", { name: /show this sector's items|hide this sector's items/i });
    const mobileToggle = toggles.find((b) => b.className.includes("sm:hidden"));
    expect(mobileToggle).toBeDefined();
    expect(mobileToggle?.getAttribute("aria-label")).not.toMatch(/route list/i);
  });

  it("opens the row on first visit", async () => {
    render(<TransportationSystemBar />);
    const toggles = await screen.findAllByRole("button", { name: /show this sector's items|hide this sector's items/i });
    const mobileToggle = toggles.find((b) => b.className.includes("sm:hidden"));
    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");
    const row = screen.getByTestId(ROW_TESTID);
    expect(row.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(row.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("persists the toggle preference across mounts", async () => {
    const first = render(<TransportationSystemBar />);
    let toggles = await screen.findAllByRole("button", { name: /show this sector's items|hide this sector's items/i });
    const mobileToggle = toggles.find((b) => b.className.includes("sm:hidden"));
    if (!mobileToggle) throw new Error("mobile toggle missing");
    fireEvent.click(mobileToggle);
    expect(window.localStorage.getItem("platformi.tsb.systemsOpen")).toBe("0");
    first.unmount();
    render(<TransportationSystemBar />);
    toggles = await screen.findAllByRole("button", { name: /show this sector's items|hide this sector's items/i });
    const reopened = toggles.find((b) => b.className.includes("sm:hidden"));
    expect(reopened).toHaveAttribute("aria-expanded", "false");
    const row = screen.getByTestId(ROW_TESTID);
    expect(row.className).toMatch(/(^|\s)hidden(\s|$)/);
  });
});
