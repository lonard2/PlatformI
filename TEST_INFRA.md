# E2E Test Infra: PlatformI

## Test Philosophy
- Opaque-box, requirement-driven. Derived directly from `ORIGINAL_REQUEST.md` and `PROJECT.md` feature specifications without depending on internal implementation details.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Jabodetabek Commuter Workload Scenarios.

## Feature Inventory & Target Coverage
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Geodesy Math Engine | R2, PROJECT §7 | 5 | 5 | ✓ |
| 2 | GTFS-RT Vector Simulation | R2, PROJECT §12 | 5 | 5 | ✓ |
| 3 | Enthusiast Vehicle & Seating Matrix | R3, PROJECT §15, 16 | 5 | 5 | ✓ |
| 4 | Hub Inspector & Skybridge Guides | R3, PROJECT §18, 19 | 5 | 5 | ✓ |
| 5 | Crowdsource Check-In & Time Decay | R4, PROJECT §20, 21 | 5 | 5 | ✓ |
| 6 | Multi-Modal Fare & JakLingko Cap | R4, PROJECT §23, 24 | 5 | 5 | ✓ |
| 7 | 30s Dynamic Rolling QR Token | R4, PROJECT §26 | 5 | 5 | ✓ |
| 8 | Multi-Model AI Advisor & Routing | R5, PROJECT §28, 29 | 5 | 5 | ✓ |
| 9 | Turnstile Gate Scanner Simulator | R5, PROJECT §33 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Vitest (`npm test` / `npx vitest run`)
- **Environment**: jsdom with Web Crypto, RequestAnimationFrame, and Leaflet DOM polyfills in `tests/setup.ts`.
- **Directory Layout**:
  - `tests/setup.ts`: Polyfill environment setup.
  - `tests/geodesy.test.ts`: Spherical geodesy, bearing, cross-track, interpolation.
  - `tests/fareCalculator.test.ts`: Fare matrices, progressive rates, JakLingko 3-hour Rp 10k ceiling.
  - `tests/simulation.test.ts`: Vector animation math, speed states, polyline wrap, ETA calculations.
  - `tests/crowdsource.test.ts`: Density aggregation, exponential time decay, AC scores.
  - `tests/ticketing.test.ts`: 30s dynamic QR TOTP HMAC generation, skew window tolerance, gate validation.
  - `tests/integration.test.ts`: Tier 3 pairwise cross-feature integration.
  - `tests/scenarios.test.ts`: Tier 4 real-world multi-modal Jabodetabek journeys.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | South to Central (Lebak Bulus MRT $\to$ CSW Skybridge $\to$ TJ Corridor 13/1 $\to$ Monas) | MRT, TJ BRT, Skybridge, JakLingko Cap | High |
| 2 | Trans-Jabodetabek Suburban (Bogor KRL $\to$ Manggarai $\to$ Sudirman $\to$ Dukuh Atas TOD $\to$ LRT Harjamukti) | KRL, LRT Jabodebek, TOD Hub, Fare Engine | High |
| 3 | High-Speed Intercity to Metro (Whoosh Tegalluar $\to$ Halim HSR Hub $\to$ LRT Bekasi Line $\to$ Dukuh Atas) | Whoosh HSR, LRT, Intermodal Hub, Dynamic Pricing | High |
| 4 | Airport Express Multi-Modal (CGK Terminal 3 $\to$ Skytrain APMS $\to$ Airport Rail Link $\to$ BNI City $\to$ MRT) | Aviation, APMS, Airport Rail Link, MRT, Dynamic QR | High |
| 5 | Maritime Archipelago Hop (Muara Angke $\to$ Speedboat Pulau Pramuka $\to$ Local boat Pulau Pari) | Maritime Speedboat, Port Hub, Seating Diagram | Medium |

## Coverage Thresholds
- Tier 1: $\ge 45$ unit tests (5 per major feature).
- Tier 2: $\ge 45$ boundary & corner tests.
- Tier 3: Pairwise cross-feature interactions ($\ge 10$ tests).
- Tier 4: $\ge 5$ realistic multi-modal Jabodetabek application scenarios.
- **Total Minimum Target: $\ge 105$ test assertions with 100% pass rate.**
