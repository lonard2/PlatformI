/**
 * PlatformI - About & credits content (single source).
 *
 * Proper names stay untranslated per repo norm (operator names, library
 * names, dataset titles). Entry details resolve through the `about`
 * dictionary section, so every locale reads plain local prose.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import type { TranslationDictionary } from "@/lib/i18n/types";

type AboutKey = keyof TranslationDictionary["about"];

export interface CreditEntry {
  name: string;
  detailKey: AboutKey;
}

export interface CreditGroup {
  id: "data" | "tech" | "maps" | "credits";
  entries: CreditEntry[];
}

export const ABOUT_CREDIT_GROUPS: CreditGroup[] = [
  {
    id: "data",
    entries: [
      { name: "Jabodetabek network dataset", detailKey: "credDataset" },
      { name: "MRT Jakarta · LRT · KRL Commuter · Whoosh · TransJakarta", detailKey: "credOperators" },
      { name: "KAI intercity · AKAP coaches · Executive shuttles", detailKey: "credIntercity" },
      { name: "Pelni · Kepulauan Seribu speedboats", detailKey: "credMaritime" },
      { name: "GTFS schedule refresh", detailKey: "credGtfs" },
    ],
  },
  {
    id: "tech",
    entries: [
      { name: "Next.js 16 · React 19", detailKey: "credNext" },
      { name: "Prisma 7", detailKey: "credPrisma" },
      { name: "Tailwind CSS v4", detailKey: "credTailwind" },
      { name: "Leaflet", detailKey: "credLeaflet" },
      { name: "Zustand", detailKey: "credZustand" },
      { name: "Framer Motion", detailKey: "credMotion" },
      { name: "Lucide", detailKey: "credLucide" },
      { name: "SimpleWebAuthn", detailKey: "credWebauthn" },
      { name: "Vitest", detailKey: "credVitest" },
      { name: "TypeScript 7", detailKey: "credTs" },
      { name: "Geist · Noto", detailKey: "credFonts" },
    ],
  },
  {
    id: "maps",
    entries: [
      { name: "OpenStreetMap contributors", detailKey: "credOsm" },
      { name: "CARTO basemaps", detailKey: "credCarto" },
      { name: "Esri World Imagery", detailKey: "credEsri" },
    ],
  },
  {
    id: "credits",
    entries: [
      { name: "Lonard Steven", detailKey: "credCreator" },
      { name: "OpenRouter", detailKey: "credOpenRouter" },
      { name: "MIT License (2026)", detailKey: "credMit" },
    ],
  },
];
