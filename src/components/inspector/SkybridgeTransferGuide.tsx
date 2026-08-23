/**
 * PlatformI - Intermodal Skybridge Transfer Guide Component
 * Step-by-step pedestrian vector walking guides for Jakarta's major multimodal megahubs:
 * 1. CSW - ASEAN 5-Story Circular Skybridge Integrasi
 * 2. JPM Dukuh Atas Transit Oriented Development (TOD)
 * 3. Halim High-Speed Rail & LRT Jabodebek Skybridge
 * 4. Stasiun Manggarai Central Multi-Level Rail Hub
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis, Lucide SVG icons.
 */

"use client";

import React, { useState } from "react";
import {
  Footprints,
  Clock,
  Navigation,
  Accessibility,
  ArrowRight,
  Sparkles,
  Layers,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Building2,
  Train,
  Bus,
  Zap,
} from "lucide-react";

export interface SkybridgeStep {
  stepNumber: number;
  title: string;
  levelDescription: string;
  distanceMeters: number;
  durationSeconds: number;
  instructions: string;
  facilities: string[];
  isAccessible: boolean;
  transitConnection?: {
    modeName: string;
    lineCode: string;
    colorHex: string;
  };
}

export interface SkybridgeGuideData {
  id: string;
  hubName: string;
  subtitle: string;
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  connectedModes: { name: string; colorHex: string }[];
  overviewDescription: string;
  accessibilityFeatures: string[];
  steps: SkybridgeStep[];
}

export const SKYBRIDGE_HUBS_DATA: Record<string, SkybridgeGuideData> = {
  "csw-asean": {
    id: "csw-asean",
    hubName: "CSW - ASEAN 5-Story Circular Skybridge Integrasi",
    subtitle: "Kebayoran Baru, Jakarta Selatan &bull; Elevation: +18.0 meters",
    totalDistanceMeters: 160,
    totalDurationMinutes: 3.5,
    connectedModes: [
      { name: "MRT Jakarta (ASEAN)", colorHex: "#E11924" },
      { name: "TJ Corridor 13 (CSW 1)", colorHex: "#5B67A5" },
      { name: "TJ Corridor 1 (Kejaksaan Agung)", colorHex: "#D9252A" },
      { name: "MikroTrans JAK.102", colorHex: "#008080" },
    ],
    overviewDescription:
      "A five-story retrofitted circular pedestrian skybridge harmonizing the elevated TransJakarta Corridor 13 (18 meters above ground) with the elevated MRT ASEAN Station and ground-level Corridor 1.",
    accessibilityFeatures: [
      "3x High-Capacity ADA Glass Elevators",
      "Twin High-Speed Escalators on All Levels",
      "Tactile Guiding Paving Throughout",
      "Direct Tap-to-Tap Integrated Fare Gates",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "MRT ASEAN Concourse to Skybridge North Gate",
        levelDescription: "Level 2 (MRT Concourse Level)",
        distanceMeters: 40,
        durationSeconds: 45,
        instructions:
          "Tap out from MRT ASEAN fare gates at Gate B. Proceed directly onto the air-conditioned northern connection span.",
        facilities: ["Fare Gates", "Tactile Paving", "Customer Service Desk"],
        isAccessible: true,
        transitConnection: {
          modeName: "MRT Jakarta",
          lineCode: "M",
          colorHex: "#E11924",
        },
      },
      {
        stepNumber: 2,
        title: "Circular Mezzanine & Commercial Plaza",
        levelDescription: "Level 3 (Circular Hub Intermediate Deck)",
        distanceMeters: 50,
        durationSeconds: 60,
        instructions:
          "Walk through the circular panoramic viewing atrium. Follow green wayfinding signs pointing toward TransJakarta Corridor 13.",
        facilities: ["Retail Kiosks", "Musholla Prayer Room", "Accessible Restrooms"],
        isAccessible: true,
      },
      {
        stepNumber: 3,
        title: "Vertical Ascent to Elevated Busway",
        levelDescription: "Level 3 to Level 5 (+18.0m Elevation)",
        distanceMeters: 30,
        durationSeconds: 50,
        instructions:
          "Take the dual escalators or the central glass elevator directly up to Level 5. The elevator accommodates wheelchairs and strollers.",
        facilities: ["High-Speed Escalator", "ADA Glass Elevator"],
        isAccessible: true,
      },
      {
        stepNumber: 4,
        title: "TransJakarta CSW 1 Boarding Platform",
        levelDescription: "Level 5 (Corridor 13 Elevated Station)",
        distanceMeters: 40,
        durationSeconds: 45,
        instructions:
          "Tap in at the JakLingko integrated turnstiles. Board westbound buses to Ciledug/Puri Beta or eastbound buses to Tegal Mampang.",
        facilities: ["Automated Platform Sliding Doors", "Next-Bus Real-Time Screens"],
        isAccessible: true,
        transitConnection: {
          modeName: "TransJakarta BRT",
          lineCode: "COR-13-PURPLE",
          colorHex: "#5B67A5",
        },
      },
    ],
  },

  "dukuh-atas": {
    id: "dukuh-atas",
    hubName: "Jembatan Penyeberangan Multiguna (JPM) Dukuh Atas TOD",
    subtitle: "Setiabudi, Jakarta Selatan &bull; Span: 250 meters",
    totalDistanceMeters: 250,
    totalDurationMinutes: 4.5,
    connectedModes: [
      { name: "LRT Jabodebek (Dukuh Atas)", colorHex: "#0055A5" },
      { name: "KRL Commuter (Sudirman)", colorHex: "#0072CE" },
      { name: "KAI Bandara (BNI City)", colorHex: "#008080" },
      { name: "MRT Jakarta (Dukuh Atas BNI)", colorHex: "#E11924" },
      { name: "TJ Corridor 4 (Galunggung)", colorHex: "#7E2682" },
    ],
    overviewDescription:
      "A monumental 250-meter covered pedestrian bridge crossing the Ciliwung River and railway corridors, creating a seamless connection between 5 distinct heavy rail, light rail, airport express, and BRT networks.",
    accessibilityFeatures: [
      "Travelators (Moving Walkways)",
      "Wheelchair Ramps with Gentle 1:12 Incline",
      "Tactile Guiding Paths",
      "Air-Conditioned Retail Mezzanine",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "LRT Jabodebek Dukuh Atas Concourse Exit",
        levelDescription: "LRT Station Concourse (Level 2)",
        distanceMeters: 45,
        durationSeconds: 50,
        instructions:
          "Exit the LRT Jabodebek ticket gates. Step directly onto the southern portal of the JPM Dukuh Atas pedestrian bridge.",
        facilities: ["Automated Ticket Vending Machines", "Tactile Paving"],
        isAccessible: true,
        transitConnection: {
          modeName: "LRT Jabodebek",
          lineCode: "LRT-JB-CB-BLUE",
          colorHex: "#0055A5",
        },
      },
      {
        stepNumber: 2,
        title: "Ciliwung River Cross-Span Walkway",
        levelDescription: "JPM Main Bridge Deck",
        distanceMeters: 120,
        durationSeconds: 110,
        instructions:
          "Traverse the main travelator walkway over the Ciliwung River. Enjoy panoramic views of the Sudirman skyline and Dukuh Atas transit plaza.",
        facilities: ["Travelators", "Security Staff Posts", "Bicycle Ramps"],
        isAccessible: true,
      },
      {
        stepNumber: 3,
        title: "Stasiun Sudirman KRL & BNI City Junction",
        levelDescription: "JPM Northern Interchange Portal",
        distanceMeters: 50,
        durationSeconds: 60,
        instructions:
          "Turn right for direct escalator down to KRL Sudirman Platform 1/2, or proceed straight across for KAI Bandara BNI City Airport Rail.",
        facilities: ["Down-Escalators", "Elevator to KRL Platforms"],
        isAccessible: true,
        transitConnection: {
          modeName: "KRL Commuter Line",
          lineCode: "KRL-CIK-BLUE",
          colorHex: "#0072CE",
        },
      },
      {
        stepNumber: 4,
        title: "Underground Walkway to MRT Dukuh Atas BNI",
        levelDescription: "Subterranean Pedestrian Tunnel",
        distanceMeters: 35,
        durationSeconds: 40,
        instructions:
          "Descend via elevator or stairs to the underground pedestrian concourse connecting to MRT Dukuh Atas BNI Station.",
        facilities: ["Direct Underground Tunnel", "Ticketing Gates"],
        isAccessible: true,
        transitConnection: {
          modeName: "MRT Jakarta",
          lineCode: "M",
          colorHex: "#E11924",
        },
      },
    ],
  },

  "halim-hsr": {
    id: "halim-hsr",
    hubName: "Halim High-Speed Rail & LRT Jabodebek Skybridge",
    subtitle: "Makasar, Jakarta Timur &bull; Span: 180 meters",
    totalDistanceMeters: 180,
    totalDurationMinutes: 2.5,
    connectedModes: [
      { name: "Whoosh HSR (Halim)", colorHex: "#C41230" },
      { name: "LRT Jabodebek (Halim)", colorHex: "#009A44" },
      { name: "Airport Feeder (HLP Link)", colorHex: "#0284C7" },
    ],
    overviewDescription:
      "A fully enclosed, climate-controlled aerial link connecting the second-floor departure concourse of Whoosh High-Speed Rail with the LRT Jabodebek Halim Station platform.",
    accessibilityFeatures: [
      "Enclosed Climate-Controlled Glass Walkway",
      "Wide Baggage & Wheelchair Corridors",
      "Direct Baggage Cart Access",
      "Zero-Step Elevation Transition",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Whoosh Halim Arrival / Departure Concourse",
        levelDescription: "Whoosh Station Level 2",
        distanceMeters: 40,
        durationSeconds: 40,
        instructions:
          "From the Whoosh arrival hall, follow the prominent green LRT Jabodebek signage toward the western skybridge portal.",
        facilities: ["Baggage Racks", "Flight & Train Telemetry Displays"],
        isAccessible: true,
        transitConnection: {
          modeName: "Whoosh HSR",
          lineCode: "WHOOSH-HSR-RED",
          colorHex: "#C41230",
        },
      },
      {
        stepNumber: 2,
        title: "Climate-Controlled Aerial Skywalk",
        levelDescription: "Enclosed Skybridge Span",
        distanceMeters: 100,
        durationSeconds: 80,
        instructions:
          "Walk through the glass skybridge overlooking the Jakarta-Cikampek Tollway. Flat, smooth flooring optimized for rolling heavy luggage.",
        facilities: ["Air Conditioning", "Emergency Intercom Posts"],
        isAccessible: true,
      },
      {
        stepNumber: 3,
        title: "LRT Jabodebek Stasiun Halim Concourse",
        levelDescription: "LRT Halim Platform Level",
        distanceMeters: 40,
        durationSeconds: 30,
        instructions:
          "Tap in at the LRT ticket gates. Ascend to Platform 1 for Bekasi/Jatimulya bound trains or Platform 2 for Dukuh Atas Central bound trains.",
        facilities: ["LRT Ticket Gates", "Escalators & Elevators to Platforms"],
        isAccessible: true,
        transitConnection: {
          modeName: "LRT Jabodebek",
          lineCode: "LRT-JB-BK-GREEN",
          colorHex: "#009A44",
        },
      },
    ],
  },

  "manggarai-hub": {
    id: "manggarai-hub",
    hubName: "Stasiun Manggarai Central Multi-Level Rail Hub",
    subtitle: "Tebet, Jakarta Selatan &bull; Multi-Level Rail Junction",
    totalDistanceMeters: 190,
    totalDurationMinutes: 3.5,
    connectedModes: [
      { name: "KRL Bogor Line (Upper Level)", colorHex: "#ED1C24" },
      { name: "KRL Cikarang Line (Ground Level)", colorHex: "#0072CE" },
      { name: "KAI Bandara SHIA Express", colorHex: "#008080" },
      { name: "TJ Feeder 4B / 6M", colorHex: "#D9252A" },
    ],
    overviewDescription:
      "Indonesia's largest multi-level central rail junction separating elevated Bogor Line commuter services from ground-level Cikarang loopline and Airport Express services.",
    accessibilityFeatures: [
      "High-Capacity Vertical Escalator Banks",
      "Dedicated Mobility Elevators to All Platforms",
      "Wide Central Concourse Floor",
      "Automated Platform Safety Markings",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "KRL Bogor Line Elevated Platform (Level 3)",
        levelDescription: "Platforms 9, 10, 11, 12, 13 (Elevated)",
        distanceMeters: 50,
        durationSeconds: 50,
        instructions:
          "Disembark from Bogor Line train. Proceed toward the central platform escalator bank leading down to the main concourse.",
        facilities: ["Directional Overhead Signage", "Elevator to Concourse"],
        isAccessible: true,
        transitConnection: {
          modeName: "KRL Commuter Line",
          lineCode: "KRL-BOGOR-RED",
          colorHex: "#ED1C24",
        },
      },
      {
        stepNumber: 2,
        title: "Central Multi-Modal Concourse (Level 2)",
        levelDescription: "Mezzanine Distribution Floor",
        distanceMeters: 80,
        durationSeconds: 75,
        instructions:
          "Navigate across the spacious distribution concourse. Follow signs for Platform 1-8 (Cikarang/Airport Express) or West Exit for TransJakarta busway.",
        facilities: ["Customer Service Center", "ATM Center", "Retail & Cafe"],
        isAccessible: true,
      },
      {
        stepNumber: 3,
        title: "KRL Cikarang & KAI Bandara Platforms (Ground Level)",
        levelDescription: "Platforms 1 - 8 (Ground Level)",
        distanceMeters: 60,
        durationSeconds: 55,
        instructions:
          "Descend via designated escalator or elevator to ground platforms. Platforms 7 & 8 host KAI Bandara Airport Express with dedicated lounge.",
        facilities: ["Airport Rail Dedicated Lounge", "Tactile Paving"],
        isAccessible: true,
        transitConnection: {
          modeName: "KAI Bandara",
          lineCode: "KAI-AIRPORT-TEAL",
          colorHex: "#008080",
        },
      },
    ],
  },
};

interface SkybridgeTransferGuideProps {
  initialHubId?: string;
  onClose?: () => void;
}

export function SkybridgeTransferGuide({
  initialHubId = "csw-asean",
  onClose,
}: SkybridgeTransferGuideProps) {
  const [selectedHubKey, setSelectedHubKey] = useState<string>(
    SKYBRIDGE_HUBS_DATA[initialHubId] ? initialHubId : "csw-asean"
  );
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  const hubData = SKYBRIDGE_HUBS_DATA[selectedHubKey] || SKYBRIDGE_HUBS_DATA["csw-asean"];

  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. HUB SELECTOR PILLS */}
      <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {Object.entries(SKYBRIDGE_HUBS_DATA).map(([key, data]) => {
          const isSelected = selectedHubKey === key;
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedHubKey(key);
                setExpandedStep(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{data.hubName.split(" ")[0]} Hub</span>
            </button>
          );
        })}
      </div>

      {/* 2. HUB OVERVIEW HEADER */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              Skybridge Vector Guide
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {hubData.hubName}
          </h3>
          <p
            className="text-xs text-slate-400 font-mono"
            dangerouslySetInnerHTML={{ __html: hubData.subtitle }}
          />
        </div>

        {/* Quick Stats: Total Distance & Duration */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <Footprints className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Distance</span>
              <strong className="text-white">{hubData.totalDistanceMeters} meters</strong>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Est. Walk</span>
              <strong className="text-emerald-400">{hubData.totalDurationMinutes} mins</strong>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 col-span-2 sm:col-span-1 flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Access</span>
              <strong className="text-purple-300">100% Barrier-Free</strong>
            </div>
          </div>
        </div>

        {/* Connected Mode Badges */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Connected Transit Lines:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hubData.connectedModes.map((mode, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-950 border border-slate-800 flex items-center gap-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: mode.colorHex }}
                />
                <span className="text-slate-200">{mode.name}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800/80">
          {hubData.overviewDescription}
        </p>
      </div>

      {/* 3. STEP-BY-STEP VECTOR PATH ACCORDION */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2 px-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Step-by-Step Walking Route ({hubData.steps.length} Nodes)</span>
        </h4>

        {hubData.steps.map((step) => {
          const isExpanded = expandedStep === step.stepNumber;

          return (
            <div
              key={step.stepNumber}
              className={`rounded-xl border transition-all overflow-hidden ${
                isExpanded
                  ? "bg-slate-900/90 border-cyan-500/40 shadow-lg"
                  : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              {/* Step Header Accordion Trigger */}
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                className="w-full p-3.5 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Step Number Circle */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      isExpanded
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {step.stepNumber}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{step.title}</span>
                      {step.transitConnection && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono font-normal"
                          style={{
                            backgroundColor: `${step.transitConnection.colorHex}25`,
                            color: step.transitConnection.colorHex,
                            border: `1px solid ${step.transitConnection.colorHex}50`,
                          }}
                        >
                          {step.transitConnection.lineCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {step.levelDescription} &bull; {step.distanceMeters}m ({step.durationSeconds}s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Step Expanded Content */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 text-xs border-t border-slate-800/60 animate-fadeIn">
                  <p className="text-slate-300 leading-relaxed">
                    {step.instructions}
                  </p>

                  {/* Amenities on this step */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Wayfinding Equipment & Amenities:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {step.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. ACCESSIBILITY COMPLIANCE BOX */}
      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
          <Accessibility className="w-4 h-4 text-purple-400" />
          <span>Accessibility Guarantee & ADA Standards</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
          {hubData.accessibilityFeatures.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
