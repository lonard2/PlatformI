/**
 * PlatformI - Station, Hub, Terminal & Port Detail Sheet (Inspector)
 * Features real-time departure/arrival boards with search & category filters,
 * interactive vehicle linkage and tracking, facilities and universal accessibility matrix,
 * and integrated skybridge transfer guides with standardized authentic transit iconography and colors.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Accessibility,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Layers2,
  Compass,
  Train,
  TrainTrack,
  Bus,
  Car,
  Plane,
  Ship,
  Zap,
  Footprints,
  Baby,
  Heart,
  Bike,
  CreditCard,
  Coffee,
  HelpCircle,
  Search,
  ChevronDown,
  Gauge,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Stop, Line, TransitMode, CrowdDensityLevel, DepartureBoardItem, Vehicle } from "@/types/transit";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { SkybridgeTransferGuide, SKYBRIDGE_HUBS_DATA } from "./SkybridgeTransferGuide";
import { HUB_DESTINATIONS_DATA } from "@/lib/data/hub-destinations";

interface HubDetailSheetProps {
  stopId: string | null;
  onClose?: () => void;
}

type HubTabType = "departures" | "destinations" | "facilities" | "skybridge";

// Authentic TransJakarta Official Corridor Color Mapping
const TJ_CORRIDOR_COLORS: Record<string, { colorHex: string; name: string }> = {
  "1": { colorHex: "#D9252A", name: "Koridor 1 (Blok M - Kota)" },
  "2": { colorHex: "#0072BC", name: "Koridor 2 (Pulo Gadung - Monas)" },
  "2A": { colorHex: "#0072BC", name: "Koridor 2A (Pulo Gadung - Rawa Buaya)" },
  "3": { colorHex: "#F37023", name: "Koridor 3 (Kalideres - Monas)" },
  "3F": { colorHex: "#F37023", name: "Koridor 3F (Kalideres - GBK)" },
  "4": { colorHex: "#782F40", name: "Koridor 4 (Pulo Gadung - Galunggung)" },
  "5": { colorHex: "#ED7624", name: "Koridor 5 (Kampung Melayu - Ancol)" },
  "5C": { colorHex: "#ED7624", name: "Koridor 5C (PGC 1 - Juanda)" },
  "6": { colorHex: "#22B14C", name: "Koridor 6 (Ragunan - Galunggung)" },
  "6A": { colorHex: "#22B14C", name: "Koridor 6A (Ragunan - Monas via Kuningan)" },
  "6B": { colorHex: "#22B14C", name: "Koridor 6B (Ragunan - Monas via Semanggi)" },
  "7": { colorHex: "#8B5E3C", name: "Koridor 7 (Kampung Rambutan - Kampung Melayu)" },
  "7F": { colorHex: "#8B5E3C", name: "Koridor 7F (Kampung Rambutan - Juanda)" },
  "8": { colorHex: "#D12175", name: "Koridor 8 (Lebak Bulus - Pasar Baru)" },
  "9": { colorHex: "#009344", name: "Koridor 9 (Pinang Ranti - Pluit)" },
  "9A": { colorHex: "#009344", name: "Koridor 9A (PGC 2 - Pluit)" },
  "10": { colorHex: "#9B278D", name: "Koridor 10 (Tanjung Priok - PGC)" },
  "10H": { colorHex: "#9B278D", name: "Koridor 10H (Tanjung Priok - Blok M)" },
  "11": { colorHex: "#2E3192", name: "Koridor 11 (Pulo Gebang - Kampung Melayu)" },
  "12": { colorHex: "#8CC63F", name: "Koridor 12 (Pluit - Tanjung Priok)" },
  "13": { colorHex: "#5B67A5", name: "Koridor 13 (Ciledug - Tegal Mampang Layang)" },
  "13C": { colorHex: "#5B67A5", name: "Koridor 13C (Puri Beta - Dukuh Atas)" },
  "14": { colorHex: "#E87722", name: "Koridor 14 (JIS - Senen Raya)" },
};

/**
 * Returns authentic standardized icon and color for a specific transit mode or line
 */
function getStandardizedModeMeta(mode: TransitMode, lineCode?: string, lineId?: string, lines?: Line[]) {
  // 1. Direct line lookup if line list or lineId is available
  if (lines && (lineId || lineCode)) {
    const foundLine = lines.find((l) => (lineId && l.id === lineId) || (lineCode && l.code === lineCode));
    if (foundLine) {
      let icon = Train;
      if (foundLine.category === "BUS") icon = Bus;
      else if (foundLine.category === "AVIATION") icon = Plane;
      else if (foundLine.category === "MARITIME") icon = Ship;
      else if (foundLine.mode === "WHOOSH_HSR") icon = Zap;
      else if (foundLine.mode === "MIKROTRANS" || foundLine.mode === "EXECUTIVE_SHUTTLE") icon = Car;

      return {
        colorHex: foundLine.colorHex,
        icon,
        name: foundLine.name,
      };
    }
  }

  // 2. Specific Line Code matching for TransJakarta BRT Corridors 1-14
  if (lineCode) {
    const cleanCode = lineCode.toUpperCase().replace(/^TJ-/, "");
    if (TJ_CORRIDOR_COLORS[cleanCode]) {
      return {
        colorHex: TJ_CORRIDOR_COLORS[cleanCode].colorHex,
        icon: Bus,
        name: `TransJakarta ${TJ_CORRIDOR_COLORS[cleanCode].name}`,
      };
    }
  }

  // 3. MikroTrans JakLingko
  if (lineCode?.startsWith("JAK.") || mode === "MIKROTRANS") {
    return {
      colorHex: "#00A39D",
      icon: Car,
      name: lineCode ? `MikroTrans ${lineCode}` : "MikroTrans (JakLingko)",
    };
  }

  // 4. RoyalTrans Premium AC Express
  if (lineCode?.startsWith("ROYAL-") || lineCode === "1K" || lineCode === "1T" || lineCode === "6P") {
    return {
      colorHex: "#8B5CF6",
      icon: Bus,
      name: lineCode ? `RoyalTrans ${lineCode}` : "RoyalTrans Premium",
    };
  }

  // 5. TransJakarta Feeder & Non-BRT
  if (
    mode === "TRANSJAKARTA_NON_BRT" ||
    (lineCode && /^(1[A-R]|2[A-Z]|3[A-Z]|4[A-Z]|5[A-Z]|6[A-Z]|7[A-Z]|8[A-Z]|9[A-Z]|10[A-Z]|11[A-Z]|12[A-Z]|S\d+|D\d+|B\d+)/i.test(lineCode) && !TJ_CORRIDOR_COLORS[lineCode])
  ) {
    return {
      colorHex: "#F58220",
      icon: Bus,
      name: lineCode ? `Feeder Non-BRT ${lineCode}` : "TransJakarta Feeder",
    };
  }

  // 6. Modal Specific Palette
  switch (mode) {
    case "MRT_JAKARTA":
      return { colorHex: "#E11924", icon: Train, name: "MRT Jakarta" };
    case "LRT_JABODEBEK_CIBUBUR":
      return { colorHex: "#0055A5", icon: TrainTrack, name: "LRT Jabodebek Cibubur" };
    case "LRT_JABODEBEK_BEKASI":
      return { colorHex: "#009A44", icon: TrainTrack, name: "LRT Jabodebek Bekasi" };
    case "LRT_JAKARTA":
      return { colorHex: "#E30613", icon: TrainTrack, name: "LRT Jakarta" };
    case "KRL_BOGOR":
      return { colorHex: "#ED1C24", icon: Train, name: "KRL Lin Bogor" };
    case "KRL_CIKARANG":
      return { colorHex: "#0072CE", icon: Train, name: "KRL Lin Cikarang" };
    case "KRL_RANGKASBITUNG":
      return { colorHex: "#00A651", icon: Train, name: "KRL Lin Rangkasbitung" };
    case "KRL_TANGERANG":
      return { colorHex: "#A05EB5", icon: Train, name: "KRL Lin Tangerang" };
    case "KRL_TANJUNG_PRIOK":
      return { colorHex: "#EC008C", icon: Train, name: "KRL Lin Tanjung Priok" };
    case "WHOOSH_HSR":
      return { colorHex: "#C41230", icon: Zap, name: "Whoosh HSR" };
    case "KAI_BANDARA":
      return { colorHex: "#008080", icon: Train, name: "KAI Bandara" };
    case "KAI_INTERCITY":
      return { colorHex: "#003366", icon: Train, name: "KAI Antarkota" };
    case "TRANSJAKARTA_BRT":
      return { colorHex: "#0072BC", icon: Bus, name: "TransJakarta BRT" };
    case "AKAP_INTERCITY_BUS":
      return { colorHex: "#6366F1", icon: Bus, name: "Bus AKAP Antarkota" };
    case "EXECUTIVE_SHUTTLE":
      return { colorHex: "#06B6D4", icon: Car, name: "Executive Travel Shuttle" };
    case "AIRPORT_COMMERCIAL":
      return { colorHex: "#0EA5E9", icon: Plane, name: "Aviation Commercial Flight" };
    case "MARITIME_SPEEDBOAT":
      return { colorHex: "#0284C7", icon: Ship, name: "Speedboat Kepulauan Seribu" };
    case "MARITIME_PELNI":
      return { colorHex: "#0369A1", icon: Ship, name: "Kapal Penumpang PELNI" };
    default:
      return { colorHex: "#38bdf8", icon: Train, name: "Transit" };
  }
}

/**
 * Generates dynamic departure board items for any station in the network
 */
function generateDepartureBoard(stop: Stop, lines: Line[]): DepartureBoardItem[] {
  const departures: DepartureBoardItem[] = [];
  const connectedLines = lines.filter(
    (l) => l.id === stop.lineId || stop.connectedLineIds.includes(l.id)
  );

  const now = new Date();

  connectedLines.forEach((line, lineIdx) => {
    [0, 1, 2].forEach((offsetIdx) => {
      const minutesOffset = offsetIdx * line.headwayMinutes + (lineIdx * 3);
      const scheduledDate = new Date(now.getTime() + minutesOffset * 60000);
      const isDelayed = offsetIdx === 2 && lineIdx % 2 === 1;
      const estimatedDate = isDelayed
        ? new Date(scheduledDate.getTime() + 6 * 60000)
        : scheduledDate;

      const scheduledStr = scheduledDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });

      const estimatedStr = estimatedDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });

      const status =
        offsetIdx === 0
          ? "BOARDING"
          : isDelayed
          ? "DELAYED"
          : offsetIdx === 1
          ? "ON_TIME"
          : "ON_TIME";

      const platformNumber = ((lineIdx * 2 + offsetIdx) % 6) + 1;
      const platformStr =
        line.category === "AVIATION"
          ? `Gate ${platformNumber + 10}`
          : line.category === "MARITIME"
          ? `Dermaga ${platformNumber}`
          : line.category === "BUS"
          ? `Bay ${platformNumber}`
          : `Peron ${platformNumber}`;

      const crowdLevels: CrowdDensityLevel[] = [
        "LEVEL_1_MANY_SEATS",
        "LEVEL_2_FEW_SEATS",
        "LEVEL_3_STANDING_ONLY",
      ];

      // Dynamic Trainset & Run Number calculation based on mode
      let runNumber = `Run ${line.code}-0${offsetIdx + 1}`;
      let trainsetNumber: string | undefined = undefined;
      let totalTrainsets: number | undefined = undefined;
      let carFormation: string | undefined = undefined;
      let depotHome: string | undefined = undefined;
      let fleetNumber: string | undefined = undefined;
      let licensePlate: string | undefined = undefined;
      let operatorName: string | undefined = undefined;

      if (line.category === "RAIL") {
        if (line.mode === "MRT_JAKARTA") {
          runNumber = `M-${101 + offsetIdx * 2 + lineIdx}`;
          trainsetNumber = `TS-0${(offsetIdx % 16) + 1}`;
          totalTrainsets = 16;
          carFormation = "6 Kereta (4M2T)";
          depotHome = "Depo MRT Lebak Bulus";
          operatorName = "PT MRT Jakarta (Perseroda)";
        } else if (line.mode === "WHOOSH_HSR") {
          runNumber = `G10${12 + offsetIdx * 4}`;
          trainsetNumber = `CR400AF-220${(offsetIdx % 11) + 1}`;
          totalTrainsets = 11;
          carFormation = "8 Kereta High-Speed (4M4T)";
          depotHome = "Depo KCIC Tegalluar, Bandung";
          operatorName = "PT Kereta Cepat Indonesia China (KCIC)";
        } else if (line.mode === "LRT_JABODEBEK_CIBUBUR" || line.mode === "LRT_JABODEBEK_BEKASI") {
          const isBekasi = line.mode === "LRT_JABODEBEK_BEKASI";
          runNumber = isBekasi ? `BK-${301 + offsetIdx * 3}` : `CB-${201 + offsetIdx * 3}`;
          trainsetNumber = `TS-0${(offsetIdx % 31) + 8}`;
          totalTrainsets = 31;
          carFormation = "6 Kereta Articulated GoA3 (4M2T)";
          depotHome = "Depo LRT Jabodebek Jatimulya, Bekasi";
          operatorName = "PT Kereta Api Indonesia (LRT Jabodebek)";
        } else if (line.mode === "LRT_JAKARTA") {
          runNumber = `S-${101 + offsetIdx * 2}`;
          trainsetNumber = `TS-0${(offsetIdx % 8) + 1}`;
          totalTrainsets = 8;
          carFormation = "2 Kereta Light Rail (1M1T)";
          depotHome = "Depo LRT Pegangsaan Dua, Kelapa Gading";
          operatorName = "PT LRT Jakarta (Jakpro Group)";
        } else if (line.mode.startsWith("KRL_")) {
          runNumber = `KA-${2040 + offsetIdx * 4 + lineIdx}`;
          trainsetNumber = `SF12-JR205-C0${(offsetIdx % 10) + 1}`;
          totalTrainsets = 120;
          carFormation = "12 Kereta Stainless Steel (6M6T)";
          depotHome = "Depo KRL Bukit Duri / Manggarai";
          operatorName = "PT Kereta Commuter Indonesia (KAI Commuter)";
        } else if (line.mode === "KAI_BANDARA") {
          runNumber = `A-${10 + offsetIdx * 2}`;
          trainsetNumber = `EA203-0${(offsetIdx % 10) + 1}`;
          totalTrainsets = 10;
          carFormation = "6 Kereta Airport Express";
          depotHome = "Depo Manggarai";
          operatorName = "PT KAI Bandara (Railink)";
        } else if (line.mode === "KAI_INTERCITY") {
          runNumber = `KA-${1 + offsetIdx * 2}`;
          trainsetNumber = `CC206-13-42 / K1-NewGen`;
          totalTrainsets = 30;
          carFormation = "9 Kereta Eksekutif New Gen + 1 Luxury + 1 Pembangkit";
          depotHome = "Depo Kereta Cipinang, Jakarta Timur";
          operatorName = "PT Kereta Api Indonesia (Persero)";
        }
      } else if (line.category === "BUS") {
        if (line.mode === "MIKROTRANS") {
          runNumber = `JAK-${line.code.replace(/^JAK\./, "")}-0${offsetIdx + 1}`;
          fleetNumber = `KWK-${1000 + lineIdx * 25 + offsetIdx * 4}`;
          licensePlate = `B ${1000 + lineIdx * 25 + offsetIdx * 4} TQN`;
          depotHome = "Pool KWK / Kencana MikroTrans";
          operatorName = "JakLingko (Koperasi Wahana Kalpika)";
        } else if (line.mode === "AKAP_INTERCITY_BUS") {
          runNumber = `AKAP-${line.code}-0${offsetIdx + 1}`;
          fleetNumber = `BUS-AKAP-${200 + lineIdx * 10 + offsetIdx * 3}`;
          licensePlate = `B ${7200 + lineIdx * 15 + offsetIdx * 2} SGA`;
          depotHome = "Terminal Terpadu Pulo Gebang / Kp. Rambutan";
          operatorName = "PO Sinar Jaya / Rosalia Indah / Harapan Jaya";
        } else if (line.mode === "EXECUTIVE_SHUTTLE") {
          runNumber = `SHT-${line.code}-0${offsetIdx + 1}`;
          fleetNumber = `SHUTTLE-HIACE-${10 + lineIdx * 5 + offsetIdx}`;
          licensePlate = `D ${1400 + lineIdx * 20 + offsetIdx * 4} DTR`;
          depotHome = "Pool fX Sudirman / Blora Dukuh Atas";
          operatorName = "DayTrans / CitiTrans Executive Travel";
        } else {
          // Standard TransJakarta BRT & Feeder
          runNumber = `Run ${line.code}-0${offsetIdx + 1}`;
          fleetNumber = `TJ-${700 + lineIdx * 10 + offsetIdx * 4}`;
          licensePlate = `B ${7000 + lineIdx * 20 + offsetIdx * 4} TJK`;
          depotHome = "Pool TransJakarta Cawang / Pinang Ranti";
          operatorName = "PT Transportasi Jakarta";
        }
      } else if (line.category === "AVIATION") {
        runNumber = `GA-${400 + lineIdx * 20 + offsetIdx * 2}`;
        fleetNumber = "PK-GFA (Boeing 777-300ER)";
        depotHome = "Terminal 3 Soekarno-Hatta (CGK)";
        operatorName = "Garuda Indonesia / Citilink";
      } else if (line.category === "MARITIME") {
        runNumber = line.mode === "MARITIME_PELNI" ? `PELNI-${offsetIdx + 1}` : `BOAT-${offsetIdx + 1}`;
        fleetNumber = line.mode === "MARITIME_PELNI" ? "KM Kelud (14.665 GT)" : "Speedboat Marina Express 08";
        depotHome = line.mode === "MARITIME_PELNI" ? "Pelabuhan Tanjung Priok" : "Dermaga Muara Angke / Marina Ancol";
        operatorName = line.mode === "MARITIME_PELNI" ? "PT PELNI (Persero)" : "Dinas Perhubungan DKI Jakarta";
      }

      departures.push({
        tripId: `trip-${line.id}-${offsetIdx}`,
        lineCode: line.code,
        lineName: line.name,
        destination: line.name.includes("(") ? line.name.split("(")[1].replace(")", "") : line.name,
        mode: line.mode,
        scheduledTime: scheduledStr,
        estimatedTime: estimatedStr,
        status,
        platform: platformStr,
        crowdLevel: crowdLevels[(lineIdx + offsetIdx) % crowdLevels.length],
        runNumber,
        trainsetNumber,
        totalTrainsets,
        carFormation,
        depotHome,
        fleetNumber,
        licensePlate,
        operatorName,
        vehicleCode: trainsetNumber || fleetNumber || line.code,
      });
    });
  });

  return departures.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

function getMatchingSkybridgeId(stop: Stop): string | null {
  const name = stop.name.toLowerCase();
  const id = stop.id.toLowerCase();

  if (name.includes("csw") || name.includes("asean") || id.includes("asn")) {
    return "csw-asean";
  }
  if (
    name.includes("dukuh atas") ||
    name.includes("sudirman") ||
    id.includes("dka")
  ) {
    return "dukuh-atas";
  }
  if (name.includes("halim") || id.includes("hlm")) {
    return "halim-hsr";
  }
  if (name.includes("manggarai") || id.includes("mgg")) {
    return "manggarai-hub";
  }

  return null;
}

export function HubDetailSheet({ stopId, onClose }: HubDetailSheetProps) {
  const allStops = useTransitStore((state) => state.allStops);
  const allLines = useTransitStore((state) => state.allLines);
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectVehicle = useTransitStore((state) => state.selectVehicle);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setViewport = useTransitStore((state) => state.setViewport);
  const clearSelection = useTransitStore((state) => state.clearSelection);
  const { t } = useTranslation();

  const stop = allStops.find((s) => s.id === stopId);
  const skybridgeHubId = stop ? getMatchingSkybridgeId(stop) : null;

  const [activeTab, setActiveTab] = useState<HubTabType>("departures");
  const [departureFilter, setDepartureFilter] = useState<string>("ALL");
  const [departureSearch, setDepartureSearch] = useState<string>("");
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const destinationGroups = stop ? HUB_DESTINATIONS_DATA[stop.id] || null : null;
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    destinationGroups && destinationGroups[0] ? destinationGroups[0].id : ""
  );

  const departureBoard = useMemo(() => {
    if (!stop) return [];
    return generateDepartureBoard(stop, allLines);
  }, [stop, allLines]);

  if (!stop) return null;

  const connectedLines = allLines.filter(
    (l) => l.id === stop.lineId || stop.connectedLineIds.includes(l.id)
  );

  const filteredDepartures = departureBoard.filter((item) => {
    const matchesSearch =
      item.destination.toLowerCase().includes(departureSearch.toLowerCase()) ||
      item.lineCode.toLowerCase().includes(departureSearch.toLowerCase()) ||
      item.platform.toLowerCase().includes(departureSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (departureFilter === "ALL") return true;
    if (departureFilter === "RAIL") {
      return (
        item.mode.includes("MRT") ||
        item.mode.includes("LRT") ||
        item.mode.includes("KRL") ||
        item.mode.includes("WHOOSH") ||
        item.mode.includes("INTERCITY") ||
        item.mode.includes("BANDARA")
      );
    }
    if (departureFilter === "BUS") {
      return item.mode === "TRANSJAKARTA_BRT" || item.mode === "TRANSJAKARTA_NON_BRT" || item.mode === "MIKROTRANS";
    }
    if (departureFilter === "INTERCITY") {
      return item.mode === "AKAP_INTERCITY_BUS" || item.mode === "EXECUTIVE_SHUTTLE" || item.mode === "KAI_INTERCITY";
    }
    return true;
  });

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      clearSelection();
    }
  };

  const handleTrackVehicle = (item: DepartureBoardItem) => {
    // Find simulated vehicle on this line or mode
    const matchedVehicle = (simulatedVehicles || []).find((v) => v.mode === item.mode);
    if (matchedVehicle) {
      setViewport([matchedVehicle.currentLatitude, matchedVehicle.currentLongitude], 15);
      selectVehicle(matchedVehicle.id);
    } else {
      // Highlight line
      const matchedLine = allLines.find((l) => l.code === item.lineCode || l.mode === item.mode);
      if (matchedLine) {
        selectLine(matchedLine.id);
      }
    }
  };

  const activeGroup = destinationGroups?.find((g) => g.id === selectedGroupId) || destinationGroups?.[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-end lg:justify-start lg:items-end p-0 lg:p-4">
        {/* Mobile Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto lg:hidden"
        />

        {/* The Hub Detail Sheet Container */}
        <motion.aside
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 140 || info.velocity.y > 400) {
              handleClose();
            }
          }}
          className="pointer-events-auto w-full lg:w-[520px] max-h-[85vh] lg:max-h-[calc(100vh-5rem)] flex flex-col bg-[#090d16]/98 backdrop-blur-2xl border border-white/15 rounded-t-3xl lg:rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        >
          {/* Mobile Drag Handle */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1 lg:hidden">
            <div className="w-12 h-1.5 rounded-full bg-slate-700/80 cursor-grab" />
          </div>

          {/* 1. HEADER SECTION */}
          <div className="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-950/90 border border-cyan-500/40 text-cyan-300">
                  {stop.code}
                </span>
                {stop.isInterchange && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/80 border border-purple-500/40 text-purple-300">
                    Simpul Transit Terpadu
                  </span>
                )}
                {skybridgeHubId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                    JPM Skybridge
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {stop.name}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </span>
                {stop.platformType && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-300">{stop.platformType}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              aria-label="Tutup detail stasiun"
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connected Lines Badges with Standardized Colors */}
          <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider shrink-0 mr-1">
              Layanan:
            </span>
            {connectedLines.map((line) => {
              const meta = getStandardizedModeMeta(line.mode, line.code, line.id, allLines);
              return (
                <span
                  key={line.id}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 shadow-sm"
                  style={{
                    backgroundColor: `${meta.colorHex}25`,
                    color: meta.colorHex,
                    border: `1px solid ${meta.colorHex}70`,
                  }}
                >
                  {line.code}
                </span>
              );
            })}
          </div>

          {/* 2. TAB NAVIGATION BAR */}
          <div className="px-4 pt-2 border-b border-slate-800/80 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("departures")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "departures"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t.hubInspector.tabDepartures}</span>
            </button>

            {destinationGroups && destinationGroups.length > 0 && (
              <button
                onClick={() => setActiveTab("destinations")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "destinations"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t.hubInspector.tabDestinations}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("facilities")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "facilities"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Accessibility className="w-3.5 h-3.5" />
              <span>{t.hubInspector.tabFacilities}</span>
            </button>

            {skybridgeHubId && (
              <button
                onClick={() => setActiveTab("skybridge")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "skybridge"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>{t.hubInspector.tabSkybridge}</span>
              </button>
            )}
          </div>

          {/* 3. SCROLLABLE TAB CONTENT BODY */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* TAB 1: REAL-TIME DEPARTURE BOARDS WITH SEARCH & SELECTION */}
            {activeTab === "departures" && (
              <div className="space-y-3">
                {/* Search & Filter Controls */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari rute, tujuan, peron..."
                      value={departureSearch}
                      onChange={(e) => setDepartureSearch(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-mono">
                    {[
                      { id: "ALL", label: "Semua" },
                      { id: "RAIL", label: "Rel & Kereta" },
                      { id: "BUS", label: "Bus & Feeder" },
                      { id: "INTERCITY", label: "Antarkota" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setDepartureFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                          departureFilter === f.id
                            ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold"
                            : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Papan Informasi Keberangkatan Langsung</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live GPS Telemetry</span>
                  </span>
                </div>

                {filteredDepartures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 font-mono">
                    Tidak ada jadwal yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  filteredDepartures.map((item, idx) => {
                    const meta = getStandardizedModeMeta(item.mode, item.lineCode, undefined, allLines);
                    const ModeIcon = meta.icon;
                    const isExpanded = expandedTripId === item.tripId;

                    let statusBadge = {
                      label: "Tepat Waktu",
                      color: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
                      icon: CheckCircle2,
                    };

                    if (item.status === "BOARDING") {
                      statusBadge = {
                        label: "Boarding",
                        color: "bg-amber-950/80 border-amber-500/40 text-amber-400 animate-pulse",
                        icon: DoorOpen,
                      };
                    } else if (item.status === "DELAYED") {
                      statusBadge = {
                        label: "Terlambat",
                        color: "bg-rose-950/80 border-rose-500/40 text-rose-400",
                        icon: AlertTriangle,
                      };
                    }

                    const StatusIcon = statusBadge.icon;
                    const matchedVehicle = (simulatedVehicles || []).find((v) => v.mode === item.mode);

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? "bg-slate-900/95 border-cyan-500/50 shadow-lg shadow-cyan-950/30"
                            : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Departure Row Header Button */}
                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : item.tripId)}
                          className="w-full p-3.5 flex items-center justify-between gap-3 text-left transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Standardized Mode Icon */}
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                              style={{
                                backgroundColor: `${meta.colorHex}25`,
                                border: `1px solid ${meta.colorHex}70`,
                              }}
                            >
                              <ModeIcon className="w-4 h-4" style={{ color: meta.colorHex }} />
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0"
                                  style={{
                                    backgroundColor: `${meta.colorHex}20`,
                                    color: meta.colorHex,
                                    border: `1px solid ${meta.colorHex}60`,
                                  }}
                                >
                                  {item.lineCode}
                                </span>
                                {item.runNumber && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shrink-0">
                                    {item.runNumber}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-white tracking-tight truncate">
                                  {item.destination}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                                <span className="text-slate-300 font-semibold">{item.platform}</span>
                                <span>&bull;</span>
                                <span>Est: <strong className="text-cyan-300">{item.estimatedTime} WIB</strong></span>
                                {item.trainsetNumber && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-slate-400 hidden sm:inline">{item.trainsetNumber}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-xs font-mono font-bold text-white">
                              {item.scheduledTime}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${statusBadge.color}`}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {statusBadge.label}
                            </span>
                          </div>
                        </button>

                        {/* Expandable Live Vehicle, Timetable & Run Detail Drawer */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-3.5 pb-3.5 pt-1 border-t border-white/10 bg-slate-950/90 space-y-2.5 text-xs font-mono"
                            >
                              {/* Run & Trainset Specifics Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                                {item.runNumber && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">
                                      {item.mode.includes("MRT") || item.mode.includes("LRT") || item.mode.includes("KRL") || item.mode.includes("WHOOSH") || item.mode.includes("INTERCITY")
                                        ? "Nomor Perjalanan (KA):"
                                        : "Nomor Dinas (Rit):"}
                                    </span>
                                    <span className="text-cyan-300 font-bold">{item.runNumber}</span>
                                  </div>
                                )}

                                {item.trainsetNumber && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Nomor Rangkaian:</span>
                                    <span className="text-white font-bold">{item.trainsetNumber}</span>
                                  </div>
                                )}

                                {item.totalTrainsets && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Total Armada Jalur:</span>
                                    <span className="text-emerald-400 font-bold">{item.totalTrainsets} Trainset</span>
                                  </div>
                                )}

                                {item.carFormation && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Formasi Gerbong (SF):</span>
                                    <span className="text-slate-200 font-bold truncate block">{item.carFormation}</span>
                                  </div>
                                )}

                                {item.fleetNumber && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Nomor Bodi / Lambung:</span>
                                    <span className="text-white font-bold">{item.fleetNumber}</span>
                                  </div>
                                )}

                                {item.licensePlate && (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Plat Polisi:</span>
                                    <span className="text-amber-300 font-bold">{item.licensePlate}</span>
                                  </div>
                                )}

                                {item.depotHome && (
                                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400">Depo / Pool Operasi:</span>
                                    <span className="text-slate-300 font-bold">{item.depotHome}</span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Status Operasional:</span>
                                  <span className="text-slate-200 font-bold truncate">
                                    {matchedVehicle ? matchedVehicle.name : `${meta.name} Active Unit`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Kepadatan Penumpang:</span>
                                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>{matchedVehicle ? matchedVehicle.crowdLevel.replace(/LEVEL_\d_/, "") : "Tersedia Tempat Duduk"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleTrackVehicle(item)}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>Lacak di Peta</span>
                                </button>

                                {matchedVehicle && (
                                  <button
                                    onClick={() => {
                                      selectVehicle(matchedVehicle.id);
                                    }}
                                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Spesifikasi Armada</span>
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: DESTINATIONS & REGIONAL OPERATORS FOR HIGH-VOLUME HUBS */}
            {activeTab === "destinations" && destinationGroups && activeGroup && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {destinationGroups.map((grp) => (
                    <button
                      key={grp.id}
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                        selectedGroupId === grp.id
                          ? "bg-cyan-950/90 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/40"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {grp.groupName}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  {activeGroup.destinations.map((dest, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/40 transition space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {dest.city}
                          </h4>
                          {dest.terminalOrAirport && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {dest.terminalOrAirport}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shrink-0">
                          {dest.priceRangeRp}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/60">
                        {dest.operators.map((op, oIdx) => (
                          <span
                            key={oIdx}
                            className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 font-medium"
                          >
                            {op}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                        <span>{t.hubInspector.tripDuration}: <strong className="text-slate-200">{dest.travelDurationEst}</strong></span>
                        <span className="text-cyan-400 font-bold">{dest.dailyTripsCount} {t.hubInspector.destinationsPerDay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: FACILITIES & UNIVERSAL ACCESSIBILITY MATRIX */}
            {activeTab === "facilities" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Accessibility className="w-4 h-4 text-purple-400" />
                    <span>{t.hubInspector.accessibilityMatrix}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Lift Penumpang:</span>
                      {stop.accessibleElevator ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.hubInspector.available}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">{t.hubInspector.notAvailable}</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Tactile Paving:</span>
                      {stop.tactilePaving ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.hubInspector.blindStandard}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">{t.hubInspector.inInstallation}</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Ramp Kursi Roda:</span>
                      {stop.wheelchairRamp ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t.hubInspector.safeGentleSlope}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Tidak Ada</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Tipe Peron:</span>
                      <span className="text-cyan-300 font-bold text-[11px]">
                        {stop.platformType || "Standar"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>{t.hubInspector.stationFacilitiesTitle}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {stop.facilities.map((facilityKey, fIdx) => {
                      let formatted = facilityKey.replace(/_/g, " ");
                      if (facilityKey === "PRAYER_ROOM") formatted = "Prayer Room (Musholla)";
                      if (facilityKey === "TACTILE_PAVING") formatted = "Tactile Paving (Ubin Pemandu)";

                      return (
                        <span
                          key={fIdx}
                          className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                          <span>{formatted}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SKYBRIDGE MULTI-MODAL TRANSFER GUIDE */}
            {activeTab === "skybridge" && skybridgeHubId && (
              <SkybridgeTransferGuide initialHubId={skybridgeHubId} />
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
