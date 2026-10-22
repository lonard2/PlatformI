# PlatformI Intercity Gateway and Ticketing — Design
Date: 2026-10-22
Status: Draft for review (not approved to build)

## 1. Intent and why
PlatformI is a Jakarta and Jabodetabek-first transit app. Users asked for honest connections to other cities, islands, and countries without turning the home map into a national map.

The answer is exit doors, not second-class maps. The interior network (MRT, LRT, KRL, TransJakarta, MikroTrans) keeps prominent map space and live markers. Intercity modes — KAI intercity trains, Whoosh, airport flights, maritime ships and speedboats, AKAP buses, executive shuttles and travel — live as gateway boards at Jakarta hubs plus one search-first ticket hub. A traveler can see every arrival and departure, its stops, its live status, and buy a ticket, without the app ever drawing hundreds of far-away markers.

Why this shape: performance (no markers or vehicles rendered outside Jabodetabek), fairness (intercity does not compete visually with daily city transit), and truth (a board plus a schematic line is more honest than a fake precise dot over Surabaya).

## 2. Goals
- Every intercity departure and arrival is findable from its Jakarta gateway (Gambir, Pasar Senen, Halim, Soekarno-Hatta CGK, Halim HLP, Pulo Gebang, Kampung Rambutan, Kalideres, Tanjung Priok, Muara Angke and Marina Ancol), delivered in phased slices, not all at once.
- Each trip shows a full timetable with stops, plus a followable live status.
- One ticket hub serves two entries: from a trip board and from search by mode, company, and route.
- Checkout reuses the existing wallet (TicketPurchaseModal and DigitalPassWallet merged, not a parallel store).
- Buyer identity is PlatformI account first, manual fallback second.
- Seat and class selection where the operator actually sells it.
- Per-mode preference matrix so no one is offered a fake choice (for example no drop-off on rail, no free meal on Argo Executive).

## 3. Non-goals
- No real payment gateway or airline PNR integration in this pass. Checkout produces a wallet reservation with code and QR, viewable and cancellable, with successful, waiting, failed, and refund states where feasible.
- No live GPS outside Jabodetabek. Outside the region the trip is a schematic progress line, not a map marker.
- No machine translation of operator entity names. Operator, station, and place nouns stay in Indonesian.

## 4. Anti-goals (failure even if it technically works)
- Intercity markers cluttering the home map or slowing it down.
- A rail buyer offered a door drop-off that never happens.
- An Argo Executive buyer promised a free meal the operator does not serve.
- An AKAP buyer asked for a home address the bus will never serve.
- Forcing login before search. Search is open, identity is collected at purchase.

## 5. Constraints
- Map renders live vehicle markers only inside the Jabodetabek bounding box. Outside, trips render as a schematic origin to destination line with stop ticks and a position fraction.
- Six-locale i18n (en, id, ja, zh, ko, ar). All new UI copy goes through dictionaries with the same key set. Indonesian proper nouns stay untranslated.
- Zero raw emojis, Lucide icons only. Strict TypeScript, no `any`. Zero placeholder stubs.
- Existing verification gates stay: `npx tsc --noEmit`, `npm test`, detector on touched surfaces, `git diff --check`, one commit per task with push.

## 6. What was decided (as decided)
### 6.1 Placement: hybrid with schematic progress
Chosen over a separate Keluar Jakarta tab and over full-map intercity dots. The home map stays interior-only. Each gateway hub owns arrival and departure boards. Each trip has a detail view with stops, status, and a schematic Jakarta to destination line. A Follow this trip action jumps to the timetable detail and schematic, never pans the map to another island. Board rows show operator, trip code, times, and price from.

### 6.2 Ticket hub: board path plus search path
Both land in the same checkout and wallet. Search filters by mode (rail, AKAP, shuttle, flight, ship), company (KAI, KCIC, Garuda, Citilink, Lion, Batik, PELNI, Sinar Jaya, DayTrans, Baraya, and others as data), and route (origin, destination, date). Search is open without login. Purchase requires buyer identity. Guests may complete purchase logged out; they keep ticket access through PDF, email, ticket code, or a dedicated lookup page, while logged-out payment details and purchase history are not saved into the app database.

### 6.3 Buyer profile
Core from account with manual fallback. Mandatory for every purchase: full name, phone number, email (used for ticket information and retrieval). Optional: sex, address. Conditionally mandatory ID number: required for flights, KAI intercity rail, and PELNI ships; optional for AKAP and shuttle unless the operator requires it. Preferences are per-mode (see matrix), including meal preference, prayer space request, and drop-off note. Phone is the retrieval key for guests.

### 6.4 Seat and class
Visual seat or deck map per vehicle wins over class-only auto-assign. Class changes the map and the price. Unavailable seats are blocked. Applies to bus 2-2, sleeper 1-1-1, train coaches, flight rows, and ship decks. Shuttle rush checkout may still offer fastest-available as a shortcut inside the same map, not as a separate flow.

### 6.5 Per-mode sales matrix (strict, not everything-optional)
Hidden means not shown. Optional means shown but skippable. Required means checkout blocks.

- Flight low-cost (Lion, Citilink, Wings): seat map paid, meal pre-book paid, baggage prepaid. ID required.
- Flight full-service (Garuda, Batik): seat map, meal included, baggage included. ID required.
- KAI intercity all classes including Argo Executive: seat map, no drop-off field at all. ID required. Argo Executive has no free meal; food is bought onboard. Only Luxury and Suite Class bundle meal plus snacks.
- Whoosh: seat map, First class adds meal handling. ID required.
- AKAP bus: seat map, boarding at terminal or agen and pool only. No door drop-off field at all. Meal only as rest-stop note where the operator serves it.
- Shuttle and travel (DayTrans, Baraya, and peers): seat map plus drop-off as a choice from that operator's own pickup and drop point list. Free address entry is not allowed. Meal only if the operator offers it.
- PELNI ship and speedboat: deck or cabin choice, meal where served. ID required.

### 6.7 Data and phasing (your calls)
- Intercity timetables, stops, prices, and company lists are ingested new, replacing existing intercity data where possible, rather than patching the old seed.
- Delivery is sliced gateway by gateway and mode by mode, never everything at once. Suggested first slice is one rail gateway plus the ticket hub skeleton, then flights, then road and sea.
- Wallet reservation is the bare minimal contract: code plus QR, view and cancel, with successful, waiting, failed, and refund flows where feasible.
### 6.6 Status and tracking
Trips carry timetable-derived times plus a live state (on time, boarding, delayed, running, arrived). Live map dots render only when the vehicle is inside the region box. Outside, status plus schematic fraction is the tracking surface, fed by the same timetable and headway data already in the app.

## 7. Left to the builder
- Exact Jabodetabek bounding box values and marker culling implementation.
- Schematic line component reuse versus new component, and its stop-tick interaction.
- Gateway hub list as data versus hard-coded config, and boarding-point data shape per AKAP operator.
- Wallet record schema extension for ID, seat, class, meal, baggage, and operator point references.
- Which existing ticketing components merge first and in what order, behind what flag if any.
- Seat map layouts per vehicle type and how blocked seats are sourced.
- Analytics for board to search to purchase conversion.

## 8. Builder-check calls (settled without changing what gets built)
- Live status outside the region is timetable plus simulation-clock interpolation, no external operator feed. Same engine pattern as the existing simulation, extended to a schematic fraction.
- Search defaults for this pass: origin defaults to Jakarta gateways, destination is anywhere the dataset covers, date is a single day, company list is data-driven from the dataset.
- Operator overrides live as data fields per operator and route, not hard-coded branches. ID accepts NIK or passport with basic format checks.

## 9. Open threads for the reviewer
- None intentionally left. Builder check will surface any.
