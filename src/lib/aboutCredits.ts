/**
 * PlatformI - About & credits content (single source).
 *
 * Proper names stay untranslated per repo norm (operator names, library
 * names, dataset titles). Section headings come from the `about`
 * dictionary section; entries here are identifiers, not prose.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

export interface CreditEntry {
  name: string;
  detail: string;
}

export interface CreditGroup {
  id: "data" | "tech" | "maps" | "credits";
  entries: CreditEntry[];
}

export const ABOUT_CREDIT_GROUPS: CreditGroup[] = [
  {
    id: "data",
    entries: [
      { name: "Jabodetabek network dataset", detail: "Hand-authored lines, stops, polylines, coachbuilder specs" },
      { name: "MRT Jakarta · LRT · KRL Commuter · Whoosh · TransJakarta", detail: "Operator networks referenced by authentic name" },
      { name: "KAI intercity · AKAP coaches · Executive shuttles", detail: "Reserve-then-pay money path (Phase 3)" },
      { name: "Pelni · Kepulauan Seribu speedboats", detail: "Maritime gateways" },
      { name: "GTFS schedule refresh", detail: "Validated pipeline with drift reports (Phase 1)" },
    ],
  },
  {
    id: "tech",
    entries: [
      { name: "Next.js 16 · React 19", detail: "App Router, SSR cartography" },
      { name: "Prisma 7", detail: "SQLite locally, PostgreSQL in production" },
      { name: "Tailwind CSS v4", detail: "CSS-first theme" },
      { name: "Leaflet", detail: "Interactive cartography" },
      { name: "Zustand", detail: "Reactive transit store" },
      { name: "Framer Motion", detail: "Drawer and modal transitions" },
      { name: "Lucide", detail: "Iconography (no emoji policy)" },
      { name: "SimpleWebAuthn", detail: "Member passkey ceremonies" },
      { name: "Vitest", detail: "~990 automated tests" },
      { name: "TypeScript 7", detail: "Strict, no-any codebase" },
      { name: "Geist · Noto", detail: "Latin (Vercel) + CJK/Arabic coverage (Google Fonts)" },
    ],
  },
  {
    id: "maps",
    entries: [
      { name: "OpenStreetMap contributors", detail: "Base cartography (ODbL)" },
      { name: "CARTO basemaps", detail: "Dark Matter + Positron, keyed with OSM fallback" },
      { name: "Esri World Imagery", detail: "Satellite layer" },
    ],
  },
  {
    id: "credits",
    entries: [
      { name: "Lonard Steven", detail: "Creator — dataset, engineering, design" },
      { name: "OpenRouter", detail: "Google Gemini · DeepSeek · Qwen · OpenAI transit advisor models" },
      { name: "MIT License (2026)", detail: "Code — see LICENSE; data and tiles keep their own terms" },
    ],
  },
];
