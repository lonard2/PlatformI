/**
 * About + credits: the /about page renders localized sections from the
 * shared credit module, the settings modal links it, and CREDITS.md
 * names every attribution that matters.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import AboutPage from "@/app/about/page";
import { useLanguageStore } from "@/lib/i18n";
import { ABOUT_CREDIT_GROUPS } from "@/lib/aboutCredits";

describe("about and credits", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders mission, coverage, credits, and license in English", () => {
    useLanguageStore.setState({ language: "en" });
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /about platformi/i })).toBeInTheDocument();
    expect(screen.getByText(/one map for every jakarta way to move/i)).toBeInTheDocument();
    expect(screen.getAllByText(/lonard steven/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/openstreetmap contributors/i)).toBeInTheDocument();
    expect(screen.getByText(/mit-licensed/i)).toBeInTheDocument();
  });

  it("renders the same structure in Indonesian", () => {
    useLanguageStore.setState({ language: "id" });
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /tentang platformi/i })).toBeInTheDocument();
    expect(screen.getByText(/satu peta untuk semua cara bergerak/i)).toBeInTheDocument();
    // Proper names stay untranslated across locales.
    expect(screen.getAllByText(/lonard steven/i).length).toBeGreaterThan(0);
  });

  it("covers every credit group with entries", () => {
    expect(ABOUT_CREDIT_GROUPS.map((g) => g.id).sort()).toEqual(
      ["credits", "data", "maps", "tech"].sort()
    );
    for (const group of ABOUT_CREDIT_GROUPS) {
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  it("CREDITS.md names the attributions that matter", () => {
    const credits = fs.readFileSync(path.join(process.cwd(), "CREDITS.md"), "utf-8");
    for (const needle of [
      "Lonard Steven",
      "OpenStreetMap",
      "CARTO",
      "Esri",
      "MIT",
      "OpenRouter",
      "Leaflet",
      "CREDITS",
    ]) {
      expect(credits, needle).toContain(needle);
    }
    expect(credits).toMatch(/\/about/);
  });
});
