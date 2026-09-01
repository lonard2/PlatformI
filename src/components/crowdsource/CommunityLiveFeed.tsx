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

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  Wind,
  RefreshCw,
  Filter,
  Plus,
  Radio,
  Clock,
    MessageSquare,
    Sparkles,
  } from "lucide-react";
import { SESSION_ID, isSpotlit, markSpotlit } from "@/lib/session";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { FormattedFeedItem } from "@/app/api/crowdsource/feed/route";
import { useTranslation } from "@/lib/i18n";

interface CommunityLiveFeedProps {
  onOpenCheckIn: (vehicleId?: string, lineId?: string) => void;
  refreshSignal?: number;
  className?: string;
}

export const CommunityLiveFeed: React.FC<CommunityLiveFeedProps> = ({
  onOpenCheckIn,
  refreshSignal,
  className = "",
}) => {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const selectVehicle = useTransitStore((state) => state.selectVehicle);

  const [feed, setFeed] = useState<FormattedFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>("ALL");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isStale, setIsStale] = useState<boolean>(false);

    const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchFeed = useCallback(async (): Promise<FormattedFeedItem[] | null> => {
     fetchAbortRef.current?.abort();
     fetchAbortRef.current = new AbortController();
     setIsLoading(true);
     try {
       const url =
         selectedLineFilter === "ALL"
           ? "/api/crowdsource/feed?limit=25"
           : `/api/crowdsource/feed?limit=25&lineId=${encodeURIComponent(selectedLineFilter)}`;
       const res = await fetch(url, { signal: fetchAbortRef.current.signal });
      if (res.ok) {
        const data = await res.json();
        const items: FormattedFeedItem[] = data.feed || [];
        setFeed(items);
        setIsStale(false);
        return items;
      }
      setIsStale(true);
      return null;
         } catch (err) {
       if (err instanceof DOMException && err.name === "AbortError") return null;
       // Keep existing feed on fetch error, but stop claiming freshness
       setIsStale(true);
       return null;
     } finally {
      setIsLoading(false);
      setLastRefreshedAt(new Date());
    }
  }, [selectedLineFilter]);

  useEffect(() => {
    void fetchFeed().then((items) => {
      if (items) spotlightNewestOwn(items);
    });
    const interval = setInterval(fetchFeed, 30000); // 30s auto-refresh
    return () => {
      clearInterval(interval);
      fetchAbortRef.current?.abort();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [fetchFeed]);

  // Loop closure: spotlight the commuter's newest unspotlit report, whether
  // submitted while the feed was open (refreshSignal) or closed (inspector
  // path — caught here on mount/poll).
  const spotlightNewestOwn = (items: FormattedFeedItem[]) => {
    const own = items.filter((item) => item.userId === SESSION_ID && !isSpotlit(item.id));
    if (own.length === 0) return;
    const newest = own.reduce((a, b) => (b.timestampMs > a.timestampMs ? b : a));
    setHighlightedId(newest.id);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3000);
    markSpotlit(newest.id);
  };

  // Refresh signal from the check-in modal's Done button
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignalRef = useRef<number | null>(null);
  useEffect(() => {
    if (refreshSignal === undefined) return;
    if (lastSignalRef.current === null) {
      lastSignalRef.current = refreshSignal;
      return;
    }
    if (refreshSignal === lastSignalRef.current) return;
    lastSignalRef.current = refreshSignal;
    void fetchFeed().then((items) => {
      if (items) spotlightNewestOwn(items);
    });
  }, [refreshSignal, fetchFeed]);

  // Age-based fade: full opacity for fresh reports, dimming to 45% over 10 min
  const getAgeOpacity = (timestampMs: number): number => {
    const ageSeconds = Math.max(0, (Date.now() - timestampMs) / 1000);
    return Math.max(0.45, 1 - ageSeconds / 600);
  };

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
              <span
                className={`w-2 h-2 rounded-full ${isStale ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}
                aria-hidden="true"
              ></span>
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
                       className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition disabled:opacity-50`}
             aria-label={t.common.refresh}
             title={t.common.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={() => onOpenCheckIn(undefined, selectedLineFilter === "ALL" ? undefined : selectedLineFilter)}
                       className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 btn-tactile transition`}
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
           id="feed-line-filter"
           aria-label={t.common.filter}
           value={selectedLineFilter}
           onChange={(e) => setSelectedLineFilter(e.target.value)}
           className="touch-target px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/70 max-w-[200px] truncate"
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
            <div aria-live="polite" className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
        {isLoading && feed.length === 0 ? (
          <div role="status" aria-label={t.common.loading} className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} aria-hidden="true" className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2 animate-pulse">
                <div className="h-3 w-1/3 bg-slate-800 rounded" />
                <div className="h-3 w-1/2 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p>{t.crowdsource.feedEmpty}</p>
            <button
              onClick={() => onOpenCheckIn(undefined, selectedLineFilter === "ALL" ? undefined : selectedLineFilter)}
              className="touch-target text-xs text-cyan-400 underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 rounded"
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
                role="button"
                tabIndex={0}
                onClick={() => selectVehicle(item.vehicleId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectVehicle(item.vehicleId);
                  }
                }}
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 p-3 rounded-xl border transition cursor-pointer space-y-2 shadow-sm ${
                  item.id === highlightedId
                    ? "bg-emerald-950/40 border-emerald-400/70 ring-2 ring-emerald-400/50"
                    : "bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-cyan-500/40"
                }`}
                style={{ opacity: item.id === highlightedId ? 1 : getAgeOpacity(item.timestampMs) }}
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
                     {item.userId === SESSION_ID && (
                       <span className="px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                         {t.crowdsource.youChip}
                       </span>
                     )}
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
        <span className={`flex items-center gap-1 truncate ${isStale ? "text-amber-400" : ""}`}>
          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">{isStale ? t.crowdsource.feedStaleNotice : t.crowdsource.decayNote}</span>
        </span>
        <span>
          {t.crowdsource.updatedPrefix} {lastRefreshedAt.toLocaleTimeString("id-ID", { hour12: false })}
        </span>
      </div>
    </div>
  );
};
