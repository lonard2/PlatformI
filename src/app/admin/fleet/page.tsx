/**
 * PlatformI - Operator Control Portal: Fleet Management Editor
 *
 * Provides real-time inspection, karoseri/chassis editing, operational status
 * toggling, and new simulated vehicle deployment across all transit modes.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo, Suspense, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  Train,
  Bus,
  Plane,
  Anchor,
  X,
  Gauge,
  RotateCcw,
  Trash2,
  CircleAlert,
} from "lucide-react";
import {
  Vehicle,
  VehicleOperationalStatus,
  TransitCategory,
  TransitMode,
  CrowdDensityLevel,
  SeatingDiagram,
} from "@/types/transit";
import {
  generateSleeper111Seats,
  generateSuperExec21Seats,
  generateExecutive22Seats,
  generateCommuterLongitudinalSeats,
  generateHiAceCaptainSeats,
} from "@/lib/data/jakarta-dataset";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";
import { recordShiftAction } from "@/lib/services/shiftLogService";

interface PendingFleetUndo {
  vehicleId: string;
  vehicleCode: string;
  field: "status" | "crowdLevel" | "add" | "speed" | "delete" | "bulk" | "identity";
  previous?: VehicleOperationalStatus | CrowdDensityLevel;
  previousSpeedKmh?: number;
  previousVehicle?: Vehicle;
  bulkKind?: "status" | "crowd";
  bulkDestructive?: boolean;
  bulkItems?: Array<{
    vehicleId: string;
    previousStatus?: VehicleOperationalStatus;
    previousSpeedKmh?: number;
    previousCrowd?: CrowdDensityLevel;
  }>;
  label: string;
  expiry: number;
}

/** Field edits tolerate a short undo window; add/delete get a longer one. */
const UNDO_WINDOW_MS = 5000;

interface IdentityDraft {
  runNumber: string;
  trainsetNumber: string;
  totalTrainsets: string;
  carFormation: string;
  depotHome: string;
  fleetNumber: string;
  busRunNumber: string;
  licensePlate: string;
  operatorName: string;
}

function identityFromVehicle(v: Vehicle): IdentityDraft {
  return {
    runNumber: v.runNumber ?? "",
    trainsetNumber: v.trainsetNumber ?? "",
    totalTrainsets: v.totalTrainsets !== undefined ? String(v.totalTrainsets) : "",
    carFormation: v.carFormation ?? "",
    depotHome: v.depotHome ?? "",
    fleetNumber: v.fleetNumber ?? "",
    busRunNumber: v.busRunNumber ?? "",
    licensePlate: v.licensePlate ?? "",
    operatorName: v.operatorName ?? "",
  };
}
const DESTRUCTIVE_UNDO_WINDOW_MS = 15000;

interface FailedFleetSync {
  id: string;
  vehicleId: string;
  vehicleCode: string;
  kind: "delete" | "add" | "restore" | "update";
  vehicle?: Vehicle;
  update?: Record<string, unknown>;
}

interface ModeSpecOption {
  value: string;
  label: string;
}

function getSpecsForMode(
  mode: TransitMode | string | undefined,
  category: TransitCategory | string | undefined
): { coachbuilders: ModeSpecOption[]; chassises: ModeSpecOption[] } {
  // 1. Urban & Regional Rail
  if (
    category === "RAIL" ||
    mode === "MRT_JAKARTA" ||
    mode === "LRT_JABODEBEK_CIBUBUR" ||
    mode === "LRT_JABODEBEK_BEKASI" ||
    mode === "LRT_JAKARTA" ||
    mode === "KRL_BOGOR" ||
    mode === "KRL_CIKARANG" ||
    mode === "KRL_RANGKASBITUNG" ||
    mode === "KRL_TANGERANG" ||
    mode === "KRL_TANJUNG_PRIOK" ||
    mode === "WHOOSH_HSR" ||
    mode === "KAI_BANDARA" ||
    mode === "KAI_INTERCITY"
  ) {
    return {
      coachbuilders: [
        { value: "Nippon Sharyo / J-TREC", label: "Nippon Sharyo 1067mm Rolling Stock" },
        { value: "CRRC Qingdao Sifang", label: "CRRC KCIC400AF High-Speed EMU" },
        { value: "PT INKA (Persero) Madiun", label: "PT INKA Stainless Steel Trainset" },
        { value: "Hyundai Rotem / PT INKA", label: "Hyundai Rotem LRV EMU" },
        { value: "Kawasaki Heavy Industries", label: "Kawasaki Heavy Industries EMU" },
      ],
      chassises: [
        { value: "1500V DC EMU 6-Car Formation", label: "1500V DC EMU 6-Car Formation" },
        { value: "1500V DC EMU 8-12 Car Trainset", label: "1500V DC Heavy Rail EMU" },
        { value: "25kV AC 8-Car High-Speed Trainset", label: "25kV AC 8-Car High-Speed Trainset" },
        { value: "750V DC Third-Rail LRV Trainset", label: "750V DC Third-Rail 2-Car LRV" },
        { value: "GE CM20EMP / Co-Co Diesel-Electric", label: "GE CM20EMP Diesel-Electric Locomotive" },
      ],
    };
  }

  // 2. Mikrotrans (JakLingko Angkot / Minibus)
  if (mode === "MIKROTRANS") {
    return {
      coachbuilders: [
        { value: "Karoseri New Armada", label: "New Armada Grand Minibus AC" },
        { value: "Karoseri Delima Mandiri", label: "Delima Mandiri MikroTrans" },
        { value: "Karoseri Panca Tunggal", label: "Panca Tunggal Angkot AC" },
      ],
      chassises: [
        { value: "Suzuki New Carry 1.5L", label: "Suzuki New Carry 1.5L" },
        { value: "Daihatsu Gran Max 1.5L VVT-i", label: "Daihatsu Gran Max 1.5L" },
        { value: "Wuling Formo 1.2L Standard", label: "Wuling Formo 1.2L" },
        { value: "DFSK Gelora E Pure Electric", label: "DFSK Gelora E Electric Minivan" },
      ],
    };
  }

  // 3. Executive Shuttle / Travel
  if (mode === "EXECUTIVE_SHUTTLE") {
    return {
      coachbuilders: [
        { value: "Baze Luxury Bus Interior", label: "Baze Luxury VIP Lounge" },
        { value: "Karoseri Laksana (Tourista Executive)", label: "Laksana Tourista Executive" },
        { value: "Somagede / Baze Special Vehicle", label: "Somagede Executive Shuttle" },
      ],
      chassises: [
        { value: "Toyota HiAce Premio 2.8L Turbo Diesel", label: "Toyota HiAce Premio 2.8L" },
        { value: "Toyota HiAce Commuter 2.5L Diesel", label: "Toyota HiAce Commuter 2.5L" },
        { value: "Mercedes-Benz Sprinter 315 CDI", label: "Mercedes-Benz Sprinter 315 CDI" },
        { value: "Isuzu Elf Microbus Long 2.8L", label: "Isuzu Elf NQR Long" },
      ],
    };
  }

  // 4. AKAP Intercity Bus
  if (mode === "AKAP_INTERCITY_BUS") {
    return {
      coachbuilders: [
        { value: "Karoseri Adiputro (Jetbus 5 Super Double Decker)", label: "Adiputro Jetbus 5 SDD" },
        { value: "Karoseri Laksana (Legacy SR3 Suites Family Edition)", label: "Laksana Legacy SR3 Suites" },
        { value: "Karoseri Tentrem (Avante D2 Double Decker)", label: "Tentrem Avante D2" },
        { value: "Karoseri Morodadi Prima (Grand Vega)", label: "Morodadi Prima Grand Vega" },
        { value: "Karoseri Nusantara Gemilang (Cityliner DD)", label: "Nusantara Gemilang Aluminium DD" },
      ],
      chassises: [
        { value: "Mercedes-Benz OC 500 RF 2542 6x2 Triple-Axle", label: "Mercedes-Benz OC 500 RF 2542" },
        { value: "Scania K410IB 6x2*4 Opticruise", label: "Scania K410IB 6x2*4" },
        { value: "Volvo B11R 430 HP 6x2 I-Shift", label: "Volvo B11R 430 HP" },
        { value: "Mercedes-Benz OH 1626 Air Suspension", label: "Mercedes-Benz OH 1626" },
        { value: "Hino RN 285 Air Suspension", label: "Hino RN 285" },
      ],
    };
  }

  // 5. Aviation
  if (category === "AVIATION" || mode === "AIRPORT_COMMERCIAL") {
    return {
      coachbuilders: [
        { value: "The Boeing Company (Renton, USA)", label: "Boeing Commercial Airplanes" },
        { value: "Airbus S.A.S. (Toulouse / Hamburg)", label: "Airbus Commercial Aircraft" },
      ],
      chassises: [
        { value: "Boeing 737-800 Next Generation Twin-Jet", label: "Boeing 737-800 NG" },
        { value: "Airbus A320-200ceo Twin-Jet Narrow-Body", label: "Airbus A320-200" },
        { value: "Airbus A330-900neo Twin-Aisle Wide-Body", label: "Airbus A330-900neo" },
      ],
    };
  }

  // 6. Maritime
  if (category === "MARITIME" || mode === "MARITIME_SPEEDBOAT" || mode === "MARITIME_PELNI") {
    return {
      coachbuilders: [
        { value: "PT PAL Marine Craft Aluminium (Surabaya)", label: "PT PAL Marine Craft" },
        { value: "Meyer Werft Papenburg (Germany)", label: "Meyer Werft" },
        { value: "Galangan Kapal Marina Ancol (Jakarta)", label: "Marina Ancol Boatyard" },
      ],
      chassises: [
        { value: "Twin Yamaha 300 HP 4-Stroke V6 Outboards", label: "Twin Yamaha 300 HP Outboards" },
        { value: "Quad Suzuki 300 HP Electronic Fuel Injection", label: "Quad Suzuki 300 HP EFI" },
        { value: "MAN B&W 6L28/32A Marine Turbo-Diesel", label: "MAN B&W Marine Turbo-Diesel" },
      ],
    };
  }

  // 7. Default: City Buses (TransJakarta BRT / Non-BRT)
  return {
    coachbuilders: [
      { value: "Laksana (Cityline 3 Articulated BRT)", label: "Laksana Cityline 3 BRT" },
      { value: "Karoseri Tentrem (Velocity W5 Low-Entry)", label: "Tentrem Velocity W5 Low-Entry" },
      { value: "Karoseri Nusantara Gemilang (Cityliner Low-Entry)", label: "Nusantara Gemilang Maxi" },
      { value: "Adiputro Karoseri (Cityliner BRT)", label: "Adiputro Cityliner BRT" },
    ],
    chassises: [
      { value: "Scania K310IB 6x2*4 Articulated BRT", label: "Scania K310IB 6x2*4 Articulated" },
      { value: "Scania K250UB 4x2 Low-Entry Euro 6", label: "Scania K250UB 4x2 Low-Entry" },
      { value: "Mercedes-Benz OH 1626 NG Air Suspension", label: "Mercedes-Benz OH 1626 NG" },
      { value: "BYD B12 Pure Electric Low-Entry", label: "BYD B12 Pure Electric" },
      { value: "Hino RK8 R260 Heavy-Duty BRT", label: "Hino RK8 R260" },
    ],
  };
}

export default function FleetManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FleetManagementContent />
    </Suspense>
  );
}

function FleetManagementContent() {
  const { t, currentLanguageMeta } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const updateSingleVehicle = useTransitStore((state) => state.updateSingleVehicle);
  const updateSimulatedVehicles = useTransitStore((state) => state.updateSimulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);

  // Filter state is URL-synced: refresh and shared links restore the view
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">(
    () => (searchParams.get("category") as TransitCategory | null) ?? "ALL"
  );
  // Bulk triage: corridor holds touch many rows, so selection is first-class.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const VALID_SORTS = ["code-asc", "code-desc", "line", "speed", "status"] as const;
  const [sortSpec, setSortSpec] = useState<string>(() => {
    const initial = searchParams.get("sort");
    return initial && (VALID_SORTS as readonly string[]).includes(initial) ? initial : "code-asc";
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (activeCategory !== "ALL") params.set("category", activeCategory);
      if (sortSpec !== "code-asc") params.set("sort", sortSpec);
      const qs = params.toString();
      // Equality guard: skip the RSC navigation when the URL already matches
      if (window.location.search.replace(/^\?/, "") === qs) return;
      router.replace(qs ? `/admin/fleet?${qs}` : "/admin/fleet", { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, sortSpec, router]);

  // Back/forward restores the filtered view: follow the URL when it changes
  // underneath us (popstate), skipping values identical to current state so
  // the debounced write never bounces back into the fields
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const category = (searchParams.get("category") as TransitCategory | null) ?? "ALL";
    const sort = searchParams.get("sort");
    if (q !== searchQuery) setSearchQuery(q);
    if (category !== activeCategory) setActiveCategory(category);
    if (sort && sort !== sortSpec && (VALID_SORTS as readonly string[]).includes(sort)) setSortSpec(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  // Post-deploy identity draft: re-seeded whenever a different vehicle opens.
  const [identityDraft, setIdentityDraft] = useState<IdentityDraft | null>(null);
  const [photoDraft, setPhotoDraft] = useState({ url: "", caption: "", credit: "", tag: "" });

  useEffect(() => {
    setIdentityDraft(selectedVehicle ? identityFromVehicle(selectedVehicle) : null);
    setPhotoDraft({ url: "", caption: "", credit: "", tag: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Board truth: explicit pull with visible state — never a silent merge.
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastPulled, setLastPulled] = useState<number>(0);
  const [boardSyncError, setBoardSyncError] = useState<boolean>(false);
  const syncFleet = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setBoardSyncError(false);
    try {
      const res = await fetch("/api/fleet/vehicles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as { data?: unknown };
      if (!result?.data || !Array.isArray(result.data)) {
        setLastSyncAt(Date.now());
        setLastPulled(0);
        return;
      }
      // Merge custom/persisted vehicles with existing simulated vehicles
      const current = useTransitStore.getState().simulatedVehicles;
      const existingIds = new Set(current.map((v) => v.id));
      const fresh = (result.data as Vehicle[]).filter((v) => !existingIds.has(v.id));
      if (fresh.length > 0) {
        useTransitStore.getState().updateSimulatedVehicles([...current, ...fresh]);
      }
      setLastSyncAt(Date.now());
      setLastPulled(fresh.length);
    } catch {
      // Local board stays authoritative; the failure stays visible.
      setBoardSyncError(true);
    } finally {
      setIsSyncing(false);
      setHasSyncedOnce(true);
    }
  }, []);

  // Sync custom/database vehicles on mount through the visible sync path
  useEffect(() => {
    void syncFleet();
  }, [syncFleet]);

  // Operational status & crowd density grace undo: field-scoped Map registry.
  // Field edits keep a short window; add/delete get the destructive window.
  const [pendingUndos, setPendingUndos] = useState<Map<string, PendingFleetUndo>>(() => new Map());
  const pendingUndosRef = useRef(pendingUndos);
  pendingUndosRef.current = pendingUndos;
  const [undoPaused, setUndoPaused] = useState<boolean>(false);
  const undoPausedRef = useRef(false);
  undoPausedRef.current = undoPaused;
  // Locale ref: the expiry announcer speaks the locale at fire time,
  // not the one active when the window opened.
  const tRef = useRef(t);
  tRef.current = t;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const [failedSyncs, setFailedSyncs] = useState<FailedFleetSync[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const undoButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const bulkBarRef = useRef<HTMLDivElement | null>(null);
  // Single-shot finalizer: undo banners announce on insert via their own
  // role=status; this region announces once when a grace window expires
  // silently, mirroring the alerts-page finalizer. It clears after 5s so a
  // repeated finalize announces again.
  const [finalAnnouncement, setFinalAnnouncement] = useState<string>("");
  const finalAnnouncementTimer = useRef<number | null>(null);
  const announceFinal = (message: string): void => {
    if (finalAnnouncementTimer.current) {
      clearTimeout(finalAnnouncementTimer.current);
    }
    setFinalAnnouncement(message);
    finalAnnouncementTimer.current = window.setTimeout(() => {
      setFinalAnnouncement("");
    }, 5000);
  };
  useEffect(() => {
    return () => {
      if (finalAnnouncementTimer.current) {
        clearTimeout(finalAnnouncementTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingUndos.size === 0) return;

    const interval = setInterval(() => {
      if (undoPausedRef.current) {
        setPendingUndos((prev) => {
          const next = new Map(prev);
          for (const [id, item] of next) {
            next.set(id, { ...item, expiry: item.expiry + 1000 });
          }
          return next;
        });
        setNowTick(Date.now());
        return;
      }
      const now = Date.now();
      setNowTick(now);

      const currentMap = pendingUndosRef.current;
      const expiredIds: string[] = [];
      for (const [id, item] of currentMap) {
        if (item.expiry <= now) {
          expiredIds.push(id);
        }
      }

      if (expiredIds.length > 0) {
        // Natural expiry fallback: restore focus if undo button had focus
        expiredIds.forEach((id) => {
          const btn = undoButtonRefs.current.get(id);
          const hadFocus =
            typeof document !== "undefined" &&
            btn &&
            (document.activeElement === btn || btn.contains(document.activeElement));
          if (hadFocus) {
            lastTriggerRef.current?.focus();
          }
          undoButtonRefs.current.delete(id);
        });

        // Silent finalization still deserves one announcement.
        const expiredLabels = expiredIds
          .map((id) => currentMap.get(id)?.label)
          .filter((label): label is string => Boolean(label));
        if (expiredLabels.length > 0) {
          announceFinal(tRef.current.admin.fleetUndoFinalized.replace("{label}", expiredLabels.join(", ")));
        }

        setPendingUndos((prev) => {
          const next = new Map(prev);
          expiredIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingUndos.size]);

  const closeTelemetryModal = () => setSelectedVehicle(null);
  const closeAddModal = () => setIsAddModalOpen(false);

  const { containerRef: telemetryModalRef, handleTrapKeyDown: handleTelemetryTrapKey } =
    useDialogFocusTrap<HTMLDivElement>({
      isOpen: selectedVehicle !== null,
      onClose: closeTelemetryModal,
    });

  const { containerRef: addModalRef, handleTrapKeyDown: handleAddTrapKey } =
    useDialogFocusTrap<HTMLDivElement>({
      isOpen: isAddModalOpen,
      onClose: closeAddModal,
    });

  const openTelemetryModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  // New vehicle form state
  const [newLineId, setNewLineId] = useState<string>(allLines[0]?.id || "line-mrt-ns");
  const [newVehicleCode, setNewVehicleCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newSpeed, setNewSpeed] = useState<number>(45);
  // Extended identity (optional; blank stays undefined so DB columns stay NULL).
  const [newRunNumber, setNewRunNumber] = useState<string>("");
  const [newTrainsetNumber, setNewTrainsetNumber] = useState<string>("");
  const [newTotalTrainsets, setNewTotalTrainsets] = useState<string>("");
  const [newCarFormation, setNewCarFormation] = useState<string>("");
  const [newDepotHome, setNewDepotHome] = useState<string>("");
  const [newFleetNumber, setNewFleetNumber] = useState<string>("");
  const [newBusRunNumber, setNewBusRunNumber] = useState<string>("");
  const [newLicensePlate, setNewLicensePlate] = useState<string>("");
  const [newOperatorName, setNewOperatorName] = useState<string>("");

  const selectedLineForAdd = useMemo(() => {
    return allLines.find((l) => l.id === newLineId) || allLines[0];
  }, [allLines, newLineId]);

  const modeSpecs = useMemo(() => {
    return getSpecsForMode(selectedLineForAdd?.mode, selectedLineForAdd?.category);
  }, [selectedLineForAdd?.mode, selectedLineForAdd?.category]);

  const [newCoachbuilder, setNewCoachbuilder] = useState<string>(
    () => modeSpecs.coachbuilders[0]?.value || "Laksana Karoseri"
  );
  const [customCoachbuilder, setCustomCoachbuilder] = useState<string>("");
  const [newChassis, setNewChassis] = useState<string>(
    () => modeSpecs.chassises[0]?.value || "Scania K250UB 4x2"
  );
  const [customChassis, setCustomChassis] = useState<string>("");
  const [seatingLayoutChoice, setSeatingLayoutChoice] = useState<string>("DEFAULT");

  useEffect(() => {
    if (newCoachbuilder !== "__CUSTOM__" && !modeSpecs.coachbuilders.some((c) => c.value === newCoachbuilder)) {
      setNewCoachbuilder(modeSpecs.coachbuilders[0]?.value || "");
    }
    if (newChassis !== "__CUSTOM__" && !modeSpecs.chassises.some((c) => c.value === newChassis)) {
      setNewChassis(modeSpecs.chassises[0]?.value || "");
    }
  }, [modeSpecs, newCoachbuilder, newChassis]);

  // Add-form preview: the summary shows exactly what commit will store,
  // including the uppercase normalization and the auto-derived capacity.
  const normalizedNewCode = newVehicleCode.trim().toUpperCase();
  const isDuplicateCode =
    normalizedNewCode.length > 0 &&
    simulatedVehicles.some((v) => v.vehicleCode.toUpperCase() === normalizedNewCode);
  const addSummary = useMemo(() => {
    const line = selectedLineForAdd;
    const coachbuilder =
      newCoachbuilder === "__CUSTOM__" ? customCoachbuilder.trim() || t.admin.customKaroseri : newCoachbuilder;
    const chassis =
      newChassis === "__CUSTOM__" ? customChassis.trim() || t.admin.customChassis : newChassis;
    let diagramSeats: number | null = null;
    if (seatingLayoutChoice === "SLEEPER_1_1_1") {
      diagramSeats = generateSleeper111Seats("preview").totalSeats;
    } else if (seatingLayoutChoice === "SUPER_EXEC_2_1") {
      diagramSeats = generateSuperExec21Seats("preview").totalSeats;
    } else if (seatingLayoutChoice === "EXEC_2_2") {
      diagramSeats = generateExecutive22Seats("preview").totalSeats;
    } else if (seatingLayoutChoice === "HIACE_VIP") {
      diagramSeats = generateHiAceCaptainSeats("preview").totalSeats;
    } else if (seatingLayoutChoice === "COMMUTER_LONGITUDINAL") {
      diagramSeats = generateCommuterLongitudinalSeats("preview").totalSeats;
    }
    const seatCap = diagramSeats ?? (line?.category === "RAIL" ? 312 : 36);
    const standCap = line?.category === "RAIL" ? 800 : line?.mode === "MIKROTRANS" ? 0 : 45;
    return {
      lineCode: line?.code ?? "-",
      coachbuilder,
      chassis,
      capacity: seatCap + standCap,
      seatCap,
      standCap,
    };
  }, [selectedLineForAdd, newCoachbuilder, customCoachbuilder, newChassis, customChassis, seatingLayoutChoice, t]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return simulatedVehicles.filter((v) => {
      if (activeCategory !== "ALL" && v.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = v.vehicleCode.toLowerCase().includes(q);
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesKaroseri = v.coachbuilder.toLowerCase().includes(q);
        const matchesChassis = v.chassis.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesKaroseri && !matchesChassis) return false;
      }
      return true;
    });
  }, [simulatedVehicles, activeCategory, searchQuery]);

  // Sorted board: deterministic order for corridor triage.
  const sortedVehicles = useMemo(() => {
    const lineCodeOf = (vehicle: Vehicle): string =>
      allLines.find((l) => l.id === vehicle.lineId)?.code ?? "";
    const next = [...filteredVehicles];
    switch (sortSpec) {
      case "code-desc":
        next.sort((a, b) => b.vehicleCode.localeCompare(a.vehicleCode));
        break;
      case "line":
        next.sort((a, b) => lineCodeOf(a).localeCompare(lineCodeOf(b)) || a.vehicleCode.localeCompare(b.vehicleCode));
        break;
      case "speed":
        next.sort((a, b) => b.speedKmh - a.speedKmh || a.vehicleCode.localeCompare(b.vehicleCode));
        break;
      case "status": {
        // Triage order: worst operational state first, then code.
        const rank: Record<VehicleOperationalStatus, number> = {
          CONGESTION_HOLD: 0,
          OUT_OF_SERVICE: 1,
          BOARDING: 2,
          APPROACHING_STOP: 3,
          IN_SERVICE: 4,
        };
        next.sort((a, b) => rank[a.status] - rank[b.status] || a.vehicleCode.localeCompare(b.vehicleCode));
        break;
      }
      case "code-asc":
      default:
        next.sort((a, b) => a.vehicleCode.localeCompare(b.vehicleCode));
        break;
    }
    return next;
  }, [filteredVehicles, sortSpec, allLines]);

  const getStatusLabel = (status: VehicleOperationalStatus): string => {
    switch (status) {
      case "IN_SERVICE":
        return t.admin.moving;
      case "BOARDING":
        return t.admin.boarding;
      case "CONGESTION_HOLD":
        return t.admin.hold;
      case "OUT_OF_SERVICE":
        return t.common.inactive;
      default:
        return status;
    }
  };

  const getCrowdLabel = (crowd: CrowdDensityLevel): string => {
    switch (crowd) {
      case "LEVEL_1_MANY_SEATS":
        return t.crowdsource.densitySeatsAvailable;
      case "LEVEL_2_FEW_SEATS":
        return t.crowdsource.densityFewSeats;
      case "LEVEL_3_STANDING_ONLY":
        return t.crowdsource.densityStandingOnly;
      case "LEVEL_4_FULL_CRUSH":
        return t.crowdsource.densityFullCrowded;
      default:
        return crowd;
    }
  };

  // Destructive undos (add/delete, and bulk status changes that zero speed)
  // wear amber; plain field edits stay cyan.
  const isDestructiveUndoEntry = (undo: PendingFleetUndo): boolean =>
    undo.field === "add" ||
    undo.field === "delete" ||
    (undo.field === "bulk" && undo.bulkDestructive === true);

  const handleUpdateStatus = (
    vehicle: Vehicle,
    newStatus: VehicleOperationalStatus,
    triggerEl?: HTMLElement | null,
    options?: { silent?: boolean }
  ) => {
    if (vehicle.status === newStatus) return;
    const previousStatus = vehicle.status;
    const previousSpeedKmh = vehicle.speedKmh;
    const updated: Vehicle = {
      ...vehicle,
      status: newStatus,
      speedKmh: newStatus === "IN_SERVICE" ? (vehicle.speedKmh === 0 ? 40 : vehicle.speedKmh) : 0,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    }

    // Persist to SQLite API
    fetch("/api/fleet/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        status: updated.status,
        speedKmh: updated.speedKmh,
      }),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "update",
        update: {
          vehicleCode: vehicle.vehicleCode,
          status: updated.status,
          speedKmh: updated.speedKmh,
        },
      });
    });

    if (!options?.silent) {
      recordShiftAction({
        actionType: "FLEET_STATUS",
        summary: `${vehicle.vehicleCode}: status changed from ${getStatusLabel(previousStatus)} to ${getStatusLabel(newStatus)}`,
        badge: vehicle.vehicleCode,
        params: {
          code: vehicle.vehicleCode,
          from: getStatusLabel(previousStatus),
          to: getStatusLabel(newStatus),
        },
      });
      setPendingUndos((prev) => {
        const next = new Map(prev);
        next.set(vehicle.id, {
          vehicleId: vehicle.id,
          vehicleCode: vehicle.vehicleCode,
          field: "status",
          previous: previousStatus,
          previousSpeedKmh,
          label: `${vehicle.vehicleCode} • ${t.admin.currentStatus}: ${getStatusLabel(previousStatus)} → ${getStatusLabel(newStatus)}`,
          expiry: Date.now() + UNDO_WINDOW_MS,
        });
        return next;
      });
    }
  };

  // Post-deploy identity correction: the nine static fields are editable
  // after deployment, persisted via PUT, and covered by the undo family.
  const handleSaveIdentity = (vehicle: Vehicle): void => {
    if (!identityDraft) return;
    const total = identityDraft.totalTrainsets.trim()
      ? Number(identityDraft.totalTrainsets)
      : undefined;
    const updated: Vehicle = {
      ...vehicle,
      runNumber: identityDraft.runNumber.trim() || undefined,
      trainsetNumber: identityDraft.trainsetNumber.trim() || undefined,
      totalTrainsets: total,
      carFormation: identityDraft.carFormation.trim() || undefined,
      depotHome: identityDraft.depotHome.trim() || undefined,
      fleetNumber: identityDraft.fleetNumber.trim() || undefined,
      busRunNumber: identityDraft.busRunNumber.trim() || undefined,
      licensePlate: identityDraft.licensePlate.trim() || undefined,
      operatorName: identityDraft.operatorName.trim() || undefined,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }

    fetch("/api/fleet/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        runNumber: updated.runNumber,
        trainsetNumber: updated.trainsetNumber,
        totalTrainsets: updated.totalTrainsets,
        carFormation: updated.carFormation,
        depotHome: updated.depotHome,
        fleetNumber: updated.fleetNumber,
        busRunNumber: updated.busRunNumber,
        licensePlate: updated.licensePlate,
        operatorName: updated.operatorName,
      }),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "update",
        update: {
          vehicleCode: vehicle.vehicleCode,
          runNumber: updated.runNumber,
          licensePlate: updated.licensePlate,
        },
      });
    });

    recordShiftAction({
      actionType: "FLEET_IDENTITY",
      summary: `${vehicle.vehicleCode}: identity updated`,
      badge: vehicle.vehicleCode,
      params: { code: vehicle.vehicleCode },
    });
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(vehicle.id, {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        field: "identity",
        previousVehicle: vehicle,
        label: t.admin.fleetIdentityUpdated.replace("{code}", vehicle.vehicleCode),
        expiry: Date.now() + UNDO_WINDOW_MS,
      });
      return next;
    });
  };

  // Gallery attachments: URL-based photos appended to or removed from the
  // vehicle's photo set via PUT; the API persists them as PhotoGallery rows.
  const persistPhotos = (vehicle: Vehicle, photos: Vehicle["photos"]): void => {
    const updated: Vehicle = { ...vehicle, photos };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    fetch("/api/fleet/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vehicle.id, vehicleCode: vehicle.vehicleCode, photos }),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "update",
        update: { vehicleCode: vehicle.vehicleCode },
      });
    });
  };

  const handleAddPhoto = (vehicle: Vehicle): void => {
    const url = photoDraft.url.trim();
    if (!url) return;
    const entry = {
      id: `photo-${vehicle.id}-${Date.now().toString(36)}`,
      vehicleId: vehicle.id,
      url,
      caption: photoDraft.caption.trim(),
      photographer: photoDraft.credit.trim(),
      tag: photoDraft.tag.trim(),
    };
    persistPhotos(vehicle, [...(vehicle.photos ?? []), entry]);
    setPhotoDraft({ url: "", caption: "", credit: "", tag: "" });
  };

  const handleRemovePhoto = (vehicle: Vehicle, photoId: string): void => {
    persistPhotos(
      vehicle,
      (vehicle.photos ?? []).filter((p) => p.id !== photoId)
    );
  };

  const handleUpdateCrowd = (
    vehicle: Vehicle,
    newCrowd: CrowdDensityLevel,
    triggerEl?: HTMLElement | null,
    options?: { silent?: boolean }
  ) => {
    const previousCrowd = vehicle.crowdLevel;
    if (previousCrowd === newCrowd) return;
    const updated: Vehicle = {
      ...vehicle,
      crowdLevel: newCrowd,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    }

    // Persist to SQLite API
    fetch("/api/fleet/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        crowdLevel: newCrowd,
      }),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "update",
        update: { vehicleCode: vehicle.vehicleCode, crowdLevel: newCrowd },
      });
    });

    if (!options?.silent) {
      recordShiftAction({
        actionType: "FLEET_CROWD",
        summary: `${vehicle.vehicleCode}: crowd density updated to ${getCrowdLabel(newCrowd)}`,
        badge: vehicle.vehicleCode,
        params: {
          code: vehicle.vehicleCode,
          from: getCrowdLabel(previousCrowd),
          to: getCrowdLabel(newCrowd),
        },
      });
      setPendingUndos((prev) => {
        const next = new Map(prev);
        next.set(vehicle.id, {
          vehicleId: vehicle.id,
          vehicleCode: vehicle.vehicleCode,
          field: "crowdLevel",
          previous: previousCrowd,
          label: `${vehicle.vehicleCode} • ${t.admin.capacityAndDensity}: ${getCrowdLabel(previousCrowd)} → ${getCrowdLabel(newCrowd)}`,
          expiry: Date.now() + UNDO_WINDOW_MS,
        });
        return next;
      });
    }
  };

  // Bulk triage reuses the single-row paths so undo, shift log, and sync
  // stay consistent; the selection survives so holds can chain into crowds.
  // Focus moves once to the bulk bar. Single-row edits steal nothing, so the
  // operator's keyboard position is never yanked mid-triage.
  const focusBulkBar = (): void => {
    requestAnimationFrame(() => bulkBarRef.current?.focus());
  };

  // Bulk confirm state: the select only stages the intent; nothing moves
  // until the operator confirms the blast radius in-app (delete-confirm idiom).
  const [confirmBulk, setConfirmBulk] = useState<{
    kind: "status" | "crowd";
    value: string;
    openerId: "fleet-bulk-status" | "fleet-bulk-crowd";
  } | null>(null);
  const confirmBulkApplyRef = useRef<HTMLButtonElement | null>(null);
  const bulkOpenerRef = useRef<HTMLElement | null>(null);

  // Eligible targets: existing vehicles whose value would actually change.
  const bulkEligible = (
    vehicles: Vehicle[],
    kind: "status" | "crowd",
    value: string
  ): Vehicle[] =>
    [...selectedIds]
      .map((id) => vehicles.find((v) => v.id === id))
      .filter(
        (v): v is Vehicle =>
          !!v && (kind === "status" ? v.status !== value : v.crowdLevel !== value)
      );

  const bulkLineSummary = (targets: Vehicle[]): string => {
    const codes = [
      ...new Set(
        targets.map(
          (v) => allLines.find((l) => l.id === v.lineId)?.code ?? v.lineId
        )
      ),
    ];
    return codes.slice(0, 3).join(", ") + (codes.length > 3 ? "…" : "");
  };

  // Live preview for the bulk confirm: recomputed from current board state
  // so the blast-radius copy can never go stale between open and Apply.
  const confirmPreview = useMemo(() => {
    if (!confirmBulk) return null;
    const eligible = bulkEligible(simulatedVehicles, confirmBulk.kind, confirmBulk.value);
    const lines = bulkLineSummary(eligible);
    const targetLabel =
      confirmBulk.kind === "status"
        ? getStatusLabel(confirmBulk.value as VehicleOperationalStatus)
        : getCrowdLabel(confirmBulk.value as CrowdDensityLevel);
    const text =
      confirmBulk.kind === "status"
        ? t.admin.fleetBulkConfirmStatus
            .replace("{n}", String(eligible.length))
            .replace("{status}", targetLabel)
            .replace("{lines}", lines)
        : t.admin.fleetBulkConfirmCrowd
            .replace("{n}", String(eligible.length))
            .replace("{crowd}", targetLabel)
            .replace("{lines}", lines);
    return { eligible, text };
  }, [confirmBulk, simulatedVehicles, selectedIds, allLines, t]);

  // A cleared selection unmounts the bar; drop any staged confirm with it.
  useEffect(() => {
    if (selectedIds.size === 0) setConfirmBulk(null);
  }, [selectedIds.size]);

  const openBulkConfirm = (
    kind: "status" | "crowd",
    value: string,
    trigger: HTMLElement | null
  ): void => {
    if (bulkEligible(useTransitStore.getState().simulatedVehicles, kind, value).length === 0) {
      return;
    }
    bulkOpenerRef.current = trigger;
    setConfirmBulk({
      kind,
      value,
      openerId: kind === "status" ? "fleet-bulk-status" : "fleet-bulk-crowd",
    });
  };

  const closeBulkConfirm = useCallback((): void => {
    setConfirmBulk(null);
    bulkOpenerRef.current?.focus();
  }, []);

  // Move focus into the bulk confirmation; Escape closes it like delete's.
  // A live board can move under an open confirm (deletions do; the sim never
  // touches status/crowd): close rather than show a zero-vehicle confirm.
  useEffect(() => {
    if (confirmBulk) confirmBulkApplyRef.current?.focus();
  }, [confirmBulk]);
  useEffect(() => {
    if (confirmBulk) {
      const live = useTransitStore.getState().simulatedVehicles;
      if (bulkEligible(live, confirmBulk.kind, confirmBulk.value).length === 0) {
        setConfirmBulk(null);
      }
    }
  }, [confirmBulk, simulatedVehicles, selectedIds, allLines]);

  const applyBulkStatus = (newStatus: VehicleOperationalStatus): void => {
    const current = useTransitStore.getState().simulatedVehicles;
    const targets = bulkEligible(current, "status", newStatus);
    if (targets.length === 0) {
      setConfirmBulk(null);
      return;
    }
    // One bulk undoes as one unit: snapshot first, apply silently, then a
    // single aggregate entry. Per-vehicle undos on the same vehicles are
    // superseded so an older single restore cannot clobber the bulk state.
    const snapshots = targets.map((vehicle) => ({
      vehicle,
      previousStatus: vehicle.status,
      previousSpeedKmh: vehicle.speedKmh,
    }));
    for (const { vehicle } of snapshots) {
      handleUpdateStatus(vehicle, newStatus, null, { silent: true });
    }
    setPendingUndos((prev) => {
      const next = new Map(prev);
      for (const id of targets.map((v) => v.id)) {
        if (next.get(id)?.field === "status") {
          next.delete(id);
          undoButtonRefs.current.delete(id);
        }
      }
      return next;
    });
    const bulkId = `bulk-status-${Date.now().toString(36)}`;
    const bulkCount = t.admin.fleetBulkCount.replace("{n}", String(snapshots.length));
    const bulkDestructive = newStatus !== "IN_SERVICE";
    const label = t.admin.fleetBulkUndo
      .replace("{n}", String(snapshots.length))
      .replace("{target}", getStatusLabel(newStatus));
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(bulkId, {
        vehicleId: bulkId,
        vehicleCode: bulkCount,
        field: "bulk",
        bulkKind: "status",
        bulkDestructive,
        bulkItems: snapshots.map((s) => ({
          vehicleId: s.vehicle.id,
          previousStatus: s.previousStatus,
          previousSpeedKmh: s.previousSpeedKmh,
        })),
        label,
        expiry: Date.now() + (bulkDestructive ? DESTRUCTIVE_UNDO_WINDOW_MS : UNDO_WINDOW_MS),
      });
      return next;
    });
    recordShiftAction({
      actionType: "FLEET_BULK",
      summary: label,
      badge: bulkCount,
      params: { n: snapshots.length, to: getStatusLabel(newStatus) },
    });
    setConfirmBulk(null);
    focusBulkBar();
  };

  const applyBulkCrowd = (newCrowd: CrowdDensityLevel): void => {
    const current = useTransitStore.getState().simulatedVehicles;
    const targets = bulkEligible(current, "crowd", newCrowd);
    if (targets.length === 0) {
      setConfirmBulk(null);
      return;
    }
    const snapshots = targets.map((vehicle) => ({
      vehicle,
      previousCrowd: vehicle.crowdLevel,
    }));
    for (const { vehicle } of snapshots) {
      handleUpdateCrowd(vehicle, newCrowd, null, { silent: true });
    }
    setPendingUndos((prev) => {
      const next = new Map(prev);
      for (const id of targets.map((v) => v.id)) {
        if (next.get(id)?.field === "crowdLevel") {
          next.delete(id);
          undoButtonRefs.current.delete(id);
        }
      }
      return next;
    });
    const bulkId = `bulk-crowd-${Date.now().toString(36)}`;
    const bulkCount = t.admin.fleetBulkCount.replace("{n}", String(snapshots.length));
    const label = t.admin.fleetBulkUndo
      .replace("{n}", String(snapshots.length))
      .replace("{target}", getCrowdLabel(newCrowd));
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(bulkId, {
        vehicleId: bulkId,
        vehicleCode: bulkCount,
        field: "bulk",
        bulkKind: "crowd",
        bulkDestructive: false,
        bulkItems: snapshots.map((s) => ({
          vehicleId: s.vehicle.id,
          previousCrowd: s.previousCrowd,
        })),
        label,
        expiry: Date.now() + UNDO_WINDOW_MS,
      });
      return next;
    });
    recordShiftAction({
      actionType: "FLEET_BULK",
      summary: label,
      badge: bulkCount,
      params: { n: snapshots.length, to: getCrowdLabel(newCrowd) },
    });
    setConfirmBulk(null);
    focusBulkBar();
  };

  // Bulk undo restores every snapped vehicle in one action; per-vehicle
  // failures stay visible individually, and the board keeps the selection
  // so a bulk undo can chain straight into a corrected bulk.
  const undoBulkEntry = (pending: PendingFleetUndo): void => {
    const items = pending.bulkItems ?? [];
    const kind = pending.bulkKind;
    let appliedCount = 0;
    setFailedSyncs((prev) =>
      prev.filter((e) => !items.some((item) => item.vehicleId === e.vehicleId))
    );
    const current = useTransitStore.getState().simulatedVehicles;
    for (const item of items) {
      const vehicle = current.find((v) => v.id === item.vehicleId);
      if (!vehicle) continue;
      appliedCount += 1;
      if (kind === "status" && item.previousStatus !== undefined) {
        const restored: Vehicle = {
          ...vehicle,
          status: item.previousStatus,
          speedKmh: item.previousSpeedKmh ?? vehicle.speedKmh,
        };
        updateSingleVehicle(restored);
        if (selectedVehicle?.id === vehicle.id) {
          setSelectedVehicle(restored);
        }
        fetch("/api/fleet/vehicles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: vehicle.id,
            vehicleCode: vehicle.vehicleCode,
            status: restored.status,
            speedKmh: restored.speedKmh,
          }),
        }).catch(() => {
          reportSyncFailure({
            vehicleId: vehicle.id,
            vehicleCode: vehicle.vehicleCode,
            kind: "update",
            update: {
              vehicleCode: vehicle.vehicleCode,
              status: restored.status,
              speedKmh: restored.speedKmh,
            },
          });
        });
      } else if (kind === "crowd" && item.previousCrowd !== undefined) {
        const restored: Vehicle = {
          ...vehicle,
          crowdLevel: item.previousCrowd,
        };
        updateSingleVehicle(restored);
        if (selectedVehicle?.id === vehicle.id) {
          setSelectedVehicle(restored);
        }
        fetch("/api/fleet/vehicles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: vehicle.id,
            vehicleCode: vehicle.vehicleCode,
            crowdLevel: restored.crowdLevel,
          }),
        }).catch(() => {
          reportSyncFailure({
            vehicleId: vehicle.id,
            vehicleCode: vehicle.vehicleCode,
            kind: "update",
            update: { vehicleCode: vehicle.vehicleCode, crowdLevel: restored.crowdLevel },
          });
        });
      }
    }
    // The record names how many vehicles were actually restored, so a
    // partial undo after a mid-grace deletion does not over-claim.
    const undoSummary = `${pending.label} (${appliedCount}/${items.length})`;
    recordShiftAction({
      actionType: "FLEET_UNDO",
      summary: undoSummary,
      badge: t.admin.fleetBulkCount.replace("{n}", String(appliedCount)),
      params: { code: `${appliedCount}/${items.length}`, field: "bulk", restored: undoSummary },
    });
  };

  // Telemetry slider debounce: the board follows the thumb immediately so
  // dragging feels live, but persistence, shift log, and undo settle 400ms
  // after the last tick — one undo per drag, not one per tick.
  const SPEED_DEBOUNCE_MS = 400;
  const speedBurstRef = useRef<{
    vehicleId: string;
    fromKmh: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const flushSpeedBurst = (vehicle: Vehicle, toKmh: number, fromKmh: number): void => {
    // Persist to SQLite API
    fetch("/api/fleet/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        speedKmh: toKmh,
      }),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "update",
        update: { vehicleCode: vehicle.vehicleCode, speedKmh: toKmh },
      });
    });

    recordShiftAction({
      actionType: "FLEET_SPEED",
      summary: `${vehicle.vehicleCode}: speed updated from ${Math.round(fromKmh)} km/h to ${Math.round(toKmh)} km/h`,
      badge: vehicle.vehicleCode,
      params: {
        code: vehicle.vehicleCode,
        from: `${Math.round(fromKmh)} km/h`,
        to: `${Math.round(toKmh)} km/h`,
      },
    });
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(vehicle.id, {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        field: "speed",
        previousSpeedKmh: fromKmh,
        label: `${vehicle.vehicleCode} • ${t.vehicleInspector.speed}: ${Math.round(fromKmh)} → ${Math.round(toKmh)} km/h`,
        expiry: Date.now() + UNDO_WINDOW_MS,
      });
      return next;
    });
  };

  // Never persist a settled burst after unmount.
  useEffect(() => {
    return () => {
      if (speedBurstRef.current) {
        clearTimeout(speedBurstRef.current.timer);
        speedBurstRef.current = null;
      }
    };
  }, []);

  const handleUpdateSpeed = (
    vehicle: Vehicle,
    newSpeedKmh: number,
    triggerEl?: HTMLElement | null
  ) => {
    if (vehicle.speedKmh === newSpeedKmh && !speedBurstRef.current) return;
    const pending = speedBurstRef.current;
    if (pending && pending.vehicleId !== vehicle.id) {
      // Different vehicle took the slider: settle the old burst first.
      const old = useTransitStore.getState().simulatedVehicles.find((v) => v.id === pending.vehicleId);
      if (old) flushSpeedBurst(old, old.speedKmh, pending.fromKmh);
      clearTimeout(pending.timer);
      speedBurstRef.current = null;
    }
    const fromKmh = pending && pending.vehicleId === vehicle.id ? pending.fromKmh : vehicle.speedKmh;
    const updated: Vehicle = {
      ...vehicle,
      speedKmh: newSpeedKmh,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    }
    if (speedBurstRef.current) {
      clearTimeout(speedBurstRef.current.timer);
    }
    const snapVehicle = updated;
    speedBurstRef.current = {
      vehicleId: vehicle.id,
      fromKmh,
      timer: setTimeout(() => {
        speedBurstRef.current = null;
        const latest =
          useTransitStore.getState().simulatedVehicles.find((v) => v.id === snapVehicle.id) ?? snapVehicle;
        flushSpeedBurst(latest, latest.speedKmh, fromKmh);
      }, SPEED_DEBOUNCE_MS),
    };
  };

  // Failed server syncs stay visible with a retry instead of failing silently.
  // Undoing a vehicle reroutes its state, so its failures clear with it.
  const reportSyncFailure = (entry: Omit<FailedFleetSync, "id">): void => {
    const id = `${entry.vehicleId}-${entry.kind}-${Date.now().toString(36)}`;
    setFailedSyncs((prev) => [
      ...prev.filter((e) => !(e.vehicleId === entry.vehicleId && e.kind === entry.kind)),
      { ...entry, id },
    ]);
  };

  const retryFailedSync = async (entry: FailedFleetSync): Promise<void> => {
    try {
      let res: Response;
      if (entry.kind === "delete") {
        res = await fetch(`/api/fleet/vehicles?id=${encodeURIComponent(entry.vehicleId)}`, {
          method: "DELETE",
        });
      } else if (entry.kind === "add" || entry.kind === "restore") {
        if (!entry.vehicle) throw new Error("missing vehicle");
        res = await fetch("/api/fleet/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.vehicle),
        });
      } else {
        res = await fetch("/api/fleet/vehicles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entry.vehicleId, ...entry.update }),
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFailedSyncs((prev) => prev.filter((e) => e.id !== entry.id));
    } catch {
      // Stays listed: the operator still needs to know the sync is pending.
    }
  };

  const openDeleteConfirm = (vehicle: Vehicle, trigger: HTMLElement | null): void => {
    if (trigger) {
      lastTriggerRef.current = trigger;
    }
    setConfirmDeleteId(vehicle.id);
  };

  const closeDeleteConfirm = useCallback((): void => {
    setConfirmDeleteId(null);
    lastTriggerRef.current?.focus();
  }, []);

  // Keep Tab inside an inline delete confirm while it is open.
  const trapTabInConfirm = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key !== "Tab") return;
    const buttons = Array.from(e.currentTarget.querySelectorAll("button"));
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Move focus into the delete confirmation; Escape returns it to delete.
  useEffect(() => {
    if (confirmDeleteId) confirmDeleteButtonRef.current?.focus();
  }, [confirmDeleteId]);

  const handleDeleteVehicle = (vehicle: Vehicle, triggerEl?: HTMLElement | null) => {
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    } else {
      // Modal deletes unmount their trigger: never focus a detached node.
      lastTriggerRef.current = null;
    }

    // Remove from store; read live state so a simulation tick cannot interleave.
    updateSimulatedVehicles(
      useTransitStore.getState().simulatedVehicles.filter((v) => v.id !== vehicle.id)
    );
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(null);
    }

    // Call API DELETE; a failed sync stays visible with a retry.
    fetch(`/api/fleet/vehicles?id=${encodeURIComponent(vehicle.id)}`, {
      method: "DELETE",
    }).catch(() => {
      reportSyncFailure({
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        kind: "delete",
      });
    });

    recordShiftAction({
      actionType: "FLEET_DELETE",
      summary: `Deleted vehicle: ${vehicle.vehicleCode} (${vehicle.name})`,
      badge: vehicle.vehicleCode,
      params: {
        code: vehicle.vehicleCode,
        name: vehicle.name,
      },
    });

    const undoLabel = `${t.admin.deleteVehicle}: ${vehicle.vehicleCode}`;
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(vehicle.id, {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        field: "delete",
        previousVehicle: vehicle,
        label: undoLabel,
        expiry: Date.now() + DESTRUCTIVE_UNDO_WINDOW_MS,
      });
      return next;
    });
    requestAnimationFrame(() => undoButtonRefs.current.get(vehicle.id)?.focus());
  };

  const handleUndo = (vehicleId: string) => {
    const pending = pendingUndos.get(vehicleId);
    if (!pending) return;
    // Undo reroutes this vehicle's state, so its sync failures clear with it;
    // a failed restore re-registers below.
    setFailedSyncs((prev) => prev.filter((e) => e.vehicleId !== vehicleId));

    if (pending.field === "add") {
      updateSimulatedVehicles(
        useTransitStore.getState().simulatedVehicles.filter((v) => v.id !== vehicleId)
      );
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle(null);
      }
      // Revert from backend via DELETE
      fetch(`/api/fleet/vehicles?id=${encodeURIComponent(vehicleId)}`, {
        method: "DELETE",
      }).catch(() => {
        reportSyncFailure({
          vehicleId,
          vehicleCode: pending.vehicleCode,
          kind: "delete",
        });
      });
    } else if (pending.field === "delete" && pending.previousVehicle) {
      // Recreate vehicle in store and database
      const restored = pending.previousVehicle;
      updateSimulatedVehicles([...useTransitStore.getState().simulatedVehicles, restored]);
      fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restored),
      }).catch(() => {
        reportSyncFailure({
          vehicleId,
          vehicleCode: restored.vehicleCode,
          kind: "restore",
          vehicle: restored,
        });
      });
    } else if (pending.field === "bulk") {
      // Bulk restore: every snapped vehicle returns in one action; each
      // failed PUT re-registers its own visible sync failure, mirroring
      // the single-row restore paths.
      undoBulkEntry(pending);
    } else {
      // Field-scoped restore: preserves live simulation coordinates, heading, and telemetry
      const current = useTransitStore.getState().simulatedVehicles.find((v) => v.id === vehicleId);
      if (current) {
        if (pending.field === "status") {
          const prevStatus = pending.previous as VehicleOperationalStatus;
          const restored: Vehicle = {
            ...current,
            status: prevStatus,
            speedKmh: pending.previousSpeedKmh !== undefined ? pending.previousSpeedKmh : current.speedKmh,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
          }
          fetch("/api/fleet/vehicles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: current.id,
              vehicleCode: current.vehicleCode,
              status: restored.status,
              speedKmh: restored.speedKmh,
            }),
          }).catch(() => {
            reportSyncFailure({
              vehicleId,
              vehicleCode: current.vehicleCode,
              kind: "update",
              update: {
                vehicleCode: current.vehicleCode,
                status: restored.status,
                speedKmh: restored.speedKmh,
              },
            });
          });
        } else if (pending.field === "crowdLevel") {
          const prevCrowd = pending.previous as CrowdDensityLevel;
          const restored: Vehicle = {
            ...current,
            crowdLevel: prevCrowd,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
          }
          fetch("/api/fleet/vehicles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: current.id,
              vehicleCode: current.vehicleCode,
              crowdLevel: restored.crowdLevel,
            }),
          }).catch(() => {
            reportSyncFailure({
              vehicleId,
              vehicleCode: current.vehicleCode,
              kind: "update",
              update: { vehicleCode: current.vehicleCode, crowdLevel: restored.crowdLevel },
            });
          });
        } else if (pending.field === "identity" && pending.previousVehicle) {
          // Identity restore: the nine static fields return; live
          // coordinates, heading, and telemetry stay untouched.
          const prev = pending.previousVehicle;
          const restored: Vehicle = {
            ...current,
            runNumber: prev.runNumber,
            trainsetNumber: prev.trainsetNumber,
            totalTrainsets: prev.totalTrainsets,
            carFormation: prev.carFormation,
            depotHome: prev.depotHome,
            fleetNumber: prev.fleetNumber,
            busRunNumber: prev.busRunNumber,
            licensePlate: prev.licensePlate,
            operatorName: prev.operatorName,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
            setIdentityDraft(identityFromVehicle(restored));
          }
          fetch("/api/fleet/vehicles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: current.id,
              vehicleCode: current.vehicleCode,
              runNumber: restored.runNumber,
              trainsetNumber: restored.trainsetNumber,
              totalTrainsets: restored.totalTrainsets,
              carFormation: restored.carFormation,
              depotHome: restored.depotHome,
              fleetNumber: restored.fleetNumber,
              busRunNumber: restored.busRunNumber,
              licensePlate: restored.licensePlate,
              operatorName: restored.operatorName,
            }),
          }).catch(() => {
            reportSyncFailure({
              vehicleId,
              vehicleCode: current.vehicleCode,
              kind: "update",
              update: {
                vehicleCode: current.vehicleCode,
                runNumber: restored.runNumber,
                licensePlate: restored.licensePlate,
              },
            });
          });
        } else if (pending.field === "speed" && pending.previousSpeedKmh !== undefined) {
          const restored: Vehicle = {
            ...current,
            speedKmh: pending.previousSpeedKmh,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
          }
          fetch("/api/fleet/vehicles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: current.id,
              vehicleCode: current.vehicleCode,
              speedKmh: restored.speedKmh,
            }),
          }).catch(() => {
            reportSyncFailure({
              vehicleId,
              vehicleCode: current.vehicleCode,
              kind: "update",
              update: { vehicleCode: current.vehicleCode, speedKmh: restored.speedKmh },
            });
          });
        }
      }
    }

    // Single-entry undo log; bulk entries log their own aggregate line
    // inside undoBulkEntry so the shift log never sees a phantom vehicle.
    if (pending.field !== "bulk") {
      recordShiftAction({
        actionType: "FLEET_UNDO",
        summary: `Undid ${pending.field} on ${pending.vehicleCode} (restored to ${String(pending.previous ?? "removed")})`,
        badge: pending.vehicleCode,
        params: {
          code: pending.vehicleCode,
          field: pending.field,
          restored: String(pending.previous ?? "removed"),
        },
      });
    }

    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.delete(vehicleId);
      return next;
    });
    undoButtonRefs.current.delete(vehicleId);

    requestAnimationFrame(() => {
      lastTriggerRef.current?.focus();
    });
  };

  // Keyboard shortcut: Ctrl+Z / Cmd+Z triggers undo on latest pending mutation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }

        const entries = Array.from(pendingUndos.entries());
        if (entries.length > 0) {
          e.preventDefault();
          const [lastVehicleId] = entries[entries.length - 1];
          handleUndo(lastVehicleId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingUndos]);

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleCode.trim() || !newName.trim()) return;
    // Duplicate codes would fork the board from SQLite: block, don't merge.
    if (isDuplicateCode) return;

    const assignedLine = allLines.find((l) => l.id === newLineId) || allLines[0];
    const newId = `veh-custom-${Date.now().toString(36)}`;
    const firstCoord = assignedLine.polylineCoordinates[0] || { latitude: -6.2088, longitude: 106.8456 };

    const effectiveCoachbuilder =
      newCoachbuilder === "__CUSTOM__" ? customCoachbuilder.trim() || t.admin.customKaroseri : newCoachbuilder;
    const effectiveChassis =
      newChassis === "__CUSTOM__" ? customChassis.trim() || t.admin.customChassis : newChassis;

    let seatingDiagram: SeatingDiagram | undefined = undefined;
    if (seatingLayoutChoice === "SLEEPER_1_1_1") {
      seatingDiagram = generateSleeper111Seats(newId);
    } else if (seatingLayoutChoice === "SUPER_EXEC_2_1") {
      seatingDiagram = generateSuperExec21Seats(newId);
    } else if (seatingLayoutChoice === "EXEC_2_2") {
      seatingDiagram = generateExecutive22Seats(newId);
    } else if (seatingLayoutChoice === "HIACE_VIP") {
      seatingDiagram = generateHiAceCaptainSeats(newId);
    } else if (seatingLayoutChoice === "COMMUTER_LONGITUDINAL") {
      seatingDiagram = generateCommuterLongitudinalSeats(newId);
    }

    const seatCap = seatingDiagram ? seatingDiagram.totalSeats : assignedLine.category === "RAIL" ? 312 : 36;
    const standCap = assignedLine.category === "RAIL" ? 800 : assignedLine.mode === "MIKROTRANS" ? 0 : 45;

    const newUnit: Vehicle = {
      id: newId,
      lineId: assignedLine.id,
      vehicleCode: newVehicleCode.toUpperCase(),
      name: newName,
      category: assignedLine.category,
      mode: assignedLine.mode,
      currentLatitude: firstCoord.latitude,
      currentLongitude: firstCoord.longitude,
      headingDegrees: 0,
      speedKmh: newSpeed,
      status: "IN_SERVICE",
      crowdLevel: "LEVEL_2_FEW_SEATS",
      acComfort: "OPTIMAL",
      coachbuilder: effectiveCoachbuilder,
      chassis: effectiveChassis,
      progressFraction: 0,
      currentSegmentIndex: 0,
      nextStopId: assignedLine.stops?.[0]?.id || "stop-0",
      nextStopEtaSeconds: 180,
      runNumber: newRunNumber.trim() || undefined,
      trainsetNumber: newTrainsetNumber.trim() || undefined,
      totalTrainsets: newTotalTrainsets.trim() ? Number(newTotalTrainsets) : undefined,
      carFormation: newCarFormation.trim() || undefined,
      depotHome: newDepotHome.trim() || undefined,
      fleetNumber: newFleetNumber.trim() || undefined,
      busRunNumber: newBusRunNumber.trim() || undefined,
      licensePlate: newLicensePlate.trim() || undefined,
      operatorName: newOperatorName.trim() || undefined,
      seatingDiagram,
      technicalSpec: {
        id: `spec-${newId}`,
        vehicleId: newId,
        coachbuilder: effectiveCoachbuilder,
        chassisModel: effectiveChassis,
        powertrain: assignedLine.category === "RAIL" ? "Electric Traction Motor (VVVF Inverter)" : "Euro 5 / Euro 6 Clean Diesel / Electric Battery",
        engineOutput: assignedLine.category === "RAIL" ? "1,200 kW" : "360 HP @ 1,900 RPM",
        torque: assignedLine.category === "RAIL" ? "4,500 Nm" : "1,600 Nm @ 1,100 RPM",
        transmission: assignedLine.category === "RAIL" ? "Direct Drive Automatic" : "ZF EcoLife 6-Speed Automatic / Voith DIWA",
        suspensionType: "Full Electronically Controlled Air Suspension (ECAS)",
        lengthMeters: assignedLine.category === "RAIL" ? 20.0 : assignedLine.mode === "MIKROTRANS" ? 5.5 : 12.0,
        passengerCapacity: seatCap + standCap,
        maxSpeedKmh: assignedLine.category === "RAIL" ? 120 : 100,
        safetyFeatures: [
          "Anti-lock Braking System (ABS)",
          "Electronic Stability Control (ESP)",
          "Automatic Door Interlock",
          "Surveillance CCTV 360",
          "Automatic Fire Suppression System",
        ],
        historicalNotes: `Operated by ${assignedLine.code} fleet division. Built with ${effectiveCoachbuilder} body and ${effectiveChassis} platform.`,
      },
    };

    updateSimulatedVehicles([...simulatedVehicles, newUnit]);
    setIsAddModalOpen(false);
    setNewVehicleCode("");
    setNewName("");
    setCustomCoachbuilder("");
    setCustomChassis("");
    setSeatingLayoutChoice("DEFAULT");
    setNewRunNumber("");
    setNewTrainsetNumber("");
    setNewTotalTrainsets("");
    setNewCarFormation("");
    setNewDepotHome("");
    setNewFleetNumber("");
    setNewBusRunNumber("");
    setNewLicensePlate("");
    setNewOperatorName("");

    // Persist new vehicle via POST /api/fleet/vehicles
    fetch("/api/fleet/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUnit),
    }).catch(() => {
      reportSyncFailure({
        vehicleId: newUnit.id,
        vehicleCode: newUnit.vehicleCode,
        kind: "add",
        vehicle: newUnit,
      });
    });

    recordShiftAction({
      actionType: "FLEET_ADD",
      summary: `Added new vehicle: ${newUnit.vehicleCode} (${assignedLine.code})`,
      badge: newUnit.vehicleCode,
      params: {
        code: newUnit.vehicleCode,
        line: assignedLine.code,
      },
    });

    const undoLabel = `${t.admin.addVehicle}: ${newUnit.vehicleCode}`;
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(newId, {
        vehicleId: newId,
        vehicleCode: newUnit.vehicleCode,
        field: "add",
        label: undoLabel,
        expiry: Date.now() + DESTRUCTIVE_UNDO_WINDOW_MS,
      });
      return next;
    });
    requestAnimationFrame(() => undoButtonRefs.current.get(newId)?.focus());
  };

  const getCategoryIcon = (category: TransitCategory) => {
    switch (category) {
      case "RAIL":
        return <Train aria-hidden="true" className="w-3.5 h-3.5 text-rose-400" />;
      case "BUS":
        return <Bus aria-hidden="true" className="w-3.5 h-3.5 text-cyan-400" />;
      case "AVIATION":
        return <Plane aria-hidden="true" className="w-3.5 h-3.5 text-teal-400" />;
      case "MARITIME":
        return <Anchor aria-hidden="true" className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  // Empty-state reset: filters, search, and selection all go home.
  const clearFleetFilters = (): void => {
    setSearchQuery("");
    setActiveCategory("ALL");
    setSelectedIds(new Set());
  };

  const modalUndo = selectedVehicle ? pendingUndos.get(selectedVehicle.id) : undefined;
  const pageUndos = useMemo(() => {
    const all = Array.from(pendingUndos.values());
    if (!selectedVehicle) return all;
    return all.filter((u) => u.vehicleId !== selectedVehicle.id);
  }, [pendingUndos, selectedVehicle]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-semibold">
              {t.admin.occCommandBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {simulatedVehicles.length} {t.admin.activeVehicles}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            {t.admin.fleetControl}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t.admin.fleetSubtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void syncFleet()}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-60 border border-white/10 text-slate-200 text-xs font-bold shadow-lg flex items-center gap-1.5 transition btn-tactile"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{isSyncing ? t.admin.fleetSyncing : t.admin.fleetSyncNow}</span>
            </button>
            {failedSyncs.length > 0 && (
              <span
                role="status"
                className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold whitespace-nowrap"
              >
                {t.admin.fleetPendingChanges.replace("{n}", String(failedSyncs.length))}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono" role="status">
            {lastSyncAt
              ? `${t.admin.fleetLastSync.replace(
                      "{time}",
                      `${new Date(lastSyncAt).toLocaleDateString(currentLanguageMeta.locale, { timeZone: "Asia/Jakarta" })} ${new Date(lastSyncAt).toLocaleTimeString(currentLanguageMeta.locale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}`
                    )} • ${t.admin.fleetSyncPulled.replace("{n}", String(lastPulled))}`
              : t.admin.fleetSyncing}
            {boardSyncError && (
              <span role="alert" className="block text-rose-300">
                {t.admin.fleetBoardSyncError}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold shadow-lg flex items-center gap-1.5 transition btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>{t.admin.addVehicle}</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER STRIP */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            data-hotkey-search="true"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t.admin.searchFleetPlaceholder}
            placeholder={t.admin.searchFleetPlaceholder}
            className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          <button
            type="button"
            aria-pressed={activeCategory === "ALL"}
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              activeCategory === "ALL"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.navigation.allModes} ({simulatedVehicles.length})
          </button>
          {(["RAIL", "BUS", "AVIATION", "MARITIME"] as TransitCategory[]).map((cat) => {
            const count = simulatedVehicles.filter((v) => v.category === cat).length;
            const catLabel =
              cat === "RAIL"
                ? t.navigation.railModes
                : cat === "BUS"
                ? t.navigation.busModes
                : cat === "AVIATION"
                ? t.navigation.airModes
                : t.navigation.seaModes;

            return (
              <button
                key={cat}
                type="button"
                aria-pressed={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
                  activeCategory === cat
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{catLabel} ({count})</span>
              </button>
            );
          })}
        </div>
        {/* Sort control: deterministic board order for triage */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="fleet-sort" className="sr-only">
            {t.admin.fleetSortFleet}
          </label>
          <select
            id="fleet-sort"
            aria-label={t.admin.fleetSortFleet}
            value={sortSpec}
            onChange={(e) => setSortSpec(e.target.value)}
            className="bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 transition min-h-[36px]"
          >
            <option value="code-asc">{t.admin.fleetSortCodeAsc}</option>
            <option value="code-desc">{t.admin.fleetSortCodeDesc}</option>
            <option value="line">{t.admin.fleetSortLine}</option>
            <option value="speed">{t.admin.fleetSortSpeed}</option>
            <option value="status">{t.admin.fleetSortStatus}</option>
          </select>
        </div>
      </div>

      {/* 2.4 BULK BAR: corridor holds apply to the whole selection at once */}
      {selectedIds.size > 0 && (
        <div
          data-testid="fleet-bulk-bar"
          ref={bulkBarRef}
          tabIndex={-1}
          className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-slate-200 text-xs sm:text-sm flex flex-wrap items-center gap-2 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <span role="status" className="font-bold text-cyan-300 font-mono whitespace-nowrap">
            {t.admin.fleetBulkSelected.replace("{n}", String(selectedIds.size))}
          </span>
          <label htmlFor="fleet-bulk-status" className="sr-only">
            {t.admin.fleetBulkStatus}
          </label>
          <select
            id="fleet-bulk-status"
            aria-label={t.admin.fleetBulkStatus}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                openBulkConfirm("status", e.target.value, e.currentTarget);
                e.target.value = "";
              }
            }}
            className="bg-slate-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-slate-200 min-h-[36px]"
          >
            <option value="">{t.admin.fleetBulkStatus}</option>
            <option value="IN_SERVICE">{t.admin.moving}</option>
            <option value="BOARDING">{t.admin.boarding}</option>
            <option value="CONGESTION_HOLD">{t.admin.hold}</option>
            <option value="OUT_OF_SERVICE">{t.common.inactive}</option>
          </select>
          <label htmlFor="fleet-bulk-crowd" className="sr-only">
            {t.admin.fleetBulkCrowd}
          </label>
          <select
            id="fleet-bulk-crowd"
            aria-label={t.admin.fleetBulkCrowd}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                openBulkConfirm("crowd", e.target.value, e.currentTarget);
                e.target.value = "";
              }
            }}
            className="bg-slate-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-slate-200 min-h-[36px]"
          >
            <option value="">{t.admin.fleetBulkCrowd}</option>
            <option value="LEVEL_1_MANY_SEATS">{t.crowdsource.densitySeatsAvailable}</option>
            <option value="LEVEL_2_FEW_SEATS">{t.crowdsource.densityFewSeats}</option>
            <option value="LEVEL_3_STANDING_ONLY">{t.crowdsource.densityStandingOnly}</option>
            <option value="LEVEL_4_FULL_CRUSH">{t.crowdsource.densityFullCrowded}</option>
          </select>
          {confirmBulk && confirmPreview && (
            <span
              role="alert"
              aria-label={t.admin.fleetBulkConfirmTitle}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closeBulkConfirm();
                }
                trapTabInConfirm(e);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 px-2 py-1 w-full"
            >
              <span className="text-[11px] font-semibold text-rose-200 flex-1">
                {confirmPreview.text}
              </span>
              <button
                type="button"
                ref={confirmBulkApplyRef}
                onClick={() => {
                  if (confirmBulk.kind === "status") {
                    applyBulkStatus(confirmBulk.value as VehicleOperationalStatus);
                  } else {
                    applyBulkCrowd(confirmBulk.value as CrowdDensityLevel);
                  }
                }}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition btn-tactile min-h-[36px] whitespace-nowrap"
              >
                {t.admin.fleetBulkApply}
              </button>
              <button
                type="button"
                onClick={closeBulkConfirm}
                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition btn-tactile min-h-[36px] whitespace-nowrap"
              >
                {t.common.cancel}
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition btn-tactile min-h-[36px]"
          >
            {t.admin.fleetBulkClear}
          </button>
        </div>
      )}

      {/* 2.4b FINALIZER: single-shot announcement when an undo window expires */}
      <div role="status" aria-live="polite" data-testid="fleet-finalizer" className="sr-only">
        {finalAnnouncement}
      </div>

      {/* 2.5 UNDO RESTORE BANNERS (pausable window per vehicle: short for edits, long for add/delete) */}
      {/* Design Standard (Semantic Undo Theming):
          - Amber is used for destructive/removal undos (e.g. canceling vehicle creation).
          - Cyan is used for non-destructive state changes (operational status, crowd density).
      */}
      {pageUndos.length > 0 && (
        <div className="space-y-2">
          {pageUndos.map((undo) => (
            <div
              key={undo.vehicleId}
              role="status"
              aria-live="polite"
              className={`p-4 rounded-xl bg-slate-900 border text-slate-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200 ${
                isDestructiveUndoEntry(undo)
                  ? "border-amber-500/40"
                  : "border-cyan-500/40"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isDestructiveUndoEntry(undo) ? (
                  <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span className="truncate">
                  {t.admin.pendingUndo}: <strong>{undo.label}</strong>
                </span>
              </div>
              <button
                type="button"
                ref={(el) => {
                  if (el) undoButtonRefs.current.set(undo.vehicleId, el);
                  else undoButtonRefs.current.delete(undo.vehicleId);
                }}
                onFocus={() => setUndoPaused(true)}
                onBlur={() => setUndoPaused(false)}
                onClick={() => handleUndo(undo.vehicleId)}
                aria-label={`${t.admin.pendingUndo}: ${undo.label}`}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition btn-tactile min-h-[36px] shrink-0 ${
                  isDestructiveUndoEntry(undo)
                    ? "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950"
                    : "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950"
                }`}
              >
                {t.common.undo}
                <span aria-hidden="true" data-testid="undo-countdown">
                  {" "}
                  ({Math.max(0, Math.ceil((undo.expiry - nowTick) / 1000))}s)
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2.6 FAILED SERVER SYNCS: never silent, retry keeps the record */}
      {failedSyncs.length > 0 && (
        <div className="space-y-2">
          {failedSyncs.map((entry) => (
            <div
              key={entry.id}
              role="alert"
              className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/40 text-slate-200 text-xs sm:text-sm flex items-center justify-between shadow-xl gap-3"
            >
              <div className="flex items-center gap-2 truncate">
                <CircleAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">
                  {t.admin.fleetSyncFailed.replace("{code}", entry.vehicleCode)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void retryFailedSync(entry)}
                className="px-3 py-1.5 rounded-lg font-bold text-xs transition btn-tactile min-h-[36px] shrink-0 bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white"
              >
                {t.admin.retrySync}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2.7 COLOR LEGEND: status and crowd scales share amber with different meanings */}
      <div
        data-testid="fleet-legend"
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[11px] text-slate-400"
      >
        <span className="font-semibold text-slate-300">{t.admin.currentStatus}:</span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{t.admin.moving}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>{t.admin.boarding}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t.admin.hold}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-slate-500" />
          <span>{t.common.inactive}</span>
        </span>
        <span className="font-semibold text-slate-300">{t.admin.capacityAndDensity}:</span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{t.crowdsource.densitySeatsAvailable}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t.crowdsource.densityFewSeats}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-orange-500" />
          <span>{t.crowdsource.densityStandingOnly}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-rose-500" />
          <span>{t.crowdsource.densityFullCrowded}</span>
        </span>
      </div>

      {/* 3. FLEET TABLE */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-xl">
        {!hasSyncedOnce && isSyncing ? (
          <div role="status" aria-live="polite" className="p-4 space-y-2">
            <span className="sr-only">{t.admin.fleetSyncing}</span>
            <div aria-hidden="true" className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  data-testid="fleet-skeleton-row"
                  className="h-12 rounded-xl bg-slate-800/60 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div
            data-testid="fleet-empty-state"
            className="p-8 text-center space-y-3"
          >
            <p className="text-sm text-slate-300">{t.admin.fleetNoMatch}</p>
            <button
              type="button"
              onClick={clearFleetFilters}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold transition btn-tactile min-h-[44px]"
            >
              {t.admin.fleetClearFilters}
            </button>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">{t.admin.fleetTableCaption}</caption>
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                <th scope="col" className="py-3.5 pl-3 pr-1 w-12 sticky left-0 z-20 bg-slate-950/95">
                  <input
                    type="checkbox"
                    aria-label={t.admin.fleetSelectAll}
                    checked={sortedVehicles.length > 0 && sortedVehicles.every((v) => selectedIds.has(v.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(sortedVehicles.map((v) => v.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-6 h-6 accent-cyan-500 cursor-pointer"
                  />
                </th>
                <th scope="col" className="py-3.5 px-4 sticky left-12 z-20 bg-slate-950/95">{t.admin.vehicleCode}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.fleetAssignedLine}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.modelAndCoach}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.currentSpeedAndHeading}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.currentStatus}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.capacityAndDensity}</th>
                <th scope="col" className="sticky right-0 z-20 py-3.5 px-4 text-right bg-slate-950/95 backdrop-blur-md shadow-[-12px_0_16px_-4px_rgba(0,0,0,0.6)] before:content-[''] before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-slate-950/95 before:pointer-events-none">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {sortedVehicles.map((vehicle) => {
                const line = allLines.find((l) => l.id === vehicle.lineId);

                return (
                  <tr
                    key={vehicle.id}
                    className="group hover:bg-white/[0.03] transition"
                  >
                    {/* Bulk select */}
                    <td className="py-3.5 pl-3 pr-1 bg-slate-900 sticky left-0 z-10">
                      <input
                        type="checkbox"
                        aria-label={t.admin.fleetSelectVehicle.replace("{code}", vehicle.vehicleCode)}
                        checked={selectedIds.has(vehicle.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(vehicle.id);
                            else next.delete(vehicle.id);
                            return next;
                          });
                        }}
                        className="w-6 h-6 accent-cyan-500 cursor-pointer"
                      />
                    </td>
                    {/* Code & Name */}
                    <td className="py-3.5 px-4 bg-slate-900 sticky left-12 z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-950 border border-white/10 shrink-0">
                          {getCategoryIcon(vehicle.category)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm font-mono">
                            {vehicle.vehicleCode}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {vehicle.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Line Badge */}
                    <td className="py-3.5 px-4">
                      {line ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              backgroundColor: `${line.colorHex}20`,
                              borderColor: `${line.colorHex}50`,
                              color: line.colorHex,
                            }}
                            className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold shrink-0"
                          >
                            {line.code}
                          </span>
                          <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                            {line.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">-</span>
                      )}
                    </td>

                    {/* Karoseri & Chassis */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div className="font-semibold text-white">{vehicle.coachbuilder}</div>
                      <div className="text-[10px] text-slate-400">{vehicle.chassis}</div>
                    </td>

                    {/* Speed & Heading */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold">{Math.round(vehicle.speedKmh)} km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.round(vehicle.headingDegrees)}&deg; {t.admin.telemetryHeading}
                      </div>
                    </td>

                    {/* Operational Status (Quick Toggle) */}
                    <td className="py-3.5 px-4">
                      <label htmlFor={`status-select-${vehicle.id}`} className="sr-only">
                        {t.admin.currentStatus}: {vehicle.vehicleCode}
                      </label>
                      <select
                        id={`status-select-${vehicle.id}`}
                        value={vehicle.status}
                        onChange={(e) =>
                          handleUpdateStatus(vehicle, e.target.value as VehicleOperationalStatus, e.currentTarget)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition cursor-pointer min-h-[36px] ${
                          vehicle.status === "IN_SERVICE"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : vehicle.status === "BOARDING"
                            ? "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
                            : vehicle.status === "CONGESTION_HOLD"
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                            : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}
                      >
                        <option value="IN_SERVICE">{t.admin.moving}</option>
                        <option value="BOARDING">{t.admin.boarding}</option>
                        <option value="CONGESTION_HOLD">{t.admin.hold}</option>
                        <option value="OUT_OF_SERVICE">{t.common.inactive}</option>
                      </select>
                      {vehicle.status !== "IN_SERVICE" && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          {t.admin.fleetStatusSpeedShort}
                        </div>
                      )}
                    </td>

                    {/* Capacity & Crowd Density */}
                    <td className="py-3.5 px-4">
                      <label htmlFor={`crowd-select-${vehicle.id}`} className="sr-only">
                        {t.admin.capacityAndDensity}: {vehicle.vehicleCode}
                      </label>
                      <select
                        id={`crowd-select-${vehicle.id}`}
                        value={vehicle.crowdLevel}
                        onChange={(e) =>
                          handleUpdateCrowd(vehicle, e.target.value as CrowdDensityLevel, e.currentTarget)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition cursor-pointer min-h-[36px] ${
                          vehicle.crowdLevel === "LEVEL_1_MANY_SEATS"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : vehicle.crowdLevel === "LEVEL_2_FEW_SEATS"
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                            : vehicle.crowdLevel === "LEVEL_3_STANDING_ONLY"
                            ? "bg-orange-950/80 border-orange-500/40 text-orange-300"
                            : "bg-rose-950/80 border-rose-500/40 text-rose-300"
                        }`}
                      >
                        <option value="LEVEL_1_MANY_SEATS">{t.crowdsource.densitySeatsAvailable}</option>
                        <option value="LEVEL_2_FEW_SEATS">{t.crowdsource.densityFewSeats}</option>
                        <option value="LEVEL_3_STANDING_ONLY">{t.crowdsource.densityStandingOnly}</option>
                        <option value="LEVEL_4_FULL_CRUSH">{t.crowdsource.densityFullCrowded}</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="sticky right-0 z-10 py-3.5 px-4 text-right bg-slate-900/95 group-hover:bg-[#131b2e] backdrop-blur-md shadow-[-12px_0_16px_-4px_rgba(0,0,0,0.6)] before:content-[''] before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-slate-900/95 group-hover:before:to-[#131b2e] before:pointer-events-none transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        {confirmDeleteId === vehicle.id ? (
                          <span
                            role="alert"
                            aria-label={`${t.admin.fleetDeleteConfirmTitle}: ${vehicle.vehicleCode}`}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                closeDeleteConfirm();
                              }
                              trapTabInConfirm(e);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 px-2 py-1"
                          >
                            <span className="text-[11px] font-semibold text-rose-200 whitespace-nowrap">
                              {t.admin.fleetDeleteConfirm.replace("{code}", vehicle.vehicleCode)}
                            </span>
                            <button
                              type="button"
                              ref={confirmDeleteButtonRef}
                              onClick={() => {
                                setConfirmDeleteId(null);
                                handleDeleteVehicle(vehicle, lastTriggerRef.current);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition btn-tactile min-h-[36px]"
                            >
                              {t.admin.fleetDeleteButton}
                            </button>
                            <button
                              type="button"
                              onClick={closeDeleteConfirm}
                              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition btn-tactile min-h-[36px]"
                            >
                              {t.common.cancel}
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label={`${t.admin.viewTelemetryFor} ${vehicle.vehicleCode}`}
                              onClick={() => openTelemetryModal(vehicle)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 hover:text-cyan-100 text-[11px] font-medium transition btn-tactile min-h-[36px]"
                            >
                              {t.admin.viewTelemetry}
                            </button>
                            <button
                              type="button"
                              aria-label={`${t.admin.ariaDeleteVehicle} ${vehicle.vehicleCode}`}
                              onClick={(e) => openDeleteConfirm(vehicle, e.currentTarget)}
                              className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-200 text-[11px] transition btn-tactile min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
      {/* 4. DETAIL INSPECTOR DRAWER / MODAL */}
      {selectedVehicle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="telemetry-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTelemetryModal();
          }}
          onKeyDown={handleTelemetryTrapKey}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            ref={telemetryModalRef}
            tabIndex={-1}
            className="glass-panel bg-slate-900/95 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200 outline-none"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  {getCategoryIcon(selectedVehicle.category)}
                </div>
                <div>
                  <h3 id="telemetry-dialog-title" className="text-base font-bold text-white font-mono">
                    {selectedVehicle.vehicleCode} &bull; {selectedVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedVehicle.mode} &bull; {t.admin.liveTelemetryBadge}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeTelemetryModal}
                aria-label={t.admin.closeTelemetryDialog}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Undo Banner: Keeps focus trapped inside dialog without z-50 leak */}
            {modalUndo && (
              <div
                role="status"
                aria-live="polite"
                className="mx-5 mt-4 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-slate-200 text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-150 shrink-0"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">
                    {t.admin.pendingUndo}: <strong>{modalUndo.label}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) undoButtonRefs.current.set(modalUndo.vehicleId, el);
                    else undoButtonRefs.current.delete(modalUndo.vehicleId);
                  }}
                  onFocus={() => setUndoPaused(true)}
                  onBlur={() => setUndoPaused(false)}
                  onClick={() => handleUndo(modalUndo.vehicleId)}
                  aria-label={`${t.admin.pendingUndo}: ${modalUndo.label}`}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 font-bold text-xs transition btn-tactile min-h-[36px] shrink-0"
                >
                  {t.common.undo}
                  <span aria-hidden="true">
                    {" "}
                    ({Math.max(0, Math.ceil((modalUndo.expiry - nowTick) / 1000))}s)
                  </span>
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  {t.vehicleInspector.telemetryTitle}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t.vehicleInspector.coachbuilder}:</span>
                    <strong className="text-white text-xs">{selectedVehicle.coachbuilder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t.vehicleInspector.chassis}:</span>
                    <strong className="text-white text-xs">{selectedVehicle.chassis}</strong>
                  </div>
                </div>
              </div>

              {identityDraft && (
                <details className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-300 py-1">
                    {t.admin.fleetIdentityTitle}
                  </summary>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-run" className="text-xs font-semibold text-slate-300">{t.common.runNumber}</label>
                      <input
                        id="tele-id-run"
                        type="text"
                        value={identityDraft.runNumber}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, runNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-trainset" className="text-xs font-semibold text-slate-300">{t.common.trainset}</label>
                      <input
                        id="tele-id-trainset"
                        type="text"
                        value={identityDraft.trainsetNumber}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, trainsetNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-totaltrainsets" className="text-xs font-semibold text-slate-300">{t.admin.fleetTotalTrainsets}</label>
                      <input
                        id="tele-id-totaltrainsets"
                        type="number"
                        min="1"
                        value={identityDraft.totalTrainsets}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, totalTrainsets: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-formation" className="text-xs font-semibold text-slate-300">{t.common.formation}</label>
                      <input
                        id="tele-id-formation"
                        type="text"
                        value={identityDraft.carFormation}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, carFormation: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-depot" className="text-xs font-semibold text-slate-300">{t.common.depot}</label>
                      <input
                        id="tele-id-depot"
                        type="text"
                        value={identityDraft.depotHome}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, depotHome: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-fleetno" className="text-xs font-semibold text-slate-300">{t.common.fleetNumber}</label>
                      <input
                        id="tele-id-fleetno"
                        type="text"
                        value={identityDraft.fleetNumber}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, fleetNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-busrun" className="text-xs font-semibold text-slate-300">{t.admin.fleetBusRun}</label>
                      <input
                        id="tele-id-busrun"
                        type="text"
                        value={identityDraft.busRunNumber}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, busRunNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tele-id-plate" className="text-xs font-semibold text-slate-300">{t.common.licensePlate}</label>
                      <input
                        id="tele-id-plate"
                        type="text"
                        value={identityDraft.licensePlate}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, licensePlate: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono uppercase min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label htmlFor="tele-id-operator" className="text-xs font-semibold text-slate-300">{t.common.operator}</label>
                      <input
                        id="tele-id-operator"
                        type="text"
                        value={identityDraft.operatorName}
                        onChange={(e) => setIdentityDraft({ ...identityDraft, operatorName: e.target.value })}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 min-h-[44px]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveIdentity(selectedVehicle)}
                    className="mt-3 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition btn-tactile min-h-[40px]"
                  >
                    {t.admin.fleetSaveIdentity}
                  </button>
                </details>
              )}

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                <span className="text-slate-500 text-[10px] uppercase font-mono">
                  {t.admin.fleetPhotoTitle}
                </span>
                {(selectedVehicle.photos ?? []).length === 0 ? (
                  <p className="text-[11px] text-slate-500">{t.admin.fleetPhotosEmpty}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(selectedVehicle.photos ?? []).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/80 border border-white/5 px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-200 truncate font-mono">{p.url}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {[p.caption, p.photographer, p.tag].filter(Boolean).join(" • ") || p.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(selectedVehicle, p.id)}
                          aria-label={`${t.admin.fleetPhotoRemove} ${p.url}`}
                          className="p-2 rounded-lg text-rose-300/80 hover:text-rose-200 hover:bg-rose-950/60 transition shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="col-span-2 space-y-1">
                    <label htmlFor="tele-photo-url" className="text-[11px] text-slate-400">{t.admin.fleetPhotoUrl}</label>
                    <input
                      id="tele-photo-url"
                      type="url"
                      required
                      value={photoDraft.url}
                      onChange={(e) => setPhotoDraft({ ...photoDraft, url: e.target.value })}
                      placeholder="https://…"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="tele-photo-caption" className="text-[11px] text-slate-400">{t.admin.fleetPhotoCaption}</label>
                    <input
                      id="tele-photo-caption"
                      type="text"
                      value={photoDraft.caption}
                      onChange={(e) => setPhotoDraft({ ...photoDraft, caption: e.target.value })}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 min-h-[40px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="tele-photo-credit" className="text-[11px] text-slate-400">{t.admin.fleetPhotoCredit}</label>
                    <input
                      id="tele-photo-credit"
                      type="text"
                      value={photoDraft.credit}
                      onChange={(e) => setPhotoDraft({ ...photoDraft, credit: e.target.value })}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 min-h-[40px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="tele-photo-tag" className="text-[11px] text-slate-400">{t.admin.fleetPhotoTag}</label>
                    <input
                      id="tele-photo-tag"
                      type="text"
                      value={photoDraft.tag}
                      onChange={(e) => setPhotoDraft({ ...photoDraft, tag: e.target.value })}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono min-h-[40px]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleAddPhoto(selectedVehicle)}
                      disabled={!photoDraft.url.trim()}
                      className="w-full px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-40 btn-tactile min-h-[40px]"
                    >
                      {t.admin.fleetPhotoAdd}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">{t.vehicleInspector.speed}</span>
                  <div className="text-lg font-bold text-cyan-300 font-mono">
                    {Math.round(selectedVehicle.speedKmh)} km/h
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">{t.vehicleInspector.bearing}</span>
                  <div className="text-lg font-bold text-slate-200 font-mono">
                    {Math.round(selectedVehicle.headingDegrees)}&deg;
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="telemetry-speed-slider" className="text-xs font-bold text-slate-300">
                    {t.vehicleInspector.speed}
                  </label>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(selectedVehicle.speedKmh)} km/h</span>
                </div>
                <input
                  id="telemetry-speed-slider"
                  type="range"
                  min="0"
                  max="140"
                  step="5"
                  aria-describedby="status-coupling-callout"
                  value={Math.round(selectedVehicle.speedKmh)}
                  onChange={(e) =>
                    handleUpdateSpeed(selectedVehicle, parseInt(e.target.value, 10))
                  }
                  className="w-full cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300">{t.admin.currentStatus}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["IN_SERVICE", "BOARDING", "CONGESTION_HOLD", "OUT_OF_SERVICE"] as VehicleOperationalStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        aria-pressed={selectedVehicle.status === st}
                        onClick={(e) => handleUpdateStatus(selectedVehicle, st, e.currentTarget)}
                        className={`p-3 rounded-xl border text-xs font-mono transition min-h-[44px] ${
                          selectedVehicle.status === st
                            ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st === "IN_SERVICE"
                          ? t.admin.moving
                          : st === "BOARDING"
                          ? t.admin.boarding
                          : st === "CONGESTION_HOLD"
                          ? t.admin.hold
                          : t.common.inactive}
                      </button>
                    )
                  )}
                </div>
                <div
                  id="status-coupling-callout"
                  data-testid="status-coupling-callout"
                  className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2"
                >
                  <CircleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90">
                    {t.admin.fleetStatusSpeedNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between">
              {selectedVehicle && confirmDeleteId === selectedVehicle.id ? (
                <span
                  role="alert"
                  aria-label={`${t.admin.fleetDeleteConfirmTitle}: ${selectedVehicle.vehicleCode}`}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      closeDeleteConfirm();
                    }
                    trapTabInConfirm(e);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3 py-2"
                >
                  <span className="text-xs font-semibold text-rose-200">
                    {t.admin.fleetDeleteConfirm.replace("{code}", selectedVehicle.vehicleCode)}
                  </span>
                  <button
                    type="button"
                    ref={confirmDeleteButtonRef}
                    onClick={() => {
                      const target = selectedVehicle;
                      setConfirmDeleteId(null);
                      closeTelemetryModal();
                      handleDeleteVehicle(target, null);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition btn-tactile min-h-[36px]"
                  >
                    {t.admin.fleetDeleteButton}
                  </button>
                  <button
                    type="button"
                    onClick={closeDeleteConfirm}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-700 transition btn-tactile min-h-[36px]"
                  >
                    {t.common.cancel}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    if (selectedVehicle) openDeleteConfirm(selectedVehicle, e.currentTarget);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/50 border border-rose-500/40 hover:bg-rose-900/60 text-xs text-rose-300 hover:text-rose-100 font-semibold transition btn-tactile min-h-[36px] flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.admin.deleteVehicle}</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeTelemetryModal}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-200 font-semibold transition btn-tactile min-h-[36px]"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD SIMULATED VEHICLE MODAL */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-vehicle-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
          onKeyDown={handleAddTrapKey}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            ref={addModalRef}
            tabIndex={-1}
            className="glass-panel bg-slate-900/95 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200 outline-none"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  <Truck className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 id="add-vehicle-dialog-title" className="text-base font-bold text-white">{t.admin.addVehicle}</h3>
                  <p className="text-xs text-slate-400">{t.admin.fleetSubtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                aria-label={t.admin.closeAddVehicleDialog}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddVehicle} className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              {/* Assigned Line */}
              <div className="space-y-1.5">
                <label htmlFor="add-vehicle-line" className="text-xs font-semibold text-slate-300">{t.admin.fleetAssignedLine}</label>
                <select
                  id="add-vehicle-line"
                  value={newLineId}
                  onChange={(e) => setNewLineId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 min-h-[44px]"
                >
                  {allLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      [{l.code}] {l.name} ({l.mode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-code" className="text-xs font-semibold text-slate-300">{t.admin.vehicleCode}</label>
                  <input
                    id="add-vehicle-code"
                    type="text"
                    value={newVehicleCode}
                    onChange={(e) => setNewVehicleCode(e.target.value)}
                    placeholder={t.admin.vehicleCodePh}
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono uppercase min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-name" className="text-xs font-semibold text-slate-300">{t.admin.vehicleName}</label>
                  <input
                    id="add-vehicle-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t.admin.modelNamePh}
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Extended identity (run / trainset / depot / plates) */}
              <details className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-300 py-1">
                  {t.admin.fleetIdentityTitle}
                </summary>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-run" className="text-xs font-semibold text-slate-300">{t.common.runNumber}</label>
                    <input
                      id="add-vehicle-run"
                      type="text"
                      value={newRunNumber}
                      onChange={(e) => setNewRunNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-trainset" className="text-xs font-semibold text-slate-300">{t.common.trainset}</label>
                    <input
                      id="add-vehicle-trainset"
                      type="text"
                      value={newTrainsetNumber}
                      onChange={(e) => setNewTrainsetNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-totaltrainsets" className="text-xs font-semibold text-slate-300">{t.admin.fleetTotalTrainsets}</label>
                    <input
                      id="add-vehicle-totaltrainsets"
                      type="number"
                      min="1"
                      value={newTotalTrainsets}
                      onChange={(e) => setNewTotalTrainsets(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-formation" className="text-xs font-semibold text-slate-300">{t.common.formation}</label>
                    <input
                      id="add-vehicle-formation"
                      type="text"
                      value={newCarFormation}
                      onChange={(e) => setNewCarFormation(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-depot" className="text-xs font-semibold text-slate-300">{t.common.depot}</label>
                    <input
                      id="add-vehicle-depot"
                      type="text"
                      value={newDepotHome}
                      onChange={(e) => setNewDepotHome(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-fleetno" className="text-xs font-semibold text-slate-300">{t.common.fleetNumber}</label>
                    <input
                      id="add-vehicle-fleetno"
                      type="text"
                      value={newFleetNumber}
                      onChange={(e) => setNewFleetNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-busrun" className="text-xs font-semibold text-slate-300">{t.admin.fleetBusRun}</label>
                    <input
                      id="add-vehicle-busrun"
                      type="text"
                      value={newBusRunNumber}
                      onChange={(e) => setNewBusRunNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-vehicle-plate" className="text-xs font-semibold text-slate-300">{t.common.licensePlate}</label>
                    <input
                      id="add-vehicle-plate"
                      type="text"
                      value={newLicensePlate}
                      onChange={(e) => setNewLicensePlate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono uppercase min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label htmlFor="add-vehicle-operator" className="text-xs font-semibold text-slate-300">{t.common.operator}</label>
                    <input
                      id="add-vehicle-operator"
                      type="text"
                      value={newOperatorName}
                      onChange={(e) => setNewOperatorName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                    />
                  </div>
                </div>
              </details>

              {/* Coachbuilder & Chassis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-coachbuilder" className="text-xs font-semibold text-slate-300">{t.vehicleInspector.coachbuilder}</label>
                  <select
                    id="add-vehicle-coachbuilder"
                    value={newCoachbuilder}
                    onChange={(e) => setNewCoachbuilder(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                  >
                    {modeSpecs.coachbuilders.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__CUSTOM__">{t.admin.optionNewKaroseri}</option>
                  </select>
                  {newCoachbuilder === "__CUSTOM__" && (
                    <input
                      type="text"
                      value={customCoachbuilder}
                      onChange={(e) => setCustomCoachbuilder(e.target.value)}
                      placeholder={t.admin.coachbuilderPh}
                      required
                      className="w-full mt-1.5 bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 min-h-[38px]"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-chassis" className="text-xs font-semibold text-slate-300">{t.vehicleInspector.chassis}</label>
                  <select
                    id="add-vehicle-chassis"
                    value={newChassis}
                    onChange={(e) => setNewChassis(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                  >
                    {modeSpecs.chassises.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__CUSTOM__">{t.admin.optionNewChassis}</option>
                  </select>
                  {newChassis === "__CUSTOM__" && (
                    <input
                      type="text"
                      value={customChassis}
                      onChange={(e) => setCustomChassis(e.target.value)}
                      placeholder={t.admin.chassisPh}
                      required
                      className="w-full mt-1.5 bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 min-h-[38px]"
                    />
                  )}
                </div>
              </div>

              {/* Cabin Seating Layout Selector (Inner SVG) */}
              <div className="space-y-1.5">
                <label htmlFor="add-vehicle-seating" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{t.admin.cabinLayoutLabel}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{t.admin.dynamicDiagram}</span>
                </label>
                <select
                  id="add-vehicle-seating"
                  value={seatingLayoutChoice}
                  onChange={(e) => setSeatingLayoutChoice(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
                >
                  <option value="DEFAULT">{t.admin.autoConfigureMode}</option>
                  <option value="SLEEPER_1_1_1">{t.admin.layoutSleeper111}</option>
                  <option value="SUPER_EXEC_2_1">{t.admin.layoutSuperExec21}</option>
                  <option value="EXEC_2_2">{t.admin.layoutExecHighway}</option>
                  <option value="HIACE_VIP">{t.admin.layoutShuttleVip}</option>
                  <option value="COMMUTER_LONGITUDINAL">{t.admin.layoutCommuterBench}</option>
                </select>
              </div>

              {/* Initial Speed */}
              <div className="space-y-1.5">
                <label htmlFor="add-vehicle-speed" className="text-xs font-semibold text-slate-300">
                  {t.vehicleInspector.speed}: <span className="font-mono text-cyan-400">{newSpeed} km/h</span>
                </label>
                <input
                  id="add-vehicle-speed"
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={newSpeed}
                  onChange={(e) => setNewSpeed(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>

              {/* Pre-submit summary: what commit will actually store */}
              <div
                data-testid="fleet-add-summary"
                className="rounded-xl bg-slate-950/70 border border-white/10 px-3.5 py-3 space-y-1"
              >
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {t.admin.fleetAddSummary}
                </div>
                <div className="font-mono text-[11px] text-slate-300">
                  [{addSummary.lineCode}] {normalizedNewCode || t.admin.vehicleCodePh}
                </div>
                <div className="text-[11px] text-slate-400">
                  {addSummary.coachbuilder} • {addSummary.chassis}
                </div>
                <div className="text-[11px] text-slate-400">
                  {t.admin.capacityAndDensity}: {addSummary.capacity} ({t.admin.fleetCapacitySplit.replace("{seat}", String(addSummary.seatCap)).replace("{stand}", String(addSummary.standCap))})
                </div>
                {isDuplicateCode && (
                  <div role="alert" className="text-[11px] font-semibold text-rose-300">
                    {t.admin.fleetDuplicateCode.replace("{code}", normalizedNewCode)}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition btn-tactile min-h-[40px]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isDuplicateCode}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-cyan-950 shadow-md transition btn-tactile min-h-[40px]"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
