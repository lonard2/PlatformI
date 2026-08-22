/**
 * PlatformI - 30-Second Dynamic Rolling QR Code Component
 *
 * Implements:
 * - Real-time TOTP/HMAC-SHA256 dynamic QR token generation (30s window)
 * - Animated circular SVG countdown ring with second-by-second countdown
 * - High-contrast SVG QR matrix rendering (25x25 grid)
 * - Cryptographic security watermark and hash badge
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Lock,
  RefreshCw,
} from "lucide-react";
import {
  generateRollingQRToken,
  generateQRMatrixGrid,
  RollingQRTokenResult,
} from "@/lib/services/qrSecurityService";

interface DynamicQRCodeProps {
  ticketId: string;
  userId?: string;
  size?: number;
  showTimerRing?: boolean;
  showPayloadHash?: boolean;
  className?: string;
}

export const DynamicQRCode: React.FC<DynamicQRCodeProps> = ({
  ticketId,
  userId = "USR-JAKARTA-01",
  size = 220,
  showTimerRing = true,
  showPayloadHash = true,
  className = "",
}) => {
  const [tokenData, setTokenData] = useState<RollingQRTokenResult>(() =>
    generateRollingQRToken(ticketId, userId, Date.now())
  );
  const [copied, setCopied] = useState<boolean>(false);

  // Update token every 1000ms
  useEffect(() => {
    const update = () => {
      setTokenData(generateRollingQRToken(ticketId, userId, Date.now()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ticketId, userId]);

  // Generate QR grid when payload updates
  const qrGrid = useMemo(() => {
    return generateQRMatrixGrid(tokenData.fullPayload, 25);
  }, [tokenData.fullPayload]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenData.fullPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Circular timer ring calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (tokenData.secondsRemaining / 30) * circumference;

  return (
    <div
      className={`flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Security Status Header */}
      <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-300 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[11px]">HMAC-SHA256 Active</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-cyan-400">
          <Lock className="w-3 h-3" />
          <span>Epoch #{tokenData.timeStep}</span>
        </div>
      </div>

      {/* QR Canvas Container with Circular Countdown Ring Overlay */}
      <div className="relative p-4 rounded-xl bg-white flex items-center justify-center shadow-inner">
        {/* SVG QR Matrix */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 25 25"
          className="shape-rendering-crispEdges select-none"
        >
          {qrGrid.map((row, rIdx) =>
            row.map((isDark, cIdx) => (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill={isDark ? "#090d16" : "#ffffff"}
              />
            ))
          )}
        </svg>

        {/* Center Watermark Emblem */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-lg bg-slate-950/90 border border-cyan-400/60 flex items-center justify-center shadow-lg shadow-black/40">
            <span className="text-[9px] font-black text-cyan-400 tracking-tighter font-mono">
              PLTI
            </span>
          </div>
        </div>
      </div>

      {/* 30s Countdown Timer Ring */}
      {showTimerRing && (
        <div className="mt-4 flex items-center gap-3 w-full justify-between px-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 font-mono text-xs">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-cyan-400 transition-all duration-1000 ease-linear"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-white">
                {tokenData.secondsRemaining}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-200">
                Rolling Security Token
              </div>
              <div className="text-[9px] text-slate-400">
                Regenerates in {tokenData.secondsRemaining}s
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>30s Cycle</span>
          </div>
        </div>
      )}

      {/* Security Hash & Copy Payload */}
      {showPayloadHash && (
        <div className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[10px] text-slate-400">
          <div className="truncate max-w-[170px] sm:max-w-[200px]">
            <span className="text-slate-500">Hash: </span>
            <span className="text-cyan-300 font-medium">{tokenData.token}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
            title="Copy Secure Token"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
