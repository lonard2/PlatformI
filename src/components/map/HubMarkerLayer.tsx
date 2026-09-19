/**
 * PlatformI - Multimodal Interchange Hub Marker Layer
 * Renders smart hub beacons, interchange clusters, pulsing locator rings,
 * adaptive typology iconography, and scale levels (BIG, MEDIUM, SMALL)
 * for major Jakarta & Bodetabek transit stations.
 *
 * Rules: Zero raw emojis, strict Lucide SVG iconography, strict TypeScript.
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { StationType, StationScale } from "@/types/transit";

interface HubMarkerLayerProps {
  map: L.Map | null;
}

function getStationTypeSvg(type: StationType, color: string, size = 12): string {
  switch (type) {
    case "TOD":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
    case "RAIL_STATION":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>`;
    case "BUS_TERMINAL":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
    case "AIRPORT_TERMINAL":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
    case "HARBOR_PORT":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><circle cx="12" cy="5" r="3"/><line x1="12" x2="12" y1="22" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
    case "BUS_SHELTER":
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>`;
  }
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
      const primaryColor = parentLine?.colorHex || "#38bdf8";

      const scale: StationScale = stop.scale || (stop.isInterchange ? "BIG" : "MEDIUM");
      const stationType: StationType = stop.stationType || (stop.isInterchange ? "TOD" : "RAIL_STATION");

      let markerHtml = "";
      let iconSize: [number, number] = [28, 28];
      let iconAnchor: [number, number] = [14, 14];
      let zIndex = isSelected ? 500 : 200;

      if (scale === "BIG") {
        iconSize = [36, 36];
        iconAnchor = [18, 18];
        zIndex = isSelected ? 600 : 300;
        const iconSvg = getStationTypeSvg(stationType, isSelected ? "#38bdf8" : primaryColor, 13);

        markerHtml = `
          <div class="hub-marker-wrapper hub-scale-big" data-stop-id="${stop.id}" style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
            <div class="hub-pulse-ring" style="position: absolute; width: 34px; height: 34px; border-radius: 50%; border: 2px solid ${primaryColor}; background: ${primaryColor}22; pointer-events: none;"></div>
            <div style="
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background: #090d16;
              border: ${isSelected ? "3px solid #38bdf8" : `2px solid ${primaryColor}`};
              box-shadow: ${isSelected ? "0 0 16px #38bdf8, 0 0 24px rgba(56,189,248,0.5)" : `0 2px 10px rgba(0,0,0,0.8), 0 0 12px ${primaryColor}44`};
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease;
              pointer-events: none;
            ">
              ${iconSvg}
            </div>
            ${
              stop.connectedLineIds && stop.connectedLineIds.length > 0
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
                    pointer-events: none;
                  ">+${stop.connectedLineIds.length}</div>`
                : ""
            }
          </div>
        `;
      } else if (scale === "MEDIUM") {
        iconSize = [28, 28];
        iconAnchor = [14, 14];
        zIndex = isSelected ? 500 : 200;

        markerHtml = `
          <div class="hub-marker-wrapper hub-scale-medium" data-stop-id="${stop.id}" style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
            ${
              isHub
                ? `<div class="hub-pulse-ring" style="position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid ${primaryColor}; background: ${primaryColor}18; pointer-events: none;"></div>`
                : ""
            }
            <div style="
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #090d16;
              border: ${isSelected ? "2.5px solid #38bdf8" : `2px solid ${primaryColor}`};
              box-shadow: ${isSelected ? "0 0 12px #38bdf8" : "0 2px 6px rgba(0,0,0,0.6)"};
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease;
              pointer-events: none;
            ">
              <div style="
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: ${primaryColor};
                pointer-events: none;
              "></div>
            </div>
            ${
              stop.connectedLineIds && stop.connectedLineIds.length > 0
                ? `<div style="
                    position: absolute;
                    top: -3px;
                    right: -3px;
                    background: #0284c7;
                    color: #ffffff;
                    font-size: 8px;
                    font-weight: 800;
                    font-family: monospace;
                    width: 13px;
                    height: 13px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255,255,255,0.4);
                    pointer-events: none;
                  ">+${stop.connectedLineIds.length}</div>`
                : ""
            }
          </div>
        `;
      } else {
        // SMALL
        iconSize = [20, 20];
        iconAnchor = [10, 10];
        zIndex = isSelected ? 400 : 100;

        markerHtml = `
          <div class="hub-marker-wrapper hub-scale-small" data-stop-id="${stop.id}" style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
            <div style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: ${isSelected ? "#38bdf8" : primaryColor};
              border: ${isSelected ? "2px solid #ffffff" : "1.5px solid #090d16"};
              box-shadow: ${isSelected ? "0 0 10px #38bdf8" : "0 1px 4px rgba(0,0,0,0.6)"};
              pointer-events: none;
            "></div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-hub-div-icon",
        iconSize,
        iconAnchor,
        popupAnchor: [0, -iconAnchor[1]],
      });

      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: customIcon,
        zIndexOffset: zIndex,
      });

      const typeLabel = stationType.replace("_", " ");
      marker.bindTooltip(
        `<div style="font-family: ui-sans-serif, system-ui; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 700; color: #ffffff;">${stop.name}</div>
          <div style="font-size: 9px; color: #94a3b8; font-family: monospace; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <span>[${stop.code}]</span>
            <span>&bull;</span>
            <span style="color: ${primaryColor}; font-weight: 600;">${typeLabel}</span>
            <span>&bull;</span>
            <span style="color: #cbd5e1;">${scale}</span>
          </div>
        </div>`,
        {
          direction: "top",
          offset: [0, -iconAnchor[1]],
          className: "custom-glass-hub-tooltip",
          opacity: 0.95,
        }
      );

      marker.on("mouseover", () => {
        setHoveredEntity({ type: "stop", id: stop.id });
      });

      marker.on("mouseout", () => {
        setHoveredEntity(null);
      });

      // Click opens the Hub Detail Drawer directly
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectStop(stop.id);
      });

      marker.addTo(layerGroup);

      const el = marker.getElement();
      if (el) {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectStop(stop.id);
        });
      }
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
