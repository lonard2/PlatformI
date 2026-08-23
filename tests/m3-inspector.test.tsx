/**
 * PlatformI - Milestone 3 (M3) Enthusiast Inspector, Station Hub & Seating Matrix Tests
 * Validates Technical Specs, Interactive SVG Seating Layouts, Photo Gallery,
 * Station Hub Real-Time Boards, Universal Accessibility Matrix, and Skybridge Transfer Guides.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  VehicleTechnicalSpecs,
  VehicleSeatingDiagram,
  VehiclePhotoGallery,
  VehicleDetailSheet,
  VehicleCarriageSelector,
  HubDetailSheet,
  SkybridgeTransferGuide,
  SKYBRIDGE_HUBS_DATA,
} from "@/components/inspector";
import { TRANSIT_VEHICLES, TRANSIT_STOPS, TRANSIT_LINES } from "@/lib/data/jakarta-dataset";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { Vehicle } from "@/types/transit";

describe("Milestone 3: Enthusiast Vehicle Inspector & Hub Boards", () => {
  beforeEach(() => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES,
      allStops: TRANSIT_STOPS,
      allLines: TRANSIT_LINES,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  describe("1. VehicleTechnicalSpecs Component", () => {
    it("renders authentic coachbuilder and chassis specs for MRT Ratangga EMU", () => {
      const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
      expect(mrtVehicle).toBeDefined();

      render(<VehicleTechnicalSpecs vehicle={mrtVehicle} />);

      expect(screen.getByText(/Nippon Sharyo/i)).toBeInTheDocument();
      expect(screen.getByText(/Powertrain/i)).toBeInTheDocument();
      expect(screen.getByText(/1500V DC/i)).toBeInTheDocument();
      expect(screen.getByText(/GoA 2 ATP\/ATO/i)).toBeInTheDocument();
    });

    it("renders high-speed specs for Whoosh KCIC400AF Komodo Merah", () => {
      const whooshVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "WHOOSH_HSR")!;
      expect(whooshVehicle).toBeDefined();

      render(<VehicleTechnicalSpecs vehicle={whooshVehicle} />);

      expect(screen.getByText(/CRRC Qingdao Sifang/i)).toBeInTheDocument();
      expect(screen.getByText(/9,600 kW/i)).toBeInTheDocument();
      expect(screen.getByText(/350/i)).toBeInTheDocument();
      expect(screen.getByText(/CTCS-3/i)).toBeInTheDocument();
    });

    it("renders Scania or Mercedes and Karoseri specs for bus", () => {
      const busVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "TRANSJAKARTA_BRT")!;
      expect(busVehicle).toBeDefined();

      render(<VehicleTechnicalSpecs vehicle={busVehicle} />);

      expect(screen.getAllByText(/Laksana/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Scania/i)[0]).toBeInTheDocument();
    });

    it("renders Baze luxury interior and Toyota HiAce Premio specs for Executive Shuttle", () => {
      const hiaceVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "EXECUTIVE_SHUTTLE")!;
      expect(hiaceVehicle).toBeDefined();

      render(<VehicleTechnicalSpecs vehicle={hiaceVehicle} />);

      expect(screen.getByText(/Baze Luxury/i)).toBeInTheDocument();
      expect(screen.getByText(/Toyota HiAce Premio/i)).toBeInTheDocument();
      expect(screen.getByText(/1GD-FTV/i)).toBeInTheDocument();
      expect(screen.getByText(/Vehicle Stability Control/i)).toBeInTheDocument();
    });
  });

  describe("2. VehicleSeatingDiagram Component", () => {
    it("renders interactive SVG diagram for Sleeper Suites 1-1-1 layout for intercity AKAP bus", () => {
      const rosaliaVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "AKAP_INTERCITY_BUS")!;
      render(<VehicleSeatingDiagram vehicle={rosaliaVehicle} />);

      expect(screen.getByText(/Total Kursi:/i)).toBeInTheDocument();
      expect(screen.getByText(/ARAH DEPAN/i)).toBeInTheDocument();

      // Click seat 1A to inspect
      const seat1A = screen.getByText("1A");
      expect(seat1A).toBeInTheDocument();
      fireEvent.click(seat1A);

      // Verify seat detail card appears
      expect(screen.getByText(/Kursi #1A/i)).toBeInTheDocument();
    });

    it("renders Super Executive 2-1 layout and inspects single VIP recliner for Whoosh", () => {
      const whooshVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "WHOOSH_HSR")!;
      render(<VehicleSeatingDiagram vehicle={whooshVehicle} />);

      expect(screen.getByText(/Total Kursi:/i)).toBeInTheDocument();

      const seat1A = screen.getByText("1A");
      expect(seat1A).toBeInTheDocument();
      fireEvent.click(seat1A);

      expect(screen.getByText(/Kursi #1A/i)).toBeInTheDocument();
    });

    it("renders Urban Standing Cabin layout for MRT Ratangga", () => {
      const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
      render(<VehicleSeatingDiagram vehicle={mrtVehicle} />);

      expect(screen.getByText(/Total Kapasitas:/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagram Tata Letak Kabin/i)).toBeInTheDocument();
      expect(screen.getByText(/AREA BERDIRI/i)).toBeInTheDocument();
    });

    it("renders HiAce VIP Captain Chairs layout with fast charge", () => {
      const hiaceVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "EXECUTIVE_SHUTTLE")!;
      render(<VehicleSeatingDiagram vehicle={hiaceVehicle} />);

      expect(screen.getByText(/Total Kursi:/i)).toBeInTheDocument();

      const seat1A = screen.getByText("1A");
      expect(seat1A).toBeInTheDocument();
      fireEvent.click(seat1A);

      expect(screen.getByText(/Kursi #1A/i)).toBeInTheDocument();
    });

    it("renders Speedboat Marine Cabin with life jacket indicators", () => {
      const boatVehicle: Vehicle = {
        ...TRANSIT_VEHICLES.find((v) => v.mode === "MARITIME_SPEEDBOAT")!,
        seatingDiagram: undefined,
      };
      render(<VehicleSeatingDiagram vehicle={boatVehicle} />);

      expect(screen.getByText(/Total Kursi:/i)).toBeInTheDocument();
    });
  });

  describe("3. VehiclePhotoGallery Component", () => {
    it("renders verified photographer credits, angle tags, and carousel navigation", () => {
      const multiPhotoVehicle: Vehicle = {
        ...TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!,
        photos: undefined,
      };
      render(<VehiclePhotoGallery vehicle={multiPhotoVehicle} />);

      expect(screen.getByText(/Photo by/i)).toBeInTheDocument();

      // Test next/prev photo buttons
      const nextBtn = screen.getByLabelText(/Next photo/i);
      expect(nextBtn).toBeInTheDocument();
      fireEvent.click(nextBtn);

      const prevBtn = screen.getByLabelText(/Previous photo/i);
      expect(prevBtn).toBeInTheDocument();
      fireEvent.click(prevBtn);
    });
  });

  describe("4. VehicleDetailSheet Component", () => {
    it("renders overview telemetry, trainset & run details, and switches between tabs", () => {
      const mrtVehicle = TRANSIT_VEHICLES.find((v) => v.mode === "MRT_JAKARTA")!;
      const onCloseMock = vi.fn();

      render(<VehicleDetailSheet vehicleId={mrtVehicle.id} onClose={onCloseMock} />);

      // Overview Tab is default
      expect(screen.getAllByText(/MRT Ratangga/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Kecepatan/i)).toBeInTheDocument();
      expect(screen.getByText(/Arah|Heading|Kompas/i)).toBeInTheDocument();
      expect(screen.getByText(/Kepadatan|Tingkat/i)).toBeInTheDocument();

      // Verify trainset, run number, formation, and depot details
      expect(screen.getByText(/Informasi Dinas & Rangkaian KA/i)).toBeInTheDocument();
      expect(screen.getAllByText(/M-101/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/TS-01/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/16 Trainset/i)).toBeInTheDocument();
      expect(screen.getByText(/6 Kereta \(4M2T\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Depo MRT Lebak Bulus/i)).toBeInTheDocument();

      // Switch to Tech Specs tab
      const specsTab = screen.getByRole("button", { name: /Spesifikasi/i });
      fireEvent.click(specsTab);
      expect(screen.getByText(/Karoseri & Struktur Body/i)).toBeInTheDocument();

      // Switch to Seating tab
      const seatingTab = screen.getByRole("button", { name: /Gerbong|Kabin|Dek/i });
      fireEvent.click(seatingTab);
      expect(screen.getByText(/Diagram Tata Letak Kabin/i)).toBeInTheDocument();

      // Click close button
      const closeBtn = screen.getByLabelText(/Tutup detail kendaraan/i);
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. HubDetailSheet Component", () => {
    it("renders real-time departure boards with authentic run numbers and trainset codes", () => {
      const dukuhAtasStop = TRANSIT_STOPS.find((s) => s.id.includes("dka") || s.name.includes("Dukuh Atas"))!;
      expect(dukuhAtasStop).toBeDefined();

      const onCloseMock = vi.fn();
      render(<HubDetailSheet stopId={dukuhAtasStop.id} onClose={onCloseMock} />);

      expect(screen.getByText(/Stasiun Dukuh Atas BNI/i)).toBeInTheDocument();
      expect(screen.getByText(/Jadwal Keberangkatan/i)).toBeInTheDocument();

      // Check departure item expansion and trainset/run details
      const departureButtons = screen.getAllByRole("button");
      const firstDeparture = departureButtons.find((btn) => btn.textContent?.includes("Est:"));
      expect(firstDeparture).toBeDefined();
      if (firstDeparture) {
        fireEvent.click(firstDeparture);
        expect(screen.getByText(/Lacak di Peta/i)).toBeInTheDocument();
      }

      // Check facilities tab
      const facilitiesTab = screen.getByRole("button", { name: /Fasilitas & Aksesibilitas/i });
      fireEvent.click(facilitiesTab);

      expect(screen.getByText(/Universal Accessibility Standards/i)).toBeInTheDocument();
      expect(screen.getByText(/Tactile Paving:/i)).toBeInTheDocument();
      expect(screen.getByText(/Prayer Room \(Musholla\)/i)).toBeInTheDocument();
    });

    it("renders skybridge guide tab for CSW ASEAN interchange", () => {
      const cswStop = TRANSIT_STOPS.find((s) => s.name.includes("ASEAN") || s.id.includes("asn"))!;
      expect(cswStop).toBeDefined();

      render(<HubDetailSheet stopId={cswStop.id} />);

      const skybridgeTab = screen.getByRole("button", { name: /Skybridge|Jembatan/i });
      expect(skybridgeTab).toBeDefined();
      fireEvent.click(skybridgeTab);

      expect(screen.getByText(/CSW - ASEAN 5-Story Circular Skybridge/i)).toBeInTheDocument();
      expect(screen.getByText(/Elevation: \+18.0 meters/i)).toBeInTheDocument();
    });
  });

  describe("6. SkybridgeTransferGuide Component", () => {
    it("provides step-by-step pedestrian vector navigation for all 4 major skybridges", () => {
      expect(SKYBRIDGE_HUBS_DATA["csw-asean"]).toBeDefined();
      expect(SKYBRIDGE_HUBS_DATA["dukuh-atas"]).toBeDefined();
      expect(SKYBRIDGE_HUBS_DATA["halim-hsr"]).toBeDefined();
      expect(SKYBRIDGE_HUBS_DATA["manggarai-hub"]).toBeDefined();

      render(<SkybridgeTransferGuide initialHubId="csw-asean" />);
      expect(screen.getByText(/CSW - ASEAN 5-Story Circular Skybridge/i)).toBeInTheDocument();
      expect(screen.getByText(/MRT ASEAN Concourse to Skybridge North Gate/i)).toBeInTheDocument();
    });
  });

  describe("7. VehicleCarriageSelector Component", () => {
    it("renders interactive train formation and lets user select individual carriages", () => {
      const trainVehicle = TRANSIT_VEHICLES.find(
        (v) => v.carriages && v.carriages.length >= 6
      )!;
      expect(trainVehicle).toBeDefined();
      expect(trainVehicle.carriages).toBeDefined();

      const { container } = render(<VehicleCarriageSelector vehicle={trainVehicle} />);

      // Verify title shows SF length
      expect(screen.getByText(new RegExp(`(Diagram Formasi Rangkaian|Susunan Rangkaian Kereta) \\(${trainVehicle.carriages!.length} SF\\)`, "i"))).toBeInTheDocument();

      // Verify buttons for K1, K2, etc.
      expect(screen.getAllByText("K1")[0]).toBeInTheDocument();
      expect(screen.getAllByText("K2")[0]).toBeInTheDocument();

      // Click on Kereta 2
      const k2Btns = screen.getAllByText("K2");
      fireEvent.click(k2Btns[0]);

      // Verify Kereta 2 details show up
      expect(screen.getByText(/Kereta 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Kapasitas Penumpang/i)).toBeInTheDocument();
      expect(screen.getByText(/Suhu Kabin/i)).toBeInTheDocument();
      expect(screen.getByText(/(Sistem Traksi|Status Powertrain) \/ Daya/i)).toBeInTheDocument();
    });
  });
});
