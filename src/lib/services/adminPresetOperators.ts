import type { OperatorProfile } from "./adminAuthService";

/**
 * Client-safe operator presets for the demo OCC console.
 *
 * Presets fill the operator ID only; the passkey field always starts empty
 * and must be typed by a human. demoPasskey literals live here (never the
 * auth-record `passkey`) so demo login stays possible from documented
 * credentials without rendering secrets on the login card. ponytail:
 * literals are duplicated deliberately instead of importing
 * adminAuthService — that import chain previously shipped the whole
 * REGISTERED_OPERATORS catalog; the test suite documents both the
 * demoPasskey contract and the import-chain severance.
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
