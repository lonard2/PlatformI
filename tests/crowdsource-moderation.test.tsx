/**
 * RED: crowdsource moderation — abusive check-ins can be removed via a new
 * DELETE endpoint, surfaced in an OCC community-reports section on the
 * fleet board, instead of an append-only feed with no controls.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";
import { POST as postCheckin, DELETE as deleteCheckin } from "@/app/api/crowdsource/checkin/route";
import { GET as getFeed } from "@/app/api/crowdsource/feed/route";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

const VEHICLE: Vehicle = TRANSIT_VEHICLES[0];

function req(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER"))}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("crowdsource moderation API", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await deleteCheckin(req(`http://localhost:3000/api/crowdsource/checkin?id=${id}`, "DELETE"));
    }
  });

  it("posts, lists, and deletes a check-in", async () => {
    const post = await postCheckin(
      req("http://localhost:3000/api/crowdsource/checkin", "POST", {
        vehicleId: VEHICLE.id,
        userId: "USR-MOD-1",
        crowdLevel: "LEVEL_4_FULL_CRUSH",
        acComfort: "POOR",
        note: "spam report for moderation test",
      })
    );
    expect(post.status).toBe(200);
    const created = (await post.json()).checkIn as Record<string, unknown>;
    createdIds.push(created.id as string);

    const feed = await getFeed(req("http://localhost:3000/api/crowdsource/feed?limit=50", "GET"));
    const items = ((await feed.json()).feed || []) as Array<Record<string, unknown>>;
    expect(items.some((i) => i.id === created.id)).toBe(true);

    const del = await deleteCheckin(
      req(`http://localhost:3000/api/crowdsource/checkin?id=${created.id}`, "DELETE")
    );
    expect(del.status).toBe(200);
    createdIds.pop();

    const after = await getFeed(req("http://localhost:3000/api/crowdsource/feed?limit=50", "GET"));
    const afterItems = ((await after.json()).feed || []) as Array<Record<string, unknown>>;
    expect(afterItems.some((i) => i.id === created.id)).toBe(false);
  });

  it("returns 404 when deleting an unknown check-in", async () => {
    const del = await deleteCheckin(
      req("http://localhost:3000/api/crowdsource/checkin?id=checkin-ghost-1", "DELETE")
    );
    expect(del.status).toBe(404);
  });
});

describe("occ community reports section", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
    useTransitStore.setState({
      simulatedVehicles: [{ ...TRANSIT_VEHICLES[0] }],
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("/api/crowdsource/feed")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              feed: [
                {
                  id: "chk-occ-1",
                  userId: "USR-SPAM",
                  vehicleId: VEHICLE.id,
                  vehicleCode: VEHICLE.vehicleCode,
                  vehicleName: VEHICLE.name,
                  lineId: VEHICLE.lineId,
                  lineCode: "TJ-1",
                  lineName: "Corridor 1",
                  lineColorHex: "#3B82F6",
                  mode: VEHICLE.mode,
                  crowdLevel: "LEVEL_4_FULL_CRUSH",
                  acComfort: "POOR",
                  note: "spam report",
                  timestamp: new Date().toISOString(),
                  timestampMs: Date.now(),
                },
              ],
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists community reports with a remove action", async () => {
    const deletes: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/crowdsource/feed")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              feed: deletes.includes("chk-occ-1")
                ? []
                : [
                    {
                      id: "chk-occ-1",
                      userId: "USR-SPAM",
                      vehicleId: VEHICLE.id,
                      vehicleCode: VEHICLE.vehicleCode,
                      vehicleName: VEHICLE.name,
                      lineId: VEHICLE.lineId,
                      lineCode: "TJ-1",
                      lineName: "Corridor 1",
                      lineColorHex: "#3B82F6",
                      mode: VEHICLE.mode,
                      crowdLevel: "LEVEL_4_FULL_CRUSH",
                      acComfort: "POOR",
                      note: "spam report",
                      timestamp: new Date().toISOString(),
                      timestampMs: Date.now(),
                    },
                  ],
            }),
          } as Response);
        }
        if (String(url).includes("/api/crowdsource/checkin") && init?.method === "DELETE") {
          deletes.push("chk-occ-1");
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    render(<AdminFleetPage />);
    const section = await screen.findByTestId("occ-community-feed");
    expect(within(section).getByText(/spam report/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: /remove.*spam report/i }));
    await waitFor(() => {
      expect(within(section).queryByText(/spam report/)).not.toBeInTheDocument();
    });
  });
});
