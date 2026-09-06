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

export type ShiftActionType =
  | "ALERT_BROADCAST"
  | "ALERT_RESOLVE"
  | "ALERT_DEMOTE"
  | "ALERT_REOPEN"
  | "ALERT_ESCALATE"
  | "ALERT_DELETE"
  | "FLEET_STATUS"
  | "FLEET_CROWD"
  | "FLEET_ADD"
  | "GATE_SCAN";

export interface ShiftLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  operatorId: string;
  actionType: ShiftActionType;
  summary: string;
  details?: string;
  badge?: string;
}

const STORAGE_KEY = "platformi_shift_log_v1";
const MAX_LOG_ENTRIES = 100;

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
  entry: Omit<ShiftLogEntry, "id" | "timestamp" | "timeFormatted">
): ShiftLogEntry {
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

  return {
    log,
    clear: clearShiftLog,
  };
}
