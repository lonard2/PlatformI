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

interface MarkerCacheEntry {
  marker: L.Marker;
  lastSelected: boolean;
  lastCrowdLevel: CrowdDensityLevel;
}

export function VehicleMarkerLayer({ map }: VehicleMarkerLayerProps) {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const allStops = useTransitStore((state) => state.allStops);
  const selectVehicle = useTransitStore((state) => state.selectVehicle);
  const setHoveredEntity = useTransitStore((state) => state.setHoveredEntity);

  const markerMapRef = useRef<Map<string, MarkerCacheEntry>>(new Map());
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

  // Construct Marker Icon HTML
  const buildMarkerHtml = (
    vehicle: Vehicle,
    isSelected: boolean,
    brandColor: string,
    crowdColor: string
  ) => {
    return `
      <div class="vehicle-marker-wrapper" data-vehicle-id="${vehicle.id}" style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
        <!-- Selection Halo Glow -->
        <div class="vehicle-selection-halo" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${brandColor}33; border: 2px solid ${brandColor}; box-shadow: 0 0 16px ${brandColor}; display: ${
      isSelected ? "block" : "none"
    };"></div>

        <!-- Directional Arrow Container with Hardware Acceleration -->
        <div class="vehicle-arrow-dir" style="
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
          transition: transform 0.15s ease-out;
          will-change: transform;
          pointer-events: none;
        ">
          <!-- Upward Arrowhead SVG -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${brandColor}" stroke="${brandColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>

        <!-- Crowd Density Status Dot -->
        <div class="vehicle-crowd-dot" style="
          position: absolute;
          top: 2px;
          right: 4px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${crowdColor};
          border: 1.5px solid #090d16;
          box-shadow: 0 0 6px ${crowdColor};
          pointer-events: none;
        "></div>

        <!-- Telemetry Speed Badge -->
        <div class="vehicle-speed-badge" style="
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
          pointer-events: none;
        ">
          ${Math.round(vehicle.speedKmh)} km/h
        </div>
      </div>
    `;
  };

  // Construct Glassmorphic Desktop Hover Tooltip HTML
  const buildVehicleTooltipHtml = (
    vehicle: Vehicle,
    brandColor: string,
    nextStopName?: string
  ) => {
    const modeConfig = TRANSIT_MODE_CONFIG[vehicle.mode];
    const occPercent =
      vehicle.carriages && vehicle.carriages.length > 0
        ? Math.round(
            vehicle.carriages.reduce((acc, c) => acc + c.occupancyPercent, 0) /
              vehicle.carriages.length
          )
        : 45;

    const occColor =
      occPercent > 80 ? "#f43f5e" : occPercent > 60 ? "#f59e0b" : "#10b981";

    const runCode =
      vehicle.runNumber ||
      vehicle.trainsetNumber ||
      vehicle.vehicleCode ||
      vehicle.fleetNumber ||
      vehicle.id;

    const statusText =
      vehicle.status === "BOARDING"
        ? "Sedang Menaikkan Penumpang"
        : vehicle.speedKmh > 5
        ? `Sedang Berjalan (${Math.round(vehicle.speedKmh)} km/h)`
        : "Berhenti / Sinyal";

    return `
      <div style="background: rgba(8, 12, 22, 0.96); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 10px 12px; font-family: ui-sans-serif, system-ui, sans-serif; min-width: 220px; max-width: 280px; box-shadow: 0 12px 36px rgba(0,0,0,0.85); backdrop-filter: blur(16px); color: #f8fafc; pointer-events: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="background: ${brandColor}; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 5px; letter-spacing: 0.5px;">
              ${runCode}
            </span>
            <span style="font-size: 9px; color: #94a3b8; font-family: monospace;">
              ${modeConfig?.name || vehicle.category}
            </span>
          </div>
          <span style="font-size: 10px; font-family: monospace; color: #38bdf8; font-weight: 700;">
            ${Math.round(vehicle.speedKmh)} km/h
          </span>
        </div>

        <div style="font-size: 11.5px; font-weight: 700; color: #ffffff; line-height: 1.35; margin-bottom: 4px;">
          ${vehicle.name}
        </div>

        ${
          nextStopName
            ? `
          <div style="font-size: 10px; color: #cbd5e1; font-family: monospace; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #64748b;">Menuju:</span>
            <strong style="color: #38bdf8; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nextStopName}</strong>
          </div>
        `
            : ""
        }

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 9.5px; font-family: monospace;">
          <span style="color: #94a3b8;">${statusText}</span>
          <span style="color: ${occColor}; font-weight: 800;">${occPercent}% Muatan</span>
        </div>

        <div style="font-size: 8.5px; color: #38bdf8; margin-top: 5px; text-align: center; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 2px 4px; border-radius: 5px; font-family: monospace;">
          Klik untuk rincian sarana & formasi
        </div>
      </div>
    `;
  };

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

      const cached = currentMarkerMap.get(vehicle.id);

      if (!cached) {
        // Create new marker
        const markerHtml = buildMarkerHtml(vehicle, isSelected, brandColor, crowdColor);
        const customIcon = L.divIcon({
          html: markerHtml,
          className: "custom-vehicle-div-icon",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22],
        });

        const marker = L.marker([vehicle.currentLatitude, vehicle.currentLongitude], {
          icon: customIcon,
          zIndexOffset: isSelected ? 1000 : 800,
        });

        // Attach Desktop Glassmorphic Hover Tooltip (Lazy populated on hover)
        marker.bindTooltip("", {
          direction: "top",
          offset: [0, -22],
          className: "custom-glass-vehicle-tooltip",
          opacity: 1,
        });

        marker.on("tooltipopen", () => {
          const freshVeh = simulatedVehicles.find((v) => v.id === vehicle.id) || vehicle;
          const freshStop = allStops.find((s) => s.id === freshVeh.nextStopId);
          marker.setTooltipContent(buildVehicleTooltipHtml(freshVeh, brandColor, freshStop?.name));
        });

        // Click handler: opens vehicle inspector drawer directly
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

        // Add direct native DOM event listener as a fallback
        const el = marker.getElement();
        if (el) {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            selectVehicle(vehicle.id);
          });
        }

        currentMarkerMap.set(vehicle.id, {
          marker,
          lastSelected: isSelected,
          lastCrowdLevel: vehicle.crowdLevel,
        });
      } else {
        const { marker, lastSelected, lastCrowdLevel } = cached;

        // Smoothly update coordinate without DOM recreation
        marker.setLatLng([vehicle.currentLatitude, vehicle.currentLongitude]);

        // Performance: Only update tooltip DOM if the tooltip is actually open/hovered!
        if (marker.isTooltipOpen && marker.isTooltipOpen()) {
          const tooltipHtml = buildVehicleTooltipHtml(vehicle, brandColor, nextStop?.name);
          marker.setTooltipContent(tooltipHtml);
        }

        // If selection state or crowd level changed, update full icon
        if (lastSelected !== isSelected || lastCrowdLevel !== vehicle.crowdLevel) {
          const markerHtml = buildMarkerHtml(vehicle, isSelected, brandColor, crowdColor);
          const customIcon = L.divIcon({
            html: markerHtml,
            className: "custom-vehicle-div-icon",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22],
          });
          marker.setIcon(customIcon);
          marker.setZIndexOffset(isSelected ? 1000 : 800);
          cached.lastSelected = isSelected;
          cached.lastCrowdLevel = vehicle.crowdLevel;

          const el = marker.getElement();
          if (el) {
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              selectVehicle(vehicle.id);
            });
          }
        } else {
          // Fast sub-millisecond in-place DOM update for rotation and speed
          const el = marker.getElement();
          if (el) {
            const dirArrow = el.querySelector(".vehicle-arrow-dir") as HTMLElement | null;
            if (dirArrow) {
              dirArrow.style.transform = `rotate(${vehicle.headingDegrees}deg)`;
            }
            const speedBadge = el.querySelector(".vehicle-speed-badge") as HTMLElement | null;
            if (speedBadge) {
              speedBadge.textContent = `${Math.round(vehicle.speedKmh)} km/h`;
            }
          }
        }
      }
    }

    // Clean up markers for removed / filtered vehicles
    for (const [id, entry] of currentMarkerMap.entries()) {
      if (!activeVehicleIds.has(id)) {
        entry.marker.remove();
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
