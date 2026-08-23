/**
 * PlatformI - Operator Control Portal: Turnstile Gate Scanner Simulator
 *
 * Simulates high-throughput turnstile gates validating 30-second rolling dynamic QR tokens
 * with HMAC-SHA256 verification, +/-1 window clock skew tolerance, anti-replay nonces,
 * and JakLingko 3-hour (180 minute) multimodal transfer window enforcement.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Zap,
  DollarSign,
  User,
  Ticket as TicketIcon,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  generateRollingQRToken,
  validateRollingQRToken,
  GateValidationResult,
  DEFAULT_QR_SECRET,
  TIME_STEP_MS,
} from "@/lib/services/qrSecurityService";
import { useTranslation } from "@/lib/i18n";

interface ScanAuditEntry {
  id: string;
  timestamp: string;
  gateName: string;
  ticketId: string;
  userId: string;
  isValid: boolean;
  errorReason?: string;
  isJakLingkoCapped: boolean;
  fareDeductedRp: number;
}

export default function AdminScannerPage() {
  const { t } = useTranslation();
  const [selectedGate, setSelectedGate] = useState<string>("CSW-ASEAN Hub Gate #04");
  const [scannedPayload, setScannedPayload] = useState<string>("");
  const [lastValidationResult, setLastValidationResult] = useState<GateValidationResult | null>(null);
  const [gateStatus, setGateStatus] = useState<"IDLE" | "GRANTED" | "DENIED">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedNonces, setUsedNonces] = useState<Set<string>>(new Set());
  const [auditLog, setAuditLog] = useState<ScanAuditEntry[]>([]);

  // Simulation test parameters
  const [mockTicketId, setMockTicketId] = useState<string>("TKT-JKT-8821");
  const [mockUserId, setMockUserId] = useState<string>("USR-COMMUTER-99");
  const [firstTapInOffsetMinutes, setFirstTapInOffsetMinutes] = useState<number>(45);

  const gateOptions = [
    "CSW-ASEAN Hub Gate #04 (Corridor 13 Flyover)",
    "Dukuh Atas TOD Multi-Modal Turnstile #01",
    "Manggarai Central Rail Gate #09",
    "Stasiun Halim Whoosh Concourse Gate #02",
    "Pelabuhan Muara Angke Speedboat Pier #01",
    "Stasiun Bandara Soekarno-Hatta (SHIA) Gate #03",
  ];

  // Auto-generate a live valid test payload on initial load
  useEffect(() => {
    const liveToken = generateRollingQRToken(mockTicketId, mockUserId);
    setScannedPayload(liveToken.fullPayload);
  }, [mockTicketId, mockUserId]);

  const handleGeneratePreset = (type: "VALID" | "EXPIRED" | "TAMPERED" | "REPLAY" | "OVER_3_HOURS") => {
    const now = Date.now();

    if (type === "VALID") {
      const token = generateRollingQRToken(mockTicketId, mockUserId, now);
      setScannedPayload(token.fullPayload);
      setFirstTapInOffsetMinutes(45);
    } else if (type === "EXPIRED") {
      // 4 time-steps ago (120s old) -> exceeds +/-1 tolerance
      const expiredTime = now - 120000;
      const token = generateRollingQRToken(mockTicketId, mockUserId, expiredTime);
      setScannedPayload(token.fullPayload);
      setFirstTapInOffsetMinutes(30);
    } else if (type === "TAMPERED") {
      const token = generateRollingQRToken(mockTicketId, mockUserId, now);
      // Alter signature hash
      const parts = token.fullPayload.split(":");
      parts[4] = "DEADBEEFCAFE0000";
      setScannedPayload(parts.join(":"));
    } else if (type === "REPLAY") {
      const token = generateRollingQRToken(mockTicketId, mockUserId, now);
      setScannedPayload(token.fullPayload);
      // Mark current nonce as already scanned
      const nonce = `${mockTicketId}:${token.timeStep}`;
      setUsedNonces((prev) => new Set(prev).add(nonce));
    } else if (type === "OVER_3_HOURS") {
      const token = generateRollingQRToken(mockTicketId, mockUserId, now);
      setScannedPayload(token.fullPayload);
      setFirstTapInOffsetMinutes(195); // 195 minutes = > 180 minutes
    }
  };

  const handleExecuteScan = () => {
    if (!scannedPayload.trim()) return;

    // 1. Validate rolling token cryptography & clock skew
    const validation = validateRollingQRToken(
      scannedPayload.trim(),
      1, // +/- 1 window tolerance
      Date.now(),
      DEFAULT_QR_SECRET,
      usedNonces
    );

    // 2. Check JakLingko 3-hour transfer window
    let isJakLingkoValid = true;
    let finalError = validation.errorReason;

    if (validation.isValid) {
      if (firstTapInOffsetMinutes > 180) {
        isJakLingkoValid = false;
        finalError = "JAKLINGKO_3HR_WINDOW_EXPIRED";
      }
    }

    const isGateOpen = validation.isValid && isJakLingkoValid;

    setLastValidationResult(validation);
    setGateStatus(isGateOpen ? "GRANTED" : "DENIED");
    setErrorMessage(finalError || null);

    // Add nonce to used set if valid to prevent replays
    if (validation.isValid) {
      const nonce = `${validation.ticketId}:${validation.timeStep}`;
      setUsedNonces((prev) => new Set(prev).add(nonce));
    }

    // Add audit log entry
    const auditEntry: ScanAuditEntry = {
      id: `SCAN-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB",
      gateName: selectedGate,
      ticketId: validation.ticketId || mockTicketId,
      userId: validation.userId || mockUserId,
      isValid: isGateOpen,
      errorReason: finalError,
      isJakLingkoCapped: firstTapInOffsetMinutes <= 180,
      fareDeductedRp: isGateOpen ? (firstTapInOffsetMinutes <= 180 ? 0 : 3500) : 0,
    };

    setAuditLog((prev) => [auditEntry, ...prev]);

    // Reset gate animation after 3.5 seconds
    setTimeout(() => {
      setGateStatus("IDLE");
    }, 3500);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-semibold">
              VALIDASI TURNSTILE & TARIF INTEGRASI
            </span>
            <span className="text-xs text-slate-400 font-mono">HMAC-SHA256 Rolling Token Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            Simulator Validator Gerbang Turnstile QR
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Validasi tiket QR rolling 30 detik, verifikasi kriptografi, toleransi pergeseran waktu (clock skew), anti-replay, dan batasan integrasi 3 jam JakLingko.
          </p>
        </div>

        {/* Selected Gate Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/80"
          >
            {gateOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN SIMULATOR & GATE VISUALIZER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scanner Controls & Payload Generators */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Scanner Optical Input</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ISO-18004 / TOTP</span>
          </div>

          {/* Test Preset Generator Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300">Quick Test Vector Presets:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGeneratePreset("VALID")}
                className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-left transition"
              >
                <div>Valid Rolling QR</div>
                <div className="text-[9px] text-slate-400 font-mono">Current 30s window</div>
              </button>

              <button
                type="button"
                onClick={() => handleGeneratePreset("EXPIRED")}
                className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-semibold text-left transition"
              >
                <div>Expired QR Token</div>
                <div className="text-[9px] text-slate-400 font-mono">&gt;60s clock skew</div>
              </button>

              <button
                type="button"
                onClick={() => handleGeneratePreset("TAMPERED")}
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-semibold text-left transition"
              >
                <div>Tampered Hash</div>
                <div className="text-[9px] text-slate-400 font-mono">Corrupt HMAC digest</div>
              </button>

              <button
                type="button"
                onClick={() => handleGeneratePreset("REPLAY")}
                className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-semibold text-left transition"
              >
                <div>Replay Attack</div>
                <div className="text-[9px] text-slate-400 font-mono">Re-scan same nonce</div>
              </button>

              <button
                type="button"
                onClick={() => handleGeneratePreset("OVER_3_HOURS")}
                className="p-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-semibold text-left transition col-span-2 sm:col-span-2"
              >
                <div>JakLingko Cap Expired</div>
                <div className="text-[9px] text-slate-400 font-mono">Tap-in offset 195m (&gt;180m limit)</div>
              </button>
            </div>
          </div>

          {/* Scanned Payload Input */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300">Scanned QR Payload String</label>
            <input
              type="text"
              value={scannedPayload}
              onChange={(e) => setScannedPayload(e.target.value)}
              placeholder="PLATFORMI:TKT-ID:USER-ID:TIMESTEP:HMAC_HASH"
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/80"
            />
          </div>

          {/* Journey Simulation Parameters */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">First Tap-In Offset:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={firstTapInOffsetMinutes}
                  onChange={(e) => setFirstTapInOffsetMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
                <span className="text-[11px] text-slate-400">mins ago</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">JakLingko Cap Status:</label>
              <div className="text-xs font-mono font-bold pt-1">
                {firstTapInOffsetMinutes <= 180 ? (
                  <span className="text-emerald-400">Active ({180 - firstTapInOffsetMinutes}m left)</span>
                ) : (
                  <span className="text-rose-400">Expired ({firstTapInOffsetMinutes - 180}m past 3h)</span>
                )}
              </div>
            </div>
          </div>

          {/* Execute Validation Button */}
          <button
            onClick={handleExecuteScan}
            disabled={!scannedPayload.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-xl shadow-cyan-950/60 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-40"
          >
            <Zap className="w-4 h-4" />
            <span>Simulate Gate Tap-In / Scan</span>
          </button>
        </div>

        {/* Right: Turnstile Gate Physical Visualizer */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-between shadow-xl min-h-[380px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Physical Turnstile Barrier State</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{selectedGate}</span>
            </div>

            {/* Turnstile Visual Feedback Screen */}
            <div className="mt-6 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/90 border border-white/10 min-h-[220px] text-center relative overflow-hidden">
              {gateStatus === "IDLE" && (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-300">Turnstile Ready</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Present dynamic QR pass to optical reader
                    </p>
                  </div>
                </div>
              )}

              {gateStatus === "GRANTED" && (
                <div className="space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20 animate-pulse">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-300 font-mono">
                      ACCESS GRANTED &bull; GATE OPEN
                    </h4>
                    <p className="text-xs text-slate-300 font-mono mt-1">
                      Ticket ID: {lastValidationResult?.ticketId} &bull; User: {lastValidationResult?.userId}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                      <Sparkles className="w-3 h-3" />
                      <span>JakLingko Tariff Protected (Fare: Rp 0 Transfer)</span>
                    </div>
                  </div>
                </div>
              )}

              {gateStatus === "DENIED" && (
                <div className="space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-rose-950/80 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/20 animate-bounce">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-rose-300 font-mono">
                      ACCESS DENIED &bull; BARRIER LOCKED
                    </h4>
                    <p className="text-xs text-rose-200 font-mono mt-1">
                      Reason: <strong className="underline">{errorMessage || "SECURITY_VERIFICATION_FAILED"}</strong>
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      Contact station customer service or renew pass in digital wallet.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Clock Skew Tolerance: &plusmn;30s (60s Window)</span>
            <span>Non-Replayable Nonce Protection</span>
          </div>
        </div>
      </div>

      {/* 3. REAL-TIME SCAN AUDIT LOG */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Live Turnstile Access Audit Ledger</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {auditLog.length} Scans Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 font-mono">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Turnstile Gate</th>
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Passenger ID</th>
                <th className="py-3 px-3">Validation Decision</th>
                <th className="py-3 px-3">JakLingko 3H Cap</th>
                <th className="py-3 px-3 text-right">Fare Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No turnstile scans recorded in current session. Execute a scan above.
                  </td>
                </tr>
              ) : (
                auditLog.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition font-mono">
                    <td className="py-3 px-3 text-slate-400">{log.timestamp}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200 truncate max-w-[180px]">
                      {log.gateName}
                    </td>
                    <td className="py-3 px-3 text-cyan-300 font-bold">{log.ticketId}</td>
                    <td className="py-3 px-3 text-slate-400">{log.userId}</td>
                    <td className="py-3 px-3">
                      {log.isValid ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                          GRANTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold text-[10px]">
                          DENIED ({log.errorReason})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.isJakLingkoCapped ? (
                        <span className="text-emerald-400">Within 180m</span>
                      ) : (
                        <span className="text-slate-500">Standard / Expired</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-200">
                      Rp {log.fareDeductedRp.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
