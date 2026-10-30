/**
 * RED: wilayah authoring — Line and Stop carry an optional wilayah code that
 * round-trips through the API, defaults from coordinates via a shared
 * heuristic, and is editable from the network studio modal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";

const OPS_COOKIE = `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER"))}`;

function authed(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: { ...init?.headers, cookie: OPS_COOKIE },
  });
}
import { POST as postStop, PUT as putStop, GET as getStops, DELETE as deleteStop } from "@/app/api/network/stops/route";
import { POST as postLine, GET as getLines, DELETE as deleteLine } from "@/app/api/network/lines/route";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import { wilayahForCoordinate } from "@/lib/geodesy/wilayah";

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

function req(url: string, method: string, body?: unknown): NextRequest {
  return authed(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("wilayah field", () => {
  const createdStopIds: string[] = [];
  const createdLineIds: string[] = [];

  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const id of createdStopIds.splice(0)) {
      await deleteStop(req(`http://localhost:3000/api/network/stops?id=${id}`, "DELETE"));
    }
    for (const id of createdLineIds.splice(0)) {
      await deleteLine(req(`http://localhost:3000/api/network/lines?id=${id}`, "DELETE"));
    }
  });

  it("derives wilayah from coordinates with the shared heuristic", () => {
    expect(wilayahForCoordinate(-6.175, 106.827)).toBe("PUSAT"); // Monas
    expect(wilayahForCoordinate(-6.11, 106.88)).toBe("UTARA"); // Tanjung Priok
    expect(wilayahForCoordinate(-6.36, 106.83)).toBe("SELATAN"); // Lebak Bulus
    expect(wilayahForCoordinate(-6.22, 106.95)).toBe("TIMUR"); // Cakung
    expect(wilayahForCoordinate(-6.16, 106.74)).toBe("BARAT"); // Grogol
    expect(wilayahForCoordinate(-5.75, 106.58)).toBe("KEPULAUAN_SERIBU"); // Tidung
  });

  it("stop wilayah round-trips through the API", async () => {
    const line = TRANSIT_LINES[0];
    const post = await postStop(
      req("http://localhost:3000/api/network/stops", "POST", {
        lineId: line.id,
        name: "Wilayah Test Halte",
        code: "WLY",
        latitude: -6.22,
        longitude: 106.95,
        wilayah: "TIMUR",
      })
    );
    expect(post.status).toBe(201);
    const created = (await post.json()).data as Record<string, unknown>;
    createdStopIds.push(created.id as string);
    expect(created.wilayah).toBe("TIMUR");

    const put = await putStop(
      req("http://localhost:3000/api/network/stops", "PUT", {
        id: created.id,
        wilayah: "SELATAN",
      })
    );
    expect(put.status).toBe(200);
    const updated = (await put.json()).data as Record<string, unknown>;
    expect(updated.wilayah).toBe("SELATAN");
  });

  it("line wilayah round-trips through the API", async () => {
    const post = await postLine(
      req("http://localhost:3000/api/network/lines", "POST", {
        code: "WLY-99",
        name: "Wilayah Test Line",
        category: "BUS",
        mode: "TRANSJAKARTA_BRT",
        colorHex: "#123456",
        wilayah: "BARAT",
      })
    );
    expect(post.status).toBe(201);
    const created = (await post.json()).data as Record<string, unknown>;
    createdLineIds.push(created.id as string);
    expect(created.wilayah).toBe("BARAT");

    const get = await getLines(req("http://localhost:3000/api/network/lines", "GET"));
    const list = ((await get.json()).data || []) as Array<Record<string, unknown>>;
    expect(list.find((l) => l.id === created.id)?.wilayah).toBe("BARAT");
  });

  it("stop modal offers wilayah and includes it in the save payload", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/stops") && init?.method === "POST") {
          posts.push(JSON.parse(String(init.body)));
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: posts[posts.length - 1] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    render(<AdminNetworkStudioPage />);
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(await screen.findByText(line.name));
    fireEvent.click(await screen.findByRole("button", { name: /add stop/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText(/bundaran hi/i), {
      target: { value: "Wilayah Modal Halte" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/e\.g\. bhi/i), {
      target: { value: "WLM" },
    });
    fireEvent.change(within(dialog).getByLabelText(/wilayah|region/i), {
      target: { value: "TIMUR" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save stop/i }));
    await waitFor(() => expect(posts.length).toBe(1));
    expect((posts[0] as Record<string, unknown>).wilayah).toBe("TIMUR");
  });
});
