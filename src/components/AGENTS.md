# Component Architecture Guidelines (src/components)

This directory houses all presentation components for PlatformI.

---

## 1. Structure
- `map/`: Interactive Leaflet map container, polyline route renderers, custom SVG marker layers, and overlay speed controls.
- `inspector/`: Vehicle detail drawer, coachbuilder/chassis technical specs, SVG cabin seating diagram, and photo carousel.
- `ticketing/`: Ticket purchase modal, dynamic rolling QR code generator, and digital pass wallet.
- `crowdsource/`: Commuter check-in modal, crowd density indicators, and community live feed.
- `alerts/`: Pinned disruption alert banner and network status drawer.
- `ai/`: Multi-model AI transit assistant dialog and model selector.
- `settings/`: App customization modal (themes, tile basemaps, motion, AI model selection).
- `layout/`: Responsive navbar, mobile bottom navigation bar, and desktop sidebar dock.

---

## 2. Design Standards
1. **Zero Emojis**: Replace any emoji with equivalent Lucide React SVG icons (`<Train />`, `<Bus />`, `<Plane />`, `<Ship />`, `<Zap />`, etc.).
2. **Framer Motion**: Use Framer Motion for smooth drawer transitions, modal backdrops, and active tab indicator animations.
3. **Accessibility**: All interactive elements must have clear ARIA attributes, focus states, and keyboard navigation support.
