/**
 * TVW-008 — the board's rules, which decide what reaches `project.json`.
 *
 * Every function here is pure and lives outside React for the reason
 * `previewScope.ts` and `benchScenarios.ts` both give: a rule only a live driver
 * can check is a rule that does not get checked. These are the ones that decide
 * whether a drag dirties a project, whether a board survives a component being
 * deleted, and what a hand-edited `bench.board` does to the surface.
 */
import {
  ADD_ALL_LIMIT,
  BENCH_BOARD_KEY,
  BOARD_GUTTER,
  MAX_BOARD_COORD,
  MIN_BOARD_COORD,
  addBoardFrame,
  benchBoardStore,
  boardFramesPresentIn,
  canAddAll,
  moveBoardFrame,
  readBenchBoard,
  removeBoardFrame,
  type BoardFrame
} from '../../src/editor/src/views/VisualCanvas/benchBoard';

/** Every component is the 768 default unless a test says otherwise — §6.4's overwhelming case. */
const width768 = () => 768;

describe('TVW-008 — the stored key', () => {
  it('is namespaced beside the other two bench records', () => {
    // Not cosmetic: project metadata is a flat bag and the runtime is handed
    // every key verbatim.
    expect(BENCH_BOARD_KEY).toBe('bench.board');
  });
});

describe('TVW-008 — reading a board off disk', () => {
  it('reads the frames a project stores', () => {
    const frames = readBenchBoard({ frames: [{ target: '/Card', x: 10, y: 20 }] });
    expect(frames).toEqual([{ target: '/Card', x: 10, y: 20 }]);
  });

  it.each([
    ['nothing at all', undefined],
    ['null', null],
    ['a bare array — the shape §7.1 deliberately did NOT store', [{ target: '/Card', x: 0, y: 0 }]],
    ['a record with no frames key', { boards: [] }],
    ['a record whose frames is not an array', { frames: { target: '/Card' } }]
  ])('reads %s as an empty board rather than throwing', (_label, stored) => {
    // Tolerant in one direction only: this parses JSON a human can edit and a
    // merge can mangle, and the failure mode of a throw is a preview surface
    // that will not open at all.
    expect(readBenchBoard(stored)).toEqual([]);
  });

  it('drops an entry whose target names nothing', () => {
    const frames = readBenchBoard({
      frames: [{ target: '', x: 0, y: 0 }, { target: 5, x: 0, y: 0 }, { x: 0, y: 0 }, { target: '/Keep', x: 1, y: 2 }]
    });
    expect(frames).toEqual([{ target: '/Keep', x: 1, y: 2 }]);
  });

  it('keeps the first of two entries naming the same component', () => {
    // `addBoardFrame` refuses the second, so a file containing one was not
    // written by this code — but it is still a file we have to open.
    const frames = readBenchBoard({
      frames: [
        { target: '/Card', x: 1, y: 1 },
        { target: '/Card', x: 900, y: 900 }
      ]
    });
    expect(frames).toEqual([{ target: '/Card', x: 1, y: 1 }]);
  });

  it('reads a junk coordinate as 0 and KEEPS the frame', () => {
    // The distinction that matters: the component really was on the board.
    // Dropping it over a bad number would lose more than it protects.
    const frames = readBenchBoard({
      frames: [{ target: '/Card', x: 'left' as unknown as number, y: Number.NaN }]
    });
    expect(frames).toEqual([{ target: '/Card', x: 0, y: 0 }]);
  });

  it('clamps a coordinate that came back from disk out of range', () => {
    const frames = readBenchBoard({ frames: [{ target: '/Card', x: 9e9, y: -9e9 }] });
    expect(frames).toEqual([{ target: '/Card', x: MAX_BOARD_COORD, y: MIN_BOARD_COORD }]);
  });

  it('rounds a fractional coordinate on the way in', () => {
    expect(readBenchBoard({ frames: [{ target: '/Card', x: 10.6, y: -3.2 }] })).toEqual([
      { target: '/Card', x: 11, y: -3 }
    ]);
  });
});

describe('TVW-008 — what reaches disk', () => {
  it('writes the frames', () => {
    const frames: BoardFrame[] = [{ target: '/Card', x: 5, y: 6 }];
    expect(benchBoardStore(frames)).toEqual({ frames: [{ target: '/Card', x: 5, y: 6 }] });
  });

  it('clears the key entirely for an empty board', () => {
    // A project whose board was emptied is byte-identical to one that never had
    // a board: no key, no diff, nothing for a reviewer to wonder about.
    expect(benchBoardStore([])).toBeUndefined();
  });

  it('writes only the three fields, whatever else is hanging off the frame', () => {
    const frames = [{ target: '/Card', x: 1, y: 2, selected: true, measured: { w: 100 } }] as unknown as BoardFrame[];
    expect(benchBoardStore(frames)).toEqual({ frames: [{ target: '/Card', x: 1, y: 2 }] });
  });

  it('round-trips through read', () => {
    const frames: BoardFrame[] = [
      { target: '/Card', x: 0, y: 0 },
      { target: '/Nav', x: 816, y: 0 }
    ];
    expect(readBenchBoard(benchBoardStore(frames))).toEqual(frames);
  });
});

describe('TVW-008 — putting a component on the board', () => {
  it('lands the first frame at the origin', () => {
    expect(addBoardFrame([], '/Card', width768)).toEqual([{ target: '/Card', x: 0, y: 0 }]);
  });

  it('lands the next frame clear of the widest right edge', () => {
    const one = addBoardFrame([], '/Card', width768);
    const two = addBoardFrame(one, '/Nav', width768);
    expect(two[1]).toEqual({ target: '/Nav', x: 768 + BOARD_GUTTER, y: 0 });
  });

  it('measures that edge with each frame OWN width, not a shared default', () => {
    // §6.4: 3 of 5,922 components carry a stored width, so the mixed case is
    // rare and exactly the one a shared constant would get wrong.
    const widthOf = (target: string) => (target === '/Wide' ? 1280 : 360);
    const frames = addBoardFrame(addBoardFrame([], '/Wide', widthOf), '/Narrow', widthOf);
    expect(frames[1].x).toBe(1280 + BOARD_GUTTER);
  });

  it('places past a frame that was DRAGGED right, not past the one added last', () => {
    // The arithmetic is over positions, not over insertion order — otherwise a
    // rearranged board starts stacking new frames on top of old ones.
    let frames = addBoardFrame([], '/Card', width768);
    frames = moveBoardFrame(frames, '/Card', 5000, 0);
    frames = addBoardFrame(frames, '/Nav', width768);
    expect(frames[1].x).toBe(5000 + 768 + BOARD_GUTTER);
  });

  it('refuses a duplicate BY RETURNING THE SAME ARRAY', () => {
    // The identity is load-bearing, not incidental: React bails a state update
    // out on `Object.is`, so a refusal costs no render — and it makes "picking
    // it twice does nothing" gradeable here instead of on a screen.
    const one = addBoardFrame([], '/Card', width768);
    expect(addBoardFrame(one, '/Card', width768)).toBe(one);
  });

  it('refuses a target that names nothing, with the same identity', () => {
    const one = addBoardFrame([], '/Card', width768);
    expect(addBoardFrame(one, '', width768)).toBe(one);
  });
});

describe('TVW-008 — taking one off', () => {
  it('removes the named frame', () => {
    const frames = addBoardFrame(addBoardFrame([], '/Card', width768), '/Nav', width768);
    expect(removeBoardFrame(frames, '/Card')).toEqual([{ target: '/Nav', x: 816, y: 0 }]);
  });

  it('does NOT re-pack the frames that are left', () => {
    // Someone arranged these. Closing the gap would rearrange an arrangement
    // they made on purpose — which is the whole thing R-7 chose to build.
    const frames: BoardFrame[] = [
      { target: '/A', x: 0, y: 0 },
      { target: '/B', x: 1000, y: 0 },
      { target: '/C', x: 2000, y: 0 }
    ];
    expect(removeBoardFrame(frames, '/B')).toEqual([
      { target: '/A', x: 0, y: 0 },
      { target: '/C', x: 2000, y: 0 }
    ]);
  });

  it('is identity-stable when the target is not on the board', () => {
    const frames = addBoardFrame([], '/Card', width768);
    expect(removeBoardFrame(frames, '/Gone')).toBe(frames);
  });
});

describe('TVW-008 — the drop, which is the only thing that writes', () => {
  it('moves the frame to where it was dropped', () => {
    const frames = addBoardFrame([], '/Card', width768);
    expect(moveBoardFrame(frames, '/Card', 120, 340)).toEqual([{ target: '/Card', x: 120, y: 340 }]);
  });

  it('leaves the other frames untouched', () => {
    let frames = addBoardFrame(addBoardFrame([], '/A', width768), '/B', width768);
    frames = moveBoardFrame(frames, '/B', 10, 10);
    expect(frames[0]).toEqual({ target: '/A', x: 0, y: 0 });
  });

  it('🔴 returns the SAME array for a drop that changed nothing', () => {
    // This is AC5's mechanism, not a micro-optimisation. `setMetaData` calls
    // `scheduleProjectSave()` itself, so a surface that committed an unchanged
    // position would dirty the project for a click that moved nothing.
    const frames = addBoardFrame([], '/Card', width768);
    expect(moveBoardFrame(frames, '/Card', 0, 0)).toBe(frames);
  });

  it('keeps the frame where it is when the coordinate is junk', () => {
    // `clampBenchWidth`'s rule, and the phase-55 reason: a NaN reaching a style
    // property is a value that silently deletes the thing it was aimed at.
    const frames = addBoardFrame([], '/Card', width768);
    expect(moveBoardFrame(frames, '/Card', Number.NaN, 10)).toBe(frames);
    expect(moveBoardFrame(frames, '/Card', 10, Infinity)).toBe(frames);
  });

  it('clamps a drop outside the reachable range', () => {
    const frames = addBoardFrame([], '/Card', width768);
    expect(moveBoardFrame(frames, '/Card', 1e9, -1e9)).toEqual([
      { target: '/Card', x: MAX_BOARD_COORD, y: MIN_BOARD_COORD }
    ]);
  });

  it('is identity-stable for a frame that is not there', () => {
    const frames = addBoardFrame([], '/Card', width768);
    expect(moveBoardFrame(frames, '/Gone', 5, 5)).toBe(frames);
  });
});

describe('TVW-008 — the Add all shortcut', () => {
  it('is offered for the small projects where a picked board and an every-component board coincide', () => {
    // §6.1: 33% of projects have 1-6 pickable components.
    expect(canAddAll(1)).toBe(true);
    expect(canAddAll(6)).toBe(true);
    expect(canAddAll(ADD_ALL_LIMIT)).toBe(true);
  });

  it('is withheld past the limit, which is where it starts rebuilding what R-7 rejected', () => {
    expect(canAddAll(ADD_ALL_LIMIT + 1)).toBe(false);
    expect(canAddAll(363)).toBe(false);
  });

  it('is withheld when there is nothing to add', () => {
    expect(canAddAll(0)).toBe(false);
  });
});

describe('TVW-008 — a board outliving its components', () => {
  it('drops a frame whose component has been deleted', () => {
    const frames: BoardFrame[] = [
      { target: '/Card', x: 0, y: 0 },
      { target: '/Gone', x: 816, y: 0 }
    ];
    expect(boardFramesPresentIn(frames, new Set(['/Card']))).toEqual([{ target: '/Card', x: 0, y: 0 }]);
  });

  it('is identity-stable when every component is still there', () => {
    const frames: BoardFrame[] = [{ target: '/Card', x: 0, y: 0 }];
    expect(boardFramesPresentIn(frames, new Set(['/Card', '/Nav']))).toBe(frames);
  });

  it('drops everything when the component set is empty', () => {
    // ⚠️ Which is why this is called at render, never as a repair pass: a
    // project mid-load has no components, and a repair pass would read that as
    // "every component was deleted" and write the board away.
    const frames: BoardFrame[] = [{ target: '/Card', x: 0, y: 0 }];
    expect(boardFramesPresentIn(frames, new Set())).toEqual([]);
  });
});
