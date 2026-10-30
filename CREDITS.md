# CREDITS — PlatformI

People, data, and open work this project stands on. The in-app
[/about](/about) page renders the same content in all six locales.

## People

- **Lonard Steven** — creator: transit dataset, engineering, design (MIT © 2026).

## Transit data

- **Hand-authored Jabodetabek network dataset** (`src/lib/data/jakarta-dataset.ts`):
  MRT Jakarta, LRT Jabodebek, LRT Jakarta, KRL Commuter Line, Whoosh
  high-speed rail, KAI intercity + airport rail, TransJakarta BRT and
  Non-BRT, MikroTrans, AKAP coaches, executive shuttles, Pelni, and
  Kepulauan Seribu speedboats. Operator names stay authentic and
  untranslated by project rule.
- **GTFS schedule refresh** — validated import pipeline with drift
  reports (Phase 1). Schedules belong to their publishing operators.
- **Empty-but-honest regions** — new metros ship with zero invented
  lines; see `docs/multi-region.md`.

## Maps

- **OpenStreetMap contributors** (ODbL) — base cartography, including the
  automatic fallback when no tile key is provisioned.
- **CARTO basemaps** (Dark Matter + Positron) — keyed dark/light layers.
- **Esri World Imagery** — satellite layer.

## Built with (all open source, see package.json for versions)

Next.js · React · Prisma (SQLite + PostgreSQL) · Tailwind CSS · Leaflet ·
Zustand · Framer Motion · Lucide (icons — the project uses zero emoji) ·
SimpleWebAuthn (passkeys) · Vitest · TypeScript (strict, no-`any` rule) ·
Geist (Vercel) + Noto (Google Fonts) typefaces.

## AI

- **OpenRouter** routing to Google Gemini, DeepSeek, Qwen, and OpenAI
  models for the transit advisor (member-gated; local grounded fallback
  when no key is configured).

## License

- **Code: MIT (2026, Lonard Steven)** — see `LICENSE`.
- Map tiles and third-party libraries keep their own licenses and terms.
