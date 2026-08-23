/**
 * PlatformI - Multimodal Transportation Systems & Consolidated Hubs Bar
 * Real-time operational status indicators (Normal, Limited, Off-Hours),
 * interactive hover/click popover showing corridors/lines or consolidated terminal buildings,
 * and 1-tap viewport focus.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Train,
  TrainTrack,
  Zap,
  Bus,
  Car,
  Building2,
  CarTaxiFront,
  Plane,
  PlaneTakeoff,
  Ship,
  Anchor,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TransitMode, TransitCategory, ServiceOperatingStatus } from "@/types/transit";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";

export interface SystemCorridorDetail {
  code: string;
  name: string;
  lineId?: string;
  stopId?: string;
  coordinates?: [number, number];
  headwayMinutes: number;
  operatingHours: string;
  status: ServiceOperatingStatus;
  statusText: string;
  fareText: string;
}

export interface TransitSystemItem {
  id: string;
  name: string;
  shortCode: string;
  type: "mode" | "building_hub";
  mode?: TransitMode;
  targetStopId?: string;
  targetCoordinates?: [number, number];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  brandColor: string;
  badgeLabel: string;
  description: string;
  operatingHours: string;
  status: ServiceOperatingStatus;
  statusReason: string;
  corridorsOrBuildings: SystemCorridorDetail[];
}

export interface TransitSystemGroup {
  category: TransitCategory;
  title: string;
  shortTitle: string;
  groupIcon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  items: TransitSystemItem[];
}

export const SYSTEM_GROUPS: TransitSystemGroup[] = [
  // 1. LAND - REL (RAIL)
  {
    category: "RAIL",
    title: "Land — Rel Perkotaan & Regional",
    shortTitle: "Rel",
    groupIcon: Train,
    accentColor: "#3b82f6",
    items: [
      {
        id: "sys-mrt",
        name: "MRT Jakarta (Ratangga)",
        shortCode: "MRT",
        type: "mode",
        mode: "MRT_JAKARTA",
        icon: Train,
        brandColor: "#E11924",
        badgeLabel: "Metro",
        description: "Lebak Bulus Grab — Bundaran HI BNI",
        operatingHours: "05:00 - 24:00 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal (Headway 5 Mnt)",
        corridorsOrBuildings: [
          {
            code: "M",
            name: "MRT Jalur Utara-Selatan (Lebak Bulus - Bundaran HI)",
            lineId: "line-mrt-ns",
            headwayMinutes: 5,
            operatingHours: "05:00 - 24:00 WIB",
            status: "NORMAL",
            statusText: "Normal (5-10 mnt)",
            fareText: "Rp 3.000 - Rp 14.000 (JakLingko)",
          },
        ],
      },
      {
        id: "sys-lrt-jb",
        name: "LRT Jabodebek",
        shortCode: "LRT JB",
        type: "mode",
        mode: "LRT_JABODEBEK_CIBUBUR",
        icon: TrainTrack,
        brandColor: "#0055A5",
        badgeLabel: "GoA3",
        description: "Dukuh Atas — Harjamukti / Jatimulya",
        operatingHours: "05:15 - 23:30 WIB",
        status: "NORMAL",
        statusReason: "Otomatis Tanpa Masinis Beroperasi Normal",
        corridorsOrBuildings: [
          {
            code: "CB",
            name: "Lin Cibubur (Dukuh Atas - Harjamukti)",
            lineId: "line-lrt-jb-cb",
            headwayMinutes: 7,
            operatingHours: "05:15 - 23:30 WIB",
            status: "NORMAL",
            statusText: "Normal (7-15 mnt)",
            fareText: "Rp 5.000 - Rp 20.000",
          },
          {
            code: "BK",
            name: "Lin Bekasi (Dukuh Atas - Halim HSR - Jatimulya)",
            lineId: "line-lrt-jb-bk",
            headwayMinutes: 7,
            operatingHours: "05:20 - 23:30 WIB",
            status: "NORMAL",
            statusText: "Normal (7-15 mnt)",
            fareText: "Rp 5.000 - Rp 20.000",
          },
        ],
      },
      {
        id: "sys-lrt-jkt",
        name: "LRT Jakarta",
        shortCode: "LRT JKT",
        type: "mode",
        mode: "LRT_JAKARTA",
        icon: TrainTrack,
        brandColor: "#ED1B24",
        badgeLabel: "Light Rail",
        description: "Pegangsaan Dua — Velodrome",
        operatingHours: "05:30 - 23:00 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal (Headway 10 Mnt)",
        corridorsOrBuildings: [
          {
            code: "S",
            name: "LRT Jakarta Fase 1 (Pegangsaan Dua - Velodrome)",
            lineId: "line-lrt-jkt",
            headwayMinutes: 10,
            operatingHours: "05:30 - 23:00 WIB",
            status: "NORMAL",
            statusText: "Normal (10 mnt)",
            fareText: "Flat Rp 5.000",
          },
        ],
      },
      {
        id: "sys-krl",
        name: "KRL Commuter Line",
        shortCode: "KRL",
        type: "mode",
        mode: "KRL_BOGOR",
        icon: Train,
        brandColor: "#ED1C24",
        badgeLabel: "Komuter",
        description: "Bogor, Cikarang Loop, Rangkasbitung, Tangerang",
        operatingHours: "04:30 - 23:45 WIB",
        status: "NORMAL",
        statusReason: "Semua Lin Komuter Beroperasi Normal",
        corridorsOrBuildings: [
          {
            code: "BGR",
            name: "Lin Bogor (Jakarta Kota - Manggarai - Bogor)",
            lineId: "line-krl-bogor",
            headwayMinutes: 5,
            operatingHours: "04:00 - 23:50 WIB",
            status: "NORMAL",
            statusText: "Normal (5-10 mnt)",
            fareText: "Rp 3.000 + Rp 1.000/10km",
          },
          {
            code: "CKR",
            name: "Lin Cikarang (Cikarang - Manggarai - Angke Loop)",
            lineId: "line-krl-cikarang",
            headwayMinutes: 10,
            operatingHours: "04:45 - 23:30 WIB",
            status: "NORMAL",
            statusText: "Normal (10-15 mnt)",
            fareText: "Rp 3.000 + Rp 1.000/10km",
          },
        ],
      },
      {
        id: "sys-whoosh",
        name: "Whoosh High-Speed Rail",
        shortCode: "WHOOSH",
        type: "mode",
        mode: "WHOOSH_HSR",
        icon: Zap,
        brandColor: "#C41230",
        badgeLabel: "350 km/h",
        description: "Halim Megahub — Padalarang — Tegalluar",
        operatingHours: "06:00 - 21:30 WIB",
        status: "NORMAL",
        statusReason: "48 Perjalanan Cepat Harian Tepat Waktu",
        corridorsOrBuildings: [
          {
            code: "HSR",
            name: "KCIC Whoosh (Stasiun Halim - Padalarang - Tegalluar)",
            lineId: "line-whoosh-hsr",
            headwayMinutes: 30,
            operatingHours: "06:00 - 21:30 WIB",
            status: "NORMAL",
            statusText: "Keberangkatan Berjadwal",
            fareText: "Rp 150.000 - Rp 600.000",
          },
        ],
      },
      {
        id: "sys-kai-bandara",
        name: "KAI Bandara SHIA",
        shortCode: "ARL",
        type: "mode",
        mode: "KAI_BANDARA",
        icon: Train,
        brandColor: "#008080",
        badgeLabel: "Airport Rail",
        description: "Manggarai — BNI City — Bandara Soekarno-Hatta",
        operatingHours: "05:00 - 22:45 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal Setiap 30 Menit",
        corridorsOrBuildings: [
          {
            code: "ARL",
            name: "Express Rail Link (Manggarai - BNI City - Bandara SHIA)",
            lineId: "line-kai-bandara",
            headwayMinutes: 30,
            operatingHours: "05:00 - 22:45 WIB",
            status: "NORMAL",
            statusText: "Normal (30 mnt)",
            fareText: "Rp 50.000 / Rp 70.000",
          },
        ],
      },
      {
        id: "sys-kai-jj",
        name: "KAI Antarkota",
        shortCode: "KAI JJ",
        type: "mode",
        mode: "KAI_INTERCITY",
        icon: Train,
        brandColor: "#F26522",
        badgeLabel: "Antarkota",
        description: "Stasiun Gambir & Pasar Senen Express",
        operatingHours: "24 Jam Sesuai Jadwal",
        status: "NORMAL",
        statusReason: "Kereta Antarkota Beroperasi Sesuai Tiket",
        corridorsOrBuildings: [
          {
            code: "KAI-GMB",
            name: "Keberangkatan Stasiun Gambir (Eksekutif & Luxury)",
            headwayMinutes: 60,
            operatingHours: "24 Jam Berjadwal",
            status: "NORMAL",
            statusText: "Tepat Waktu",
            fareText: "Sesuai Kelas & Tujuan",
          },
          {
            code: "KAI-PSE",
            name: "Keberangkatan Stasiun Pasar Senen (Ekonomi & Campuran)",
            headwayMinutes: 60,
            operatingHours: "24 Jam Berjadwal",
            status: "NORMAL",
            statusText: "Tepat Waktu",
            fareText: "Sesuai Kelas & Tujuan",
          },
        ],
      },
    ],
  },

  // 2. LAND - BUS & TERMINAL
  {
    category: "BUS",
    title: "Land — Bus Kota & Simpul Terminal",
    shortTitle: "Bus & Terminal",
    groupIcon: Bus,
    accentColor: "#f59e0b",
    items: [
      {
        id: "sys-tj-brt",
        name: "TransJakarta BRT",
        shortCode: "BRT 1-14",
        type: "mode",
        mode: "TRANSJAKARTA_BRT",
        icon: Bus,
        brandColor: "#D9252A",
        badgeLabel: "Busway",
        description: "Koridor 1–14 Jalur Khusus Steril & AMARI 24 Jam",
        operatingHours: "24 Jam (Siang & Malam AMARI)",
        status: "NORMAL",
        statusReason: "14 Koridor Utama Beroperasi Normal",
        corridorsOrBuildings: [
          {
            code: "K1",
            name: "Koridor 1 (Blok M - Kota)",
            lineId: "line-tj-cor-1",
            headwayMinutes: 3,
            operatingHours: "24 Jam (AMARI)",
            status: "NORMAL",
            statusText: "Normal (3-5 mnt)",
            fareText: "Rp 3.500 (JakLingko)",
          },
          {
            code: "K8",
            name: "Koridor 8 (Lebak Bulus - Pasar Baru)",
            lineId: "line-tj-cor-8",
            headwayMinutes: 6,
            operatingHours: "05:00 - 22:00 WIB",
            status: "NORMAL",
            statusText: "Normal (5-8 mnt)",
            fareText: "Rp 3.500 (JakLingko)",
          },
          {
            code: "K13",
            name: "Koridor 13 (Ciledug - Tendean Layang)",
            lineId: "line-tj-cor-13",
            headwayMinutes: 5,
            operatingHours: "05:00 - 22:00 WIB",
            status: "NORMAL",
            statusText: "Normal (5 mnt)",
            fareText: "Rp 3.500 (JakLingko)",
          },
        ],
      },
      {
        id: "sys-tj-feeder",
        name: "TJ Non-BRT & RoyalTrans",
        shortCode: "FEEDER",
        type: "mode",
        mode: "TRANSJAKARTA_NON_BRT",
        icon: Bus,
        brandColor: "#F58220",
        badgeLabel: "Pengumpan",
        description: "Bus Ramah Difabel Lantai Rendah & RoyalTrans",
        operatingHours: "05:00 - 22:00 WIB",
        status: "NORMAL",
        statusReason: "Rute Pengumpan Beroperasi Penuh",
        corridorsOrBuildings: [
          {
            code: "1E",
            name: "Rute 1E (Pondok Labu - Blok M)",
            headwayMinutes: 10,
            operatingHours: "05:00 - 22:00 WIB",
            status: "NORMAL",
            statusText: "Normal (10 mnt)",
            fareText: "Rp 3.500",
          },
          {
            code: "1N",
            name: "Rute 1N (Tanah Abang - Blok M)",
            headwayMinutes: 12,
            operatingHours: "05:00 - 22:00 WIB",
            status: "NORMAL",
            statusText: "Normal (12 mnt)",
            fareText: "Rp 3.500",
          },
        ],
      },
      {
        id: "sys-mikrotrans",
        name: "MikroTrans (JakLingko)",
        shortCode: "MIKRO",
        type: "mode",
        mode: "MIKROTRANS",
        icon: Car,
        brandColor: "#00A39D",
        badgeLabel: "Gratis Rp 0",
        description: "Angkutan Feeder Lingkungan Tersubsidi",
        operatingHours: "05:00 - 22:00 WIB",
        status: "NORMAL",
        statusReason: "Layanan MikroTrans Gratis Tap Kartu Aktif",
        corridorsOrBuildings: [
          {
            code: "JAK.10",
            name: "JAK.10 (Tanah Abang - Kota)",
            lineId: "line-mikro-jak10",
            headwayMinutes: 6,
            operatingHours: "05:00 - 22:00 WIB",
            status: "NORMAL",
            statusText: "Normal (5-8 mnt)",
            fareText: "Gratis Rp 0 (Wajib Tap)",
          },
        ],
      },
      // Consolidated High-Volume AKAP Building Hub
      {
        id: "sys-akap-terminals",
        name: "Terminal Bus AKAP Terpadu",
        shortCode: "TERMINAL",
        type: "building_hub",
        mode: "AKAP_INTERCITY_BUS",
        targetStopId: "stop-akap-pgb",
        targetCoordinates: [-6.2128, 106.9525],
        icon: Building2,
        brandColor: "#6366F1",
        badgeLabel: "Terminal Bus",
        description: "Pusat Keberangkatan Bus Antarkota Antarprovinsi",
        operatingHours: "24 Jam Operasional",
        status: "NORMAL",
        statusReason: "Semua Terminal Terpadu Beroperasi 24 Jam",
        corridorsOrBuildings: [
          {
            code: "PGB",
            name: "Terminal Terpadu Pulo Gebang (Hub Utama Jawa-Sumatra)",
            stopId: "stop-akap-pgb",
            coordinates: [-6.2128, 106.9525],
            headwayMinutes: 15,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Aktif 24 Jam",
            fareText: "Rute Jawa, Bali, Sumatra",
          },
          {
            code: "KBR",
            name: "Terminal Kampung Rambutan (Jalur Selatan & Barat)",
            coordinates: [-6.3088, 106.8812],
            headwayMinutes: 20,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Aktif 24 Jam",
            fareText: "Rute Jabar, Jateng, Jatim",
          },
          {
            code: "KLD",
            name: "Terminal Kalideres (Jalur Lintas Sumatra & Banten)",
            coordinates: [-6.1525, 106.7025],
            headwayMinutes: 20,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Aktif 24 Jam",
            fareText: "Rute Merak & Sumatra",
          },
        ],
      },
      // Consolidated High-Volume Executive Shuttle Hub
      {
        id: "sys-shuttle-hubs",
        name: "Pool Travel Shuttle Eksekutif",
        shortCode: "SHUTTLE HUB",
        type: "building_hub",
        mode: "EXECUTIVE_SHUTTLE",
        targetStopId: "stop-shuttle-fx",
        targetCoordinates: [-6.2251, 106.8038],
        icon: CarTaxiFront,
        brandColor: "#06B6D4",
        badgeLabel: "Pool-to-Pool",
        description: "Shuttle Travel Tol Antarkota (HiAce Premio / Sprinter)",
        operatingHours: "05:00 - 22:30 WIB",
        status: "NORMAL",
        statusReason: "Keberangkatan Setiap 30-60 Menit",
        corridorsOrBuildings: [
          {
            code: "FX-SDR",
            name: "Pool fX Sudirman (DayTrans & CitiTrans Hub)",
            stopId: "stop-shuttle-fx",
            coordinates: [-6.2251, 106.8038],
            headwayMinutes: 30,
            operatingHours: "05:00 - 22:30 WIB",
            status: "NORMAL",
            statusText: "Beroperasi Normal",
            fareText: "Rp 110.000 - Rp 140.000",
          },
          {
            code: "BRY-BLM",
            name: "Pool Baraya Travel Melawai / Blok M",
            coordinates: [-6.2425, 106.7995],
            headwayMinutes: 45,
            operatingHours: "05:30 - 21:30 WIB",
            status: "NORMAL",
            statusText: "Beroperasi Normal",
            fareText: "Rp 115.000",
          },
        ],
      },
    ],
  },

  // 3. PENERBANGAN (AVIATION)
  {
    category: "AVIATION",
    title: "Penerbangan — Gerbang Bandara Internasional",
    shortTitle: "Bandara",
    groupIcon: Plane,
    accentColor: "#0ea5e9",
    items: [
      {
        id: "sys-airports",
        name: "Bandara Internasional & Skytrain",
        shortCode: "BANDARA",
        type: "building_hub",
        mode: "AIRPORT_COMMERCIAL",
        targetStopId: "stop-shia-t3",
        targetCoordinates: [-6.1256, 106.6558],
        icon: PlaneTakeoff,
        brandColor: "#0EA5E9",
        badgeLabel: "CGK & HLP",
        description: "Soekarno-Hatta (T1, T2, T3 & Kalayang APMS) & Halim",
        operatingHours: "24 Jam Operasional",
        status: "NORMAL",
        statusReason: "Penerbangan Domestik & Internasional Normal",
        corridorsOrBuildings: [
          {
            code: "CGK-T3",
            name: "Bandara Soekarno-Hatta Terminal 3 Ultimate",
            stopId: "stop-shia-t3",
            coordinates: [-6.1256, 106.6558],
            headwayMinutes: 10,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Beroperasi 24 Jam",
            fareText: "Penerbangan Internasional & Garuda",
          },
          {
            code: "CGK-T12",
            name: "Bandara Soekarno-Hatta Terminal 1 & 2",
            coordinates: [-6.1315, 106.6525],
            headwayMinutes: 10,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Beroperasi 24 Jam",
            fareText: "Penerbangan Domestik & Regional",
          },
          {
            code: "HLP",
            name: "Bandara Halim Perdanakusuma (HLP)",
            coordinates: [-6.2668, 106.8908],
            headwayMinutes: 20,
            operatingHours: "05:00 - 23:00 WIB",
            status: "NORMAL",
            statusText: "Beroperasi Normal",
            fareText: "Penerbangan Domestik & VIP",
          },
        ],
      },
    ],
  },

  // 4. PELAYARAN (MARITIME)
  {
    category: "MARITIME",
    title: "Pelayaran — Dermaga Laut & Pelabuhan",
    shortTitle: "Pelabuhan & Laut",
    groupIcon: Ship,
    accentColor: "#06b6d4",
    items: [
      {
        id: "sys-harbors",
        name: "Dermaga Speedboat & Pelabuhan PELNI",
        shortCode: "PELABUHAN",
        type: "building_hub",
        mode: "MARITIME_SPEEDBOAT",
        targetStopId: "stop-maritime-angke",
        targetCoordinates: [-6.1086, 106.7725],
        icon: Anchor,
        brandColor: "#0284C7",
        badgeLabel: "Dermaga & Kapal",
        description: "Muara Angke / Kali Adem, Marina Ancol & Tanjung Priok",
        operatingHours: "06:30 - 16:00 WIB",
        status: "NORMAL",
        statusReason: "Kondisi Gelombang Laut Aman & Kapal Beroperasi",
        corridorsOrBuildings: [
          {
            code: "KLI-ADM",
            name: "Dermaga Kali Adem Muara Angke (Speedboat Dishub)",
            stopId: "stop-maritime-angke",
            coordinates: [-6.1086, 106.7725],
            headwayMinutes: 60,
            operatingHours: "07:00 - 15:30 WIB",
            status: "NORMAL",
            statusText: "Jadwal Pagi & Siang",
            fareText: "Rp 54.000 - Rp 74.000",
          },
          {
            code: "MRN-ACL",
            name: "Dermaga Marina Ancol (Speedboat Pariwisata)",
            coordinates: [-6.1185, 106.8325],
            headwayMinutes: 60,
            operatingHours: "07:30 - 16:00 WIB",
            status: "NORMAL",
            statusText: "Beroperasi Normal",
            fareText: "Rp 150.000 - Rp 350.000",
          },
          {
            code: "TNK-PRK",
            name: "Pelabuhan Tanjung Priok (Kapal Penumpang PELNI)",
            coordinates: [-6.1012, 106.8856],
            headwayMinutes: 180,
            operatingHours: "Sesuai Jadwal Sandar",
            status: "NORMAL",
            statusText: "Sesuai Jadwal Berlayar",
            fareText: "Rute Pelayaran Nusantara",
          },
        ],
      },
    ],
  },
];

export function TransportationSystemBar() {
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const toggleMode = useTransitStore((state) => state.toggleMode);
  const toggleCategory = useTransitStore((state) => state.toggleCategory);
  const isCategoryActive = useTransitStore((state) => state.isCategoryActive);
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectStop = useTransitStore((state) => state.selectStop);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setViewport = useTransitStore((state) => state.setViewport);

  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const barContainerRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        barContainerRef.current &&
        !barContainerRef.current.contains(e.target as Node)
      ) {
        setActivePopoverId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item: TransitSystemItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePopoverId === item.id) {
      setActivePopoverId(null);
    } else {
      setActivePopoverId(item.id);
    }
  };

  const handleCorridorClick = (detail: SystemCorridorDetail) => {
    if (detail.stopId) {
      if (detail.coordinates) {
        setViewport(detail.coordinates, 14);
      }
      selectStop(detail.stopId);
      setActivePopoverId(null);
    } else if (detail.coordinates) {
      setViewport(detail.coordinates, 14);
      setActivePopoverId(null);
    } else if (detail.lineId) {
      selectLine(detail.lineId);
      setActivePopoverId(null);
    }
  };

  return (
    <div
      ref={barContainerRef}
      className="w-full bg-[#080c14]/95 backdrop-blur-2xl border-b border-white/10 z-20 shrink-0 select-none shadow-xl relative"
    >
      <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar">
        {SYSTEM_GROUPS.map((group) => {
          const GroupIcon = group.groupIcon;
          const isCatActive = isCategoryActive(group.category);

          return (
            <div
              key={group.category}
              className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-3 border-r border-white/10 last:border-r-0"
            >
              {/* Group Category Header Badge */}
              <button
                onClick={() => toggleCategory(group.category)}
                title={`Aktifkan / Nonaktifkan Semua ${group.title}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shrink-0 ${
                  isCatActive
                    ? "bg-slate-900/90 text-white border-white/20 shadow-sm"
                    : "bg-slate-950/60 text-slate-400 border-white/5 hover:text-slate-200"
                }`}
                style={{
                  borderLeftColor: isCatActive ? group.accentColor : undefined,
                  borderLeftWidth: isCatActive ? "3px" : undefined,
                }}
              >
                <GroupIcon className="w-3.5 h-3.5" style={{ color: group.accentColor }} />
                <span className="text-[11px] uppercase tracking-wider font-mono">
                  {group.shortTitle}
                </span>
              </button>

              {/* Sub-group System Items */}
              <div className="flex items-center gap-1.5">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isModeSelected = item.mode ? selectedModes.includes(item.mode) : true;
                  const isPopoverOpen = activePopoverId === item.id;
                  const activeFleetCount = item.mode
                    ? simulatedVehicles.filter((v) => v.mode === item.mode).length
                    : 0;

                  return (
                    <div key={item.id} className="relative">
                      <button
                        onClick={(e) => handleItemClick(item, e)}
                        title={`${item.name} — ${item.statusReason}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all transform active:scale-95 ${
                          isPopoverOpen
                            ? "bg-cyan-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-950/50"
                            : item.type === "building_hub"
                            ? "bg-slate-900/90 border-cyan-500/40 text-slate-100 hover:border-cyan-400 shadow-sm"
                            : isModeSelected
                            ? "bg-slate-900/80 border-slate-700 text-white hover:border-slate-500 shadow-sm"
                            : "bg-slate-950/50 border-slate-800/60 text-slate-400 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* Icon with Brand Glow */}
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${item.brandColor}25`,
                            border: `1px solid ${item.brandColor}60`,
                          }}
                        >
                          <ItemIcon className="w-3 h-3" style={{ color: item.brandColor }} />
                        </div>

                        {/* Labels & Operational Status Indicator Dot */}
                        <div className="flex items-center gap-1.5 text-left">
                          <span className="font-bold text-[11px] whitespace-nowrap">
                            {item.shortCode}
                          </span>

                          {/* Live Operational Status Dot */}
                          <span
                            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                            style={{
                              backgroundColor:
                                item.status === "NORMAL"
                                  ? "#10b981"
                                  : item.status === "LIMITED"
                                  ? "#f59e0b"
                                  : "#64748b",
                              boxShadow:
                                item.status === "NORMAL"
                                  ? "0 0 6px #10b981"
                                  : item.status === "LIMITED"
                                  ? "0 0 6px #f59e0b"
                                  : "none",
                            }}
                            title={`Status: ${item.statusReason}`}
                          />

                          {item.type === "building_hub" ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                              HUB
                            </span>
                          ) : activeFleetCount > 0 ? (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {activeFleetCount}
                            </span>
                          ) : null}

                          <ChevronDown
                            className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                              isPopoverOpen ? "rotate-180 text-cyan-300" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Rich Operational Details & Corridors Popover Dropdown */}
                      {isPopoverOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 mt-2 w-80 sm:w-96 p-3.5 bg-[#0b101b]/98 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/90 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-100 space-y-3"
                        >
                          {/* Popover Header */}
                          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${item.brandColor}25`,
                                  border: `1px solid ${item.brandColor}70`,
                                }}
                              >
                                <ItemIcon className="w-4 h-4" style={{ color: item.brandColor }} />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold text-white leading-tight">
                                  {item.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            {/* Mode Toggle Button */}
                            {item.mode && (
                              <button
                                onClick={() => item.mode && toggleMode(item.mode)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                                  isModeSelected
                                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                                    : "bg-slate-900 border-slate-700 text-slate-400"
                                }`}
                              >
                                {isModeSelected ? "Aktif di Peta" : "Sembunyi"}
                              </button>
                            )}
                          </div>

                          {/* Operational Telemetry Highlights */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                            <div>
                              <span className="text-slate-400 text-[10px]">Jam Operasional:</span>
                              <div className="text-slate-200 font-bold">{item.operatingHours}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px]">Status Layanan:</span>
                              <div className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>{item.statusReason}</span>
                              </div>
                            </div>
                          </div>

                          {/* Corridors / Physical Buildings List */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                              <span>
                                {item.type === "building_hub"
                                  ? "Gedung Terminal / Simpul Fisik:"
                                  : "Koridor & Rute Layanan:"}
                              </span>
                              <span className="text-cyan-400">
                                {item.corridorsOrBuildings.length} Titik
                              </span>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                              {item.corridorsOrBuildings.map((corridor, cIdx) => (
                                <button
                                  key={cIdx}
                                  onClick={() => handleCorridorClick(corridor)}
                                  className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/90 hover:border-cyan-500/50 transition flex items-center justify-between gap-2 group"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
                                        style={{
                                          backgroundColor: `${item.brandColor}30`,
                                          color: item.brandColor,
                                        }}
                                      >
                                        {corridor.code}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition">
                                        {corridor.name}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                      <span>{corridor.operatingHours}</span>
                                      <span>&bull;</span>
                                      <span className="text-emerald-400">{corridor.fareText}</span>
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-slate-500 group-hover:text-cyan-400 transition">
                                    <MapPin className="w-3.5 h-3.5" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Footer */}
                          {item.type === "building_hub" && item.targetStopId && (
                            <button
                              onClick={() => {
                                if (item.targetCoordinates) {
                                  setViewport(item.targetCoordinates, 14);
                                }
                                if (item.targetStopId) {
                                  selectStop(item.targetStopId);
                                }
                                setActivePopoverId(null);
                              }}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 flex items-center justify-center gap-1.5 transition"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Buka Papan Keberangkatan Terminal</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
