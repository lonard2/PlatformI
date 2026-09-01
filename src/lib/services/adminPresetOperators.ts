import type { OperatorProfile } from "./adminAuthService";

/**
 * Client-safe operator presets WITHOUT passkeys.
 *
 * ponytail: profiles are duplicated as literals on purpose — importing
 * adminAuthService here would drag REGISTERED_OPERATORS (plaintext
 * passkeys) into the client bundle. The server catalog in
 * adminAuthService.ts is the source of truth; update both when roles change.
 */

export const PUBLIC_OPERATOR_PRESETS: OperatorProfile[] = [
  {
    id: "OCC-DKA-01",
    name: "Raden Budi Santoso",
    role: "CHIEF_DISPATCHER",
    stationHub: "Dukuh Atas Integrated OCC Hub",
    badgeNumber: "OCC-2026-8801",
  },
  {
    id: "OCC-MRT-02",
    name: "Siti Rahmawati",
    role: "LINE_CONTROLLER",
    stationHub: "Lebak Bulus Depot OCC",
    badgeNumber: "MRT-OCC-0412",
  },
  {
    id: "OCC-ADMIN",
    name: "Lead Systems Administrator",
    role: "SECURITY_AUDITOR",
    stationHub: "Central Transit Operations Command",
    badgeNumber: "SYS-ADMIN-0001",
  },
];
