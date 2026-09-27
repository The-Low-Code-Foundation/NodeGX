/**
 * GAM-019 AC8 — the agent's door: both on-disk validation tools carry the refusal.
 *
 * P78 D66 was `nfIn.name0 → nfName.text` on a Text Input, which has no `text` input. The
 * editor-side spec (`noodl-editor/tests-unit/gam-019/builtinPortDoor.test.ts`) grades the rule.
 * This one grades what an agent is told: `validate_component` and `validate_project`, called as
 * tools over a real session on a project whose files carry the wire.
 *
 * 🔴 Each tool is asserted once (DEF-002 AC6: a check in a second pipeline is a duplicate first),
 * and each run carries the refusal beside the accepted wire, one port name away. A tool that
 * validated nothing would pass a "no finding on the good wire" assertion on its own.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture } from './helpers';
import type { TestSession } from './helpers';

const HOME_KEY = 'Pages/Home';

interface Finding {
  code: string;
  severity?: string;
  location?: { nodeId?: string; port?: string };
  suggestion?: string;
  alternatives?: string[];
}

/** Overwrite Home's nodes and connections on disk, before the session's store reads them. */
function writeHome(projectDir: string): void {
  const dir = path.join(projectDir, 'components', HOME_KEY);
  const nodesFile = path.join(dir, 'nodes.json');
  const connectionsFile = path.join(dir, 'connections.json');
  const existingNodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
  const existingConnections = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
  const nodes = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Home' }, children: ['layout'] },
    {
      id: 'layout',
      type: 'Group',
      label: 'Layout',
      parent: 'page',
      children: ['source', 'nameBox', 'nameBoxOk', 'nameBoxTyped']
    },
    { id: 'source', type: 'net.noodl.controls.textinput', label: 'Source', parent: 'layout' },
    { id: 'nameBox', type: 'net.noodl.controls.textinput', label: 'Name box', parent: 'layout' },
    { id: 'nameBoxOk', type: 'net.noodl.controls.textinput', label: 'Name box, wired right', parent: 'layout' },
    // D66's own shape: a string from a typed `Component Inputs` port (ruled 2026-09-14, the hint).
    { id: 'pageIn', type: 'Component Inputs', label: 'Page inputs', ports: [{ name: 'name0', plug: 'output', type: 'string' }] },
    { id: 'nameBoxTyped', type: 'net.noodl.controls.textinput', label: 'Name box, fed a string', parent: 'layout' }
  ];
  const connections = [
    { fromId: 'source', fromProperty: 'onTextChanged', toId: 'nameBox', toProperty: 'text' },
    { fromId: 'source', fromProperty: 'onTextChanged', toId: 'nameBoxOk', toProperty: 'startValue' },
    { fromId: 'pageIn', fromProperty: 'name0', toId: 'nameBoxTyped', toProperty: 'text' }
  ];
  fs.writeFileSync(nodesFile, JSON.stringify({ ...existingNodes, nodes }, null, 2));
  fs.writeFileSync(connectionsFile, JSON.stringify({ ...existingConnections, connections }, null, 2));
}

/** Every diagnostic in a tool response, wherever the tool nests them. */
function findingsIn(data: unknown): Finding[] {
  const out: Finding[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (typeof o.code === 'string' && o.location && typeof o.location === 'object') out.push(o as unknown as Finding);
    else Object.values(o).forEach(walk);
  };
  walk(data);
  return out;
}

const portFinding = (found: Finding[], nodeId: string, port: string) =>
  found.find((d) => d.code === 'nonexistent-port' && d.location?.nodeId === nodeId && d.location?.port === port);

describe('GAM-019 AC8 — a wire to a port a Text Input does not have, through the validation tools', () => {
  let session: TestSession | undefined;

  beforeEach(async () => {
    const dir = copyFixture();
    writeHome(dir);
    session = await connect(dir);
  });

  afterEach(async () => {
    await session?.close();
    session = undefined;
  });

  it('validate_component refuses `text` by name, offers `startValue`, and accepts `startValue`', async () => {
    const { data } = await call<unknown>(session!, 'validate_component', { path: HOME_KEY });
    const found = findingsIn(data);

    const refusal = portFinding(found, 'nameBox', 'text');
    expect(refusal).toBeDefined();
    expect(refusal!.severity).toBe('error');
    expect(refusal!.alternatives).toContain('startValue');
    expect(portFinding(found, 'nameBoxOk', 'startValue')).toBeUndefined();
  });

  it('validate_component does not offer the signal `set` to a string wire (the hint, ruled 2026-09-14)', async () => {
    const { data } = await call<unknown>(session!, 'validate_component', { path: HOME_KEY });
    const found = findingsIn(data);

    // Known-firing: `onTextChanged` is declared `*`, which has no kind, so that wire keeps the
    // edit-distance hint. That proves the tool carries `suggestion` at all.
    expect(portFinding(found, 'nameBox', 'text')!.suggestion).toBe('set');
    const typed = portFinding(found, 'nameBoxTyped', 'text');
    expect(typed).toBeDefined();
    expect(typed!.suggestion).not.toBe('set');
    expect(typed!.alternatives).toContain('startValue');
  });

  it('validate_project carries the same refusal, and not for the wire that is right', async () => {
    const { data } = await call<unknown>(session!, 'validate_project', {});
    const found = findingsIn(data);

    expect(portFinding(found, 'nameBox', 'text')).toBeDefined();
    expect(portFinding(found, 'nameBoxOk', 'startValue')).toBeUndefined();
  });
});
