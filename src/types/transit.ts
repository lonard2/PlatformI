/**
 * PlatformI - Core Multimodal Transit Domain Types
 * Strict TypeScript Definitions (Zero 'any', Zero Emojis)
 */

export type TransitCategory = "RAIL" | "BUS" | "AVIATION" | "MARITIME";

export type TransitMode =
  // Land - Urban & Regional Rail
  | "MRT_JAKARTA"
  | "LRT_JABODEBEK_CIBUBUR"
  | "LRT_JABODEBEK_BEKASI"
  | "LRT_JAKARTA"
  | "KRL_BOGOR"
  | "KRL_CIKARANG"
  | "KRL_RANGKASBITUNG"
  | "KRL_TANGERANG"
  | "KRL_TANJUNG_PRIOK"
  | "WHOOSH_HSR"
  | "KAI_BANDARA"
  | "KAI_INTERCITY"
  // Land - Bus & Roadway Transit
  | "TRANSJAKARTA_BRT"
  | "TRANSJAKARTA_NON_BRT"
  | "MIKROTRANS"
  | "AKAP_INTERCITY_BUS"
  | "EXECUTIVE_SHUTTLE"
  // Air & Maritime
  | "AIRPORT_COMMERCIAL"
  | "MARITIME_SPEEDBOAT"
  | "MARITIME_PELNI";

export type ServiceOperatingStatus =
  | "NORMAL"
  | "LIMITED"
  | "SUSPENDED"
  | "OFF_HOURS";

export interface HubDestinationGroup {
  id: string;
  category: "PROVINCE" | "INTERNATIONAL_ZONE" | "DOMESTIC_ISLAND" | "REGIONAL_CITY";
  groupName: string;
  destinations: {
    city: string;
    terminalOrAirport?: string;
    operators: string[];
    priceRangeRp: string;
    travelDurationEst: string;
    dailyTripsCount: number;
  }[];
}

export type FareStructureType =
  | "FLAT"
  | "PROGRESSIVE_DISTANCE"
  | "PROGRESSIVE_STATION"
  | "FREE_TAP"
  | "DYNAMIC_TIERED";

export type CrowdDensityLevel =
  | "LEVEL_1_MANY_SEATS"
  | "LEVEL_2_FEW_SEATS"
  | "LEVEL_3_STANDING_ONLY"
  | "LEVEL_4_FULL_CRUSH";

export type ACComfortRating = "COLD" | "OPTIMAL" | "WARM" | "HOT";

export type VehicleOperationalStatus =
  | "IN_SERVICE"
  | "APPROACHING_STOP"
  | "BOARDING"
  | "CONGESTION_HOLD"
  | "OUT_OF_SERVICE";

export type DisruptionSeverity = "INFO" | "WARNING" | "CRITICAL";

export type TicketStatus = "ACTIVE" | "IN_JOURNEY" | "COMPLETED" | "EXPIRED" | "CANCELLED";

export type SeatDeck = "SINGLE" | "LOWER" | "UPPER";

export type SeatType =
  | "SLEEPER_SUITE"
  | "CAPTAIN_CHAIR"
  | "EXECUTIVE_RECLINER"
  | "STANDARD_COACH"
  | "LONGITUDINAL_BENCH"
  | "PRIORITY_ACCESSIBLE"
  | "WHEELCHAIR_BAY"
  | "BUSINESS_CLASS"
  | "FIRST_CLASS";

export type SeatStatus =
  | "AVAILABLE"
  | "SELECTED"
  | "OCCUPIED"
  | "BLOCKED"
  | "FEMALE_ONLY_RESERVED";

export type SeatingLayoutType =
  | "SLEEPER_1_1_1"
  | "EXECUTIVE_2_1"
  | "SUPER_EXEC_2_2"
  | "COMMUTER_LONGITUDINAL"
  | "WHOOSH_8_CAR"
  | "HIACE_VIP_CAPTAIN"
  | "SPRINTER_LUXURY"
  | "SPEEDBOAT_CABIN";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  zoomLevel: number;
  boundaryCoordinates: Coordinate[];
}

export interface StopFacility {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export interface Stop {
  id: string;
  lineId: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  sequence: number;
  isInterchange: boolean;
  connectedLineIds: string[];
  facilities: string[];
  accessibleElevator: boolean;
  tactilePaving: boolean;
  wheelchairRamp: boolean;
  platformType?: string;
}

export interface Line {
  id: string;
  regionId: string;
  code: string;
  name: string;
  category: TransitCategory;
  mode: TransitMode;
  colorHex: string;
  textColorHex: string;
  fareType: FareStructureType;
  baseFareRp: number;
  farePerKmRp: number;
  maxFareRp: number;
  headwayMinutes: number;
  firstDeparture: string;
  lastDeparture: string;
  polylineCoordinates: Coordinate[];
  stops?: Stop[];
}

export interface TechnicalSpec {
  id: string;
  vehicleId: string;
  coachbuilder: string;
  chassisModel: string;
  powertrain: string;
  engineOutput: string;
  torque: string;
  transmission: string;
  suspensionType: string;
  lengthMeters: number;
  passengerCapacity: number;
  maxSpeedKmh: number;
  safetyFeatures: string[];
  historicalNotes: string;
}

export interface SeatCoordinate {
  id: string;
  row: number;
  column: string;
  type: SeatType;
  status: SeatStatus;
  deck: SeatDeck;
  x: number;
  y: number;
  pricePremiumRp: number;
  features: string[];
}

export interface SeatingDiagram {
  id: string;
  vehicleId: string;
  layoutType: SeatingLayoutType;
  totalSeats: number;
  availableSeats: number;
  seats: SeatCoordinate[];
}

export interface PhotoGalleryItem {
  id: string;
  vehicleId: string;
  url: string;
  caption: string;
  photographer: string;
  tag: string;
}

export interface Vehicle {
  id: string;
  lineId: string;
  vehicleCode: string;
  name: string;
  category: TransitCategory;
  mode: TransitMode;
  currentLatitude: number;
  currentLongitude: number;
  headingDegrees: number;
  speedKmh: number;
  status: VehicleOperationalStatus;
  crowdLevel: CrowdDensityLevel;
  acComfort: ACComfortRating;
  coachbuilder: string;
  chassis: string;
  progressFraction: number;
  currentSegmentIndex: number;
  nextStopId: string;
  nextStopEtaSeconds: number;
  // Trainset & Run Specifications
  runNumber?: string;
  trainsetNumber?: string;
  totalTrainsets?: number;
  carFormation?: string;
  depotHome?: string;
  fleetNumber?: string;
  busRunNumber?: string;
  licensePlate?: string;
  operatorName?: string;
  technicalSpec?: TechnicalSpec;
  seatingDiagram?: SeatingDiagram;
  photos?: PhotoGalleryItem[];
}

export interface DisruptionAlert {
  id: string;
  lineId: string;
  title: string;
  description: string;
  severity: DisruptionSeverity;
  status: "ACTIVE" | "RESOLVED";
  affectedStops: string[];
  startTime: string;
  estimatedEndTime?: string;
}

export interface CrowdsourceCheckIn {
  id: string;
  vehicleId: string;
  userId: string;
  crowdLevel: CrowdDensityLevel;
  acComfort: ACComfortRating;
  note?: string;
  timestamp: string;
}

export interface TicketLeg {
  legIndex: number;
  lineId: string;
  originStopId: string;
  destinationStopId: string;
  mode: TransitMode;
  fareRp: number;
  distanceKm: number;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  originStopId: string;
  destinationStopId: string;
  legs: TicketLeg[];
  totalFareRp: number;
  isJakLingkoCapped: boolean;
  status: TicketStatus;
  createdAt: string;
  expiresAt: string;
  rollingToken: string;
  gateScannedAt?: string;
}

export interface DepartureBoardItem {
  tripId: string;
  lineCode: string;
  lineName: string;
  destination: string;
  mode: TransitMode;
  scheduledTime: string;
  estimatedTime: string;
  status: "ON_TIME" | "DELAYED" | "BOARDING" | "DEPARTED";
  platform: string;
  crowdLevel: CrowdDensityLevel;
  // Dynamic Run & Trainset Identifiers
  runNumber?: string;
  trainsetNumber?: string;
  totalTrainsets?: number;
  carFormation?: string;
  vehicleCode?: string;
  fleetNumber?: string;
  licensePlate?: string;
  operatorName?: string;
  depotHome?: string;
}

export interface IntermodalSkybridgeTransfer {
  id: string;
  hubName: string;
  fromEntityName: string;
  toEntityName: string;
  distanceMeters: number;
  walkingDurationMinutes: number;
  isAccessible: boolean;
  hasElevator: boolean;
  hasTravelator: boolean;
  pathDescription: string;
}
