/**
 * TVW-008 AC4 — what the bench opens on, and at what width.
 *
 * > "if you saved a scenario, that's what you meant the component to look like." — Richard,
 * > 2026-09-20, ruling on the board and the single bench disagreeing about one component
 *
 * The board resolved `bench.scenarios[0]` into its harness parameters from the day it was built;
 * the single bench opened on `None` and drew the node's own values, so the two surfaces said
 * different things about one component. These are the rules that close that gap.
 *
 * 🔴 **What these arms can and cannot see.** They grade the *decision* — which scenario, which
 * values, which width. They cannot grade the thing that made the first attempt fail, which was
 * *where the answer is delivered*: an auto-select through the click path produced exactly the
 * right decision and the runtime never saw it, because a targeted `modelUpdate` at mount has no
 * client to arrive at. That half is graded twice elsewhere — by `tests/canvas/board-export.test.ts`
 * asserting the bench's opening parameters and the board's are the same bytes, and by the drive
 * reading the text the runtime actually painted ([[verify-the-consequence-not-just-the-mechanism]]).
 */
import {
  benchOpeningFrame,
  benchOpeningScenario,
  benchScenarioIsModified,
  type BenchScenario
} from '../../src/editor/src/views/VisualCanvas/benchScenarios';
import type { BenchFrame } from '../../src/editor/src/views/VisualCanvas/previewScope';
import type { BenchInterface } from '../../src/editor/src/models/AiAssistant/authoring/componentBench';

const iface = (...names: string[]): BenchInterface =>
  ({
    inputs: names.map((name) => ({ name, type: 'string', default: undefined })),
    outputs: [],
    backwards: []
  } as unknown as BenchInterface);

/** The fixture's own shape: a scenario whose value differs from what the node draws without it. */
const checkout: BenchScenario = {
  name: 'Checkout',
  inputs: { label: 'Continue to checkout' },
  frame: { width: 480, height: 200 },
  stretch: false
};

const DEFAULT: BenchFrame = { width: 768, stretch: false, height: null };

describe('TVW-008 AC4 — which scenario the bench opens on', () => {
  it('opens on the first one', () => {
    const opening = benchOpeningScenario([checkout, { name: 'Empty', inputs: {} }], iface('label'));

    expect(opening?.name).toBe('Checkout');
    expect(opening?.inputs).toEqual({ label: 'Continue to checkout' });
  });

  it('opens on the first one in STORED order, not the alphabetical one', () => {
    // The bar can reorder scenarios and the order is persisted, so "first" is a fact about the
    // file rather than about the names — and a sort slipped in anywhere would make the board and
    // the bench open on different scenarios without either surface being obviously wrong.
    const opening = benchOpeningScenario([{ name: 'Zebra', inputs: { label: 'z' } }, checkout], iface('label'));

    expect(opening?.name).toBe('Zebra');
  });

  it('opens on nothing when the component has no scenarios', () => {
    // 🔴 `undefined` is the whole of "this component has none". It is NOT "the user chose None" —
    // those are the same `activeScenario` value, and telling them apart is the caller's effect
    // key, not this function's job.
    expect(benchOpeningScenario([], iface('label'))).toBeUndefined();
  });

  it('opens on nothing when the stored list read back empty', () => {
    // `readBenchScenarios` returns `[]` for a hand-edited or corrupt `bench.scenarios`, and that
    // has to reach the bench as "no scenario", never as a crash on `scenarios[0].name`.
    expect(benchOpeningScenario([])).toBeUndefined();
  });
});

describe('TVW-008 AC4 — what the opening scenario means against the component today', () => {
  it('drops a value naming a port the component no longer declares, and says which', () => {
    const renamed: BenchScenario = { name: 'Checkout', inputs: { label: 'Continue', colour: 'red' } };
    const opening = benchOpeningScenario([renamed], iface('label'));

    expect(opening?.inputs).toEqual({ label: 'Continue' });
    expect(opening?.missing).toEqual(['colour']);
  });

  it('applies the scenario whole when there is no interface yet', () => {
    // The first render has no `getPorts()` answer. Emptying the set here would open the bench on a
    // scenario with no values in it, which looks exactly like a scenario that lost them.
    const opening = benchOpeningScenario([checkout]);

    expect(opening?.inputs).toEqual({ label: 'Continue to checkout' });
    expect(opening?.missing).toEqual([]);
  });

  it('carries the scenario itself, because the width lives on it', () => {
    expect(benchOpeningScenario([checkout], iface('label'))?.scenario).toBe(checkout);
  });
});

describe('TVW-008 AC4 — the width the bench opens at', () => {
  const opening = () => benchOpeningScenario([checkout], iface('label'));

  it("takes the scenario's recorded width over the component's stored default", () => {
    // The scenario is the more specific statement: "renders correctly at 480" is part of what it
    // claims, and it is the order a click already uses.
    expect(benchOpeningFrame(opening(), { width: 320, stretch: false, height: 180 }, DEFAULT)).toEqual({
      width: 480,
      stretch: false,
      height: 200
    });
  });

  it("takes the component's stored default when the scenario records no width", () => {
    const stored: BenchFrame = { width: 320, stretch: false, height: 180 };
    const noFrame = benchOpeningScenario([{ name: 'Checkout', inputs: {} }], iface('label'));

    expect(benchOpeningFrame(noFrame, stored, DEFAULT)).toEqual(stored);
  });

  it('leaves the width alone when neither the scenario nor the component claims one', () => {
    // 🔴 FIX-011's rule, and the reason this returns `current` rather than `DEFAULT_BENCH_FRAME`:
    // resetting here throws away a width the user set moments ago, every time they point the bench
    // at a component that has neither.
    const onScreen: BenchFrame = { width: 1024, stretch: true, height: 600 };

    expect(benchOpeningFrame(undefined, undefined, onScreen)).toBe(onScreen);
    expect(benchOpeningFrame(benchOpeningScenario([{ name: 'X', inputs: {} }]), undefined, onScreen)).toEqual(onScreen);
  });

  it('gives a scenario that records a width but no height the default height, not the stage’s', () => {
    const pinned: BenchFrame = { width: 320, stretch: false, height: 900 };
    const widthOnly = benchOpeningScenario([{ name: 'Checkout', inputs: {}, frame: { width: 480 } }]);

    expect(benchOpeningFrame(widthOnly, pinned, DEFAULT)?.height).toBeNull();
  });
});

describe("TVW-008 AC4 — the bench does not open already claiming it has been modified", () => {
  /**
   * 🔴 **This is the arm the width exists for, and it is the one that fails if the values are
   * seeded without it.**
   *
   * `benchScenarioIsModified` compares the scenario's recorded width against the stage's, so a
   * bench opened on `Checkout`'s values at the 768 default reads `Checkout ●` before anyone has
   * touched it — and offers a Save that would overwrite the scenario's 480. The dot would be
   * telling the truth about a state the product had put itself in.
   */
  it('is not modified when it opens on both the values and the width', () => {
    const opening = benchOpeningScenario([checkout], iface('label'));
    const frame = benchOpeningFrame(opening, undefined, DEFAULT);

    expect(benchScenarioIsModified(checkout, opening?.inputs ?? {}, frame)).toBe(false);
  });

  it('IS modified when it opens on the values at the stage width — the case the width rule removes', () => {
    // The negative control: same values, the width left at the 768 default, which is what the
    // fixture's Primary Button would have got. Without this pair the arm above passes on a
    // comparison that never had two different answers in it.
    const opening = benchOpeningScenario([checkout], iface('label'));

    expect(benchScenarioIsModified(checkout, opening?.inputs ?? {}, DEFAULT)).toBe(true);
  });
});
