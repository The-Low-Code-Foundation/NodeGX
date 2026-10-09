/**
 * NSP-018 (phase 107) AC3 — `get_node_type` returns a specced node's rules, and they are the spec's.
 *
 * The rules are generated (scripts/node-spec/rules.js, through `catalog:generate` → `catalog:merge`) from the `says` on
 * each branch of the node's reducers in `packages/nodegx-node-spec/src/nodes` — the same reducers the conformance suite
 * plays against the runtime. The expectations below are derived from the enriched catalog, never written as literals
 * (CMP-006's reason: a hard-coded sentence passes on a stale corpus), except for the one line that is the task's own
 * example, which is checked by content so a relay that dropped the wire half would show.
 *
 * Where they travel: full detail (all of them) and the `ports` path (the asked ports' only). NOT the default summary —
 * its size is a measured contract (AWP-005 §2) and the rules of a node with dozens of reducers are not priced yet; the
 * negative assertion below is there to be overturned on purpose, with a measurement, as CMP-006 AC3 did for antiPatterns.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, type TestSession } from './helpers';

type Rules = Record<string, string[]>;

interface Row {
  typeName: string;
  ports?: string[];
  rules?: Rules;
  inputs?: Array<{ name: string }>;
}

const ENRICHED = path.resolve(__dirname, '..', '..', 'noodl-types', 'src', 'node-catalog-enriched.json');

let session: TestSession;
let counterRules: Rules | undefined;

beforeAll(async () => {
  session = await connect(copyFixture(), true);
  const parsed = JSON.parse(fs.readFileSync(ENRICHED, 'utf8')) as { nodes: Array<{ typeName: string; rules?: Rules }> };
  counterRules = parsed.nodes.find((n) => n.typeName === 'Counter')?.rules;
});

afterAll(async () => {
  await session.close();
});

describe('NSP-018 — get_node_type carries the rules the spec says', () => {
  it('🔴 the arming check: the corpus has Counter rules for all four of its reducers', () => {
    // without them every equality below is `undefined === undefined`
    expect(Object.keys(counterRules ?? {}).sort()).toEqual(['decrease', 'increase', 'reset', 'startValue']);
    expect(counterRules!.increase).toContain('at Max Value with Limits Enabled → Unchanged; Count Changed stays silent');
  });

  it('🔴 detail:"full" relays the rules verbatim', async () => {
    const { isError, data } = await call<{ types: Row[]; summarized?: string[] }>(session, 'get_node_type', {
      type_names: ['Counter'],
      detail: 'full'
    });
    expect(isError).toBe(false);
    expect(data.summarized).toBeUndefined();
    expect(data.types[0].rules).toEqual(counterRules);
  });

  it('🔴 the ports path carries the asked ports’ rules and no others', async () => {
    const { isError, data } = await call<{ types: Row[] }>(session, 'get_node_type', { type_names: ['Counter'], ports: ['increase', 'currentCount'] });
    expect(isError).toBe(false);
    const row = data.types[0];
    // the control: this is the ports view (it found the asked port), not an empty answer
    expect((row.inputs ?? []).map((p) => p.name)).toEqual(['increase']);
    expect(row.rules).toEqual({ increase: counterRules!.increase });
  });

  it('a ports request whose ports have no rules carries no `rules` key', async () => {
    const { data } = await call<{ types: Row[] }>(session, 'get_node_type', { type_names: ['Counter'], ports: ['currentCount'] });
    expect(data.types[0].typeName).toBe('Counter');
    expect(data.types[0].rules).toBeUndefined();
  });

  it('the default summary does not carry them (yet — see the header)', async () => {
    const { data } = await call<{ types: Row[] }>(session, 'get_node_type', { type_names: ['Counter'] });
    // the control: a summary always has its port lines
    expect((data.types[0].ports ?? []).length).toBeGreaterThan(0);
    expect(data.types[0].rules).toBeUndefined();
  });
});
