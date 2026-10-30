/**
 * RED: timetable write guards — PUT on an unknown id returns 404 instead of
 * fabricating a placeholder run; bulk DELETE reports an honest deletedCount;
 * the batch modal aborts when the pre-delete fails instead of stacking
 * duplicates on top.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
import { PUT, DELETE, POST, GET } from "@/app/api/network/timetables/route";
import { BatchScheduleModal } from "@/components/admin/BatchScheduleModal";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

function putReq(body: unknown): NextRequest {
  return authed("http://localhost:3000/api/network/timetables", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("timetable write guards", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUT on an unknown id returns 404 and fabricates nothing", async () => {
    const ghostId = `run-ghost-${Date.now()}`;
    const res = await PUT(
      putReq({ id: ghostId, departureTime: "08:00", arrivalTime: "09:00" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    const list = await GET(
      authed("http://localhost:3000/api/network/timetables")
    );
    const listBody = await list.json();
    const runs = (listBody.data || listBody) as Array<{ id: string }>;
    expect(runs.some((r) => r.id === ghostId)).toBe(false);
  });

  it("bulk DELETE reports the deleted count", async () => {
    const lineId = `line-guard-${Date.now()}`;
    const mk = (n: number) => ({
      id: `run-guard-${Date.now()}-${n}`,
      lineId,
      tripCode: `G-${n}`,
      origin: "A",
      destination: "B",
      departureTime: "08:00",
      arrivalTime: "09:00",
      operatorName: "Op",
    });
    for (const n of [1, 2]) {
      const res = await POST(
        authed("http://localhost:3000/api/network/timetables", {
          method: "POST",
          body: JSON.stringify(mk(n)),
        })
      );
      expect(res.status).toBe(201);
    }
    const del = await DELETE(
      authed(`http://localhost:3000/api/network/timetables?lineId=${lineId}`, {
        method: "DELETE",
      })
    );
    const delBody = await del.json();
    expect(delBody.success).toBe(true);
    expect(delBody.deletedCount).toBe(2);
    const after = await GET(
      authed(`http://localhost:3000/api/network/timetables?lineId=${lineId}`)
    );
    const afterBody = await after.json();
    expect((afterBody.data || afterBody) as unknown[]).toHaveLength(0);
  });

  it("batch modal aborts when the pre-delete fails", async () => {
    let postCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/timetables") && init?.method === "DELETE") {
          return Promise.resolve({
            ok: false,
            json: async () => ({ success: false, error: "db down" }),
          } as Response);
        }
        if (String(url).includes("/api/network/timetables") && init?.method === "POST") {
          postCalls += 1;
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    const line = TRANSIT_LINES.find(
      (l) => TRANSIT_STOPS.filter((s) => s.lineId === l.id).length >= 2
    );
    if (!line) throw new Error("no line with 2+ stops in dataset");
    const existingRuns = [1, 2, 3].map((n) => ({
      id: `run-existing-${n}`,
      lineId: line.id,
      tripCode: `E-${n}`,
      origin: "A",
      destination: "B",
      departureTime: "08:00",
      arrivalTime: "09:00",
      operatorName: "Op",
    }));
    render(
      <BatchScheduleModal
        isOpen
        onClose={() => {}}
        lines={TRANSIT_LINES}
        allStops={TRANSIT_STOPS}
        initialLineId={line.id}
        existingRuns={existingRuns as never}
        onRunsGenerated={() => {}}
      />
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: /memahami|understand|confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /overwrite/i }));
    await waitFor(() => expect(postCalls).toBe(0));
    expect(
      screen.getByText(/failed to clear|pre-delete|batch aborted|gagal menghapus/i)
    ).toBeInTheDocument();
  });
});
