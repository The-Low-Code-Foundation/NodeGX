/**
 * TVW-001 (f) — the Workbench calls itself the Workbench.
 *
 * ⚠️ **These are the first assertions that have ever guarded this caption.** The handoff into this
 * slice said to "re-pin FIX-019's caption spec to the new text"; there was no such spec. FIX-019's
 * block in `tests/canvas/preview-scope.test.ts` pins `isDivergedFromCanvas` booleans and asserts no
 * strings at all, and a repo-wide search found nothing pinning `isolated component, not the app`.
 * The caption was unguarded for the whole of its life, which is why it could sit one ruling behind.
 *
 * So this grades the *words*, which is the thing R-G rules on, and it grades them where they are
 * composed rather than where they are drawn: `benchWords.ts` is the single module the caption, the
 * components-panel menu row and the preview scope picker all read from, and a test that pinned a
 * literal here instead of the exported constant would re-create exactly the three-dialect drift the
 * module exists to prevent.
 */

import {
  CAPTION_JOIN,
  OPEN_ON_WORKBENCH,
  WORKBENCH,
  benchCaption,
  benchCaptionRest
} from '../../src/editor/src/views/VisualCanvas/benchWords';

describe('TVW-001 (f) — the name', () => {
  it('is the word R-G ruled, capitalised as a product surface', () => {
    expect(WORKBENCH).toBe('Workbench');
  });

  it('names the surface in the components-panel row, and opens rather than shows', () => {
    // FIX-019's row said "Show in workbench": lower-case, and a verb that read as a preview toggle
    // rather than as the second of the two ways to open what was right-clicked. It sits directly
    // under `Open`, so it reads as one of a pair.
    expect(OPEN_ON_WORKBENCH).toBe('Open on the Workbench');
    expect(OPEN_ON_WORKBENCH).toContain(WORKBENCH);
  });

  it('never says the retired words', () => {
    // The three terms AC6 greps for. Asserted on the composed caption, because that is the string a
    // person reads — `benchCaptionRest` alone would pass while the caption around it failed.
    const caption = benchCaption('Card');
    expect(caption.toLowerCase()).not.toContain('isolated component');
    expect(caption.toLowerCase()).not.toContain('sandbox');
    expect(caption.toLowerCase()).not.toContain('on the bench');
  });
});

describe('TVW-001 (f) — the caption', () => {
  it('leads with the surface, then the subject', () => {
    // The order is the point: FIX-019's caption led with the component name and never said where it
    // was, so the one word a person needs in order to ask for this surface again was absent.
    expect(benchCaption('Card')).toBe('Workbench — Card on its own, not the app. Sample values.');
  });

  it('joins its two drawn halves with the non-breaking space it is drawn with', () => {
    // `VisualCanvas` draws the name and the sentence as two elements. This is the assertion that
    // stops the pure function and the rendered pair from disagreeing about what sits between them:
    // an ordinary space here would let the dash wrap onto its own line at 240px.
    expect(CAPTION_JOIN).toBe(' ');
    expect(benchCaption('Card')).toBe(`${WORKBENCH}${CAPTION_JOIN}${benchCaptionRest('Card')}`);
  });

  it('says the component is on its own and that the app is not what is running', () => {
    expect(benchCaptionRest('Card')).toBe('— Card on its own, not the app. Sample values.');
  });

  it('carries whatever label it is handed, including one that needs no shortening', () => {
    expect(benchCaption('Really Long Component Name')).toContain('Really Long Component Name on its own');
  });

  it('claims sample values — which is true of this surface, and checked', () => {
    // 🔴 This sentence is a **claim about the mount**, not decoration. `ComponentBench` calls
    // `buildBenchExport` without `useSampleData` (whose default is `true`) and mounts the viewer
    // with `useSampleData: true` hardcoded, with no toggle on the surface — two independent reads
    // agreeing. The authoring sandbox, which *can* be pointed at a real backend, says so in its own
    // summary line and does not draw this caption.
    //
    // If a data toggle ever reaches this surface, this assertion is the one that should fail, and
    // the fix is to give `benchCaptionRest` a parameter — never to delete the sentence.
    expect(benchCaptionRest('Card')).toContain('Sample values.');
  });
});
