/**
 * PlatformI - Network & Map Studio Interactive Cartography Canvas
 *
 * Dedicated Leaflet map editor for transit network infrastructure:
 * - Click-to-place station/stop placement with crosshair capture.
 * - Draggable station pins for sub-meter geofence calibration.
 * - Real-time Catmull-Rom spline curve visualization and raw polyline vertex editing.
 * - Responsive glass HUD controls with basemap switcher and line zoom fit.
 *
 * Rules: SSR-safe client-only, zero placeholder stubs, zero emojis, strict TypeScript (no 'any').
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { Line, Stop, TransitCategory } from "@/types/transit";
import { TILE_LAYERS, JAKARTA_MAP_CENTER, JAKARTA_DEFAULT_ZOOM } from "@/lib/constants/modes";
import { TileLayerId } from "@/lib/stores/useTransitStore";
import {
  Layers,
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  MapPin,
  Spline,
} from "lucide-react";

export interface NetworkMapCanvasProps {
  lines: Line[];
  stops: Stop[];
  selectedLine: Line | null;
  selectedStop: Stop | null;
  onSelectLine: (line: Line) => void;
  onSelectStop: (stop: Stop | null) => void;
  isAddStopMode: boolean;
  onMapClickAddStop: (lat: number, lng: number) => void;
  onStopDragEnd: (stopId: string, lat: number, lng: number) => void;
  smoothedCoordinates: [number, number][] | null;
  previewSmoothedLine: boolean;
  tempPlacementCoord: [number, number] | null;
  activeCategory: TransitCategory | "ALL";
}

export function NetworkMapCanvas({
  lines,
  stops,
  selectedLine,
  selectedStop,
  onSelectLine,
  onSelectStop,
  isAddStopMode,
  onMapClickAddStop,
  onStopDragEnd,
  smoothedCoordinates,
  previewSmoothedLine,
  tempPlacementCoord,
  activeCategory,
}: NetworkMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Separate layer groups for clean lifecycle management
  const linesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const stopsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const smoothedLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerId>("dark");
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: JAKARTA_MAP_CENTER,
      zoom: JAKARTA_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      minZoom: 8,
      maxZoom: 18,
    });

    const tileConfig = TILE_LAYERS.dark;
    const initialTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains,
      attribution: tileConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = initialTileLayer;

    // Create persistent layer groups
    linesLayerGroupRef.current = L.layerGroup().addTo(map);
    stopsLayerGroupRef.current = L.layerGroup().addTo(map);
    smoothedLayerGroupRef.current = L.layerGroup().addTo(map);
    tempMarkerLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      setCursorCoords([e.latlng.lat, e.latlng.lng]);
    };

    map.on("mousemove", handleMouseMove);

    return () => {
      map.off("mousemove", handleMouseMove);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      linesLayerGroupRef.current = null;
      stopsLayerGroupRef.current = null;
      smoothedLayerGroupRef.current = null;
      tempMarkerLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 2. Basemap Switcher
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const tileConfig = TILE_LAYERS[activeTileLayer];
    if (!tileConfig) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const newTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains,
      attribution: tileConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeTileLayer]);

  // 3. Map Click Handling for Stop Placement
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddStopMode) {
        onMapClickAddStop(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [isAddStopMode, onMapClickAddStop]);

  // 4. Temporary Placement Marker
  useEffect(() => {
    if (!tempMarkerLayerRef.current) return;
    const group = tempMarkerLayerRef.current;
    group.clearLayers();

    if (tempPlacementCoord) {
      const pinIcon = L.divIcon({
        className: "temp-placement-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-ping"></span>
            <span class="w-6 h-6 rounded-full bg-cyan-500 border-2 border-white shadow-xl flex items-center justify-center text-cyan-950 font-bold text-[10px]">
              +
            </span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(tempPlacementCoord, { icon: pinIcon });
      marker.bindTooltip(
        `<div class="font-sans text-xs font-semibold px-1">Selected Location: ${tempPlacementCoord[0].toFixed(5)}, ${tempPlacementCoord[1].toFixed(5)}</div>`,
        { permanent: true, direction: "top", offset: [0, -12] }
      );
      marker.addTo(group);
    }
  }, [tempPlacementCoord]);

  // 5. Render Transit Lines Polylines
  useEffect(() => {
    if (!linesLayerGroupRef.current) return;
    const group = linesLayerGroupRef.current;
    group.clearLayers();

    const filteredLines = lines.filter((l) =>
      activeCategory === "ALL" ? true : l.category === activeCategory
    );

    filteredLines.forEach((line) => {
      if (!line.polylineCoordinates || line.polylineCoordinates.length < 2) return;

      const isSelected = selectedLine?.id === line.id;
      const latLngs: [number, number][] = line.polylineCoordinates.map((c) => [
        c.latitude,
        c.longitude,
      ]);

      // Draw background glow if selected
      if (isSelected) {
        const glowPolyline = L.polyline(latLngs, {
          color: "#06b6d4",
          weight: 9,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        });
        glowPolyline.addTo(group);
      }

      const polyline = L.polyline(latLngs, {
        color: line.colorHex || "#06b6d4",
        weight: isSelected ? 5 : 2.5,
        opacity: isSelected ? 0.95 : 0.4,
        lineCap: "round",
        lineJoin: "round",
        dashArray: isSelected ? undefined : "4, 6",
      });

      polyline.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectLine(line);
      });

      polyline.bindTooltip(
        `<div class="font-sans text-xs"><strong>${line.code}</strong> - ${line.name}</div>`,
        { sticky: true }
      );

      polyline.addTo(group);

      // If line is selected, draw vertex handles along the raw line
      if (isSelected && !previewSmoothedLine) {
        latLngs.forEach((coord, idx) => {
          const vertexIcon = L.divIcon({
            className: "vertex-handle",
            html: `
              <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white shadow hover:scale-125 transition"></div>
            `,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          const vertexMarker = L.marker(coord, { icon: vertexIcon });
          vertexMarker.bindTooltip(
            `<div class="text-[10px] font-mono">Vertex ${idx + 1}: ${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}</div>`,
            { direction: "top", offset: [0, -6] }
          );
          vertexMarker.addTo(group);
        });
      }
    });
  }, [lines, selectedLine, activeCategory, onSelectLine, previewSmoothedLine]);

  // 6. Render Smoothed Catmull-Rom Curve Overlay
  useEffect(() => {
    if (!smoothedLayerGroupRef.current) return;
    const group = smoothedLayerGroupRef.current;
    group.clearLayers();

    if (previewSmoothedLine && smoothedCoordinates && smoothedCoordinates.length >= 2) {
      // Glow underlay
      const glow = L.polyline(smoothedCoordinates, {
        color: "#10b981",
        weight: 8,
        opacity: 0.4,
        lineCap: "round",
        lineJoin: "round",
      });
      glow.addTo(group);

      // Primary smoothed spline polyline
      const smoothCurve = L.polyline(smoothedCoordinates, {
        color: "#10b981",
        weight: 4.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      });

      smoothCurve.bindTooltip(
        `<div class="font-sans text-xs text-emerald-300 font-semibold px-1">
          Catmull-Rom Spline Curve (${smoothedCoordinates.length} nodes)
        </div>`,
        { permanent: true, sticky: true }
      );

      smoothCurve.addTo(group);
    }
  }, [previewSmoothedLine, smoothedCoordinates]);

  // 7. Render Station / Stop Markers
  useEffect(() => {
    if (!stopsLayerGroupRef.current) return;
    const group = stopsLayerGroupRef.current;
    group.clearLayers();

    // If a line is selected, show its stops with sequence numbers.
    // Also show any other stops in subtle format.
    const relevantStops = selectedLine
      ? stops.filter((s) => s.lineId === selectedLine.id)
      : stops;

    relevantStops.forEach((stop) => {
      const isSelected = selectedStop?.id === stop.id;
      const isLineStop = selectedLine ? stop.lineId === selectedLine.id : true;
      const primaryColor = selectedLine?.colorHex || "#06b6d4";

      const stopIcon = L.divIcon({
        className: "station-editor-marker",
        html: `
          <div class="relative flex items-center justify-center group cursor-pointer">
            ${
              isSelected
                ? `<span class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-ping"></span>`
                : ""
            }
            <div
              style="background-color: ${isSelected ? "#06b6d4" : primaryColor};"
              class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-mono font-bold transition group-hover:scale-125"
            >
              ${stop.sequence || ""}
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-slate-950/90 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/20 z-50 pointer-events-none">
              ${stop.name} (${stop.code})
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: stopIcon,
        draggable: isLineStop, // Can drag stops of the active line to adjust coordinates
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectStop(stop);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onStopDragEnd(stop.id, pos.lat, pos.lng);
      });

      marker.bindTooltip(
        `<div class="font-sans text-xs">
          <div class="font-bold text-white">${stop.name}</div>
          <div class="text-[10px] text-slate-300 font-mono">Code: ${stop.code} &bull; Seq: #${stop.sequence}</div>
          <div class="text-[10px] text-cyan-300 mt-0.5">Drag marker to calibrate coordinates</div>
        </div>`,
        { direction: "top", offset: [0, -12] }
      );

      marker.addTo(group);
    });
  }, [stops, selectedLine, selectedStop, onSelectStop, onStopDragEnd]);

  // Fit view to selected line bounds
  const handleFitToLine = useCallback(() => {
    if (!mapInstanceRef.current || !selectedLine || !selectedLine.polylineCoordinates) return;
    if (selectedLine.polylineCoordinates.length === 0) return;

    const latLngs: [number, number][] = selectedLine.polylineCoordinates.map((c) => [
      c.latitude,
      c.longitude,
    ]);
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }, [selectedLine]);

  // Auto-fit on selected line change
  useEffect(() => {
    if (selectedLine) {
      handleFitToLine();
    }
  }, [selectedLine?.id, handleFitToLine]);

  return (
    <div
      className={`relative w-full h-full min-h-[500px] flex-1 bg-[#090d16] overflow-hidden select-none ${
        isAddStopMode ? "cursor-crosshair" : ""
      }`}
    >
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full leaflet-container" />

      {/* Floating HUD: Crosshair Placement Banner */}
      {isAddStopMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-full bg-cyan-950/95 border border-cyan-400/50 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs text-cyan-200 font-semibold animate-pulse motion-reduce:animate-none">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span>Click anywhere on map to calibrate station latitude & longitude</span>
        </div>
      )}

      {/* Floating HUD: Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {/* Basemap Switcher */}
        <div className="p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-md flex flex-col gap-1">
          <button
            type="button"
            onClick={() =>
              setActiveTileLayer((prev) =>
                prev === "dark" ? "streets" : prev === "streets" ? "satellite" : "dark"
              )
            }
            title="Toggle Basemap (Dark / Streets / Satellite)"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition btn-tactile"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Fit */}
        <div className="p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-xl backdrop-blur-md flex flex-col gap-1">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom In"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition btn-tactile"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom Out"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition btn-tactile"
          >
            <Minus className="w-4 h-4" />
          </button>
          {selectedLine && (
            <button
              type="button"
              onClick={handleFitToLine}
              title="Fit View to Line Extent"
              className="p-2 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition btn-tactile"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating HUD: Geodetic Telemetry Coordinates Bar (Bottom) */}
      <div className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-3 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {cursorCoords
              ? `${cursorCoords[0].toFixed(5)}°, ${cursorCoords[1].toFixed(5)}°`
              : "Move cursor over map"}
          </span>
        </div>

        {selectedLine && (
          <>
            <span className="text-slate-600">&bull;</span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedLine.colorHex }}
              />
              <span className="text-slate-200 font-semibold">{selectedLine.code}</span>
              <span className="text-slate-500">({selectedLine.polylineCoordinates.length} vertices)</span>
            </div>
          </>
        )}

        {previewSmoothedLine && (
          <>
            <span className="text-slate-600">&bull;</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Spline className="w-3.5 h-3.5" />
              <span>Spline Curvature Active</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
