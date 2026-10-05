/**
 * P109 ISL-006 — a Function says what its ports are (ruled s18: "List adds, code still mines").
 *
 * A Function's ports are its written list (`scriptInputs` / `scriptOutputs`, each row typed by `intype-` /
 * `outtype-`) plus every `Inputs.x` / `Outputs.y` its code names, plus any port saved on the node by hand
 * (`ports`, SB-004's workaround). A wire to a name in none of the three is refused at the door (AC4, closing
 * P78 D80).
 *
 * ## Why refusing is safe: measured s19, the editor's build deletes that wire
 *
 * The runtime keeps such a wire: `registerInputIfNeeded` / `registerOutputIfNeeded` register any `in-` / `out-`
 * name on arrival, an unread input still re-runs the Function, and `Outputs[k]` reaches a wire from `out-<k>`
 * (scratch runtime probe s19: runs 1→3 in both the read and unread arms; `Outputs[k] = 5` arrived). But the
 * editor's port list is exactly those three sources (`NodeGraphNode.getPorts`), the canvas paints any other wire
 * "Target port doesn't exist" at `level: 'error'`, and `exportComponent` drops every error-level wire (DEF-034).
 * So the app the editor builds never has it. The fix the refusal names is the ruled route: write the name on the
 * list.
 *
 * Corpus s19 (templates, library, catalog examples: 1,214 Functions, 9,669 prefixed endpoints): 22 wires name a
 * port neither the list nor the code makes; 17 survive through a saved port, 5 are deleted by the editor's build.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { TestSession } from './helpers';
import { call, connect, copyFixture } from './helpers';

interface Diag {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
}
interface Either {
  created?: string;
  validation?: { diagnostics?: Diag[] };
  error?: { code: string; message: string; details?: { newErrors?: Diag[]; diagnostics?: Diag[] } };
}

function diagsOf(res: { data: Either }): Diag[] {
  return [res.data?.validation?.diagnostics, res.data?.error?.details?.newErrors, res.data?.error?.details?.diagnostics].flatMap(
    (b) => (Array.isArray(b) ? b : [])
  );
}

/** The written Function node, read back from disk. */
function diskFunction(projectDir: string, basename: string): { ports?: Array<{ name: string; plug: string; type: unknown }> } {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(d, e.name);
      if (e.name === basename && fs.existsSync(path.join(p, 'nodes.json'))) hits.push(p);
      else walk(p);
    }
  };
  walk(path.join(projectDir, 'components'));
  const nodes = JSON.parse(fs.readFileSync(path.join(hits[0], 'nodes.json'), 'utf8')).nodes as Array<{ type: string }>;
  return nodes.find((n) => n.type === 'JavaScriptFunction') as never;
}

type Wire = [string, string, string, string];

function graph(fn: Record<string, unknown>, wires: Wire[]) {
  return {
    nodes: [
      { id: 'src', type: 'Variable2', parameters: { name: 'isl006In' } },
      { id: 'fn', type: 'JavaScriptFunction', ...fn },
      { id: 'va', type: 'Variable2', parameters: { name: 'isl006A' } },
      { id: 'vb', type: 'Variable2', parameters: { name: 'isl006B' } },
      { id: 'vc', type: 'Variable2', parameters: { name: 'isl006C' } }
    ],
    connections: wires.map(([fromId, fromProperty, toId, toProperty]) => ({ fromId, fromProperty, toId, toProperty }))
  };
}

const LISTED = {
  parameters: {
    functionScript: 'Outputs.a = 1;\nOutputs.b = 2;',
    scriptOutputs: [{ id: 'a', label: 'a' }],
    'outtype-a': 'number'
  }
};
const WIRES_AB: Wire[] = [
  ['fn', 'out-a', 'va', 'value'],
  ['fn', 'out-b', 'vb', 'value']
];

describe('ISL-006 — a Function says what its ports are', () => {
  let session: TestSession;
  let dir: string;
  let n = 0;
  const write = (fn: Record<string, unknown>, wires: Wire[]) =>
    call<Either>(session, 'create_component', { path: `Isl006/Probe${++n}`, ...graph(fn, wires) }).then((res) => ({
      res,
      name: `Probe${n}`,
      unknown: diagsOf(res).filter((d) => d.code === 'unknown-function-port')
    }));

  beforeAll(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });
  afterAll(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('known-firing: the list types its port, the code adds an untyped one, both wires accepted', async () => {
    const { res, name } = await write(LISTED, WIRES_AB);
    expect(res.isError).toBe(false);
    const ports = diskFunction(dir, name).ports ?? [];
    expect(ports.find((p) => p.name === 'out-a')).toMatchObject({ plug: 'output', type: 'number' });
    expect(ports.find((p) => p.name === 'out-b')).toMatchObject({ plug: 'output', type: '*' });
  });

  it('AC4 (D80): a wire from an output neither the list nor the code makes is refused, naming it and the list', async () => {
    const { res, unknown } = await write(LISTED, [...WIRES_AB, ['fn', 'out-c', 'vc', 'value']]);
    // eslint-disable-next-line no-console
    console.log(`[AC4 out-c] ${unknown[0]?.message}\n  suggestion: ${unknown[0]?.suggestion}`);
    expect(res.isError).toBe(true);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('"out-c"');
    expect(unknown[0].suggestion).toContain('scriptOutputs');
  });

  it('AC4 (D80): a wire into an input the code never reads is refused the same way', async () => {
    const { res, unknown } = await write(LISTED, [...WIRES_AB, ['src', 'value', 'fn', 'in-z']]);
    expect(res.isError).toBe(true);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('"in-z"');
    expect(unknown[0].suggestion).toContain('scriptInputs');
  });

  it('control: the same input, written on the list, is accepted (a trigger input is declared, not read)', async () => {
    const fn = { parameters: { ...LISTED.parameters, scriptInputs: [{ id: 'z', label: 'z' }] } };
    const { res, unknown } = await write(fn, [...WIRES_AB, ['src', 'value', 'fn', 'in-z']]);
    expect(unknown).toEqual([]);
    expect(res.isError).toBe(false);
  });

  it('control: a port saved on the node by hand (SB-004) is accepted', async () => {
    const fn = { ...LISTED, ports: [{ name: 'in-z', plug: 'input', type: '*' }] };
    const { res, unknown } = await write(fn, [...WIRES_AB, ['src', 'value', 'fn', 'in-z']]);
    expect(unknown).toEqual([]);
    expect(res.isError).toBe(false);
  });

  it('control: an output the code names only through a variable is accepted once it is on the list', async () => {
    const fn = {
      parameters: { functionScript: "for (const k of ['c']) Outputs[k] = 3;", scriptOutputs: [{ id: 'c', label: 'c' }] }
    };
    const { res, unknown } = await write(fn, [['fn', 'out-c', 'vc', 'value']]);
    expect(unknown).toEqual([]);
    expect(res.isError).toBe(false);
  });
});
