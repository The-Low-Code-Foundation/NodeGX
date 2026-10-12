# @nodegx/canvas-look

The NodeGX canvas look as data, for an editor that is not the NodeGX editor: the category colour schemes (card
base, header, outline, text, highlighted), the chip accents, the wire colours (data, signal, error; normal,
highlighted, pulsing), the card metrics (150 × 36, corner radius 9, header chip 22, port row 20…), the structure
lane (padding 12, eyebrow 22, radius 10, the 4% wash, `STRUCTURE`), the fonts, the wire-label chip and the dot
grid, in **both themes**. Phase 112, OWN-005.

**Generated, not written.** `scripts/canvas-look/generate.js` runs the editor's own `CanvasTheme` against the real
token CSS (`colors.css`, `:root` and `[data-theme='light']`), parses `NodeGraphEditorNode`'s statics and imports
`StructureLane`, and writes `src/look.ts`. `tests/look.test.js` fails when that file is stale, and holds the
runtime's second palette (`nodelibraryexport.ts`) within 16 per channel of the dark schemes, the way the editor's
Electron-only spec does, but in the fast suite. Memory's *a second copy of a palette drifts silently* is why.

```ts
import { look, nodeScheme, wireColors } from '@nodegx/canvas-look';
nodeScheme('visual').base;          // the card body for a visual node, dark theme
wireColors('signal', 'light').normal;
look.card.size;                     // { width: 150, height: 36 }
look.lane.eyebrowLabel;             // 'STRUCTURE'
```

Not projected: the glyph inside the header chip is drawn with strokes by the painter (code, not data). An editor
that wants its own look ignores this package; one that wants NodeGX's reads it and draws nothing from memory.
In this repository, `npm run canvas-look` regenerates, `npm run canvas-look:check` grades.
