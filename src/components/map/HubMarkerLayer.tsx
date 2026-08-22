/**
 * PlatformI - Multimodal Interchange Hub Marker Layer
 * Renders smart hub beacons, interchange clusters, pulsing locator rings,
 * and accessibility status for major Jakarta & Bodetabek transit stations.
 *
 * Rules: Zero raw emojis, strict Lucide SVG iconography, strict TypeScript.
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { Stop } from "@/types/transit";

interface HubMarkerLayerProps {
  map: L.Map | null;
}

export function HubMarkerLayer({ map }: HubMarkerLayerProps) {
  const allStops = useTransitStore((state) => state.allStops);
  const allLines = useTransitStore((state) => state.allLines);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectedStopId = useTransitStore((state) => state.selectedStopId);
  const selectStop = useTransitStore((state) => state.selectStop);
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

  // Render Hub Markers
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // Find all relevant stops to render:
    // 1. All interchange hubs
    // 2. All stops belonging to active lines whose mode is currently selected
    const activeLineIds = new Set(
      allLines.filter((l) => selectedModes.includes(l.mode)).map((l) => l.id)
    );

    const visibleStops = allStops.filter((stop) => {
      if (stop.isInterchange) return true;
      return activeLineIds.has(stop.lineId);
    });

    for (const stop of visibleStops) {
      const isSelected = selectedStopId === stop.id;
      const isHub = stop.isInterchange || (stop.connectedLineIds && stop.connectedLineIds.length > 0);
      const parentLine = allLines.find((l) => l.id === stop.lineId);
      const lineConfig = parentLine ? TRANSIT_MODE_CONFIG[parentLine.mode] : null;
      const primaryColor = parentLine?.colorHex || "#38bdf8";

      // Connecting lines badges HTML
      const connectedBadges = (stop.connectedLineIds || [])
        .map((cLineId) => {
          const cLine = allLines.find((l) => l.id === cLineId);
          if (!cLine) return "";
          return `<span style="background: ${cLine.colorHex}; color: ${cLine.textColorHex}; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; font-family: monospace;">${cLine.code}</span>`;
        })
        .join(" ");

      // Marker Icon HTML with CSS Pulse & Badges
      const markerHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isHub
              ? `<div class="hub-pulse-ring" style="position: absolute; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${primaryColor}; background: ${primaryColor}22;"></div>`
              : ""
          }
          <div style="
            width: ${isHub ? "22px" : "14px"};
            height: ${isHub ? "22px" : "14px"};
            border-radius: 50%;
            background: #0f172a;
            border: ${isSelected ? "3px solid #38bdf8" : `2px solid ${primaryColor}`};
            box-shadow: ${isSelected ? "0 0 14px #38bdf8" : "0 2px 8px rgba(0,0,0,0.6)"};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
          ">
            <div style="
              width: ${isHub ? "8px" : "6px"};
              height: ${isHub ? "8px" : "6px"};
              border-radius: 50%;
              background: ${primaryColor};
            "></div>
          </div>
          ${
            isHub && stop.connectedLineIds && stop.connectedLineIds.length > 0
              ? `<div style="
                  position: absolute;
                  top: -4px;
                  right: -4px;
                  background: #0284c7;
                  color: #ffffff;
                  font-size: 8px;
                  font-weight: 800;
                  font-family: monospace;
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 1px solid rgba(255,255,255,0.4);
                ">+${stop.connectedLineIds.length}</div>`
              : ""
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-hub-div-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 500 : isHub ? 200 : 100,
      });

      // Glass Popup Content
      const popupHtml = `
        <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #f1f5f9; font-family: sans-serif; min-width: 220px; box-shadow: 0 15px 30px rgba(0,0,0,0.6);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #ffffff; line-height: 1.2;">${stop.name}</div>
              <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 2px;">CODE: ${stop.code}</div>
            </div>
            ${
              isHub
                ? `<span style="background: rgba(6,182,212,0.2); border: 1px solid rgba(6,182,212,0.4); color: #38bdf8; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 9999px;">INTERCHANGE</span>`
                : ""
            }
          </div>

          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
            Platform: <span style="color: #f8fafc; font-weight: 500;">${stop.platformType || "Standard Platform"}</span>
          </div>

          ${
            stop.connectedLineIds && stop.connectedLineIds.length > 0
              ? `<div style="margin-bottom: 8px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px;">Connecting Networks:</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 3px;">${connectedBadges}</div>
                </div>`
              : ""
          }

          <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; color: #94a3b8;">
            <span>Elevator: <strong style="color: ${stop.accessibleElevator ? "#10b981" : "#64748b"}">${stop.accessibleElevator ? "Yes" : "No"}</strong></span>
            <span>&bull;</span>
            <span>Tactile: <strong style="color: ${stop.tactilePaving ? "#10b981" : "#64748b"}">${stop.tactilePaving ? "Yes" : "No"}</strong></span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "custom-glass-popup",
        closeButton: false,
      });

      marker.on("mouseover", () => {
        setHoveredEntity({ type: "stop", id: stop.id });
      });

      marker.on("mouseout", () => {
        setHoveredEntity(null);
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectStop(stop.id);
      });

      marker.addTo(layerGroup);
    }
  }, [
    map,
    allStops,
    allLines,
    selectedModes,
    selectedStopId,
    selectStop,
    setHoveredEntity,
  ]);

  return null;
}
