/**
 * PlatformI - Dynamic Network Map Studio Cartography Wrapper
 *
 * Provides SSR-safe client-only dynamic loading for Leaflet map editor canvas.
 *
 * Rules: Strict SSR Isolation, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import dynamic from "next/dynamic";
import { SkeletonMap } from "@/components/map/SkeletonMap";
import type { NetworkMapCanvasProps } from "./NetworkMapCanvas";

export const DynamicNetworkMap = dynamic<NetworkMapCanvasProps>(
  () => import("./NetworkMapCanvas").then((mod) => mod.NetworkMapCanvas),
  {
    ssr: false,
    loading: () => <SkeletonMap />,
  }
);

export default DynamicNetworkMap;
