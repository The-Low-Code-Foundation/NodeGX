/**
 * P128 S2 — OWN-027 (the option-set example, the validator's suggestion) and CCN-010 (the note on a write Studio does
 * not edit), on this package's fixture.
 *
 * The shapes are Muddy Paws Shelter's (audit §1.3): `/Components/Header` with `Set language to English` and `Set
 * language to French` typing `"en"` and `"fr"` into `language`; `/Components/Wording`, a logic component holding a
 * `Variable` and a `States` node "Wordings by language". The run on the real project, through the built dist, is
 * `dev-docs/tasks/phase-128-the-canon-everywhere/s2/ac.mjs`.
 *
 * Studio here is the stand-in `p125PuppyBursts.test.ts` uses (an `editor/serve.mjs` that reports a port), found
 * through NODEGX_STUDIO, so `open_studio` starts it and `studioFor` reads it as running.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CANON_OFFER, canonRule } from '../src/surfaces';
import { STUDIO_STEP_TYPES } from '../src/studio/vocabulary';
import { studioFor } from '../src/studio/studioProcess';
import { FIXED_LIST_SUGGESTION } from '../src/validate';
import { call, connect, copyFixture, reveal, type TestSession } from './helpers';

const FAKE_STUDIO = `import http from 'node:http';
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html>studio'); });
server.listen(0, '127.0.0.1', () => { console.log('nodegx-studio: http://127.0.0.1:' + server.address().port + '/  (fake)'); });
`;

type Diag = { code: string; severity: string; message: string; suggestion?: string; location: { component: string; nodeId?: string } };
type Written = {
  validation?: { diagnostics?: Diag[] };
  notDrawnInStudio?: Array<{ component?: string; node: string; type: string; label?: string }>;
  studioNote?: string;
};

/** Muddy Paws' header: two buttons, each typing its language into `language`. */
function header(path = 'Components/Header', values: Array<string | null> = ['en', 'fr']) {
  return {
    path,
    nodes: [
      { id: 'bar', type: 'Group', children: values.map((_, i) => `b${i}`) },
      ...values.map((_, i) => ({ id: `b${i}`, type: 'net.noodl.controls.button', parent: 'bar', parameters: { label: `Button ${i}` } })),
      ...values.map((v, i) => ({
        id: `set${i}`,
        type: 'Set Variable',
        label: v === null ? 'Set language from a wire' : `Set language to ${v}`,
        parameters: { name: 'language', setWith: 'string', ...(v === null ? {} : { value: v }) }
      }))
    ],
    connections: [
      ...values.map((_, i) => ({ fromId: `b${i}`, fromProperty: 'onClick', toId: `set${i}`, toProperty: 'do' })),
      ...values.flatMap((v, i) => (v === null ? [{ fromId: 'bar', fromProperty: 'boundingWidth', toId: `set${i}`, toProperty: 'value' }] : []))
    ]
  };
}

/** Muddy Paws' `/Components/Wording`: the current language, a States node per language, its value published. */
const WORDING = {
  path: 'Components/Wording',
  nodes: [
    { id: 'langvar', type: 'Variable2', label: 'Current language', parameters: { name: 'language' } },
    {
      id: 'wordStates',
      type: 'States',
      label: 'Wordings by language',
      parameters: { states: 'en,fr', values: 'home_headline', 'type-home_headline': 'string', 'value-en-home_headline': 'Hello', 'value-fr-home_headline': 'Bonjour' }
    },
    { id: 'out', type: 'Component Outputs', ports: [{ name: 'home_headline', plug: 'input', type: 'string' }] }
  ],
  connections: [
    { fromId: 'langvar', fromProperty: 'value', toId: 'wordStates', toProperty: 'currentState' },
    { fromId: 'wordStates', fromProperty: 'home_headline', toId: 'out', toProperty: 'home_headline' }
  ]
};

const literalDiags = (res: { data: Written }) => (res.data.validation?.diagnostics ?? []).filter((d) => d.code === 'fixed-list-as-literals');

describe('P128 S2 OWN-027 — the option-set example', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
    await reveal(session, 'explore');
  });
  afterAll(async () => {
    await session.close();
  });

  it('list_examples lists it, and a search for "option set" finds it', async () => {
    const all = await call<{ examples: Array<{ id: string }> }>(session, 'list_examples', { node_type: 'Static Data' });
    expect(all.data.examples.map((e) => e.id)).toContain('option-set');
    const found = await call<{ examples: Array<{ id: string }> }>(session, 'list_examples', { query: 'option set' });
    expect(found.data.examples[0]?.id).toBe('option-set');
  });

  it("get_example('option-set') is canon rule 5's shape: Static Data in `Option sets/`, items and count, a dropdown, a step that types nothing", async () => {
    const res = await call<{ components: Array<{ name: string; nodes: Array<{ id: string; type: string; parameters?: Record<string, unknown> }>; connections: Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }> }> }>(
      session,
      'get_example',
      { id: 'option-set' }
    );
    const [set, page] = res.data.components;
    expect(set.name).toMatch(/^\/Option sets\//);
    expect(set.nodes.map((n) => n.type).sort()).toEqual(['Component Outputs', 'Static Data']);
    expect(set.connections.map((c) => `${c.fromProperty}->${c.toProperty}`).sort()).toEqual(['count->count', 'items->items']);
    expect(page.nodes.some((n) => n.type === set.name)).toBe(true);
    expect(page.nodes.some((n) => n.type === 'net.noodl.controls.options')).toBe(true);
    const step = page.nodes.find((n) => n.type === 'Set Variable')!;
    expect(step.parameters?.value).toBeUndefined();
    expect(page.connections).toContainEqual(expect.objectContaining({ toId: step.id, toProperty: 'value' }));
  });

  it('the example writes into a project as two components and validates with no error', async () => {
    const ex = await call<{ components: Array<{ name: string; nodes: unknown[]; connections: unknown[] }> }>(session, 'get_example', { id: 'option-set' });
    for (const c of ex.data.components) {
      const res = await call<Written>(session, 'create_component', { path: c.name.slice(1), nodes: c.nodes, connections: c.connections });
      expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
    }
    const v = await call<{ summary: { errors: number } }>(session, 'validate_component', { path: 'Pages/Language' });
    expect(v.data.summary.errors).toBe(0);
  });
});

describe('P128 S2 OWN-027 — the validator suggests an option set for typed literals', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it('two steps typing "en" and "fr" into `language`: the write succeeds and carries one info, with the suggestion', async () => {
    const res = await call<Written>(session, 'create_component', header());
    expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
    const diags = literalDiags(res);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe('info');
    expect(diags[0].suggestion).toBe(FIXED_LIST_SUGGESTION);
    expect(diags[0].message).toMatch(/2 Set Variable steps type "en", "fr" into the variable "language"/);
  });

  it('validate_component says the same of the component on disk', async () => {
    const v = await call<{ diagnostics: Diag[] }>(session, 'validate_component', { path: 'Components/Header' });
    expect(v.data.diagnostics.filter((d) => d.code === 'fixed-list-as-literals')).toHaveLength(1);
  });

  it('a step on another component typing into the same variable is counted, and named', async () => {
    const res = await call<Written>(session, 'create_component', header('Components/Footer', ['de']));
    const diags = literalDiags(res);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toMatch(/3 Set Variable steps/);
    expect(diags[0].message).toMatch(/in \/Components\/Header/);
  });

  it('controls: one literal alone, and a Value wired from elsewhere, carry nothing', async () => {
    const one = await call<Written>(session, 'create_component', { ...header('Components/Solo', ['x']), nodes: header('Components/Solo', ['x']).nodes.map((n) => (n.type === 'Set Variable' ? { ...n, parameters: { ...n.parameters, name: 'mode' } } : n)) });
    expect(one.isError ? JSON.stringify(one.data).slice(0, 1500) : 'ok').toBe('ok');
    expect(literalDiags(one)).toHaveLength(0);
    const wired = await call<Written>(session, 'create_component', {
      ...header('Components/Wired', ['en', null]),
      nodes: header('Components/Wired', ['en', null]).nodes.map((n) => (n.type === 'Set Variable' ? { ...n, parameters: { ...n.parameters, name: 'size' } } : n))
    });
    expect(wired.isError ? JSON.stringify(wired.data).slice(0, 1500) : 'ok').toBe('ok');
    expect(literalDiags(wired)).toHaveLength(0);
  });
});

describe('P128 S2 CCN-010 — a write Studio does not edit says so, while Studio is open', () => {
  let studioDir: string;
  const saved = { studio: process.env.NODEGX_STUDIO, noOpen: process.env.NODEGX_STUDIO_NO_OPEN };
  beforeAll(() => {
    studioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-studio-'));
    fs.mkdirSync(path.join(studioDir, 'editor'));
    fs.writeFileSync(path.join(studioDir, 'editor', 'serve.mjs'), FAKE_STUDIO);
    process.env.NODEGX_STUDIO = studioDir;
    process.env.NODEGX_STUDIO_NO_OPEN = '1';
  });
  afterAll(() => {
    if (saved.studio === undefined) delete process.env.NODEGX_STUDIO;
    else process.env.NODEGX_STUDIO = saved.studio;
    if (saved.noOpen === undefined) delete process.env.NODEGX_STUDIO_NO_OPEN;
    else process.env.NODEGX_STUDIO_NO_OPEN = saved.noOpen;
    fs.rmSync(studioDir, { recursive: true, force: true });
  });

  it('the pinned step list is Studio\'s ACTIONS without Run JavaScript, whose script Studio never edits', () => {
    expect(STUDIO_STEP_TYPES).toContain('Set Variable');
    expect(STUDIO_STEP_TYPES).not.toContain('JavaScriptFunction');
  });

  describe('with no Studio open (the control)', () => {
    let session: TestSession;
    beforeAll(async () => {
      session = await connect(copyFixture());
    });
    afterAll(async () => {
      await session.close();
    });

    it('the Wording write carries no note', async () => {
      const res = await call<Written>(session, 'create_component', WORDING);
      expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(res.data.notDrawnInStudio).toBeUndefined();
      expect(res.data.studioNote).toBeUndefined();
    });
  });

  describe('with Studio open for the project', () => {
    let session: TestSession;
    let pid: number | undefined;
    beforeAll(async () => {
      session = await connect(copyFixture());
      await reveal(session, 'project');
      const res = await call(session, 'open_studio');
      if (res.isError) throw new Error(`open_studio failed: ${JSON.stringify(res.data)}`);
      pid = studioFor(session.projectDir)?.pid;
    });
    afterAll(async () => {
      await session.close();
      if (pid) {
        try {
          process.kill(pid);
        } catch {
          /* gone */
        }
      }
    });

    it('the Wording write succeeds and names the States node and the Variable, not the interface', async () => {
      const res = await call<Written>(session, 'create_component', WORDING);
      expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(res.data.notDrawnInStudio).toEqual([
        { node: 'langvar', type: 'Variable2', label: 'Current language' },
        { node: 'wordStates', type: 'States', label: 'Wordings by language' }
      ]);
    });

    it("the note is the canon's rule 4 and its offer sentence, verbatim", async () => {
      const res = await call<Written>(session, 'update_component', {
        path: 'Components/Wording',
        operations: [{ op: 'add_node', node: { id: 'fmt', type: 'Expression', label: 'Shout it', parameters: { expression: 'a' } } }]
      });
      expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(res.data.studioNote).toContain(canonRule(4));
      expect(res.data.studioNote).toContain(CANON_OFFER);
      expect(res.data.studioNote).toMatch(/Nothing was refused/);
    });

    it('an update names only what it introduced (the States node it already had is not repeated)', async () => {
      const res = await call<Written>(session, 'update_component', {
        path: 'Components/Wording',
        operations: [{ op: 'add_node', node: { id: 'fn', type: 'JavaScriptFunction', label: 'Pick a greeting', parameters: { functionScript: '' } } }]
      });
      expect(res.isError ? JSON.stringify(res.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(res.data.notDrawnInStudio).toEqual([{ node: 'fn', type: 'JavaScriptFunction', label: 'Pick a greeting' }]);
    });

    it('a page of elements, steps and an option set carries no note; the logic component it places is named', async () => {
      const set = await call<Written>(session, 'create_component', {
        path: 'Option sets/Languages',
        nodes: [
          { id: 'options', type: 'Static Data', parameters: { type: 'json', json: '[{"Label":"English","Value":"en"}]' } },
          { id: 'out', type: 'Component Outputs', ports: [{ name: 'items', plug: 'input', type: 'array' }] }
        ],
        connections: [{ fromId: 'options', fromProperty: 'items', toId: 'out', toProperty: 'items' }]
      });
      expect(set.isError ? JSON.stringify(set.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(set.data.notDrawnInStudio).toBeUndefined();

      const page = await call<Written>(session, 'create_component', {
        path: 'Pages/Settings',
        nodes: [
          { id: 'page', type: 'Page', parameters: { title: 'Settings', urlPath: 'settings' }, children: ['pick'] },
          { id: 'pick', type: 'net.noodl.controls.options', parent: 'page' },
          { id: 'langs', type: '/Option sets/Languages' },
          { id: 'store', type: 'Set Variable', parameters: { name: 'language', setWith: 'string' } },
          { id: 'words', type: '/Components/Wording', label: 'Wording' }
        ],
        connections: [
          { fromId: 'langs', fromProperty: 'items', toId: 'pick', toProperty: 'items' },
          { fromId: 'pick', fromProperty: 'value', toId: 'store', toProperty: 'value' },
          { fromId: 'pick', fromProperty: 'onChange', toId: 'store', toProperty: 'do' }
        ]
      });
      expect(page.isError ? JSON.stringify(page.data).slice(0, 1500) : 'ok').toBe('ok');
      expect(page.data.notDrawnInStudio).toEqual([{ node: 'words', type: '/Components/Wording', label: 'Wording' }]);
    });

    it('apply_plan carries the note too, each row naming its component', async () => {
      // no Chrome in a unit spec: the apply's render is the environment's to turn off, as CI does
      const savedRender = process.env.NODEGX_RENDER_DISABLED;
      process.env.NODEGX_RENDER_DISABLED = '1';
      const plan = await call<{ planId: string; operations?: Array<{ id: string }> }>(session, 'create_plan', {
        request: 'a tally',
        scroll: 'page',
        operations: [{ kind: 'create', target: 'Components/Tally', intent: 'counts presses' }]
      });
      expect(plan.isError ? JSON.stringify(plan.data).slice(0, 1500) : 'ok').toBe('ok');
      const staged = await call(session, 'stage_plan_operation', {
        plan_id: plan.data.planId,
        operation_id: plan.data.operations?.[0]?.id ?? 'op-1',
        nodes: [
          { id: 'box', type: 'Group' },
          { id: 'count', type: 'Counter', label: 'Presses' }
        ]
      });
      if (staged.isError) throw new Error(JSON.stringify(staged.data));
      const applied = await call<Written>(session, 'apply_plan', { plan_id: plan.data.planId });
      if (savedRender === undefined) delete process.env.NODEGX_RENDER_DISABLED;
      else process.env.NODEGX_RENDER_DISABLED = savedRender;
      if (applied.isError) throw new Error(JSON.stringify(applied.data));
      expect(applied.data.notDrawnInStudio).toEqual([{ component: '/Components/Tally', node: 'count', type: 'Counter', label: 'Presses' }]);
    });
  });
});
