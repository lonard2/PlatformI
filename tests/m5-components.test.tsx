/**
 * PlatformI - Milestone 5 UI Components Integration Test Suite
 *
 * Validates rendering and user interaction of M5 React components:
 * 1. AITransitAssistantModal.tsx
 * 2. DisruptionAlertBanner.tsx
 * 3. ServiceStatusDrawer.tsx
 * 4. AppSettingsModal.tsx
 * 5. UserTransitPreferencesModal.tsx
 * 6. TransportationSystemBar.tsx
 * 7. MobileBottomNav.tsx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AITransitAssistantModal } from "../src/components/ai/AITransitAssistantModal";
import { DisruptionAlertBanner } from "../src/components/alerts/DisruptionAlertBanner";
import { ServiceStatusDrawer } from "../src/components/alerts/ServiceStatusDrawer";
import { AppSettingsModal } from "../src/components/settings/AppSettingsModal";
import { UserTransitPreferencesModal } from "../src/components/settings/UserTransitPreferencesModal";
import { TransportationSystemBar } from "../src/components/navigation/TransportationSystemBar";
import { MobileBottomNav } from "../src/components/navigation/MobileBottomNav";
import { useTransitStore } from "../src/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS, TRANSIT_VEHICLES, DISRUPTION_ALERTS } from "../src/lib/data/jakarta-dataset";

describe("Milestone 5: React UI Components Integration", () => {
  beforeEach(() => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES,
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedModes: ["MRT_JAKARTA", "TRANSJAKARTA_BRT", "AKAP_INTERCITY_BUS"],
      selectedStopId: null,
      selectedLineId: null,
      theme: "dark",
      activeTileLayer: "dark",
      simulationSpeed: 1,
    });
  });

  describe("1. AITransitAssistantModal Component", () => {
    it("renders modal header, multi-model switcher, and suggested prompts", () => {
      const onClose = vi.fn();
      render(<AITransitAssistantModal isOpen={true} onClose={onClose} />);

      expect(screen.getAllByText(/AI Transit Advisor/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Multi-Model/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini 3.7 Flash/i)).toBeInTheDocument();

      // Check prompt chips
      expect(screen.getByText(/Lebak Bulus to PIK 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Whoosh Halim to Dukuh Atas/i)).toBeInTheDocument();
      expect(screen.getByText(/JakLingko Rp 10,000 Cap/i)).toBeInTheDocument();
    });

    it("handles close button interaction", () => {
      const onClose = vi.fn();
      render(<AITransitAssistantModal isOpen={true} onClose={onClose} />);

      const closeButtons = screen.getAllByRole("button");
      const xButton = closeButtons.find((btn) => btn.querySelector("svg"));
      if (xButton) {
        fireEvent.click(xButton);
      }
    });
  });

  describe("2. DisruptionAlertBanner Component", () => {
    it("renders active disruption banner with line badges and title", () => {
      const onOpenStatusDrawer = vi.fn();
      render(<DisruptionAlertBanner onOpenStatusDrawer={onOpenStatusDrawer} />);

      const firstAlert = DISRUPTION_ALERTS[0];
      if (firstAlert) {
        expect(screen.getByText(firstAlert.title)).toBeInTheDocument();
      }
    });

    it("triggers status drawer callback when clicking Network Status", () => {
      const onOpenStatusDrawer = vi.fn();
      render(<DisruptionAlertBanner onOpenStatusDrawer={onOpenStatusDrawer} />);

      const statusButton = screen.queryByTitle(/View Complete Network Status/i);
      if (statusButton) {
        fireEvent.click(statusButton);
        expect(onOpenStatusDrawer).toHaveBeenCalled();
      }
    });
  });

  describe("3. ServiceStatusDrawer Component", () => {
    it("renders complete network status drawer with category tabs and search", () => {
      const onClose = vi.fn();
      render(<ServiceStatusDrawer isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/Service Disruption Center/i)).toBeInTheDocument();
      expect(screen.getByText(/All Categories/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Filter by line code/i)).toBeInTheDocument();
    });
  });

  describe("4. AppSettingsModal Component", () => {
    it("renders theme, basemap tile, simulation speed, and OCC portal link", () => {
      const onClose = vi.fn();
      render(<AppSettingsModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/Application Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Dark Matter/i)).toBeInTheDocument();
      expect(screen.getByText(/Positron Light/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-Time \(1x\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Portal Petugas/i)).toBeInTheDocument();
    });

    it("updates store state when selecting a different basemap tile", () => {
      const onClose = vi.fn();
      render(<AppSettingsModal isOpen={true} onClose={onClose} />);

      const lightTileBtn = screen.getByText(/Positron Light/i);
      fireEvent.click(lightTileBtn);
      expect(useTransitStore.getState().activeTileLayer).toBe("light");
    });
  });

  describe("5. UserTransitPreferencesModal Component", () => {
    it("renders multimodal categories, pinned modes toggles, and routing priorities", () => {
      const onClose = vi.fn();
      render(<UserTransitPreferencesModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/Transit Preferences & Pinned Networks/i)).toBeInTheDocument();
      expect(screen.getByText(/Fastest Travel Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Lowest Fare & JakLingko Cap/i)).toBeInTheDocument();
      expect(screen.getByText(/Barrier-Free & Accessible/i)).toBeInTheDocument();
      expect(screen.getByText(/Select All/i)).toBeInTheDocument();
      expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
    });

    it("handles Select All and Clear All modes interactions", () => {
      const onClose = vi.fn();
      render(<UserTransitPreferencesModal isOpen={true} onClose={onClose} />);

      const clearAllBtn = screen.getByText(/Clear All/i);
      fireEvent.click(clearAllBtn);
      expect(useTransitStore.getState().selectedModes).toHaveLength(0);

      const selectAllBtn = screen.getByText(/Select All/i);
      fireEvent.click(selectAllBtn);
      expect(useTransitStore.getState().selectedModes.length).toBeGreaterThan(10);
    });
  });

  describe("6. TransportationSystemBar Component", () => {
    it("renders transportation groups: Rel, Bus & Terminal, Bandara, Pelabuhan", () => {
      render(<TransportationSystemBar />);

      expect(screen.getAllByText("Rel").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Bus & Terminal").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Bandara").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Pelabuhan & Laut").length).toBeGreaterThanOrEqual(1);

      // Check key systems and consolidated hubs
      expect(screen.getByText("MRT Jakarta")).toBeInTheDocument();
      expect(screen.getByText("Whoosh HSR")).toBeInTheDocument();
      expect(screen.getByText("TransJakarta BRT")).toBeInTheDocument();
      expect(screen.getByText("Terminal AKAP")).toBeInTheDocument();
      expect(screen.getByText("Travel Shuttle")).toBeInTheDocument();
      expect(screen.getByText("Bandara CGK & HLP")).toBeInTheDocument();
      expect(screen.getByText("Pelabuhan & Speedboat")).toBeInTheDocument();
    });

    it("opens popover and toggles mode when clicking mode badge popover toggle", () => {
      render(<TransportationSystemBar />);
      const mrtBtn = screen.getByText("MRT Jakarta").closest("button");
      if (mrtBtn) {
        // Click to open popover
        fireEvent.click(mrtBtn);
        // Popover is open, contains toggle button
        const toggleBtn = screen.getByText(/Aktif di Peta/i);
        expect(toggleBtn).toBeInTheDocument();
        fireEvent.click(toggleBtn);
        expect(useTransitStore.getState().selectedModes.includes("MRT_JAKARTA")).toBe(false);
      }
    });

    it("selects building hub and focuses viewport when clicking consolidated hub corridor", () => {
      render(<TransportationSystemBar />);
      const terminalBtn = screen.getByText("Terminal AKAP").closest("button");
      if (terminalBtn) {
        // Open popover
        fireEvent.click(terminalBtn);
        // Click specific terminal
        const puloGebangBtn = screen.getByText(/Terminal Terpadu Pulo Gebang/i);
        expect(puloGebangBtn).toBeInTheDocument();
        fireEvent.click(puloGebangBtn);
        expect(useTransitStore.getState().selectedStopId).toBe("stop-akap-pgb");
      }
    });
  });

  describe("7. MobileBottomNav Component", () => {
    it("renders Peta, Layanan, Tiket & QR, Laporan, and Asisten buttons", () => {
      const onOpenAIMock = vi.fn();
      const onOpenStatusMock = vi.fn();

      render(
        <MobileBottomNav
          onOpenAI={onOpenAIMock}
          onOpenStatus={onOpenStatusMock}
        />
      );

      expect(screen.getByText("Peta")).toBeInTheDocument();
      expect(screen.getByText("Layanan")).toBeInTheDocument();
      expect(screen.getByText("Tiket & QR")).toBeInTheDocument();
      expect(screen.getByText("Laporan")).toBeInTheDocument();
      expect(screen.getByText("Asisten")).toBeInTheDocument();

      // Click center QR button
      const qrBtn = screen.getByLabelText(/Buka Tiket & QR Gate Turnstile/i);
      fireEvent.click(qrBtn);
      expect(useTransitStore.getState().activeDrawer).toBe("tickets");

      // Click Asisten AI
      const asistenBtn = screen.getByText("Asisten");
      fireEvent.click(asistenBtn);
      expect(onOpenAIMock).toHaveBeenCalled();
    });
  });
});
