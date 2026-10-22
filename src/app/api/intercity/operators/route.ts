/**
 * PlatformI - Intercity Operators Lookup API
 *
 * Read-only endpoint listing intercity operators (rail, bus, shuttle,
 * aviation, maritime) seeded by the versioned intercity ingester.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { IntercityOperator, TransitMode } from "@/types/transit";

export async function GET(_request?: Request): Promise<NextResponse> {
  void _request;
  try {
    const rows = await db.intercityOperator.findMany({
      orderBy: { name: "asc" },
    });

    const operators: IntercityOperator[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      mode: row.mode as TransitMode,
      serviceTier: row.serviceTier,
    }));

    return NextResponse.json({ operators });
  } catch (error) {
    return NextResponse.json(
      {
        operators: [],
        error: error instanceof Error ? error.message : "Failed to retrieve intercity operators",
      },
      { status: 500 },
    );
  }
}
