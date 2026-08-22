/**
 * PlatformI - Real-Time GTFS-RT Vector Movement Simulation Engine Hook
 * Drives smooth 60fps vector interpolation, heading calculation, station dwell state machine,
 * and dynamic next-stop ETAs across all active fleet vehicles.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import {
  calculatePolylineLength,
  interpolatePositionAlongPolyline,
  findNearestPointOnPolyline,
  calculateNextStopEta,
} from "@/lib/math/geodesy";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { Vehicle, VehicleOperationalStatus } from "@/types/transit";

interface InternalVehicleState {
  currentDistanceMeters: number;
  dwellRemainingSeconds: number;
}

export function useTransitSimulation() {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const updateSimulatedVehicles = useTransitStore(
    (state) => state.updateSimulatedVehicles
  );

  const [fps, setFps] = useState<number>(60);
  const internalStateRef = useRef<Map<string, InternalVehicleState>>(new Map());
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);

  // Initialize vehicle distances on mount or fleet change
  useEffect(() => {
    for (const veh of simulatedVehicles) {
      if (!internalStateRef.current.has(veh.id)) {
        const line = allLines.find((l) => l.id === veh.lineId);
        const polyline = line?.polylineCoordinates || [];
        const totalLength = calculatePolylineLength(polyline);
        const initialDistance = veh.progressFraction
          ? veh.progressFraction * totalLength
          : 0;

        internalStateRef.current.set(veh.id, {
          currentDistanceMeters: initialDistance,
          dwellRemainingSeconds: 0,
        });
      }
    }
  }, [simulatedVehicles, allLines]);

  // Main high-performance simulation loop
  useEffect(() => {
    let isCancelled = false;

    const tick = (currentTime: number) => {
      if (isCancelled) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
        lastFpsUpdateRef.current = currentTime;
        animFrameIdRef.current = requestAnimationFrame(tick);
        return;
      }

      // Delta time in seconds, clamped to max 0.5s to prevent background-tab warp
      const rawDelta = (currentTime - lastTimeRef.current) / 1000;
      const deltaSeconds = Math.min(0.5, Math.max(0.001, rawDelta));
      lastTimeRef.current = currentTime;

      // FPS tracking
      frameCountRef.current += 1;
      if (currentTime - lastFpsUpdateRef.current >= 1000) {
        setFps(
          Math.round(
            (frameCountRef.current * 1000) /
              (currentTime - lastFpsUpdateRef.current)
          )
        );
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
      }

      // If paused (speed = 0), continue animation loop but don't advance positions
      if (simulationSpeed === 0) {
        animFrameIdRef.current = requestAnimationFrame(tick);
        return;
      }

      let hasModifications = false;
      const updatedList: Vehicle[] = simulatedVehicles.map((vehicle) => {
        const line = allLines.find((l) => l.id === vehicle.lineId);
        if (!line || !line.polylineCoordinates || line.polylineCoordinates.length < 2) {
          return vehicle;
        }

        const polyline = line.polylineCoordinates;
        const totalLength = calculatePolylineLength(polyline);
        if (totalLength === 0) return vehicle;

        let state = internalStateRef.current.get(vehicle.id);
        if (!state) {
          state = {
            currentDistanceMeters: vehicle.progressFraction * totalLength,
            dwellRemainingSeconds: 0,
          };
          internalStateRef.current.set(vehicle.id, state);
        }

        const modeConfig = TRANSIT_MODE_CONFIG[vehicle.mode];
        const cruisingSpeedKmh = modeConfig?.speedProfile?.cruisingSpeedKmh || vehicle.speedKmh || 40;
        const standardDwell = modeConfig?.speedProfile?.standardDwellSeconds || 30;

        // 1. Check active station dwell countdown
        if (state.dwellRemainingSeconds > 0) {
          const newDwell = Math.max(
            0,
            state.dwellRemainingSeconds - deltaSeconds * simulationSpeed
          );
          state.dwellRemainingSeconds = newDwell;
          hasModifications = true;

          const status: VehicleOperationalStatus =
            newDwell > 0 ? "BOARDING" : "IN_SERVICE";

          return {
            ...vehicle,
            status,
            speedKmh: newDwell > 0 ? 0 : cruisingSpeedKmh,
          };
        }

        // 2. Vector movement progression
        const speedMps = (cruisingSpeedKmh * 1000) / 3600;
        const stepDist = speedMps * deltaSeconds * simulationSpeed;
        const prevDistance = state.currentDistanceMeters;
        const nextDistance = (prevDistance + stepDist) % totalLength;
        state.currentDistanceMeters = nextDistance;
        hasModifications = true;

        // 3. Station stops along polyline & dwell triggering
        const lineStops = allStops
          .filter((s) => s.lineId === line.id)
          .sort((a, b) => a.sequence - b.sequence);

        let triggeredDwell = false;
        for (const stop of lineStops) {
          const stopProjection = findNearestPointOnPolyline(stop, polyline);
          const stopDist = stopProjection.alongTrackMeters;

          // If vehicle crossed stop location in this step
          if (
            (prevDistance <= stopDist && nextDistance >= stopDist) ||
            (nextDistance < prevDistance &&
              (prevDistance <= stopDist || nextDistance >= stopDist))
          ) {
            state.dwellRemainingSeconds = standardDwell;
            triggeredDwell = true;
            break;
          }
        }

        // 4. Interpolate new position and continuous heading
        const { position, heading, segmentIndex } =
          interpolatePositionAlongPolyline(polyline, nextDistance);

        // 5. Upcoming next stop & dynamic ETA calculation
        let nextStopId = vehicle.nextStopId;
        let nextStopEtaSeconds = vehicle.nextStopEtaSeconds;
        let operationalStatus: VehicleOperationalStatus = triggeredDwell
          ? "BOARDING"
          : "IN_SERVICE";

        if (lineStops.length > 0) {
          // Find next stop ahead of vehicle
          let targetStop = lineStops.find((s) => {
            const proj = findNearestPointOnPolyline(s, polyline);
            return proj.alongTrackMeters > nextDistance;
          });

          // Wrap to first stop if vehicle is past the last stop
          if (!targetStop) {
            targetStop = lineStops[0];
          }

          if (targetStop) {
            nextStopId = targetStop.id;
            const targetProj = findNearestPointOnPolyline(targetStop, polyline);
            const targetDist = targetProj.alongTrackMeters;

            let remainingMeters = 0;
            if (targetDist >= nextDistance) {
              remainingMeters = targetDist - nextDistance;
            } else {
              remainingMeters = totalLength - nextDistance + targetDist;
            }

            nextStopEtaSeconds = calculateNextStopEta(
              0,
              remainingMeters,
              cruisingSpeedKmh,
              simulationSpeed,
              0
            );

            if (!triggeredDwell && remainingMeters < 150) {
              operationalStatus = "APPROACHING_STOP";
            }
          }
        }

        const progressFraction = totalLength > 0 ? nextDistance / totalLength : 0;

        return {
          ...vehicle,
          currentLatitude: position[0],
          currentLongitude: position[1],
          headingDegrees: heading,
          speedKmh: triggeredDwell ? 0 : cruisingSpeedKmh,
          status: operationalStatus,
          progressFraction,
          currentSegmentIndex: segmentIndex,
          nextStopId,
          nextStopEtaSeconds,
        };
      });

      if (hasModifications) {
        updateSimulatedVehicles(updatedList);
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    simulatedVehicles,
    allLines,
    allStops,
    simulationSpeed,
    updateSimulatedVehicles,
  ]);

  return {
    fps,
    simulationSpeed,
    activeVehicleCount: simulatedVehicles.length,
    isPaused: simulationSpeed === 0,
  };
}
