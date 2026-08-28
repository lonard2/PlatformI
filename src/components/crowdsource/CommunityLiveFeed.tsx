/**
 * PlatformI - Community Crowdsource Live Feed Ticker Component
 *
 * Implements:
 * - Real-time passenger report feed with relative timestamps
 * - Multi-modal filter by transit line
 * - Dynamic crowd density level (1-4) and AC comfort score badges
 * - Trigger button to open the Check-In modal
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Wind,
  RefreshCw,
  Filter,
  Plus,
  Radio,
  Clock,
  MessageSquare,
  Train,
  Bus,
  Sparkles,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { FormattedFeedItem } from "@/app/api/crowdsource/feed/route";
import { useTranslation } from "@/lib/i18n";

interface CommunityLiveFeedProps {
  onOpenCheckIn: (vehicleId?: string) => void;
  className?: string;
}

export const CommunityLiveFeed: React.FC<CommunityLiveFeedProps> = ({
  onOpenCheckIn,
  className = "",
}) => {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const selectVehicle = useTransitStore((state) => state.selectVehicle);

  const [feed, setFeed] = useState<FormattedFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>("ALL");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const url =
        selectedLineFilter === "ALL"
          ? "/api/crowdsource/feed?limit=25"
          : `/api/crowdsource/feed?limit=25&lineId=${encodeURIComponent(selectedLineFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed || []);
      }
    } catch {
      // Keep existing feed on fetch error
    } finally {
      setIsLoading(false);
      setLastRefreshedAt(new Date());
    }
  }, [selectedLineFilter]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const getRelativeTime = (timestampMs: number): string => {
    const diffSeconds = Math.floor((Date.now() - timestampMs) / 1000);
    if (diffSeconds < 60) return t.crowdsource.justNow;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}${t.crowdsource.feedMinAgo}`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}${t.crowdsource.feedHourAgo}`;
    return `${Math.floor(diffHours / 24)}${t.crowdsource.feedDayAgo}`;
  };

  const getDensityBadge = (level: string) => {
    if (level === "LEVEL_1_MANY_SEATS" || level === "1") {
      return {
        label: t.crowdsource.feedL1,
        className: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300",
      };
    }
    if (level === "LEVEL_2_FEW_SEATS" || level === "2") {
      return {
        label: t.crowdsource.feedL2,
        className: "bg-amber-950/70 border-amber-500/40 text-amber-300",
      };
    }
    if (level === "LEVEL_3_STANDING_ONLY" || level === "3") {
      return {
        label: t.crowdsource.feedL3,
        className: "bg-orange-950/70 border-orange-500/40 text-orange-300",
      };
    }
    return {
      label: t.crowdsource.feedL4,
      className: "bg-rose-950/70 border-rose-500/40 text-rose-300",
    };
  };

  const getACBadge = (ac: string) => {
    const upper = ac.toUpperCase();
    if (upper === "COLD") {
      return {
        label: t.crowdsource.feedAcCold,
        className: "bg-cyan-950/70 border-cyan-500/40 text-cyan-300",
      };
    }
    if (upper === "OPTIMAL") {
      return {
        label: t.crowdsource.feedAcOptimal,
        className: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300",
      };
    }
    if (upper === "WARM") {
      return {
        label: t.crowdsource.feedAcWarm,
        className: "bg-amber-950/70 border-amber-500/40 text-amber-300",
      };
    }
    return {
      label: t.crowdsource.feedAcHot,
      className: "bg-rose-950/70 border-rose-500/40 text-rose-300",
    };
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {t.crowdsource.liveFeedTitle}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {t.crowdsource.liveFeedSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFeed()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition disabled:opacity-50"
            title={t.common.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={() => onOpenCheckIn()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5 btn-tactile transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.crowdsource.checkInTitle}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-2.5 border-b border-white/5 bg-slate-900/40 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>{t.common.filter}:</span>
        </div>

        <select
          value={selectedLineFilter}
          onChange={(e) => setSelectedLineFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[200px] truncate"
        >
          <option value="ALL">{t.navigation.allModes}</option>
          {allLines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.code} - {line.name}
            </option>
          ))}
        </select>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
        {feed.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p>{t.crowdsource.feedEmpty}</p>
            <button
              onClick={() => onOpenCheckIn()}
              className="text-xs text-cyan-400 underline font-medium"
            >
              {t.crowdsource.beFirst}
            </button>
          </div>
        ) : (
          feed.map((item) => {
            const density = getDensityBadge(item.crowdLevel);
            const ac = getACBadge(item.acComfort);

            return (
              <div
                key={item.id}
                onClick={() => selectVehicle(item.vehicleId)}
                className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 transition cursor-pointer space-y-2 shadow-sm"
              >
                {/* Top Row: Vehicle & Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.lineColorHex }}
                    />
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {item.vehicleCode}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {item.lineCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{getRelativeTime(item.timestampMs)}</span>
                  </div>
                </div>

                {/* Middle Badges: Density & AC */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${density.className}`}
                  >
                    <Users className="w-3 h-3" />
                    {density.label}
                  </span>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${ac.className}`}
                  >
                    <Wind className="w-3 h-3" />
                    {ac.label}
                  </span>
                </div>

                {/* Bottom: Note if available */}
                {item.note && (
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-300 italic bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50">
                    <MessageSquare className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                    <span>&ldquo;{item.note}&rdquo;</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-white/5 bg-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between shrink-0 font-mono">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          {t.crowdsource.decayNote}
        </span>
        <span>
          {t.crowdsource.updatedPrefix} {lastRefreshedAt.toLocaleTimeString("id-ID", { hour12: false })}
        </span>
      </div>
    </div>
  );
};
