/**
 * PlatformI - Mobile & Tablet Bottom Navigation Bar
 * High-precision thumb-friendly touch navigation for mobile (< 640px) and tablet (< 1024px).
 * 5 equal-weight buttons: Map, Services, Journey, Tickets, Community.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React from "react";
import {
  MapPin,
  Activity,
  Navigation,
  QrCode,
  Users,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";

interface MobileBottomNavProps {
  onOpenAI: () => void;
  onOpenStatus: () => void;
  onOpenJourney?: () => void;
}

export function MobileBottomNav({ onOpenAI, onOpenStatus, onOpenJourney }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const activeDrawer = useTransitStore((state) => state.activeDrawer);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);
  const clearSelection = useTransitStore((state) => state.clearSelection);

  const isWalletActive = activeDrawer === "tickets";
  const isCrowdsourceActive = activeDrawer === "crowdsource";
  const isStatusActive = activeDrawer === "alerts";

  const handleMapClick = () => {
    setActiveDrawer(null);
    clearSelection();
  };

  const handleWalletClick = () => {
    setActiveDrawer(isWalletActive ? null : "tickets");
  };

  const handleCrowdsourceClick = () => {
    setActiveDrawer(isCrowdsourceActive ? null : "crowdsource");
  };

  return (
    <nav
      aria-label={t.navigation.mainNavigation}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c16]/98 backdrop-blur-2xl border-t border-white/15 px-2 py-1.5 flex items-center justify-around shadow-2xl shadow-black safe-area-pb"
    >
      {/* 1. PETA (MAP) */}
      <button
        onClick={handleMapClick}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          !activeDrawer
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[11px] tracking-tight">{t.common.viewOnMap}</span>
      </button>

      {/* 2. LAYANAN & STATUS (SERVICES) */}
      <button
        onClick={onOpenStatus}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isStatusActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Activity className="w-5 h-5" />
        <span className="text-[11px] tracking-tight">{t.statusCenter.tabLive}</span>
      </button>

      {/* 3. RUTE (JOURNEY) */}
      <button
        onClick={onOpenJourney}
        className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all active:scale-95"
      >
        <Navigation className="w-5 h-5" />
        <span className="text-[11px] tracking-tight">{t.common.route}</span>
      </button>

      {/* 4. TIKET (TICKETS / QR) */}
      <button
        onClick={handleWalletClick}
        aria-label={t.ticketing.tapAtGate}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isWalletActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span className="text-[11px] tracking-tight">{t.navigation.ticketing}</span>
      </button>

      {/* 5. KOMUNITAS (CROWDSOURCE) */}
      <button
        onClick={handleCrowdsourceClick}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isCrowdsourceActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[11px] tracking-tight">{t.navigation.crowdsource}</span>
      </button>
    </nav>
  );
}
