/**
 * PlatformI - OCC login critique fixes.
 * Presets preview who/where; guardrails count attempts and state the session;
 * the passkey is humane; success lands with context; the gate knows its env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import AdminLoginPage from "@/app/admin/login/page";

function fillCredentials(id: string, passkey: string): void {
  fireEvent.change(screen.getByLabelText(/badge id|operator id/i), {
    target: { value: id },
  });
  fireEvent.change(screen.getByLabelText(/passkey/i), {
    target: { value: passkey },
  });
}

describe("Preset identity preview", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows each preset's station hub on the card", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText("Dukuh Atas Integrated OCC Hub")).toBeInTheDocument();
    expect(screen.getByText("Lebak Bulus Depot OCC")).toBeInTheDocument();
  });

  it("states who is being authorized before submit, falling back to typed ID", () => {
    render(<AdminLoginPage />);
    expect(screen.getByTestId("auth-identity-line")).toHaveTextContent(
      "Raden Budi Santoso"
    );
    fireEvent.change(screen.getByLabelText(/badge id|operator id/i), {
      target: { value: "OCC-X-99" },
    });
    expect(screen.getByTestId("auth-identity-line")).toHaveTextContent(
      "Authorizing as OCC-X-99"
    );
  });
});
