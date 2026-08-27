/**
 * PlatformI - Multi-Model AI Transit Assistant Modal
 *
 * Provides real-time multimodal navigational advice, schedule reasoning,
 * fare cap calculations, and intermodal skybridge directions using 6 designated models.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  Send,
  X,
  RotateCcw,
  Compass,
  Layers,
  MapPin,
  Check,
  Copy,
  ChevronDown,
  Info,
  Loader2,
  HelpCircle,
} from "lucide-react";
import {
  SUPPORTED_AI_MODELS,
  DEFAULT_AI_MODEL_ID,
  PROMPT_SUGGESTIONS,
  AIChatMessage,
  AIAdvisorResponse,
} from "@/lib/services/aiTransitService";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";

export interface AITransitAssistantModalProps {
  onClose: () => void;
  isOpen: boolean;
}

interface ExtendedChatMessage extends AIChatMessage {
  id: string;
  suggestedStops?: string[];
  suggestedLines?: string[];
  modelUsed?: string;
  timestamp?: string;
}

export const AITransitAssistantModal: React.FC<AITransitAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_AI_MODEL_ID);
  const [inputQuery, setInputQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Store actions to trigger cartography interactions
  const selectStop = useTransitStore((state) => state.selectStop);
  const selectLine = useTransitStore((state) => state.selectLine);
  const allStops = useTransitStore((state) => state.allStops);
  const allLines = useTransitStore((state) => state.allLines);

  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `### Welcome to PlatformI AI Transit Advisor!

I am your multimodal transit copilot for the **Jakarta & Bodetabek** metropolitan transit network.

You can ask me anything about:
- **Optimal Multimodal Routes** (MRT, LRT, KRL, Whoosh, TransJakarta, MikroTrans)
- **JakLingko Rp 10,000 Integrated 3-Hour Tariff Cap** calculations
- **Intermodal Skybridge Transfers** (Dukuh Atas TOD, CSW-ASEAN 5-level hub, Manggarai)
- **Aviation & Maritime Links** (Soekarno-Hatta CGK, Halim HLP, Kepulauan Seribu speedboats)

*Select an AI reasoning model below or tap one of the suggested prompts to begin!*`,
      modelUsed: DEFAULT_AI_MODEL_ID,
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of message list
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalTitleId = "ai-advisor-title";

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => inputRef.current?.focus(), 150);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const currentModelConfig =
    SUPPORTED_AI_MODELS.find((m) => m.id === selectedModel) || SUPPORTED_AI_MODELS[0];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputQuery).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ExtendedChatMessage = {
      id: userMessageId,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInputQuery("");
    setIsLoading(true);

    try {
      const apiMessages: AIChatMessage[] = nextMessages
        .filter((m) => m.id !== "msg-welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`API responded with HTTP ${res.status}`);
      }

      const resData = (await res.json()) as {
        success: boolean;
        data: AIAdvisorResponse;
        error?: string;
      };

      if (!resData.success || !resData.data) {
        throw new Error(resData.error || "Failed to parse advisor response");
      }

      const assistantMsg: ExtendedChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: resData.data.content,
        suggestedStops: resData.data.suggestedStops,
        suggestedLines: resData.data.suggestedLines,
        modelUsed: resData.data.modelUsed,
        timestamp: resData.data.timestamp,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("[AI Modal] Query error:", err);
      const fallbackMsg: ExtendedChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: "assistant",
        content: `### Network Advisory Notice
I was unable to establish a secure real-time link to the external AI provider. 

However, you can still inspect live transit lines and schedules via the cartography map controls or browse active disruption bulletins in the Service Status drawer.`,
        modelUsed: selectedModel,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "msg-welcome-reset",
        role: "assistant",
        content: `### Chat History Reset
AI Transit Advisor is ready for your next transit inquiry. What destination or fare policy would you like to explore?`,
        modelUsed: selectedModel,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleCopyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectStopOnMap = (stopId: string) => {
    selectStop(stopId);
    onClose();
  };

  const handleSelectLineOnMap = (lineId: string) => {
    selectLine(lineId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: "spring", damping: 26, stiffness: 290 }}
            className="bg-[#0e1424] border border-white/15 rounded-2xl w-full max-w-3xl h-[92vh] max-h-[780px] flex flex-col shadow-2xl overflow-hidden relative text-slate-100 outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* 1. MODAL HEADER */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={modalTitleId} className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {t.aiAdvisor.title}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono font-medium">
                  Multi-Model
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t.aiAdvisor.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              title={t.common.refresh}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label={t.common.close}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. MODEL SELECTOR BAR */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-400">{t.aiAdvisor.modelSelector}:</span>

            {/* Model Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-cyan-300 font-medium hover:border-cyan-400 transition"
              >
                <span>{currentModelConfig.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({currentModelConfig.provider})</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-[#121829] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-md">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-white/10 tracking-wider">
                    Designated OpenRouter Models
                  </div>
                  {SUPPORTED_AI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-800/80 transition ${
                        selectedModel === model.id ? "bg-cyan-950/40 text-cyan-300 font-semibold" : "text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {model.name}
                          {selectedModel === model.id && <Check className="w-3 h-3 text-cyan-400" />}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{model.provider}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal leading-tight">
                        {model.tagline}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <Info className="w-3 h-3 text-cyan-400" />
            <span>Grounded with live Jakarta transit dataset</span>
          </div>
        </div>

        {/* 3. PROMPT SUGGESTION CHIPS */}
        <div className="px-4 sm:px-6 py-2 bg-slate-950/50 border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            Quick:
          </span>
          {PROMPT_SUGGESTIONS.map((sug) => (
            <button
              key={sug.id}
              onClick={() => handleSendMessage(sug.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 text-slate-300 whitespace-nowrap transition shrink-0"
            >
              {sug.label}
            </button>
          ))}
        </div>

        {/* 4. CHAT MESSAGE STREAM */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-sm">
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 border border-cyan-400/30 shadow-md">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-950/30 rounded-tr-none"
                      : "bg-slate-900/90 border border-white/10 text-slate-200 shadow-lg rounded-tl-none"
                  }`}
                >
                  {/* Markdown Content Formatter */}
                  <div className="space-y-2 whitespace-pre-line prose-invert">
                    {msg.content.split("\n\n").map((paragraph, idx) => {
                      // Headers
                      if (paragraph.startsWith("### ")) {
                        return (
                          <h3 key={idx} className="text-sm sm:text-base font-bold text-cyan-300 mt-2 mb-1">
                            {paragraph.replace("### ", "")}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith("#### ")) {
                        return (
                          <h4 key={idx} className="text-xs sm:text-sm font-semibold text-slate-200 mt-2 mb-1">
                            {paragraph.replace("#### ", "")}
                          </h4>
                        );
                      }
                      if (paragraph.startsWith("---")) {
                        return <hr key={idx} className="border-white/10 my-2" />;
                      }

                      return (
                        <p key={idx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  {/* Interactive Stop & Line Action Chips */}
                  {!isUser && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {msg.suggestedStops && msg.suggestedStops.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">Hubs:</span>
                            {msg.suggestedStops.map((stopId) => {
                              const stop = allStops.find((s) => s.id === stopId);
                              if (!stop) return null;
                              return (
                                <button
                                  key={stopId}
                                  onClick={() => handleSelectStopOnMap(stopId)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-medium text-emerald-300 hover:bg-emerald-900/60 transition"
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>{stop.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {msg.suggestedLines && msg.suggestedLines.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">Lines:</span>
                            {msg.suggestedLines.map((lineId) => {
                              const line = allLines.find((l) => l.id === lineId);
                              if (!line) return null;
                              return (
                                <button
                                  key={lineId}
                                  onClick={() => handleSelectLineOnMap(lineId)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-medium text-cyan-300 hover:bg-cyan-900/60 transition"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{line.code}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Copy Answer Action */}
                      <button
                        onClick={() => handleCopyContent(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition"
                      >
                        {copiedId === msg.id ? (
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
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 border border-cyan-400/30 shadow-md animate-pulse">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-cyan-300">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Computing multimodal transit routes & JakLingko tariff...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 5. QUERY INPUT BAR */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={t.aiAdvisor.inputPlaceholder}
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.aiAdvisor.send}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Powered by OpenRouter Multimodal AI Router</span>
            <span>PlatformI Jabodetabek Engine</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
