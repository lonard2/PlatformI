# PlatformI: Architectural Walkthrough, Mathematical Formulations & Educational Guide

**Version**: 1.0.0-PROD  
**Target Platform**: Jakarta & Bodetabek Multimodal Public Transportation System  
**Framework**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Prisma ORM, Leaflet 1.9, Zustand, Vitest  
**Document Classification**: Production Technical Specification & Mathematical Derivations  

---

## 1. Executive System Overview & Architecture

**PlatformI** is a unified public transportation platform and glass-cockpit cartography dashboard designed for the Special Capital Region of Jakarta and the Greater Jakarta metropolitan area (Jabodetabek: Jakarta, Bogor, Depok, Tangerang, South Tangerang, Bekasi), engineered with nationwide architectural scalability.

The system unifies four distinct transport dimensions into a single reactive operational picture:
1. **Land Rail**: MRT Jakarta (North-South & East-West lines), LRT Jabodebek (Cibubur & Bekasi lines), LRT Jakarta (Phase 1 & 1B), KRL Commuter Line (Bogor, Cikarang Loop, Rangkasbitung, Tangerang, Tanjung Priok), Whoosh High-Speed Rail (Halim - Tegalluar), KAI Bandara (Soekarno-Hatta Airport Rail Link), and KAI Jarak Jauh (Gambir & Pasar Senen intercity hubs).
2. **Land Bus & Roadway**: TransJakarta BRT (Trunk Corridors 1-14), TransJakarta Non-BRT & RoyalTrans premium feeders, MikroTrans (JakLingko subsidized angkot network), Intercity AKAP (Antar Kota Antar Provinsi) luxury coaches, and Executive Point-to-Point Shuttles (Toyota HiAce Premio & Mercedes Sprinter).
3. **Aviation**: Soekarno-Hatta International Airport (CGK Terminal 1/2/3 with Skytrain Kalayang APMS) and Halim Perdanakusuma Airport (HLP).
4. **Maritime & Waterway**: Kepulauan Seribu Express Speedboats (Muara Angke / Kali Adem & Marina Ancol Piers) and Pelabuhan Tanjung Priok (PT PELNI passenger liners).

### 1.1 High-Level Component & Service Topology

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Next.js 16)                                 |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
|  |       Map Cartography HUD      |  |   Enthusiast Vehicle Inspector |  |   Digital Pass Wallet|  |
|  | (Leaflet SSR-Isolated Canvas)  |  |  (Bottom Sheet / Side Panel)   |  |   (30s Rolling QR)   |  |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
|  |     Disruption Alert Center    |  |     AI Transit Assistant Modal |  | Admin Fleet Control  |  |
|  |   (Priority Filtered Banner)   |  |   (OpenRouter Multi-Model)     |  | (/admin Dashboard)   |  |
|  +--------------------------------+  +--------------------------------+  +----------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  STATE & SIMULATION LAYER (Client)                                  |
|  +----------------------------------------------------------------------------------------------+  |
|  |                      Zustand Central Reactive Store (useTransitStore.ts)                     |  |
|  |   - Active Filters (Modes, Regions)  - Selection State (Vehicle, Stop)  - Simulation Clock   |  |
|  +----------------------------------------------------------------------------------------------+  |
|  +----------------------------------------------------------------------------------------------+  |
|  |                    Real-Time GTFS-RT Vector Simulation Hook (useTransitSimulation.ts)         |  |
|  |   - 60fps Vector Interpolation       - Speed Multipliers (1x/2x/5x/0x)  - Dwell State Machine|  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                CORE CALCULATION ENGINES (Pure TypeScript)                           |
|  +---------------------------+  +---------------------------+  +---------------------------------+  |
|  |  Spherical Geodesy Math   |  |  Multi-Modal Fare Engine  |  |  30s Rolling QR Security Engine |  |
|  |  (Haversine, Bearing, XT) |  |  (JakLingko 3-Hour Cap)   |  |  (HMAC-SHA256, Anti-Replay)     |  |
|  +---------------------------+  +---------------------------+  +---------------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  DATA & PERSISTENCE LAYER (Prisma)                                 |
|  +----------------------------------------------------------------------------------------------+  |
|  |                           Prisma ORM with Embedded SQLite (dev.db)                           |  |
|  |   Regions, Lines, Stops, Vehicles, TechnicalSpecs, SeatingDiagrams, Tickets, Alerts, CheckIns|  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Rigorous Mathematical Formulations & Derivations

All spatial, financial, temporal, and cryptographic calculations in PlatformI are derived from pure mathematical foundations without external black-box library dependencies.

### 2.1 Spherical Geodesy & Great-Circle Surface Distance (Haversine)

To compute surface distance between two geographic coordinates $P_1(\phi_1, \lambda_1)$ and $P_2(\phi_2, \lambda_2)$ on a spherical Earth of mean radius $R = 6,371,000\text{ meters}$, where $\phi$ represents latitude and $\lambda$ represents longitude in radians:

#### Derivation from Spherical Law of Cosines:
The central angle $\Delta\sigma$ between $P_1$ and $P_2$ satisfies:
$$\cos(\Delta\sigma) = \sin(\phi_1)\sin(\phi_2) + \cos(\phi_1)\cos(\phi_2)\cos(\lambda_2 - \lambda_1)$$

Using the trigonometric identity $\cos(\Delta\sigma) = 1 - 2\sin^2\left(\frac{\Delta\sigma}{2}\right)$:
$$1 - 2\sin^2\left(\frac{\Delta\sigma}{2}\right) = \sin(\phi_1)\sin(\phi_2) + \cos(\phi_1)\cos(\phi_2)\left(1 - 2\sin^2\left(\frac{\Delta\lambda}{2}\right)\right)$$

Rearranging for the Haversine parameter $a = \sin^2\left(\frac{\Delta\sigma}{2}\right)$:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

where $\Delta\phi = \phi_2 - \phi_1$ and $\Delta\lambda = \lambda_2 - \lambda_1$.

The angular distance in radians is:
$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

The great-circle surface distance $d$ in meters is:
$$d = R \cdot c$$

In `src/lib/math/geodesy.ts`, $1-a$ is clamped with $\max(0, 1-a)$ to guarantee numerical stability when points approach antipodal singularities ($a \approx 1$).

---

### 2.2 Great-Circle Initial Azimuth Bearing

To calculate the initial compass heading $\theta \in [0^\circ, 360^\circ)$ from coordinate $P_1(\phi_1, \lambda_1)$ towards $P_2(\phi_2, \lambda_2)$:

From spherical trigonometry on the terrestrial sphere:
$$y = \sin(\lambda_2 - \lambda_1) \cdot \cos(\phi_2)$$
$$x = \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\lambda_2 - \lambda_1)$$

The initial bearing in radians is:
$$\theta_{\text{rad}} = \operatorname{atan2}(y, x)$$

Converting to decimal degrees and normalizing to the compass range $[0, 360)$:
$$\theta = \left(\frac{\theta_{\text{rad}} \cdot 180}{\pi} + 360\right) \pmod{360}$$

where $0^\circ$ corresponds to True North, $90^\circ$ to East, $180^\circ$ to South, and $270^\circ$ to West.

---

### 2.3 Polyline Vector Interpolation & Along-Track Projection

A transit route polyline is defined as an ordered sequence of $N$ coordinate vertices:
$$\mathcal{P} = [p_0, p_1, p_2, \dots, p_{N-1}], \quad \text{where } p_i = (\text{lat}_i, \text{lng}_i)$$

1. **Cumulative Segment Distance Array**:
   $$\ell_k = \operatorname{Haversine}(p_k, p_{k+1}) \quad \text{for } k \in [0, N-2]$$
   $$\mathcal{D}_0 = 0, \quad \mathcal{D}_k = \sum_{j=0}^{k-1} \ell_j, \quad \mathcal{D}_{\text{total}} = \mathcal{D}_{N-1}$$

2. **Continuous Along-Track Interpolation**:
   Given along-track distance $s \ge 0$, we normalize for circular route wraparound:
   $$\tilde{s} = s \pmod{\mathcal{D}_{\text{total}}}$$
   Find segment index $k$ such that $\mathcal{D}_k \le \tilde{s} < \mathcal{D}_{k+1}$.
   The segment ratio $t \in [0, 1)$ is:
   $$t = \frac{\tilde{s} - \mathcal{D}_k}{\ell_k}$$
   The interpolated vehicle coordinate is:
   $$\text{Lat}(\tilde{s}) = \text{Lat}(p_k) + t \cdot (\text{Lat}(p_{k+1}) - \text{Lat}(p_k))$$
   $$\text{Lng}(\tilde{s}) = \text{Lng}(p_k) + t \cdot (\text{Lng}(p_{k+1}) - \text{Lng}(p_k))$$
   $$\text{Heading}(\tilde{s}) = \operatorname{Bearing}(p_k, p_{k+1})$$

3. **Cross-Track Distance ($d_{\text{xt}}$) and Along-Track Distance ($d_{\text{at}}$)**:
   For an external query point $P$ relative to segment $A \to B$:
   $$\delta_{13} = \frac{\operatorname{Haversine}(A, P)}{R}, \quad \theta_{13} = \operatorname{Bearing}(A, P), \quad \theta_{12} = \operatorname{Bearing}(A, B)$$
   $$d_{\text{xt}} = \arcsin\left(\sin(\delta_{13})\sin(\theta_{13} - \theta_{12})\right) \cdot R$$
   $$d_{\text{at}} = \arccos\left(\frac{\cos(\delta_{13})}{\cos(d_{\text{xt}} / R)}\right) \cdot R$$

---

### 2.4 Exponential Time-Decay Crowdsource Aggregation

Commuter check-in submissions for active fleet vehicles (Crowd Density Level 1-4 and AC Comfort scores) undergo real-time weighted aggregation where older feedback decays exponentially with a 10-minute half-life ($t_{\text{half}} = 600\text{ seconds}$):

$$\lambda = \frac{\ln(2)}{t_{\text{half}}} \approx \frac{0.693147}{600} \approx 0.001155\text{ s}^{-1}$$

For a set of $M$ user check-ins submitted at timestamps $t_1, t_2, \dots, t_M$ with density ratings $r_i \in \{1, 2, 3, 4\}$ at current time $t_{\text{now}}$:
$$w_i = \exp\left(-\lambda \cdot (t_{\text{now}} - t_i)\right)$$
$$\bar{r} = \frac{\sum_{i=1}^M w_i \cdot r_i}{\sum_{i=1}^M w_i}$$
$$\text{Aggregated Density Level} = \operatorname{clamp}\left(\operatorname{round}(\bar{r}), 1, 4\right)$$

---

### 2.5 JakLingko 3-Hour Integrated Tariff Cap Algorithm

The **JakLingko Integrated Tariff (Tarif Integrasi)** applies when a passenger combines journeys across **MRT Jakarta**, **LRT Jakarta**, and **TransJakarta BRT/Non-BRT**:

```
+----------------------------------------------------------------------------------------------------+
|                                JAKLINGKO TARIFF CALCULATION STATE MACHINE                          |
+----------------------------------------------------------------------------------------------------+
| State 1: Boarding Leg 0                                                                            |
|   - Base Boarding Fee deducted: B_0 = Rp 2,500                                                     |
|   - Trip Start Time recorded: T_start = t_tapin_0                                                  |
|   - Cumulative Distance Tariff: F_acc = B_0 + round(dist_0_km * Rp 500)                            |
|                                                                                                    |
| State 2: Subsequent Leg i (Transfer from Leg i-1)                                                  |
|   - Validation Check 1: (t_tapin_i - t_tapout_{i-1}) <= 45 minutes (Transfer Gap Limit)           |
|   - Validation Check 2: (t_tapout_i - T_start) <= 180 minutes (Total 3-Hour Journey Limit)         |
|   - Validation Check 3: Mode is JakLingko eligible (MRT, LRT Jkt, TJ BRT, MikroTrans)             |
|                                                                                                    |
|   IF ALL VALID:                                                                                    |
|     - NO additional boarding fee B_0.                                                              |
|     - Accumulate distance rate: F_acc += round(dist_i_km * Rp 500)                                 |
|     - Apply Integrated Cap: Total Fare = MIN(F_acc, Rp 10,000)                                     |
|                                                                                                    |
|   IF ANY INVALID:                                                                                  |
|     - Integration breaks. Standalone single-mode tariffs apply for all legs.                       |
+----------------------------------------------------------------------------------------------------+
```

---

### 2.6 30-Second Rolling Dynamic QR Cryptographic Token Protocol

Dynamic ticketing passes in PlatformI generate a time-synchronized HMAC-SHA256 security token regenerating every 30 seconds with $\pm 1$ window ($\pm 30\text{ seconds}$) clock skew tolerance:

1. **Epoch Time Window Counter**:
   $$W = \left\lfloor \frac{t_{\text{epoch\_ms}}}{30,000} \right\rfloor$$
   $$\text{Seconds Remaining} = 30 - \left(\left\lfloor \frac{t_{\text{epoch\_ms}}}{1,000} \right\rfloor \pmod{30}\right)$$

2. **Payload Digest & HMAC Signature**:
   $$\text{Payload String} = \text{"PLATFORMI:TKT:"} + \text{ticketId} + \text{":"} + \text{userId} + \text{":"} + W$$
   $$\text{Signature} = \operatorname{HMAC-SHA256}(\text{SECRET\_KEY}, \text{Payload String}).\operatorname{toHex}().\operatorname{substring}(0, 16)$$
   $$\text{Full Scannable QR Payload} = \text{"PLATFORMI:"} + \text{ticketId} + \text{":"} + \text{userId} + \text{":"} + W + \text{":"} + \text{Signature}$$

3. **Turnstile Gate Verification Pipeline**:
   $$\Delta W = |W_{\text{scanned}} - W_{\text{server}}|$$
   - If $\Delta W > 1$: Reject with `EXPIRED_QR_TOKEN`.
   - If $\operatorname{HMAC}(\text{Payload}(W_{\text{scanned}})) \ne \text{Signature}$: Reject with `TAMPERED_QR_TOKEN`.
   - If $\text{Nonce}(\text{ticketId}, W_{\text{scanned}}) \in \text{UsedNonces}$: Reject with `REPLAYED_TOKEN_ALREADY_SCANNED`.
   - Else: Grant Turnstile Access (`isValid: true`).

---

## 3. Next.js 16 SSR Leaflet Integration Patterns

### 3.1 Server-Side Rendering Isolation Pattern
Leaflet accesses browser global objects (`window`, `document`, `navigator`) during module initialization. In Next.js 16 App Router with React 19 Server Components, importing Leaflet directly causes server crashes (`ReferenceError: window is not defined`).

#### Implementation Architecture:
```tsx
// src/components/map/MapWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { SkeletonMap } from './SkeletonMap';

export const DynamicTransitMap = dynamic(
  () => import('./TransitMap').then((mod) => mod.TransitMap),
  {
    ssr: false,
    loading: () => <SkeletonMap />
  }
);
```

### 3.2 Map Container Singleton & React 19 Cleanup
To eliminate duplicate initialization errors (`Error: Map container is already initialized`):
```tsx
const mapContainerRef = useRef<HTMLDivElement | null>(null);
const mapInstanceRef = useRef<L.Map | null>(null);

useEffect(() => {
  if (!mapContainerRef.current) return;
  if (mapInstanceRef.current) return; // Prevent duplicate instantiation

  const map = L.map(mapContainerRef.current, {
    center: [-6.2088, 106.8456],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  mapInstanceRef.current = map;

  return () => {
    map.remove();
    mapInstanceRef.current = null;
  };
}, []);
```

### 3.3 Hardware-Accelerated SVG Marker Heading Rotation
Vehicles render via `L.divIcon` carrying directional SVG arrowheads. Rotation is computed via continuous bearing geodesy and hardware-accelerated with CSS 3D transforms:
```css
.vehicle-marker-icon {
  transform: translate3d(var(--x), var(--y), 0) rotate(var(--heading-deg));
  will-change: transform;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. OpenRouter Multi-Model Integration & Prompt Engineering

### 4.1 Supported Model Inventory
PlatformI integrates 6 designated AI models via OpenRouter:

| Model ID | Provider | Context Window | Recommended Role |
| :--- | :--- | :--- | :--- |
| `google/gemini-3.7-flash` | Google | 1,000,000 | Default fast multimodal transit advisor & route finder |
| `google/gemini-3.5-flash-lite` | Google | 500,000 | Ultra-low latency fare lookups & station departure checks |
| `deepseek/deepseek-v4-pro-0813` | DeepSeek | 128,000 | Deep reasoning & multi-criteria transfer schedule optimizer |
| `qwen/qwen3.7-plus` | Alibaba Cloud | 128,000 | Multilingual regional routing & logistics |
| `openai/gpt-5.6-luna` | OpenAI | 200,000 | Complex multi-leg itineraries & passenger policy queries |
| `google/gemma-4-26b-a4b-it` | Google | 64,000 | Open-weights transit telemetry & edge fleet analysis |

### 4.2 Transit Knowledge Graph Prompt Injection
The AI system prompt is compiled in `buildTransitSystemPrompt()` in `src/lib/services/aiTransitService.ts`:
- Complete transit line catalog (codes, operating headways, operating hours, base fares).
- Primary multi-modal interchange hubs (Dukuh Atas, CSW-ASEAN, Manggarai, Halim, Jatinegara).
- Covered pedestrian skybridges (JPM Dukuh Atas, CSW circular skybridge, Halim LRT-HSR skybridge).
- Active disruption alerts dynamically extracted from the database.
- Zero-emoji enforcement rule ensuring clean structured Markdown output.

---

## 5. Architectural Quality Standards

1. **Zero Placeholder Stubs**: Every function across geodesy, fare calculation, simulation, and security is 100% functionally implemented without `TODO` or dummy placeholders.
2. **Zero Raw Emojis**: System elements, map badges, inspector cards, and test outputs strictly utilize Lucide SVG icons and styled Tailwind CSS badge classes.
3. **Strict TypeScript Typing**: No `any` types permitted across all domain models in `src/types/transit.ts`.
4. **4-Tier + Adversarial Test Suite**: Vitest automated test suite achieves 100% pass rate across 213 test assertions.
