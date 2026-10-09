# OWN-005 — The look, as a projection

**Opened 2026-10-02.** **Depends on R5** (README §8). Can start before it: the generator is useful even if the
package stays private.
**Status: 🟢 built, s1 (2026-10-03), before R5: the package is private until R5 and R2 rule. Gates in §6.**
**Model:** Built. A follow-up (a new theme token, the parity gate) is Opus work. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **A home-made editor can look exactly like the NodeGX canvas, cards, colours, wires, the structure lane, and it
> stays that way when the editor's look changes.**

## 2. Why

README §1 reading 7. The prototype's first version looked like nothing in NodeGX and could not be shown; the second
copied the canvas by reading three files and was recognised at once. That copy is the third copy of the palette:
`CanvasTheme` derives the node schemes from CSS tokens, `nodelibraryexport.ts` keeps a literal second copy held honest
by `CanvasThemeNodeSchemes.test.ts`, and the prototype keeps a third held honest by nothing. Memory: *a second copy of
a palette drifts silently*.

## 3. What to build

1. **`@nodegx/canvas-look`**: plain data and two or three pure helpers. The category schemes (`default`, `visual`,
   `data`, `javascript`, `component`: base, header, outline, highlight, text), wire colours (data, signal, pulse),
   card metrics (`NodeGraphEditorNode.size`, `cornerRadius`, `headerChipSize`, `propertyConnectionHeight`,
   `childMargin`, `childSpacing`), the structure lane constants (`structureLane.ts`), the fonts, the header-chip glyph
   per category, and the dot grid. Dark and light.
2. **Generated, not written.** A script reads `CanvasTheme`'s fallbacks and derivation and the node and lane constants
   and writes the package's data file. A gate fails when the file is stale, the way `spec-census:check` does.
3. **The prototype reads it** and deletes its constants.

## 4. Acceptance criteria

1. The generator runs in the fast suite; changing a `CanvasTheme` fallback without regenerating fails a gate.
2. The prototype draws from the package and looks the same (one screenshot before and after, compared by eye and by a
   pixel diff on the Graph stage).
3. The package has no dependency on the editor at run time.

## 5. Watch for

- `CanvasTheme` reads CSS custom properties at run time (`--theme-color-bg-0` and others) and falls back to literals.
  The package carries the fallbacks and the derivation, and says plainly that an editor in a page has no
  `--theme-color-*` unless it sets them.
- Memory: *a CSS property whose default equals the test value matches everything*. Compare derived colours with a
  value that differs from every default.

## 6. Built

**s1, 2026-10-03, on `96a6167e2`+.**

1. **`@nodegx/canvas-look`** (`packages/nodegx-canvas-look`, private): `src/look.ts` is GENERATED and carries, for
   **both themes**, every colour `CanvasTheme` resolves (the base tokens, the derived grid dot, selection glow,
   highlighted wires, the six category chip colours, the six node schemes), the three wire colour sets (data, signal,
   error; normal, highlighted, pulsing), `CanvasFonts`, `WireLabel`, `GRID_CELL_SIZE`, `WIRE_TYPE_ERROR`, the 13 card
   metrics and the 8 structure-lane constants. `src/index.ts` has three lookup helpers (`nodeScheme`,
   `categoryColors`, `wireColors`) with no rule of their own: the wire colours per type come out of the generator
   by calling `connectionColors()`, so even that three-line rule is not copied.
2. **Generated, not written** (§3.2): `scripts/canvas-look/generate.js` bundles the editor's `CanvasTheme.ts` and
   `structureLane.ts` with esbuild and RUNS them under a fake document whose `getComputedStyle` answers from the
   real `colors.css` (`:root` for dark, `[data-theme='light']` over it, `var()` resolved by the script), records
   `instance.colors` and `connectionColors()` per theme, then once more with no document for the headless
   fallbacks: **if the fallbacks differ from the dark CSS the generator fails**, which is the drift the fallback
   table exists not to have (it did not differ today). `NodeGraphEditorNode`'s statics are parsed from source (the
   class imports half the editor) and `headerTextInset`'s formula is checked, not assumed. `--check` exits 1 when
   `look.ts` is stale; `tests/look.test.js` runs it, so a change to any of the four sources without a regeneration
   is red in `test:packages` (the package is in the lerna scope). The same test holds the runtime's second palette
   (`nodelibraryexport.ts`) within 16 per channel of the dark schemes, the Electron-only spec's tolerance, now in
   the fast suite. Root scripts `canvas-look`, `canvas-look:check`.
3. **The prototype reads it** (§3.3, AC2): `page.html` lost `SCHEMES`, `WIRE`, `GROUND`, the card metrics (150,
   20, 8, 20, 10) and the lane numbers (12, 34, 10, 0.05, `STRUCTURE`); it reads `NGX.look`, `NGX.nodeScheme` and
   `NGX.wireColors` from the bundle. Rebuilt; `#selftest` 0 / 3, `#demo` 3 / 3 in headless Chrome. **The pixel
   diff on the Graph stage (1040 × 740 at 1400 × 900):** 11.34% of pixels moved by a level or two per channel,
   0.01% (55 px) by more than 16 summed, by eye identical: the prototype had copied the runtime's second palette,
   and `CanvasTheme` reproduces it "to within a couple of levels per channel" by its own comment; the 55 pixels
   are the lane wash going from the prototype's 0.05 to the editor's 0.04. The copy was already drifting by a
   level and a hundredth, which is the point.
4. **AC3**: the package imports nothing at run time (`src/index.ts` → `src/look.ts`); the generator is the only
   thing that touches the editor, at generation time.

**Not projected:** the glyph inside the header chip (`paintCategoryGlyph`, strokes in code). Named in the README.
**Not done:** an npm publish (R2, R5).
