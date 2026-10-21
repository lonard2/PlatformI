/**
 * PlatformI - Interactive Multimodal Cartography Map Engine
 * Core Leaflet Map Engine with Dynamic Basemap Switching, Responsive Glass Cockpit Overlay,
 * GTFS-RT Vector Simulation, Smart Hub Markers & Route Polylines.
 *
 * Rules: SSR safe (client-only), zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useTransitStore, TileLayerId } from "@/lib/stores/useTransitStore";
import { useTransitSimulation } from "@/lib/hooks/useTransitSimulation";
import {
  TILE_LAYERS,
  JAKARTA_MAP_CENTER,
  JAKARTA_DEFAULT_ZOOM,
  basemapNeedsDim,
  type TileLayerDefinition,
} from "@/lib/constants/modes";
import { useTranslation } from "@/lib/i18n";
import { RoutePolylineLayer } from "./RoutePolylineLayer";
import { JourneyLayer } from "./JourneyLayer";
import { HubMarkerLayer } from "./HubMarkerLayer";
import { VehicleMarkerLayer } from "./VehicleMarkerLayer";
import { MapControls } from "./MapControls";

function SimulationDriver() {
  useTransitSimulation();
  return null;
}

const TILE_ERROR_THRESHOLD = 6;
const SLOW_TILE_TIMEOUT_MS = 12000;

// Branded placeholder: blends with the midnight field instead of rendering
// a broken-image gap when a tile host fails.
const TILE_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#0b1220"/><circle cx="128" cy="128" r="40" fill="none" stroke="#06b6d4" stroke-opacity="0.25" stroke-width="3"/></svg>`
  );

function createMonitoredTileLayer(
  config: TileLayerDefinition,
  onFatal: () => void
): { layer: L.TileLayer; detach: () => void } {
  let failures = 0;
  const layer = L.tileLayer(config.url, {
    maxZoom: config.maxZoom,
    subdomains: config.subdomains,
    attribution: config.attribution,
    errorTileUrl: TILE_PLACEHOLDER,
  });
  const onTileError = () => {
    failures += 1;
    if (failures === TILE_ERROR_THRESHOLD) onFatal();
  };
  const onLoad = () => {
    failures = 0;
  };
  layer.on("tileerror", onTileError);
  layer.on("load", onLoad);
  return {
    layer,
    detach: () => {
      layer.off("tileerror", onTileError);
      layer.off("load", onLoad);
    },
  };
}

export function TransitMap() {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const activeTileLayer = useTransitStore((state) => state.activeTileLayer);
  // Tile resilience: swap a failing keyed host for OSM, surface slow tiles.
  const [tileDegraded, setTileDegraded] = useState<boolean>(false);
  const [tileHostFallback, setTileHostFallback] = useState<boolean>(false);
  const [tileAttemptKey, setTileAttemptKey] = useState<number>(0);
  const tileLayerEntryRef = useRef<{ layer: L.TileLayer; detach: () => void } | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportCenter = useTransitStore((state) => state.viewportCenter);
  const viewportZoom = useTransitStore((state) => state.viewportZoom);
  const setViewport = useTransitStore((state) => state.setViewport);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState<L.Map | null>(null);

  // 1. Initialize Map Instance with strict React 19 cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent duplicate instantiation

    const map = L.map(mapContainerRef.current, {
      center: viewportCenter || JAKARTA_MAP_CENTER,
      zoom: viewportZoom || JAKARTA_DEFAULT_ZOOM,
      zoomControl: false, // Using custom glass HUD zoom buttons
      attributionControl: false,
      minZoom: 8,
      maxZoom: 18,
      // Reduced motion applies to the cartography too, not only to the chrome.
      zoomAnimation: !shouldReduceMotion,
      fadeAnimation: !shouldReduceMotion,
      markerZoomAnimation: !shouldReduceMotion,
    });

    mapInstanceRef.current = map;
    setMapReady(map);

    // Sync viewport movements to store
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      setViewport([center.lat, center.lng], zoom);
    };

    map.on("moveend", handleMoveEnd);

    // The map box follows the shell (the bottom navigation height is dynamic),
    // so Leaflet has to be told when the container changed size.
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off("moveend", handleMoveEnd);
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(null);
    };
  }, []); // Run once on client mount

  // 2. Basemap Tile Layer with failure fallback and slow-tile state.
  // A failing keyed host swaps to OSM Standard; persistent failure or a slow
  // host surfaces a retry badge instead of a silent hole in the canvas.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const selected = TILE_LAYERS[activeTileLayer] ?? TILE_LAYERS.dark;
    const tileConfig =
      tileHostFallback && selected.url.includes("basemaps.cartocdn")
        ? TILE_LAYERS.streets
        : selected;

    const handleTileFatal = () => {
      if (tileConfig.url.includes("basemaps.cartocdn") && !tileHostFallback) {
        setTileHostFallback(true);
      }
      setTileDegraded(true);
    };

    const { layer, detach } = createMonitoredTileLayer(tileConfig, handleTileFatal);
    layer.addTo(map);
    tileLayerEntryRef.current = { layer, detach };

    const onSlowTiles = () => setTileDegraded(true);
    layer.on("load", () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setTileDegraded(false);
    });
    slowTimerRef.current = setTimeout(onSlowTiles, SLOW_TILE_TIMEOUT_MS);

    return () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      detach();
      layer.remove();
      tileLayerEntryRef.current = null;
    };
  }, [mapReady, activeTileLayer, tileHostFallback, tileAttemptKey]);

  const handleTileRetry = () => {
    setTileHostFallback(false);
    setTileDegraded(false);
    setTileAttemptKey((k) => k + 1);
  };

  return (
    <div
      className={`relative w-full h-full min-h-0 flex-1 bg-[#090d16] overflow-hidden select-none ${
        basemapNeedsDim(activeTileLayer) ? "basemap-dimmed" : ""
      }`}
    >
      {/* Map Container DOM element */}
      <div ref={mapContainerRef} className="w-full h-full leaflet-container" />
      {tileDegraded && (
        <button
          type="button"
          onClick={handleTileRetry}
          className="touch-target absolute left-3 bottom-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel border border-white/15 text-[11px] font-mono text-slate-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.common.mapTilesSlow}</span>
        </button>
      )}

      {/* Cartography Vector & Marker Layers */}
      <SimulationDriver />
      {mapReady && (
        <>
          <RoutePolylineLayer map={mapReady} />
          <JourneyLayer map={mapReady} />
          <HubMarkerLayer map={mapReady} />
          <VehicleMarkerLayer map={mapReady} />
          <MapControls map={mapReady} />
        </>
      )}
    </div>
  );
}
