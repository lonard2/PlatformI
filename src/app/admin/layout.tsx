/**
 * PlatformI - Operator Back-Office Control Portal Layout
 *
 * Provides glass cockpit navigation, operator session header,
 * and routing between Executive KPI, Fleet Management, Alerts Broadcast, and Scanner.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Radio,
  QrCode,
  Compass,
  Train,
  Activity,
  UserCheck,
  LogOut,
} from "lucide-react";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import type { OperatorProfile } from "@/lib/services/adminAuthService";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);

  // Real derivation shared with the dashboard: share of fleet not OUT_OF_SERVICE
  const telemetryUptime = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const inService = simulatedVehicles.filter((v) => v.status !== "OUT_OF_SERVICE").length;
    return `${((inService / simulatedVehicles.length) * 100).toFixed(1)}%`;
  }, [simulatedVehicles]);
  const router = useRouter();
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const [operator, setOperator] = useState<OperatorProfile | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    fetch("/api/admin/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.operator) {
          setOperator(data.operator);
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Continue redirect
    }
    router.push("/admin/login");
    router.refresh();
  };

  // If on login page, render full viewport without OCC shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    {
      href: "/admin",
      label: t.admin.dashboard,
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true,
    },
    {
      href: "/admin/fleet",
      label: t.admin.fleetControl,
      icon: <Truck className="w-4 h-4" />,
      exact: false,
    },
    {
      href: "/admin/alerts",
      label: t.admin.disruptionManager,
      icon: <Radio className="w-4 h-4" />,
      exact: false,
    },
    {
      href: "/admin/scanner",
      label: t.admin.gateScanner,
      icon: <QrCode className="w-4 h-4" />,
      exact: false,
    },
  ];

  return (
    <div className="flex h-dvh w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0f1d] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center border border-cyan-400/30 text-cyan-300">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white tracking-tight">PlatformI</h1>
                <span className="text-[10px] px-1.5 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                  OCC
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{t.admin.occCommandBadge}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
              {t.admin.liveTelemetryBadge}
            </div>
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium btn-tactile transition ${
                    isActive
                      ? "bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <span className={isActive ? "text-cyan-400" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-slate-950/60">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white truncate">
                  {operator?.name || t.admin.occCommandBadge}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {operator?.badgeNumber || t.admin.sessionUnverified}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={t.admin.logoutTitle}
              aria-label={t.admin.logoutFull}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition btn-tactile"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition btn-tactile"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.navigation.passengerView}</span>
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Mobile & Global Header */}
        <header className="h-14 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex md:hidden items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
                <Train className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">PlatformI OCC</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse motion-reduce:animate-none" />
              <span>
                {t.admin.telemetryLabel}{" "}
                <strong className="text-emerald-400">{telemetryUptime}</strong>
              </span>
            </div>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Nav Tabs */}
            <nav aria-label={t.admin.mobileNav} className="flex md:hidden items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={`min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl text-xs btn-tactile focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                      ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.icon}
                </Link>
              ))}
            </nav>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              aria-label={t.admin.languageSwitcher}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 font-medium min-h-[36px]"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.flagLabel})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleLogout}
              title={t.admin.logoutFull}
              aria-label={t.admin.logoutFull}
              className="flex md:hidden items-center justify-center min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition btn-tactile"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.navigation.passengerView}</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#070b14]">{children}</main>
      </div>
    </div>
  );
}
