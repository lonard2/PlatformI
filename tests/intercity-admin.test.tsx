/**
 * RED: OCC intercity page — operators with boarding points are listed and
 * fully authorable (add/edit/delete) instead of seed-frozen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminIntercityPage from "@/app/admin/intercity/page";
import { useLanguageStore } from "@/lib/i18n";

const OPERATORS = [
  { id: "op-test-1", name: "Test Shuttle Co", mode: "EXECUTIVE_SHUTTLE", serviceTier: "Executive" },
];
const POINTS = [
  { id: "bp-test-1", operatorId: "op-test-1", label: "Pool Test Barat", kind: "POOL" },
];

function stubApi(calls: { method: string; url: string; body?: unknown }[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (String(url).includes("/api/intercity/operators")) {
        if (method === "POST") {
          const body = calls[calls.length - 1].body as Record<string, unknown>;
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ success: true, data: { id: "op-new-1", ...body } }),
          } as Response);
        }
        if (method === "DELETE") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, deletedBoardingPoints: 0, detachedRuns: 0 }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ operators: OPERATORS }),
        } as Response);
      }
      if (String(url).includes("/api/intercity/boarding-points")) {
        if (method === "DELETE") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: POINTS }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

describe("occ intercity page", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists operators with their boarding points", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    stubApi(calls);
    render(<AdminIntercityPage />);
    await screen.findByText("Test Shuttle Co");
    expect(screen.getByText("Pool Test Barat")).toBeInTheDocument();
  });

  it("creates an operator through the modal", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    stubApi(calls);
    render(<AdminIntercityPage />);
    await screen.findByText("Test Shuttle Co");
    fireEvent.click(screen.getByRole("button", { name: /add operator/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/operator name/i), {
      target: { value: "New AKAP Co" },
    });
    fireEvent.change(within(dialog).getByLabelText(/service tier/i), {
      target: { value: "Eksekutif" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(
        calls.some(
          (c) =>
            c.method === "POST" &&
            c.url.includes("/api/intercity/operators") &&
            (c.body as Record<string, unknown>)?.name === "New AKAP Co"
        )
      ).toBe(true);
    });
    await screen.findByText("New AKAP Co");
  });

  it("deletes a boarding point after confirm", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    stubApi(calls);
    render(<AdminIntercityPage />);
    await screen.findByText("Pool Test Barat");
    fireEvent.click(screen.getByRole("button", { name: /delete.*pool test barat/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(
        calls.some((c) => c.method === "DELETE" && c.url.includes("bp-test-1"))
      ).toBe(true);
    });
  });
});
