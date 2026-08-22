/**
 * PlatformI - SSR-Safe Dynamic Map Wrapper
 * Loads Leaflet cartography client-side with Next.js dynamic import and SSR disabled.
 * Renders SkeletonMap fallback during hydration.
 *
 * Rules: Strict SSR Isolation, zero emojis, strict TypeScript typing.
 */

"use client";

import dynamic from "next/dynamic";
import { SkeletonMap } from "./SkeletonMap";

export const DynamicMap = dynamic(
  () => import("./TransitMap").then((mod) => mod.TransitMap),
  {
    ssr: false,
    loading: () => <SkeletonMap />,
  }
);

export default DynamicMap;
