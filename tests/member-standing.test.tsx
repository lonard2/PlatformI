/**
 * RED: members see their own crowd-report standing — own reports with
 * flag status and derived counts; other members' reports stay invisible;
 * anonymous callers are rejected. The account panel surfaces the same
 * standing with an honest removal note.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";
import { NextRequest } from "next/server";
import { GET as myReports } from "@/app/api/members/reports/route";
import {
  mintMemberSession,
  MEMBER_SESSION_COOKIE,
} from "@/lib/services/memberAuthService";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { db } from "@/lib/db";

const SECRET = "test-standing-secret";
const VEHICLE_ID = TRANSIT_VEHICLES[7].id;

function authed(memberId: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (memberId !== null) {
    const token = mintMemberSession(memberId, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
    headers.cookie = `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`;
  }
  return new NextRequest("http://localhost:3000/api/members/reports", { method: "GET", headers });
}

describe("member report standing", () => {
  const checkinIds: string[] = [];

  beforeEach(() => {
    process.env.MEMBER_AUTH_SECRET = SECRET;
  });

  afterEach(async () => {
    delete process.env.MEMBER_AUTH_SECRET;
    if (checkinIds.length > 0) {
      await db.crowdsourceFlag.deleteMany({ where: { checkInId: { in: checkinIds } } }).catch(() => {});
      await db.crowdsourceCheckIn.deleteMany({ where: { id: { in: checkinIds } } }).catch(() => {});
      checkinIds.length = 0;
    }
  });

  it("rejects anonymous standing lookups", async () => {
    expect((await myReports(authed(null))).status).toBe(401);
  });

  it("lists own reports with flag status and counts, hiding others", async () => {
    const mine = await db.crowdsourceCheckIn.create({
      data: {
        vehicleId: VEHICLE_ID,
        userId: "USR-STANDING-1",
        crowdLevel: "LEVEL_2_FEW_SEATS",
        acComfort: "COMFORTABLE",
        memberId: "MBR-STANDING-1",
        flagCount: 2,
      },
    });
    const other = await db.crowdsourceCheckIn.create({
      data: {
        vehicleId: VEHICLE_ID,
        userId: "USR-STANDING-2",
        crowdLevel: "LEVEL_2_FEW_SEATS",
        acComfort: "COMFORTABLE",
        memberId: "MBR-STANDING-2",
      },
    });
    checkinIds.push(mine.id, other.id);
    const res = await myReports(authed("MBR-STANDING-1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      reports: Array<{ id: string; flagged: boolean; flagCount: number }>;
      submitted: number;
      flagged: number;
    };
    expect(json.success).toBe(true);
    expect(json.reports.map((r) => r.id)).toEqual([mine.id]);
    expect(json.reports[0].flagged).toBe(true);
    expect(json.reports[0].flagCount).toBe(2);
    expect(json.submitted).toBe(1);
    expect(json.flagged).toBe(1);
    const stranger = await myReports(authed("MBR-STANDING-2"));
    const sj = (await stranger.json()) as { reports: Array<{ id: string }> };
    expect(sj.reports.map((r) => r.id)).toEqual([other.id]);
  });
});

describe("account panel report standing", () => {
  const profile = {
    id: "MBR-STANDING-1",
    displayName: "Uji",
    phone: "+628100000001",
    email: null,
    role: "MEMBER",
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  };

  function stubSignedIn(reports: unknown): void {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("/api/members/me")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: profile }) });
        }
        if (String(url).includes("/api/members/reports")) {
          return Promise.resolve({ ok: true, json: async () => reports });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      })
    );
  }

  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows flagged standing with counts and the removal note", async () => {
    stubSignedIn({
      success: true,
      reports: [
        {
          id: "CHK-STAND-1",
          vehicleId: "v1",
          crowdLevel: "LEVEL_2_FEW_SEATS",
          timestamp: new Date().toISOString(),
          flagCount: 2,
          flagged: true,
        },
      ],
      submitted: 1,
      flagged: 1,
    });
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(await screen.findByText(/crowd report standing/i)).toBeInTheDocument();
    expect(screen.getByText(/1 flagged by other members/i)).toBeInTheDocument();
    expect(screen.getByText(/removed reports are gone for good/i)).toBeInTheDocument();
  });

  it("shows the empty standing state with no reports", async () => {
    stubSignedIn({ success: true, reports: [], submitted: 0, flagged: 0 });
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(await screen.findByText(/no crowd reports yet/i)).toBeInTheDocument();
  });
});
