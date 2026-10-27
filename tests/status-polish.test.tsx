/**
 * RED: status-surface polish — chips/tabs never squeeze, mobile chart values
 * don't overlap (tap-to-reveal with hint), mode + history cards stack on
 * mobile, 7-day dots are AT-visible, history jump says Latest (not Today),
 * header chip names its metric, locale titles name the plotted metric,
 * selection keeps severity fill, 98% tag clears the edge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { ar } from "@/lib/i18n/dictionaries/ar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

describe("status polish", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: Date.now(),
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
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
  });

  async function openUptime(): Promise<HTMLElement> {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const uptimeTab = within(dialog).getByRole("tab", { name: /reliability/i });
    fireEvent.click(uptimeTab);
    return dialog;
  }

  it("mode + severity chips never squeeze (no wrap in scroll rows)", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const modeChip = within(dialog).getByRole("button", { name: "All Sectors" });
    expect(modeChip.className).toMatch(/shrink-0/);
    expect(modeChip.className).toMatch(/whitespace-nowrap/);
    const sevChip = within(dialog).getByRole("button", { name: /Warning/ });
    expect(sevChip.className).toMatch(/shrink-0/);
  });

  it("tabs never squeeze and compress on mobile", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const tab = within(dialog).getByRole("tab", { name: /reliability/i });
    expect(tab.className).toMatch(/shrink-0/);
    expect(tab.className).toMatch(/px-2\.5/);
  });

  it("chart values hide on small screens with a tap hint", async () => {
    const dialog = await openUptime();
    const chart = within(dialog).getByTestId("uptime-trend-chart");
    const values = within(chart).getAllByText(/^\d{2}\.\d%$/);
    expect(values.length).toBeGreaterThanOrEqual(10);
    for (const v of values) {
      expect((v as HTMLElement).className).toMatch(/hidden/);
    }
    expect(
      within(chart).getByText("Tap a bar to see its value")
    ).toBeInTheDocument();
  });

  it("per-mode card header stacks on mobile", async () => {
    const dialog = await openUptime();
    const nameEl = await within(dialog).findByText("MRT Jakarta (Ratangga)");
    const row = nameEl.parentElement?.parentElement as HTMLElement;
    expect(row.className).toMatch(/flex-col/);
    expect(row.className).toMatch(/sm:flex-row/);
  });

  it("7-day dots expose role=img with day labels", async () => {
    const dialog = await openUptime();
    const dots = await within(dialog).findAllByRole("img", { name: /D-/ });
    expect(dots.length).toBeGreaterThanOrEqual(7);
  });

  it("history jump targets latest data, not Today", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const historyTab = within(dialog).getByRole("tab", { name: /incident logs/i });
    fireEvent.click(historyTab);
    expect(
      within(dialog).queryByRole("button", { name: /Today|Hari Ini/ })
    ).toBeNull();
    const latestBtn = within(dialog).getByRole("button", { name: /Latest/ });
    fireEvent.click(latestBtn);
    expect(latestBtn).toBeInTheDocument();
  });

  it("history incident meta stacks on mobile", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const historyTab = within(dialog).getByRole("tab", { name: /incident logs/i });
    fireEvent.click(historyTab);
    const pills = await within(dialog).findAllByText(/Resolved/);
    const headerRow = (pills[0] as HTMLElement).closest("div[class*='justify-between']") as HTMLElement;
    expect(headerRow.className).toMatch(/flex-col/);
  });

  it("header chip names the lines-normal metric", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    await screen.findByRole("dialog");
    expect(screen.getByText(/% lines normal/i)).toBeInTheDocument();
  });

  it("selected bar keeps severity fill with a cyan ring", async () => {
    const dialog = await openUptime();
    const chart = within(dialog).getByTestId("uptime-trend-chart");
    const bars = within(chart).getAllByRole("button");
    expect(bars.length).toBe(12);
    fireEvent.click(bars[0]);
    const fill = (bars[0] as HTMLElement).querySelector(
      "div[class*='rounded-t']"
    ) as HTMLElement;
    expect(fill.className).not.toMatch(/bg-cyan-400/);
    expect(fill.className).toMatch(/ring-cyan-300/);
  });

  it("98% target tag clears the chart edge", async () => {
    const dialog = await openUptime();
    const chart = within(dialog).getByTestId("uptime-trend-chart");
    const tag = within(chart).getByText("98%");
    expect((tag as HTMLElement).className).toMatch(/right-1/);
  });

  it("locale titles name availability, history jump says latest", () => {
    expect(en.statusCenter.today).toBe("Latest");
    expect(id.statusCenter.today).toBe("Terbaru");
    expect(id.statusCenter.monthlyTrendTitle).toBe("Tren Keandalan 12 Bulan Terakhir");
    expect(ja.statusCenter.monthlyTrendTitle).toBe("過去12ヶ月間の信頼性推移");
    expect(zh.statusCenter.monthlyTrendTitle).toBe("近12个月可靠性趋势");
    expect(ko.statusCenter.monthlyTrendTitle).toBe("최근 12개월 신뢰도 추이");
    expect(ar.statusCenter.monthlyTrendTitle).toBe("مؤشر الموثوقية لآخر 12 شهراً");
    expect(id.statusCenter.modeReliabilityTable).toBe("Rincian Keandalan per Sektor Moda");
    expect(en.statusCenter.tapBarHint).toBe("Tap a bar to see its value");
  });
});
