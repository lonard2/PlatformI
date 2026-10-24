/**
 * PlatformI - OCC login credential hygiene tests.
 * Presets may fill the operator ID for onboarding, but demo passkeys must
 * never render on the login card (no shoulder-surfable secrets).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import AdminLoginPage from "@/app/admin/login/page";

describe("AdminLogin credential hygiene", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  it("shows preset operator IDs without rendering any passkey", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText("OCC-DKA-01")).toBeInTheDocument();
    expect(screen.queryByText("transitopps2026")).not.toBeInTheDocument();
    expect(screen.queryByText("mrtjakarta2026")).not.toBeInTheDocument();
    expect(screen.queryByText("admin123")).not.toBeInTheDocument();
  });

  it("fills the operator ID on preset select and leaves the passkey empty", () => {
    render(<AdminLoginPage />);
    fireEvent.click(screen.getByText("OCC-MRT-02"));
    expect(screen.getByLabelText(/operator id|badge id/i)).toHaveValue("OCC-MRT-02");
    expect(screen.getByLabelText(/passkey/i)).toHaveValue("");
  });
});
