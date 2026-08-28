---
name: PlatformI
description: Multimodal regional transit intelligence in a glass cockpit.
colors:
  background: "#090d16"
  foreground: "#f1f5f9"
  glass-bg: "rgba(15, 23, 42, 0.75)"
  glass-border: "rgba(255, 255, 255, 0.1)"
  glass-card: "rgba(30, 41, 59, 0.65)"
  accent-cyan: "#06b6d4"
  accent-blue: "#2563eb"
  accent-emerald: "#10b981"
  accent-amber: "#f59e0b"
  accent-rose: "#f43f5e"
  muted-text: "#94a3b8"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.04em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "linear-gradient(to right, {colors.accent-cyan}, {colors.accent-blue})"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-secondary:
    backgroundColor: "rgba(15, 23, 42, 0.7)"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  glass-panel:
    backgroundColor: "{colors.glass-bg}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.75rem"
  status-chip:
    backgroundColor: "rgba(8, 47, 73, 0.8)"
    textColor: "{colors.accent-cyan}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "0.125rem 0.375rem"
---

# Design System: PlatformI

## Overview

**Creative North Star: "The Regional Control Room"**

PlatformI is a curious, expressive transit instrument: a live regional network is treated as something to inspect, understand, and act on rather than as a passive map. Its incumbent visual system combines a midnight field, translucent glass layers, bright mode-specific signals, compact labels, and motion that suggests an active operating network.

The system is intentionally technical without becoming a generic SaaS dashboard. Transit colors carry network meaning, while cyan is reserved for interaction and live navigation. The density is high because the product serves both commuters and transit enthusiasts, but controls should remain disciplined enough for a user checking a journey on the move.

**Key Characteristics:**

- Map-centered regional awareness
- Electric transit spectrum for mode and status signals
- Layered glass surfaces over a dark cartographic field
- Compact, instrument-like labels with occasional mono telemetry
- Expressive interaction states restrained by operational clarity

## Colors

The palette is an electric transit spectrum: a deep blue-black foundation carries high-visibility cyan, blue, emerald, amber, rose, and operator-specific route colors.

### Primary

- **Signal Cyan**: Primary interaction, active navigation, live-state emphasis, map controls, and selected transit surfaces.
- **Route Blue**: Secondary navigation, ticketing, and accelerated map states.

### Secondary

- **Service Emerald**: Healthy operation, movement, successful check-in, and positive comfort states.
- **Caution Amber**: Boarding, paused simulation, warnings, and attention states.
- **Critical Rose**: Critical disruptions, high-risk status, and urgent operational emphasis.

### Neutral

- **Midnight Field**: The application background and cartographic canvas.
- **Cloud Text**: Primary text and high-contrast icon color.
- **Muted Slate**: Supporting labels, inactive navigation, and secondary metadata.
- **Glass Boundary**: Low-opacity white borders that define translucent surfaces without creating a hard panel grid.
- **Glass Surface**: Translucent blue-slate panels used for headers, controls, sheets, and telemetry.

### Named Rules

**The Signal Rarity Rule.** Use cyan, emerald, amber, and rose to communicate state or action; do not turn every surface into an accent surface.

**The Network Color Rule.** Preserve operator and route colors where they identify real transit systems. Do not normalize every line into the product accent.

## Typography

**Display Font:** System sans stack with Segoe UI and Roboto fallbacks.

**Body Font:** System sans stack with Segoe UI and Roboto fallbacks.

**Label/Mono Font:** UI monospace stack for codes, counters, fares, and telemetry values.

**Character:** The type system is compact, neutral, and highly legible. Sans text carries the passenger-facing interface; mono text signals operational data and machine-readable identifiers.

### Hierarchy

- **Title** (700, 1rem, 1.25): Section titles, brand name, and high-value drawer headings.
- **Body** (400, 0.875rem, 1.5): Explanations, descriptions, and primary content.
- **Label** (600, 0.625rem, 1.25, slight tracking): Navigation labels, statuses, action text, and compact metadata.
- **Mono** (500, 0.6875rem, 1.25): Route codes, fare values, simulation multipliers, timestamps, and telemetry counters.

### Named Rules

**The Readable Signal Rule.** Compact labels may be dense, but status, action, and route information must remain readable without relying on hover.

## Layout

The primary shell is a full-viewport map cockpit. A compact header and transportation system bar sit above the cartography viewport; alerts occupy a pinned strip; drawers and sheets float over the map; telemetry remains in a narrow footer on larger screens.

Desktop uses a wide map-first composition with floating right-side controls and docked detail drawers. Tablet retains the map as the primary canvas while shifting navigation and actions toward the bottom edge. Mobile uses a full-height map with a fixed bottom navigation bar, slide-up or full-width drawers, safe-area padding, and compact touch-friendly controls.

The spacing rhythm is tight and operational. Controls cluster in small groups, related values sit close together, and translucent surfaces use consistent internal padding rather than large marketing-page whitespace. Horizontal transit groups scroll rather than forcing the entire network into a compressed single row.

## Elevation & Depth

PlatformI uses layered glass. Depth comes from translucent blue-slate surfaces, backdrop blur, subtle borders, tonal contrast, and restrained black shadows. The map remains visually open beneath the interface; controls, alerts, wallets, and inspectors float above it as separate operational layers. Chrome surfaces that must stay legible directly over live cartography (system bar, mobile navigation, trays, menus) use the dedicated `--glass-chrome` token (rgba(8, 12, 22, 0.98)) — near-opaque by intent, distinct from the standard 0.75 glass.

### Shadow Vocabulary

- **Control Lift**: A dark, broad shadow under floating controls and compact menus.
- **Accent Glow**: A localized cyan, blue, amber, emerald, or rose glow used only for selected or high-priority states.
- **Drawer Depth**: A stronger dark shadow that separates a sheet or wallet from the live map.

### Named Rules

**The Glass Boundary Rule.** A glass panel needs a quiet border or tonal contrast so it does not dissolve into the map.

**The Map Remains Open Rule.** Depth should separate controls from cartography, not cover the network with opaque decoration.

## Shapes

The form language uses gently rounded rectangles throughout: compact controls use medium corners, cards and panels use larger corners, and statuses or system labels use pill or small-chip silhouettes. Borders are thin and low-opacity. Sharp corners are reserved for map geometry and route lines, not passenger-facing controls.

Interactive elements use a visible state change through color, border, glow, or tonal lift. Rounded surfaces should not be stacked excessively; a drawer may contain cards, but every nested layer must have a clear semantic purpose.

## Components

### Buttons

- **Shape:** Compact rounded rectangles with medium corners; elevated actions may use larger corners.
- **Primary:** Cyan-to-blue signal gradient, white text, compact label typography, and a localized shadow/glow.
- **Hover / Focus:** Increase signal brightness, border visibility, or tonal lift. Focus must remain visible without relying on hover.
- **Secondary / Ghost:** Translucent midnight surface with a low-opacity border and muted text that brightens on interaction.

### Chips

- **Style:** Small rounded labels with translucent color-tinted backgrounds, thin borders, and mono or compact bold text.
- **State:** Selected chips use a stronger accent surface and border; status chips preserve the meaning of the underlying transit or service color.

### Cards / Containers

- **Corner Style:** Medium-to-large rounded corners for cards and panels.
- **Background:** Glass surface over the midnight field, with stronger opacity for menus and sheets.
- **Shadow Strategy:** Use control lift for floating elements and accent glow only for active or urgent states.
- **Border:** Thin glass boundary by default; accent border for selected or status-critical surfaces.
- **Internal Padding:** Tight, consistent spacing based on the small-to-large rhythm.

### Inputs / Fields

- **Style:** Dark translucent field, thin glass boundary, compact sans text, and medium corners.
- **Focus:** Cyan border or ring with enough contrast to remain visible over map content.
- **Error / Disabled:** Rose for actionable errors; muted slate and reduced emphasis for disabled fields. Never communicate state by color alone.

### Navigation

- **Style:** Header navigation is compact and horizontal on desktop; mobile navigation is fixed at the bottom with labeled icons and a raised central action.
- **Default:** Muted slate text and icons on translucent midnight surfaces.
- **Active:** Cyan text, brighter icon, stronger surface, and a restrained signal glow.
- **Mobile Treatment:** Preserve safe-area padding, maintain thumb reach, and keep labels visible under icons.

### Alerts

Alerts use severity-specific signal colors, an icon, a concise title, and expandable detail. Critical and warning states may pulse gently, but the message, affected line, and available next action must remain stable and readable.

### Cartography Controls

Map controls float above the lower or upper map edge in grouped glass panels. Layer selection, simulation speed, zoom, and recentering are separate control groups so each group has one clear job.

## Do's and Don'ts

### Do:

- **Do** let route and operator colors carry real network meaning.
- **Do** use cyan as the primary interaction and live-navigation signal.
- **Do** keep map, alert, drawer, and telemetry layers visually distinct.
- **Do** use Lucide SVG icons with visible labels or accessible names.
- **Do** preserve responsive drawer, sheet, safe-area, and reduced-motion behavior.
- **Do** use the system sans stack for passenger text and mono text for telemetry.

### Don't:

- **Don't** turn the interface into a generic SaaS dashboard of interchangeable cards and KPI tiles.
- **Don't** reduce PlatformI to a plain map utility with undifferentiated pins.
- **Don't** use gradients, pulses, glow, or blur as decoration when they do not communicate state or hierarchy.
- **Don't** make compact type the only way to communicate essential journey information.
- **Don't** rely on hover, color alone, or icon-only controls for essential meaning.
- **Don't** obscure the cartographic canvas with opaque or excessively nested surfaces.
