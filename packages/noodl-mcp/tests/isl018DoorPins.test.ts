/**
 * P109 ISL-018 — ruled 2026-10-05 "Agent writes 'ticked'" (README §8 round 5).
 *
 * In a project below format 5 the editor's one-time clean-up writes `runOnChange-<input>: false` on every unanswered
 * value input of a node whose Run is wired. The door wrote no answer, so a Function an agent wired to Run stopped
 * running when its values changed, the first time a person opened the project. The door now pins `true` on the boxes
 * of the nodes IT writes; everything it did not write is left for the clean-up.
 *
 * The instrument is the editor's own planner (`planRunOnValueChangeMigration`) run over the component as it lands on
 * disk: "what would the one-time clean-up write here". Its known-firing control is the same graph written into a
 * format-5 project, where the door pins nothing and the planner names the box.
 *
 * @module noodl-mcp/tests/isl018DoorPins
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { planRunOnValueChangeMigration } from '@nodegx/project-contract/run-on-value-change-migration';

import { createServer } from '../src/server';
import { TICKED_WHY } from '../src/project/runOnChangePins';
import type { CreateComponentResponse, UpdateComponentResponse } from '../src/tools/responses';
import { call, copyFixture, type TestSession } from './helpers';

async function open(projectDir: string): Promise<TestSession> {
  const { server, binding } = createServer({ projectDir, allowWrites: true });
  const store = binding.require();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl018', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    store,
    projectDir,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

async function must<T>(session: TestSession, tool: string, args: Record<string, unknown>): Promise<T> {
  const res = await call<T>(session, tool, args);
  if (res.isError) throw new Error(`${tool} refused: ${JSON.stringify(res.data)}`);
  return res.data;
}

function fixtureAt(version: string): string {
  const dir = copyFixture();
  const file = path.join(dir, 'nodegx.project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  project.version = version;
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
  return dir;
}

type DiskNode = { id: string; type: string; parameters?: Record<string, unknown> };

function onDisk(dir: string, component: string): { nodes: DiskNode[]; connections: unknown[] } {
  const base = path.join(dir, 'components', component);
  return {
    nodes: JSON.parse(fs.readFileSync(path.join(base, 'nodes.json'), 'utf8')).nodes,
    connections: JSON.parse(fs.readFileSync(path.join(base, 'connections.json'), 'utf8')).connections
  };
}

/** What the editor's one-time clean-up would write into this component, by node id. */
function cleanUpWrites(dir: string, component: string): Record<string, string[]> {
  const { nodes, connections } = onDisk(dir, component);
  const plan = planRunOnValueChangeMigration({
    components: [{ name: component, graph: { roots: nodes as never, connections: connections as never } }]
  });
  const out: Record<string, string[]> = {};
  for (const w of plan.writes) (out[w.nodeId] = out[w.nodeId] ?? []).push(w.parameter);
  return out;
}

const NODES = [
  { id: 'root', type: 'Group' },
  { id: 'greet-btn', type: 'Button', parent: 'root' },
  { id: 'label', type: 'Text', parent: 'root', parameters: { text: '' } },
  { id: 'fn', type: 'JavaScriptFunction', parameters: { functionScript: "Outputs.msg = 'hi ' + Inputs.name;", 'in-name': 'Ada' } },
  { id: 'fn2', type: 'JavaScriptFunction', parameters: { functionScript: "Outputs.msg = 'bye ' + Inputs.name;", 'in-name': 'Bo' } }
];
const CONNECTIONS = [
  { fromId: 'greet-btn', fromProperty: 'onClick', toId: 'fn', toProperty: 'run' },
  { fromId: 'fn', fromProperty: 'out-msg', toId: 'label', toProperty: 'text' }
];
const PATH = 'Sections/Greet';

describe('ISL-018 — the door says "ticked" on the Run-driven nodes it writes into a project the editor will clean up', () => {
  it('format 4: the Function it creates carries runOnChange-in-name: true, first in its bag, and the clean-up writes nothing to it', async () => {
    const dir = fixtureAt('4');
    const session = await open(dir);
    let created: CreateComponentResponse;
    try {
      created = await must<CreateComponentResponse>(session, 'create_component', { path: PATH, nodes: NODES, connections: CONNECTIONS });
    } finally {
      await session.close();
    }
    // §5 "Report it": the response names the box it ticked and says why (s36: an agent over stdio read nothing of
    // the pin and told its person the boxes "stay at their defaults").
    expect(created.ticked).toEqual({ boxes: [{ node: 'fn', parameter: 'runOnChange-in-name' }], why: TICKED_WHY });
    const fn = onDisk(dir, PATH).nodes.find((n) => n.id === 'fn')!;
    expect(fn.parameters?.['runOnChange-in-name']).toBe(true);
    expect(Object.keys(fn.parameters ?? {})[0]).toBe('runOnChange-in-name');
    // A Function whose Run is not wired is not signal-driven: the clean-up never touches it, so neither does the door.
    const fn2 = onDisk(dir, PATH).nodes.find((n) => n.id === 'fn2')!;
    expect(Object.keys(fn2.parameters ?? {}).some((k) => k.startsWith('runOnChange-'))).toBe(false);
    expect(cleanUpWrites(dir, PATH)).toEqual({});
  });

  it('control — format 5: the same write pins nothing, and the planner names the box (the instrument sees it)', async () => {
    const dir = fixtureAt('5');
    const session = await open(dir);
    let created: CreateComponentResponse;
    try {
      created = await must<CreateComponentResponse>(session, 'create_component', { path: PATH, nodes: NODES, connections: CONNECTIONS });
    } finally {
      await session.close();
    }
    expect(created.ticked).toBeUndefined();
    const fn = onDisk(dir, PATH).nodes.find((n) => n.id === 'fn')!;
    expect(fn.parameters?.['runOnChange-in-name']).toBeUndefined();
    expect(cleanUpWrites(dir, PATH)).toEqual({ fn: ['runOnChange-in-name'] });
  });

  it('a node the call did NOT write is left for the clean-up; a node it wires to Run is the door\'s, and is pinned', async () => {
    // An "old" component: written at format 5 (no pins), then the project is put back to format 4.
    const dir = fixtureAt('5');
    let session = await open(dir);
    try {
      await must(session, 'create_component', { path: PATH, nodes: NODES, connections: CONNECTIONS });
    } finally {
      await session.close();
    }
    const file = path.join(dir, 'nodegx.project.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), version: '4' }, null, 2));

    session = await open(dir);
    try {
      // Touch only the label: fn is not this call's, so the clean-up still repairs it.
      const label = await must<UpdateComponentResponse>(session, 'update_component', {
        path: PATH,
        operations: [{ op: 'update_node', id: 'label', parameters: { text: 'Hello' } }]
      });
      expect(label.ticked).toBeUndefined();
      expect(cleanUpWrites(dir, PATH)).toEqual({ fn: ['runOnChange-in-name'] });

      // Wire fn2's Run: the agent made it signal-driven, so it says what it means.
      const wired = await must<UpdateComponentResponse>(session, 'update_component', {
        path: PATH,
        operations: [{ op: 'add_connection', connection: { fromId: 'greet-btn', fromProperty: 'onClick', toId: 'fn2', toProperty: 'run' } }]
      });
      expect(wired.ticked?.boxes).toEqual([{ node: 'fn2', parameter: 'runOnChange-in-name' }]);
    } finally {
      await session.close();
    }
    const nodes = onDisk(dir, PATH).nodes;
    expect(nodes.find((n) => n.id === 'fn2')!.parameters?.['runOnChange-in-name']).toBe(true);
    expect(nodes.find((n) => n.id === 'fn')!.parameters?.['runOnChange-in-name']).toBeUndefined();
    expect(cleanUpWrites(dir, PATH)).toEqual({ fn: ['runOnChange-in-name'] });
  });

  it('a rewrite that leaves the pinned box out is still a no-op (ISL-019)', async () => {
    const dir = fixtureAt('4');
    const session = await open(dir);
    try {
      await must(session, 'create_component', { path: PATH, nodes: NODES, connections: CONNECTIONS });
      const before = fs.readFileSync(path.join(dir, 'components', PATH, 'nodes.json'), 'utf8');
      // The graph as the agent first sent it — no runOnChange key anywhere.
      const same = await must<UpdateComponentResponse>(session, 'update_component', {
        path: PATH,
        set: { nodes: NODES, connections: CONNECTIONS }
      });
      expect(same.unchanged).toBe(true);
      expect(same.ticked).toBeUndefined();
      expect(fs.readFileSync(path.join(dir, 'components', PATH, 'nodes.json'), 'utf8')).toBe(before);
    } finally {
      await session.close();
    }
  });

  it('an explicit "false" the caller sends is kept: the door answers only the boxes nobody answered', async () => {
    const dir = fixtureAt('4');
    const session = await open(dir);
    const nodes = NODES.map((n) => (n.id === 'fn' ? { ...n, parameters: { ...n.parameters, 'runOnChange-in-name': false } } : n));
    let created: CreateComponentResponse;
    try {
      created = await must<CreateComponentResponse>(session, 'create_component', { path: PATH, nodes, connections: CONNECTIONS });
    } finally {
      await session.close();
    }
    expect(created.ticked).toBeUndefined();
    const fn = onDisk(dir, PATH).nodes.find((n) => n.id === 'fn')!;
    expect(fn.parameters?.['runOnChange-in-name']).toBe(false);
    expect(cleanUpWrites(dir, PATH)).toEqual({});
  });

  it('apply_plan says which boxes it ticked, by component', async () => {
    const dir = fixtureAt('4');
    const session = await open(dir);
    const logic = [
      { id: 'ins', type: 'Component Inputs', ports: [{ name: 'go', plug: 'output', type: 'signal' }] },
      { id: 'fn', type: 'JavaScriptFunction', parameters: { functionScript: "Outputs.msg = 'hi ' + Inputs.name;", 'in-name': 'Ada' } }
    ];
    try {
      const plan = await must<{ planId: string; operations: Array<{ id: string }> }>(session, 'create_plan', {
        request: 'Add a greeting step',
        operations: [{ kind: 'create', target: 'Logic/Greet', intent: 'Says hello when asked' }]
      });
      await must(session, 'stage_plan_operation', {
        plan_id: plan.planId,
        operation_id: plan.operations[0].id,
        nodes: logic,
        connections: [{ fromId: 'ins', fromProperty: 'go', toId: 'fn', toProperty: 'run' }]
      });
      const applied = await must<{ ticked?: { boxes: unknown[]; why: string } }>(session, 'apply_plan', { plan_id: plan.planId });
      expect(applied.ticked).toEqual({
        boxes: [{ component: 'Logic/Greet', node: 'fn', parameter: 'runOnChange-in-name' }],
        why: TICKED_WHY
      });
    } finally {
      await session.close();
    }
    expect(cleanUpWrites(dir, 'Logic/Greet')).toEqual({});
  });
});
