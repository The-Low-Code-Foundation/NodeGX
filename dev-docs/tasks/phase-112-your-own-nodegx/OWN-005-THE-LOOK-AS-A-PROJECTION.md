# OWN-005 — The look, as a projection

**Opened 2026-10-02.** **Depends on R5** (README §8). Can start before it: the generator is useful even if the
package stays private.
**Status: 📋 not started.**

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

*(empty)*
