# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

PlatformI serves two co-primary audiences in Jakarta and the Greater Jakarta metropolitan area (Jabodetabek):

- Daily commuters who need practical, multimodal journey, transfer, fare, disruption, and crowd information.
- Transit enthusiasts who want detailed vehicle, coachbuilder, station, hub, skybridge, and network intelligence.

## Product Purpose

PlatformI unifies public transportation intelligence across rail, bus, aviation, and maritime networks in a single interactive regional transit cockpit. It exists to make complex multimodal travel easier to understand and to make the underlying network useful to people who care about its operational and vehicle detail.

Success means users can understand the current network, inspect relevant transit detail, make better journey decisions, and use the platform confidently across desktop, tablet, and mobile web.

## Positioning

PlatformI is differentiated by transit-intelligence depth: it combines a live multimodal map with practical intermodal routing and fare intelligence, commuter-reported conditions, and enthusiast-grade vehicle and hub detail. The product is designed to expand from Jabodetabek to nationwide networks, with international and regional expansion kept as a future-compatible direction rather than a current scope commitment.

## Operating Context

Users interact with PlatformI while planning or monitoring journeys across Jakarta and Jabodetabek, often on mobile while commuting. The product presents moving fleet telemetry, route and hub relationships, disruption status, crowd reports, fares, dynamic passes, and transfer guidance. Transit enthusiasts may also use it as an exploratory reference for vehicle engineering, cabin layouts, coachbuilders, and intermodal infrastructure.

## Capabilities and Constraints

- Integrate rail, bus, air, and maritime transit modes in one regional network view.
- Render interactive high-contrast cartography with live simulated vehicle movement, route polylines, hubs, stops, and adjustable simulation speed.
- Provide vehicle and station/hub inspection, including technical specifications, seating diagrams, photo galleries, departure boards, accessibility information, and skybridge transfer guides.
- Support commuter check-ins, crowd-density and comfort reporting, and a time-decayed community feed.
- Calculate multimodal fares, including the JakLingko integrated tariff cap where applicable.
- Provide dynamic QR ticketing and a digital pass wallet.
- Provide a multi-model AI transit advisor using the designated OpenRouter models and an offline local fallback.
- Provide operator administration for fleet, alerts, route adjustments, and QR validation simulation.
- Preserve a responsive web experience across mobile, tablet, and desktop form factors.
- Keep TypeScript strict and domain models typed through the transit types.
- Keep production code free of placeholder stubs and raw emoji; use Lucide SVG icons for interface iconography.
- Maintain accessible interactions, focus states, labels, and keyboard support.
- Keep geographic expansion beyond Jabodetabek possible, including future nationwide and international/regional growth.

## Evidence on Hand

- Transit network and fleet dataset: `src/lib/data/jakarta-dataset.ts` and `prisma/seed.ts`.
- Main interactive cockpit: `src/app/page.tsx`.
- Technical architecture and feature inventory: `README.md`, `PROJECT.md`, and `docs/walkthrough.md`.
- Phase lessons and trade-off analysis: `docs/phase_critiques.md`.
- Automated verification: `tests/` and `npm test`.
- No user testimonials, customer case studies, or external deployment evidence are present in the repository; future work must not fabricate them.

## Product Principles

- Make complex multimodal networks legible without flattening their real differences.
- Put reliable journey utility and live operating context first.
- Reward curiosity with accurate, deep transit detail.
- Treat mobile, accessibility, and interruption tolerance as core product requirements.
- Expand the data model and experience without closing off future geographies.

## Accessibility & Inclusion

The product must support keyboard navigation, visible focus states, accessible labels, screen-reader-compatible interactions, adequate contrast, reduced motion preferences, and responsive use on mobile devices. Color and motion must not be the only way to communicate transit status or state.
