/**
 * PlatformI - i18n key parity guard.
 * All six locale dictionaries must expose identical key sets so no locale
 * silently falls back or renders undefined. Fails on the first drift.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { ar } from "@/lib/i18n/dictionaries/ar";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flattenKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe("i18n dictionary key parity", () => {
  it("exposes identical key sets across all six locales", () => {
    const dicts = { en, id, ja, zh, ko, ar } as const;
    const reference = flattenKeys(en).sort();
    expect(reference.length).toBeGreaterThan(0);
    for (const [locale, dict] of Object.entries(dicts)) {
      const keys = flattenKeys(dict).sort();
      expect(keys, `locale ${locale}`).toEqual(reference);
    }
  });
});
