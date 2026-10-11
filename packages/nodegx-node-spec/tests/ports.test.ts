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
    wiredOutputs: ['prop-zz'],
    backends: [{ id: 'b1', name: 'First' }, { id: 'b2', name: 'Second' }],
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

// ------------------------------------------------------------------------------------------------------------------
// NSP-020 §6.6 (s82) — THE FORMAT DECISION for L1 and L3: at play a node has its params and its wires, never the project.
// Graded on probe specs, so a planted hole in the interpreter or in ports.ts is red here whatever the real specs do.

import { defineNode, mount, run, playOutputs, playContextOf, PLAY_CONTEXT_FIELDS, settle, set as setPort } from '../src';
import type { AnyNodeSpec, OutputDecl, TraceEvent } from '../src';

type ProbeState = { v: unknown };
/** A node whose `prop-<f>` outputs come from the schema (the editor's draw) or from a wire (the play's), with an `onWire` signal each. */
const Probe = defineNode({
  type: 'probe-s82',
  version: 1,
  source: 'none',
  state: { v: undefined } as ProbeState,
  outcomes: ['done', 'failure'],
  inputs: {
    klass: { type: 'string', coerce: 'none' },
    pick: { type: 'string', coerce: 'none', narrow: (p) => ({ enums: p.klass === undefined ? ['unset'] : ['set'] }), enums: ['static'] },
    write: { type: '*', coerce: 'none' },
    go: { type: 'signal', outcome: true }
  },
  outputs: { v: { type: '*', from: (s) => s.v } }
}).on(
  {
    write: (_s, value, _i, w) => {
      // the node's own write: sends `out-<v>` (minted when the spec accepts the name) and `prop-a` only where the node has it
      const sent: string[] = [];
      if (w.hasOutput('prop-a')) sent.push('prop-a');
      return { says: 'writes', set: { v: value }, send: ['v'], sendDerived: sent, emitDerived: w.hasOutput('changed-a') ? ['changed-a'] : [] };
    },
    go: () => ({ says: 'done', outcome: 'done' })
  },
  {
    derived: {
      inputs: () => ({}),
      outputs: (params, context) => {
        const out: Record<string, OutputDecl<ProbeState>> = {};
        const fields = typeof params.klass === 'string' ? Object.keys(context.schema?.classes[params.klass]?.fields ?? {}) : [];
        for (const f of fields) out['prop-' + f] = { type: '*', from: (s) => s.v };
        for (const port of [...(context.wired ?? []), ...(context.wiredOutputs ?? [])]) if (port.startsWith('prop-') && !(port in out)) out[port] = { type: '*', from: (s) => s.v };
        for (const f of fields) out['changed-' + f] = { type: 'signal', onWire: true };
        return out;
      },
      needs: ['schema', 'wired', 'wiredOutputs'],
      on: () => ({ send: [] }),
      discoverOutput: (port) => (port.startsWith('prop-') ? { type: '*', from: (s) => s.v } : port.startsWith('changed-') ? { type: 'signal' } : port.startsWith('out-') ? { type: '*', from: (s) => s.v } : undefined),
      outputCandidates: ['prop-a', 'changed-a']
    }
  }
) as unknown as AnyNodeSpec;

const SCHEMA: PortContext = { schema: { classes: { Task: { fields: { a: { type: 'string' }, b: { type: 'number' } } } } } };

describe('§6.6 — one derived.outputs, two readers: the editor draws the project, the play registers the wires', () => {
  test('the editor draws every column and every wired name; the outcome ports are drawn too (gap 1)', () => {
    const drawn = drawnPorts(Probe, { klass: 'Task' }, { ...SCHEMA, wiredOutputs: ['prop-zz'] });
    const outputs = drawn.filter((p) => p.plug === 'output').map((p) => p.name);
    expect(outputs).toEqual(['v', 'done', 'completed', 'failure', 'prop-a', 'prop-b', 'prop-zz', 'changed-a', 'changed-b']);
    expect(drawn.find((p) => p.name === 'done')).toMatchObject({ source: 'declared', type: 'signal', displayName: 'Done' });
    expect(drawn.find((p) => p.name === 'completed')).toMatchObject({ source: 'declared', type: 'signal' });
    // no `unchanged`: the spec does not list it
    expect(outputs).not.toContain('unchanged');
  });

  test('the play context is the two wire fields and nothing else', () => {
    expect(PLAY_CONTEXT_FIELDS).toEqual(['wired', 'wiredOutputs']);
    expect(playContextOf({ ...SCHEMA, wired: ['x'], wiredOutputs: ['prop-a'], backends: [{ id: 'b', name: 'B' }] })).toEqual({ wired: ['x'], wiredOutputs: ['prop-a'] });
    expect(playContextOf(undefined)).toEqual({});
  });

  test('playOutputs: the params alone register nothing project-derived; a wired name is minted; an onWire output only when wired', () => {
    expect(Object.keys(playOutputs(Probe, { klass: 'Task' }, {}))).toEqual([]);
    expect(Object.keys(playOutputs(Probe, { klass: 'Task' }, { wiredOutputs: ['prop-zz', 'changed-q'] }))).toEqual(['prop-zz', 'changed-q']);
    // an `onWire` output derived from the params exists only when a wire asks — here the schema is in the context on purpose, to
    // show the flag gates it even when the draw has it
    expect(Object.keys(playOutputs(Probe, { klass: 'Task' }, { ...SCHEMA } as never))).toEqual(['prop-a', 'prop-b']);
    expect(Object.keys(playOutputs(Probe, { klass: 'Task' }, { ...SCHEMA, wiredOutputs: ['changed-a'] } as never))).toEqual(['prop-a', 'prop-b', 'changed-a']);
    // a wired name the spec refuses is the scenario error it always was
    expect(() => playOutputs(Probe, {}, { wiredOutputs: ['nope'] })).toThrow(SpecError);
  });

  test('narrow reads the params RAW (gap 3): an unset param is unset, not its declared default', () => {
    expect((portsOf(Probe, {}).inputs.pick as { enums?: readonly string[] }).enums).toEqual(['unset']);
    expect((portsOf(Probe, { klass: 'Task' }).inputs.pick as { enums?: readonly string[] }).enums).toEqual(['set']);
  });

  test('at play: a send gated on hasOutput reaches the trace only when the output is wired — the spec never pads', () => {
    const steps = [{ set: 'write', value: 1 }, 'settle'] as const;
    const unwired: TraceEvent[] = run(Probe, { klass: 'Task' }, [...steps]);
    const wired: TraceEvent[] = run(Probe, { klass: 'Task' }, [...steps], undefined, [], { wiredOutputs: ['prop-a', 'changed-a'] });
    expect(unwired.filter((e) => e.t === 'value' && e.port === 'prop-a')).toEqual([]);
    expect(unwired.filter((e) => e.t === 'signal' && e.port === 'changed-a')).toEqual([]);
    expect(wired).toContainEqual({ t: 'value', port: 'prop-a', value: 1 });
    expect(wired).toContainEqual({ t: 'signal', port: 'changed-a' });
    // the interpreter's mount refuses a wired output the spec cannot mint
    expect(() => run(Probe, {}, ['settle'], undefined, [], { wiredOutputs: ['nope'] })).toThrow(/wired output "nope" is not an output/);
  });

  test('the node\'s own write mints an output (discoverOutput): a world.send on an unknown name registers it when the spec accepts the name', () => {
    const Writer = { ...Probe, on: { ...Probe.on, write: (_s: unknown, value: unknown, _i: unknown, w: { send(p: string, s?: unknown): void }) => { w.send('out-x', { v: value }); return { says: 'writes', set: { v: value }, send: [] }; } } } as unknown as AnyNodeSpec;
    const t = run(Writer, {}, [{ set: 'write', value: 7 }, 'settle']);
    expect(t).toContainEqual({ t: 'value', port: 'out-x', value: 7 });
    // a name the spec refuses sends nothing, as before
    const Refuser = { ...Writer, derived: { ...Writer.derived!, discoverOutput: () => undefined } } as unknown as AnyNodeSpec;
    expect(run(Refuser, {}, [{ set: 'write', value: 7 }, 'settle']).filter((e) => e.t === 'value' && e.port === 'out-x')).toEqual([]);
  });

  test('re-derive after a write to a `rederive` param (decision 4 as the runtime does it): an output a later param derives exists from that write on, and is never removed', () => {
    // a probe whose derived outputs follow a `names` param whose setter registers, as States\' value outputs follow `values`
    const Lists = defineNode({
      type: 'probe-lists',
      version: 1,
      source: 'none',
      state: { v: undefined } as ProbeState,
      inputs: { names: { type: 'string', coerce: 'none' }, write: { type: '*', coerce: 'none' } },
      outputs: {}
    }).on(
      {
        write: (_s, value, _i, w) => ({ says: 'writes', set: { v: value }, send: [], sendDerived: ['x', 'y'].filter((n) => w.hasOutput(n)) })
      },
      {
        derived: {
          inputs: () => ({}),
          outputs: (params) => Object.fromEntries((typeof params.names === 'string' && params.names ? params.names.split(',') : []).map((n) => [n, { type: '*' as const, from: (s: ProbeState) => s.v }])),
          on: () => ({ send: [] }),
          rederive: ['names']
        }
      }
    ) as unknown as AnyNodeSpec;
    const inst = mount(Lists, {});
    expect(inst.view.hasOutput('x')).toBe(false);
    setPort(inst, 'write', 1);
    settle(inst);
    setPort(inst, 'names', 'x');
    expect(inst.view.hasOutput('x')).toBe(true);
    expect(inst.view.hasOutput('y')).toBe(false);
    setPort(inst, 'write', 2);
    settle(inst);
    setPort(inst, 'names', 'y'); // x stays: the runtime never unregisters
    expect(inst.view.hasOutput('x')).toBe(true);
    expect(inst.view.hasOutput('y')).toBe(true);
    setPort(inst, 'write', 3);
    settle(inst);
    const sent = inst.trace.filter((e) => e.t === 'value').map((e) => `${e.port}=${String((e as { value?: unknown }).value)}`);
    expect(sent).toEqual(['x=2', 'x=3', 'y=3']);
  });

  test('a scenario with the s79 `context` field is refused by the loader — the play never sees the project', () => {
    const { reviveScenarios } = require('../src') as { reviveScenarios: (p: unknown, t: string) => unknown };
    expect(() => reviveScenarios([{ name: 'x', steps: ['settle'], context: { schema: {} } }], 'probe')).toThrow(/a scenario has no `context`/);
    expect(() => reviveScenarios([{ name: 'x', steps: ['settle'], wiredOutputs: ['prop-a'] }], 'probe')).not.toThrow();
    expect(() => reviveScenarios([{ name: 'x', steps: ['settle'], wiredOutputs: 'prop-a' }], 'probe')).toThrow(/wiredOutputs/);
  });

  test('the real specs: DbModel2 and States carry the decision (what §6.6 says they say)', () => {
    const Record = specs['DbModel2'];
    const States = specs['States'];
    expect(Record.derived!.needs).toEqual(['schema', 'backends', 'wired', 'wiredOutputs']);
    expect(Record.derived!.outputCandidates).toEqual(['prop-title', 'changed-title', 'prop-n', 'changed-n']);
    // the editor: a class's columns, a wired name, the picker with two backends; the play: the wires alone
    const drawn = drawnPorts(Record, { collectionName: 'Lesson' }, { schema: { classes: { Lesson: { fields: { title: { type: 'string' } } } } }, wiredOutputs: ['prop-zz'], backends: [{ id: 'b1', name: 'One' }, { id: 'b2', name: 'Two' }] });
    expect(drawn.filter((p) => p.source === 'derived').map((p) => `${p.plug} ${p.name}`)).toEqual(['input backendId', 'input collectionName', 'output prop-title', 'output changed-title', 'output prop-zz']);
    expect((drawn.find((p) => p.name === 'collectionName') as { enums?: readonly string[] }).enums).toEqual(['_User', '_Role', 'Lesson']);
    expect(Object.keys(playOutputs(Record, { collectionName: 'Lesson' }, { wiredOutputs: ['prop-n', 'changed-n'] }))).toEqual(['prop-n', 'changed-n']);
    expect(Object.keys(playOutputs(Record, { collectionName: 'Lesson' }, {}))).toEqual([]);
    // States: value outputs from the params, state ports onWire
    expect(Object.keys(playOutputs(States, { states: 'A,B', values: 'x' }, {}))).toEqual(['x']);
    expect(Object.keys(playOutputs(States, { states: 'A,B', values: 'x' }, { wiredOutputs: ['reached-B'] }))).toEqual(['x', 'reached-B']);
    expect(drawnPorts(States, { states: 'A,B', values: 'x' }).filter((p) => p.source === 'derived' && p.plug === 'output').map((p) => p.name)).toEqual(['x', 'at-A', 'reached-A', 'at-B', 'reached-B']);
  });
});
