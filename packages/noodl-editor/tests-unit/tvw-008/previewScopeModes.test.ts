/**
 * TVW-008 §6.5 — the third mode, and the six behaviours it changed silently.
 *
 * 🔴 **The whole point of this file is that `tsc` had nothing to say.** Adding
 * `{ mode: 'board' }` to `PreviewScope` type-checked clean, because nothing
 * switched on `scope.mode`: every site derived `const isBench = scope.mode ===
 * 'bench'` and then asked `!isBench`. With two modes that meant *the app*; with
 * three it means *the app **or** the board*, and the compiler cannot see the
 * difference because a boolean is still a boolean.
 *
 * So the table below is not decoration. Each `'board'` row is a behaviour that
 * would have been wrong, and `showsAppPreview({ mode: 'board' }) === false` is
 * the assertion the old `!isBench` fails.
 */
import {
  APP_SCOPE,
  BOARD_SCOPE,
  assertNeverScope,
  isDivergedFromCanvas,
  isMounted,
  scopeChipIconKind,
  scopeChipLabel,
  showsAppPreview,
  showsBench,
  showsBoard,
  type PreviewScope
} from '../../src/editor/src/views/VisualCanvas/previewScope';
import { BOARD } from '../../src/editor/src/views/VisualCanvas/benchWords';

const BENCH_SCOPE: PreviewScope = { mode: 'bench', target: '/Sections/Hero' };

describe('TVW-008 — the three modes of the one surface', () => {
  it('the board scope carries no target', () => {
    // Deliberate: its membership is project state (`bench.board`), so a target
    // here would be a second place for that to live and a second one to go
    // stale. A test because it is the kind of field someone "helpfully" adds.
    expect(BOARD_SCOPE).toEqual({ mode: 'board' });
    expect(Object.keys(BOARD_SCOPE)).toEqual(['mode']);
  });

  describe('showsAppPreview — the predicate that replaced `!isBench`', () => {
    it('is true for the app', () => {
      expect(showsAppPreview(APP_SCOPE)).toBe(true);
    });

    it('is false for the bench', () => {
      expect(showsAppPreview(BENCH_SCOPE)).toBe(false);
    });

    it('🔴 is false for the BOARD — the assertion `!isBench` fails', () => {
      // The six sites this decides: the preview strip, the design chrome, the
      // viewport size read-out, the app webview's hidden class, and the two
      // SCSS hooks. Every one of them describes a route and a viewport, which
      // the board has neither of.
      expect(showsAppPreview(BOARD_SCOPE)).toBe(false);
    });
  });

  describe('showsBench / showsBoard', () => {
    it.each([
      ['app', APP_SCOPE, false, false],
      ['bench', BENCH_SCOPE, true, false],
      ['board', BOARD_SCOPE, false, true]
    ])('%s mode', (_label, scope, bench, board) => {
      expect(showsBench(scope as PreviewScope)).toBe(bench);
      expect(showsBoard(scope as PreviewScope)).toBe(board);
    });

    it('the three predicates are mutually exclusive and total', () => {
      // A mode that answered `true` twice, or `false` three times, would put the
      // surface in two states at once or in none — and both read on screen as
      // "the preview is broken" rather than as a routing bug.
      for (const scope of [APP_SCOPE, BENCH_SCOPE, BOARD_SCOPE]) {
        const answers = [showsAppPreview(scope), showsBench(scope), showsBoard(scope)];
        expect(answers.filter(Boolean)).toHaveLength(1);
      }
    });
  });

  describe('the chip says which of the three it is showing', () => {
    it('names the app', () => {
      expect(scopeChipLabel(APP_SCOPE)).toBe('App');
    });

    it('names the benched component by its leaf', () => {
      expect(scopeChipLabel(BENCH_SCOPE)).toBe('Hero');
    });

    it('🔴 names the BOARD — the ternary it replaced labelled it "App"', () => {
      // `isBench ? benchTargetLabel(scope.target) : 'App'`, on the one control
      // whose entire job is to say which of three things you are looking at.
      expect(scopeChipLabel(BOARD_SCOPE)).toBe(BOARD);
      expect(scopeChipLabel(BOARD_SCOPE)).not.toBe('App');
    });

    it('takes its word from the vocabulary module, not a literal', () => {
      // R-G: a name enforced by separate copies decays the first time one copy
      // is edited. `benchWords` is where the Workbench's nouns live.
      expect(BOARD).toBe('Board');
    });

    it('🔴 does NOT say "All components", which is what R-7 removed', () => {
      // The old name promised a membership the surface no longer has.
      expect(scopeChipLabel(BOARD_SCOPE)).not.toMatch(/all/i);
    });

    it.each([
      ['app', APP_SCOPE, 'app'],
      ['bench', BENCH_SCOPE, 'component'],
      ['board', BOARD_SCOPE, 'board']
    ])('gives %s mode its own icon kind', (_label, scope, kind) => {
      expect(scopeChipIconKind(scope as PreviewScope)).toBe(kind);
    });

    it('gives the three modes three DIFFERENT icons', () => {
      const kinds = [APP_SCOPE, BENCH_SCOPE, BOARD_SCOPE].map(scopeChipIconKind);
      expect(new Set(kinds).size).toBe(3);
    });
  });

  describe('the existing bench predicates are unmoved by a third mode', () => {
    it('the board is not mounting anything', () => {
      expect(isMounted(BOARD_SCOPE, '/Sections/Hero')).toBe(false);
    });

    it('the board cannot diverge from the canvas', () => {
      // FIX-019's chip offers to re-point the bench at the canvas's component.
      // The board is not pointed at one component, so there is nothing to
      // re-point and a chip saying otherwise would be an offer that does
      // nothing.
      expect(isDivergedFromCanvas(BOARD_SCOPE, '/Pages/Home')).toBe(false);
    });
  });

  describe('assertNeverScope — what makes a FOURTH mode a compile error', () => {
    it('throws, naming the scope it could not handle', () => {
      // Reached only when a switch has fallen through, which the types say
      // cannot happen — so it has to say what arrived, or the report is "an
      // error occurred" from a surface that knows exactly what went wrong.
      expect(() => assertNeverScope({ mode: 'gallery' } as never)).toThrow(/gallery/);
    });

    it('is what every mode switch ends with', () => {
      // A guard nobody calls is a guard that does not guard. Read out of the
      // source so a switch that quietly loses its default arm is caught here
      // rather than by the next person to add a mode.
      //
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source: string = require('fs').readFileSync(
        require('path').join(__dirname, '../../src/editor/src/views/VisualCanvas/previewScope.ts'),
        'utf8'
      );
      const switches = source.match(/switch \(scope\.mode\)/g) ?? [];
      const guards = source.match(/return assertNeverScope\(scope\)/g) ?? [];
      expect(switches.length).toBeGreaterThanOrEqual(5);
      expect(guards).toHaveLength(switches.length);
    });
  });
});
