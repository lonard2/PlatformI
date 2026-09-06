/**
 * PlatformI - OCC Dispatcher Shift Activity Log Service
 *
 * Provides persistent recording and retrieval of operational mutations
 * across the OCC dispatch portal during an active shift:
 * 1. Persists actions to browser storage so shift history survives navigation & reload.
 * 2. Formats timestamps in WIB Asia/Jakarta timezone.
 * 3. Provides clean subscription hook for real-time reactivity in UI components.
 * 4. Supports handover / shift reset.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import { useState, useEffect } from "react";
import type { TranslationDictionary } from "@/lib/i18n/types";

export type ShiftActionType =
  | "ALERT_BROADCAST"
  | "ALERT_RESOLVE"
  | "ALERT_DEMOTE"
  | "ALERT_REOPEN"
  | "ALERT_ESCALATE"
  | "ALERT_DELETE"
  | "ALERT_UNDO"
  | "FLEET_STATUS"
  | "FLEET_CROWD"
  | "FLEET_ADD"
  | "FLEET_UNDO"
  | "GATE_SCAN";

export interface ShiftLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  operatorId: string;
  actionType: ShiftActionType;
  summary: string;
  params?: Record<string, string | number>;
  details?: string;
  badge?: string;
}

export function formatShiftLogSummary(entry: ShiftLogEntry, t: TranslationDictionary): string {
  if (!entry.params) return entry.summary;
  const p = entry.params;
  switch (entry.actionType) {
    case "ALERT_BROADCAST":
      return t.admin.shiftLogTemplateAlertBroadcast
        .replace("{severity}", String(p.severity ?? ""))
        .replace("{title}", String(p.title ?? ""))
        .replace("{line}", String(p.line ?? ""));
    case "ALERT_RESOLVE":
      return t.admin.shiftLogTemplateAlertResolve
        .replace("{severity}", String(p.severity ?? ""))
        .replace("{title}", String(p.title ?? ""));
    case "ALERT_DEMOTE":
      return t.admin.shiftLogTemplateAlertDemote
        .replace("{title}", String(p.title ?? ""));
    case "ALERT_REOPEN":
      return t.admin.shiftLogTemplateAlertReopen
        .replace("{title}", String(p.title ?? ""));
    case "ALERT_ESCALATE":
      return t.admin.shiftLogTemplateAlertEscalate
        .replace("{title}", String(p.title ?? ""));
    case "ALERT_DELETE":
      return t.admin.shiftLogTemplateAlertDelete
        .replace("{title}", String(p.title ?? ""));
    case "ALERT_UNDO":
      return t.admin.shiftLogTemplateAlertUndo
        .replace("{title}", String(p.title ?? ""));
    case "FLEET_STATUS":
      return t.admin.shiftLogTemplateFleetStatus
        .replace("{code}", String(p.code ?? ""))
        .replace("{from}", String(p.from ?? ""))
        .replace("{to}", String(p.to ?? ""));
    case "FLEET_CROWD":
      return t.admin.shiftLogTemplateFleetCrowd
        .replace("{code}", String(p.code ?? ""))
        .replace("{from}", String(p.from ?? ""))
        .replace("{to}", String(p.to ?? ""));
    case "FLEET_ADD":
      return t.admin.shiftLogTemplateFleetAdd
        .replace("{code}", String(p.code ?? ""))
        .replace("{line}", String(p.line ?? ""));
    case "FLEET_UNDO":
      return t.admin.shiftLogTemplateFleetUndo
        .replace("{code}", String(p.code ?? ""))
        .replace("{field}", String(p.field ?? ""))
        .replace("{restored}", String(p.restored ?? ""));
    case "GATE_SCAN":
      return t.admin.shiftLogTemplateGateScan
        .replace("{gate}", String(p.gate ?? ""))
        .replace("{status}", String(p.status ?? ""))
        .replace("{ticketId}", String(p.ticketId ?? ""));
    default:
      return entry.summary;
  }
}

const STORAGE_KEY = "platformi_shift_log_v1";
const OPERATOR_STORAGE_KEY = "platformi_active_operator_id";
const MAX_LOG_ENTRIES = 100;

export function setActiveOperatorId(operatorId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!operatorId || operatorId.trim().length === 0) {
      window.localStorage.removeItem(OPERATOR_STORAGE_KEY);
    } else {
      window.localStorage.setItem(OPERATOR_STORAGE_KEY, operatorId.trim());
    }
  } catch {
    // Graceful fallback
  }
}

export function getActiveOperatorId(): string {
  if (typeof window === "undefined") return "OCC-DISPATCHER";
  try {
    const saved = window.localStorage.getItem(OPERATOR_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : "OCC-DISPATCHER";
  } catch {
    return "OCC-DISPATCHER";
  }
}

export interface ShiftFraming {
  hasEntries: boolean;
  operatorId: string;
  startTimeFormatted: string | null;
  endTimeFormatted: string | null;
  startTimestamp: number | null;
  endTimestamp: number | null;
  totalActions: number;
}

export function getShiftFraming(log: ShiftLogEntry[]): ShiftFraming {
  if (log.length === 0) {
    return {
      hasEntries: false,
      operatorId: getActiveOperatorId(),
      startTimeFormatted: null,
      endTimeFormatted: null,
      startTimestamp: null,
      endTimestamp: null,
      totalActions: 0,
    };
  }

  // Earliest entry in the shift session stamps the window start
  const firstEntry = log[log.length - 1];
  // Most recent entry stamps current window state
  const latestEntry = log[0];

  return {
    hasEntries: true,
    operatorId: latestEntry.operatorId || getActiveOperatorId(),
    startTimeFormatted: firstEntry.timeFormatted,
    endTimeFormatted: latestEntry.timeFormatted,
    startTimestamp: firstEntry.timestamp,
    endTimestamp: latestEntry.timestamp,
    totalActions: log.length,
  };
}

type ShiftLogListener = (entries: ShiftLogEntry[]) => void;
const listeners = new Set<ShiftLogListener>();

function readStorage(): ShiftLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: ShiftLogEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)));
  } catch {
    // Graceful storage quota fallback
  }
}

function notifyAll(entries: ShiftLogEntry[]) {
  listeners.forEach((fn) => fn(entries));
}

export function getShiftLog(): ShiftLogEntry[] {
  return readStorage();
}

export function recordShiftAction(
  entry: Omit<ShiftLogEntry, "id" | "timestamp" | "timeFormatted" | "operatorId"> & {
    operatorId?: string;
  }
): ShiftLogEntry {
  const resolvedOperator =
    entry.operatorId && entry.operatorId !== "OCC-DISPATCHER"
      ? entry.operatorId
      : getActiveOperatorId();

  const now = Date.now();
  const timeFormatted = new Date(now).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  const fullEntry: ShiftLogEntry = {
    id: `shift-${now}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    timeFormatted: `${timeFormatted} WIB`,
    ...entry,
    operatorId: resolvedOperator,
  };

  const current = readStorage();
  const updated = [fullEntry, ...current].slice(0, MAX_LOG_ENTRIES);
  writeStorage(updated);
  notifyAll(updated);

  return fullEntry;
}

export function clearShiftLog(): void {
  writeStorage([]);
  notifyAll([]);
}

export function subscribeShiftLog(listener: ShiftLogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useShiftLog() {
  const [log, setLog] = useState<ShiftLogEntry[]>([]);

  useEffect(() => {
    setLog(readStorage());
    return subscribeShiftLog((updated) => setLog(updated));
  }, []);

  const framing = getShiftFraming(log);

  return {
    log,
    framing,
    clear: clearShiftLog,
  };
}
