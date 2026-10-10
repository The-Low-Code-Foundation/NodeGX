/**
 * NSP-020 — ports without a running viewer (task §3.1, s79).
 *
 * Three things graded here, on the spec package alone:
 *
 *   1. `portsOf` / `drawnPorts` ARE the list an editor draws — declared ports under their `when`,
 *      a `narrow` applied, derived ports after them, a derived name never shadowing a declared one.
 *   2. THE NEEDS GATE: every spec's derived ports are drawn with a context that holds ONLY the
 *      fields `derived.needs` declares and TRAPS a read of any other (ports.ts `needsContext`).
 *      A spec reaching for `context.schema` without saying so is red here, not `undefined` there.
 *      Run at `{}` and at the catalog-parity probes' shape (a wired numbered input), for every spec.
 *   3. The two facts the first drive found: And counts a WIRED `input <n>` the way the runtime's
 *      `collectPorts` does (nodedefinition.ts :624 — the target ports of the wires into the node),
 *      and Image's `objectFit` is drawn only with `sizeMode = explicit` (the catalog's group).
 *
 * The parity drives against the runtime's `setup` hooks and the editor's condition evaluator live
 * beside those (noodl-runtime/test/node-spec/nsp-020-ports-parity.test.ts; noodl-editor/tests-unit/
 * nsp-020/) — this file never imports either.
 */
import { specs, SpecError } from '../src';
import { drawnPorts, needsContext, portsDerivability, portsOf, PORT_CONTEXT_FIELDS } from '../src';
import type { PortContext } from '../src';

const And = specs['And'];
const Image = specs['Image'];
const StringFormat = specs['String Format'];

describe('portsOf — the list an editor draws (NSP-020 §3.1 decision 1)', () => {
  test('And at {} is one spare input and the declared result', () => {
    const list = drawnPorts(And, {});
    expect(list.filter((p) => p.plug === 'input').map((p) => p.name)).toEqual(['input 0']);
    expect(list.filter((p) => p.plug === 'output').map((p) => p.name)).toEqual(['result']);
    expect(list.find((p) => p.name === 'input 0')).toMatchObject({ type: 'boolean', displayName: 'Input 0', source: 'derived' });
    expect(list.find((p) => p.name === 'result')).toMatchObject({ source: 'declared' });
  });

  test('And counts a WIRED input as collectPorts does — the first thing the drive found', () => {
    // nodedefinition.ts :624 — `node.component.getConnectionsTo(node.id).map(c => c.targetPort)` joins the param names;
    // a wire on `input 3` and no param at all mints input 0 … input 4 (highest + 1 spare, the spare being + 2 on the index)
    const wired = drawnPorts(And, {}, { wired: ['input 3'] }).filter((p) => p.plug === 'input').map((p) => p.name);
    expect(wired).toEqual(['input 0', 'input 1', 'input 2', 'input 3', 'input 4']);
    // the param and the wire together: the highest of either
    const both = drawnPorts(And, { 'input 1': true }, { wired: ['input 3'] }).filter((p) => p.plug === 'input').length;
    expect(both).toBe(5);
    // and a wire that is not a numbered input counts nothing
    expect(drawnPorts(And, {}, { wired: ['result'] }).filter((p) => p.plug === 'input').map((p) => p.name)).toEqual(['input 0']);
  });

  test('String Format draws one input per placeholder, after the declared ports', () => {
    const names = drawnPorts(StringFormat, { format: 'Hi {name}, {n} new' }).filter((p) => p.plug === 'input').map((p) => p.name);
    expect(names.slice(-2)).toEqual(['name', 'n']);
    expect(names.indexOf('format')).toBeLessThan(names.indexOf('name'));
  });

  test("Image's objectFit is drawn only with sizeMode = explicit; width and height follow their groups", () => {
    const at = (params: Record<string, unknown>) => Object.keys(portsOf(Image, params).inputs);
    expect(at({})).not.toContain('objectFit'); // default sizeMode is contentSize
    expect(at({ sizeMode: 'explicit' })).toEqual(expect.arrayContaining(['objectFit', 'width', 'height']));
    expect(at({ sizeMode: 'contentHeight' })).toContain('width');
    expect(at({ sizeMode: 'contentHeight' })).not.toContain('height');
    expect(at({ sizeMode: 'contentWidth' })).toContain('height');
    expect(at({ sizeMode: 'contentWidth' })).not.toContain('width');
    expect(at({ sizeMode: 'contentSize' })).not.toContain('width');
    // a hidden port still EXISTS for a reducer and a wire — only the drawn list omits it
    expect(Image.inputs).toHaveProperty('objectFit');
  });

  test('a derived port under a declared name is a spec error, as at mount', () => {
    // String Format declares `format`; a `{format}` placeholder must never become a second port of that name (spec.ts: "a
    // DECLARED input always wins")
    const bad = { ...StringFormat, derived: { ...StringFormat.derived!, inputs: () => ({ format: { type: 'string' as const } }) } };
    expect(() => portsOf(bad, {})).toThrow(SpecError);
    const badOut = { ...And, derived: { ...And.derived!, outputs: () => ({ result: { type: 'boolean' as const, from: () => true } }) } };
    expect(() => portsOf(badOut, {})).toThrow(SpecError);
  });

  test('narrow re-shapes a declared value input and nothing else', () => {
    const narrowed = {
      ...And,
      derived: undefined,
      inputs: { ...And.inputs, pick: { type: 'enum' as const, enums: ['a'], narrow: (p: Readonly<Record<string, unknown>>) => ({ enums: String(p.items ?? 'a').split(',') }) } }
    };
    expect(portsOf(narrowed, { items: 'x,y' }).inputs.pick).toMatchObject({ type: 'enum', enums: ['x', 'y'] });
    expect(portsOf(narrowed, {}).inputs.pick).toMatchObject({ enums: ['a'] });
    expect(narrowed.inputs.pick.enums).toEqual(['a']); // the declaration is untouched
  });
});

describe('the needs gate — a spec reads only the context it declares (NSP-020 §3.1 decision 2)', () => {
  // A context with every field FILLED, so a spec that reads a declared field has something to read, and the trap on the
  // undeclared ones is what fires — never an `undefined` that happens to work.
  const full: PortContext = {
    wired: ['input 3'],
    instancePorts: [{ name: 'x', plug: 'input', type: 'string' }],
    components: { '/Popup': { inputs: { name: { type: 'string' } }, outputs: { ok: { type: 'boolean' } } } },
    routers: [{ name: 'Main', pages: ['/Home'] }],
    stacks: [{ name: 'Stack', pages: ['/Home'] }],
    schema: { classes: { Task: { fields: { title: { type: 'string' } } }, _User: { fields: { email: { type: 'string' } } } } },
    siblings: { 'Send Event': [{ params: { channelName: 'go' } }] }
  };

  test('needsContext copies the declared fields and traps the rest', () => {
    const ctx = needsContext(And, full);
    expect(ctx.wired).toEqual(['input 3']);
    expect(() => ctx.schema).toThrow(/And: derived ports read context\.schema, which derived\.needs does not declare/);
    // the trap survives a spread: a spec that copies the context copies only what it may read
    expect(Object.keys({ ...ctx })).toEqual(['wired']);
  });

  test.each(Object.values(specs).filter((s) => s.derived).map((s) => [s.type, s] as const))('%s draws its ports from what it declares', (_type, spec) => {
    const ctx = needsContext(spec, full);
    expect(() => portsOf(spec, {}, ctx)).not.toThrow();
    // every declared need is a real field of the context
    for (const need of spec.derived!.needs ?? []) expect(PORT_CONTEXT_FIELDS).toContain(need);
  });

  test('a spec that reaches past its needs is red (planted)', () => {
    const greedy = { ...And, derived: { ...And.derived!, needs: [] as const, inputs: (_p: unknown, c: Readonly<PortContext>) => (c.wired, {}) } };
    expect(() => portsOf(greedy, {}, needsContext(greedy, full))).toThrow(SpecError);
  });

  test('the ledger class reads needs', () => {
    expect(portsDerivability(And)).toBe('with-project');
    expect(portsDerivability(Image)).toBe('params-only');
    expect(portsDerivability(StringFormat)).toBe('params-only');
    expect(portsDerivability({ ...And, derived: { ...And.derived!, needs: ['schema'] } })).toBe('with-schema');
  });

  test('at s79 the census of derivability is what the task file says', () => {
    const counts = { 'params-only': 0, 'with-project': 0, 'with-schema': 0, none: 0 };
    for (const s of Object.values(specs)) counts[portsDerivability(s)]++;
    // 108 specs; the 43 with `derived` are params-only until a lane gives the 22 project- and schema-dependent ones their
    // `needs` (NSP-020 §3.1 (d)); And is the first with one. Move this line when a lane moves the count — the ledger
    // column (AC4) will replace it.
    expect(counts['with-project']).toBeGreaterThanOrEqual(1);
    expect(counts.none).toBe(0);
  });
});
