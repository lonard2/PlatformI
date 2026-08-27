/**
 * PlatformI - Multimodal Transportation Systems & Consolidated Hubs Bar
 * Real-time operational status indicators, category filter tabs & collapse/hide toggles,
 * smooth Framer Motion fading animations, viewport-clamped hover preview cards,
 * native horizontal scrollbar with smooth controls, and an unclipped expandable corridor/feeder/mikrobus/tourist tray.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  X,
  Search,
  Check,
  Compass,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Sparkles,
  Camera,
  Crown,
  Globe,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TransitMode, TransitCategory, ServiceOperatingStatus } from "@/types/transit";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";

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
  badgeColor?: string;
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
        shortCode: "MRT Jakarta",
        type: "mode",
        mode: "MRT_JAKARTA",
        icon: Train,
        brandColor: "#E11924",
        badgeLabel: "M",
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
            badgeColor: "#E11924",
          },
        ],
      },
      {
        id: "sys-lrt-jb",
        name: "LRT Jabodebek",
        shortCode: "LRT Jabodebek",
        type: "mode",
        mode: "LRT_JABODEBEK_CIBUBUR",
        icon: TrainTrack,
        brandColor: "#0055A5",
        badgeLabel: "CB · BK",
        description: "Dukuh Atas — Harjamukti (CB) / Jatimulya (BK)",
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
            badgeColor: "#0055A5",
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
            badgeColor: "#009A44",
          },
        ],
      },
      {
        id: "sys-lrt-jkt",
        name: "LRT Jakarta",
        shortCode: "LRT Jakarta",
        type: "mode",
        mode: "LRT_JAKARTA",
        icon: TrainTrack,
        brandColor: "#E30613",
        badgeLabel: "S",
        description: "Pegangsaan Dua — Velodrome Rawamangun",
        operatingHours: "05:30 - 23:00 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal (Headway 10 Mnt)",
        corridorsOrBuildings: [
          {
            code: "S",
            name: "Lin 1 Selatan (Pegangsaan Dua - Velodrome)",
            lineId: "line-lrt-jkt",
            headwayMinutes: 10,
            operatingHours: "05:30 - 23:00 WIB",
            status: "NORMAL",
            statusText: "Normal (10 mnt)",
            fareText: "Rp 5.000 Flat",
            badgeColor: "#E30613",
          },
        ],
      },
      {
        id: "sys-krl",
        name: "KRL Commuter Line Jabodetabek",
        shortCode: "KRL Commuter",
        type: "mode",
        mode: "KRL_BOGOR",
        icon: Train,
        brandColor: "#ED1C24",
        badgeLabel: "B·C·R·T·TP",
        description: "Lin Bogor (B), Cikarang (C), Rangkas (R), Tangerang (T), Priok (TP)",
        operatingHours: "04:00 - 24:00 WIB",
        status: "NORMAL",
        statusReason: "Seluruh 5 Jalur Utama Beroperasi Normal",
        corridorsOrBuildings: [
          {
            code: "B",
            name: "Lin Bogor (Jakarta Kota - Manggarai - Bogor)",
            lineId: "line-krl-bogor",
            headwayMinutes: 5,
            operatingHours: "04:00 - 24:00 WIB",
            status: "NORMAL",
            statusText: "Normal (5-8 mnt)",
            fareText: "Rp 3.000 - Rp 6.000",
            badgeColor: "#ED1C24",
          },
          {
            code: "C",
            name: "Lin Cikarang (Kampung Bandan - Pasar Senen - Cikarang)",
            lineId: "line-krl-cikarang",
            headwayMinutes: 10,
            operatingHours: "04:30 - 23:45 WIB",
            status: "NORMAL",
            statusText: "Normal (10-15 mnt)",
            fareText: "Rp 3.000 - Rp 7.000",
            badgeColor: "#0072CE",
          },
          {
            code: "R",
            name: "Lin Rangkasbitung (Tanah Abang - Serpong - Rangkasbitung)",
            lineId: "line-krl-rangkas",
            headwayMinutes: 10,
            operatingHours: "04:15 - 23:30 WIB",
            status: "NORMAL",
            statusText: "Normal (10-15 mnt)",
            fareText: "Rp 3.000 - Rp 8.000",
            badgeColor: "#00A651",
          },
          {
            code: "T",
            name: "Lin Tangerang (Duri - Tangerang)",
            lineId: "line-krl-tgr",
            headwayMinutes: 12,
            operatingHours: "04:45 - 23:00 WIB",
            status: "NORMAL",
            statusText: "Normal (12 mnt)",
            fareText: "Rp 3.000 - Rp 4.000",
            badgeColor: "#A05EB5",
          },
          {
            code: "TP",
            name: "Lin Tanjung Priok (Jakarta Kota - Ancol - Tanjung Priok)",
            lineId: "line-krl-tpk",
            headwayMinutes: 20,
            operatingHours: "06:00 - 20:00 WIB",
            status: "NORMAL",
            statusText: "Normal (20 mnt)",
            fareText: "Rp 3.000 Flat",
            badgeColor: "#EC008C",
          },
        ],
      },
      {
        id: "sys-whoosh",
        name: "Whoosh Kereta Cepat Jakarta-Bandung",
        shortCode: "Whoosh HSR",
        type: "mode",
        mode: "WHOOSH_HSR",
        icon: Zap,
        brandColor: "#C41230",
        badgeLabel: "W",
        description: "Halim HSR — Karawang — Padalarang — Tegalluar",
        operatingHours: "06:00 - 21:30 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal (48 Perjalanan / Hari)",
        corridorsOrBuildings: [
          {
            code: "W",
            name: "Jalur Cepat KCIC (Stasiun Halim - Padalarang - Tegalluar)",
            lineId: "line-whoosh-hsr",
            headwayMinutes: 30,
            operatingHours: "06:00 - 21:30 WIB",
            status: "NORMAL",
            statusText: "Normal (Jadwal Tetap)",
            fareText: "Rp 200.000 - Rp 300.000 (Dynamic)",
            badgeColor: "#C41230",
          },
        ],
      },
      {
        id: "sys-railink",
        name: "KAI Bandara (Railink Basoetta)",
        shortCode: "KAI Bandara",
        type: "mode",
        mode: "KAI_BANDARA",
        icon: Train,
        brandColor: "#008080",
        badgeLabel: "A",
        description: "Manggarai — BNI City — Duri — Batu Ceper — Bandara Soetta",
        operatingHours: "05:00 - 22:45 WIB",
        status: "NORMAL",
        statusReason: "Beroperasi Normal (Headway 30 Mnt)",
        corridorsOrBuildings: [
          {
            code: "A",
            name: "KAI Bandara Soekarno-Hatta (Manggarai - Bandara CGK)",
            lineId: "line-kai-bandara",
            headwayMinutes: 30,
            operatingHours: "05:00 - 22:45 WIB",
            status: "NORMAL",
            statusText: "Normal (30 mnt)",
            fareText: "Rp 70.000 (Eksekutif)",
            badgeColor: "#008080",
          },
        ],
      },
      {
        id: "sys-kai-jj",
        name: "KAI Jarak Jauh (Antarkota)",
        shortCode: "KAI Intercity",
        type: "mode",
        mode: "KAI_INTERCITY",
        icon: Train,
        brandColor: "#003366",
        badgeLabel: "KAI",
        description: "Gambir & Pasar Senen menuju Cirebon, Semarang, Jogja, Surabaya",
        operatingHours: "24 Jam Sesuai Gapeka",
        status: "NORMAL",
        statusReason: "Jadwal Gapeka Berjalan Tepat Waktu",
        corridorsOrBuildings: [
          {
            code: "GMR",
            name: "Stasiun Gambir (Layanan Eksekutif, Luxury, Panoramic)",
            stopId: "stop-kai-gmr",
            coordinates: [-6.1767, 106.8306],
            headwayMinutes: 45,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Operasional Normal",
            fareText: "Rp 150.000 - Rp 1.200.000",
            badgeColor: "#003366",
          },
          {
            code: "PSE",
            name: "Stasiun Pasar Senen (Layanan Campuran & Ekonomi Komersial)",
            stopId: "stop-kai-pse",
            coordinates: [-6.1747, 106.8443],
            headwayMinutes: 30,
            operatingHours: "24 Jam",
            status: "NORMAL",
            statusText: "Operasional Normal",
            fareText: "Rp 80.000 - Rp 450.000",
            badgeColor: "#003366",
          },
        ],
      },
    ],
  },

  // 2. LAND - BUS, SUB-CORRIDORS, FEEDERS, TOURIST, MIKROTRANS & TERMINALS
  {
    category: "BUS",
    title: "Land — Bus Kota, Feeder, Wisata, MikroTrans & Terminal",
    shortTitle: "Bus & Terminal",
    groupIcon: Bus,
    accentColor: "#06b6d4",
    items: [
      // 2A. BRT Koridor 1-14 & Sub-Koridor
      {
        id: "sys-tj-brt",
        name: "TransJakarta BRT & Sub-Koridor",
        shortCode: "TransJakarta BRT",
        type: "mode",
        mode: "TRANSJAKARTA_BRT",
        icon: Bus,
        brandColor: "#0072BC",
        badgeLabel: "1 - 14",
        description: "14 Koridor Utama & 9 Sub-Koridor Layang / Lintas Wilayah",
        operatingHours: "05:00 - 22:00 WIB (24 Jam AMARI di Koridor 1, 2, 3, 5, 9)",
        status: "NORMAL",
        statusReason: "Seluruh 23 Jalur BRT Beroperasi Normal",
        corridorsOrBuildings: [
          { code: "1", name: "Koridor 1: Blok M — Kota", lineId: "line-tj-cor-1", headwayMinutes: 3, operatingHours: "24 Jam (AMARI)", status: "NORMAL", statusText: "Normal (3-5 mnt)", fareText: "Rp 3.500", badgeColor: "#D9252A" },
          { code: "2", name: "Koridor 2: Pulo Gadung — Monas", lineId: "line-tj-cor-2", headwayMinutes: 4, operatingHours: "24 Jam (AMARI)", status: "NORMAL", statusText: "Normal (4-6 mnt)", fareText: "Rp 3.500", badgeColor: "#0072BC" },
          { code: "2A", name: "Koridor 2A: Pulo Gadung — Rawa Buaya via Juanda", lineId: "line-tj-sub-2a", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#0072BC" },
          { code: "3", name: "Koridor 3: Kalideres — Monas", lineId: "line-tj-cor-3", headwayMinutes: 4, operatingHours: "24 Jam (AMARI)", status: "NORMAL", statusText: "Normal (4-6 mnt)", fareText: "Rp 3.500", badgeColor: "#F37023" },
          { code: "3F", name: "Koridor 3F: Kalideres — Gelora Bung Karno", lineId: "line-tj-sub-3f", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F37023" },
          { code: "4", name: "Koridor 4: Pulo Gadung — Galunggung (Dukuh Atas)", lineId: "line-tj-cor-4", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#782F40" },
          { code: "5", name: "Koridor 5: Kampung Melayu — Ancol", lineId: "line-tj-cor-5", headwayMinutes: 5, operatingHours: "24 Jam (AMARI)", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#ED7624" },
          { code: "5C", name: "Koridor 5C: PGC 1 — Juanda via Matraman", lineId: "line-tj-sub-5c", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#ED7624" },
          { code: "6", name: "Koridor 6: Ragunan — Galunggung", lineId: "line-tj-cor-6", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#22B14C" },
          { code: "6A", name: "Koridor 6A: Ragunan — Monas via Kuningan", lineId: "line-tj-sub-6a", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#22B14C" },
          { code: "6B", name: "Koridor 6B: Ragunan — Monas via Semanggi", lineId: "line-tj-sub-6b", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#22B14C" },
          { code: "7", name: "Koridor 7: Kampung Rambutan — Kampung Melayu", lineId: "line-tj-cor-7", headwayMinutes: 4, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#8B5E3C" },
          { code: "7F", name: "Koridor 7F: Kampung Rambutan — Juanda", lineId: "line-tj-sub-7f", headwayMinutes: 7, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#8B5E3C" },
          { code: "8", name: "Koridor 8: Lebak Bulus — Pasar Baru", lineId: "line-tj-cor-8", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#D12175" },
          { code: "9", name: "Koridor 9: Pinang Ranti — Pluit", lineId: "line-tj-cor-9", headwayMinutes: 4, operatingHours: "24 Jam (AMARI)", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#009344" },
          { code: "9A", name: "Koridor 9A: PGC 2 — Pluit via Latumeten", lineId: "line-tj-sub-9a", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#009344" },
          { code: "10", name: "Koridor 10: Tanjung Priok — PGC Cililitan", lineId: "line-tj-cor-10", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#9B278D" },
          { code: "10H", name: "Koridor 10H: Tanjung Priok — Blok M via Senen", lineId: "line-tj-sub-10h", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#9B278D" },
          { code: "11", name: "Koridor 11: Pulo Gebang — Kampung Melayu", lineId: "line-tj-cor-11", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#2E3192" },
          { code: "12", name: "Koridor 12: Pluit — Tanjung Priok", lineId: "line-tj-cor-12", headwayMinutes: 7, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#8CC63F" },
          { code: "13", name: "Koridor 13: Ciledug — Tendean (Layang Elevated)", lineId: "line-tj-cor-13", headwayMinutes: 5, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal (Layang)", fareText: "Rp 3.500", badgeColor: "#5B67A5" },
          { code: "13C", name: "Koridor 13C: Puri Beta — Dukuh Atas Layang", lineId: "line-tj-sub-13c", headwayMinutes: 6, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#5B67A5" },
          { code: "14", name: "Koridor 14: JIS — Senen Raya", lineId: "line-tj-cor-14", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#E87722" },
        ],
      },

      // 2B. TransJakarta Feeder & Non-BRT
      {
        id: "sys-tj-feeder",
        name: "TransJakarta Feeder (Non-BRT)",
        shortCode: "TJ Non-BRT",
        type: "mode",
        mode: "TRANSJAKARTA_NON_BRT",
        icon: Bus,
        brandColor: "#F58220",
        badgeLabel: "Feeder",
        description: "Bus Pengumpan Terintegrasi Sudirman, Senen, PIK, Rawamangun, dll.",
        operatingHours: "05:00 - 22:00 WIB",
        status: "NORMAL",
        statusReason: "Seluruh Rute Feeder Kota Beroperasi",
        corridorsOrBuildings: [
          { code: "1A", name: "1A: Pantai Maju PIK — Balai Kota", lineId: "line-tj-feeder-1a", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal (10 mnt)", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1B", name: "1B: Stasiun Palmerah — Tosari via Sudirman", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1C", name: "1C: Pesanggrahan — Blok M via Gandaria", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1E", name: "1E: Pondok Labu — Blok M via Fatmawati", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1F", name: "1F: Stasiun Palmerah — Bundaran Senayan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1H", name: "1H: Stasiun Tanah Abang — Stasiun Gondangdia", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1N", name: "1N: Tanah Abang — Blok M via Gandaria", lineId: "line-tj-feeder-1n", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1P", name: "1P: Senen — Blok M via Sudirman", lineId: "line-tj-feeder-1p", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal (10 mnt)", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1Q", name: "1Q: Rempoa — Blok M via Bintaro", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "1R", name: "1R: Senen — Tanah Abang via Kebon Sirih", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "2P", name: "2P: Gondangdia — Senen via Cikini", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "2Q", name: "2Q: Gondangdia — Balai Kota", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "3E", name: "3E: Sentraland Cengkareng — Puri Kembangan", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "4B", name: "4B: Stasiun Manggarai — UI Depok via Pasar Minggu", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "4C", name: "4C: TU Gas Rawamangun — Bundaran Senayan", lineId: "line-tj-feeder-4c", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "4F", name: "4F: Pinang Ranti — Pulo Gadung via Pondok Bambu", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "5B", name: "5B: Stasiun Tebet — BNN Cawang", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "5M", name: "5M: Kampung Melayu — Tanah Abang via Raden Saleh", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "5N", name: "5N: Kampung Melayu — Ragunan via Mampang", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6C", name: "6C: Stasiun Tebet — Karet via Mega Kuningan", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6H", name: "6H: Senen — Lebak Bulus via Cikini & Kuningan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6M", name: "6M: Stasiun Manggarai — Blok M via Rasuna Said", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6N", name: "6N: Ragunan — Blok M via Kemang Raya", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6Q", name: "6Q: Dukuh Atas — Kasablanka via Epicentrum", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "6V", name: "6V: Ragunan — Gelora Bung Karno via Mampang", lineId: "line-tj-feeder-6v", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "7A", name: "7A: Kampung Rambutan — Lebak Bulus", lineId: "line-tj-feeder-7a", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal (10 mnt)", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "7B", name: "7B: Kampung Rambutan — Blok M via Duren Tiga", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "7D", name: "7D: TMII — Pancoran via Ceger", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "7P", name: "7P: Pondok Kelapa — BKN Cawang", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "8D", name: "8D: Joglo — Blok M via Permata Hijau", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "8E", name: "8E: Bintaro — Blok M via Gandaria", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "9D", name: "9D: Pasar Minggu — Tanah Abang via Sahardjo", lineId: "line-tj-feeder-9d", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "9E", name: "9E: Kebayoran Lama — Jelambar via Palmerah", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "10A", name: "10A: Tanjung Priok — Rusun Marunda", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "11D", name: "11D: Pulo Gebang — Pulo Gadung via Penggilingan", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
          { code: "12P", name: "12P: JIS — Stasiun LRT Pegangsaan Dua", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 3.500", badgeColor: "#F58220" },
        ],
      },

      // 2C. RoyalTrans Premium (Bus Reclining Suburban)
      {
        id: "sys-tj-royal",
        name: "RoyalTrans Premium (Suburban Direct)",
        shortCode: "RoyalTrans",
        type: "mode",
        mode: "TRANSJAKARTA_NON_BRT",
        icon: Crown,
        brandColor: "#8B5CF6",
        badgeLabel: "Premium",
        description: "Layanan Bus Premium Reclining Seat & Port USB Tol Jabodetabek",
        operatingHours: "05:30 - 21:00 WIB",
        status: "NORMAL",
        statusReason: "Armada Premium Beroperasi Sesuai Jadwal",
        corridorsOrBuildings: [
          { code: "1T", name: "1T: Cibubur Junction — Blok M via Tol Jagorawi", lineId: "line-tj-royal-1t", headwayMinutes: 20, operatingHours: "05:30 - 21:00 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "1U", name: "1U: TMII Pintu 1 — Balai Kota via Tol", lineId: "line-tj-royal-1u", headwayMinutes: 25, operatingHours: "05:45 - 20:30 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "1K", name: "1K: Cibubur Junction — Blok M via Tol Cijago", headwayMinutes: 20, operatingHours: "05:45 - 20:45 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "6P", name: "6P: Cibubur — Kuningan via Tol Jagorawi", headwayMinutes: 20, operatingHours: "05:30 - 21:00 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "S12", name: "S12: BSD Serpong — Fatmawati MRT", headwayMinutes: 25, operatingHours: "05:45 - 20:30 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "B13", name: "B13: Bekasi Barat — Blok M via Tol Japek", headwayMinutes: 20, operatingHours: "05:30 - 21:00 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "B14", name: "B14: Bekasi Barat — Kuningan via Tol Japek", headwayMinutes: 20, operatingHours: "05:30 - 21:00 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "B23", name: "B23: Bekasi Timur — Manggarai via Tol", headwayMinutes: 25, operatingHours: "05:45 - 20:30 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
          { code: "D31", name: "D31: Cinere — Kuningan via Tol Desari", headwayMinutes: 25, operatingHours: "05:45 - 20:30 WIB", status: "NORMAL", statusText: "Premium", fareText: "Rp 20.000", badgeColor: "#8B5CF6" },
        ],
      },

      // 2D. TransJakarta Bus Wisata (Double Decker Tour - Gratis & Wisata)
      {
        id: "sys-tj-wisata",
        name: "Bus Wisata Jakarta (Double Decker Tour)",
        shortCode: "Bus Wisata",
        type: "mode",
        mode: "TRANSJAKARTA_NON_BRT",
        icon: Camera,
        brandColor: "#EAB308",
        badgeLabel: "Wisata",
        description: "Bus Tingkat Wisata Keliling Landmark Bersejarah Jakarta (Gratis/Komersial)",
        operatingHours: "10:00 - 18:00 WIB (Selasa - Minggu)",
        status: "NORMAL",
        statusReason: "Layanan Bus Tingkat Wisata Beroperasi",
        corridorsOrBuildings: [
          { code: "BW1", name: "BW1: Sejarah Jakarta (Juanda - Monas - Balai Kota - Museum BI - Kota Tua)", headwayMinutes: 20, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis (Tap Kartu)", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW2", name: "BW2: Monas Explorer (Balai Kota - Sarinah - Bundaran HI - Monas)", lineId: "line-tj-wisata-bw2", headwayMinutes: 15, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis (Tingkat)", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW3", name: "BW3: Kesenian & Kuliner (Monas - Harmoni - Gedung Kesenian Jakarta)", headwayMinutes: 30, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW4", name: "BW4: Pencakar Langit (Monas - Sarinah - Tosari - GBK Senayan)", lineId: "line-tj-wisata-bw4", headwayMinutes: 15, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis (Tingkat)", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW5", name: "BW5: Ruang Terbuka Hijau (Monas - Kalijodo Skatepark)", headwayMinutes: 45, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW6", name: "BW6: Cagar Budaya Jakarta (Monas - Lapangan Banteng - Istiqlal - Katedral)", headwayMinutes: 30, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW7", name: "BW7: Belanja Jakarta (Monas - Pasar Baru - Grand Indonesia)", headwayMinutes: 30, operatingHours: "10:00 - 18:00 WIB", status: "NORMAL", statusText: "Gratis", fareText: "Rp 0 (Wisata)", badgeColor: "#EAB308" },
          { code: "BW9", name: "BW9: Kota Tua — Pantai Indah Kapuk (PIK 1 & PIK 2 Tour)", headwayMinutes: 30, operatingHours: "10:00 - 19:00 WIB", status: "NORMAL", statusText: "Komersial", fareText: "Rp 20.000", badgeColor: "#EAB308" },
          { code: "BW10", name: "BW10: Monas — Pantai Maju PIK (Wisata Pesisir)", headwayMinutes: 30, operatingHours: "10:00 - 19:00 WIB", status: "NORMAL", statusText: "Komersial", fareText: "Rp 20.000", badgeColor: "#EAB308" },
        ],
      },

      // 2E. MikroTrans (JakLingko Angkot Modern)
      {
        id: "sys-mikrotrans",
        name: "MikroTrans (JakLingko Angkot Modern)",
        shortCode: "MikroTrans",
        type: "mode",
        mode: "MIKROTRANS",
        icon: CarTaxiFront,
        brandColor: "#00A39D",
        badgeLabel: "JakLingko",
        description: "Feeder Pemukiman & Stasiun (JakLingko 100+ Rute Seluruh Jakarta)",
        operatingHours: "05:00 - 22:00 WIB",
        status: "NORMAL",
        statusReason: "Gratis Tap Kartu JakLingko Beroperasi Normal",
        corridorsOrBuildings: [
          { code: "JAK.01", name: "JAK.01: Tanjung Priok — Plumpang", lineId: "line-tj-mikro-jak01", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.02", name: "JAK.02: Kampung Rambutan — Duren Sawit", lineId: "line-tj-mikro-jak02", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.03", name: "JAK.03: Lebak Bulus — Andara Cinere", lineId: "line-tj-mikro-jak03", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.04", name: "JAK.04: Grogol — Tubagus Angke", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.05", name: "JAK.05: Semper — Rorotan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.06", name: "JAK.06: Kampung Rambutan — Pondok Gede", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.07", name: "JAK.07: Grogol — Tanah Abang via Tawakal", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.08", name: "JAK.08: Roxy — Bendungan Hilir (Benhil)", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.09", name: "JAK.09: Roxy Mas — Karet Tengsin", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.10", name: "JAK.10: Tanah Abang — Kota via Roxy", lineId: "line-tj-mikro-jak10", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.11", name: "JAK.11: Tanah Abang — Kebayoran Lama", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.12", name: "JAK.12: Tanah Abang — Pos Pengumben", lineId: "line-tj-mikro-jak12", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.13", name: "JAK.13: Tanah Abang — Kota Intan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.14", name: "JAK.14: Tanah Abang — Meruya Ilir", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.15", name: "JAK.15: Tanjung Priok — Bulak Turi", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.16", name: "JAK.16: PGC Cililitan — Condet", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.17", name: "JAK.17: Pulo Gadung — Senen via Rawasari", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.18", name: "JAK.18: Kalibata — Kuningan via Mampang", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.19", name: "JAK.19: Pinang Ranti — Kampung Rambutan", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.20", name: "JAK.20: Ciganjur — Lebak Bulus", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.21", name: "JAK.21: Duren Sawit — PGC Cililitan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.22", name: "JAK.22: Dwikora — Penas Kalimalang", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.24", name: "JAK.24: Senen — Pulo Gadung via Kelapa Gading", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.25", name: "JAK.25: Pasar Rebo — Kalisari", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.26", name: "JAK.26: Rawamangun — Duren Sawit", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.27", name: "JAK.27: Pulo Gebang — Rorotan", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.30", name: "JAK.30: Grogol — Meruya Selatan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.31", name: "JAK.31: Blok M — Andara via Pondok Labu", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.32", name: "JAK.32: Petamburan — Rawamangun", lineId: "line-tj-mikro-jak32", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.33", name: "JAK.33: Pulo Gadung — Kota via Cempaka Putih", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.34", name: "JAK.34: Rawamangun — Klender", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.35", name: "JAK.35: Rawamangun — Pangkalan Jati", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.36", name: "JAK.36: Cilangkap — Cililitan", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.37", name: "JAK.37: Pulo Gadung — Setu via Kayu Tinggi", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.38", name: "JAK.38: Bulak Ringin — Kampung Rambutan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.39", name: "JAK.39: Kalimalang — Duren Sawit", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.40", name: "JAK.40: Pulo Gebang — Pasar Modern Harapan Indah", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.41", name: "JAK.41: Kampung Rambutan — Pulogadung", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.42", name: "JAK.42: Kampung Melayu — Pondok Kelapa", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.43", name: "JAK.43: Tongtek — Tebet Eco Park", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.44", name: "JAK.44: Andara — Stasiun Universitas Pancasila", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.45", name: "JAK.45: Lebak Bulus — Ragunan Barat", lineId: "line-tj-mikro-jak45", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.46", name: "JAK.46: Pasar Minggu — Jagakarsa", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.47", name: "JAK.47: Pasar Minggu — Ciganjur", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.48", name: "JAK.48: Stasiun Tebet — Karet Kuningan", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.49", name: "JAK.49: Lebak Bulus — Cipulir via Bintaro", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.50", name: "JAK.50: Kalideres — Puri Kembangan", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.51", name: "JAK.51: Budi Luhur — Taman Kota", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.52", name: "JAK.52: Kalideres — Muara Angke", lineId: "line-tj-mikro-jak52", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.53", name: "JAK.53: Grogol — Pos Pengumben", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.54", name: "JAK.54: Grogol — Benhil via Slipi", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.56", name: "JAK.56: Grogol — Srengseng", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.58", name: "JAK.58: Cengkareng — Rawa Buaya", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.59", name: "JAK.59: Rawamangun — Tanah Merah", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.60", name: "JAK.60: Kelapa Gading — Rusun Kemayoran", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.61", name: "JAK.61: Pulo Gadung — Cempaka Putih", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.64", name: "JAK.64: Lenteng Agung — Aseli", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.71", name: "JAK.71: Kampung Rambutan — Pinang Ranti", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.72", name: "JAK.72: Kampung Rambutan — Pasar Rebo", headwayMinutes: 8, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.73", name: "JAK.73: Jambore — Pasar Rebo", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.74", name: "JAK.74: Rawamangun — Cipinang Muara", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.75", name: "JAK.75: Kampung Pulo — Halim", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.77", name: "JAK.77: Tanjung Priok — Jembatan Item", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.80", name: "JAK.80: Rawa Buaya — Rawa Komak", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.84", name: "JAK.84: Kampung Rambutan — Taman Mini", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.85", name: "JAK.85: Bintara — Cipinang Indah", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.86", name: "JAK.86: Rawamangun — Manggarai via Kayu Manis", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.88", name: "JAK.88: Tanjung Priok — Ancol Barat", lineId: "line-tj-mikro-jak88", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.89", name: "JAK.89: Tanjung Priok — Taman Kota Intan", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.90", name: "JAK.90: Tanjung Priok — Rusun Kemayoran", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.106", name: "JAK.106: Terminal Klender — Kampung Melayu", headwayMinutes: 10, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.110", name: "JAK.110: Rusun Marunda — Kalibaru", headwayMinutes: 15, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.112", name: "JAK.112: Pulo Gadung — Tanah Merah", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.117", name: "JAK.117: Tanjung Priok — Tanah Merah", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
          { code: "JAK.120", name: "JAK.120: JIS — Muara Angke via Pluit", headwayMinutes: 12, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 0 (JakLingko)", badgeColor: "#00A39D" },
        ],
      },

      // 2F. Terminal Bus Terpadu (AKAP Antarkota)
      {
        id: "sys-hub-terminals",
        name: "Terminal Bus Terpadu (AKAP Antarkota)",
        shortCode: "Terminal AKAP",
        type: "building_hub",
        targetStopId: "stop-akap-pgb",
        targetCoordinates: [-6.2125, 106.9532],
        icon: Building2,
        brandColor: "#6366F1",
        badgeLabel: "Terminal",
        description: "Gedung Terminal Pulo Gebang, Kp. Rambutan, Kalideres, Poris",
        operatingHours: "24 Jam",
        status: "NORMAL",
        statusReason: "Pelayanan Penumpang AKAP 24 Jam",
        corridorsOrBuildings: [
          { code: "PGB", name: "Terminal Terpadu Pulo Gebang (Jakarta Timur)", stopId: "stop-akap-pgb", coordinates: [-6.2125, 106.9532], headwayMinutes: 15, operatingHours: "24 Jam", status: "NORMAL", statusText: "Beroperasi Normal (Jawa, Bali, Sumatra)", fareText: "Sesuai PO Bus (Rp 150rb - 650rb)", badgeColor: "#6366F1" },
          { code: "KBR", name: "Terminal Kampung Rambutan (Jakarta Timur)", coordinates: [-6.3092, 106.8821], headwayMinutes: 15, operatingHours: "24 Jam", status: "NORMAL", statusText: "Beroperasi Normal (Jawa Barat & Tengah)", fareText: "Sesuai PO Bus", badgeColor: "#6366F1" },
          { code: "KLD", name: "Terminal Kalideres (Jakarta Barat)", coordinates: [-6.1528, 106.7029], headwayMinutes: 20, operatingHours: "24 Jam", status: "NORMAL", statusText: "Beroperasi Normal (Lintas Sumatra & Banten)", fareText: "Sesuai PO Bus", badgeColor: "#6366F1" },
          { code: "PRS", name: "Terminal Poris Plawad (Kota Tangerang)", coordinates: [-6.1738, 106.6631], headwayMinutes: 25, operatingHours: "24 Jam", status: "NORMAL", statusText: "Beroperasi Normal (Banten & Antarkota)", fareText: "Sesuai PO Bus", badgeColor: "#6366F1" },
        ],
      },

      // 2G. Executive Shuttle Hub
      {
        id: "sys-hub-shuttles",
        name: "Point-to-Point Executive Shuttle Hub",
        shortCode: "Travel Shuttle",
        type: "building_hub",
        targetStopId: "stop-shuttle-fx",
        targetCoordinates: [-6.2255, 106.8041],
        icon: Car,
        brandColor: "#06B6D4",
        badgeLabel: "Pool",
        description: "Pool fX Sudirman, Pancoran, Semanggi (HiAce Premio)",
        operatingHours: "05:00 - 22:00 WIB",
        status: "NORMAL",
        statusReason: "Keberangkatan Tepat Waktu Tiap 30-60 Mnt",
        corridorsOrBuildings: [
          { code: "FX-SDR", name: "Pool fX Sudirman (Cititrans, DayTrans, Jackal)", stopId: "stop-shuttle-fx", coordinates: [-6.2255, 106.8041], headwayMinutes: 30, operatingHours: "05:00 - 22:00 WIB", status: "NORMAL", statusText: "Normal (30 mnt)", fareText: "Rp 120.000 - Rp 185.000 (Bandung)", badgeColor: "#06B6D4" },
          { code: "PCR-JAK", name: "Pool Pancoran / Tebet (Lintas Jawa Barat)", coordinates: [-6.2415, 106.8485], headwayMinutes: 45, operatingHours: "05:30 - 21:30 WIB", status: "NORMAL", statusText: "Normal", fareText: "Rp 110.000 - Rp 175.000", badgeColor: "#06B6D4" },
        ],
      },
    ],
  },

  // 3. AIR - AIRPORTS
  {
    category: "AVIATION",
    title: "Air — Bandara Internasional & Domestik",
    shortTitle: "Bandara",
    groupIcon: Plane,
    accentColor: "#0EA5E9",
    items: [
      {
        id: "sys-hub-airports",
        name: "Bandara Komersial Jabodetabek",
        shortCode: "Bandara CGK & HLP",
        type: "building_hub",
        targetStopId: "stop-air-cgk-t3",
        targetCoordinates: [-6.1256, 106.6558],
        icon: PlaneTakeoff,
        brandColor: "#0EA5E9",
        badgeLabel: "Bandara",
        description: "Soekarno-Hatta (CGK) T1, T2, T3 & Halim Perdanakusuma (HLP)",
        operatingHours: "24 Jam",
        status: "NORMAL",
        statusReason: "Penerbangan Beroperasi Normal Sesuai Jadwal",
        corridorsOrBuildings: [
          { code: "CGK-T3", name: "Bandara Soekarno-Hatta Terminal 3 (Internasional & Garuda)", stopId: "stop-air-cgk-t3", coordinates: [-6.1256, 106.6558], headwayMinutes: 10, operatingHours: "24 Jam", status: "NORMAL", statusText: "Operasional Normal", fareText: "Penerbangan Domestik & Internasional", badgeColor: "#0EA5E9" },
          { code: "CGK-T2", name: "Bandara Soekarno-Hatta Terminal 2 (LCC & Regional)", coordinates: [-6.1275, 106.6521], headwayMinutes: 10, operatingHours: "24 Jam", status: "NORMAL", statusText: "Operasional Normal", fareText: "Penerbangan Domestik", badgeColor: "#0EA5E9" },
          { code: "HLP-JKT", name: "Bandara Halim Perdanakusuma (Jakarta Timur)", coordinates: [-6.2658, 106.8841], headwayMinutes: 20, operatingHours: "06:00 - 22:00 WIB", status: "NORMAL", statusText: "Operasional Normal", fareText: "Penerbangan Domestik & VIP", badgeColor: "#0EA5E9" },
        ],
      },
    ],
  },

  // 4. WATER - PORTS & SEA
  {
    category: "MARITIME",
    title: "Sea — Pelabuhan & Speedboat Kepulauan Seribu",
    shortTitle: "Pelabuhan & Laut",
    groupIcon: Anchor,
    accentColor: "#0284c7",
    items: [
      {
        id: "sys-hub-ports",
        name: "Pelabuhan & Dermaga Penumpang",
        shortCode: "Pelabuhan & Speedboat",
        type: "building_hub",
        targetStopId: "stop-sea-angke",
        targetCoordinates: [-6.1095, 106.7735],
        icon: Ship,
        brandColor: "#0284c7",
        badgeLabel: "Dermaga",
        description: "Dermaga Muara Angke, Marina Ancol, Pelabuhan Tanjung Priok",
        operatingHours: "06:00 - 18:00 WIB",
        status: "NORMAL",
        statusReason: "Cuaca Maritim Jakarta Kondusif (Gelombang Tenang)",
        corridorsOrBuildings: [
          { code: "MRA-AGK", name: "Pelabuhan Muara Angke (Dishub Speedboat Kep. Seribu)", stopId: "stop-sea-angke", coordinates: [-6.1095, 106.7735], headwayMinutes: 60, operatingHours: "06:30 - 15:30 WIB", status: "NORMAL", statusText: "Beroperasi Normal (Cuaca Baik)", fareText: "Rp 44.000 - Rp 74.000 (Dishub)", badgeColor: "#0284c7" },
          { code: "MRN-ACL", name: "Dermaga Marina Ancol (Speedboat Pariwisata)", coordinates: [-6.1185, 106.8325], headwayMinutes: 60, operatingHours: "07:30 - 16:00 WIB", status: "NORMAL", statusText: "Beroperasi Normal", fareText: "Rp 150.000 - Rp 350.000", badgeColor: "#0284c7" },
          { code: "TNK-PRK", name: "Pelabuhan Tanjung Priok (Kapal Penumpang PELNI)", coordinates: [-6.1012, 106.8856], headwayMinutes: 180, operatingHours: "Sesuai Jadwal Sandar", status: "NORMAL", statusText: "Sesuai Jadwal Berlayar", fareText: "Rute Pelayaran Nusantara", badgeColor: "#0369A1" },
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
  const selectAllModes = useTransitStore((state) => state.selectAllModes);
  const clearAllModes = useTransitStore((state) => state.clearAllModes);
  const selectStop = useTransitStore((state) => state.selectStop);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setViewport = useTransitStore((state) => state.setViewport);

  // States
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | TransitCategory>("ALL");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [hoverCardPos, setHoverCardPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [corridorSearchQuery, setCorridorSearchQuery] = useState<string>("");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const barWrapperRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close active tray when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        barWrapperRef.current &&
        !barWrapperRef.current.contains(e.target as Node)
      ) {
        setActiveItemId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const toggleCategoryCollapse = (category: TransitCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleItemToggle = (item: TransitSystemItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoveredItemId(null);
    if (activeItemId === item.id) {
      setActiveItemId(null);
    } else {
      setActiveItemId(item.id);
      setCorridorSearchQuery("");
    }
  };

  const handleItemMouseEnter = (item: TransitSystemItem, e: React.MouseEvent<HTMLButtonElement>) => {
    if (activeItemId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cardWidth = 320;
    const padding = 12;
    let targetLeft = rect.left + rect.width / 2 - cardWidth / 2;

    if (typeof window !== "undefined") {
      targetLeft = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetLeft));
    }

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverCardPos({ left: targetLeft, top: rect.bottom + 6 });
      setHoveredItemId(item.id);
    }, 150);
  };

  const handleItemMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredItemId(null);
  };

  const handleCorridorSelect = (detail: SystemCorridorDetail) => {
    if (detail.stopId) {
      if (detail.coordinates) {
        setViewport(detail.coordinates, 14);
      }
      selectStop(detail.stopId);
      setActiveItemId(null);
    } else if (detail.coordinates) {
      setViewport(detail.coordinates, 14);
      setActiveItemId(null);
    } else if (detail.lineId) {
      selectLine(detail.lineId);
      setActiveItemId(null);
    }
  };

  const activeItem = SYSTEM_GROUPS.flatMap((g) => g.items).find(
    (item) => item.id === activeItemId
  );

  const hoveredItem = SYSTEM_GROUPS.flatMap((g) => g.items).find(
    (item) => item.id === hoveredItemId
  );

  const filteredCorridors = activeItem
    ? activeItem.corridorsOrBuildings.filter(
        (c) =>
          c.name.toLowerCase().includes(corridorSearchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(corridorSearchQuery.toLowerCase())
      )
    : [];

  const visibleGroups = SYSTEM_GROUPS.filter((g) => {
    if (activeCategoryFilter === "ALL") return true;
    return g.category === activeCategoryFilter;
  });

  return (
    <div
      ref={barWrapperRef}
      className="w-full bg-[#080c16]/98 backdrop-blur-2xl border-b border-white/10 z-30 shrink-0 select-none shadow-xl relative transition-all duration-300"
    >
      {/* 1. TOP QUICK CATEGORY SECTOR TABS WITH ANIMATED HIGHLIGHT */}
      <div className="flex items-center justify-between px-3 sm:px-6 pt-1.5 pb-1 border-b border-white/5 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider hidden xs:inline flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> {t.common.filter}:
          </span>

          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`relative px-2.5 py-1 rounded-full transition-all duration-200 text-[11px] font-bold ${
              activeCategoryFilter === "ALL"
                ? "bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 shadow-sm"
            }`}
          >
            {t.navigation.allModes}
          </button>

          {SYSTEM_GROUPS.map((g) => {
            const isFilterActive = activeCategoryFilter === g.category;
            const isCatActiveOnMap = isCategoryActive(g.category);

            return (
              <button
                key={g.category}
                onClick={() => setActiveCategoryFilter(g.category)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 text-[11px] font-bold ${
                  isFilterActive
                    ? "bg-slate-800 border border-cyan-500/50 text-white shadow-sm ring-1 ring-cyan-500/30"
                    : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 shadow-sm"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: isCatActiveOnMap ? g.accentColor : "#475569",
                  }}
                />
                <span>{g.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Global All / Clear Actions & Language Selector */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={selectAllModes}
              className="text-slate-400 hover:text-cyan-300 transition"
            >
              {t.navigation.allModes}
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={clearAllModes}
              className="text-slate-400 hover:text-rose-400 transition"
            >
              {t.common.filter}
            </button>
          </div>

          {/* Quick Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu((v) => !v)}
              className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/90 text-[10px] text-slate-300 hover:text-white transition flex items-center gap-1 font-mono font-bold"
              title={t.common.selectLanguage}
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span className="uppercase">{language}</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-50 w-36 bg-[#0c1222] border border-slate-700 rounded-xl shadow-2xl p-1 space-y-0.5"
                >
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center justify-between transition ${
                        language === lang.code
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      <span className="text-[9px] font-mono opacity-60 uppercase">
                        {lang.flagLabel}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL SCROLLABLE BAR WITH LEFT/RIGHT NAVIGATION CONTROLS */}
      <div className="relative flex items-center">
        {/* Left Scroll Arrow (Desktop) */}
        <button
          onClick={handleScrollLeft}
          title={t.common.scrollLeft}
          aria-label={t.common.scrollLeft}
          className="hidden md:flex absolute left-0 z-20 h-full w-8 items-center justify-center bg-gradient-to-r from-[#080c16] via-[#080c16]/90 to-transparent text-slate-300 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5 drop-shadow" />
        </button>

        {/* Scroll Container with Fading AnimatePresence transitions */}
        <motion.div
          ref={scrollContainerRef}
          layout
          className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-8 py-2 overflow-x-auto transit-scrollbar w-full scroll-smooth"
        >
          <AnimatePresence mode="popLayout">
            {visibleGroups.map((group) => {
              const GroupIcon = group.groupIcon;
              const isCatActive = isCategoryActive(group.category);
              const isCollapsed = collapsedCategories[group.category] || false;

              return (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-2 sm:pr-3 border-r border-white/10 last:border-r-0"
                >
                  {/* Group Category Header Badge with Toggle and Collapse */}
                  <div className="flex items-center rounded-xl bg-slate-950/70 border border-white/10 p-0.5 shrink-0 transition-all">
                    <button
                      onClick={() => toggleCategory(group.category)}
                      title={`Klik untuk Aktifkan / Nonaktifkan Semua ${group.title} di Peta`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                        isCatActive
                          ? "bg-slate-900/90 text-white shadow-md hover:bg-slate-800"
                          : "text-slate-400 hover:text-slate-200 bg-slate-950/80 hover:bg-slate-900 border border-transparent hover:border-white/10 opacity-70 hover:opacity-100"
                      }`}
                      style={{
                        borderLeftColor: isCatActive ? group.accentColor : undefined,
                        borderLeftWidth: isCatActive ? "3.5px" : undefined,
                      }}
                    >
                      <GroupIcon className="w-4 h-4" style={{ color: isCatActive ? group.accentColor : "#64748b" }} />
                      <span className="text-[11px] uppercase tracking-wider font-mono">
                        {group.shortTitle}
                      </span>
                      {isCatActive ? (
                        <Eye className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      )}
                    </button>

                    {/* Minimize / Collapse Group Items Toggle */}
                    <button
                      onClick={(e) => toggleCategoryCollapse(group.category, e)}
                      title={isCollapsed ? "Tampilkan item sektor ini" : "Sembunyikan item sektor ini"}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-md transition"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90 text-slate-500" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sub-group System Items */}
                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isModeSelected = item.mode
                          ? selectedModes.includes(item.mode)
                          : true;
                        const isSelected = activeItemId === item.id;

                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={(e) => handleItemToggle(item, e)}
                            onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                            onMouseLeave={handleItemMouseLeave}
                            title={`${item.name} — ${item.statusReason}`}
                            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 shrink-0 ${
                              isSelected
                                ? "bg-cyan-950/95 border-cyan-400 text-white shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/30 scale-105"
                                : item.type === "building_hub"
                                ? "bg-slate-900/90 border-cyan-500/40 text-slate-100 hover:bg-slate-800 hover:border-cyan-400 hover:shadow-md shadow-sm"
                                : isModeSelected
                                ? "bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800 hover:border-cyan-500/60 hover:shadow-md shadow-sm"
                                : "bg-slate-950/60 border-slate-800/60 text-slate-400 hover:bg-slate-900/90 hover:text-slate-200 hover:border-slate-700 opacity-60 hover:opacity-100"
                            }`}
                          >
                            {/* Prominent Icon with Brand Color Glow */}
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform"
                              style={{
                                backgroundColor: `${item.brandColor}30`,
                                border: `1px solid ${item.brandColor}70`,
                              }}
                            >
                              <ItemIcon className="w-3.5 h-3.5" style={{ color: item.brandColor }} />
                            </div>

                            {/* Labels & Operational Status Indicator Dot */}
                            <div className="flex items-center gap-1.5 text-left">
                              <span className="font-bold text-xs tracking-tight whitespace-nowrap text-white">
                                {item.shortCode}
                              </span>

                              {/* Standardized Route / System Badge */}
                              <span
                                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 hidden sm:inline-block"
                                style={{
                                  backgroundColor: `${item.brandColor}25`,
                                  color: item.brandColor,
                                  border: `1px solid ${item.brandColor}60`,
                                }}
                              >
                                {item.badgeLabel}
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
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                                  HUB
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-semibold">
                                  {item.corridorsOrBuildings.length}
                                </span>
                              )}

                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                  isSelected ? "rotate-180 text-cyan-300" : ""
                                }`}
                              />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Right Scroll Arrow (Desktop) */}
        <button
          onClick={handleScrollRight}
          title={t.common.scrollRight}
          aria-label={t.common.scrollRight}
          className="hidden md:flex absolute right-0 z-20 h-full w-8 items-center justify-center bg-gradient-to-l from-[#080c16] via-[#080c16]/90 to-transparent text-slate-300 hover:text-white transition"
        >
          <ChevronRight className="w-5 h-5 drop-shadow" />
        </button>
      </div>

      {/* 3. VIEWPORT-CLAMPED HOVER PREVIEW CARD (NEVER CUT OFF) */}
      <AnimatePresence>
        {hoveredItem && !activeItemId && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              left: `${hoverCardPos.left}px`,
              top: `${hoverCardPos.top}px`,
              width: "320px",
            }}
            className="z-50 p-3 bg-[#0a0f1d]/98 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/90 pointer-events-none text-slate-100 space-y-2 select-none"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                style={{
                  backgroundColor: `${hoveredItem.brandColor}30`,
                  border: `1px solid ${hoveredItem.brandColor}70`,
                }}
              >
                <hoveredItem.icon className="w-4 h-4" style={{ color: hoveredItem.brandColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{hoveredItem.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono truncate">{hoveredItem.description}</p>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                {hoveredItem.badgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-400 text-[9px]">Jam Operasi:</span>
                <div className="text-slate-200 font-bold truncate">{hoveredItem.operatingHours}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[9px]">Status Layanan:</span>
                <div className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">{hoveredItem.statusReason}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono pt-0.5">
              <span>{hoveredItem.corridorsOrBuildings.length} Koridor/Rute</span>
              <span className="text-slate-400 text-[9px]">Klik untuk buka &rarr;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. UNCLIPPED EXPANDABLE SERVICE DETAIL & CORRIDORS DRAWER TRAY */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full border-t border-cyan-500/30 bg-[#060a14]/98 backdrop-blur-2xl shadow-2xl overflow-hidden p-4 sm:p-5 text-slate-100"
          >
            <div className="max-w-6xl mx-auto space-y-4">
              {/* Tray Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{
                      backgroundColor: `${activeItem.brandColor}30`,
                      border: `1px solid ${activeItem.brandColor}80`,
                    }}
                  >
                    <activeItem.icon
                      className="w-5 h-5"
                      style={{ color: activeItem.brandColor }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {activeItem.name}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {activeItem.badgeLabel}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={{
                          backgroundColor:
                            activeItem.status === "NORMAL"
                              ? "#064e3b"
                              : activeItem.status === "LIMITED"
                              ? "#78350f"
                              : "#334155",
                          borderColor:
                            activeItem.status === "NORMAL"
                              ? "#10b981"
                              : activeItem.status === "LIMITED"
                              ? "#f59e0b"
                              : "#64748b",
                          color:
                            activeItem.status === "NORMAL"
                              ? "#6ee7b7"
                              : activeItem.status === "LIMITED"
                              ? "#fcd34d"
                              : "#cbd5e1",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {activeItem.statusReason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeItem.description} &bull; Jam Operasional:{" "}
                      <strong className="text-slate-200">
                        {activeItem.operatingHours}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {activeItem.mode && (
                    <button
                      onClick={() => activeItem.mode && toggleMode(activeItem.mode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition flex items-center gap-1.5 ${
                        selectedModes.includes(activeItem.mode)
                          ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/40"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {selectedModes.includes(activeItem.mode)
                          ? t.common.activeOnMap
                          : t.common.hiddenOnMap}
                      </span>
                    </button>
                  )}

                  {activeItem.type === "building_hub" && activeItem.targetStopId && (
                    <button
                      onClick={() => {
                        if (activeItem.targetCoordinates) {
                          setViewport(activeItem.targetCoordinates, 14);
                        }
                        if (activeItem.targetStopId) {
                          selectStop(activeItem.targetStopId);
                        }
                        setActiveItemId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{t.navigation.openHubBoard}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveItemId(null)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
                    title={t.common.close}
                    aria-label={t.common.close}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Corridor / Buildings Filter & List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {activeItem.type === "building_hub"
                        ? "Daftar Gedung Terminal, Bandara & Pelabuhan Fisik:"
                        : "Daftar Koridor, Feeder & Rute Layanan:"}
                    </span>
                    <span className="text-cyan-400 font-mono">
                      ({activeItem.corridorsOrBuildings.length} Titik/Rute)
                    </span>
                  </h4>

                  {/* Corridor Search Field */}
                  {activeItem.corridorsOrBuildings.length > 2 && (
                    <div className="relative w-48 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={t.navigation.searchRoutesAndHubs}
                        value={corridorSearchQuery}
                        onChange={(e) => setCorridorSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>

                {/* Grid of Corridors / Building Hubs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredCorridors.length === 0 && (
                    <div className="col-span-full p-4 text-center text-xs text-slate-500 font-mono">
                      {corridorSearchQuery
                        ? `${t.common.search}: "${corridorSearchQuery}" - ${t.navigation.searchRoutesAndHubs}`
                        : t.navigation.searchRoutesAndHubs}
                    </div>
                  )}
                  {filteredCorridors.map((corridor, idx) => {
                    const badgeColor = corridor.badgeColor || activeItem.brandColor;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleCorridorSelect(corridor)}
                        className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/60 transition-all flex items-start justify-between gap-3 group text-left shadow-sm"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-extrabold shrink-0"
                              style={{
                                backgroundColor: `${badgeColor}30`,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}60`,
                              }}
                            >
                              {corridor.code}
                            </span>
                            <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition truncate">
                              {corridor.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{corridor.operatingHours}</span>
                              <span>&bull;</span>
                              <span className="text-cyan-400">
                                {corridor.headwayMinutes} {t.common.minutes}
                              </span>
                            </div>
                            <div className="text-emerald-400 font-semibold truncate">
                              {corridor.fareText}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
