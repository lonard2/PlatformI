/**
 * PlatformI - Consolidated Hub Destinations Dataset
 * Comprehensive regional and provincial destinations for AKAP Bus Terminals,
 * International Airports, Passenger Ports, and Executive Travel Shuttles.
 *
 * Rules: Zero raw emojis, strict TypeScript typing (no 'any').
 */

import { HubDestinationGroup } from "@/types/transit";

export const HUB_DESTINATIONS_DATA: Record<string, HubDestinationGroup[]> = {
  // 1. TERMINAL TERPADU PULO GEBANG (AKAP BUSES)
  "stop-akap-pgb": [
    {
      id: "pgb-jateng",
      category: "PROVINCE",
      groupName: "Jawa Tengah & D.I. Yogyakarta",
      destinations: [
        {
          city: "Solo / Surakarta",
          terminalOrAirport: "Terminal Tirtonadi",
          operators: ["PO Rosalia Indah", "PO Sinar Jaya", "PO Raya", "PO Harapan Jaya"],
          priceRangeRp: "Rp 180.000 - Rp 380.000",
          travelDurationEst: "7 - 8 Jam (Via Tol Trans-Jawa)",
          dailyTripsCount: 42,
        },
        {
          city: "Semarang",
          terminalOrAirport: "Terminal Terboyo / Mangkang",
          operators: ["PO Nusantara", "PO Kramat Djati", "PO Shantika", "PO Haryanto"],
          priceRangeRp: "Rp 160.000 - Rp 320.000",
          travelDurationEst: "5 - 6 Jam (Via Tol)",
          dailyTripsCount: 38,
        },
        {
          city: "Yogyakarta",
          terminalOrAirport: "Terminal Giwangan / Jombor",
          operators: ["PO Sumber Alam", "PO Handoyo", "PO Santoso", "PO Sinar Jaya"],
          priceRangeRp: "Rp 175.000 - Rp 350.000",
          travelDurationEst: "8 - 9 Jam",
          dailyTripsCount: 35,
        },
        {
          city: "Purwokerto & Wonosobo",
          terminalOrAirport: "Terminal Bulupitu / Mendolo",
          operators: ["PO Sinar Jaya", "PO Dieng Indah", "PO DMI"],
          priceRangeRp: "Rp 140.000 - Rp 260.000",
          travelDurationEst: "6 - 7 Jam",
          dailyTripsCount: 28,
        },
      ],
    },
    {
      id: "pgb-jatim",
      category: "PROVINCE",
      groupName: "Jawa Timur & Madura",
      destinations: [
        {
          city: "Surabaya",
          terminalOrAirport: "Terminal Purabaya (Bungurasih)",
          operators: ["PO 27 Trans", "PO Gunung Harta", "PO Juragan 99", "PO Rosalia Indah"],
          priceRangeRp: "Rp 260.000 - Rp 550.000 (Sleeper)",
          travelDurationEst: "9 - 10 Jam (Via Tol Trans-Jawa)",
          dailyTripsCount: 36,
        },
        {
          city: "Malang",
          terminalOrAirport: "Terminal Arjosari",
          operators: ["PO Juragan 99", "PO Medali Mas", "PO Gunung Harta"],
          priceRangeRp: "Rp 280.000 - Rp 570.000",
          travelDurationEst: "10 - 11 Jam",
          dailyTripsCount: 24,
        },
        {
          city: "Madiun & Kediri",
          terminalOrAirport: "Terminal Purboyo / Tamanan",
          operators: ["PO Harapan Jaya", "PO Rosalia Indah"],
          priceRangeRp: "Rp 210.000 - Rp 380.000",
          travelDurationEst: "8 - 9 Jam",
          dailyTripsCount: 20,
        },
      ],
    },
    {
      id: "pgb-bali-sumatra",
      category: "PROVINCE",
      groupName: "Bali, NTB & Sumatra",
      destinations: [
        {
          city: "Denpasar (Bali)",
          terminalOrAirport: "Terminal Mengwi",
          operators: ["PO Gunung Harta", "PO Safari Dharma Raya", "PO Rasa Sayang"],
          priceRangeRp: "Rp 500.000 - Rp 850.000",
          travelDurationEst: "22 - 24 Jam (Termasuk Feri Ketapang-Gilimanuk)",
          dailyTripsCount: 12,
        },
        {
          city: "Bandar Lampung & Palembang",
          terminalOrAirport: "Terminal Rajabasa / KM 12",
          operators: ["PO DAMRI", "PO SAN", "PO Epa Star"],
          priceRangeRp: "Rp 230.000 - Rp 450.000",
          travelDurationEst: "6 - 9 Jam (Via Tol Bakauheni)",
          dailyTripsCount: 18,
        },
      ],
    },
  ],

  // 2. BANDARA INTERNASIONAL SOEKARNO-HATTA (CGK)
  "stop-shia-t3": [
    {
      id: "shia-domestic-java-bali",
      category: "DOMESTIC_ISLAND",
      groupName: "Domestik - Jawa, Bali & Nusa Tenggara",
      destinations: [
        {
          city: "Denpasar, Bali (DPS)",
          terminalOrAirport: "Bandara I Gusti Ngurah Rai",
          operators: ["Garuda Indonesia", "Batik Air", "Citilink", "Super Air Jet", "AirAsia"],
          priceRangeRp: "Rp 850.000 - Rp 1.950.000",
          travelDurationEst: "1 Jam 50 Menit",
          dailyTripsCount: 48,
        },
        {
          city: "Surabaya (SUB)",
          terminalOrAirport: "Bandara Internasional Juanda",
          operators: ["Garuda Indonesia", "Citilink", "Lion Air", "Batik Air"],
          priceRangeRp: "Rp 700.000 - Rp 1.400.000",
          travelDurationEst: "1 Jam 30 Menit",
          dailyTripsCount: 32,
        },
        {
          city: "Lombok / Mataram (LOP)",
          terminalOrAirport: "Bandara Internasional Zainuddin Abdul Madjid",
          operators: ["Garuda Indonesia", "Citilink", "Batik Air", "Lion Air"],
          priceRangeRp: "Rp 950.000 - Rp 1.800.000",
          travelDurationEst: "2 Jam",
          dailyTripsCount: 16,
        },
      ],
    },
    {
      id: "shia-domestic-sumatra-kalimantan",
      category: "DOMESTIC_ISLAND",
      groupName: "Domestik - Sumatra, Kalimantan & Sulawesi",
      destinations: [
        {
          city: "Medan (KNO)",
          terminalOrAirport: "Bandara Internasional Kualanamu",
          operators: ["Garuda Indonesia", "Batik Air", "Citilink", "Lion Air"],
          priceRangeRp: "Rp 1.100.000 - Rp 2.200.000",
          travelDurationEst: "2 Jam 20 Menit",
          dailyTripsCount: 26,
        },
        {
          city: "Balikpapan (BPN - IKN Hub)",
          terminalOrAirport: "Bandara Internasional Sultan Aji Muhammad Sulaiman Sepinggan",
          operators: ["Garuda Indonesia", "Citilink", "Batik Air", "Pelita Air"],
          priceRangeRp: "Rp 1.200.000 - Rp 2.100.000",
          travelDurationEst: "2 Jam 15 Menit",
          dailyTripsCount: 22,
        },
        {
          city: "Makassar (UPG)",
          terminalOrAirport: "Bandara Internasional Sultan Hasanuddin",
          operators: ["Garuda Indonesia", "Batik Air", "Citilink", "Lion Air"],
          priceRangeRp: "Rp 1.250.000 - Rp 2.300.000",
          travelDurationEst: "2 Jam 30 Menit",
          dailyTripsCount: 24,
        },
      ],
    },
    {
      id: "shia-intl-asia-oceania",
      category: "INTERNATIONAL_ZONE",
      groupName: "Internasional - ASEAN, Asia Pasifik & Timur Tengah",
      destinations: [
        {
          city: "Singapura (SIN)",
          terminalOrAirport: "Singapore Changi Airport",
          operators: ["Singapore Airlines", "Garuda Indonesia", "Scoot", "Batik Air"],
          priceRangeRp: "Rp 1.200.000 - Rp 4.500.000",
          travelDurationEst: "1 Jam 45 Menit",
          dailyTripsCount: 30,
        },
        {
          city: "Kuala Lumpur (KUL)",
          terminalOrAirport: "Kuala Lumpur International Airport",
          operators: ["Malaysia Airlines", "AirAsia", "Batik Air", "Garuda Indonesia"],
          priceRangeRp: "Rp 950.000 - Rp 3.200.000",
          travelDurationEst: "2 Jam",
          dailyTripsCount: 22,
        },
        {
          city: "Tokyo (HND / NRT)",
          terminalOrAirport: "Tokyo Haneda & Narita Airport",
          operators: ["ANA (All Nippon Airways)", "Japan Airlines", "Garuda Indonesia"],
          priceRangeRp: "Rp 5.500.000 - Rp 14.000.000",
          travelDurationEst: "7 Jam 30 Menit",
          dailyTripsCount: 6,
        },
        {
          city: "Jeddah / Madinah (JED / MED)",
          terminalOrAirport: "King Abdulaziz International Airport",
          operators: ["Saudia", "Garuda Indonesia", "Lion Air Umrah"],
          priceRangeRp: "Rp 8.500.000 - Rp 18.000.000",
          travelDurationEst: "9 Jam 45 Menit",
          dailyTripsCount: 8,
        },
      ],
    },
  ],

  // 3. PELABUHAN MUARA ANGKE / KALI ADEM & TANJUNG PRIOK
  "stop-maritime-angke": [
    {
      id: "maritime-seribu",
      category: "REGIONAL_CITY",
      groupName: "Gugusan Kepulauan Seribu (Speedboat)",
      destinations: [
        {
          city: "Pulau Pari",
          terminalOrAirport: "Dermaga Pulau Pari",
          operators: ["Dishub DKI (KM Trans)", "Speedboat Marina", "Kapal Tradisional"],
          priceRangeRp: "Rp 54.000 - Rp 150.000",
          travelDurationEst: "1 Jam 15 Menit",
          dailyTripsCount: 8,
        },
        {
          city: "Pulau Tidung",
          terminalOrAirport: "Dermaga Jembatan Cinta",
          operators: ["Dishub DKI (KM Trans)", "Speedboat Express"],
          priceRangeRp: "Rp 64.000 - Rp 175.000",
          travelDurationEst: "1 Jam 45 Menit",
          dailyTripsCount: 6,
        },
        {
          city: "Pulau Pramuka (Pusat Kab. Adm)",
          terminalOrAirport: "Dermaga Utama Pramuka",
          operators: ["Dishub DKI (KM Trans)", "Speedboat Marina"],
          priceRangeRp: "Rp 64.000 - Rp 175.000",
          travelDurationEst: "2 Jam",
          dailyTripsCount: 6,
        },
        {
          city: "Pulau Harapan & Kelapa",
          terminalOrAirport: "Dermaga Pulau Harapan",
          operators: ["Dishub DKI (KM Trans)", "Kapal Cepat Dishub"],
          priceRangeRp: "Rp 74.000 - Rp 190.000",
          travelDurationEst: "2 Jam 30 Menit",
          dailyTripsCount: 4,
        },
      ],
    },
    {
      id: "maritime-pelni",
      category: "DOMESTIC_ISLAND",
      groupName: "Pelayaran Nusantara PELNI (Tanjung Priok)",
      destinations: [
        {
          city: "Surabaya & Makassar",
          terminalOrAirport: "Pelabuhan Tanjung Perak / Soekarno-Hatta Makassar",
          operators: ["PT PELNI (KM Dorolonda / KM Sinabung)"],
          priceRangeRp: "Rp 240.000 - Rp 780.000",
          travelDurationEst: "24 - 48 Jam",
          dailyTripsCount: 2,
        },
        {
          city: "Batam & Belawan Medan",
          terminalOrAirport: "Pelabuhan Batu Ampar / Belawan",
          operators: ["PT PELNI (KM Kelud)"],
          priceRangeRp: "Rp 320.000 - Rp 980.000",
          travelDurationEst: "32 - 54 Jam",
          dailyTripsCount: 2,
        },
      ],
    },
  ],

  // 4. EXECUTIVE SHUTTLE POOL FX SUDIRMAN
  "stop-shuttle-fx": [
    {
      id: "shuttle-bandung",
      category: "REGIONAL_CITY",
      groupName: "Bandung Raya & Priangan",
      destinations: [
        {
          city: "Bandung (Dipatiukur / Pasteur)",
          terminalOrAirport: "Pool DayTrans Dipatiukur / CitiTrans Pasteur",
          operators: ["DayTrans", "CitiTrans", "Baraya Travel", "Bhinneka Shuttle"],
          priceRangeRp: "Rp 110.000 - Rp 140.000",
          travelDurationEst: "2 Jam 15 Menit (Via Tol Cipularang)",
          dailyTripsCount: 32,
        },
        {
          city: "Bandung (Buah Batu / Cihampelas)",
          terminalOrAirport: "Pool Baraya Buah Batu / CitiTrans Cihampelas",
          operators: ["Baraya Travel", "CitiTrans"],
          priceRangeRp: "Rp 115.000 - Rp 145.000",
          travelDurationEst: "2 Jam 30 Menit",
          dailyTripsCount: 20,
        },
        {
          city: "Cirebon & Sukabumi",
          terminalOrAirport: "Pool Bhinneka Cirebon / Siliwangi Trans",
          operators: ["Bhinneka Shuttle", "Siliwangi Trans"],
          priceRangeRp: "Rp 120.000 - Rp 150.000",
          travelDurationEst: "3 - 3,5 Jam",
          dailyTripsCount: 14,
        },
      ],
    },
  ],
};
