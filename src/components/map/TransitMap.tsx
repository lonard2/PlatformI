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
import { useTransitStore, TileLayerId } from "@/lib/stores/useTransitStore";
import { useTransitSimulation } from "@/lib/hooks/useTransitSimulation";
import { TILE_LAYERS, JAKARTA_MAP_CENTER, JAKARTA_DEFAULT_ZOOM } from "@/lib/constants/modes";
import { RoutePolylineLayer } from "./RoutePolylineLayer";
import { HubMarkerLayer } from "./HubMarkerLayer";
import { VehicleMarkerLayer } from "./VehicleMarkerLayer";
import { MapControls } from "./MapControls";

function SimulationDriver() {
  useTransitSimulation();
  return null;
}

export function TransitMap() {
  const activeTileLayer = useTransitStore((state) => state.activeTileLayer);
  const viewportCenter = useTransitStore((state) => state.viewportCenter);
  const viewportZoom = useTransitStore((state) => state.viewportZoom);
  const setViewport = useTransitStore((state) => state.setViewport);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
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
    });

    // Default Basemap Tile Layer
    const tileConfig = TILE_LAYERS[activeTileLayer] || TILE_LAYERS.dark;
    const initialTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains,
      attribution: tileConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = initialTileLayer;
    mapInstanceRef.current = map;
    setMapReady(map);

    // Sync viewport movements to store
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      setViewport([center.lat, center.lng], zoom);
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      setMapReady(null);
    };
  }, []); // Run once on client mount

  // 2. Respond to Basemap Tile Layer switching
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

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-[#090d16] overflow-hidden select-none">
      {/* Map Container DOM element */}
      <div ref={mapContainerRef} className="w-full h-full leaflet-container" />

      {/* Cartography Vector & Marker Layers */}
      <SimulationDriver />
      {mapReady && (
        <>
          <RoutePolylineLayer map={mapReady} />
          <HubMarkerLayer map={mapReady} />
          <VehicleMarkerLayer map={mapReady} />
          <MapControls map={mapReady} />
        </>
      )}
    </div>
  );
}
