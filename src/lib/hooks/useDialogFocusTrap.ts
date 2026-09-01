/**
 * PlatformI - Reusable Dialog & Sheet Focus Trap & Restore Hook
 *
 * Implements accessible modal keyboard navigation conforming to WCAG 2.1 AA:
 * 1. Remembers the active trigger element before opening and restores focus upon closing.
 * 2. Cycles keyboard focus exclusively within focusable children on Tab / Shift+Tab.
 * 3. Listens for Escape key to trigger dismiss callback.
 * 4. Autofocuses the first focusable child or dialog container on mount.
 *
 * Zero placeholder stubs, strict TypeScript typing (no 'any').
 */

import { useEffect, useRef, useCallback } from "react";

interface UseDialogFocusTrapOptions {
  isOpen: boolean;
  onClose: () => void;
  autoFocus?: boolean;
}

export function useDialogFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  autoFocus = true,
}: UseDialogFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 1. Save prior focus and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }

    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isOpen]);

  // 2. Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 3. Focus cycling trap (Tab & Shift+Tab)
  const handleTrapKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    if (e.key !== "Tab" || !containerRef.current) return;

    const focusables = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // 4. Initial autofocus
  useEffect(() => {
    if (!isOpen || !autoFocus || !containerRef.current) return;

    const focusables = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      containerRef.current.focus();
    }
  }, [isOpen, autoFocus]);

  return {
    containerRef,
    handleTrapKeyDown,
  };
}
