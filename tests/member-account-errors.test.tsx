/**
 * RED: server error codes become directional guidance, not one generic
 * sentence — unknown phone suggests registration (entries kept),
 * duplicates suggest sign-in, expired attempts say nothing changed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(async () => ({ id: "cred-9", rawId: "cred-9" })),
  startAuthentication: vi.fn(async () => ({ id: "cred-9", rawId: "cred-9" })),
}));

type RouteHandler = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

function stubFetch(handler: RouteHandler): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      handler(String(url)).then(({ ok, status, json }) => ({
        ok,
        status,
        json,
      }))
    )
  );
}

const ME_401 = () => Promise.resolve({ ok: false as const, status: 401, json: async () => ({}) });

describe("account error mapping", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function openPanel(): Promise<void> {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
  }

  it("unknown phone suggests registration and keeps the typed entries", async () => {
    stubFetch(async (url) => {
      if (url.includes("/api/members/me")) return ME_401();
      if (url.includes("/login/begin"))
        return { ok: false, status: 404, json: async () => ({ success: false, error: "UNKNOWN_MEMBER" }) };
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) };
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji Baru" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081999000111" } });
    fireEvent.click(screen.getByRole("button", { name: /continue with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.getByText(/no account found/i)).toBeInTheDocument();
    expect(screen.getByText(/entries are kept|kept/i)).toBeInTheDocument();
    expect((screen.getByLabelText("Display name") as HTMLInputElement).value).toBe("Uji Baru");
  });

  it("duplicate registration suggests sign-in instead", async () => {
    stubFetch(async (url) => {
      if (url.includes("/api/members/me")) return ME_401();
      if (url.includes("/register/begin"))
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { provisionalId: "p", options: { challenge: "c" } } }),
        };
      if (url.includes("/register/finish"))
        return { ok: false, status: 409, json: async () => ({ success: false, error: "ALREADY_REGISTERED" }) };
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) };
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji Lama" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081999000222" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    expect(screen.getByText(/already registered/i)).toBeInTheDocument();
  });

  it("expired challenges say nothing changed and to retry", async () => {
    stubFetch(async (url) => {
      if (url.includes("/api/members/me")) return ME_401();
      if (url.includes("/login/begin"))
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { memberId: "m9", options: { challenge: "c" } } }),
        };
      if (url.includes("/login/finish"))
        return { ok: false, status: 400, json: async () => ({ success: false, error: "No valid challenge for this ceremony" }) };
      return { ok: true, status: 200, json: async () => ({ success: true, data: null }) };
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081999000333" } });
    fireEvent.click(screen.getByRole("button", { name: /continue with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    expect(screen.getByText(/nothing was changed|no changes/i)).toBeInTheDocument();
  });

  it("unrecognised failures stay generic instead of inventing guidance", async () => {
    stubFetch(async () => {
      throw new TypeError("network down");
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081999000444" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
