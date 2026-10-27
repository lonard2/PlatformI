/**
 * RED: crowdsource polish nits — footer timestamp follows the app locale,
 * live dot honors reduced motion, per-vehicle cooldown copy and Kepadatan
 * term consistency are pinned across all six locales.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { CommunityLiveFeed } from "@/components/crowdsource/CommunityLiveFeed";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { ar } from "@/lib/i18n/dictionaries/ar";

describe("crowd polish nits", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useTransitStore.setState({
      allLines: [],
      allStops: [],
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: null,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ feed: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function footerText(): string {
    const updated = screen.getByText(/Updated:|Diperbarui:/);
    const footer = updated.closest("div") as HTMLElement;
    return footer.textContent ?? "";
  }

  it("formats the footer timestamp per locale", async () => {
    useLanguageStore.setState({ language: "en" });
    const { unmount } = render(<CommunityLiveFeed onOpenCheckIn={() => {}} />);
    await screen.findByText("Community Live Feed & Reports");
    expect(footerText()).toMatch(/\d{2}:\d{2}/);
    unmount();
    window.localStorage.clear();
    useLanguageStore.setState({ language: "id" });
    render(<CommunityLiveFeed onOpenCheckIn={() => {}} />);
    await screen.findByText("Laporan Kepadatan Komunitas");
    expect(footerText()).toMatch(/\d{2}\.\d{2}/);
  });

  it("live dot respects reduced motion", async () => {
    useLanguageStore.setState({ language: "en" });
    const { container } = render(<CommunityLiveFeed onOpenCheckIn={() => {}} />);
    await screen.findByText("Community Live Feed & Reports");
    const dot = container.querySelector(".animate-pulse") as HTMLElement;
    expect(dot.className).toMatch(/motion-reduce:animate-none/);
  });

  it("pins per-vehicle cooldown copy and Kepadatan consistency", () => {
    expect(en.crowdsource.antiSpamNotice).toMatch(/per vehicle/);
    expect(id.crowdsource.antiSpamNotice).toMatch(/per kendaraan/);
    expect(ja.crowdsource.antiSpamNotice).toMatch(/1車両/);
    expect(zh.crowdsource.antiSpamNotice).toMatch(/每辆车/);
    expect(ko.crowdsource.antiSpamNotice).toMatch(/차량당/);
    expect(ar.crowdsource.antiSpamNotice).toMatch(/لكل مركبة/);
    for (const d of [en, id, ja, zh, ko, ar]) {
      const blob = JSON.stringify(d.crowdsource);
      expect(blob).not.toMatch(/Keterandalan/);
    }
  });
});
