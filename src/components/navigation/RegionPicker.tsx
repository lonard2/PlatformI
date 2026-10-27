/**
 * PlatformI - Region Picker (country-grouped service region switcher).
 *
 * Shows the active region; opens a sheet grouped under country headings.
 * Switching recenters the map on the region and clears cross-region
 * selection and journey state so Surabaya never shows a Jakarta pin.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Check, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import {
  useRegionStore,
  groupRegionsByCountry,
} from "@/lib/stores/useRegionStore";
import type { Region } from "@/types/transit";

const COUNTRY_NAMES: Record<string, string> = {
  ID: "Indonesia",
  MY: "Malaysia",
  SG: "Singapore",
  TH: "Thailand",
};

type RegionRow = Region & { lineCount: number };

export function RegionPicker({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { t } = useTranslation();
  const activeRegionId = useRegionStore((s) => s.activeRegionId);
  const setActiveRegion = useRegionStore((s) => s.setActiveRegion);
  const setViewport = useTransitStore((s) => s.setViewport);
  const selectStop = useTransitStore((s) => s.selectStop);
  const selectLine = useTransitStore((s) => s.selectLine);
  const clearPlannedJourney = useTransitStore((s) => s.clearPlannedJourney);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/network/regions");
        const json = await res.json();
        if (!cancelled && res.ok && json.success) setRegions(json.data || []);
      } catch {
        // Picker keeps the persisted active region when the list is unreachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const active = regions.find((r) => r.id === activeRegionId);
  const groups = groupRegionsByCountry(regions);

  const choose = (region: RegionRow): void => {
    setActiveRegion(region.id);
    setViewport([region.centerLatitude, region.centerLongitude], region.zoomLevel);
    selectStop(null);
    selectLine(null);
    clearPlannedJourney();
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.admin.regionPickTitle}
        title={t.admin.regionPickTitle}
        className={
          variant === "full"
            ? "flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-lg border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs btn-tactile transition"
            : "flex items-center gap-1 px-2 py-1.5 min-h-[44px] rounded-lg border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-slate-200 btn-tactile transition"
        }
      >
        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {variant === "full" ? (
          <span className="font-mono font-bold">{active?.code ?? "…"}</span>
        ) : (
          <span className="font-mono font-bold text-[11px]">{active?.code ?? "…"}</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t.admin.regionPickTitle}
          className="absolute left-0 top-full mt-2 w-72 max-h-[60vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-2 z-50 space-y-3"
        >
          {groups.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono px-2 py-3">{t.admin.regionEmpty}</p>
          ) : (
            groups.map((g) => (
              <div key={g.countryCode} className="space-y-1">
                <p className="px-2 pt-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  {COUNTRY_NAMES[g.countryCode] ?? g.countryCode}
                </p>
                {g.regions.map((r) => {
                  const row = r as RegionRow;
                  const isActive = r.id === activeRegionId;
                  const lineCount =
                    row.lineCount ?? regions.find((x) => x.id === r.id)?.lineCount ?? 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => choose({ ...row, lineCount } as RegionRow)}
                      aria-pressed={isActive}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition min-h-[44px] ${
                        isActive
                          ? "bg-cyan-950/80 border border-cyan-500/40 text-white"
                          : "hover:bg-slate-800 border border-transparent text-slate-200"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold truncate">{r.name}</span>
                        <span className="block text-[10px] font-mono text-slate-500">
                          {r.code} • {t.admin.regionLines.replace("{n}", String(lineCount))}
                        </span>
                      </span>
                      {isActive && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
