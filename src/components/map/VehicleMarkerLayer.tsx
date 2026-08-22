/**
 * PlatformI - Real-Time Simulated Vehicle Marker Layer
 * Renders live GTFS-RT style directional vehicle markers with hardware-accelerated
 * heading rotation, speed badges, crowd density status, and interactive vehicle telemetry inspection.
 *
 * Rules: Zero emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { Vehicle, CrowdDensityLevel } from "@/types/transit";

interface VehicleMarkerLayerProps {
  map: L.Map | null;
}

function getCrowdColor(level: CrowdDensityLevel): string {
  switch (level) {
    case "LEVEL_1_MANY_SEATS":
      return "#10b981"; // Emerald
    case "LEVEL_2_FEW_SEATS":
      return "#f59e0b"; // Amber
    case "LEVEL_3_STANDING_ONLY":
      return "#f97316"; // Orange
    case "LEVEL_4_FULL_CRUSH":
      return "#f43f5e"; // Rose
    default:
      return "#10b981";
  }
}

function getCrowdLabel(level: CrowdDensityLevel): string {
  switch (level) {
    case "LEVEL_1_MANY_SEATS":
      return "Seats Available";
    case "LEVEL_2_FEW_SEATS":
      return "Few Seats";
    case "LEVEL_3_STANDING_ONLY":
      return "Standing Only";
    case "LEVEL_4_FULL_CRUSH":
      return "Full Crush Load";
    default:
      return "Normal";
  }
}

export function VehicleMarkerLayer({ map }: VehicleMarkerLayerProps) {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const allStops = useTransitStore((state) => state.allStops);
  const selectVehicle = useTransitStore((state) => state.selectVehicle);
  const setHoveredEntity = useTransitStore((state) => state.setHoveredEntity);

  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
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
      markerMapRef.current.clear();
    };
  }, [map]);

  // Update Markers Synchronously with Simulation Loop
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    const currentMarkerMap = markerMapRef.current;
    const activeVehicleIds = new Set<string>();

    for (const vehicle of simulatedVehicles) {
      // Filter out unselected transit modes
      if (!selectedModes.includes(vehicle.mode)) {
        continue;
      }

      activeVehicleIds.add(vehicle.id);
      const isSelected = selectedVehicleId === vehicle.id;
      const modeConfig = TRANSIT_MODE_CONFIG[vehicle.mode];
      const brandColor = modeConfig?.colorHex || "#06b6d4";
      const crowdColor = getCrowdColor(vehicle.crowdLevel);
      const nextStop = allStops.find((s) => s.id === vehicle.nextStopId);

      // Construct High-Precision Rotated SVG Marker
      const markerHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Selection Halo Glow -->
          ${
            isSelected
              ? `<div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${brandColor}33; border: 2px solid ${brandColor}; box-shadow: 0 0 16px ${brandColor}; animate: ping;"></div>`
              : ""
          }

          <!-- Directional Arrow Container with Hardware Acceleration -->
          <div style="
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #090d16;
            border: 2px solid ${brandColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.7);
            transform: rotate(${vehicle.headingDegrees}deg);
            transform-origin: center center;
            transition: transform 0.1s linear;
            will-change: transform;
          ">
            <!-- Upward Arrowhead SVG -->
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${brandColor}" stroke="${brandColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>

          <!-- Crowd Density Status Dot -->
          <div style="
            position: absolute;
            top: 2px;
            right: 4px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${crowdColor};
            border: 1.5px solid #090d16;
            box-shadow: 0 0 6px ${crowdColor};
          "></div>

          <!-- Telemetry Speed Badge -->
          <div style="
            margin-top: -2px;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(255,255,255,0.15);
            padding: 1px 4px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 700;
            font-family: monospace;
            color: #f1f5f9;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          ">
            ${Math.round(vehicle.speedKmh)} km/h
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-vehicle-div-icon",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      let marker = currentMarkerMap.get(vehicle.id);
      if (!marker) {
        marker = L.marker([vehicle.currentLatitude, vehicle.currentLongitude], {
          icon: customIcon,
          zIndexOffset: isSelected ? 1000 : 800,
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          selectVehicle(vehicle.id);
        });

        marker.on("mouseover", () => {
          setHoveredEntity({ type: "vehicle", id: vehicle.id });
        });

        marker.on("mouseout", () => {
          setHoveredEntity(null);
        });

        marker.addTo(layerGroup);
        currentMarkerMap.set(vehicle.id, marker);
      } else {
        marker.setLatLng([vehicle.currentLatitude, vehicle.currentLongitude]);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isSelected ? 1000 : 800);
      }

      // Popup Content for Live Vehicle Inspection
      const popupHtml = `
        <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #f1f5f9; font-family: sans-serif; min-width: 240px; box-shadow: 0 15px 30px rgba(0,0,0,0.7);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #ffffff;">${vehicle.name}</div>
              <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 1px;">CODE: ${vehicle.vehicleCode}</div>
            </div>
            <span style="background: ${brandColor}; color: #ffffff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${modeConfig?.shortName || vehicle.mode}</span>
          </div>

          <div style="font-size: 11px; color: #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px;">
            <div>Speed: <strong style="color: #38bdf8; font-family: monospace;">${Math.round(vehicle.speedKmh)} km/h</strong></div>
            <div>Heading: <strong style="color: #e2e8f0; font-family: monospace;">${Math.round(vehicle.headingDegrees)}&deg;</strong></div>
            <div>Status: <strong style="color: ${vehicle.status === "BOARDING" ? "#f59e0b" : "#10b981"};">${vehicle.status}</strong></div>
            <div>Density: <strong style="color: ${crowdColor};">${getCrowdLabel(vehicle.crowdLevel)}</strong></div>
          </div>

          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
            <div>Coachbuilder: <span style="color: #e2e8f0;">${vehicle.coachbuilder}</span></div>
            <div>Next Stop: <span style="color: #38bdf8; font-weight: 600;">${nextStop?.name || "En Route"}</span></div>
            <div style="margin-top: 2px;">ETA: <strong style="color: #10b981; font-family: monospace;">${vehicle.nextStopEtaSeconds ? `${Math.round(vehicle.nextStopEtaSeconds / 60)}m ${vehicle.nextStopEtaSeconds % 60}s` : "Arriving"}</strong></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "custom-glass-popup",
        closeButton: false,
      });
    }

    // Clean up markers for removed / filtered vehicles
    for (const [id, marker] of currentMarkerMap.entries()) {
      if (!activeVehicleIds.has(id)) {
        marker.remove();
        currentMarkerMap.delete(id);
      }
    }
  }, [
    map,
    simulatedVehicles,
    selectedModes,
    selectedVehicleId,
    allStops,
    selectVehicle,
    setHoveredEntity,
  ]);

  return null;
}
