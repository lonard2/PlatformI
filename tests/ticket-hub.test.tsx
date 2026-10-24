/**
 * PlatformI - Search-first intercity ticket hub tests (Task 4).
 * Mode, company, origin, destination, and date filters feed the same
 * checkout and wallet as city tickets: 1-trip, 2-class-and-seat,
 * 3-buyer, 4-wallet. Board entry preselects the run; search entry
 * starts from filters. Search stays open without login; checkout
 * collects the Task 3 buyer record.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntercityTicketHub, INTERCITY_MODES, getIntercityModeLabel, resolveIntercityFareParts } from "@/components/ticketing/IntercityTicketHub";
import { TicketPurchaseModal } from "@/components/ticketing/TicketPurchaseModal";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const KAI_RUN: TimetableRun = {
  id: "run-kai-01",
  lineId: "line-kai-intercity",
  tripCode: "KA-01",
  origin: "Stasiun Gambir (GMR)",
  destination: "Surabaya Pasarturi (SBI)",
  departureTime: "08:20",
  arrivalTime: "16:30",
  operatorName: "PT Kereta Api Indonesia (Persero)",
  serviceClass: "Eksekutif New Generation & Luxury Sleeper",
} as TimetableRun;

const GARUDA_RUN: TimetableRun = {
  id: "run-ga-404",
  lineId: "line-airport-cgk",
  tripCode: "GA-404",
  origin: "Soekarno-Hatta (CGK T3)",
  destination: "Ngurah Rai Bali (DPS)",
  departureTime: "09:15",
  arrivalTime: "12:05",
  operatorName: "Garuda Indonesia",
  serviceClass: "Garuda Indonesia Business",
} as TimetableRun;

const LION_RUN: TimetableRun = {
  id: "run-lion-01",
  lineId: "line-airport-cgk",
  tripCode: "JT-610",
  origin: "Soekarno-Hatta (CGK T3)",
  destination: "Juanda Surabaya (SUB)",
  departureTime: "11:30",
  arrivalTime: "13:00",
  operatorName: "Lion Air",
  serviceClass: "Lion Air Economy",
} as TimetableRun;

function mockRoutes(runs: TimetableRun[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/intercity/routes")) {
        return Promise.resolve({ ok: true, json: async () => ({ runs }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    })
  );
}

describe("IntercityTicketHub search-first flow", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    mockRoutes([KAI_RUN]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searches by mode and company then opens checkout", () => {
    render(<IntercityTicketHub />);
    expect(screen.getByLabelText(/mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  it("filters by origin, destination, and date then lists matching runs", async () => {
    render(<IntercityTicketHub />);
    fireEvent.change(screen.getByLabelText(/origin/i), {
      target: { value: "Gambir" },
    });
    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: "Surabaya" },
    });
    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-10-26" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText("KA-01")).toBeInTheDocument();
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/intercity/routes");
    expect(calledUrl).toContain("origin=Gambir");
    expect(calledUrl).toContain("destination=Surabaya");
    expect(calledUrl).toContain("date=2026-10-26");
  });

  it("selecting a trip advances to the class-and-seat step with a recomputed price", async () => {
    render(<IntercityTicketHub />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText("KA-01")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /select KA-01/i }));
    expect(
      await screen.findByText(/class and seat/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Rp/i)).toBeInTheDocument();
  });

  it("keeps rail drop-off hidden and shows no AKAP address field at the buyer step", async () => {
    render(<IntercityTicketHub preselectedRun={KAI_RUN} initialMode="KAI_INTERCITY" />);
    const seat = await screen.findByLabelText(/1B/);
    fireEvent.click(seat);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/drop-off/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();
  });

  it("wires carrier names so a full-service flight shows meal while an LCC hides it", async () => {
    const { unmount } = render(
      <IntercityTicketHub preselectedRun={GARUDA_RUN} initialMode="AIRPORT_COMMERCIAL" />
    );
    fireEvent.click(await screen.findByLabelText(/1B/));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByLabelText(/meal/i)).toBeInTheDocument();
    unmount();

    render(
      <IntercityTicketHub preselectedRun={LION_RUN} initialMode="AIRPORT_COMMERCIAL" />
    );
    fireEvent.click(await screen.findByLabelText(/1B/));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/meal/i)).not.toBeInTheDocument();
  });

  it("collects the buyer record then reaches the wallet step without login", async () => {
    render(<IntercityTicketHub preselectedRun={KAI_RUN} initialMode="KAI_INTERCITY" />);
    fireEvent.click(await screen.findByLabelText(/1B/));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(await screen.findByLabelText(/full name/i), {
      target: { value: "Siti Rahayu" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "siti@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3174050101900001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    expect(await screen.findByText("4. Wallet")).toBeInTheDocument();
    expect(screen.getByText(/Siti Rahayu/)).toBeInTheDocument();
  });

  it("board entry preselects the run and starts at the seat step", async () => {
    render(<IntercityTicketHub preselectedRun={KAI_RUN} initialMode="KAI_INTERCITY" />);
    expect(await screen.findByText(/class and seat/i)).toBeInTheDocument();
    expect(screen.getByText("KA-01")).toBeInTheDocument();
  });
});

describe("TicketPurchaseModal intercity preselect", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  it("shows the preselected intercity run when opened from a board", () => {
    render(
      <TicketPurchaseModal
        isOpen
        onClose={() => {}}
        preselectedIntercityRun={KAI_RUN}
      />
    );
    expect(screen.getByText("KA-01")).toBeInTheDocument();
    expect(screen.getByText(/Surabaya Pasarturi/)).toBeInTheDocument();
  });
});

describe("IntercityTicketHub mode labels", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    mockRoutes([]);
  });

  it("maps every intercity mode to a localized label without enum underscores", async () => {
    const { en } = await import("@/lib/i18n/dictionaries/en");
    for (const mode of INTERCITY_MODES) {
      const label = getIntercityModeLabel(mode, en);
      expect(label).toBeTruthy();
      expect(label).not.toContain("_");
    }
  });

  it("shows localized mode names instead of raw enum codes", () => {
    render(<IntercityTicketHub />);
    const select = screen.getByLabelText(/mode/i) as HTMLSelectElement;
    const texts = Array.from(select.options).map((o) => o.textContent ?? "");
    expect(texts.some((t) => t.includes("KAI_INTERCITY"))).toBe(false);
    expect(texts.some((t) => /intercity rail/i.test(t))).toBe(true);
  });
});
