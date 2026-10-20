/**
 * TWO-005 — the community app's look, from the picture the builder said yes to (TWO-002, `look/gram.html`): white,
 * ink, a deep plum, morning gold for the devotional; Literata to read, Mulish for everything else. Tokens over the
 * `modern` preset, as the marketplace's are, so the spacing and type scales are the product's own.
 *
 * @module noodl-mcp/tests/two005Look
 */
export const TWO005_PRESET = 'modern';

export const TWO005_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  { name: '--font-sans', value: '"Mulish", "Segoe UI", system-ui, sans-serif' },
  { name: '--font-display', value: '"Literata", Georgia, "Times New Roman", serif' },
  { name: '--background', value: '#ffffff' },
  { name: '--foreground', value: '#1c1620' },
  { name: '--surface', value: '#ffffff' },
  { name: '--surface-raised', value: '#ffffff' },
  { name: '--muted', value: '#f6f3f8' },
  { name: '--muted-foreground', value: '#776c7d' },
  // The plum: the one filled action on a screen, the role band, outlines.
  { name: '--primary', value: '#4a2160' },
  { name: '--primary-hover', value: '#5c2c77' },
  { name: '--primary-foreground', value: '#ffffff' },
  { name: '--secondary', value: '#4a2160' },
  { name: '--secondary-hover', value: '#5c2c77' },
  { name: '--secondary-foreground', value: '#ffffff' },
  { name: '--accent', value: '#f1e9f5' },
  { name: '--accent-foreground', value: '#4a2160' },
  // Morning gold: the devotional, the wordmark's a, the focus ring.
  { name: '--gold', value: '#c98a12' },
  { name: '--gold-soft', value: '#fbf1dc' },
  { name: '--gold-line', value: '#f0dcae' },
  { name: '--destructive', value: '#a3271f' },
  { name: '--destructive-foreground', value: '#ffffff' },
  { name: '--border', value: '#ece7ef' },
  { name: '--border-subtle', value: '#f3eff5' },
  { name: '--border-strong', value: '#776c7d' },
  { name: '--border-control', value: '#d9d1de' },
  { name: '--ring', value: '#c98a12' },
  { name: '--radius-md', value: '10px' },
  { name: '--radius-lg', value: '12px' },
  { name: '--radius-xl', value: '14px' },
  { name: '--heart', value: '#d4314c' },
  // "Let in": the picture's green.
  { name: '--ok', value: '#1e7a4f' },
  { name: '--ok-bg', value: '#e2f4ea' },
  { name: '--bad', value: '#a3271f' },
  { name: '--bad-bg', value: '#fbe4e1' }
];

/**
 * The two faces, a focus ring a person on a keyboard can see, and what a node's parameters can't draw: a list whose
 * rows share one border (the picture's `.list`), a round initial, and words that wrap rather than run off a phone. Slice
 * 2: square photos, a post's photos swiped one at a time, the new post's tiles four to a row, the gold rule box. Slice
 * 3: a profile's grid. Slice 4: the prayer card and the sections. Slice 5: the pills, the rules' lines.
 */
export const TWO005_CSS = `@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Mulish:wght@400;600;800&display=swap');
body { font-family: var(--font-sans); }
.gm-read { font-family: var(--font-display) !important; }
.gm-app :focus-visible { outline: 3px solid var(--ring) !important; outline-offset: 2px; }
.gm-wrap { white-space: normal !important; overflow-wrap: anywhere; }
.gm-grow { flex: 1 1 0 !important; min-width: 0; }
.gm-list { border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
.gm-list > * + * { border-top: 1px solid var(--border); }
.gm-av { flex: none !important; display: grid !important; place-items: center; border-radius: 50%; }
.gm-check input { width: 20px; height: 20px; accent-color: var(--primary); }
.gm-photo { aspect-ratio: 1 / 1; height: auto !important; display: block; }
.gm-gallery { display: flex !important; flex-direction: row !important; overflow-x: auto; scroll-snap-type: x mandatory; gap: 6px; }
.gm-gallery > * { flex: 0 0 100% !important; scroll-snap-align: start; }
.gm-tiles { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.gm-rule { background: var(--gold-soft); border: 1px solid var(--gold-line); border-radius: var(--radius-lg); }
/* A tablet is wide and short: a square photo the width of the column filled the screen and put the heart and the
   caption below the fold. There it is as tall as the screen leaves, cropped. */
@media (min-width: 720px) { .gm-gallery .gm-photo { aspect-ratio: auto; height: min(528px, calc(100vh - 240px)) !important; } }
/* Slice 3: a profile's grid, three across on a phone and five on a tablet, square tiles edge to edge. Each tile's
   button lies over its photo, so a keyboard reaches the post (a Group's click can't be reached). */
.gm-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px; }
@media (min-width: 720px) { .gm-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
.gm-tile { position: relative !important; aspect-ratio: 1 / 1; overflow: hidden; background: var(--muted); }
.gm-tile img { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; }
.gm-tile-hit { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; border-radius: 0 !important; }
.gm-count { flex: none !important; width: auto !important; }
.gm-tile-words { display: flex !important; align-items: flex-start !important; justify-content: flex-start !important; text-align: left; overflow: hidden; white-space: normal !important; overflow-wrap: anywhere; }
/* Slice 4: a prayer request is the picture's bordered card, its kind a small pill beside the name. */
.gm-prayer { border: 1px solid var(--border) !important; border-radius: 16px; padding: 14px 16px !important; }
.gm-kind { flex: none !important; width: auto !important; background: var(--accent); border-radius: 999px; padding: 3px 10px; }
/* The sections: a bar along the bottom of a phone, each its mark over its word; a rail down a tablet's left side.
   The screen keeps room for it, inside its own width. */
.gm-has-nav { box-sizing: border-box; padding-bottom: 72px; }
.gm-nav { position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 10; box-sizing: border-box; background: var(--surface); border-top: 1px solid var(--border); padding: 6px 4px 10px !important; }
.gm-nav-tab { display: block !important; flex: 1 1 0 !important; min-width: 0; white-space: pre-line !important; line-height: 1.3; text-align: center; }
/* The mark is the label's first line, drawn as large as the picture's (a Button's label is one text). */
.gm-nav-tab::first-line { font-size: 1.3rem; line-height: 1.2; }
/* Slice 5: the picture's pills (why a post was reported; hidden; in the feed), and rules kept in their own lines. */
.gm-pill { flex: none !important; width: auto !important; max-width: 100%; box-sizing: border-box; border-radius: 999px; padding: 3px 10px; line-height: 1.4; }
.gm-pill-bad { background: var(--bad-bg); color: var(--bad); }
.gm-pill-gold { background: var(--gold-soft); color: #7a5208; }
.gm-pill-quiet { background: var(--muted); color: var(--muted-foreground); }
.gm-pill-ok { background: var(--ok-bg); color: var(--ok); }
.gm-lines { white-space: pre-line !important; }
.gm-box { border: 1px solid var(--border); border-radius: var(--radius-xl); }
/* A Text Input puts its class on the textarea itself. */
textarea.gm-tall { min-height: 9rem !important; }
@media (min-width: 720px) {
  .gm-has-nav { padding-bottom: 0; padding-left: 200px; }
  .gm-nav { right: auto; top: 0; width: 200px !important; flex-direction: column !important; align-items: stretch !important; gap: 4px; border-top: 0; border-right: 1px solid var(--border); padding: 72px 10px 16px !important; }
  .gm-nav-tab { flex: none !important; white-space: normal !important; text-align: left; padding: 10px !important; border-radius: 10px !important; font-size: var(--text-sm) !important; }
  .gm-nav-tab::first-line { font-size: inherit; }
}
`;
