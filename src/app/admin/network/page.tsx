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
import { Line, Stop, TransitCategory, TransitMode, FareStructureType, Coordinate } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
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

const CATEGORIES: { id: TransitCategory | "ALL"; label: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "All Modes", icon: <Route className="w-3.5 h-3.5" /> },
  { id: "RAIL", label: "Rail", icon: <Train className="w-3.5 h-3.5" /> },
  { id: "BUS", label: "Bus & Road", icon: <Bus className="w-3.5 h-3.5" /> },
  { id: "AVIATION", label: "Aviation", icon: <Plane className="w-3.5 h-3.5" /> },
  { id: "MARITIME", label: "Maritime", icon: <Anchor className="w-3.5 h-3.5" /> },
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
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const fetchNetworkData = useTransitStore((state) => state.fetchNetworkData);
  const upsertLine = useTransitStore((state) => state.upsertLine);
  const upsertStop = useTransitStore((state) => state.upsertStop);
  const removeLineFromStore = useTransitStore((state) => state.removeLine);
  const removeStopFromStore = useTransitStore((state) => state.removeStop);

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
  const [editingLine, setEditingLine] = useState<Partial<Line> | null>(null);
  const [editingStop, setEditingStop] = useState<Partial<Stop> | null>(null);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
    setStatusMessage({ type: "success", text: "Network database synced successfully." });
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
      });
      setIsStopModalOpen(true);
      setStatusMessage({
        type: "success",
        text: `Point selected: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°. Enter station name and save.`,
      });
    },
    [selectedLine, allLines, lineStops.length]
  );

  // 2. Marker Drag End Callback for Calibrating Coordinates
  const handleStopDragEnd = useCallback(
    async (stopId: string, lat: number, lng: number) => {
      const existing = allStops.find((s) => s.id === stopId);
      if (!existing) return;

      const updatedStop: Stop = {
        ...existing,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };

      upsertStop(updatedStop);

      try {
        const res = await fetch("/api/network/stops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedStop),
        });
        if (!res.ok) throw new Error("Failed to calibrate coordinates in database");
        setStatusMessage({
          type: "success",
          text: `Calibrated coordinates for ${existing.name} (${lat.toFixed(5)}°, ${lng.toFixed(5)}°).`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Update failed";
        setStatusMessage({ type: "error", text: msg });
      }
    },
    [allStops, upsertStop]
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
        text: `Vertex #${vertexIndex + 1} moved. Click 'Save to DB' to persist or 'Revert' to discard.`,
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
        text: `Inserted vertex at (${lat.toFixed(5)}°, ${lng.toFixed(5)}°). Drag to shape curve.`,
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
          text: "A transit line requires at least 2 coordinate vertices.",
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
        text: `Deleted vertex #${vertexIndex + 1}.`,
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
      text: `Reverted changes for ${selectedLine.code} to saved database state.`,
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
        text: `Persisted ${savedData.polylineCoordinates.length} vertices for ${savedData.code} to database.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
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
        text: "Line does not have enough coordinates to simplify.",
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
      text: `Simplified route from ${initialCount} to ${simplified.length} vertices. Click 'Save to DB' to persist.`,
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
        text: `Applied Catmull-Rom spline to ${selectedLine.name} (${smoothedCoordinates.length} nodes persisted).`,
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
        text: "At least 2 stations/stops are required to build a route path.",
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
      text: `Generated smoothed curve path connecting all ${lineStops.length} stations. Click 'Apply to DB' to save.`,
    });
  };

  // 3c. Snap Route to Road Network via OSRM
  const handleSnapToRoads = async () => {
    if (!selectedLine || selectedLine.polylineCoordinates.length < 2) {
      setStatusMessage({
        type: "error",
        text: "Line has no coordinates to snap to road network.",
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
        text: `Snapped ${snapped.length} roadway nodes to physical street alignments. Click 'Apply to DB' to save.`,
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: "Failed to query road network geometry.",
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
      text: `Exported ${selectedLine.code} GeoJSON to downloads.`,
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
          text: `Imported ${parsed.polylineCoordinates.length} vertices and ${parsed.stops.length} stations from GeoJSON.`,
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
        text: `Line ${savedLine.code} (${savedLine.name}) successfully saved.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // 5. Delete Line
  const handleDeleteLine = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete line "${name}"?`)) return;

    try {
      const res = await fetch(`/api/network/lines?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete line");

      removeLineFromStore(id);
      if (selectedLineId === id) setSelectedLineId(null);
      setStatusMessage({ type: "success", text: `Line "${name}" deleted.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setStatusMessage({ type: "error", text: msg });
    }
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
        text: `Stop ${savedStop.code} (${savedStop.name}) saved successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // 7. Delete Stop
  const handleDeleteStop = async (id: string, name: string) => {
    if (!window.confirm(`Delete station "${name}" from network?`)) return;

    try {
      const res = await fetch(`/api/network/stops?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete stop");

      removeStopFromStore(id);
      if (selectedStopId === id) setSelectedStopId(null);
      setStatusMessage({ type: "success", text: `Station "${name}" deleted.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // 8. Reorder Stop Sequence
  const handleMoveStopSequence = async (stopId: string, direction: "up" | "down") => {
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

    try {
      await Promise.all([
        fetch("/api/network/stops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCurrent),
        }),
        fetch("/api/network/stops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSwap),
        }),
      ]);
      setStatusMessage({ type: "success", text: "Station sequence updated." });
    } catch {
      setStatusMessage({ type: "error", text: "Failed to persist sequence update." });
    }
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
              <h1 className="text-sm font-bold text-white tracking-tight">Network & Map Studio</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                GIS OCC
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {allLines.length} Transit Lines &bull; {allStops.length} Mapped Stations & Bus Stops
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
            title="Sync latest network data from SQLite database"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition btn-tactile min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync DB</span>
          </button>

          <button
            type="button"
            onClick={() => {
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
            <span>New Line</span>
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
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Line Input */}
          <div className="p-3 border-b border-white/10 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Search transit lines or codes..."
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
                        setEditingLine(selectedLine);
                        setIsLineModalOpen(true);
                      }}
                      title="Edit Line Specs"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(selectedLine.id, selectedLine.name)}
                      title="Delete Line"
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
                      title="Close Inspector"
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
                      <span className="truncate">Unsaved path edits detected</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSaveLineCoordinates}
                        disabled={isSavingCurve}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow btn-tactile"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save to DB</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRevertChanges}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-white/10 btn-tactile"
                        title="Discard all unsaved edits and restore database coordinates"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Spline Smoothing Geometry Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Spline className="w-4 h-4" />
                      <span>Catmull-Rom Spline Curvature</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Centripetal (α=0.5)</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Eliminate angular straight line segments. Densifies polyline nodes into smooth
                    cartographic curves matching authentic physical rail track & roadway alignments.
                  </p>

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
                          <span>Hide Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Smooth Curves</span>
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
                      title="Generate curved track path connecting all stations in sequence"
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Wand2 className="w-3 h-3 text-cyan-400" />
                      <span>Build from Stops</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimplifyLine}
                      title="Reduce vertex clutter using Douglas-Peucker algorithm while preserving track shape"
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Scissors className="w-3 h-3 text-rose-400" />
                      <span>Simplify Path</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSnapToRoads}
                      disabled={isSnappingRoads}
                      title="Snap polyline nodes to physical road centerlines"
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Compass className={`w-3 h-3 text-amber-400 ${isSnappingRoads ? "animate-spin" : ""}`} />
                      <span>{isSnappingRoads ? "Snapping..." : "Snap to Roads"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportGeoJSON}
                      title="Export route and stations to standard RFC 7946 GeoJSON"
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Export GeoJSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Import GeoJSON file (.geojson / .json)"
                      className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition btn-tactile"
                    >
                      <Upload className="w-3 h-3 text-indigo-400" />
                      <span>Import GeoJSON</span>
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
                        <span>{isAddStopMode ? "Click Map..." : "Click to Place"}</span>
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
                          });
                          setIsStopModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Stop</span>
                      </button>
                    </div>
                  </div>

                  {lineStops.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center text-xs text-slate-400">
                      No stations or stops mapped to this line yet. Use &ldquo;Click to Place&rdquo; on the map to add stops.
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
                                <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                                  <span>{stop.name}</span>
                                  {stop.isInterchange && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-mono">
                                      HUB
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
                                title="Move Earlier in Sequence"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white transition"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={index === lineStops.length - 1}
                                onClick={() => handleMoveStopSequence(stop.id, "down")}
                                title="Move Later in Sequence"
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
                                title="Edit Station"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStop(stop.id, stop.name)}
                                title="Delete Station"
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

      {/* 3. MODAL: ADD / EDIT LINE */}
      {isLineModalOpen && editingLine && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingLine.id ? "Edit Transit Line" : "Create New Transit Line"}
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
                  <label className="block text-[11px] text-slate-400 mb-1">Line Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M-01, TJ-14"
                    value={editingLine.code || ""}
                    onChange={(e) => setEditingLine({ ...editingLine, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Line Brand Color *</label>
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
                <label className="block text-[11px] text-slate-400 mb-1">Line Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRT North-South Line, TransJakarta Corridor 14"
                  value={editingLine.name || ""}
                  onChange={(e) => setEditingLine({ ...editingLine, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Category</label>
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
                    <option value="RAIL">Rail</option>
                    <option value="BUS">Bus & Roadway</option>
                    <option value="AVIATION">Aviation</option>
                    <option value="MARITIME">Maritime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mode</label>
                  <select
                    value={editingLine.mode || "MRT_JAKARTA"}
                    onChange={(e) => setEditingLine({ ...editingLine, mode: e.target.value as TransitMode })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  >
                    {(MODES_BY_CATEGORY[editingLine.category || "RAIL"] || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Base Fare (Rp)</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Fare Per Km (Rp)</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Max Fare (Rp)</label>
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
                  <span>Save Line</span>
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
                <label className="block text-[11px] text-slate-400 mb-1">Line Assignment *</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Stop Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Bundaran HI"
                    value={editingStop.name || ""}
                    onChange={(e) => setEditingStop({ ...editingStop, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Stop Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BHI"
                    value={editingStop.code || ""}
                    onChange={(e) => setEditingStop({ ...editingStop, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Latitude *</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Longitude *</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Sequence #</label>
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

              {/* Accessibility Matrix */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Accessibility className="w-3.5 h-3.5" />
                  <span>Accessibility & Interchange</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.isInterchange)}
                      onChange={(e) => setEditingStop({ ...editingStop, isInterchange: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>Interchange Hub</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.accessibleElevator)}
                      onChange={(e) => setEditingStop({ ...editingStop, accessibleElevator: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>Priority Elevator</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.wheelchairRamp)}
                      onChange={(e) => setEditingStop({ ...editingStop, wheelchairRamp: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>Wheelchair Ramp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStop.tactilePaving)}
                      onChange={(e) => setEditingStop({ ...editingStop, tactilePaving: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-cyan-500"
                    />
                    <span>Tactile Paving</span>
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
                  <span>Save Stop</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
