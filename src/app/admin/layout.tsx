/**
 * PlatformI - Operator Back-Office Control Portal Layout
 *
 * Provides glass cockpit navigation, operator session header,
 * and routing between Executive KPI, Fleet Management, Alerts Broadcast, and Scanner.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Radio,
  QrCode,
  Compass,
  Train,
  Shield,
  Activity,
  UserCheck,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/admin",
      label: "Executive KPI",
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true,
    },
    {
      href: "/admin/fleet",
      label: "Fleet Management",
      icon: <Truck className="w-4 h-4" />,
      exact: false,
    },
    {
      href: "/admin/alerts",
      label: "Disruption Center",
      icon: <Radio className="w-4 h-4" />,
      exact: false,
    },
    {
      href: "/admin/scanner",
      label: "Turnstile Scanner",
      icon: <QrCode className="w-4 h-4" />,
      exact: false,
    },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0f1d] flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Train className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white tracking-tight">PlatformI</h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                  OCC
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Operator Control Center</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">
              Operations & Telemetry
            </div>
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-950/80 to-blue-950/60 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/40 font-semibold"
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
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-white/5">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">
                OCC Lead Dispatcher
              </div>
              <div className="text-[9px] text-slate-400 font-mono">Dukuh Atas Integrated Hub</div>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Passenger Cockpit</span>
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
              <span className="text-sm font-bold text-white">PlatformI Admin</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Jabodetabek Transit Telemetry: <strong className="text-emerald-400">ONLINE (100%)</strong></span>
            </div>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Nav Tabs */}
            <div className="flex md:hidden items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg text-xs ${
                    (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                      ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.icon}
                </Link>
              ))}
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Passenger View</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#070b14]">
          {children}
        </main>
      </div>
    </div>
  );
}
