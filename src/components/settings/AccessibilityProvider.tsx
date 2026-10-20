/**
 * PlatformI - Accessibility Provider
 *
 * Applies the passenger's accessibility preferences to the document and to
 * Framer Motion:
 * - `data-motion="reduced"` on <html> kills CSS transitions and animations
 * - `data-contrast="high"` on <html> raises muted text and glass opacity
 * - MotionConfig honours the OS "reduce motion" setting, and the in-app switch
 *   forces it regardless of the OS preference
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis.
 */

"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useAccessibilityStore } from "@/lib/stores/useAccessibilityStore";

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const highContrast = useAccessibilityStore((state) => state.highContrast);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = reducedMotion ? "reduced" : "full";
    root.dataset.contrast = highContrast ? "high" : "normal";
  }, [reducedMotion, highContrast]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
