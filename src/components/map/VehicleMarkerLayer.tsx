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
