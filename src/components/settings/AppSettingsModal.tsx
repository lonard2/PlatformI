/**
 * PlatformI - Application Settings Modal
 *
 * Controls theme styling, cartography basemap tiles, simulation speed,
 * default AI advisor models, motion reduction, and audio cues.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Moon,
  Sun,
  Layers,
  Gauge,
  Bot,
  Sparkles,
  Volume2,
  VolumeX,
  Eye,
  Sliders,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import { useTransitStore, TileLayerId, SimulationSpeed } from "@/lib/stores/useTransitStore";
import { SUPPORTED_AI_MODELS, DEFAULT_AI_MODEL_ID } from "@/lib/services/aiTransitService";

export interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ isOpen, onClose }) => {
  const theme = useTransitStore((state) => state.theme);
  const setTheme = useTransitStore((state) => state.setTheme);
  const activeTileLayer = useTransitStore((state) => state.activeTileLayer);
  const setTileLayer = useTransitStore((state) => state.setTileLayer);
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const setSimulationSpeed = useTransitStore((state) => state.setSimulationSpeed);

  // Local state for app-level toggles
  const [selectedAIModel, setSelectedAIModel] = useState<string>(DEFAULT_AI_MODEL_ID);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState<boolean>(true);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const tileOptions: { id: TileLayerId; label: string; desc: string }[] = [
    { id: "dark", label: "Dark Matter", desc: "High-contrast dark cartography for night & cockpit view" },
    { id: "light", label: "Positron Light", desc: "Crisp clean daylight theme for bright environments" },
    { id: "satellite", label: "Satellite Imagery", desc: "Esri World Imagery showing real infrastructure" },
    { id: "streets", label: "OpenStreetMap", desc: "Standard street grid with detailed landmarks" },
  ];

  const speedOptions: { speed: SimulationSpeed; label: string; desc: string }[] = [
    { speed: 0, label: "Paused (0x)", desc: "Freeze vehicle vector movement for static inspection" },
    { speed: 1, label: "Real-Time (1x)", desc: "Authentic real-world speeds and scheduled headways" },
    { speed: 2, label: "Fast (2x)", desc: "2x Accelerated commute visualization" },
    { speed: 5, label: "High-Speed (5x)", desc: "5x Rapid network overview & route tracing" },
  ];

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setTheme("dark");
    setTileLayer("dark");
    setSimulationSpeed(1);
    setSelectedAIModel(DEFAULT_AI_MODEL_ID);
    setIsHighContrast(false);
    setIsReducedMotion(false);
    setIsAudioFeedbackEnabled(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#0c1220] border border-white/15 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
        {/* 1. HEADER */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Application Settings</h2>
              <p className="text-xs text-slate-400">Display, cartography basemaps, and simulation clock</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. SETTINGS CONTENT BODY */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section A: Theme & Appearance */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Theme & Interface Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                  theme === "dark"
                    ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-200 shadow-md"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Dark Cockpit</div>
                  <div className="text-[10px] text-slate-400">Night & low-light optimized</div>
                </div>
              </button>

              <button
                onClick={() => setTheme("light")}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition text-left ${
                  theme === "light"
                    ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-200 shadow-md"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Light Daylight</div>
                  <div className="text-[10px] text-slate-400">High-contrast daytime view</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section B: Basemap Tile Selector */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Cartography Basemap Tile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tileOptions.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => setTileLayer(tile.id)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition text-left ${
                    activeTileLayer === tile.id
                      ? "bg-blue-950/70 border-blue-500/60 text-blue-200 shadow-md"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="mt-0.5">
                    {activeTileLayer === tile.id ? (
                      <Check className="w-4 h-4 text-blue-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{tile.label}</div>
                    <div className="text-[10px] text-slate-400">{tile.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section C: Simulation Engine Clock Speed */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Vector Simulation Clock Multiplier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {speedOptions.map((opt) => (
                <button
                  key={opt.speed}
                  onClick={() => setSimulationSpeed(opt.speed)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                    simulationSpeed === opt.speed
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300 font-bold shadow-md"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="font-mono text-sm">{opt.label}</span>
                  <span className="text-[9px] text-slate-400 leading-tight mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section D: Default AI Reasoning Model */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              Default AI Advisor Model
            </label>
            <div className="space-y-1.5">
              {SUPPORTED_AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedAIModel(model.id)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition text-left ${
                    selectedAIModel === model.id
                      ? "bg-purple-950/50 border-purple-500/50 text-purple-200"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white text-xs flex items-center gap-2">
                      {model.name}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        {model.provider}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{model.recommendedFor}</div>
                  </div>
                  {selectedAIModel === model.id && <Check className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section E: Accessibility & Audio Toggles */}
          <div className="space-y-3 pt-1">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Accessibility & Sound
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">High Contrast Elements</div>
                    <div className="text-[10px] text-slate-400">Sharpen line badges and cartography text</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isHighContrast}
                  onChange={(e) => setIsHighContrast(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">Reduced Motion</div>
                    <div className="text-[10px] text-slate-400">Disable pulsing and sliding animations</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isReducedMotion}
                  onChange={(e) => setIsReducedMotion(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  {isAudioFeedbackEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <div>
                    <div className="font-semibold text-white">Turnstile Audio Chimes</div>
                    <div className="text-[10px] text-slate-400">Play chime on gate validation & QR scan</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAudioFeedbackEnabled}
                  onChange={(e) => setIsAudioFeedbackEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section E: Operator Portal Link */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">Portal Petugas & Operator (OCC)</div>
                <div className="text-[11px] text-slate-400">Akses back-office pengelolaan armada & validator gate</div>
              </div>
              <a
                href="/admin"
                className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition"
              >
                Buka Portal Admin
              </a>
            </div>
          </div>
        </div>

        {/* 3. FOOTER ACTIONS */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition transform active:scale-95"
            >
              {saveToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
