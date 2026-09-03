/**
 * PlatformI - Route Polyline Vector Layer
 * Renders interactive multimodal transit polylines with brand colors,
 * hover glow states, and interactive route selection tooltips.
 * High-volume consolidated modes (AKAP, Shuttles, Air, Sea) are rendered conditionally
 * on vehicle/line selection to avoid map clutter.
 *
 * Rules: Zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { Line, TransitMode } from "@/types/transit";

interface RoutePolylineLayerProps {
  map: L.Map | null;
}

// Modes with hundreds/thousands of dynamic routes that should only draw when active/selected
const HIGH_VOLUME_CONSOLIDATED_MODES = new Set<TransitMode>([
  "AKAP_INTERCITY_BUS",
  "EXECUTIVE_SHUTTLE",
  "AIRPORT_COMMERCIAL",
  "MARITIME_SPEEDBOAT",
  "MARITIME_PELNI",
]);

export function RoutePolylineLayer({ map }: RoutePolylineLayerProps) {
  const allLines = useTransitStore((state) => state.allLines);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectedLineId = useTransitStore((state) => state.selectedLineId);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const activeVehicleLineId = useTransitStore((state) =>
    state.selectedVehicleId
      ? state.simulatedVehicles.find((v) => v.id === state.selectedVehicleId)?.lineId
      : null
  );
  const hoveredEntity = useTransitStore((state) => state.hoveredEntity);
  const plannedJourney = useTransitStore((state) => state.plannedJourney);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setHoveredEntity = useTransitStore((state) => state.setHoveredEntity);

  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize LayerGroup
  useEffect(() => {
    if (!map) return;
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      layerGroup.clearLayers();
      layerGroup.remove();
      layerGroupRef.current = null;
    };
  }, [map]);

  // Render Polylines
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    for (const line of allLines) {
      // 1. Filter out unselected transit modes
      if (!selectedModes.includes(line.mode)) {
        continue;
      }

      const isLineExplicitlySelected = selectedLineId === line.id;
      const isVehicleOnThisLineSelected = activeVehicleLineId === line.id;
      const isHovered = hoveredEntity?.type === "line" && hoveredEntity?.id === line.id;

      // 2. High-volume modes: only render when explicitly selected, hovered, or active vehicle on it
      if (HIGH_VOLUME_CONSOLIDATED_MODES.has(line.mode)) {
        if (!isLineExplicitlySelected && !isVehicleOnThisLineSelected && !isHovered) {
          continue;
        }
      }

      const coords: L.LatLngExpression[] = line.polylineCoordinates.map((c) => [
        c.latitude,
        c.longitude,
      ]);

      if (coords.length < 2) continue;

      const modeConfig = TRANSIT_MODE_CONFIG[line.mode];
      const isSelected = isLineExplicitlySelected || isVehicleOnThisLineSelected;
      const isCandidateLine = plannedJourney?.candidateLines.some((l) => l.id === line.id);
      const isDimmed = !!plannedJourney && !isCandidateLine && !isSelected && !isHovered;

      // Dash pattern for aviation and maritime
      let dashArray: string | undefined = undefined;
      if (line.category === "AVIATION") {
        dashArray = "6, 8";
      } else if (line.category === "MARITIME") {
        dashArray = "8, 6";
      }

      // Outer glow for selected line
      if (isSelected) {
        const glowPolyline = L.polyline(coords, {
          color: line.colorHex,
          weight: 10,
          opacity: 0.4,
          lineCap: "round",
          lineJoin: "round",
        });
        glowPolyline.addTo(layerGroup);
      }

      // Main route polyline
      const polyline = L.polyline(coords, {
        color: line.colorHex,
        weight: isSelected ? 6 : isHovered ? 5 : isDimmed ? 2 : 3.5,
        opacity: isSelected ? 1.0 : isHovered ? 0.95 : isDimmed ? 0.2 : 0.75,
        lineCap: "round",
        lineJoin: "round",
        dashArray,
      });

      // Tooltip content
      const tooltipContent = `
        <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: #f1f5f9; font-family: sans-serif; min-width: 180px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 13px; color: #ffffff;">${line.name}</span>
            <span style="background: ${line.colorHex}; color: ${line.textColorHex}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${line.code}</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 2px;">
            <div>Operator: <span style="color: #cbd5e1;">${modeConfig?.operator || "Dishub DKI"}</span></div>
            <div>Jadwal: <span style="color: #e2e8f0; font-family: monospace;">${line.firstDeparture} - ${line.lastDeparture}</span> &bull; Antara: <span style="color: #38bdf8; font-family: monospace;">${line.headwayMinutes} mnt</span></div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); color: #10b981; font-weight: 600;">
              ${modeConfig?.fareDescription || `Rp ${line.baseFareRp.toLocaleString()}`}
            </div>
          </div>
        </div>
      `;

      polyline.bindTooltip(tooltipContent, {
        sticky: true,
        direction: "auto",
        className: "custom-transit-tooltip",
      });

      // Interactive event handlers
      polyline.on("mouseover", () => {
        polyline.setStyle({
          weight: isSelected ? 7 : 5.5,
          opacity: 1.0,
        });
        setHoveredEntity({ type: "line", id: line.id });
      });

      polyline.on("mouseout", () => {
        polyline.setStyle({
          weight: isSelected ? 6 : 3.5,
          opacity: isSelected ? 1.0 : 0.75,
        });
        setHoveredEntity(null);
      });

      polyline.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectLine(line.id);
      });

      polyline.addTo(layerGroup);
    }
  }, [
    map,
    allLines,
    selectedModes,
    selectedLineId,
    selectedVehicleId,
    activeVehicleLineId,
    hoveredEntity,
    plannedJourney,
    selectLine,
    setHoveredEntity,
  ]);

  return null;
}
