/**
 * FB-019 AC1 — a characterisation test for the ONE mechanism that makes a bare number
 * survive a wire into a units-typed port.
 *
 * 🔴 WHY THIS FILE EXISTS AT ALL. FB-019 was filed with two silent-failure bugs derived
 * from the premise that a port's declared `default` never reaches `_inputValues`, so a
 * never-set `Width` fed a bare `300` lost its width and a never-set `Pos X` became `NaN`.
 * Driven 2026-08-23: neither happens. `initializeDefaultValues` (`nodedefinition.ts`)
 * seeds EVERY units-typed input that declares a `default` with `{unit, value}` at node
 * creation, so `setInputValue`'s merge always has a unit to find. The behaviour was
 * already correct and nobody had written it down.
 *
 * ⚠️ So this suite grades code that already passes, which is the kind of suite that
 * quietly passes on anything. Mutation-checked 2026-08-23 by commenting out the
 * `initializeDefaultValues` call at its node-creation site: the first three rows go red,
 * the last three stay green — correctly, because they are the arms that do not depend on
 * the seeder. (P109 ISL-050, P107-C132: the two unseeded rows now read a bare number in the port's default unit — the
 * failure this file pinned as the exclusion, ruled a defect.) If the seeder can be removed and this file stays green, it has stopped
 * measuring.
 *
 * ✅ And the mutated values are the finding: with the seeder gone, `width` receives
 * `undefined` and `transformX` receives `NaN` — EXACTLY the two failures FB-019 was filed
 * on. The diagnosis was right about the mechanism in every detail; it just never grepped
 * for the guard that prevents it. That is what these rows are here to keep.
 *
 * The two writers of `_inputValues` disagree about the key name — `initializeDefaultValues`
 * writes `unit`, `Node.prototype.registerInput` writes `type` — and only `unit` arms the
 * merge. Row 5 pins that, because the obvious tidy-up ("these two do the same thing") is
 * the edit that would break every row above it.
 */

import NodeContext = require('../src/nodecontext');
import NodeDefinition = require('../src/nodedefinition');

/**
 * Stands in for the three registration paths a real visual node uses. The viewer builds
 * these from `addInputCss` / `addInputProps` / `addInputs`, but all three arrive here as
 * plain declared inputs — which is the point: the seeding does not care which helper
 * declared the port, and the original diagnosis assumed it did.
 */
const dimensionsNode = {
  name: 'FB019 Dimensions',
  category: 'Visual',
  initialize(this: any) {
    this._internal.applied = {};
  },
  inputs: {
    // Declares a default, like `width` (default 100, defaultUnit '%').
    width: {
      type: { name: 'dimension', units: ['%', 'px'], defaultUnit: '%' },
      default: 100,
      set(this: any, value: any) {
        this._internal.applied.width = value && value.value !== undefined ? value.value + value.unit : undefined;
      }
    },
    // Declares a default, like `transformX` (default 0, defaultUnit 'px') — the port the
    // task file predicted would build `translate(NaN…)`.
    transformX: {
      type: { name: 'number', units: ['px', '%'], defaultUnit: 'px' },
      default: 0,
      set(this: any, value: any) {
        // Deliberately the shipped setter's arithmetic, NaN and all.
        this._internal.applied.transformX = value.value + value.unit;
      }
    },
    // A units-typed port with NO declared default — the excluded case. Nothing seeds it,
    // so it is what the task file thought `width` and `transformX` were.
    unseeded: {
      type: { name: 'number', units: ['px'], defaultUnit: 'px' },
      set(this: any, value: any) {
        this._internal.applied.unseeded = value && value.value !== undefined ? value.value + value.unit : undefined;
      }
    }
  },
  outputs: {}
};

function createNode() {
  const context = new NodeContext();
  context.nodeRegister.register(NodeDefinition.defineNode(dimensionsNode as any));
  return context.nodeRegister.createNode('FB019 Dimensions', 'dims-1') as any;
}

describe('FB-019 — a bare number into a units-typed port', () => {
  it('seeds a declared default as {value, unit} before any value is set', () => {
    const node = createNode();

    // The shape, not just the presence: `unit` is the key the merge reads.
    expect(node.getInputValue('width')).toEqual({ unit: '%', value: 100 });
    expect(node.getInputValue('transformX')).toEqual({ unit: 'px', value: 0 });
  });

  it('renders a never-set Width at its declared defaultUnit, rather than deleting the prop', () => {
    const node = createNode();
    node.setInputValue('width', 300);

    // 🔴 The task file predicted `undefined` here (the prop deleted). Measured in the
    // viewer on 2026-08-23 as `300%`, and this is why.
    expect(node._internal.applied.width).toBe('300%');
  });

  it('renders a never-set Pos X at its declared defaultUnit, rather than NaN', () => {
    const node = createNode();
    node.setInputValue('transformX', 300);

    // 🔴 The task file predicted `NaN` here. `translateX(NaN)` is dropped by the browser
    // without an error, which is what made the prediction plausible.
    expect(node._internal.applied.transformX).toBe('300px');
    expect(Number.isNaN(node._internal.applied.transformX)).toBe(false);
  });

  it('keeps merging against a unit that was stored explicitly (population A must not change)', () => {
    const node = createNode();
    node.setInputValue('width', { value: 150, unit: 'px' });
    node.setInputValue('width', 300);

    // The shipped `toggle-switch`, `filters/Range`, `rating` and `table` all depend on
    // this: an author picks the unit once in the panel and drives the number by wire.
    expect(node._internal.applied.width).toBe('300px');
  });

  it('reads a bare number on a units port with no declared default in its default unit (P107-C132)', () => {
    const node = createNode();
    expect(node.getInputValue('unseeded')).toBeUndefined();

    node.setInputValue('unseeded', 300);

    // ✅ The exclusion arm, reversed by a ruling. Nothing seeds a port that declares no default, so there was nothing to merge
    // against and the number arrived bare — the setter refused it, which is P107-C132 (a Number wired into a Columns' Medium
    // Below did nothing until a size had been typed there). Ruled 2026-10-08, "Read the number as pixels": a port that holds no
    // size reads a bare number in its default unit (P109 ISL-050, `setInputValue`).
    expect(node._internal.applied.unseeded).toBe('300px');
    expect(node.getInputValue('unseeded')).toEqual({ value: 300, unit: 'px' });

    // Only a number, or text that reads as one: anything else still arrives as sent, for the setter to refuse.
    const other = createNode();
    other.setInputValue('unseeded', 'tall');
    expect(other.getInputValue('unseeded')).toBe('tall');
    expect(other._internal.applied.unseeded).toBeUndefined();
  });

  it('arms the merge on `unit` only — `type` is a different key and does not count', () => {
    const node = createNode();

    // `Node.prototype.registerInput` once wrote `{ value, type: defaultUnit }` (FLD-004 (c) moved it to `unit`). If a merge
    // ever read `type`, this would render in the stored `%`; a value with no `unit` holds no size, so the number is read in
    // the port's default unit instead (P107-C132).
    node._inputValues.unseeded = { value: 0, type: '%' };
    node.setInputValue('unseeded', 300);

    expect(node._internal.applied.unseeded).toBe('300px');
  });
});
