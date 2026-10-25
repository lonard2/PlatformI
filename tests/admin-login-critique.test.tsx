/**
 * PlatformI - OCC login critique fixes.
 * Presets preview who/where; guardrails count attempts and state the session;
 * the passkey is humane; success lands with context; the gate knows its env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import { useLanguageStore } from "@/lib/i18n";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

import AdminLoginPage from "@/app/admin/login/page";

function fillCredentials(id: string, passkey: string): void {
  fireEvent.change(screen.getByLabelText(/badge id|operator id/i), {
    target: { value: id },
  });
  fireEvent.change(screen.getByLabelText(/security passkey/i), {
    target: { value: passkey },
  });
}

describe("Auth guardrails", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: "Invalid operator credentials." }),
        } as Response)
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("counts failed attempts on the error banner", async () => {
    render(<AdminLoginPage />);
    fillCredentials("OCC-DKA-01", "wrong-pass");
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    expect(await screen.findByText(/Attempt 1 of 5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    expect(await screen.findByText(/Attempt 2 of 5/)).toBeInTheDocument();
  });

  it("escalates to a supervisor lockout message after five failures", async () => {
    render(<AdminLoginPage />);
    for (let i = 0; i < 5; i++) {
      fillCredentials("OCC-DKA-01", `wrong-pass-${i}`);
      fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
      await screen.findByRole("alert");
    }
    expect(
      await screen.findByText(/contact your shift supervisor/i)
    ).toBeInTheDocument();
  });

  it("states the session scope under the submit button", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText(/8-hour shift session/i)).toBeInTheDocument();
  });
});

describe("Passkey humanity", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("toggles passkey visibility without clearing it", () => {
    render(<AdminLoginPage />);
    const input = screen.getByLabelText(/security passkey/i) as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.change(input, { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /show passkey/i }));
    expect(screen.getByLabelText(/security passkey/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/security passkey/i)).toHaveValue("secret123");
    fireEvent.click(screen.getByRole("button", { name: /hide passkey/i }));
    expect(screen.getByLabelText(/security passkey/i)).toHaveAttribute("type", "password");
  });

  it("preserves a typed passkey when re-tapping the same preset", () => {
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/security passkey/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /OCC-DKA-01.*Chief Dispatcher/i })
    );
    expect(screen.getByLabelText(/security passkey/i)).toHaveValue("secret123");
  });

  it("warns when caps lock is on while typing the passkey", () => {
    render(<AdminLoginPage />);
    const input = screen.getByLabelText(/security passkey/i);
    const capsUp = new KeyboardEvent("keyup", { key: "A", bubbles: true });
    Object.defineProperty(capsUp, "getModifierState", {
      value: () => true,
      configurable: true,
    });
    act(() => {
      input.dispatchEvent(capsUp);
    });
    expect(screen.getByText("Caps Lock is on")).toBeInTheDocument();
    const plainUp = new KeyboardEvent("keyup", { key: "a", bubbles: true });
    Object.defineProperty(plainUp, "getModifierState", {
      value: () => false,
      configurable: true,
    });
    act(() => {
      input.dispatchEvent(plainUp);
    });
    expect(screen.queryByText("Caps Lock is on")).not.toBeInTheDocument();
    fireEvent.blur(input);
  });

  it("clears the passkey when switching to a different operator", () => {
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/security passkey/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /OCC-MRT-02.*Line Controller/i })
    );
    expect(screen.getByLabelText(/security passkey/i)).toHaveValue("");
  });
});

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

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Readable success landing", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    mockPush.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        okJson({
          success: true,
          operator: {
            id: "OCC-DKA-01",
            name: "Raden Budi Santoso",
            role: "CHIEF_DISPATCHER",
          },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("names the operator and the landing surface in the success banner", async () => {
    render(<AdminLoginPage />);
    fillCredentials("OCC-DKA-01", "transitopps2026");
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    const banner = await screen.findByRole("status");
    expect(banner.textContent).toMatch(/Raden Budi Santoso/);
    expect(banner.textContent).toMatch(/Entering/);
    expect(banner.textContent).toMatch(/Operations Control Center/);
  });

  it("holds the success readable for ~1.2s before redirecting", async () => {
    vi.useFakeTimers();
    try {
      render(<AdminLoginPage />);
      fillCredentials("OCC-DKA-01", "transitopps2026");
      fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByRole("status").textContent).toMatch(/Raden Budi Santoso/);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700);
      });
      expect(mockPush).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(mockPush).toHaveBeenCalledWith("/admin");
    } finally {
      vi.useRealTimers();
    }
  });
});
