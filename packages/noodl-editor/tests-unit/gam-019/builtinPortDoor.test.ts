/**
 * GAM-019 — a wire to an input a built-in node does not have is refused at the door.
 *
 * ## The row
 *
 * P78 D66: Rocket School's generator wired `nfIn.name0 → nfName.text` on a Text Input. A
 * Text Input has no `text` input (its value is `startValue`). The door said nothing, the page
 * rendered with an empty name box, and only the browser console said
 * `Invalid connection, input doesn't exist`.
 *
 * ## Why it escaped
 *
 * `rules/nonexistentPort` skips **any** type that carries a `dynamicPorts` entry, whatever the
 * mechanism. 88 of the 176 shipped types carry one. For 18 of them the only mechanism is
 * `declared-port-groups`, whose members are all enumerable, and Text Input's
 * `runtime-discovered` comes from a `setup()` that republishes two ports it already declares.
 *
 * ## Real catalog, and every case is a pair
 *
 * Graded against `loadDefaultCatalog()`, because the whole question is what the shipped catalog
 * says about these types. A hand-built catalog would let me declare the answer. Every refusal
 * sits in the same run as a known-firing sibling, and every accepted wire is one name away from
 * a refusal, so "quiet" can never be "never ran".
 *
 * @module noodl-editor/tests-unit/gam-019/builtinPortDoor
 */
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import { SemanticValidator } from '@noodl-models/../validation/SemanticValidator';
import type { NormConnection, NormNode, NormProject } from '@noodl-models/../validation/model';

const catalog = loadDefaultCatalog();

const TEXT_INPUT = 'net.noodl.controls.textinput';
const OPTIONS = 'net.noodl.controls.options';

function node(id: string, type: string, instancePorts: string[] = []): NormNode {
  return { id, type, label: id, children: [], instancePorts } as unknown as NormNode;
}

function wire(fromId: string, fromProperty: string, toId: string, toProperty: string): NormConnection {
  return { fromId, fromProperty, toId, toProperty } as NormConnection;
}

/** Only this rule, so a neighbour's finding cannot be mistaken for it. */
function refusals(nodes: NormNode[], connections: NormConnection[]) {
  return new SemanticValidator(catalog)
    .validate({ components: [{ name: '/Profiles/New player form', nodes, connections }] } as NormProject, {
      only: new Set([DiagnosticCode.NonexistentPort])
    })
    .diagnostics.filter((d) => d.code === DiagnosticCode.NonexistentPort);
}

const refusalOn = (found: ReturnType<typeof refusals>, nodeId: string, port: string) =>
  found.find((d) => d.location.nodeId === nodeId && d.location.port === port);

/** `Component Inputs` mints its outputs per instance; `name0` is one the author declared. */
const IN = node('nfIn', 'Component Inputs', ['name0', 'on']);
/** A fully static type: no `dynamicPorts` at all. The sibling that proves the rule is alive. */
const FLAG_A = node('flagA', 'Boolean');
const FLAG_B = node('flagB', 'Boolean');

describe('GAM-019 — the premises, read from the shipped catalog', () => {
  // 🔴 If any of these stops being true, the arms below test nothing and could still pass.
  it('Text Input has `startValue` and no `text`, and its setup only narrows (`runtime-narrowed`)', () => {
    expect(catalog.hasPort(TEXT_INPUT, 'input', 'startValue')).toBe(true);
    expect(catalog.hasPort(TEXT_INPUT, 'input', 'text')).toBe(false);
    // At HEAD `eb12ebe99` this read `runtime-discovered`, which is why the rule skipped it. The
    // generator now records FB-026's verified RETYPES_DECLARED_PORTS types as `runtime-narrowed`.
    expect(catalog.getNode(TEXT_INPUT)?.dynamicPorts?.mechanisms).toEqual(['declared-port-groups', 'runtime-narrowed']);
    expect(catalog.getNode(OPTIONS)?.dynamicPorts?.mechanisms).toEqual(['declared-port-groups', 'runtime-narrowed']);
    expect(catalog.hasRuntimeDynamicPorts(TEXT_INPUT)).toBe(false);
  });

  it('Group is dynamic only by declared port groups; Boolean is fully static; Expression really mints', () => {
    expect(catalog.getNode('Group')?.dynamicPorts?.mechanisms).toEqual(['declared-port-groups']);
    expect(catalog.hasPort('Group', 'input', 'width')).toBe(true);
    expect(catalog.isDynamicNode('Boolean')).toBe(false);
    expect(catalog.getNode('Expression')?.dynamicPorts?.mechanisms).toContain('runtime-discovered');
  });
});

describe("GAM-019 — D66's wire, beside a known-firing static sibling", () => {
  const nodes = [IN, node('nfName', TEXT_INPUT), FLAG_A, FLAG_B];

  it('the static sibling is refused: the rule ran over this component', () => {
    const found = refusals(nodes, [wire('nfIn', 'name0', 'nfName', 'text'), wire('flagA', 'value', 'flagB', 'nope')]);
    expect(refusalOn(found, 'flagB', 'nope')).toBeDefined();
  });

  it('AC2 — `name0 → text` on a Text Input is refused by name, and the repair is offered', () => {
    const found = refusals(nodes, [wire('nfIn', 'name0', 'nfName', 'text'), wire('flagA', 'value', 'flagB', 'nope')]);
    const d = refusalOn(found, 'nfName', 'text');
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.location.connection).toEqual({ fromId: 'nfIn', fromProperty: 'name0', toId: 'nfName', toProperty: 'text' });
    // `suggestPort` is edit distance over names, and "text" is nowhere near "startValue",
    // so the repair has to come from `alternatives` (GAM-019 §5 c).
    expect(d!.alternatives).toContain('startValue');
  });

  it('AC2 — the same wire to `startValue` is accepted, in a run that still refuses the sibling', () => {
    const found = refusals(nodes, [
      wire('nfIn', 'name0', 'nfName', 'startValue'),
      wire('flagA', 'value', 'flagB', 'nope')
    ]);
    expect(refusalOn(found, 'nfName', 'startValue')).toBeUndefined();
    expect(refusalOn(found, 'flagB', 'nope')).toBeDefined();
  });
});

describe('GAM-019 AC3 — a declared-port-groups type, and Options', () => {
  it('Group: `widthXX` is refused and `width` is accepted, in one run', () => {
    const found = refusals(
      [IN, node('box', 'Group'), node('box2', 'Group')],
      [wire('nfIn', 'name0', 'box', 'widthXX'), wire('nfIn', 'name0', 'box2', 'width')]
    );
    expect(refusalOn(found, 'box', 'widthXX')).toBeDefined();
    expect(refusalOn(found, 'box2', 'width')).toBeUndefined();
  });

  it('Options: a made-up input is refused and `value` is accepted, in one run', () => {
    expect(catalog.hasPort(OPTIONS, 'input', 'value')).toBe(true);
    const found = refusals(
      [IN, node('pick', OPTIONS), node('pick2', OPTIONS)],
      [wire('nfIn', 'name0', 'pick', 'selected'), wire('nfIn', 'name0', 'pick2', 'value')]
    );
    expect(refusalOn(found, 'pick', 'selected')).toBeDefined();
    expect(refusalOn(found, 'pick2', 'value')).toBeUndefined();
  });
});

describe("GAM-019 — the legacy case the old skip was kept for", () => {
  /**
   * `CatalogIndex`'s header and `tests/validation/dynamic-ports.test.ts` both kept the blanket skip
   * for "legacy/adapter port names (e.g. Text Input's `disabled`)". The deprecated node's
   * `disabled` input is commented out, so that wire reaches nothing at runtime. Mirrored here
   * because the jasmine suite runs only under the Electron `test:ci`, and a flipped case nobody runs
   * is not graded.
   */
  it('deprecated Text Input: `disabled` is refused and `enabled` is accepted, in one run', () => {
    expect(catalog.getNode('Text Input')?.dynamicPorts?.mechanisms).toEqual(['declared-port-groups']);
    expect(catalog.hasPort('Text Input', 'input', 'disabled')).toBe(false);
    const found = refusals(
      [IN, node('old', 'Text Input'), node('old2', 'Text Input')],
      [wire('nfIn', 'on', 'old', 'disabled'), wire('nfIn', 'on', 'old2', 'enabled')]
    );
    expect(refusalOn(found, 'old', 'disabled')).toBeDefined();
    expect(refusalOn(found, 'old2', 'enabled')).toBeUndefined();
  });
});

describe('GAM-019 AC6 — a type that really mints ports is still skipped', () => {
  it("Expression's free variable is not refused, in the same run as D66's refusal", () => {
    const found = refusals(
      [IN, node('ex', 'Expression'), node('nfName', TEXT_INPUT)],
      [wire('nfIn', 'name0', 'ex', 'someFreeVariable'), wire('nfIn', 'name0', 'nfName', 'text')]
    );
    expect(refusalOn(found, 'ex', 'someFreeVariable')).toBeUndefined();
    expect(refusalOn(found, 'nfName', 'text')).toBeDefined();
  });
});

describe('GAM-019 (ruled 2026-09-14) — the "did you mean" matches what the wire carries', () => {
  /**
   * AC7 found the refusal's first hint wrong: "did you mean `set`?" for D66's `text`. `set` is a
   * signal and `name0` is a string, so an agent that followed the hint wired a value into a
   * signal. Richard ruled: match the wire's kind, keep the threshold.
   *
   * The kind of D66's source lives only on the instance (`Component Inputs` ports are typed in
   * `nodes.json`), which is why `NormNode` now carries `instancePortTypes`.
   */
  const typedIn = {
    ...node('nfIn', 'Component Inputs', ['name0', 'fill', 'loose']),
    instancePortTypes: { name0: 'string', fill: 'signal' }
  } as NormNode;

  it('premises: by name alone `text` is nearest to `set`, and `set` is a signal', () => {
    expect(catalog.suggestPort(TEXT_INPUT, 'input', 'text')).toBe('set');
    expect(catalog.portKind(TEXT_INPUT, 'input', 'set')).toBe('signal');
    // Declared `*`, which FB-026's setup narrows at runtime, so it has no kind and is never filtered out.
    expect(catalog.portKind(TEXT_INPUT, 'input', 'startValue')).toBeUndefined();
  });

  it("D66's string wire is not offered `set`, and the same name from a signal wire is, in one run", () => {
    const found = refusals(
      [typedIn, node('byValue', TEXT_INPUT), node('bySignal', TEXT_INPUT)],
      [wire('nfIn', 'name0', 'byValue', 'text'), wire('nfIn', 'fill', 'bySignal', 'text')]
    );
    const byValue = refusalOn(found, 'byValue', 'text');
    expect(byValue).toBeDefined();
    expect(byValue!.suggestion).not.toBe('set');
    expect(byValue!.alternatives).toContain('startValue');
    expect(refusalOn(found, 'bySignal', 'text')!.suggestion).toBe('set');
  });

  it('a value near-miss from a value wire is still suggested: Group `widht` → `width`', () => {
    const found = refusals([typedIn, node('box', 'Group')], [wire('nfIn', 'name0', 'box', 'widht')]);
    expect(refusalOn(found, 'box', 'widht')!.suggestion).toBe('width');
  });

  it("a catalog port answers for the other end, and an untyped end filters nothing", () => {
    expect(catalog.portKind(TEXT_INPUT, 'output', 'onFocus')).toBe('signal');
    // `onTextChanged` is declared `*`: a catalog port with no kind filters nothing either.
    expect(catalog.portKind(TEXT_INPUT, 'output', 'onTextChanged')).toBeUndefined();
    const found = refusals(
      [
        typedIn,
        node('src', TEXT_INPUT),
        node('fromSignal', TEXT_INPUT),
        node('fromStar', TEXT_INPUT),
        node('fromString', TEXT_INPUT),
        node('untyped', TEXT_INPUT)
      ],
      [
        wire('src', 'onFocus', 'fromSignal', 'text'),
        wire('src', 'onTextChanged', 'fromStar', 'text'),
        wire('nfIn', 'name0', 'fromString', 'text'),
        wire('nfIn', 'loose', 'untyped', 'text')
      ]
    );
    expect(refusalOn(found, 'fromSignal', 'text')!.suggestion).toBe('set');
    expect(refusalOn(found, 'fromStar', 'text')!.suggestion).toBe('set');
    expect(refusalOn(found, 'untyped', 'text')!.suggestion).toBe('set');
    // …and in the same run, the string wire is the one that is filtered.
    expect(refusalOn(found, 'fromString', 'text')!.suggestion).not.toBe('set');
  });
});

describe('GAM-019 — the parameter half moves with the mechanism', () => {
  /**
   * `parameterValues` skips the unknown-parameter check on `hasRuntimeDynamicPorts` (CN-004), so
   * `runtime-narrowed` switches that check ON for Text Input and Options too. That is a second
   * behaviour change, and it has its own blast radius: `runOnChange-startValue` is saved on 11 Text
   * Inputs in the corpus (one in Rocket School's `Profiles/New player form`), it names no catalog
   * port, and `text-input.ts:195` reads it through `shouldRunOnValueChange('startValue')`.
   */
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { checkParameterValues } = require('@noodl-models/../validation/parameterValues');
  const unknownParams = (type: string, parameters: Record<string, unknown>) =>
    (checkParameterValues([{ id: 'n', type, parameters }], catalog, { component: '/Pages/Home' }) as Array<{
      code: string;
      message: string;
      location: { port?: string };
    }>).filter((d) => d.code === DiagnosticCode.UnknownParameter);
  const names = (found: ReturnType<typeof unknownParams>, param: string) =>
    found.some((d) => d.location.port === param || d.message.includes(`"${param}"`));

  it('Text Input: a parameter naming no port now warns, and the Run On Value Change switch it honours does not', () => {
    const found = unknownParams(TEXT_INPUT, { nosuchparam: 1, 'runOnChange-startValue': false });
    expect(names(found, 'nosuchparam')).toBe(true);
    expect(names(found, 'runOnChange-startValue')).toBe(false);
  });

  it('Options: a parameter naming no port now warns', () => {
    expect(names(unknownParams(OPTIONS, { nosuchparam: 1, value: 'a' }), 'nosuchparam')).toBe(true);
  });
});
