/**
 * P112 OWN-023 round 3 — the graph as text.
 *
 * Two strangers with no documentation wrote Python over the component JSON to list nodes and wires
 * before they read anything; this is that page, shipped. The claim the page makes in its own header
 * is "every component, node, parameter and wire is here", so that is what is graded: by name, from
 * the files, never from a remembered example. The CLI flag and the MCP tool are the two doors onto
 * the same text, so both are driven and compared.
 */
import * as fs from 'fs';
import * as path from 'path';

import { componentGraphText, parseGraphFlag, projectGraphText, runGraphCli } from '../src/graphText';
import { ProjectStore } from '../src/project/ProjectStore';
import { callRawText, connect, copyFixture, reveal } from './helpers';

const SCRIPT = "if (!Inputs.save) return;\nconst w = Inputs.words || [];\nOutputs.buttons = w.map((x) => x + '!');\n";

/** A Function node the way the kit writes one (P18 EXP-019): declared ports, pins, out types, a script. */
function scriptNode() {
  return {
    id: '3f2a9c1e-7b4d-4e8f-9a0b-1c2d3e4f5a6b',
    type: 'JavaScriptFunction',
    label: 'The camera buttons',
    x: 480,
    y: 120,
    parameters: {
      uses: 'view/frame',
      'runOnChange-in-save': false,
      'runOnChange-in-words': true,
      scriptOutputs: [{ id: 'buttons', label: 'buttons' }],
      'outtype-buttons': 'array',
      functionScript: SCRIPT
    },
    ports: [
      { name: 'in-save', displayName: 'save', plug: 'input', type: '*', group: 'Inputs' },
      { name: 'in-words', displayName: 'words', plug: 'input', type: '*', group: 'Inputs' },
      { name: 'out-buttons', displayName: 'buttons', plug: 'output', type: '*', group: 'Outputs' }
    ],
    metadata: { comment: 'Runs only on a press.' }
  };
}

function addComponent(projectDir: string, key: string, files: { component: object; nodes: object; connections: object }): void {
  const dir = path.join(projectDir, 'components', key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'component.json'), JSON.stringify(files.component));
  fs.writeFileSync(path.join(dir, 'nodes.json'), JSON.stringify(files.nodes));
  fs.writeFileSync(path.join(dir, 'connections.json'), JSON.stringify(files.connections));
  const regPath = path.join(projectDir, 'components', '_registry.json');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  const nodes = (files.nodes as { nodes: unknown[] }).nodes.length;
  const connections = (files.connections as { connections: unknown[] }).connections.length;
  reg.components[key] = { path: key, type: (files.component as { type: string }).type, nodeCount: nodes, connectionCount: connections };
  fs.writeFileSync(regPath, JSON.stringify(reg));
}

describe('the graph as text', () => {
  let projectDir: string;
  let text: string;

  beforeAll(() => {
    projectDir = copyFixture();
    addComponent(projectDir, 'Game/Camera Bar', {
      component: { id: 'c_cam', name: 'Camera Bar', path: '/Game/Camera Bar', type: 'visual', description: 'The camera buttons\nover the view.' },
      nodes: {
        componentId: 'c_cam',
        nodes: [
          { id: 'cb_root', type: 'Group', label: 'Camera bar', parameters: { position: 'absolute', zIndex: 3 }, children: ['cb_rep'] },
          { id: 'cb_rep', type: 'For Each', parent: 'cb_root', parameters: { template: '/UI/Chip' } },
          { id: 'cb_save', type: 'net.noodl.GlobalStore.Subscribe', parameters: { storeName: 'gala', keys: 'save' } },
          scriptNode(),
          { id: 'cb_states', type: 'States', parameters: { states: 'a,b' }, stateParameters: { a: { x: 1 } }, variant: 'Pill' }
        ],
        visualRoots: ['cb_root']
      },
      connections: {
        componentId: 'c_cam',
        connections: [
          { fromId: 'cb_save', fromProperty: 'value', toId: '3f2a9c1e-7b4d-4e8f-9a0b-1c2d3e4f5a6b', toProperty: 'in-save' },
          { fromId: '3f2a9c1e-7b4d-4e8f-9a0b-1c2d3e4f5a6b', fromProperty: 'out-buttons', toId: 'cb_rep', toProperty: 'items' }
        ]
      }
    });
    fs.mkdirSync(path.join(projectDir, 'scripts', 'view'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'scripts', 'view', 'frame.js'), 'export function cam() {}\n');
    text = projectGraphText(new ProjectStore(projectDir));
  });

  it('the map lists every component with its type, counts and what it places; the header names the scripts', () => {
    const store = new ProjectStore(projectDir);
    for (const row of store.listComponents()) {
      expect(text).toContain(`- /${row.path} (${row.type}) ${row.nodeCount} nodes, ${row.connectionCount} wires`);
    }
    expect(text).toContain('- /Pages/Home (page)');
    expect(text).toMatch(/- \/Pages\/Home \(page\) .* — places \/Card/);
    const bytes = fs.statSync(path.join(projectDir, 'scripts', 'view', 'frame.js')).size;
    expect(text).toContain(`scripts/view/frame.js (${bytes} bytes)`);
    expect(text).toContain('## Map — 4 components');
  });

  it('every node id, type, parameter and wire of every component is on the page; layout and schema are not', () => {
    const store = new ProjectStore(projectDir);
    for (const row of store.listComponents()) {
      const { files } = store.readComponent(row.path);
      expect(text).toContain(`## /${row.path} (${files.component.type})`);
      for (const n of files.nodes.nodes) {
        const id = /^[0-9a-f-]{36}$/.test(n.id) ? n.id.replace(/-/g, '').slice(0, 8) : n.id;
        expect(text).toContain(`${id}: ${n.type.replace(/^\//, '')}`);
        for (const [k, v] of Object.entries(n.parameters ?? {})) {
          if (/^(runOnChange-|outtype-)/.test(k) || k === 'scriptOutputs') continue; // folded, asserted below
          if (typeof v === 'string' && (v.includes('\n') || v.length > 160)) continue; // printed as code, asserted below
          expect(text).toContain(`${k}: ${JSON.stringify(v)}`);
        }
      }
      for (const c of files.connections.connections) {
        const short = (id: string) => (/^[0-9a-f-]{36}$/.test(id) ? id.replace(/-/g, '').slice(0, 8) : id);
        expect(text).toContain(`${short(c.fromId)}.${c.fromProperty} -> ${short(c.toId)}.${c.toProperty}`);
      }
    }
    // The header *names* `$schema` as left out, so the absence is asserted on the fields as JSON would print them.
    expect(text).not.toMatch(/\bx: 480\b|\by: 120\b|"\$schema"|componentId:|"modified"|"created"/);
  });

  it('a Function reads as code: ports folded into one line each, the script as lines, the comment beside it', () => {
    const section = text.split('## /Game/Camera Bar')[1];
    expect(section).toContain('3f2a9c1e: JavaScriptFunction "The camera buttons" {uses: "view/frame"}');
    expect(section).toContain('inputs: save, words');
    expect(section).toContain('outputs: buttons: array');
    expect(section).toContain('run on value change OFF: save');
    expect(section).toContain('run on value change ON: words');
    expect(section).toContain('comment: Runs only on a press.');
    for (const line of SCRIPT.trim().split('\n')) expect(section).toContain(`| ${line}`);
    expect(section).not.toContain('functionScript: "'); // never as an escaped JSON string
    expect(section).not.toContain('runOnChange-in-save');
    expect(section).toContain('cb_states: States variant=Pill {states: "a,b"}');
    expect(section).toContain('state parameters: {"a":{"x":1}}');
    // The visual tree is indentation; the logic nodes sit under their own heading; the description is one line.
    expect(section).toMatch(/visual \(indent[^\n]*\n {4}cb_root: Group "Camera bar"[^\n]*\n {6}cb_rep: For Each \{template: "\/UI\/Chip"\}/);
    expect(section).toMatch(/\n {2}logic:\n {4}cb_save: net\.noodl\.GlobalStore\.Subscribe/);
    expect(section).toContain('  The camera buttons over the view.');
    expect(section).toContain('  places: /UI/Chip');
  });

  it('a prefix limits the sections and keeps the whole map', () => {
    const only = projectGraphText(new ProjectStore(projectDir), { prefix: 'Pages/' });
    expect(only).toContain('- /Game/Camera Bar (visual)');
    expect(only).toContain('## /Pages/Home (page)');
    expect(only).not.toContain('## /Game/Camera Bar');
    expect(only).toContain('(Sections below: the 1 component under /Pages/;');
    const one = projectGraphText(new ProjectStore(projectDir), { prefix: '/Game/Camera Bar' });
    expect(one).toContain('## /Game/Camera Bar (visual)');
    expect(one).not.toContain('## /Pages/Home');
  });

  it('componentGraphText is the section the page prints, and the whole page is smaller than the JSON it reads', () => {
    const store = new ProjectStore(projectDir);
    const { files } = store.readComponent('Game/Camera Bar');
    expect(text).toContain(componentGraphText('Game/Camera Bar', files));
    let jsonBytes = 0;
    for (const row of store.listComponents()) {
      for (const f of ['component.json', 'nodes.json', 'connections.json']) {
        jsonBytes += fs.statSync(path.join(projectDir, 'components', row.path, f)).size;
      }
    }
    expect(Buffer.byteLength(text)).toBeLessThan(jsonBytes);
  });

  it('the flag: --graph is the whole app, --graph=<prefix> a part, nothing else is the flag', () => {
    expect(parseGraphFlag(['/p'])).toBeUndefined();
    expect(parseGraphFlag(['/p', '--graph'])).toEqual({});
    expect(parseGraphFlag(['--graph=Pages/', '/p'])).toEqual({ prefix: 'Pages/' });
    expect(parseGraphFlag(['/p', '--graphs'])).toBeUndefined();
  });

  it('the command line prints the same page to stdout and writes nothing; no directory or a bad one is a refusal', () => {
    const before = snapshot(projectDir);
    const drive = (argv: string[], positional: string[]) => {
      let out = '';
      let err = '';
      const code = runGraphCli(argv, positional, (t) => (out += t), (t) => (err += t));
      return { code, out, err };
    };
    expect(drive([projectDir], [projectDir]).code).toBeUndefined(); // no flag: the server would start
    const whole = drive([projectDir, '--graph=Pages/'], [projectDir]);
    expect(whole).toEqual({ code: 0, out: projectGraphText(new ProjectStore(projectDir), { prefix: 'Pages/' }), err: '' });
    expect(snapshot(projectDir)).toEqual(before);
    const none = drive(['--graph'], []);
    expect(none.code).toBe(2);
    expect(none.err).toContain('--graph takes exactly one project directory');
    const missing = drive(['/no/such/dir', '--graph'], ['/no/such/dir']);
    expect(missing.code).toBe(2);
    expect(missing.err).toMatch(/does not exist/);
    expect(missing.out).toBe('');
  });

  it('the MCP tool read_graph is the same page, in the explore group', async () => {
    const session = await connect(projectDir, false);
    try {
      await reveal(session, 'explore');
      const page = await callRawText(session, 'read_graph', {});
      expect(page).toBe(projectGraphText(session.store));
      const part = await callRawText(session, 'read_graph', { prefix: 'Game/' });
      expect(part).toBe(projectGraphText(session.store, { prefix: 'Game/' }));
    } finally {
      await session.close();
    }
  });
});

function snapshot(dir: string): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = fs.statSync(p).mtimeMs;
    }
  };
  walk(dir);
  return out;
}
