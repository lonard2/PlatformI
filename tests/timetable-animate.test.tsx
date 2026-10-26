/**
 * RED: timetable animate — post-generate summary with review-on-stringline
 * and new-run highlighting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

function stubBatchEcho(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("/api/network/timetables") && !init) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      }
      let data: unknown = [];
      try {
        const body = JSON.parse(String(init?.body ?? "{}")) as { batch?: unknown };
        data = body.batch ?? [];
      } catch {
        data = [];
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data }),
      } as Response);
    })
  );
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
  });
  stubBatchEcho();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function generateFromList(): Promise<void> {
  render(<AdminTimetableStudioPage />);
  fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
  fireEvent.click(await screen.findByRole("button", { name: /^batch generator$/i }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(await within(dialog).findByRole("button", { name: /publish \d+ runs/i }));
}

describe("timetable animate", () => {
  it("announces the batch with a review action", async () => {
    await generateFromList();
    const banner = await screen.findByText(/batch complete/i);
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/37 trips/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review on stringline/i })).toBeInTheDocument();
  });

  it("review switches to the batch corridor on the stringline", async () => {
    await generateFromList();
    await screen.findByText(/batch complete/i);
    fireEvent.click(screen.getByRole("button", { name: /review on stringline/i }));
    await waitForGone(/^batch generator$/i);
    expect(screen.queryByText("Scheduled Timetable Registry")).not.toBeInTheDocument();
    // New runs render with the highlight glow on the stringline.
    expect(document.querySelector('path[filter="url(#stringline-glow)"]')).not.toBeNull();

    async function waitForGone(re: RegExp): Promise<void> {
      for (let i = 0; i < 40; i++) {
        if (!screen.queryByRole("button", { name: re })) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error("view did not switch");
    }
  });

  it("dismisses the summary without switching views", async () => {
    const { container } = await (async () => {
      await generateFromList();
      await screen.findByText(/batch complete/i);
      return { container: document.body };
    })();
    const banner = screen.getByText(/batch complete/i).closest("div");
    if (!banner) throw new Error("banner missing");
    const dismiss = within(banner.parentElement as HTMLElement).getByRole("button", {
      name: "Dismiss batch summary",
    });
    fireEvent.click(dismiss);
    expect(screen.queryByText(/batch complete/i)).not.toBeInTheDocument();
    expect(container.textContent ?? "").toMatch(/Scheduled Timetable Registry/);
  });
});
