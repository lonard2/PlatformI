/**
 * PlatformI - Cartography Planned Journey Vector & Pin Layer
 *
 * Renders high-visibility origin (A) and destination (B) pins, transfer interchange beacons,
 * and high-contrast glowing candidate line polylines the instant a journey is planned.
 * The map becomes the answer.
 *
 * Rules: Zero raw emojis, strict Lucide SVG iconography/badges, strict TypeScript typing (no 'any').
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useTransitStore } from "@/lib/stores/useTransitStore";

interface JourneyLayerProps {
  map: L.Map | null;
}

export function JourneyLayer({ map }: JourneyLayerProps) {
  const plannedJourney = useTransitStore((state) => state.plannedJourney);
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

  // Render Pins and Candidate Lines when plannedJourney changes
  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    if (!plannedJourney) return;

    const { originStop, destinationStop, candidateLines, transferOption } = plannedJourney;

    // 1. Render Candidate Polylines with Highlight Glow
    for (const line of candidateLines) {
      if (!line.polylineCoordinates || line.polylineCoordinates.length < 2) continue;

      const coords: L.LatLngExpression[] = line.polylineCoordinates.map((c) => [
        c.latitude,
        c.longitude,
      ]);

      // Outer glow polyline
      const glow = L.polyline(coords, {
        color: line.colorHex,
        weight: 12,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round",
      });
      glow.addTo(layerGroup);

      // Core crisp polyline
      const core = L.polyline(coords, {
        color: line.colorHex,
        weight: 6,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
      });

      const tooltipHtml = `
        <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 10px; color: #ffffff; font-family: monospace; font-size: 11px;">
          <span style="font-weight: 700; color: ${line.colorHex};">[${line.code}]</span> ${line.name}
        </div>
      `;
      core.bindTooltip(tooltipHtml, { sticky: true, className: "custom-transit-tooltip" });
      core.addTo(layerGroup);
    }

    // 2. Render Transfer Stop Pin if 1-Transfer Route
    if (transferOption) {
      const { transferStop, firstLine, secondLine } = transferOption;
      const transferIcon = L.divIcon({
        className: "journey-transfer-pin",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div class="hub-pulse-ring" style="position: absolute; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.25);"></div>
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #d97706;
              border: 2px solid #ffffff;
              box-shadow: 0 0 12px #f59e0b;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 900;
              font-size: 11px;
              font-family: monospace;
            ">T</div>
          </div>
        `,
      });

      const transferMarker = L.marker([transferStop.latitude, transferStop.longitude], {
        icon: transferIcon,
        zIndexOffset: 1500,
      });

      transferMarker.bindTooltip(
        `<div style="font-family: sans-serif; font-weight: 600; font-size: 11px;">Transit: ${transferStop.name}<br/><span style="font-size: 10px; color: #f59e0b;">${firstLine.code} &rarr; ${secondLine.code}</span></div>`,
        { permanent: true, direction: "top", offset: [0, -14], className: "custom-transit-tooltip" }
      );
      transferMarker.addTo(layerGroup);
    }

    // 3. Render Origin Pin (A - Emerald)
    const originIcon = L.divIcon({
      className: "journey-origin-pin",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div class="hub-pulse-ring" style="position: absolute; width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid #10b981; background: rgba(16, 185, 129, 0.3);"></div>
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #059669;
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 16px #10b981, 0 4px 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            font-family: monospace;
          ">A</div>
        </div>
      `,
    });

    const originMarker = L.marker([originStop.latitude, originStop.longitude], {
      icon: originIcon,
      zIndexOffset: 2000,
    });
    originMarker.bindTooltip(
      `<div style="font-family: monospace; font-weight: 700; font-size: 11px; color: #10b981;">A: ${originStop.name}</div>`,
      { permanent: true, direction: "top", offset: [0, -16], className: "custom-transit-tooltip" }
    );
    originMarker.addTo(layerGroup);

    // 4. Render Destination Pin (B - Rose)
    const destIcon = L.divIcon({
      className: "journey-dest-pin",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div class="hub-pulse-ring" style="position: absolute; width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid #f43f5e; background: rgba(244, 63, 94, 0.3);"></div>
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #e11d48;
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 16px #f43f5e, 0 4px 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            font-family: monospace;
          ">B</div>
        </div>
      `,
    });

    const destMarker = L.marker([destinationStop.latitude, destinationStop.longitude], {
      icon: destIcon,
      zIndexOffset: 2000,
    });
    destMarker.bindTooltip(
      `<div style="font-family: monospace; font-weight: 700; font-size: 11px; color: #f43f5e;">B: ${destinationStop.name}</div>`,
      { permanent: true, direction: "top", offset: [0, -16], className: "custom-transit-tooltip" }
    );
    destMarker.addTo(layerGroup);

    // 5. Instantly Fit Map Bounds with Smooth Animation
    const bounds = L.latLngBounds([
      [originStop.latitude, originStop.longitude],
      [destinationStop.latitude, destinationStop.longitude],
    ]);

    if (transferOption) {
      bounds.extend([
        transferOption.transferStop.latitude,
        transferOption.transferStop.longitude,
      ]);
    }

    // Ensure bounds are not degenerate
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [90, 90],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [map, plannedJourney]);

  return null;
}
