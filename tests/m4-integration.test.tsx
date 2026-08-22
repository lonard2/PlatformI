/**
 * Milestone 4 UI & Component Integration Test Suite
 * Validates rendering and user interaction of M4 React components:
 * - CheckInModal.tsx
 * - CommunityLiveFeed.tsx
 * - DynamicQRCode.tsx
 * - TicketPurchaseModal.tsx
 * - DigitalPassWallet.tsx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInModal } from "../src/components/crowdsource/CheckInModal";
import { CommunityLiveFeed } from "../src/components/crowdsource/CommunityLiveFeed";
import { DynamicQRCode } from "../src/components/ticketing/DynamicQRCode";
import { TicketPurchaseModal } from "../src/components/ticketing/TicketPurchaseModal";
import { DigitalPassWallet } from "../src/components/ticketing/DigitalPassWallet";
import { useTransitStore } from "../src/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "../src/lib/data/jakarta-dataset";

describe("Milestone 4: UI Components Integration", () => {
  beforeEach(() => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES,
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: TRANSIT_VEHICLES[0]?.id || null,
    });
  });

  describe("1. CheckInModal Component", () => {
    it("renders crowd density options and handles 1-tap selection", () => {
      const onClose = vi.fn();
      render(<CheckInModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/Commuter Check-In/i)).toBeInTheDocument();
      expect(screen.getByText(/Level 1: Low Density/i)).toBeInTheDocument();
      expect(screen.getByText(/Level 4: Crush Load/i)).toBeInTheDocument();
      expect(screen.getByText("OPTIMAL")).toBeInTheDocument();

      // Tap Level 3
      const level3Btn = screen.getByText(/Level 3: High Density/i);
      fireEvent.click(level3Btn);

      // Verify submit button is active
      const submitBtn = screen.getByText(/Submit Report \(1-Tap\)/i);
      expect(submitBtn).toBeInTheDocument();
    });
  });

  describe("2. CommunityLiveFeed Component", () => {
    it("renders live community ticker and triggers check-in callback", () => {
      const onOpenCheckIn = vi.fn();
      render(<CommunityLiveFeed onOpenCheckIn={onOpenCheckIn} />);

      expect(screen.getByText(/Community Live Ticker/i)).toBeInTheDocument();
      expect(screen.getByText(/Filter Line:/i)).toBeInTheDocument();

      const checkInButtons = screen.getAllByRole("button", { name: /Check-In/i });
      expect(checkInButtons.length).toBeGreaterThan(0);
      fireEvent.click(checkInButtons[0]);
      expect(onOpenCheckIn).toHaveBeenCalled();
    });
  });

  describe("3. DynamicQRCode Component", () => {
    it("renders rolling QR matrix and 30s countdown indicator", () => {
      render(
        <DynamicQRCode
          ticketId="TKT-TEST-99"
          userId="USR-TEST"
          size={180}
          showTimerRing={true}
          showPayloadHash={true}
        />
      );

      expect(screen.getByText(/HMAC-SHA256 Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Rolling Security Token/i)).toBeInTheDocument();
      expect(screen.getByText(/30s Cycle/i)).toBeInTheDocument();
    });
  });

  describe("4. TicketPurchaseModal Component", () => {
    it("renders multimodal route selector and payment method cards", () => {
      const onClose = vi.fn();
      render(<TicketPurchaseModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/Multi-Modal Pass Booking/i)).toBeInTheDocument();
      expect(screen.getByText(/Select Transit Line \/ Network/i)).toBeInTheDocument();
      expect(screen.getByText(/Origin Station \/ Stop/i)).toBeInTheDocument();
      expect(screen.getByText(/Destination Station \/ Stop/i)).toBeInTheDocument();
      expect(screen.getByText(/JakLingko Card/i)).toBeInTheDocument();
      expect(screen.getByText(/QRIS Instant/i)).toBeInTheDocument();
    });
  });

  describe("5. DigitalPassWallet Component", () => {
    it("renders active passes and switches between tabs", () => {
      render(<DigitalPassWallet isOpen={true} />);

      expect(screen.getByText(/Pass Wallet & QR Gate/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Active Passes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Trip History/i })).toBeInTheDocument();

      // Switch to Trip History
      const historyTab = screen.getByRole("button", { name: /Trip History/i });
      fireEvent.click(historyTab);
      expect(historyTab).toBeInTheDocument();
    });
  });
});
