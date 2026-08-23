/**
 * PlatformI - Mobile & Tablet Bottom Navigation Bar
 * High-precision thumb-friendly touch navigation for mobile (< 640px) and tablet (< 1024px).
 * Features an elevated prominent central "Tiket & QR Masuk" button for 1-tap turnstile gate scanning.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React from "react";
import {
  MapPin,
  Layers,
  QrCode,
  Users,
  Sparkles,
  Wallet,
  Activity,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";

interface MobileBottomNavProps {
  onOpenAI: () => void;
  onOpenStatus: () => void;
}

export function MobileBottomNav({ onOpenAI, onOpenStatus }: MobileBottomNavProps) {
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
      aria-label="Navigasi Utama Penumpang"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c16]/98 backdrop-blur-2xl border-t border-white/15 px-3 py-1.5 flex items-center justify-around shadow-2xl shadow-black select-none safe-area-pb"
    >
      {/* 1. PETA (MAP) */}
      <button
        onClick={handleMapClick}
        className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-xl transition-all active:scale-95 ${
          !activeDrawer
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">{t.common.viewOnMap}</span>
      </button>

      {/* 2. LAYANAN & STATUS (SERVICES) */}
      <button
        onClick={onOpenStatus}
        className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-xl transition-all active:scale-95 ${
          isStatusActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Activity className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">{t.statusCenter.tabLive}</span>
      </button>

      {/* 3. CENTER ELEVATED ACTION BUTTON: TIKET & SCAN QR */}
      <div className="relative -top-4 flex flex-col items-center">
        <button
          onClick={handleWalletClick}
          aria-label={t.ticketing.tapAtGate}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 transform active:scale-90 shadow-xl border ${
            isWalletActive
              ? "bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 border-white shadow-cyan-500/60 ring-4 ring-cyan-500/30"
              : "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white border-cyan-300/40 shadow-cyan-900/60 hover:shadow-cyan-500/40"
          }`}
        >
          <QrCode className="w-7 h-7" />
        </button>
        <span
          className={`text-[10px] font-bold mt-1 tracking-tight ${
            isWalletActive ? "text-cyan-300 font-extrabold" : "text-slate-300"
          }`}
        >
          {t.navigation.ticketing}
        </span>
      </div>

      {/* 4. LAPORAN & KOMUNITAS (CROWDSOURCE) */}
      <button
        onClick={handleCrowdsourceClick}
        className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-xl transition-all active:scale-95 ${
          isCrowdsourceActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">{t.navigation.crowdsource}</span>
      </button>

      {/* 5. ASISTEN AI (AI ADVISOR) */}
      <button
        onClick={onOpenAI}
        className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all active:scale-95"
      >
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <span className="text-[10px] tracking-tight">{t.navigation.aiAdvisor}</span>
      </button>
    </nav>
  );
}
