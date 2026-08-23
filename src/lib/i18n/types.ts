/**
 * PlatformI - Multi-Language Internationalization (i18n) Type Definitions
 * Supports: Indonesian (id), English (en), Japanese (ja), Chinese (zh), Korean (ko), Arabic (ar)
 * Strictly zero emojis, zero placeholder stubs, 100% strict TypeScript.
 */

export type SupportedLanguage = "id" | "en" | "ja" | "zh" | "ko" | "ar";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  locale: string;
  flagLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", dir: "ltr", locale: "id-ID", flagLabel: "ID" },
  { code: "en", name: "English", nativeName: "English", dir: "ltr", locale: "en-US", flagLabel: "EN" },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr", locale: "ja-JP", flagLabel: "JA" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", dir: "ltr", locale: "zh-CN", flagLabel: "ZH" },
  { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr", locale: "ko-KR", flagLabel: "KO" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", locale: "ar-SA", flagLabel: "AR" },
];

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    search: string;
    close: string;
    back: string;
    filter: string;
    all: string;
    details: string;
    normal: string;
    warning: string;
    critical: string;
    resolved: string;
    delayed: string;
    onTime: string;
    boarding: string;
    departed: string;
    platform: string;
    peron: string;
    bay: string;
    gate: string;
    pier: string;
    runNumber: string;
    trainset: string;
    formation: string;
    licensePlate: string;
    fleetNumber: string;
    operator: string;
    depot: string;
    viewOnMap: string;
    viewSpecs: string;
    active: string;
    inactive: string;
    loading: string;
    refresh: string;
    updatedJustNow: string;
    lastUpdated: string;
    minutes: string;
    hours: string;
    seatsAvailable: string;
    fewSeats: string;
    standingOnly: string;
    fullCrowded: string;
    selectLanguage: string;
  };
  navigation: {
    systemStatus: string;
    liveFleet: string;
    stationsAndHubs: string;
    ticketing: string;
    crowdsource: string;
    aiAdvisor: string;
    settings: string;
    adminPanel: string;
    searchRoutesAndHubs: string;
    filterByCategory: string;
    allModes: string;
    railModes: string;
    busModes: string;
    airModes: string;
    seaModes: string;
    openHubBoard: string;
    activeLines: string;
    simulationSpeed: string;
    paused: string;
    mapStyle: string;
    darkBasemap: string;
    lightBasemap: string;
    satelliteBasemap: string;
    trafficLayer: string;
  };
  modes: {
    mrt: string;
    lrtJabodebek: string;
    lrtJakarta: string;
    krlCommuter: string;
    whooshHsr: string;
    kaiAirport: string;
    kaiIntercity: string;
    tjBrt: string;
    tjNonBrt: string;
    royalTrans: string;
    mikroTrans: string;
    busWisata: string;
    akapBus: string;
    executiveShuttle: string;
    commercialAviation: string;
    maritimeSpeedboat: string;
    maritimePelni: string;
  };
  vehicleInspector: {
    telemetryTitle: string;
    speed: string;
    bearing: string;
    nextStop: string;
    eta: string;
    passengerDensity: string;
    acComfort: string;
    coachbuilder: string;
    chassis: string;
    powertrain: string;
    dimensions: string;
    capacity: string;
    tabSpecs: string;
    tabCarriages: string;
    tabPhotos: string;
    tabCrowdsource: string;
    trainsetInteractiveTitle: string;
    trainsetInteractiveHint: string;
    busDeckTitle: string;
    shipDeckTitle: string;
    submitCheckin: string;
    crowdRatingTitle: string;
    acRatingTitle: string;
  };
  hubInspector: {
    hubTitle: string;
    tabDepartures: string;
    tabDestinations: string;
    tabFacilities: string;
    tabSkybridge: string;
    liveDeparturesTitle: string;
    popularDestinations: string;
    stationFacilities: string;
    skybridgeTransfer: string;
    walkingDistance: string;
    walkingTime: string;
    elevatorAvailable: string;
    travelatorAvailable: string;
    accessibleRoute: string;
    connectedServices: string;
    scheduleSearch: string;
    noDeparturesFound: string;
  };
  statusCenter: {
    title: string;
    subtitle: string;
    tabLive: string;
    tabHistory: string;
    tabUptime: string;
    operationalNormalTitle: string;
    systemWideUptime: string;
    onTimePerformance: string;
    meanTimeToRecovery: string;
    calendarTitle: string;
    calendarSubtitle: string;
    selectDateHint: string;
    allDates: string;
    allMonths: string;
    prevMonth: string;
    nextMonth: string;
    today: string;
    thisMonth: string;
    threeMonths: string;
    thisYear: string;
    noIncidentsOnDate: string;
    rootCause: string;
    engineeringMitigation: string;
    affectedStations: string;
    incidentDuration: string;
    timeframe30Days: string;
    timeframe90Days: string;
    timeframe180Days: string;
    timeframe365Days: string;
    monthlyTrendTitle: string;
    modeReliabilityTable: string;
    monthHistorySubpanel: string;
    targetSlaPrima: string;
    targetSlaBaik: string;
    targetSlaPerhatian: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
  };
  ticketing: {
    title: string;
    passWallet: string;
    jaklingkoCapNotice: string;
    rollingSecurityCode: string;
    tapAtGate: string;
    fareCalculation: string;
    origin: string;
    destination: string;
    totalFare: string;
    integratedDiscount: string;
    purchaseTicket: string;
    activePasses: string;
    ticketExpired: string;
    validUntil: string;
  };
  aiAdvisor: {
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    send: string;
    modelSelector: string;
    suggestedQueries: string;
    fastAdvisor: string;
    deepReasoning: string;
    multimodalTransit: string;
  };
}
