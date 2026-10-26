/**
 * PlatformI - Operator Control Portal: Network & Map Studio
 *
 * Visual transit infrastructure editor:
 * - Multimodal line authoring and station/stop geofencing.
 * - Interactive Leaflet cartography with click-to-place station placement and draggable coordinates.
 * - Mathematical Centripetal Catmull-Rom spline curve smoothing for realistic railway/road geometry.
 * - Database persistence via SQLite & Prisma REST APIs (/api/network/lines and /api/network/stops).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Route,
  MapPin,
  Spline,
  Plus,
  Trash2,
  Edit3,
  Save,
  Search,
  Train,
  Bus,
  Plane,
  Anchor,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Accessibility,
  Eye,
  EyeOff,
  Download,
  Upload,
  Wand2,
  Compass,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { Line, Stop, TransitCategory, TransitMode, FareStructureType, Coordinate, StationType, StationScale } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { DynamicNetworkMap } from "@/components/admin/DynamicNetworkMap";
import {
  smoothPolyline,
  simplifyPolyline,
  coordinatesToLatLngTuples,
  latLngTuplesToCoordinates,
  lineToGeoJSON,
  parseGeoJSONToLine,
  generatePathFromStops,
  snapRouteToRoads,
  haversineDistanceMeters,
} from "@/lib/geodesy/curveSmoothing";

const CATEGORIES: { id: TransitCategory | "ALL"; labelKey: "netCatAll" | "netCatRail" | "netCatBusRoad" | "netCatAviation" | "netCatMaritime"; icon: React.ReactNode }[] = [
  { id: "ALL", labelKey: "netCatAll", icon: <Route className="w-3.5 h-3.5" /> },
  { id: "RAIL", labelKey: "netCatRail", icon: <Train className="w-3.5 h-3.5" /> },
  { id: "BUS", labelKey: "netCatBusRoad", icon: <Bus className="w-3.5 h-3.5" /> },
  { id: "AVIATION", labelKey: "netCatAviation", icon: <Plane className="w-3.5 h-3.5" /> },
  { id: "MARITIME", labelKey: "netCatMaritime", icon: <Anchor className="w-3.5 h-3.5" /> },
];

const MODES_BY_CATEGORY: Record<TransitCategory, TransitMode[]> = {
  RAIL: [
    "MRT_JAKARTA",
    "LRT_JABODEBEK_CIBUBUR",
    "LRT_JABODEBEK_BEKASI",
    "LRT_JAKARTA",
    "KRL_BOGOR",
    "KRL_CIKARANG",
    "KRL_RANGKASBITUNG",
    "KRL_TANGERANG",
    "KRL_TANJUNG_PRIOK",
    "WHOOSH_HSR",
    "KAI_BANDARA",
    "KAI_INTERCITY",
  ],
  BUS: [
    "TRANSJAKARTA_BRT",
    "TRANSJAKARTA_NON_BRT",
    "MIKROTRANS",
    "AKAP_INTERCITY_BUS",
    "EXECUTIVE_SHUTTLE",
  ],
  AVIATION: ["AIRPORT_COMMERCIAL"],
  MARITIME: ["MARITIME_SPEEDBOAT", "MARITIME_PELNI"],
};

export default function AdminNetworkStudioPage() {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const fetchNetworkData = useTransitStore((state) => state.fetchNetworkData);
  const upsertLine = useTransitStore((state) => state.upsertLine);
  const upsertStop = useTransitStore((state) => state.upsertStop);
  const removeLineFromStore = useTransitStore((state) => state.removeLine);
  const removeStopFromStore = useTransitStore((state) => state.removeStop);
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);

  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Map Editor Interaction Modes
  const [isAddStopMode, setIsAddStopMode] = useState<boolean>(false);
  const [tempPlacementCoord, setTempPlacementCoord] = useState<[number, number] | null>(null);

  // Curve Smoothing State
  const [previewSmoothedLine, setPreviewSmoothedLine] = useState<boolean>(false);
  const [isSavingCurve, setIsSavingCurve] = useState<boolean>(false);
  const [isSnappingRoads, setIsSnappingRoads] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modals
  const [isLineModalOpen, setIsLineModalOpen] = useState<boolean>(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<Partial<Line> | null>(null);
  const [editingStop, setEditingStop] = useState<Partial<Stop> | null>(null);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Staged stop mutations: local-first, published explicitly via the staged
  // strip. Every entry keeps its pre-edit snapshots for undo and discard.
  interface StagedStopOp {
    id: string;
    label: string;
    befores: Stop[];
    createdAt: number;
  }
  const [stagedStopOps, setStagedStopOps] = useState<StagedStopOp[]>([]);
  const [undoOp, setUndoOp] = useState<StagedStopOp | null>(null);
  const [isPublishingStops, setIsPublishingStops] = useState<boolean>(false);

  // In-app delete confirmation (replaces window.confirm)
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "line" | "stop"; id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

  // Undo window: 10s after each staged mutation
  useEffect(() => {
    if (!undoOp) return;
    const timer = window.setTimeout(() => setUndoOp(null), 10000);
    return () => window.clearTimeout(timer);
  }, [undoOp]);

  const recordStagedStopOp = useCallback((label: string, befores: Stop[]): void => {
    const op: StagedStopOp = {
      id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      label,
      befores,
      createdAt: Date.now(),
    };
    setStagedStopOps((prev) => [...prev, op]);
    setUndoOp(op);
  }, []);

  const undoStagedStopOp = (): void => {
    if (!undoOp) return;
    for (const before of undoOp.befores) {
      upsertStop(before);
    }
    setStagedStopOps((prev) => prev.filter((op) => op.id !== undoOp.id));
    setUndoOp(null);
    setStatusMessage({ type: "success", text: t.admin.netToastUndone });
  };

  const discardStagedStopOps = (): void => {
    const ops = [...stagedStopOps].reverse();
    for (const op of ops) {
      for (const before of op.befores) {
        upsertStop(before);
      }
    }
    setStagedStopOps([]);
    setUndoOp(null);
  };

  const publishStagedStopOps = async (): Promise<void> => {
    if (stagedStopOps.length === 0 || isPublishingStops) return;
    setIsPublishingStops(true);
    try {
      // Net effect per stop: earliest snapshot vs current store state.
      const originals = new Map<string, Stop>();
      for (const op of stagedStopOps) {
        for (const before of op.befores) {
          if (!originals.has(before.id)) originals.set(before.id, before);
        }
      }
      const current = useTransitStore.getState().allStops;
      let published = 0;
      for (const [id, before] of originals) {
        const now = current.find((s) => s.id === id);
        if (!now) {
          const res = await fetch(`/api/network/stops?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete stop");
          published += 1;
        } else if (JSON.stringify(now) !== JSON.stringify(before)) {
          const res = await fetch("/api/network/stops", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(now),
          });
          if (!res.ok) throw new Error("Failed to save stop");
          published += 1;
        }
      }
      setStagedStopOps([]);
      setUndoOp(null);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastStopsPublished.replace("{n}", String(published)),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.admin.netToastSaveFailed;
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsPublishingStops(false);
    }
  };

  // Net staged counts for the strip: distinct stops touched + staged deletions.
  const stagedStopSummary = useMemo(() => {
    const touched = new Set<string>();
    for (const op of stagedStopOps) {
      for (const before of op.befores) touched.add(before.id);
    }
    let deletions = 0;
    for (const id of touched) {
      if (!allStops.some((s) => s.id === id)) deletions += 1;
    }
    return { total: touched.size, deletions };
  }, [stagedStopOps, allStops]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auto-dismiss status messages
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Track saved database polyline coordinates to enable instant Revert / Cancel
  const [savedCoordinatesMap, setSavedCoordinatesMap] = useState<Record<string, Coordinate[]>>({});

  // Initial load
  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // Sync baseline whenever lines are loaded
  useEffect(() => {
    if (allLines.length > 0) {
      setSavedCoordinatesMap((prev) => {
        const next = { ...prev };
        allLines.forEach((l) => {
          if (!next[l.id]) {
            next[l.id] = [...(l.polylineCoordinates || [])];
          }
        });
        return next;
      });
    }
  }, [allLines]);

  // Refresh data handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNetworkData();
    setIsRefreshing(false);
    setStatusMessage({ type: "success", text: t.admin.netToastDbSynced });
  };

  // Filtered lines
  const filteredLines = useMemo(() => {
    return allLines.filter((line) => {
      const matchesCategory = activeCategory === "ALL" || line.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        line.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allLines, activeCategory, searchQuery]);

  // Selected Line reference
  const selectedLine = useMemo(() => {
    return allLines.find((l) => l.id === selectedLineId) || null;
  }, [allLines, selectedLineId]);

  // Detect unsaved polyline modifications compared to database baseline
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedLine) return false;
    const baseline = savedCoordinatesMap[selectedLine.id];
    if (!baseline) return false;
    const current = selectedLine.polylineCoordinates || [];
    if (baseline.length !== current.length) return true;
    for (let i = 0; i < current.length; i++) {
      if (
        Math.abs(current[i].latitude - baseline[i].latitude) > 0.000001 ||
        Math.abs(current[i].longitude - baseline[i].longitude) > 0.000001
      ) {
        return true;
      }
    }
    return false;
  }, [selectedLine, savedCoordinatesMap]);

  // Stops belonging to selected line, ordered by sequence
  const lineStops = useMemo(() => {
    if (!selectedLine) return [];
    return allStops
      .filter((s) => s.lineId === selectedLine.id)
      .sort((a, b) => a.sequence - b.sequence);
  }, [allStops, selectedLine]);

  // Selected stop reference
  const selectedStop = useMemo(() => {
    return allStops.find((s) => s.id === selectedStopId) || null;
  }, [allStops, selectedStopId]);

  // Computed Smoothed Spline for the selected line
  const smoothedCoordinates = useMemo(() => {
    if (!selectedLine || !selectedLine.polylineCoordinates || selectedLine.polylineCoordinates.length < 2) {
      return null;
    }
    const smoothed = smoothPolyline(selectedLine.polylineCoordinates, 5);
    return coordinatesToLatLngTuples(smoothed);
  }, [selectedLine]);

  // 1. Map Click Callback for Add Station Mode with smart defaults
  const handleMapClickAddStop = useCallback(
    (lat: number, lng: number) => {
      setTempPlacementCoord([lat, lng]);
      setIsAddStopMode(false);

      const targetLine = selectedLine || allLines[0];
      const nextSeq = lineStops.length + 1;
      const cleanCode = targetLine
        ? targetLine.code.replace(/[^a-zA-Z0-9]/g, "")
        : "ST";
      const suggestedCode = `${cleanCode}-${String(nextSeq).padStart(2, "0")}`;

      // Open Stop Modal pre-filled with clicked coordinates and smart defaults
      setEditingStop({
        lineId: targetLine?.id || "",
        name: "",
        code: suggestedCode,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        sequence: nextSeq,
        isInterchange: false,
        connectedLineIds: [],
        facilities: ["TOILET", "TICKET_VENDING"],
        accessibleElevator: true,
        tactilePaving: true,
        wheelchairRamp: true,
        platformType: "ISLAND",
        stationType: targetLine?.category === "BUS" ? "BUS_SHELTER" : "RAIL_STATION",
        scale: "MEDIUM",
      });
      setIsStopModalOpen(true);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastPointSelected.replace("{lat}", lat.toFixed(5)).replace("{lng}", lng.toFixed(5)),
      });
    },
    [selectedLine, allLines, lineStops.length]
  );

  // 2. Marker Drag End Callback: staged locally, published via the strip.
  const handleStopDragEnd = useCallback(
    (stopId: string, lat: number, lng: number) => {
      const existing = allStops.find((s) => s.id === stopId);
      if (!existing) return;

      const updatedStop: Stop = {
        ...existing,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };

      upsertStop(updatedStop);
      recordStagedStopOp(`move ${existing.code}`, [existing]);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastCalibrated.replace("{name}", existing.name).replace("{lat}", lat.toFixed(5)).replace("{lng}", lng.toFixed(5)),
      });
    },
    [allStops, upsertStop, recordStagedStopOp]
  );

  // 2b. Drag Vertex End Callback for Bending Route Geometry
  const handleVertexDragEnd = useCallback(
    (vertexIndex: number, lat: number, lng: number) => {
      if (!selectedLine) return;
      const currentCoords = [...(selectedLine.polylineCoordinates || [])];
      if (vertexIndex < 0 || vertexIndex >= currentCoords.length) return;

      currentCoords[vertexIndex] = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };

      const updatedLine: Line = {
        ...selectedLine,
        polylineCoordinates: currentCoords,
      };

      upsertLine(updatedLine);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastVertexMoved.replace("{n}", String(vertexIndex + 1)).replace("{save}", t.admin.netSaveDb).replace("{revert}", t.admin.netRevert),
      });
    },
    [selectedLine, upsertLine]
  );

  // 2c. Insert Vertex by Clicking Anywhere Along Route Polyline
  const handleInsertVertex = useCallback(
    (lat: number, lng: number) => {
      if (!selectedLine) return;
      const coords = [...(selectedLine.polylineCoordinates || [])];
      if (coords.length < 2) {
        coords.push({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
      } else {
        // Find segment (i, i+1) where perpendicular distance to (lat, lng) is minimal
        let bestIndex = coords.length - 1;
        let minDistance = Infinity;

        for (let i = 0; i < coords.length - 1; i++) {
          const d1 = haversineDistanceMeters(lat, lng, coords[i].latitude, coords[i].longitude);
          const d2 = haversineDistanceMeters(lat, lng, coords[i + 1].latitude, coords[i + 1].longitude);
          const segLen = haversineDistanceMeters(
            coords[i].latitude,
            coords[i].longitude,
            coords[i + 1].latitude,
            coords[i + 1].longitude
          );
          const excess = d1 + d2 - segLen;
          if (excess < minDistance) {
            minDistance = excess;
            bestIndex = i;
          }
        }

        coords.splice(bestIndex + 1, 0, {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
        });
      }

      const updatedLine: Line = {
        ...selectedLine,
        polylineCoordinates: coords,
      };

      upsertLine(updatedLine);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastVertexInserted.replace("{lat}", lat.toFixed(5)).replace("{lng}", lng.toFixed(5)),
      });
    },
    [selectedLine, upsertLine]
  );

  // 2d. Delete Vertex Handle
  const handleDeleteVertex = useCallback(
    (vertexIndex: number) => {
      if (!selectedLine) return;
      const coords = [...(selectedLine.polylineCoordinates || [])];
      if (coords.length <= 2) {
        setStatusMessage({
          type: "error",
          text: t.admin.netToastNeed2Vertices,
        });
        return;
      }
      coords.splice(vertexIndex, 1);
      const updatedLine: Line = {
        ...selectedLine,
        polylineCoordinates: coords,
      };
      upsertLine(updatedLine);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastVertexDeleted.replace("{n}", String(vertexIndex + 1)),
      });
    },
    [selectedLine, upsertLine]
  );

  // 2e. Revert Unsaved Route Modifications to Database Baseline
  const handleRevertChanges = useCallback(() => {
    if (!selectedLine) return;
    const baseline = savedCoordinatesMap[selectedLine.id];
    if (!baseline) return;

    const revertedLine: Line = {
      ...selectedLine,
      polylineCoordinates: [...baseline],
    };
    upsertLine(revertedLine);
    setPreviewSmoothedLine(false);
    setStatusMessage({
      type: "success",
      text: t.admin.netToastReverted.replace("{code}", selectedLine.code),
    });
  }, [selectedLine, savedCoordinatesMap, upsertLine]);

  // 2f. Save Current Line Polyline to Database
  const handleSaveLineCoordinates = async () => {
    if (!selectedLine) return;
    setIsSavingCurve(true);
    try {
      const payload: Partial<Line> = {
        id: selectedLine.id,
        code: selectedLine.code,
        name: selectedLine.name,
        polylineCoordinates: selectedLine.polylineCoordinates,
      };

      const res = await fetch("/api/network/lines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save coordinates to database");
      const savedRes = await res.json();
      const savedData: Line = savedRes.data || savedRes;
      upsertLine(savedData);

      setSavedCoordinatesMap((prev) => ({
        ...prev,
        [savedData.id]: [...(savedData.polylineCoordinates || [])],
      }));
      setPreviewSmoothedLine(false);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastPersisted.replace("{v}", String(savedData.polylineCoordinates.length)).replace("{code}", savedData.code),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.admin.netToastSaveFailed;
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSavingCurve(false);
    }
  };

  // 2g. Simplify Polyline (Douglas-Peucker reduction)
  const handleSimplifyLine = () => {
    if (!selectedLine || selectedLine.polylineCoordinates.length <= 2) {
      setStatusMessage({
        type: "error",
        text: t.admin.netToastSimplifyShort,
      });
      return;
    }
    const initialCount = selectedLine.polylineCoordinates.length;
    const simplified = simplifyPolyline(selectedLine.polylineCoordinates, 25);
    const updatedLine: Line = {
      ...selectedLine,
      polylineCoordinates: simplified,
    };
    upsertLine(updatedLine);
    setStatusMessage({
      type: "success",
      text: t.admin.netToastSimplified.replace("{a}", String(initialCount)).replace("{b}", String(simplified.length)).replace("{save}", t.admin.netSaveDb),
    });
  };

  // 3. Save Smoothed Polyline to Database
  const handleSaveSmoothedCurve = async () => {
    if (!selectedLine || !smoothedCoordinates) return;
    setIsSavingCurve(true);

    try {
      const smoothedCoords = latLngTuplesToCoordinates(smoothedCoordinates);
      const updatedLine: Line = {
        ...selectedLine,
        polylineCoordinates: smoothedCoords,
      };

      const res = await fetch("/api/network/lines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLine),
      });

      const savedRes = await res.json();
      const savedData: Line = savedRes.data || savedRes;
      upsertLine(savedData);
      setSavedCoordinatesMap((prev) => ({
        ...prev,
        [savedData.id]: [...(savedData.polylineCoordinates || [])],
      }));
      setPreviewSmoothedLine(false);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastSplineApplied.replace("{name}", selectedLine.name).replace("{nodes}", String(smoothedCoordinates.length)),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSavingCurve(false);
    }
  };

  // 3b. Auto-build Path from Stations Sequence
  const handleAutoBuildFromStations = () => {
    if (!selectedLine || lineStops.length < 2) {
      setStatusMessage({
        type: "error",
        text: t.admin.netToastNeed2Stops,
      });
      return;
    }
    const newPath = generatePathFromStops(lineStops, true);
    const updatedLine: Line = {
      ...selectedLine,
      polylineCoordinates: newPath,
    };
    upsertLine(updatedLine);
    setPreviewSmoothedLine(true);
    setStatusMessage({
      type: "success",
      text: t.admin.netToastGenerated.replace("{count}", String(lineStops.length)).replace("{apply}", t.admin.netApplyDb),
    });
  };

  // 3c. Snap Route to Road Network via OSRM
  const handleSnapToRoads = async () => {
    if (!selectedLine || selectedLine.polylineCoordinates.length < 2) {
      setStatusMessage({
        type: "error",
        text: t.admin.netToastSnapEmpty,
      });
      return;
    }
    setIsSnappingRoads(true);
    try {
      const snapped = await snapRouteToRoads(selectedLine.polylineCoordinates, 4000);
      const updatedLine: Line = {
        ...selectedLine,
        polylineCoordinates: snapped,
      };
      upsertLine(updatedLine);
      setPreviewSmoothedLine(true);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastSnapped.replace("{n}", String(snapped.length)).replace("{apply}", t.admin.netApplyDb),
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: t.admin.netToastRoadFailed,
      });
    } finally {
      setIsSnappingRoads(false);
    }
  };

  // 3d. Export RFC 7946 GeoJSON
  const handleExportGeoJSON = () => {
    if (!selectedLine) return;
    const geojson = lineToGeoJSON(selectedLine, lineStops);
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platformi-${selectedLine.code.toLowerCase()}-route.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({
      type: "success",
      text: t.admin.netToastGeoExported.replace("{code}", selectedLine.code),
    });
  };

  // 3e. Import GeoJSON
  const handleImportGeoJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLine) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseGeoJSONToLine(text);

        if (parsed.polylineCoordinates.length === 0 && parsed.stops.length === 0) {
          throw new Error("No LineString or Point geometries found in GeoJSON");
        }

        const updatedLine: Line = {
          ...selectedLine,
          name: parsed.name || selectedLine.name,
          colorHex: parsed.colorHex || selectedLine.colorHex,
          polylineCoordinates:
            parsed.polylineCoordinates.length > 0
              ? parsed.polylineCoordinates
              : selectedLine.polylineCoordinates,
        };

        upsertLine(updatedLine);

        // Import any stops
        parsed.stops.forEach((s) => {
          const newStop: Stop = {
            id: `stop-${selectedLine.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            lineId: selectedLine.id,
            name: s.name,
            code: s.code,
            latitude: s.latitude,
            longitude: s.longitude,
            sequence: s.sequence,
            isInterchange: Boolean(s.isInterchange),
            connectedLineIds: [],
            facilities: ["TOILET", "TICKET_VENDING"],
            accessibleElevator: true,
            tactilePaving: true,
            wheelchairRamp: true,
          };
          upsertStop(newStop);
        });

        setStatusMessage({
          type: "success",
          text: t.admin.netToastImported.replace("{v}", String(parsed.polylineCoordinates.length)).replace("{s}", String(parsed.stops.length)),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid GeoJSON file";
        setStatusMessage({ type: "error", text: msg });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 4. Save/Create Line
  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine || !editingLine.code || !editingLine.name) return;

    try {
      const isExisting = Boolean(editingLine.id && allLines.some((l) => l.id === editingLine.id));
      const method = isExisting ? "PUT" : "POST";

      const payload: Partial<Line> = {
        ...editingLine,
        regionId: editingLine.regionId || "region-jakarta",
        polylineCoordinates: editingLine.polylineCoordinates || [
          { latitude: -6.2, longitude: 106.816666 },
          { latitude: -6.21, longitude: 106.82 },
        ],
      };

      const res = await fetch("/api/network/lines", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to ${isExisting ? "update" : "create"} line`);

      const savedRes = await res.json();
      const savedLine: Line = savedRes.data || savedRes;
      upsertLine(savedLine);
      setSelectedLineId(savedLine.id);
      setIsLineModalOpen(false);
      setEditingLine(null);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastLineSaved.replace("{code}", savedLine.code).replace("{name}", savedLine.name),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // 5. Delete Line (in-app confirm with impact; immediate after typing code)
  const handleDeleteLine = async (id: string, name: string) => {
    setDeleteConfirmText("");
    setConfirmDelete({ kind: "line", id, name });
  };

  const confirmDeleteTarget = async (): Promise<void> => {
    if (!confirmDelete) return;
    const { kind, id, name } = confirmDelete;
    if (kind === "line") {
      try {
        const res = await fetch(`/api/network/lines?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete line");

        removeLineFromStore(id);
        if (selectedLineId === id) setSelectedLineId(null);
        setStatusMessage({ type: "success", text: t.admin.netToastLineDeleted.replace("{name}", name) });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        setStatusMessage({ type: "error", text: msg });
      } finally {
        setConfirmDelete(null);
        setDeleteConfirmText("");
      }
      return;
    }
    // Staged stop delete: local removal only, published via the strip.
    const existing = useTransitStore.getState().allStops.find((s) => s.id === id);
    if (existing) {
      removeStopFromStore(id);
      if (selectedStopId === id) setSelectedStopId(null);
      recordStagedStopOp(`delete ${existing.code}`, [existing]);
      setStatusMessage({ type: "success", text: t.admin.netToastStationDeleted.replace("{name}", name) });
    }
    setConfirmDelete(null);
    setDeleteConfirmText("");
  };

  // 6. Save/Create Stop
  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop || !editingStop.name || !editingStop.code) return;

    try {
      const isExisting = Boolean(editingStop.id && allStops.some((s) => s.id === editingStop.id));
      const method = isExisting ? "PUT" : "POST";

      const res = await fetch("/api/network/stops", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStop),
      });

      if (!res.ok) throw new Error(`Failed to ${isExisting ? "update" : "create"} stop`);

      const savedRes = await res.json();
      const savedStop: Stop = savedRes.data || savedRes;
      upsertStop(savedStop);
      setIsStopModalOpen(false);
      setEditingStop(null);
      setTempPlacementCoord(null);
      setStatusMessage({
        type: "success",
        text: t.admin.netToastStopSaved.replace("{code}", savedStop.code).replace("{name}", savedStop.name),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // 7. Delete Stop (in-app confirm; staged, published via the strip)
  const handleDeleteStop = (id: string, name: string) => {
    setDeleteConfirmText("");
    setConfirmDelete({ kind: "stop", id, name });
  };

  // 8. Reorder Stop Sequence (staged locally, published via the strip)
  const handleMoveStopSequence = (stopId: string, direction: "up" | "down") => {
    const idx = lineStops.findIndex((s) => s.id === stopId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === lineStops.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentStop = lineStops[idx];
    const swapStop = lineStops[targetIdx];

    const newCurrentSeq = swapStop.sequence;
    const newSwapSeq = currentStop.sequence;

    const updatedCurrent: Stop = { ...currentStop, sequence: newCurrentSeq };
    const updatedSwap: Stop = { ...swapStop, sequence: newSwapSeq };

    upsertStop(updatedCurrent);
    upsertStop(updatedSwap);
    recordStagedStopOp(`reorder ${currentStop.code}`, [currentStop, swapStop]);
    setStatusMessage({ type: "success", text: t.admin.netToastSeqUpdated });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. STUDIO HEADER */}
      <header className="h-14 border-b border-white/10 bg-[#0a0f1d] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">{t.admin.netTitle}</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                GIS OCC
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {t.admin.netSubtitle.replace("{n}", String(allLines.length)).replace("{m}", String(allStops.length))}
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2">
          {statusMessage && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/80 border-rose-500/40 text-rose-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={t.admin.netSyncTitle}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition btn-tactile min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t.admin.netSyncDb}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCustomMode(false);
              setEditingLine({
                code: "",
                name: "",
                category: "RAIL",
                mode: "MRT_JAKARTA",
                colorHex: "#0284c7",
                textColorHex: "#ffffff",
                fareType: "PROGRESSIVE_DISTANCE",
                baseFareRp: 3000,
                farePerKmRp: 1000,
                maxFareRp: 14000,
                headwayMinutes: 5,
                firstDeparture: "05:00",
                lastDeparture: "23:00",
                polylineCoordinates: [],
              });
              setIsLineModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 transition btn-tactile min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.admin.netNewLine}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT VIEW */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: CATEGORIES, LINES & STATION SEQUENCE (Width: 420px) */}
        <aside className="w-full md:w-[420px] lg:w-[460px] border-r border-white/10 bg-[#0a0f1d] flex flex-col shrink-0 overflow-hidden">
          {/* Multimodal Category Tabs */}
          <div className="p-3 border-b border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 bg-[#070b14]/50">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition btn-tactile ${
                  activeCategory === cat.id
                    ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {cat.icon}
                <span>{t.admin[cat.labelKey]}</span>
              </button>
            ))}
          </div>

          {/* Search Line Input */}
          <div className="p-3 border-b border-white/10 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder={t.admin.netSearchPh}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Split Content: Lines List & Selected Line Inspector */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Selected Line Card (If any) */}
            {selectedLine ? (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-4 shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow"
                      style={{ backgroundColor: selectedLine.colorHex }}
                    >
                      {selectedLine.code}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white leading-tight">{selectedLine.name}</h2>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {selectedLine.mode} &bull; {selectedLine.polylineCoordinates?.length || 0} vertices
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const isKnown = (MODES_BY_CATEGORY[selectedLine.category] || []).includes(selectedLine.mode as TransitMode);
                        setIsCustomMode(!isKnown);
                        setEditingLine(selectedLine);
                        setIsLineModalOpen(true);
                      }}
                      title={t.admin.netEditLine}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(selectedLine.id, selectedLine.name)}
                      title={t.admin.netDeleteLine}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 border border-transparent hover:border-rose-800/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLineId(null);
                        setPreviewSmoothedLine(false);
                      }}
                      title={t.admin.netCloseInspector}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Unsaved Changes Banner */}
                {hasUnsavedChanges && (
                  <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{t.admin.netUnsaved}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSaveLineCoordinates}
                        disabled={isSavingCurve}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow btn-tactile"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{t.admin.netSaveDb}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRevertChanges}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-white/10 btn-tactile"
                        title={t.admin.netRevertTitle}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t.admin.netRevert}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Staged stop changes: nothing below goes live before Sync DB */}
                {stagedStopOps.length > 0 && (
                  <div className="p-3 rounded-xl bg-sky-950/70 border border-sky-500/40 flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs text-sky-200 font-semibold min-w-0">
                      <Save className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate">
                        {t.admin.netStagedStops.replace("{n}", String(stagedStopSummary.total))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {undoOp && (
                        <button
                          type="button"
                          onClick={undoStagedStopOp}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-white/10 btn-tactile"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t.common.undo}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={discardStagedStopOps}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-white/10 btn-tactile"
                      >
                        <span>{t.admin.netRevert}</span>
                      </button>
                      <button
                        type="button"
                        onClick={publishStagedStopOps}
                        disabled={isPublishingStops}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow btn-tactile disabled:opacity-40"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{t.admin.netSyncDb}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Spline Smoothing Geometry Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Spline className="w-4 h-4" />
                      <span>{t.admin.netSplineTitle}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{t.admin.netSplineMethod}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.admin.netSplineDesc}</p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewSmoothedLine((prev) => !prev)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition btn-tactile ${
                        previewSmoothedLine
                          ? "bg-emerald-950 border border-emerald-500/50 text-emerald-300"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {previewSmoothedLine ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>{t.admin.netHidePreview}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.admin.netPreviewCurves}</span>
                        </>
                      )}
                    </button>

                    {previewSmoothedLine && (
                      <button
                        type="button"
                        onClick={handleSaveSmoothedCurve}
                        disabled={isSavingCurve}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition btn-tactile shadow-md shadow-emerald-950/40"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingCurve ? "Saving..." : "Apply to DB"}</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Advanced GIS & Alignment Tools */}
                  <div className="pt-2 grid grid-cols-2 gap-1.5 border-t border-white/5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleAutoBuildFromStations}
                      title={t.admin.netBuildTitle}
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Wand2 className="w-3 h-3 text-cyan-400" />
                      <span>{t.admin.netBuildFromStops}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimplifyLine}
                      title={t.admin.netSimplifyTitle}
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Scissors className="w-3 h-3 text-rose-400" />
                      <span>{t.admin.netSimplify}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSnapToRoads}
                      disabled={isSnappingRoads}
                      title={t.admin.netSnapTitle}
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Compass className={`w-3 h-3 text-amber-400 ${isSnappingRoads ? "animate-spin" : ""}`} />
                      <span>{isSnappingRoads ? t.admin.netSnapping : t.admin.netSnapRoads}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportGeoJSON}
                      title={t.admin.netExportTitle}
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>{t.admin.netExportGeo}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title={t.admin.netImportTitle}
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Upload className="w-3 h-3 text-indigo-400" />
                      <span>{t.admin.netImportGeo}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".geojson,.json,application/geo+json,application/json"
                      onChange={handleImportGeoJSON}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Stations & Sequence Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Route Stations & Sequence ({lineStops.length})</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsAddStopMode((prev) => !prev)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
                          isAddStopMode
                            ? "bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-sm"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>{isAddStopMode ? t.admin.netClickMap : t.admin.netClickPlace}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingStop({
                            lineId: selectedLine.id,
                            name: "",
                            code: "",
                            latitude: selectedLine.polylineCoordinates[0]?.latitude || -6.2,
                            longitude: selectedLine.polylineCoordinates[0]?.longitude || 106.816666,
                            sequence: lineStops.length + 1,
                            isInterchange: false,
                            connectedLineIds: [],
                            facilities: ["TOILET", "TICKET_VENDING"],
                            accessibleElevator: true,
                            tactilePaving: true,
                            wheelchairRamp: true,
                            platformType: "ISLAND",
                            stationType: selectedLine.category === "BUS" ? "BUS_SHELTER" : "RAIL_STATION",
                            scale: "MEDIUM",
                          });
                          setIsStopModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t.admin.netAddStop}</span>
                      </button>
                    </div>
                  </div>

                  {lineStops.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center text-xs text-slate-400">
                      {t.admin.netEmptyStops}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {lineStops.map((stop, index) => {
                        const isSelected = selectedStopId === stop.id;
                        return (
                          <div
                            key={stop.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                              isSelected
                                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-100"
                                : "bg-slate-950/40 border-white/5 hover:border-white/20 text-slate-300"
                            }`}
                          >
                            <div
                              className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                              onClick={() => setSelectedStopId(stop.id)}
                            >
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-white shrink-0 shadow-sm"
                                style={{ backgroundColor: selectedLine.colorHex }}
                              >
                                {stop.sequence}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5 flex-wrap">
                                  <span>{stop.name}</span>
                                  {stop.isInterchange && (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-mono font-bold">
                                      HUB
                                    </span>
                                  )}
                                  {stop.stationType && (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                                      {stop.stationType.replace("_", " ")}
                                    </span>
                                  )}
                                  {stop.scale && (
                                    <span
                                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono border ${
                                        stop.scale === "BIG"
                                          ? "bg-purple-950/80 border-purple-500/40 text-purple-300 font-bold"
                                          : stop.scale === "MEDIUM"
                                          ? "bg-sky-950/80 border-sky-500/40 text-sky-300"
                                          : "bg-slate-900 border-slate-700 text-slate-400"
                                      }`}
                                    >
                                      {stop.scale}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {stop.code} &bull; {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveStopSequence(stop.id, "up")}
                                title={t.admin.netMoveEarlier}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white transition"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={index === lineStops.length - 1}
                                onClick={() => handleMoveStopSequence(stop.id, "down")}
                                title={t.admin.netMoveLater}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white transition"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStop(stop);
                                  setIsStopModalOpen(true);
                                }}
                                title={t.admin.netEditStation}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStop(stop.id, stop.name)}
                                title={t.admin.netDeleteStation}
                                className="p-1 rounded bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 border border-transparent hover:border-rose-800/40 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Lines List */
              <div className="space-y-1.5">
                <div className="px-1 py-0.5 text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Select a line to edit geometry or station sequence
                </div>
                {filteredLines.map((line) => {
                  const stopCount = allStops.filter((s) => s.lineId === line.id).length;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => {
                        setSelectedLineId(line.id);
                        setPreviewSmoothedLine(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-900 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow"
                          style={{ backgroundColor: line.colorHex }}
                        >
                          {line.code}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate transition">
                            {line.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {line.mode} &bull; {stopCount} stops
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-950 border border-white/5 shrink-0">
                        {line.polylineCoordinates.length} nodes
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: INTERACTIVE CARTOGRAPHY CANVAS */}
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          <DynamicNetworkMap
            lines={allLines}
            stops={allStops}
            selectedLine={selectedLine}
            selectedStop={selectedStop}
            onSelectLine={(l) => {
              setSelectedLineId(l.id);
              setPreviewSmoothedLine(false);
            }}
            onSelectStop={(s) => {
              setSelectedStopId(s?.id || null);
            }}
            isAddStopMode={isAddStopMode}
            onToggleAddStopMode={() => setIsAddStopMode((prev) => !prev)}
            onMapClickAddStop={handleMapClickAddStop}
            onStopDragEnd={handleStopDragEnd}
            onVertexDragEnd={handleVertexDragEnd}
            onInsertVertex={handleInsertVertex}
            onDeleteVertex={handleDeleteVertex}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveLineCoordinates={handleSaveLineCoordinates}
            onRevertLineCoordinates={handleRevertChanges}
            smoothedCoordinates={smoothedCoordinates}
            previewSmoothedLine={previewSmoothedLine}
            tempPlacementCoord={tempPlacementCoord}
            activeCategory={activeCategory}
          />
        </main>
      </div>

      {/* 2b. MODAL: DELETE CONFIRMATION (in-app, with impact) */}
      {confirmDelete &&
        (() => {
          const targetLine =
            confirmDelete.kind === "line"
              ? allLines.find((l) => l.id === confirmDelete.id)
              : null;
          const stopCount = targetLine
            ? allStops.filter((s) => s.lineId === targetLine.id).length
            : 0;
          const vehicleCount = targetLine
            ? simulatedVehicles.filter((v) => v.lineId === targetLine.id).length
            : 0;
          const requiredCode = targetLine?.code ?? "";
          const canConfirm =
            confirmDelete.kind === "stop" || deleteConfirmText.trim() === requiredCode;
          return (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-label={confirmDelete.kind === "line" ? t.admin.netDeleteLine : t.admin.netDeleteStation}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
              >
                <div className="flex items-center gap-2 text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <h3 className="text-sm font-bold text-white">
                    {confirmDelete.kind === "line" ? t.admin.netDeleteLine : t.admin.netDeleteStation}
                  </h3>
                </div>
                {confirmDelete.kind === "line" && targetLine ? (
                  <div className="space-y-3 text-xs text-slate-300">
                    <p>
                      {t.admin.netDeleteImpactLine
                        .replace("{name}", targetLine.name)
                        .replace("{stops}", String(stopCount))
                        .replace("{vehicles}", String(vehicleCount))
                        .replace("{code}", targetLine.code)}
                    </p>
                    <div>
                      <label htmlFor="delete-confirm-input" className="block text-[11px] text-slate-400 mb-1">
                        {t.admin.netTypeCodeToConfirm.replace("{code}", targetLine.code)}
                      </label>
                      <input
                        id="delete-confirm-input"
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={targetLine.code}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono uppercase"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">
                    {t.admin.netDeleteImpactStop.replace("{name}", confirmDelete.name)}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(null);
                      setDeleteConfirmText("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition btn-tactile"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteTarget}
                    disabled={!canConfirm}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition btn-tactile disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {confirmDelete.kind === "line" ? t.admin.netDeleteLine : t.admin.netDeleteStation}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* 3. MODAL: ADD / EDIT LINE */}
      {isLineModalOpen && editingLine && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingLine.id ? t.admin.netEditLineTitle : t.admin.netCreateLineTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLineModalOpen(false);
                  setEditingLine(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLine} className="space-y-3.5 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLineCode}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.admin.netLineCodePh}
                    value={editingLine.code || ""}
                    onChange={(e) => setEditingLine({ ...editingLine, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLineColor}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingLine.colorHex || "#0284c7"}
                      onChange={(e) => setEditingLine({ ...editingLine, colorHex: e.target.value })}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingLine.colorHex || "#0284c7"}
                      onChange={(e) => setEditingLine({ ...editingLine, colorHex: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLineName}</label>
                <input
                  type="text"
                  required
                  placeholder={t.admin.netLineNamePh}
                  value={editingLine.name || ""}
                  onChange={(e) => setEditingLine({ ...editingLine, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netCategory}</label>
                  <select
                    value={editingLine.category || "RAIL"}
                    onChange={(e) => {
                      const cat = e.target.value as TransitCategory;
                      setEditingLine({
                        ...editingLine,
                        category: cat,
                        mode: MODES_BY_CATEGORY[cat][0],
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  >
                    <option value="RAIL">{t.admin.netCatRail}</option>
                    <option value="BUS">{t.admin.netCatBusRoadway}</option>
                    <option value="AVIATION">{t.admin.netCatAviation}</option>
                    <option value="MARITIME">{t.admin.netCatMaritime}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netTransitMode}</label>
                  {!isCustomMode ? (
                    <select
                      value={editingLine.mode || "MRT_JAKARTA"}
                      onChange={(e) => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomMode(true);
                          setEditingLine({ ...editingLine, mode: "" });
                        } else {
                          setEditingLine({ ...editingLine, mode: e.target.value as TransitMode });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                    >
                      {(MODES_BY_CATEGORY[editingLine.category || "RAIL"] || []).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Custom Transit Mode...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder={t.admin.netCustomModePh}
                        value={editingLine.mode || ""}
                        onChange={(e) =>
                          setEditingLine({
                            ...editingLine,
                            mode: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                          })
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          setEditingLine({
                            ...editingLine,
                            mode: MODES_BY_CATEGORY[editingLine.category || "RAIL"][0] || "MRT_JAKARTA",
                          });
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs whitespace-nowrap btn-tactile"
                        title={t.admin.netBackToPresets}
                      >
                        Presets
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fare System Configuration */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-slate-400">{t.admin.netFareSystem}</label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                    {editingLine.fareType || "PROGRESSIVE_DISTANCE"}
                  </span>
                </div>

                <select
                  value={editingLine.fareType || "PROGRESSIVE_DISTANCE"}
                  onChange={(e) => {
                    const type = e.target.value as FareStructureType;
                    let base = editingLine.baseFareRp ?? 3000;
                    let perKm = editingLine.farePerKmRp ?? 1000;
                    let max = editingLine.maxFareRp ?? 14000;

                    if (type === "FLAT") {
                      base = editingLine.baseFareRp || 3500;
                      perKm = 0;
                      max = base;
                    } else if (type === "FREE_TAP") {
                      base = 0;
                      perKm = 0;
                      max = 0;
                    } else if (type === "PROGRESSIVE_STATION") {
                      base = 3000;
                      perKm = 1000;
                      max = 14000;
                    } else if (type === "PROGRESSIVE_DISTANCE") {
                      base = 3000;
                      perKm = 1000;
                      max = 20000;
                    } else if (type === "DYNAMIC_TIERED") {
                      base = editingLine.baseFareRp || 225000;
                      perKm = 0;
                      max = base;
                    }

                    setEditingLine({
                      ...editingLine,
                      fareType: type,
                      baseFareRp: base,
                      farePerKmRp: perKm,
                      maxFareRp: max,
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                >
                  <option value="FLAT">{t.admin.netFareFlat}</option>
                  <option value="PROGRESSIVE_DISTANCE">{t.admin.netFareDist}</option>
                  <option value="PROGRESSIVE_STATION">{t.admin.netFareStation}</option>
                  <option value="FREE_TAP">{t.admin.netFareSubsidized}</option>
                  <option value="DYNAMIC_TIERED">{t.admin.netFareDynamic}</option>
                </select>
              </div>

              {/* Dynamic Inputs Based on Fare Structure Type */}
              {editingLine.fareType === "FREE_TAP" ? (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    <strong>{t.admin.netFareFree}</strong> Passengers tap card/QR for census and boarding validation without fare deduction.
                  </span>
                </div>
              ) : editingLine.fareType === "FLAT" ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netFareFlatRate}</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editingLine.baseFareRp ?? 3500}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditingLine({ ...editingLine, baseFareRp: val, maxFareRp: val, farePerKmRp: 0 });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Fixed single rate charged upon tap-in or boarding, regardless of distance or stations traveled.
                  </p>
                </div>
              ) : editingLine.fareType === "DYNAMIC_TIERED" ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netFareBase}</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editingLine.baseFareRp ?? 225000}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditingLine({ ...editingLine, baseFareRp: val, maxFareRp: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Base tariff for standard seat class. Premium tiers (Executive, Business, Sleeper) are configured via vehicle cabin classes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {editingLine.fareType === "PROGRESSIVE_STATION" ? "First Station Fare (Rp)" : "Initial Base Fare (Rp)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editingLine.baseFareRp ?? 3000}
                      onChange={(e) => setEditingLine({ ...editingLine, baseFareRp: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {editingLine.fareType === "PROGRESSIVE_STATION" ? "Per Station (Rp)" : "Per Km Rate (Rp)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editingLine.farePerKmRp ?? 1000}
                      onChange={(e) => setEditingLine({ ...editingLine, farePerKmRp: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netFareCap}</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editingLine.maxFareRp ?? 14000}
                      onChange={(e) => setEditingLine({ ...editingLine, maxFareRp: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLineModalOpen(false);
                    setEditingLine(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 btn-tactile"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.admin.netSaveLine}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: ADD / EDIT STOP */}
      {isStopModalOpen && editingStop && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingStop.id ? "Edit Station / Stop" : "Add Station / Stop"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStopModalOpen(false);
                  setEditingStop(null);
                  setTempPlacementCoord(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStop} className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLineAssign}</label>
                <select
                  required
                  value={editingStop.lineId || ""}
                  onChange={(e) => setEditingStop({ ...editingStop, lineId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                >
                  {allLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      [{l.code}] {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netStopName}</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={t.admin.netStopNamePh}
                    value={editingStop.name || ""}
                    onChange={(e) => setEditingStop({ ...editingStop, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netStopCode}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.admin.netStopCodePh}
                    value={editingStop.code || ""}
                    onChange={(e) => setEditingStop({ ...editingStop, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLat}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingStop.latitude ?? -6.2}
                    onChange={(e) => setEditingStop({ ...editingStop, latitude: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netLon}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingStop.longitude ?? 106.816666}
                    onChange={(e) => setEditingStop({ ...editingStop, longitude: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netSequence}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingStop.sequence ?? 1}
                    onChange={(e) => setEditingStop({ ...editingStop, sequence: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              {/* Station Typology & Scale */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netTypology}</label>
                  <select
                    value={editingStop.stationType || "RAIL_STATION"}
                    onChange={(e) =>
                      setEditingStop({ ...editingStop, stationType: e.target.value as StationType })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  >
                    <option value="TOD">TOD - {t.admin.typoDescTod}</option>
                    <option value="RAIL_STATION">RAIL_STATION - {t.admin.typoDescRail}</option>
                    <option value="BUS_TERMINAL">BUS_TERMINAL - {t.admin.typoDescBusTerm}</option>
                    <option value="AIRPORT_TERMINAL">AIRPORT_TERMINAL - {t.admin.typoDescAirport}</option>
                    <option value="HARBOR_PORT">HARBOR_PORT - {t.admin.typoDescHarbor}</option>
                    <option value="BUS_SHELTER">BUS_SHELTER - {t.admin.typoDescShelter}</option>
                    <option value="BUS_POLE">BUS_POLE - {t.admin.typoDescPole}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t.admin.netScale}</label>
                  <select
                    value={editingStop.scale || "MEDIUM"}
                    onChange={(e) =>
                      setEditingStop({ ...editingStop, scale: e.target.value as StationScale })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  >
                    <option value="SMALL">SMALL - {t.admin.scaleDescSmall}</option>
                    <option value="MEDIUM">MEDIUM - {t.admin.scaleDescMedium}</option>
                    <option value="BIG">BIG - {t.admin.scaleDescBig}</option>
                  </select>
                </div>
              </div>

              {/* Accessibility Matrix */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Accessibility className="w-3.5 h-3.5" />
                  <span>{t.admin.netAccessibility}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.isInterchange)}
                      onChange={(e) => setEditingStop({ ...editingStop, isInterchange: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>{t.admin.netInterchange}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.accessibleElevator)}
                      onChange={(e) => setEditingStop({ ...editingStop, accessibleElevator: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>{t.admin.netElevator}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.wheelchairRamp)}
                      onChange={(e) => setEditingStop({ ...editingStop, wheelchairRamp: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>{t.admin.netRamp}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.tactilePaving)}
                      onChange={(e) => setEditingStop({ ...editingStop, tactilePaving: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>{t.admin.netTactile}</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStopModalOpen(false);
                    setEditingStop(null);
                    setTempPlacementCoord(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 btn-tactile"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.admin.netSaveStop}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
