/**
 * PlatformI - Persisted Accessibility Preferences Store
 *
 * Holds the two app-level accessibility switches that the OS cannot express:
 * forced reduced motion and high contrast. Persisted to localStorage so the
 * passenger's choice survives reloads and navigation.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AccessibilityState {
  reducedMotion: boolean;
  highContrast: boolean;
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  resetAccessibility: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      reducedMotion: false,
      highContrast: false,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      resetAccessibility: () => set({ reducedMotion: false, highContrast: false }),
    }),
    { name: "platformi_accessibility" }
  )
);
