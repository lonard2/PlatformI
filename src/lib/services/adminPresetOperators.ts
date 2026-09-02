import type { OperatorProfile } from "./adminAuthService";

/**
 * Client-safe operator presets for the demo OCC console.
 *
 * Includes demoPasskey BY DESIGN: this is a simulation product and the
 * login page displays demo credentials under the "Demo Credentials"
 * grid so first-time operators are not dead-ended by an empty passkey
 * field. ponytail: literals are duplicated deliberately instead of
 * importing adminAuthService — that import chain previously shipped the
 * whole REGISTERED_OPERATORS catalog; the test suite documents both the
 * demoPasskey contract and the import-chain severance. Pre-fill of the
 * passkey field stays forbidden (one human keystroke is still required
 * to authenticate).
 */

export type OperatorPreset = OperatorProfile & { demoPasskey: string };

export const PUBLIC_OPERATOR_PRESETS: OperatorPreset[] = [
  {
    id: "OCC-DKA-01",
    name: "Raden Budi Santoso",
    role: "CHIEF_DISPATCHER",
    stationHub: "Dukuh Atas Integrated OCC Hub",
    badgeNumber: "OCC-2026-8801",
    demoPasskey: "transitopps2026",
  },
  {
    id: "OCC-MRT-02",
    name: "Siti Rahmawati",
    role: "LINE_CONTROLLER",
    stationHub: "Lebak Bulus Depot OCC",
    badgeNumber: "MRT-OCC-0412",
    demoPasskey: "mrtjakarta2026",
  },
  {
    id: "OCC-ADMIN",
    name: "Lead Systems Administrator",
    role: "SECURITY_AUDITOR",
    stationHub: "Central Transit Operations Command",
    badgeNumber: "SYS-ADMIN-0001",
    demoPasskey: "admin123",
  },
];
