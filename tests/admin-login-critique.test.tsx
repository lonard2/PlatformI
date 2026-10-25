/**
 * PlatformI - OCC login critique fixes.
 * Presets preview who/where; guardrails count attempts and state the session;
 * the passkey is humane; success lands with context; the gate knows its env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useLanguageStore } from "@/lib/i18n";

const { mockPush, mockGet } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGet: vi.fn((): string | null => null),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => ({ get: mockGet }),
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
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
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
    process.env.NEXT_PUBLIC_DEMO_MODE = "1";
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
    fireEvent.change(screen.getByLabelText(/badge id|operator id/i), {
      target: { value: "OCC-DKA-01" },
    });
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
    process.env.NEXT_PUBLIC_DEMO_MODE = "1";
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
    expect(screen.queryByTestId("auth-identity-line")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/badge id|operator id/i), {
      target: { value: "OCC-DKA-01" },
    });
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
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
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

describe("Environment identity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it("defaults to production: env badge, no demo switcher, no version tag", () => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    useLanguageStore.getState().setLanguage("en");
    render(<AdminLoginPage />);
    expect(screen.getByText("ENV: PRODUCTION")).toBeInTheDocument();
    expect(screen.queryByText("v1.0.0-PROD")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo Credentials:")).not.toBeInTheDocument();
  });

  it("shows the demo switcher only behind the demo flag", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "1";
    useLanguageStore.getState().setLanguage("en");
    render(<AdminLoginPage />);
    expect(screen.getByText("ENV: DEMO")).toBeInTheDocument();
    expect(screen.getByText("Demo Credentials:")).toBeInTheDocument();
  });
});

describe("Deferred minors batch", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    process.env.NEXT_PUBLIC_DEMO_MODE = "1";
    mockGet.mockReset();
    mockGet.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    mockGet.mockReset();
  });

  it("counts rapid double-submits as two attempts", async () => {
    const resolvers: Array<(v: Response) => void> = [];
    const fail401 = {
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: "Invalid operator credentials." }),
    } as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolvers.push(resolve);
          })
      )
    );
    const { container } = render(<AdminLoginPage />);
    fillCredentials("OCC-DKA-01", "wrong-pass");
    const submitBtn = () =>
      container.querySelector('button[type="submit"]') as HTMLButtonElement;
    // Both dispatches land before React re-renders: the button cannot
    // disable fast enough, so each submit must still count on its own.
    act(() => {
      submitBtn().dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      submitBtn().dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });
    resolvers.forEach((resolve) => resolve(fail401));
    expect(await screen.findByText(/Attempt 2 of 5/)).toBeInTheDocument();
  });

  it("keeps the lockout guidance when tapping a preset", async () => {
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
    render(<AdminLoginPage />);
    for (let i = 0; i < 4; i++) {
      fillCredentials("OCC-DKA-01", `wrong-pass-${i}`);
      fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
      await screen.findByText(new RegExp(`Attempt ${i + 1} of 5`));
    }
    fillCredentials("OCC-DKA-01", "wrong-pass-4");
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    await screen.findByText(/contact your shift supervisor/i);
    fireEvent.click(
      screen.getByRole("button", { name: /OCC-MRT-02.*Line Controller/i })
    );
    expect(
      screen.getByText(/contact your shift supervisor/i)
    ).toBeInTheDocument();
  });

  it("moves focus to the error banner when it appears", async () => {
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
    render(<AdminLoginPage />);
    fillCredentials("OCC-DKA-01", "wrong-pass");
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    const banner = await screen.findByRole("alert");
    expect(document.activeElement).toBe(banner);
  });

  it("links the badge hint to the input for screen readers", () => {
    render(<AdminLoginPage />);
    const input = screen.getByLabelText(/badge id|operator id/i);
    expect(input.getAttribute("aria-describedby")).toBe("operator-badge-hint");
    expect(document.getElementById("operator-badge-hint")).toHaveTextContent(
      /OCC-DKA-01/
    );
  });

  it("hides every decorative icon from assistive technology", () => {
    const { container } = render(<AdminLoginPage />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of Array.from(svgs)) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("isolates the identity line for bidirectional text", () => {
    render(<AdminLoginPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /OCC-DKA-01.*Chief Dispatcher/i })
    );
    const line = screen.getByTestId("auth-identity-line");
    expect(line.querySelector("bdi")).not.toBeNull();
  });

  it("starts empty with a preset datalist instead of a prefilled ID", () => {
    render(<AdminLoginPage />);
    expect(screen.getByLabelText(/badge id|operator id/i)).toHaveValue("");
    expect(screen.queryByTestId("auth-identity-line")).not.toBeInTheDocument();
    const list = document.getElementById("operator-id-list");
    expect(list?.querySelectorAll("option")).toHaveLength(3);
  });

  it("samples caps lock on Ctrl+V keydown before the paste lands", () => {
    render(<AdminLoginPage />);
    const input = screen.getByLabelText(/security passkey/i);
    const ctrlV = new KeyboardEvent("keydown", { key: "v", bubbles: true });
    Object.defineProperty(ctrlV, "getModifierState", {
      value: () => true,
      configurable: true,
    });
    act(() => {
      input.dispatchEvent(ctrlV);
    });
    expect(screen.getByText("Caps Lock is on")).toBeInTheDocument();
  });

  it("falls back to the dashboard label for unknown admin routes", async () => {
    mockGet.mockReturnValue("/admin/nonexistent");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        okJson({
          success: true,
          operator: { id: "OCC-DKA-01", name: "Raden Budi Santoso" },
        })
      )
    );
    render(<AdminLoginPage />);
    fillCredentials("OCC-DKA-01", "transitopps2026");
    fireEvent.click(screen.getByRole("button", { name: /access occ dashboard/i }));
    const banner = await screen.findByRole("status");
    expect(banner.textContent).toMatch(/Operations Control Center/);
  });
});
