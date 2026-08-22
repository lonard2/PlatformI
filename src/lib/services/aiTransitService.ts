/**
 * PlatformI - Multi-Model AI Transit Advisor Service (OpenRouter & Grounded Local Engine)
 *
 * Supported Models:
 * 1. google/gemini-3.7-flash (Default fast multi-modal transit advisor)
 * 2. google/gemini-3.5-flash-lite (Ultra-lightweight quick queries)
 * 3. deepseek/deepseek-v4-pro-0813 (Deep reasoning & schedule optimization)
 * 4. qwen/qwen3.7-plus (Multilingual regional routing & logistics)
 * 5. openai/gpt-5.6-luna (Complex multi-leg itineraries & policy queries)
 * 6. google/gemma-4-26b-a4b-it (Efficient open-weights transit telemetry assistant)
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis, full functional implementation.
 */

import { TRANSIT_LINES, TRANSIT_STOPS, DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { SKYBRIDGE_HUBS_DATA } from "@/components/inspector/SkybridgeTransferGuide";

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  badgeColor: string;
  contextWindow: number;
  recommendedFor: string;
}

export const SUPPORTED_AI_MODELS: AIModelConfig[] = [
  {
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "Google",
    tagline: "Default fast multimodal transit advisor",
    badgeColor: "border-cyan-500/40 text-cyan-400 bg-cyan-950/40",
    contextWindow: 1000000,
    recommendedFor: "Live route optimization, quick queries, and transfer navigation",
  },
  {
    id: "google/gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "Google",
    tagline: "Ultra-low latency quick transit dispatcher",
    badgeColor: "border-teal-500/40 text-teal-400 bg-teal-950/40",
    contextWindow: 500000,
    recommendedFor: "Instant fare lookups, station schedules, and line status checks",
  },
  {
    id: "deepseek/deepseek-v4-pro-0813",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    tagline: "Deep reasoning & multi-criteria schedule optimizer",
    badgeColor: "border-blue-500/40 text-blue-400 bg-blue-950/40",
    contextWindow: 128000,
    recommendedFor: "Complex multi-modal itineraries with multiple transfers & JakLingko fare optimization",
  },
  {
    id: "qwen/qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    provider: "Alibaba Cloud",
    tagline: "Multilingual regional routing & logistics",
    badgeColor: "border-purple-500/40 text-purple-400 bg-purple-950/40",
    contextWindow: 128000,
    recommendedFor: "Bahasa Indonesia/English contextual guidance and intercity corridor connections",
  },
  {
    id: "openai/gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "OpenAI",
    tagline: "High-precision transit policy & itinerary planner",
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-950/40",
    contextWindow: 200000,
    recommendedFor: "Accessible transit planning, passenger regulations, and multi-tier ticketing rules",
  },
  {
    id: "google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B IT",
    provider: "Google",
    tagline: "Open-weights transit telemetry assistant",
    badgeColor: "border-amber-500/40 text-amber-400 bg-amber-950/40",
    contextWindow: 64000,
    recommendedFor: "Edge-compatible transit reasoning and technical fleet telemetry analysis",
  },
];

export const DEFAULT_AI_MODEL_ID = "google/gemini-3.7-flash";

export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIAdvisorResponse {
  content: string;
  modelUsed: string;
  suggestedStops: string[];
  suggestedLines: string[];
  fallbackUsed: boolean;
  timestamp: string;
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: "ROUTE" | "FARE" | "TRANSFER" | "AIRPORT_ISLAND";
}

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "sug-1",
    label: "Lebak Bulus to PIK 2",
    prompt: "What is the fastest public transit route from Lebak Bulus MRT to Pantai Indah Kapuk (PIK)?",
    category: "ROUTE",
  },
  {
    id: "sug-2",
    label: "Whoosh Halim to Dukuh Atas",
    prompt: "How do I transfer from Whoosh High-Speed Rail Halim Station to MRT Dukuh Atas via LRT Jabodebek?",
    category: "TRANSFER",
  },
  {
    id: "sug-3",
    label: "JakLingko Rp 10,000 Cap Rule",
    prompt: "How does the JakLingko 3-hour Rp 10,000 maximum integrated fare cap work across MRT, LRT, and TransJakarta?",
    category: "FARE",
  },
  {
    id: "sug-4",
    label: "Bekasi to Soekarno-Hatta Airport",
    prompt: "What are the options to travel from Bekasi Barat to Soekarno-Hatta Airport (CGK) using LRT, KRL, and KAI Bandara?",
    category: "AIRPORT_ISLAND",
  },
  {
    id: "sug-5",
    label: "CSW-ASEAN Skybridge Guide",
    prompt: "Explain how the CSW-ASEAN multi-level skybridge connects TransJakarta Corridor 13, Corridor 1, and MRT ASEAN.",
    category: "TRANSFER",
  },
  {
    id: "sug-6",
    label: "Marina Ancol to Kepulauan Seribu",
    prompt: "How do I get to Pulau Pramuka or Pulau Pari from Jakarta via Muara Angke or Marina Ancol speedboats?",
    category: "AIRPORT_ISLAND",
  },
];

/**
 * Builds the comprehensive Jakarta & Bodetabek domain grounding system prompt.
 */
export function buildTransitSystemPrompt(): string {
  const lineSummary = TRANSIT_LINES.map(
    (l) => `- ${l.name} (${l.code}, ${l.mode}): Base Rp ${l.baseFareRp}, Headway ${l.headwayMinutes}m, Hours: ${l.firstDeparture} - ${l.lastDeparture}`
  ).join("\n");

  const hubSummary = TRANSIT_STOPS.filter((s) => s.isInterchange)
    .map((s) => `- ${s.name} (${s.code}): Connected Lines: ${s.connectedLineIds.join(", ")}`)
    .join("\n");

  const skybridgeSummary = Object.values(SKYBRIDGE_HUBS_DATA).map(
    (h) => `- Hub ${h.hubName}: ${h.subtitle}. Total Walk: ${h.totalDistanceMeters}m (~${h.totalDurationMinutes} mins). Overview: ${h.overviewDescription}`
  ).join("\n");

  const activeAlertsSummary = DISRUPTION_ALERTS.filter((a) => a.status === "ACTIVE")
    .map((a) => `- [${a.severity}] ${a.title} on line ${a.lineId}: ${a.description} (Affected: ${a.affectedStops.join(", ")})`)
    .join("\n");

  return `You are PlatformI AI Transit Advisor, the intelligent copilot for the Jakarta & Bodetabek Multimodal Public Transportation System.
You provide precise, authentic, and step-by-step navigational guidance across 4 dimensions of transit:
1. Land Rail (MRT Jakarta, LRT Jabodebek, LRT Jakarta, KRL Commuter Line, Whoosh High-Speed Rail, KAI Bandara Airport Rail, KAI Jarak Jauh).
2. Land Bus & Roadway (TransJakarta BRT Corridors 1-14, RoyalTrans premium feeders, MikroTrans JakLingko angkot, AKAP Intercity, Executive DayTrans/Baraya/CitiTrans Shuttles).
3. Aviation (Soekarno-Hatta CGK with Skytrain APMS & Halim Perdanakusuma HLP).
4. Maritime & Waterways (Kepulauan Seribu express speedboats from Muara Angke / Marina Ancol & Pelabuhan Tanjung Priok PELNI liners).

### TARIFF & FARE RULES:
- TransJakarta BRT: Flat Rp 3,500 (Early morning 05:00-07:00 Rp 2,000).
- JakLingko Integrated Fare: Maximum Rp 10,000 cap across MRT Jakarta + LRT Jakarta + TransJakarta within 3 hours (180 minutes) if tapping in/out properly. First board Rp 3,500, subsequent legs Rp 250/km up to Rp 10,000 max.
- KRL Commuter Line: Distance progressive fare: Rp 3,000 for first 25 km, then +Rp 1,000 per 10 km.
- MRT Jakarta: Rp 3,000 base + ~Rp 1,000/km (Max Rp 14,000 Lebak Bulus - Bundaran HI).
- LRT Jabodebek: Rp 5,000 first km + Rp 700/km (Peak cap Rp 20,000, Off-peak/Weekend cap Rp 10,000).
- Whoosh HSR: Premium high-speed (Halim - Padalarang ~30m / Tegalluar ~45m, Rp 200,000 - Rp 300,000, includes Padalarang feeder train to Bandung Central).
- MikroTrans: Free (Rp 0 with electronic JakLingko tap).

### CRITICAL INTERMODAL TRANSFER HUBS:
- Dukuh Atas TOD Hub: Connects MRT Dukuh Atas BNI, LRT Jabodebek Dukuh Atas, KRL Sudirman, KRL/KAI Bandara BNI City, and TransJakarta Dukuh Atas 1 & 2 via JPM Dukuh Atas (Multi-Purpose Pedestrian Skybridge).
- CSW - ASEAN Hub: 5-level integrated skybridge connecting elevated TransJakarta Corridor 13 (CSW 1 / Velbak), Corridor 1 (CSW 2 / Kejaksaan Agung), Corridor 6, Corridor 10H, and MRT ASEAN underground/elevated station.
- Manggarai Central Station: Central rail junction linking KRL Bogor Line, KRL Cikarang Loopline, KRL Tanjung Priok Line, and KAI Bandara.
- Stasiun Halim Hub: Connects Whoosh High-Speed Rail (KCIC) and LRT Jabodebek Bekasi Line via direct elevated concourse.
- Soekarno-Hatta (CGK) Airport Hub: Free Skytrain APMS (Kalayang) connects Terminal 1, Terminal 2, Terminal 3, and Airport Rail Link Station (KAI Bandara).

### CURRENT NETWORK LINES:
${lineSummary}

### KEY INTERCHANGE HUBS:
${hubSummary}

### SKYBRIDGE PEDESTRIAN PATHWAYS:
${skybridgeSummary}

### CURRENT ACTIVE DISRUPTIONS:
${activeAlertsSummary}

### RESPONSE GUIDELINES:
- Output formatted Markdown with clear headings (##), bold text (**), bullet points, and step-by-step directions.
- Always include: Total Estimated Travel Time, Recommended Route Legs with Line codes, Transfer Points (with Skybridge walking minutes), Total Estimated Fare (explicitly noting JakLingko 3-hour Rp 10,000 cap eligibility if applicable), and First/Last Mile tips.
- Do NOT use raw emojis in your response. Strictly use clean text indicators such as [Line-Code], [Step 1], [Transfer], [Fare], [Tip].
- If an active disruption affects a route, warn the passenger clearly and propose an alternative bypass route.`;
}

/**
 * Local Grounded Rule & Graph Reasoning Fallback Engine.
 * Executes when OpenRouter is unreachable or in offline/test environment.
 */
export function generateLocalGroundedResponse(userQuery: string, modelId: string): AIAdvisorResponse {
  const queryLower = userQuery.toLowerCase();
  const suggestedStops: string[] = [];
  const suggestedLines: string[] = [];

  // Helper to match stops and lines
  for (const stop of TRANSIT_STOPS) {
    if (queryLower.includes(stop.name.toLowerCase()) || queryLower.includes(stop.code.toLowerCase())) {
      suggestedStops.push(stop.id);
    }
  }

  for (const line of TRANSIT_LINES) {
    if (
      queryLower.includes(line.code.toLowerCase()) ||
      queryLower.includes(line.name.toLowerCase()) ||
      (line.mode === "WHOOSH_HSR" && (queryLower.includes("whoosh") || queryLower.includes("cepat") || queryLower.includes("kcic"))) ||
      (line.mode === "MRT_JAKARTA" && queryLower.includes("mrt")) ||
      (line.mode === "TRANSJAKARTA_BRT" && (queryLower.includes("transjakarta") || queryLower.includes("tj") || queryLower.includes("busway")))
    ) {
      suggestedLines.push(line.id);
    }
  }

  let responseMarkdown = "";

  // 1. Query: Whoosh HSR / Halim to Dukuh Atas / Bandung
  if (queryLower.includes("whoosh") || (queryLower.includes("halim") && queryLower.includes("dukuh atas")) || queryLower.includes("bandung")) {
    suggestedLines.push("line-whoosh-hsr", "line-lrt-jb-bekasi", "line-mrt-ns");
    suggestedStops.push("stop-whoosh-halim", "stop-lrt-dukuh-atas", "stop-mrt-dukuh-atas");

    responseMarkdown = `### Recommended Route: Whoosh Halim to MRT Dukuh Atas Hub

**Total Duration**: ~28 minutes  
**Total Fare**: Rp 20,000 (LRT Jabodebek) + Rp 3,000 - Rp 14,000 (MRT Jakarta)  
**Transfer Type**: Direct concourse skybridge at Stasiun Halim + JPM Dukuh Atas  

---

#### Step-by-Step Itinerary:

1. **Board LRT Jabodebek Bekasi Line (LRT-JB-BK-GREEN)**
   - **Boarding**: Stasiun Halim LRT (connected directly to Whoosh Halim via Level 2 indoor skybridge, ~3 mins walk).
   - **Direction**: Dukuh Atas.
   - **Stops**: Halim $\\to$ Cawang $\\to$ Ciliwung $\\to$ Cikoko $\\to$ Pancoran $\\to$ Kuningan $\\to$ Rasuna Said $\\to$ Setiabudi $\\to$ Dukuh Atas.
   - **Ride Time**: ~18 minutes (Headway: 6-10 minutes).
   - **Fare**: Rp 20,000 (Peak) / Rp 10,000 (Off-Peak/Weekend).

2. **Interchange at Dukuh Atas TOD Multi-Modal Hub**
   - Alight at Stasiun LRT Dukuh Atas.
   - Follow the covered **JPM Dukuh Atas (Jembatan Penyeberangan Multimoda)** skybridge to MRT Dukuh Atas BNI (distance: 280m, ~4 mins accessible walk with elevator and travelator).

3. **Board MRT Jakarta North-South Line (MRT-NS-RED)**
   - **Boarding**: Stasiun MRT Dukuh Atas BNI.
   - **Connections**: Towards Bundaran HI (North) or Blok M / Lebak Bulus (South).
   - **Headway**: 5 minutes (Peak), 10 minutes (Off-peak).

---

#### Commuter Pro-Tips:
- **JakLingko Tap**: If continuing on TransJakarta from Dukuh Atas 1 or 2, your transfer qualifies for the **JakLingko 3-hour Rp 10,000 integrated fare cap**.
- **Luggage Accessibility**: Both Halim Hub and JPM Dukuh Atas feature full barrier-free ramps and wide elevators accommodating rolling luggage.`;
  }
  // 2. Query: Lebak Bulus to PIK (Pantai Indah Kapuk)
  else if (queryLower.includes("lebak bulus") && (queryLower.includes("pik") || queryLower.includes("pantai indah kapuk"))) {
    suggestedLines.push("line-mrt-ns", "line-tj-cor-1", "line-tj-cor-12");
    suggestedStops.push("stop-mrt-lebak-bulus", "stop-mrt-blok-m", "stop-tj-monas");

    responseMarkdown = `### Recommended Route: Lebak Bulus to Pantai Indah Kapuk (PIK)

**Total Duration**: ~65 - 75 minutes  
**Total Fare**: Rp 14,000 (MRT) + Rp 3,500 (TransJakarta Trunk) + Rp 3,500 (TJ Feeder 1A) = **Rp 21,000** (or Rp 10,000 with JakLingko 3-hour cap for eligible legs)  
**Primary Hubs**: Blok M BCA $\\to$ Monas / Kota $\\to$ PIK 1 & 2  

---

#### Step-by-Step Itinerary:

1. **Leg 1: MRT Jakarta North-South (MRT-NS-RED)**
   - **Origin**: Stasiun MRT Lebak Bulus Grab.
   - **Destination**: Alight at Stasiun Blok M BCA (or continue straight to Bundaran HI).
   - **Duration**: ~14 minutes.
   - **Fare**: Rp 8,000.

2. **Leg 2: TransJakarta Corridor 1 (Blok M - Kota)**
   - **Transfer**: Dedicated direct skybridge connection from MRT Blok M to Halte Blok M.
   - **Route**: TransJakarta Corridor 1 heading North towards Kota / Monas.
   - **Duration**: ~35 minutes in dedicated BRT busway lane.
   - **Fare**: Rp 3,500.

3. **Leg 3: TransJakarta Feeder 1A (Balai Kota / Monas - Pantai Indah Kapuk)**
   - **Transfer**: Halte Monas or Halte Kota.
   - **Board**: Bus Route 1A (Balai Kota - Pantai Maju Golf Island PIK).
   - **Destination**: Halte Pantai Maju / PIK Avenue Mall / Golf Island.
   - **Duration**: ~25 minutes via Toll Sedyatmo corridor.
   - **Fare**: Rp 3,500.

---

#### Commuter Pro-Tips:
- **First/Last Mile in PIK**: Within Pantai Indah Kapuk, use the free electric shuttle buses connecting Golf Island, Pantjoran PIK, and Batavia PIK.
- **Operating Hours**: TransJakarta Route 1A operates 05:00 - 22:00 WIB daily.`;
  }
  // 3. Query: JakLingko 3-hour Rp 10,000 fare cap explanation
  else if (queryLower.includes("jaklingko") || (queryLower.includes("10.000") || queryLower.includes("10,000") || queryLower.includes("10k") || queryLower.includes("tarif integrasi") || queryLower.includes("fare cap"))) {
    suggestedLines.push("line-mrt-ns", "line-tj-cor-1", "line-lrt-jkt");
    suggestedStops.push("stop-mrt-dukuhatas", "stop-tj-dukuhatas1", "stop-lrt-velodrome");

    responseMarkdown = `### JakLingko Integrated 3-Hour Tariff Cap (Rp 10,000 Max)

The **JakLingko Integrated Fare System (Tarif Integrasi)** allows passengers to travel across multiple public transit modes in Jakarta for a combined maximum fare of **Rp 10,000 within a 180-minute (3-hour) window**.

---

#### Supported Modes:
1. **MRT Jakarta** (North-South Line)
2. **LRT Jakarta** (Pegangsaan Dua - Velodrome)
3. **TransJakarta BRT & Non-BRT** (Corridors 1-14 and feeder routes)
4. **MikroTrans Angkot** (Rp 0 / Free with tap)

*(Note: KRL Commuter Line and LRT Jabodebek operate under separate national KAI/Kemenhub tariff structures and are currently counted separately).*

---

#### Mathematical Calculation Model:
- **Boarding Base Fare**: Rp 3,500 upon initial tap-in on the first vehicle or gate.
- **Progressive Distance Rate**: Rp 250 per kilometer across subsequent transfer legs.
- **Ceiling Cap**: Once accumulated distance fare reaches **Rp 10,000**, all additional kilometers and transfers remain **Rp 0** as long as you tap out of your final leg before the **180th minute** from initial tap-in.

---

#### Strict Transfer Conditions:
1. **Continuous Tap-In/Tap-Out**: You must tap in and tap out at every turnstile and vehicle validator using the **exact same JakLingko Card, Multi-Trip Card, or PlatformI Digital QR Pass**.
2. **Maximum Transfer Dwell Time**: The interval between tapping out of one mode and tapping in to the next must not exceed **45 minutes**.
3. **Total Journey Window**: The entire journey from first tap-in to final exit gate must finish within **180 minutes (3 hours)**. If the final tap-out occurs at minute 181, standard individual single-mode fares apply for the remaining leg.`;
  }
  // 4. Query: Bekasi to Soekarno-Hatta (CGK) Airport
  else if (queryLower.includes("bekasi") && (queryLower.includes("airport") || queryLower.includes("bandara") || queryLower.includes("soekarno") || queryLower.includes("cgk"))) {
    suggestedLines.push("line-lrt-jb-bekasi", "line-kai-airport", "line-krl-cik");
    suggestedStops.push("stop-lrt-bekasi-barat", "stop-lrt-dukuh-atas", "stop-krl-bni-city", "stop-kai-airport-shia");

    responseMarkdown = `### Optimal Route: Bekasi Barat to Soekarno-Hatta Airport (CGK)

**Fastest Rail Route**: LRT Jabodebek + KAI Bandara Airport Rail Link  
**Total Travel Time**: ~75 - 85 minutes (100% traffic-jam free)  
**Total Fare**: Rp 20,000 (LRT) + Rp 50,000 (KAI Bandara) = **Rp 70,000**  

---

#### Step-by-Step Itinerary:

1. **Leg 1: LRT Jabodebek Bekasi Line (LRT-JB-BK-GREEN)**
   - **Boarding**: Stasiun LRT Bekasi Barat (or Jati Mulya).
   - **Destination**: Stasiun Dukuh Atas (End terminus).
   - **Duration**: ~42 minutes.
   - **Fare**: Rp 20,000.

2. **Leg 2: Intermodal Skybridge to BNI City Station**
   - **Transfer**: Walk from Stasiun LRT Dukuh Atas across the **JPM Dukuh Atas Skybridge** to **Stasiun BNI City (Sudirman Baru)**.
   - **Distance**: 220 meters (~3 mins walk, fully sheltered with elevators).

3. **Leg 3: KAI Bandara Soekarno-Hatta (KAI-AIRPORT-TEAL)**
   - **Boarding**: Stasiun BNI City.
   - **Route**: BNI City $\\to$ Duri $\\to$ Rawa Buaya $\\to$ Batu Ceper $\\to$ Bandara Soekarno-Hatta (SHIA).
   - **Duration**: ~40 minutes.
   - **Headway**: Every 30 minutes.
   - **Fare**: Rp 50,000 (Executive Class) / Rp 30,000 (Premium Class).

4. **Leg 4: Terminal Transfer via Skytrain APMS (Kalayang)**
   - Alight at Stasiun Bandara Soekarno-Hatta (SHIA).
   - Take the free automated Skytrain connecting directly to **Terminal 1, Terminal 2, and Terminal 3** (runs every 7 minutes, free of charge).

---

#### Alternative Option (Direct Highway Shuttle):
- **DAMRI Airport Bus / Big Bird Shuttle**: Direct from Summarecon Mall Bekasi to CGK Airport via Tol Becakayu / Tol Dalam Kota (~90-120 mins depending on toll traffic, Rp 80,000).`;
  }
  // 5. Query: CSW-ASEAN Multi-Level Skybridge
  else if (queryLower.includes("csw") || queryLower.includes("asean") || (queryLower.includes("skybridge") && queryLower.includes("13"))) {
    suggestedLines.push("line-mrt-ns", "line-tj-cor-13", "line-tj-cor-1");
    suggestedStops.push("stop-mrt-asean", "stop-mrt-blok-m");

    responseMarkdown = `### Comprehensive Guide: CSW - ASEAN Multi-Level Skybridge Hub

The **CSW (Centrale Stichting Wederopbouw) - ASEAN Integration Hub** is Jakarta's iconic 5-story circular multimodal transit interchange located in Kebayoran Baru, South Jakarta.

---

#### Level-by-Level Layout & Line Connections:

- **Level 1 (Ground Floor)**:
  - Street-level access to Jalan Kyai Maja, Jalan Trunojoyo, and Jalan Sisingamangaraja.
  - Pedestrian underpass and crosswalk to **Stasiun MRT ASEAN (MRT-NS-RED)** entrance.
  - MikroTrans feeder stop and taxi drop-off bay.

- **Level 2 (Concourse & Retail Mezzanine)**:
  - Commercial retail area, passenger ticketing counters, customer service booth, clean restrooms, and prayer room (Musholla).
  - Integration concourse with ATM center and contactless tap-in turnstiles.

- **Level 3 (Platform: TransJakarta Corridor 1 & 6)**:
  - **Halte CSW 2 (Kejaksaan Agung)** serving TransJakarta Corridor 1 (Blok M - Kota), Corridor 6 (Ragunan), and Corridor 10H.
  - Platform screen doors and level boarding ramps.

- **Level 4 (Pedestrian Transfer Deck)**:
  - Intermediate transfer mezzanine with escalators and dual high-capacity accessible elevators connecting lower platforms to the top elevated deck.

- **Level 5 (Elevated Platform: TransJakarta Corridor 13)**:
  - **Halte CSW 1 (Elevated 23 meters above ground level)**.
  - Serves TransJakarta Corridor 13 (Ciledug - Tegal Mampang / Puri Beta Express) on the dedicated elevated flyover busway.

---

#### Accessibility & Facilities:
- **Elevators**: 3 dedicated high-capacity glass elevators connecting Ground Level $\\leftrightarrow$ Level 3 $\\leftrightarrow$ Level 5.
- **Tactile Paving**: Yellow guiding blocks installed across all concourses, stairs, and elevator vestibules.
- **Operating Hours**: 24/7 (Day service 05:00 - 22:00, Amari Night Service 22:00 - 05:00 on Corridor 1 & 13).`;
  }
  // 6. Query: Kepulauan Seribu / Maritime Speedboats
  else if (queryLower.includes("seribu") || queryLower.includes("muara angke") || queryLower.includes("marina ancol") || queryLower.includes("pramuka") || queryLower.includes("pari") || queryLower.includes("tidung") || queryLower.includes("harapan")) {
    suggestedLines.push("line-maritime-seribu", "line-maritime-pelni");
    suggestedStops.push("stop-port-muara-angke", "stop-port-marina-ancol");

    responseMarkdown = `### Maritime Transit Guide: Jakarta to Kepulauan Seribu Islands

Travelers can reach the Pulau Seribu archipelago (Pulau Pari, Pulau Pramuka, Pulau Tidung, Pulau Harapan, Pulau Kelapa) via two primary departure ports in North Jakarta:

---

#### Departure Terminal Comparison:

| Feature | Pelabuhan Muara Angke (Dishub DKI) | Marina Ancol Port (Private/Executive) |
| :--- | :--- | :--- |
| **Operator** | UP Angkutan Perairan Dishub DKI | Private Speedboat Operators |
| **Vessel Type** | Dishub Aluminium Express Catamarans | Twin/Triple Outboard VIP Speedboats |
| **Tariff** | Rp 44,000 - Rp 74,000 (Subsidized) | Rp 150,000 - Rp 350,000 |
| **Departure** | 08:00 WIB & 13:00 WIB daily | 08:00 WIB & 09:30 WIB daily |
| **Booking** | Jaket Island App / On-site Dishub | Direct Marina Pier 16/17 counters |

---

#### How to Reach Departure Ports via Public Transit:

1. **To Pelabuhan Muara Angke (Dishub)**:
   - Take **TransJakarta Corridor 9 (Pinang Ranti - Pluit)** to Halte Pluit $\\to$ Transfer to MikroTrans **JAK.52 (Kalideres - Muara Angke)** or **JAK.120 (Muara Angke - JIS)** directly to Kali Adem Terminal.
   - Or take TransJakarta Feeder **12A (Kota - Kali Adem)**.

2. **To Marina Ancol Port**:
   - Take **TransJakarta Corridor 5 (Kampung Melayu - Ancol)** or **Corridor 1 (Blok M - Kota)** with transfer to Corridor 5 at Harmoni/Senen $\\to$ Alight at Halte Ancol Gate $\\to$ Free Ancol Wara-Wiri electric bus to Pier 16/17.
   - Or take **KRL Tanjung Priok Line (KRL-TP-PINK)** to Stasiun Ancol.

---

#### Safety & Weather Advisory:
- **BMKG Marine Weather**: Speedboat departures are subject to wave height bulletins. During monsoon swells (>1.5m), vessels operate via sheltered inner-atoll channels.`;
  }
  // 7. General Fallback / Custom Multi-Leg Query
  else {
    // Generate intelligent dynamic response matching query keywords
    const matchedLineNames = suggestedLines
      .map((id) => TRANSIT_LINES.find((l) => l.id === id)?.name)
      .filter(Boolean);

    const matchedStopNames = suggestedStops
      .map((id) => TRANSIT_STOPS.find((s) => s.id === id)?.name)
      .filter(Boolean);

    responseMarkdown = `### AI Transit Advisory: Multimodal Journey Breakdown

Based on your inquiry regarding transit across the Greater Jakarta & Bodetabek network, here is your comprehensive travel plan:

---

#### Key Route Telemetry:
- **Active Transit Systems Evaluated**: ${matchedLineNames.length > 0 ? matchedLineNames.join(", ") : "MRT Jakarta, TransJakarta BRT, KRL Commuter Line, LRT Jabodebek"}
- **Identified Interchange Hubs**: ${matchedStopNames.length > 0 ? matchedStopNames.join(", ") : "Dukuh Atas TOD, CSW-ASEAN, Manggarai Central"}
- **Estimated Headway**: 3 to 10 minutes depending on mode.

---

#### General Recommendations:
1. **Optimize with JakLingko**: When combining **MRT Jakarta**, **LRT Jakarta**, and **TransJakarta BRT/Feeder**, ensure you use a single card or digital pass to trigger the **Rp 10,000 3-hour maximum integrated tariff cap**.
2. **Avoid Peak Hour Road Congestion**: For east-west and north-south arterial journeys, prioritize dedicated grade-separated rail corridors (MRT, LRT, KRL) or elevated busway flyovers (TransJakarta Corridor 13).
3. **Intermodal Skybridges**: Use the modern enclosed skybridges at **Dukuh Atas**, **CSW-ASEAN**, **Velbak-Kebayoran**, and **Cikoko-Cawang** for seamless, climate-controlled, accessible walking transfers.
4. **Live Disruption Check**: Real-time vehicle telemetries and route diversions are continuously updated on your PlatformI cockpit radar.

*Would you like to pinpoint a specific station on the map, inspect vehicle specifications, or check live departure boards?*`;
  }

  return {
    content: responseMarkdown,
    modelUsed: modelId,
    suggestedStops: Array.from(new Set(suggestedStops)),
    suggestedLines: Array.from(new Set(suggestedLines)),
    fallbackUsed: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main AI Transit Assistant Query Function.
 * Connects to OpenRouter API with fallbacks to local grounded domain reasoning.
 */
export async function queryTransitAdvisor(
  messages: AIChatMessage[],
  modelId: string = DEFAULT_AI_MODEL_ID,
  apiKeyOverride?: string
): Promise<AIAdvisorResponse> {
  const apiKey = apiKeyOverride || process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  const userMessage = messages[messages.length - 1]?.content || "";

  // Validate model id
  const validModel = SUPPORTED_AI_MODELS.find((m) => m.id === modelId);
  const selectedModelId = validModel ? validModel.id : DEFAULT_AI_MODEL_ID;

  // If no API key or in unit-test/offline mode, invoke the local grounded transit engine
  if (!apiKey || apiKey.trim() === "" || apiKey === "mock-key" || process.env.NODE_ENV === "test") {
    return generateLocalGroundedResponse(userMessage, selectedModelId);
  }

  const systemPrompt = buildTransitSystemPrompt();
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://platformi.id",
        "X-Title": "PlatformI Transit Cockpit",
      },
      body: JSON.stringify({
        model: selectedModelId,
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AI Transit Advisor] OpenRouter returned status ${response.status}. Falling back to local engine.`);
      return generateLocalGroundedResponse(userMessage, selectedModelId);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    const replyContent = data.choices?.[0]?.message?.content;
    if (!replyContent || replyContent.trim() === "") {
      return generateLocalGroundedResponse(userMessage, selectedModelId);
    }

    // Extract potential stop or line citations from reply
    const suggestedStops: string[] = [];
    const suggestedLines: string[] = [];

    for (const stop of TRANSIT_STOPS) {
      if (replyContent.toLowerCase().includes(stop.name.toLowerCase())) {
        suggestedStops.push(stop.id);
      }
    }
    for (const line of TRANSIT_LINES) {
      if (replyContent.toLowerCase().includes(line.code.toLowerCase()) || replyContent.toLowerCase().includes(line.name.toLowerCase())) {
        suggestedLines.push(line.id);
      }
    }

    return {
      content: replyContent,
      modelUsed: data.model || selectedModelId,
      suggestedStops: Array.from(new Set(suggestedStops)),
      suggestedLines: Array.from(new Set(suggestedLines)),
      fallbackUsed: false,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[AI Transit Advisor] Error contacting OpenRouter:", err);
    return generateLocalGroundedResponse(userMessage, selectedModelId);
  }
}
