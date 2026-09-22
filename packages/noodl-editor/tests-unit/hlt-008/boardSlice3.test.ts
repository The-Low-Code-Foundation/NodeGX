/**
 * P99 HLT-008 — the board, slice 3: the rules behind Richard's six, graded where a spec can see them.
 *
 * ⚠️ **These are the offline half.** The acceptance arms are `scripts/devtools/drive-hlt008-board.js`,
 * which performs each gesture on a running board and reads the surface (20/20 fixed, 9/20 on the
 * control build). What is graded here is what those arms stand on: the harness sets ports the
 * runtime actually has, the chrome's words come from the mode, and the boxes that feed the border,
 * the clip and the extent are one answer.
 *
 * 🔴 **The first describe replaces a spec that passed on the defect.** `board-export.test.ts`
 * asserted `parameters.layout === 'none'` — reading back the literal the harness wrote — while Group
 * has no `layout` port, so every frame stacked in a column and its content drew under the frame
 * before it. A spec that re-reads a literal grades the literal. This one grades every key against
 * the node catalog's declared inputs for `Group`, which `npm run catalog:check` keeps in step with
 * the runtime's source.
 */

import * as fs from 'fs';
import * as path from 'path';

import { WORKBENCH } from '../../src/editor/src/views/VisualCanvas/benchWords';
import {
  BOARD_FRAME_CLASS,
  BOARD_MEASURE_EXPRESSION,
  DEFAULT_BOARD_VIEWPORT,
  ESTIMATED_CONTENT_FRAME_HEIGHT,
  boardClipPath,
  boardDocumentExtent,
  boardFrameBoxes,
  boardFrameClass,
  boardFrameParameters,
  boardRootParameters,
  readBoardMeasure,
  sameBoardMeasure,
  type BoardFrameBox
} from '../../src/editor/src/views/VisualCanvas/boardSurface';
import { APP_SCOPE, BOARD_SCOPE, scopeChromeLabels, type PreviewScope } from '../../src/editor/src/views/VisualCanvas/previewScope';

type CatalogInput = { name: string; type?: { name?: string; enums?: { value: string }[] } | string };
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../noodl-types/src/node-catalog.json'), 'utf8')) as {
  nodes: { typeName: string; inputs?: CatalogInput[] }[];
};
const GROUP = CATALOG.nodes.find((node) => node.typeName === 'Group');
const GROUP_INPUTS = new Map((GROUP?.inputs ?? []).map((input) => [input.name, input]));

describe('HLT-008 — the harness sets ports Group actually has', () => {
  it('reads a real Group from the catalog (else every arm below grades an empty set)', () => {
    expect(GROUP).toBeDefined();
    expect(GROUP_INPUTS.size).toBeGreaterThan(20);
    // The known-firing control: the port the old harness used is NOT declared, so the check below
    // can fail — it would have failed on `layout`.
    expect(GROUP_INPUTS.has('layout')).toBe(false);
  });

  it('every root parameter is a declared Group input', () => {
    const keys = Object.keys(boardRootParameters({ width: 1952, height: 768 }));
    expect(keys.filter((key) => !GROUP_INPUTS.has(key))).toEqual([]);
  });

  it('every frame parameter is a declared Group input, in both size modes', () => {
    for (const height of [null, 180]) {
      const keys = Object.keys(boardFrameParameters({ x: 816, y: 40, width: 320, height }, { minX: 0, minY: 0 }, 1));
      expect(keys.filter((key) => !GROUP_INPUTS.has(key))).toEqual([]);
    }
  });

  it('the root asks for the enum value that positions children absolutely', () => {
    const port = GROUP_INPUTS.get('flexDirection');
    const enums = typeof port?.type === 'object' ? (port.type.enums ?? []).map((e) => e.value) : [];
    expect(enums).toContain('none');
    expect(boardRootParameters({ width: 10, height: 10 }).flexDirection).toBe('none');
  });

  it('each frame carries the class the editor measures it by, with its index', () => {
    const params = boardFrameParameters({ x: 0, y: 0, width: 768, height: null }, { minX: 0, minY: 0 }, 2);
    expect(String(params.cssClassName).split(' ')).toEqual([BOARD_FRAME_CLASS, boardFrameClass(2)]);
    expect(BOARD_MEASURE_EXPRESSION).toContain(`.${BOARD_FRAME_CLASS}`);
  });

  it('a content-sized frame sends no height, and offsets are normalised through the origin', () => {
    const params = boardFrameParameters({ x: -200, y: 30, width: 360, height: null }, { minX: -500, minY: 0 }, 0);
    expect(params.sizeMode).toBe('contentHeight');
    expect('height' in params).toBe(false);
    expect(params.marginLeft).toEqual({ value: 300, unit: 'px' });
    expect(params.marginTop).toEqual({ value: 30, unit: 'px' });
  });
});

describe('HLT-008 B1 — every word the preview chrome draws, per mode', () => {
  const BENCH: PreviewScope = { mode: 'bench', target: '/Buttons/Primary Button' };
  const all = (scope: PreviewScope) => {
    const labels = scopeChromeLabels(scope);
    return [labels.chip, labels.appRow, labels.boardRow, labels.listHeading, labels.boardPickerHeading].filter(
      (label): label is string => typeof label === 'string'
    );
  };

  it('on the board, no label says Workbench — chip, both rows, the list heading and the picker heading', () => {
    const labels = all(BOARD_SCOPE);
    expect(labels.length).toBe(5);
    expect(labels.filter((label) => label.includes(WORKBENCH))).toEqual([]);
  });

  it('control: off the board the list heading still names the Workbench, which is where a pick goes', () => {
    expect(scopeChromeLabels(APP_SCOPE).listHeading).toBe(WORKBENCH);
    expect(scopeChromeLabels(BENCH).listHeading).toBe(WORKBENCH);
  });

  it('the board row says the board\'s name in every mode — it said "Workbench board"', () => {
    for (const scope of [APP_SCOPE, BENCH, BOARD_SCOPE]) expect(scopeChromeLabels(scope).boardRow).toBe('Board');
  });

  it('only the board has a picker heading', () => {
    expect(scopeChromeLabels(APP_SCOPE).boardPickerHeading).toBeNull();
    expect(scopeChromeLabels(BENCH).boardPickerHeading).toBeNull();
    expect(scopeChromeLabels(BOARD_SCOPE).boardPickerHeading).not.toBeNull();
  });
});

describe('HLT-008 B2/B5 — one box per frame, feeding the border, the clip and the extent', () => {
  const origin = { minX: 0, minY: 0 };
  const mounts = [
    { x: 0, y: 0, width: 768, height: null },
    { x: 816, y: 0, width: 320, height: 180 },
    { x: 1184, y: 0, width: 768, height: null }
  ];

  it('before any measurement a content-sized frame stands in at the estimate, and says so', () => {
    const boxes = boardFrameBoxes(mounts, origin, []);
    expect(boxes[0]).toEqual({ x: 0, y: 0, width: 768, height: ESTIMATED_CONTENT_FRAME_HEIGHT, measured: false });
    expect(boxes[1].measured).toBe(true);
  });

  it('B2 — a measured content-sized frame is as tall as its content, not 768', () => {
    const boxes = boardFrameBoxes(mounts, origin, [{ width: 768, height: 47 }, undefined, { width: 768, height: 47 }]);
    expect(boxes.map((box) => box.height)).toEqual([47, 180, 47]);
  });

  it('a stored height wins over a measurement — the author said so', () => {
    const boxes = boardFrameBoxes(mounts, origin, [undefined, { width: 320, height: 46 }, undefined]);
    expect(boxes[1].height).toBe(180);
  });

  it('B5 — the frame being dragged is where it is NOW, for every reader', () => {
    const boxes = boardFrameBoxes(mounts, origin, [], { index: 1, x: 906, y: 70 });
    expect(boxes[1]).toMatchObject({ x: 906, y: 70 });
    expect(boardClipPath(boxes)).toContain('M906 70H1226V250H906Z');
    expect(boxes[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('positions are normalised through the origin', () => {
    const boxes = boardFrameBoxes([{ x: -300, y: -20, width: 100, height: 50 }], { minX: -300, minY: -20 }, []);
    expect(boxes[0]).toMatchObject({ x: 0, y: 0 });
  });
});

describe('HLT-008 B3 — the clip leaves the gutters to the board', () => {
  const boxes: BoardFrameBox[] = [
    { x: 0, y: 0, width: 768, height: 47, measured: true },
    { x: 816, y: 0, width: 320, height: 180, measured: true }
  ];

  it('one closed subpath per frame, and nothing across the 48px gutter', () => {
    const clip = boardClipPath(boxes);
    expect(clip).toBe(`path('M0 0H768V47H0Z M816 0H1136V180H816Z')`);
    // The gutter is x 768–816: no subpath edge lies inside it.
    const xs = Array.from(clip.matchAll(/[MH](\d+)/g)).map((m) => Number(m[1]));
    expect(xs.filter((x) => x > 768 && x < 816)).toEqual([]);
  });

  it('an empty board clips everything rather than showing a whole unclipped guest', () => {
    expect(boardClipPath([])).toBe('inset(100%)');
  });

  it('the document is never smaller than the frames or the export\'s own extent', () => {
    expect(boardDocumentExtent(boxes, { width: 1136, height: 768 })).toEqual({ width: 1136, height: 768 });
    expect(boardDocumentExtent([{ x: 900, y: 700, width: 320, height: 180, measured: true }], { width: 1136, height: 768 })).toEqual({
      width: 1220,
      height: 880
    });
  });

  it('the opening view leaves room for the first caption under the Add button', () => {
    // Caption ~21px above the frame; `Add components` pinned at top 8px, ~24px tall.
    expect(DEFAULT_BOARD_VIEWPORT.y - 21).toBeGreaterThanOrEqual(8 + 24);
  });
});

describe('HLT-008 — reading the client\'s measurement', () => {
  it('parses the triples the expression returns', () => {
    expect(readBoardMeasure('[[0,768,47],[1,320,180]]', 2)).toEqual([
      { width: 768, height: 47 },
      { width: 320, height: 180 }
    ]);
  });

  it('anything unusable is simply not a measurement', () => {
    expect(readBoardMeasure('not json', 2)).toEqual([undefined, undefined]);
    expect(readBoardMeasure('{"a":1}', 1)).toEqual([undefined]);
    expect(readBoardMeasure('[[5,10,10],[-1,10,10],[0,0,10],[0,"x",3]]', 2)).toEqual([undefined, undefined]);
  });

  it('a poll that changed nothing is the same picture (so it renders nothing)', () => {
    expect(sameBoardMeasure([{ width: 768, height: 47.2 }], [{ width: 768, height: 46.9 }])).toBe(true);
    expect(sameBoardMeasure([{ width: 768, height: 47 }], [{ width: 768, height: 90 }])).toBe(false);
    expect(sameBoardMeasure([undefined], [{ width: 1, height: 1 }])).toBe(false);
  });
});
