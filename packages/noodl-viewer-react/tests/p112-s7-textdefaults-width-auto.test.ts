/**
 * P112-S7-TEXTDEFAULTS — what the runtime did with the layout keys the picker used to stamp on a Text.
 *
 * STYLE-002's `TextConfig.defaults` wrote `width: "auto"`, `height: "auto"`, `flexShrink`, `flexGrow` and
 * `minWidth: "0"` on every Text dropped from the node picker, calling it a fix for Texts "pushing siblings off-screen".
 * The row left "what the runtime does with a width of 'auto'" unmeasured. This file is that measurement, graded against
 * the REAL compiled setter off `Text`'s definition (see `fld-004-units-port-abstains.test.ts`):
 *
 *  - `"auto"` is not a size. The width setter keeps the declared 100% and raises `dimensions/not-a-dimension`, so the
 *    "fix" never sized anything and every picked Text carried a runtime complaint instead.
 *  - Text has no `flexShrink` / `flexGrow` input, so those two were never read.
 *
 * So dropping the five keys (the editor's `PickerLookValidates.test.ts`) changes no rendering.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: false };

import TextNodeModule from '../src/nodes/visual/text';

interface FakeNode {
  props: Record<string, any>;
  errors: { code: string; message: string }[];
  raiseRuntimeError(code: string, message: string): void;
  forceUpdate(): void;
  setDiagnostic(): void;
}

function makeInstance(): FakeNode {
  const instance: FakeNode = {
    props: {},
    errors: [],
    raiseRuntimeError(code: string, message: string) {
      instance.errors.push({ code, message });
    },
    forceUpdate() {
      /* not graded */
    },
    setDiagnostic() {
      /* not this setter's channel */
    }
  };
  return instance;
}

const inputs = () => (TextNodeModule as any).node.inputs as Record<string, any>;

describe('P112-S7-TEXTDEFAULTS — a Text width of "auto" was never a size', () => {
  it('the declared width is 100%, in the unit the port reads a bare number in', () => {
    const width = inputs().width;
    expect(width.type.units).toEqual(['%', 'px', 'vw', 'vh']);
    expect(width.type.defaultUnit).toBe('%');
    expect(width.default).toBe(100);
  });

  it('control: a real size applies', () => {
    const node = makeInstance();
    inputs().width.set.call(node, { value: 100, unit: '%' });
    expect(node.props.width).toBe('100%');
    expect(node.errors).toEqual([]);
  });

  it('"auto" keeps the 100% and is reported as not a size', () => {
    const node = makeInstance();
    const set = inputs().width.set;
    set.call(node, { value: 100, unit: '%' });
    set.call(node, 'auto');
    expect(node.props.width).toBe('100%');
    expect(node.errors.map((e) => e.code)).toEqual(['dimensions/not-a-dimension']);
  });

  it('flexShrink and flexGrow are not Text inputs', () => {
    expect(inputs().flexShrink).toBeUndefined();
    expect(inputs().flexGrow).toBeUndefined();
  });
});
