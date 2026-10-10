/**
 * NSP-020 — the ports-parity drive, oracle (b): `declared-port-groups` (task §3.1 decision 5).
 *
 * A declared port group is never announced by the runtime: `dynamicports: [{condition, inputs,
 * outputs}]` is static registration metadata the EDITOR evaluates, port by port, with
 * `evaluateDynamicPortsCondition` (models/nodelibrary/dynamicPortRules.ts :116-172) over
 * `node.getParameter(name)` — which falls back to the port's default (NodeGraphNode.ts :829-833); the test's node
 * falls back to the CATALOG's default (the registration's), never the spec's, so a spec default that drifted from the
 * editor's shows as a disagreement instead of agreeing with itself (s80).
 * The spec says the same thing as `when(params)` on the declared port (spec.ts `PortMeta.when`),
 * read by `portsOf` over the params with the declared defaults filled in (ports.ts
 * `effectiveParams`). This test is where the two dialects meet: for every catalog group whose
 * ports carry a `when`, over a probe set (the defaults, then every value the condition names, one
 * at a time and all together), the editor's verdict on the condition equals "the port is in
 * `portsOf`". Both directions: a port with a `when` the catalog lists in no group is a row too.
 *
 * Ports the catalog puts under a condition and the spec has not yet given a `when` are OWED, counted
 * and printed, never failed — `WHEN_FLOOR` is the ratchet: it is the number of graded ports at the
 * last commit, and a lane that adds `when`s raises it to what the census prints (never to a round
 * number; the census is the artefact). A `#js` condition (the icon-source pair on Checkbox, Radio Button and Icon)
 * is graded the same way, over the cross product of every `params.<name> === <literal>` it names, each also unset.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-020
 */
import * as fs from 'fs';
import * as path from 'path';

import { portsOf, specs } from '@nodegx/node-spec';
import type { AnyNodeSpec } from '@nodegx/node-spec';

import { evaluateDynamicPortsCondition, tokenizeCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';

/** Graded `when` ports at the last commit — s79: 3 (Image's size-mode trio); s80: 448, every conditioned port of every specced node. Raise to the census, never past it. */
const WHEN_FLOOR = 448;

interface Group {
  condition?: string;
  inputs?: string[];
  outputs?: string[];
  name?: string;
}
interface CatalogNode {
  typeName: string;
  inputs?: Array<{ name: string; default?: unknown }>;
  dynamicPorts?: { declaredPortGroups?: Group[] } | null;
}

const ROOT = path.resolve(__dirname, '..', '..', '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'noodl-types', 'src', 'node-catalog.json'), 'utf8')) as { nodes: CatalogNode[] };

const catalogByType = new Map(catalog.nodes.map((n) => [n.typeName, n]));

/** The editor's node, as the evaluator reads it: the probe's params, the REGISTRATION's default (the catalog's) under an unset name. */
function nodeFor(type: string, probe: Record<string, unknown>) {
  const inputs = catalogByType.get(type)?.inputs ?? [];
  return {
    parameters: probe,
    getParameter: (name: string) => {
      if (probe[name] !== undefined) return probe[name];
      return inputs.find((p) => p.name === name)?.default;
    }
  };
}

/** `<param> = v` and `<param> != v` pairs in a plain condition; `NOT SET` names a param with no value. */
function assignments(condition: string): Array<[string, string]> {
  const tokens = tokenizeCondition(condition).map((t) => t.replace(/'/g, ''));
  const out: Array<[string, string]> = [];
  for (let i = 0; i + 2 < tokens.length; i += 4) {
    const [param, op, value] = [tokens[i], tokens[i + 1], tokens[i + 2]];
    if (op === '=' || op === '!=') out.push([param, value]);
  }
  return out;
}

/** A `#js` condition's probe set: every `params.<name> === <literal>` it names, crossed, each name also unset and also something else. */
function jsProbesFor(condition: string): Array<Record<string, unknown>> {
  const values = new Map<string, unknown[]>();
  for (const m of condition.matchAll(/params\.(\w+)\s*===?\s*(true|false|undefined|'[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)/g)) {
    const literal = m[2] === 'undefined' ? undefined : JSON.parse(m[2].replace(/^'|'$/g, '"'));
    const list = values.get(m[1]) ?? [undefined, 'something-else'];
    if (!list.includes(literal)) list.push(literal);
    values.set(m[1], list);
  }
  let probes: Array<Record<string, unknown>> = [{}];
  for (const [name, list] of values) probes = probes.flatMap((probe) => list.map((v) => (v === undefined ? probe : { ...probe, [name]: v })));
  return probes;
}

/** A condition's probe set: the defaults; each assignment alone; every assignment at once; each with its value negated. */
function probesFor(condition: string): Array<Record<string, unknown>> {
  if (condition.startsWith('#js')) return jsProbesFor(condition);
  const pairs = assignments(condition);
  const probes: Array<Record<string, unknown>> = [{}];
  for (const [param, value] of pairs) probes.push({ [param]: revive(value) }, { [param]: 'not-' + value });
  if (pairs.length > 1) probes.push(Object.fromEntries(pairs.map(([p, v]) => [p, revive(v)])));
  return probes;
}

/** The editor compares `'' + getParameter(name) === value` — a param stored as a boolean or number reads the same as its text. */
function revive(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

interface Census {
  graded: Array<{ type: string; port: string; condition: string }>;
  owed: Array<{ type: string; port: string; condition: string; why: string }>;
  unlisted: Array<{ type: string; port: string }>;
}

function census(): Census {
  const c: Census = { graded: [], owed: [], unlisted: [] };
  const listed = new Map<string, Set<string>>();
  for (const node of catalog.nodes) {
    const spec = specs[node.typeName];
    const groups = node.dynamicPorts?.declaredPortGroups ?? [];
    if (!spec || groups.length === 0) continue;
    const seen = new Set<string>();
    listed.set(node.typeName, seen);
    for (const group of groups) {
      if (!group.condition) continue; // a `namedports/derived` rule, not a condition
      for (const [plug, names] of [['input', group.inputs ?? []], ['output', group.outputs ?? []]] as const) {
        for (const port of names) {
          seen.add(plug + ':' + port);
          const decl = (plug === 'input' ? spec.inputs[port] : spec.outputs[port]) as { when?: unknown } | undefined;
          if (!decl) {
            c.owed.push({ type: node.typeName, port, condition: group.condition, why: 'the spec does not declare the port' });
          } else if (decl.when) {
            c.graded.push({ type: node.typeName, port, condition: group.condition });
          } else {
            c.owed.push({ type: node.typeName, port, condition: group.condition, why: 'no when' });
          }
        }
      }
    }
  }
  // the reverse direction: a `when` the catalog lists in no group
  for (const spec of Object.values(specs)) {
    const seen = listed.get(spec.type) ?? new Set<string>();
    for (const [plug, decls] of [['input', spec.inputs], ['output', spec.outputs]] as const) {
      for (const [port, decl] of Object.entries(decls as Record<string, { when?: unknown }>)) {
        if (decl.when && !seen.has(plug + ':' + port)) c.unlisted.push({ type: spec.type, port });
      }
    }
  }
  return c;
}

describe('NSP-020 oracle (b): a declared port group and its `when` agree', () => {
  const c = census();

  test('the census — what is graded, what is owed (printed), the floor', () => {
    const byWhy = new Map<string, number>();
    for (const o of c.owed) byWhy.set(o.why, (byWhy.get(o.why) ?? 0) + 1);
    // eslint-disable-next-line no-console
    console.log(
      `NSP-020 declared-port-groups: ${c.graded.length} ports graded by a when, ${c.owed.length} owed (${[...byWhy].map(([w, n]) => `${n} ${w}`).join('; ')}), ${c.unlisted.length} when(s) in no catalog group`
    );
    expect(c.graded.length).toBeGreaterThanOrEqual(WHEN_FLOOR);
    expect(c.graded.length + c.owed.length).toBeGreaterThan(0);
  });

  test('a `when` the catalog lists in no group is a row, not a surprise', () => {
    expect(c.unlisted).toEqual([]);
  });

  describe('every graded port: the editor evaluating the condition == the port being in portsOf', () => {
    const cases = c.graded.map((g) => [`${g.type} · ${g.port} · ${g.condition}`, g] as const);
    test.each(cases)('%s', (_name, g) => {
      const spec = specs[g.type];
      const plug = g.port in spec.inputs ? 'inputs' : 'outputs';
      for (const probe of probesFor(g.condition)) {
        const editor = evaluateDynamicPortsCondition(g.condition, nodeFor(g.type, probe));
        const drawn = g.port in portsOf(spec, probe)[plug];
        expect({ probe, drawn }).toEqual({ probe, drawn: editor });
      }
    });
  });

  test('PLANTED: a `when` that disagrees with its condition is red', () => {
    const image = specs['Image'];
    const planted = { ...image, inputs: { ...image.inputs, objectFit: { ...image.inputs.objectFit, when: (p: Readonly<Record<string, unknown>>) => p.sizeMode !== 'explicit' } } };
    const condition = 'sizeMode = explicit';
    const disagreements = probesFor(condition).filter((probe) => evaluateDynamicPortsCondition(condition, nodeFor('Image', probe)) !== 'objectFit' in portsOf(planted, probe).inputs);
    expect(disagreements.length).toBeGreaterThan(0);
  });

  test('PLANTED: a spec default that drifted from the editor\'s is red (the node falls back to the catalog, not the spec)', () => {
    const image = specs['Image'];
    const planted = { ...image, inputs: { ...image.inputs, sizeMode: { ...image.inputs.sizeMode, default: 'explicit' } } };
    const condition = 'sizeMode = explicit';
    expect(evaluateDynamicPortsCondition(condition, nodeFor('Image', {}))).toBe(false); // the editor's default: contentSize
    expect('objectFit' in portsOf(image, {}).inputs).toBe(false);
    expect('objectFit' in portsOf(planted, {}).inputs).toBe(true); // the drifted spec draws a port the editor hides
  });
});
