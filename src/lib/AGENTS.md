# Logic, Services & Store Architecture (src/lib)

This directory contains business logic, mathematical calculation services, reactive stores, and datasets.

---

## 1. Structure
- `stores/useTransitStore.ts`: Central Zustand reactive store for regional context, filter states, selection states, simulation clock speed, and user bookings.
- `services/fareCalculator.ts`: Calculates single-trip, progressive distance rail fares, flat BRT rates, and JakLingko 3-hour integrated tariff caps.
- `services/aiTransitService.ts`: OpenRouter API client communicating with designated models (`gemini-3.7-flash`, `gemini-3.5-flash-lite`, `deepseek-v4-pro-0813`, `qwen3.7-plus`, `gpt-5.6-luna`, `gemma-4-26b-a4b-it`).
- `hooks/useTransitSimulation.ts`: Live GTFS-RT style coordinate interpolation along route polylines with bearing and speed calculations.
- `data/jakarta-dataset.ts`: High-fidelity real-world transit dataset for Jakarta & Bodetabek.
- `constants/modes.ts`: Color definitions, Lucide icon mappings, and regional boundaries.

---

## 2. Mathematical Principles
- **Bearing Calculation**: Uses spherical trigonometry (`atan2(y, x)` on lat/lng in radians).
- **Haversine Distance**: Computes accurate surface distance in kilometers for transit line segments.
- **JakLingko Tariff Cap**: Enforces a maximum fare of Rp 10,000 for trips completed within 3 hours across integrated modes (MRT + LRT + TransJakarta).
