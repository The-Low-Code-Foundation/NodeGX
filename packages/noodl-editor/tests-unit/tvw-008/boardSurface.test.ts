/**
 * TVW-008 slice 2 — the rules the board's surface runs on.
 *
 * `ComponentBoard.tsx` imports `Icon`, whose `require.context` fails ts-jest at
 * load, so nothing written in that file can be reached from here. That is the
 * reason `boardSurface.ts` exists as a separate module and the reason this file
 * is worth having: every decision the surface makes that a person can see is
 * made in a function, and every one of them is below.
 */
import {
  BOARD_ADD,
  BOARD_ADD_ALL,
  BOARD_DRAG_THRESHOLD,
  BOARD_EMPTY_BODY,
  BOARD_EMPTY_TITLE,
  CAPTION_SEPARATOR,
  DEFAULT_BOARD_VIEWPORT,
  MAX_BOARD_ZOOM,
  MIN_BOARD_ZOOM,
  NO_INPUTS_SET,
  UNPLACED,
  boardCaptionRest,
  boardExportSignature,
  boardFrameCaption,
  boardFrameCaptionText,
  boardPickerRows,
  boardSizeLabel,
  clampBoardZoom,
  isBoardDrag,
  panBoard,
  zoomBoardAt
} from '../../src/editor/src/views/VisualCanvas/boardSurface';
import type { BenchTarget } from '../../src/editor/src/views/VisualCanvas/previewScope';

const frame = (over: Partial<Parameters<typeof boardFrameCaption>[0]> = {}) => ({
  target: '/Components/Primary Button',
  instances: 4,
  width: 360,
  height: 200,
  scenario: 'default',
  ...over
});

describe('TVW-008 — the caption under a frame', () => {
  it('reads as §2 writes it', () => {
    expect(boardFrameCaptionText(frame())).toBe('Primary Button · ×4 · 360 × 200 · scenario: default');
  });

  it('is returned in parts, so the name can carry its own weight', () => {
    expect(boardFrameCaption(frame())).toEqual({
      label: 'Primary Button',
      usage: '×4',
      size: '360 × 200',
      values: 'scenario: default'
    });
  });

  it('joins its parts with the separator it exports', () => {
    const parts = boardFrameCaption(frame());
    expect(boardFrameCaptionText(frame())).toBe(
      [parts.label, parts.usage, parts.size, parts.values].join(CAPTION_SEPARATOR)
    );
  });

  describe('how many times it is placed', () => {
    it('counts instances', () => {
      expect(boardFrameCaption(frame({ instances: 1 })).usage).toBe('×1');
    });

    it('🔴 says the components panel’s word for nothing-places-it, not ×0', () => {
      // `rowMetaFor` returns `{ tone: 'unplaced', text: 'unplaced' }` and the
      // panel's tooltip is "Nothing in this app places this component". A board
      // saying `×0` — or `unused` — would be a second dialect for a fact the
      // panel two columns away is already stating.
      expect(boardFrameCaption(frame({ instances: 0 })).usage).toBe(UNPLACED);
      expect(UNPLACED).toBe('unplaced');
    });
  });

  describe('the size, which is measured wherever it has been measured', () => {
    it('reports the authored box before anything has rendered', () => {
      expect(boardSizeLabel(360, 200)).toBe('360 × 200');
    });

    it('🔴 says `auto` for a content-height frame rather than inventing 768', () => {
      // §6.4: 3 stored frames in 5,922 components, so `height: null` is the
      // case rather than the exception. `ESTIMATED_CONTENT_FRAME_HEIGHT` exists
      // to give the root Group a scroll extent; printing it beside a component
      // would be the tool stating a size the component never claimed.
      expect(boardSizeLabel(360, null)).toBe('360 × auto');
      expect(boardSizeLabel(360, null)).not.toContain('768');
    });

    it('prefers the measured box to the asked-for one', () => {
      expect(boardSizeLabel(360, 200, { width: 360, height: 412 })).toBe('360 × 412');
    });

    it('rounds a measured box, which arrives fractional from a zoomed layout', () => {
      expect(boardSizeLabel(360, null, { width: 359.6, height: 411.2 })).toBe('360 × 411');
    });
  });

  describe('where the values came from', () => {
    it('names the scenario', () => {
      expect(boardFrameCaption(frame({ scenario: 'sold out' })).values).toBe('scenario: sold out');
    });

    it('says so when there is none', () => {
      expect(boardFrameCaption(frame({ scenario: null })).values).toBe(NO_INPUTS_SET);
    });
  });
});

describe('TVW-008 — the strip caption, and the sentence AC7 already ruled out', () => {
  it('says how many components are on the board', () => {
    expect(boardCaptionRest(3)).toBe('— 3 components, side by side at their own sizes.');
  });

  it('counts one in the singular', () => {
    expect(boardCaptionRest(1)).toContain('1 component,');
    expect(boardCaptionRest(1)).not.toContain('1 components');
  });

  it('says the board is empty rather than saying “0 components”', () => {
    expect(boardCaptionRest(0)).toBe('— nothing on it yet.');
  });

  /**
   * 🔴 The pin. TVW-008's §2 was written with the mock's wording — *"Sample
   * values, not the app's data."* — and Richard cut exactly that sentence from
   * the bench caption on 2026-09-18 (TVW-001 AC7), because *sample* was doing
   * two jobs within 44px: the caption meant synthesised input values and the
   * summary below it meant backend records. The task file carries a standing
   * warning that its own strings still hold the retired phrasing.
   *
   * ⚠️ Asserted on the strip caption specifically, because that is the line
   * that would be tempted to re-tell it. The per-frame caption owns the values
   * story — `scenario: default` / `no inputs set` — and it says it per frame,
   * where the frame is.
   */
  it.each([0, 1, 3, 12])('🔴 never mentions data or samples (%i frames)', (count) => {
    const caption = boardCaptionRest(count);
    expect(caption).not.toMatch(/sample/i);
    expect(caption).not.toMatch(/data/i);
    expect(caption).not.toMatch(/real/i);
  });

  it('🔴 does not call the board “all components”, which is the name R-7 retired', () => {
    // R-7 reshaped this surface from every-component to a picked set; a caption
    // promising "all" on a board showing three is the quiet lie this phase
    // keeps finding in its own strings.
    expect(boardCaptionRest(3)).not.toMatch(/\ball\b/i);
    expect(BOARD_EMPTY_TITLE).not.toMatch(/\ball\b/i);
  });

  it('the empty state explains the surface rather than reporting a failure', () => {
    // §6.1 measured 23% of projects opening the board on nothing: the ordinary
    // first sight, and §2 had no arm for it at all.
    expect(BOARD_EMPTY_TITLE).toBe('Put components side by side');
    expect(BOARD_EMPTY_BODY).toMatch(/real sizes/);
    expect(BOARD_EMPTY_BODY).not.toMatch(/error|empty|nothing here/i);
  });

  it('the add controls are named once each', () => {
    expect(BOARD_ADD).toBe('Add components');
    expect(BOARD_ADD_ALL).toBe('Add all');
  });
});

describe('TVW-008 — the picker', () => {
  const targets: BenchTarget[] = [
    { name: '/Components/Card', label: 'Card', folder: 'Components' },
    { name: '/Components/Primary Button', label: 'Primary Button', folder: 'Components' },
    { name: '/Pages/Home', label: 'Home', folder: 'Pages' }
  ];

  it('marks what is already on the board', () => {
    const rows = boardPickerRows(targets, new Set(['/Components/Card']));
    expect(rows.map((row) => [row.name, row.placed])).toEqual([
      ['/Components/Card', true],
      ['/Components/Primary Button', false],
      ['/Pages/Home', false]
    ]);
  });

  it('🔴 keeps a placed row rather than filtering it out', () => {
    // A list that silently shortens as you pick from it loses the answer to
    // "did I add it?" — which on a surface whose whole subject is comparison is
    // the question being asked. An absent row is not an answer.
    const rows = boardPickerRows(targets, new Set(targets.map((target) => target.name)));
    expect(rows).toHaveLength(targets.length);
    expect(rows.every((row) => row.placed)).toBe(true);
  });

  it('carries the label and folder through untouched', () => {
    const [row] = boardPickerRows(targets, new Set());
    expect(row.label).toBe('Card');
    expect(row.folder).toBe('Components');
  });

  it('holds its input order — `benchTargets` already sorted it', () => {
    const rows = boardPickerRows(targets, new Set());
    expect(rows.map((row) => row.name)).toEqual(targets.map((target) => target.name));
  });
});

describe('TVW-008 — the viewport', () => {
  it('opens at 100%, one gutter in from the corner', () => {
    expect(DEFAULT_BOARD_VIEWPORT.zoom).toBe(1);
  });

  describe('the zoom range', () => {
    it('clamps both ends', () => {
      expect(clampBoardZoom(0.001)).toBe(MIN_BOARD_ZOOM);
      expect(clampBoardZoom(99)).toBe(MAX_BOARD_ZOOM);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'reads a non-finite zoom (%p) as 1 rather than as a blank board',
      (zoom) => {
        // ⚠️ `Infinity` is deliberately 1 and NOT `MAX_BOARD_ZOOM`, which is
        // what this assertion said until the code corrected it. Clamping it to
        // the ceiling would treat a junk number as a request — someone's stored
        // viewport reopening at 400% with no gesture behind it. Not finite is
        // not a zoom, and 1 is the only reading that shows the board.
        expect(clampBoardZoom(zoom)).toBe(1);
      }
    );

    it('🔴 has no 25% floor — R-7 removed the reason for one', () => {
      // §6.2's floor existed to make an every-component board fit, and measured
      // that it could not: 46% of projects could not be shown whole at 25%. A
      // picked set of three frames has no fitting problem.
      expect(MIN_BOARD_ZOOM).toBeLessThan(0.25);
    });
  });

  describe('zooming about the pointer', () => {
    it('keeps the board point under the pointer under the pointer', () => {
      const before = { x: 40, y: 20, zoom: 1 };
      const pointer = { x: 300, y: 200 };
      const boardPoint = { x: (pointer.x - before.x) / before.zoom, y: (pointer.y - before.y) / before.zoom };

      const after = zoomBoardAt(before, 2, pointer);

      expect(after.x + boardPoint.x * after.zoom).toBeCloseTo(pointer.x, 6);
      expect(after.y + boardPoint.y * after.zoom).toBeCloseTo(pointer.y, 6);
    });

    it('🔴 solves the offset with the CLAMPED zoom, so the board stops moving when it stops scaling', () => {
      // The mutant this kills: solving with the requested factor and clamping
      // afterwards. The gesture then stops scaling at the end of the range but
      // never stops moving — which reads as the board slipping out from under
      // the cursor while nothing appears to be happening.
      const atCeiling = { x: 10, y: 10, zoom: MAX_BOARD_ZOOM };
      expect(zoomBoardAt(atCeiling, 2, { x: 300, y: 200 })).toBe(atCeiling);

      const atFloor = { x: 10, y: 10, zoom: MIN_BOARD_ZOOM };
      expect(zoomBoardAt(atFloor, 0.5, { x: 300, y: 200 })).toBe(atFloor);
    });

    it('returns the same viewport for a factor that changes nothing', () => {
      const viewport = { x: 10, y: 10, zoom: 1 };
      expect(zoomBoardAt(viewport, 1, { x: 0, y: 0 })).toBe(viewport);
      expect(zoomBoardAt(viewport, Number.NaN, { x: 0, y: 0 })).toBe(viewport);
    });
  });

  describe('panning', () => {
    it('moves by the delta', () => {
      expect(panBoard({ x: 10, y: 20, zoom: 2 }, 5, -5)).toEqual({ x: 15, y: 15, zoom: 2 });
    });

    it('is unclamped — §5 asks that a frame dragged far away stay reachable', () => {
      expect(panBoard({ x: 0, y: 0, zoom: 1 }, -90000, -90000).x).toBe(-90000);
    });

    it('returns the same viewport for a no-op or a junk delta', () => {
      const viewport = { x: 1, y: 2, zoom: 1 };
      expect(panBoard(viewport, 0, 0)).toBe(viewport);
      expect(panBoard(viewport, Number.NaN, 0)).toBe(viewport);
    });
  });

  describe('the drag threshold', () => {
    it('separates a click from a drag', () => {
      expect(isBoardDrag(0, 0)).toBe(false);
      expect(isBoardDrag(BOARD_DRAG_THRESHOLD - 1, 0)).toBe(false);
      expect(isBoardDrag(0, BOARD_DRAG_THRESHOLD)).toBe(true);
      expect(isBoardDrag(-BOARD_DRAG_THRESHOLD, 0)).toBe(true);
    });

    it('is small — a frame is hundreds of pixels, and TVW-005’s failure was the other way', () => {
      // There, 13px on a 26px row made an ordinary click register as a drag.
      expect(BOARD_DRAG_THRESHOLD).toBeLessThan(13);
    });
  });
});

describe('TVW-008 — when the export must be rebuilt, which is what makes a drag cheap', () => {
  const origin = { minX: 0, minY: 0 };

  it('🔴 does not change when a frame moves within the current origin', () => {
    // This is AC5's cheapness in one assertion. A changed export makes the
    // runtime call `location.reload()`, so a signature that carried positions
    // would flash the whole board — every frame re-rendered, every scroll
    // position inside every component lost — each time somebody nudged one.
    //
    // ⚠️ The two arms carry **different coordinates**, deliberately. Written
    // with the same frames in both, this assertion would pass on a signature
    // that hashed every position — it would be comparing a value with itself
    // and grading nothing at all.
    const before = [
      { target: '/A', x: 0, y: 0 },
      { target: '/B', x: 400, y: 0 }
    ];
    const after = [
      { target: '/A', x: 0, y: 0 },
      { target: '/B', x: 917, y: 640 }
    ];
    expect(boardExportSignature(after, origin)).toBe(boardExportSignature(before, origin));
  });

  it('changes when a component joins the board', () => {
    expect(boardExportSignature([{ target: '/A' }], origin)).not.toBe(
      boardExportSignature([{ target: '/A' }, { target: '/B' }], origin)
    );
  });

  it('changes when a component leaves it', () => {
    expect(boardExportSignature([{ target: '/A' }, { target: '/B' }], origin)).not.toBe(
      boardExportSignature([{ target: '/A' }], origin)
    );
  });

  it('🔴 changes when the ORIGIN moves, because every other frame’s offset just changed', () => {
    // `boardHarness` normalises every frame through `boardBounds`, so
    // `marginLeft` is `x - minX`. A drop that goes past the current top-left
    // extreme changes `minX` for everything; a live `parameterChanged` alone
    // would then be computing its offset from an origin the document no longer
    // has, leaving every frame that did not move silently off by the
    // difference.
    expect(boardExportSignature([{ target: '/A' }], { minX: 0, minY: 0 })).not.toBe(
      boardExportSignature([{ target: '/A' }], { minX: -200, minY: 0 })
    );
    expect(boardExportSignature([{ target: '/A' }], { minX: 0, minY: 0 })).not.toBe(
      boardExportSignature([{ target: '/A' }], { minX: 0, minY: -50 })
    );
  });

  it('distinguishes a reordering from a rename, which a naive join would not', () => {
    // Separated by a character a legacy name cannot contain, rather than by a
    // comma, so two components whose names concatenate to the same string do
    // not share a signature — and so the board does not keep an export built
    // for a membership it no longer has.
    expect(boardExportSignature([{ target: '/A,B' }], origin)).not.toBe(
      boardExportSignature([{ target: '/A' }, { target: 'B' }], origin)
    );
  });
});
