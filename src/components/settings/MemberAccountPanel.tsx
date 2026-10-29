"use client";

/**
 * PlatformI - Member account panel (user-side identity surface).
 *
 * Signed-out: passkey registration + login (browser WebAuthn ceremonies
 * against /api/members/*). Signed-in: identity + standing, purchase
 * history, saved trips. No emojis; Lucide only; strict TypeScript.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, LogOut, BadgeCheck, History, MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface MemberProfile {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  role: string;
  verifiedAt: string | null;
  createdAt: string;
}

interface SavedTrip {
  id: string;
  origin: string;
  destination: string;
  label: string;
}

interface PurchasedTicket {
  id: string;
  ticketNumber: string;
  reservationCode: string;
  status: string;
  originStopId: string;
  destinationStopId: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const LAST_MEMBER_KEY = "platformi_last_member";

function readLastMember(): { id: string; displayName: string } | null {
  try {
    const raw = window.localStorage.getItem(LAST_MEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; displayName?: unknown };
    if (typeof parsed.id === "string" && typeof parsed.displayName === "string") {
      return { id: parsed.id, displayName: parsed.displayName };
    }
    return null;
  } catch {
    return null;
  }
}

export const MemberAccountPanel: React.FC = () => {
  const { t } = useTranslation();
  const [me, setMe] = useState<MemberProfile | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [busyAction, setBusyAction] = useState<null | "register" | "login" | "trip">(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const ceremonyRunId = useRef<number>(0);
  const ceremonyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CEREMONY_TIMEOUT_MS = 75_000;
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [history, setHistory] = useState<PurchasedTicket[]>([]);
  const [tripOrigin, setTripOrigin] = useState<string>("");
  const [tripDestination, setTripDestination] = useState<string>("");
  const [tripLabel, setTripLabel] = useState<string>("");
  const [lastMember, setLastMember] = useState<{ id: string; displayName: string } | null>(null);

  const refreshMe = useCallback(async (): Promise<MemberProfile | null> => {
    try {
      const res = await fetch("/api/members/me", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = (await res.json()) as ApiEnvelope<MemberProfile>;
      return json.success && json.data ? json.data : null;
    } catch {
      return null;
    }
  }, []);

  const refreshCollections = useCallback(async () => {
    try {
      const [tripsRes, histRes] = await Promise.all([
        fetch("/api/members/trips", { credentials: "same-origin" }),
        fetch("/api/members/tickets", { credentials: "same-origin" }),
      ]);
      if (tripsRes.ok) {
        const json = (await tripsRes.json()) as ApiEnvelope<SavedTrip[]>;
        if (json.success && Array.isArray(json.data)) setTrips(json.data);
      }
      if (histRes.ok) {
        const json = (await histRes.json()) as ApiEnvelope<PurchasedTicket[]>;
        if (json.success && Array.isArray(json.data)) setHistory(json.data);
      }
    } catch {
      /* collections are best-effort; profile is the source of truth */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLastMember(readLastMember());
    void refreshMe().then((profile) => {
      if (cancelled) return;
      setMe(profile);
      if (profile) void refreshCollections();
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMe, refreshCollections]);

  // A ceremony is one register/login attempt. Only the started action locks;
  // a run id + timeout pair guarantees a stuck ceremony always releases the UI.
  function beginCeremony(kind: "register" | "login"): number {
    const runId = ceremonyRunId.current + 1;
    ceremonyRunId.current = runId;
    setBusyAction(kind);
    setError(null);
    setStatusMessage(t.account.statusWaiting);
    if (ceremonyTimer.current) clearTimeout(ceremonyTimer.current);
    ceremonyTimer.current = setTimeout(() => {
      if (ceremonyRunId.current !== runId) return;
      ceremonyRunId.current += 1;
      setBusyAction(null);
      setStatusMessage(t.account.statusExpired);
    }, CEREMONY_TIMEOUT_MS);
    return runId;
  }

  function endCeremony(runId: number): boolean {
    if (ceremonyRunId.current !== runId) return false;
    ceremonyRunId.current += 1;
    if (ceremonyTimer.current) {
      clearTimeout(ceremonyTimer.current);
      ceremonyTimer.current = null;
    }
    setBusyAction(null);
    setStatusMessage(null);
    return true;
  }

  useEffect(() => {
    return () => {
      if (ceremonyTimer.current) clearTimeout(ceremonyTimer.current);
    };
  }, []);

  function mapAccountError(code: string): string {
    if (code === "UNKNOWN_MEMBER") return t.account.errorNoAccount;
    if (code === "ALREADY_REGISTERED") return t.account.errorAlreadyRegistered;
    if (/challenge|expired|timeout/i.test(code)) return t.account.errorSessionExpired;
    return t.account.errorGeneric;
  }

  async function handleRegister(): Promise<void> {
    if (!displayName.trim() || busyAction !== null) return;
    const runId = beginCeremony("register");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const beginRes = await fetch("/api/members/register/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: displayName.trim(), phone: phone.trim() || undefined }),
      });
      const beginJson = (await beginRes.json()) as ApiEnvelope<{ provisionalId: string; options: never }>;
      if (!beginJson.success || !beginJson.data) throw new Error(beginJson.error || "REGISTRATION_START_FAILED");
      const credential = await startRegistration({ optionsJSON: beginJson.data.options });
      const finishRes = await fetch("/api/members/register/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          provisionalId: beginJson.data.provisionalId,
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          credential,
        }),
      });
      const finishJson = (await finishRes.json()) as ApiEnvelope<MemberProfile>;
      if (!finishJson.success || !finishJson.data) throw new Error(finishJson.error || "REGISTRATION_FAILED");
      if (!endCeremony(runId)) return;
      setMe(finishJson.data);
      window.localStorage.setItem(
        LAST_MEMBER_KEY,
        JSON.stringify({ id: finishJson.data.id, displayName: finishJson.data.displayName })
      );
      setLastMember({ id: finishJson.data.id, displayName: finishJson.data.displayName });
      await refreshCollections();
    } catch (err) {
      if (!endCeremony(runId)) return;
      if ((err as Error).name === "NotAllowedError") {
        setError(t.account.cancelledAuth);
      } else {
        setError(mapAccountError((err as Error).message));
      }
    }
  }

  async function handleLogin(memberId?: string, loginPhone?: string): Promise<void> {
    if (busyAction !== null) return;
    const runId = beginCeremony("login");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const beginRes = await fetch("/api/members/login/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(memberId ? { memberId } : { phone: (loginPhone ?? phone).trim() }),
      });
      const beginJson = (await beginRes.json()) as ApiEnvelope<{
        memberId: string;
        options: never;
      }>;
      if (!beginJson.success || !beginJson.data) throw new Error(beginJson.error || "LOGIN_START_FAILED");
      const credential = await startAuthentication({ optionsJSON: beginJson.data.options });
      const finishRes = await fetch("/api/members/login/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ memberId: beginJson.data.memberId, credential }),
      });
      const finishJson = (await finishRes.json()) as ApiEnvelope<MemberProfile>;
      if (!finishJson.success || !finishJson.data) throw new Error(finishJson.error || "LOGIN_FAILED");
      if (!endCeremony(runId)) return;
      setMe(finishJson.data);
      window.localStorage.setItem(
        LAST_MEMBER_KEY,
        JSON.stringify({ id: finishJson.data.id, displayName: finishJson.data.displayName })
      );
      setLastMember({ id: finishJson.data.id, displayName: finishJson.data.displayName });
      await refreshCollections();
    } catch (err) {
      if (!endCeremony(runId)) return;
      if ((err as Error).name === "NotAllowedError") {
        setError(t.account.cancelledAuth);
      } else {
        setError(mapAccountError((err as Error).message));
      }
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/members/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setMe(null);
    setTrips([]);
    setHistory([]);
  }

  async function handleAddTrip(): Promise<void> {
    if (!tripOrigin.trim() || !tripDestination.trim() || busyAction !== null) return;
    setBusyAction("trip");
    setError(null);
    try {
      const res = await fetch("/api/members/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          origin: tripOrigin.trim(),
          destination: tripDestination.trim(),
          label: tripLabel.trim() || undefined,
        }),
      });
      const json = (await res.json()) as ApiEnvelope<SavedTrip>;
      if (!json.success || !json.data) throw new Error("SAVE_FAILED");
      setTrips((prev) => [json.data as SavedTrip, ...prev]);
      setTripOrigin("");
      setTripDestination("");
      setTripLabel("");
    } catch {
      setError(t.account.errorGeneric);
    } finally {
      setBusyAction((current) => (current === "trip" ? null : current));
    }
  }

  async function handleDeleteTrip(id: string): Promise<void> {
    const res = await fetch(`/api/members/trips/${id}`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (res && res.ok) setTrips((prev) => prev.filter((trip) => trip.id !== id));
  }

  if (checking) {
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{t.common.loading}</span>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">{t.account.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            {t.account.guestBadge}
          </span>
        </div>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t.account.displayNameLabel}
          aria-label={t.account.displayNameLabel}
          className="touch-target w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.account.phoneLabel}
          aria-label={t.account.phoneLabel}
          inputMode="tel"
          className="touch-target w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={busyAction === "register" || displayName.trim() === ""}
            className="touch-target px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold disabled:opacity-50 transition"
          >
            {t.account.registerWithPasskey}
          </button>
          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={busyAction === "login" || phone.trim() === ""}
            className="touch-target px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
          >
            {t.account.continueWithPasskey}
          </button>
          {lastMember && (
            <button
              type="button"
              onClick={() => void handleLogin(lastMember.id)}
              disabled={busyAction === "login"}
              className="touch-target px-3.5 py-2 rounded-xl bg-slate-800 border border-cyan-500/40 text-xs font-medium text-cyan-300 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              {t.account.continueAs.replace("{name}", lastMember.displayName)}
            </button>
          )}
        </div>
        {statusMessage && (
          <p role="status" className="text-[11px] text-cyan-300">
            {statusMessage}
          </p>
        )}
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-white truncate">{me.displayName}</span>
          {me.verifiedAt ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold flex items-center gap-1 shrink-0">
              <BadgeCheck className="w-3 h-3" />
              {t.account.verifiedBadge}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono shrink-0">
              {t.account.guestBadge}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="touch-target p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
          aria-label={t.account.signOut}
          title={t.account.signOut}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
          <History className="w-3.5 h-3.5 text-slate-500" />
          {t.account.purchaseHistory}
        </div>
        {history.length === 0 ? (
          <p className="text-[11px] text-slate-500">{t.account.emptyState}</p>
        ) : (
          <ul className="space-y-1">
            {history.slice(0, 5).map((ticket) => (
              <li
                key={ticket.id}
                className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800/60"
              >
                <span className="truncate">{ticket.reservationCode}</span>
                <span className="text-slate-500 shrink-0 ml-2">{ticket.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          {t.account.savedTrips}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <input
            value={tripOrigin}
            onChange={(e) => setTripOrigin(e.target.value)}
            placeholder={t.account.tripOriginLabel}
            aria-label={t.account.tripOriginLabel}
            className="touch-target min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <input
            value={tripDestination}
            onChange={(e) => setTripDestination(e.target.value)}
            placeholder={t.account.tripDestinationLabel}
            aria-label={t.account.tripDestinationLabel}
            className="touch-target min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex gap-1.5">
          <input
            value={tripLabel}
            onChange={(e) => setTripLabel(e.target.value)}
            placeholder={t.account.tripLabel}
            aria-label={t.account.tripLabel}
            className="touch-target flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => void handleAddTrip()}
            disabled={busyAction === "trip" || tripOrigin.trim() === "" || tripDestination.trim() === ""}
            className="touch-target px-3 py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60 disabled:opacity-50 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.account.addTrip}
          </button>
        </div>
        {trips.length > 0 && (
          <ul className="space-y-1 mt-1.5">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800/60"
              >
                <span className="truncate">
                  <strong className="text-slate-100">{trip.label}</strong>
                  <span className="text-slate-500"> {trip.origin} → {trip.destination}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteTrip(trip.id)}
                  aria-label={`${t.account.deleteTrip}: ${trip.label}`}
                  className="touch-target p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
};
