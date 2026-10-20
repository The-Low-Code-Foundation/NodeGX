/**
 * TWO-003 — the marketplace's look, from the picture the builder said yes to (TWO-002, `look/marketplace.html`):
 * adire indigo, a saffron accent, paper with a blue cast; Bricolage Grotesque for headings, Atkinson Hyperlegible for
 * everything else. Tokens over the `modern` preset, so the spacing and type scales are the product's own.
 *
 * @module noodl-mcp/tests/two003Look
 */
export const TWO003_PRESET = 'modern';

export const TWO003_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  { name: '--font-sans', value: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif' },
  { name: '--font-display', value: '"Bricolage Grotesque", "Avenir Next", "Segoe UI", system-ui, sans-serif' },
  { name: '--background', value: '#f7f8fc' },
  { name: '--foreground', value: '#151a33' },
  { name: '--surface', value: '#ffffff' },
  { name: '--surface-raised', value: '#ffffff' },
  { name: '--muted', value: '#eef0f6' },
  { name: '--muted-foreground', value: '#5d6485' },
  // The saffron: the one filled action on a screen.
  { name: '--primary', value: '#f2b705' },
  { name: '--primary-hover', value: '#d9a404' },
  { name: '--primary-foreground', value: '#151a33' },
  // The indigo: the bar, outlines, the chosen tab.
  { name: '--secondary', value: '#1f2a5c' },
  { name: '--secondary-hover', value: '#2e3d80' },
  { name: '--secondary-foreground', value: '#ffffff' },
  { name: '--accent', value: '#e3e8fb' },
  { name: '--accent-foreground', value: '#1f2a5c' },
  { name: '--destructive', value: '#a3271f' },
  { name: '--destructive-foreground', value: '#ffffff' },
  { name: '--border', value: '#dfe3f0' },
  { name: '--border-subtle', value: '#eef0f6' },
  { name: '--border-strong', value: '#5d6485' },
  { name: '--border-control', value: '#c9cee3' },
  { name: '--ring', value: '#f2b705' },
  { name: '--radius-md', value: '10px' },
  { name: '--radius-lg', value: '12px' },
  { name: '--radius-xl', value: '14px' },
  // The status pills: selling / on sale, stopped / off sale.
  { name: '--ok', value: '#1e7a4f' },
  { name: '--ok-bg', value: '#e2f4ea' },
  { name: '--bad', value: '#a3271f' },
  { name: '--bad-bg', value: '#fbe4e1' },
  { name: '--warn', value: '#8a5a00' },
  { name: '--warn-bg', value: '#fff2cc' },
  // WhatsApp's own green, on the one button that opens it (the picture's).
  { name: '--whatsapp', value: '#1f8f4e' }
];

/**
 * The two faces, and a focus ring a person on a keyboard can see. Fonts load from Google; offline, system fonts.
 *
 * Then what the buyer's pages (slice 2) draw that a node's parameters can't: a grid of cards two across on a phone and
 * four on a tablet, square photos, rows that scroll sideways on a phone, the shelves beside the products on a tablet,
 * and a product's photos swiped one at a time on a phone. 720 px is where the picture's tablet layout starts.
 *
 * And slice 3's: the bottom bar held at the foot of the screen, the admin's tabs (indigo words over a saffron line), a
 * row's words taking the room left beside a total, an order part's six steps sharing the width, and the order's parts
 * two across on a tablet.
 */
export const TWO003_CSS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&display=swap');
body { font-family: var(--font-sans); }
.mk-display { font-family: var(--font-display) !important; }
.mk-app :focus-visible { outline: 3px solid var(--ring) !important; outline-offset: 2px; }
.mk-num { font-variant-numeric: tabular-nums; }
.mk-pointer, .mk-card { cursor: pointer; }
.mk-card { overflow: hidden; }
.mk-wrap { white-space: normal !important; overflow-wrap: anywhere; }
.mk-left { text-align: left !important; justify-content: flex-start !important; }
.mk-nowrap { white-space: nowrap; }
.mk-chips, .mk-strip { flex-wrap: nowrap !important; overflow-x: auto; padding-bottom: 2px; }
.mk-chips > *, .mk-strip > * { flex: none !important; }
.mk-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mk-square { aspect-ratio: 1 / 1; height: auto !important; }
.mk-gallery { display: flex !important; flex-direction: row !important; overflow-x: auto; scroll-snap-type: x mandatory; gap: 8px; }
.mk-gallery > * { flex: 0 0 100% !important; scroll-snap-align: start; }
.mk-photo { aspect-ratio: 4 / 3; height: auto !important; }
.mk-nav { position: sticky; bottom: 0; z-index: 5; margin-top: auto; border-top: 1px solid var(--border); }
.mk-grow, .mk-step { flex: 1 1 0 !important; min-width: 0; }
.mk-tabs { border-bottom: 1px solid var(--border); }
.mk-row2 > * { flex: 1 1 140px !important; min-width: 0; }
.mk-tab { flex: 1 1 0 !important; border-radius: 0 !important; color: var(--muted-foreground) !important; border-bottom: 3px solid transparent !important; }
.mk-tab-on { color: var(--secondary) !important; border-bottom-color: var(--primary) !important; }
.mk-stepname { white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 719px) {
  .mk-stepname { font-size: 10px !important; }
  .mk-tabs-many { flex-wrap: nowrap !important; overflow-x: auto; }
  .mk-tabs-many .mk-tab { flex: none !important; width: auto !important; white-space: nowrap; padding-left: 12px !important; padding-right: 12px !important; }
}
@media (min-width: 720px) {
  .mk-parts { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
  .mk-phone-only { display: none !important; }
  .mk-split { flex-direction: row !important; align-items: flex-start !important; column-gap: 18px; }
  .mk-split > .mk-chips { flex-direction: column !important; align-items: stretch !important; row-gap: 8px; width: 200px !important; flex: none !important; overflow: visible; }
  .mk-split > .mk-chips .mk-chip { width: 100% !important; text-align: left !important; justify-content: flex-start !important; }
  .mk-split > :not(.mk-chips) { flex: 1 1 0 !important; min-width: 0; }
  .mk-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .mk-two { flex-direction: row !important; align-items: flex-start !important; column-gap: 18px; }
  .mk-two > * { flex: 1 1 0 !important; min-width: 0; }
  .mk-gallery { display: grid !important; grid-template-columns: 1fr 1fr; overflow: visible; }
  .mk-gallery > :first-child { grid-column: span 2; }
}
`;
