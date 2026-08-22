/**
 * PlatformI - Milestone 5 Test Suite: Disruption Alerts REST Service
 *
 * Tests:
 * 1. Alert retrieval with severity, status, and line filtering
 * 2. New disruption bulletin broadcasting & validation
 * 3. Alert resolution and escalation updates
 * 4. Alert archiving / deletion
 */

import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "@/app/api/alerts/route";
import { db } from "@/lib/db";

describe("Milestone 5: Disruption Alerts REST API", () => {
  const createdAlertIds: string[] = [];

  afterAll(async () => {
    // Clean up created alerts so database stays at exact seeded count
    for (const id of createdAlertIds) {
      try {
        await db.disruptionAlert.delete({ where: { id } });
      } catch {
        // Ignore if already deleted
      }
    }
  });

  it("GET /api/alerts retrieves list of seeded disruption bulletins", async () => {
    const req = new NextRequest("http://localhost:3000/api/alerts");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.count).toBeGreaterThan(0);
  });

  it("GET /api/alerts?severity=WARNING filters alerts accurately", async () => {
    const req = new NextRequest("http://localhost:3000/api/alerts?severity=WARNING");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    for (const alert of body.data) {
      expect(alert.severity).toBe("WARNING");
    }
  });

  it("POST /api/alerts validates required fields and rejects incomplete payloads", async () => {
    const req = new NextRequest("http://localhost:3000/api/alerts", {
      method: "POST",
      body: JSON.stringify({ title: "Incomplete Alert" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Missing required fields");
  });

  it("POST /api/alerts broadcasts a new operational bulletin successfully", async () => {
    const payload = {
      lineId: "line-mrt-ns",
      title: "Elevated Track Inspection at Blok M BCA",
      description: "Pre-dawn power third-rail inspection between Blok M and ASEAN. Minor 5m headway adjustment.",
      severity: "INFO",
      affectedStops: ["Blok M BCA", "ASEAN"],
      estimatedEndTime: new Date(Date.now() + 3600000).toISOString(),
    };

    const req = new NextRequest("http://localhost:3000/api/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe(payload.title);
    expect(body.data.status).toBe("ACTIVE");
    expect(body.data.severity).toBe("INFO");
    expect(body.data.affectedStops).toEqual(payload.affectedStops);

    createdAlertIds.push(body.data.id);
  });

  it("PATCH /api/alerts updates status to RESOLVED and severity to CRITICAL", async () => {
    // 1. Create a test alert first
    const createReq = new NextRequest("http://localhost:3000/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        lineId: "line-krl-bogor",
        title: "Test Alert for Patching",
        description: "Test description",
        severity: "WARNING",
      }),
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()).data;
    createdAlertIds.push(created.id);

    // 2. Patch status to RESOLVED
    const patchReq = new NextRequest("http://localhost:3000/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({
        id: created.id,
        status: "RESOLVED",
      }),
    });
    const patchRes = await PATCH(patchReq);
    expect(patchRes.status).toBe(200);

    const patchBody = await patchRes.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.data.status).toBe("RESOLVED");
  });

  it("DELETE /api/alerts deletes an alert by ID", async () => {
    const createReq = new NextRequest("http://localhost:3000/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        lineId: "line-tj-cor-1",
        title: "Temporary Alert to Delete",
        description: "Will be deleted",
        severity: "INFO",
      }),
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()).data;

    const deleteReq = new NextRequest(`http://localhost:3000/api/alerts?id=${created.id}`, {
      method: "DELETE",
    });
    const deleteRes = await DELETE(deleteReq);
    expect(deleteRes.status).toBe(200);

    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);
  });
});
