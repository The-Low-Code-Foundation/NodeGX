/**
 * GAM-005 — two copies of a component keep their own state, or the author is told they will not.
 *
 * ## The row
 *
 * P78 D57: Rocket School's `Game/Feedback banner` kept "open" in a `Variable`, and the race page
 * placed two banners. One answer opened both. A `Variable` is one value for the whole app, by
 * name, however many times its component is placed. The node reference says so; the doctrine an
 * agent receives did not, and no door said anything.
 *
 * 🔒 R6 (Richard, 2026-09-14): a warning, with a "shared on purpose" escape.
 *
 * ## What each half grades
 *
 * 1. **The doctrine arrives.** Read from a live `get_project_info`, not from the module: a sentence
 *    in a source file that never leaves the process teaches nobody (GAM-005 §7). Each absence the
 *    RED run recorded sits beside a sentence known to be in the same field.
 * 2. **The door speaks.** Written to disk and read back through `validate_component` and
 *    `validate_project`, the doors an agent calls to check its work, and once through
 *    `create_component`, the door it writes through. Every quiet arm carries a code known to fire
 *    in the same response (`interfaceless-instance` on the page, `component-port-direction` on the
 *    banner), so "said nothing" can never be "never ran".
 *
 * 🔴 **A single placement grades nothing** (§7): the defect needs two copies, so the twice-placed
 * arm and the once-placed arm differ only in the second instance.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { NodeV2 } from '../src/editor-deps';
import { call, connect, copyFixture } from './helpers';
import type { TestSession } from './helpers';

const CODE = 'variable-in-repeated-component';
const CARD_KEY = 'Card';
const CARD = '/Card';
const HOME_KEY = 'Pages/Home';
const HOME = '/Pages/Home';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
  location: { component: string; nodeId?: string; port?: string };
}
interface Report {
  summary: { errors: number; warnings: number; infos: number };
  diagnostics: Diagnostic[];
}

function writeNodes(projectDir: string, key: string, nodes: unknown[], visualRoots: string[]): void {
  const dir = path.join(projectDir, 'components', key);
  const nodesFile = path.join(dir, 'nodes.json');
  const existing = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
  fs.writeFileSync(nodesFile, JSON.stringify({ ...existing, nodes, visualRoots }, null, 2));
  fs.writeFileSync(
    path.join(dir, 'connections.json'),
    JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8')), connections: [] }, null, 2)
  );
}

/**
 * The banner, the D57 shape: its open flag in a Variable it both reads and writes.
 *
 * `card_in` declares `tone` plugged "input", which is backwards on a Component Inputs node. That is
 * the banner's known-firing code, and it also leaves the banner with no inputs, so the page's
 * `tone` parameter fires `interfaceless-instance` there.
 */
function banner(comment?: string): unknown[] {
  return [
    { id: 'card_root', type: 'Group', label: 'Banner', children: ['card_text'] },
    { id: 'card_text', type: 'Text', label: 'Banner text', parent: 'card_root', parameters: { text: 'Well done!' } },
    { id: 'card_in', type: 'Component Inputs', label: 'Banner inputs', ports: [{ name: 'tone', plug: 'input', type: '*' }] },
    { id: 'open', type: 'Variable2', label: 'Is the banner open', parameters: { name: 'bannerOpen' } },
    {
      id: 'setOpen',
      type: 'Set Variable',
      label: 'Open the banner',
      parameters: { name: 'bannerOpen' },
      ...(comment ? { metadata: { comment } } : {})
    }
  ];
}

function home(arm: 'once' | 'twice' | 'repeater'): unknown[] {
  const cards = arm === 'twice' ? ['card1', 'card2'] : ['card1'];
  const children = ['title', ...cards, ...(arm === 'repeater' ? ['rows'] : [])];
  return [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Home' }, children: ['layout'] },
    { id: 'layout', type: 'Group', label: 'Layout', parent: 'page', children },
    { id: 'title', type: 'Text', label: 'Title', parent: 'layout', parameters: { text: 'Welcome home' } },
    ...cards.map((id) => ({ id, type: CARD, label: `Banner ${id}`, parent: 'layout', parameters: { tone: 'good' } })),
    ...(arm === 'repeater'
      ? [{ id: 'rows', type: 'For Each', label: 'A banner per answer', parent: 'layout', parameters: { template: CARD } }]
      : [])
  ];
}

const codes = (r: Report) => r.diagnostics.map((d) => d.code);
const ours = (r: Report) => r.diagnostics.filter((d) => d.code === CODE);

describe('GAM-005 AC1(i)/AC2 — the doctrine an agent receives says a Variable is app-wide', () => {
  let interfaceDoctrine = '';
  let authoringDoctrine = '';

  beforeAll(async () => {
    const dir = copyFixture();
    const session = await connect(dir, true);
    const info = await call<{ interfaceDoctrine?: string; authoringDoctrine?: string }>(session, 'get_project_info');
    interfaceDoctrine = info.data.interfaceDoctrine ?? '';
    authoringDoctrine = info.data.authoringDoctrine ?? '';
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('the interface playbook says it where it teaches a component its state, beside the States idiom', () => {
    // Known-firing: §4's own idiom is in the same field.
    expect(interfaceDoctrine).toContain('States.currentState');
    expect(interfaceDoctrine).toMatch(/A .Variable. is one value for the whole app/);
    expect(interfaceDoctrine).toContain('Component Object');
    // The escape is taught where the rule is, in the words the door reads.
    expect(interfaceDoctrine).toMatch(/shared on purpose/);
  });

  it('the decomposition doctrine gives the converse beside its "shared app state" line', () => {
    expect(authoringDoctrine).toMatch(/A named section is a component/);
    // The source wraps this sentence across a line, so whitespace is matched, not a space.
    expect(authoringDoctrine).toMatch(/Shared app\s+state goes through Variables and Objects/);
    expect(authoringDoctrine).toMatch(/a component's own\s+state\s+never\s+does/i);
  });
});

describe('GAM-005 AC1(ii)/AC3 — the door names the Variable two copies will share', () => {
  let session: TestSession | undefined;
  let dir = '';

  afterEach(async () => {
    await session?.close();
    session = undefined;
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  async function open(arm: 'once' | 'twice' | 'repeater', comment?: string): Promise<TestSession> {
    dir = copyFixture();
    writeNodes(dir, CARD_KEY, banner(comment), ['card_root']);
    writeNodes(dir, HOME_KEY, home(arm), ['page']);
    session = await connect(dir);
    return session;
  }

  const validate = async (s: TestSession, target: string) =>
    (await call<Report>(s, 'validate_component', { path: target })).data;

  it('placed twice: both the page and the banner report it, once per Variable, at the banner', async () => {
    const s = await open('twice');
    const page = await validate(s, HOME);
    const card = await validate(s, CARD);

    expect(codes(page)).toContain('interfaceless-instance');
    expect(codes(card)).toContain('component-port-direction');

    for (const report of [page, card]) {
      const found = ours(report);
      expect(found).toHaveLength(1);
      const [d] = found;
      expect(d.severity).toBe('warning');
      expect(d.location.component).toBe(CARD);
      // The first node of that name, in the banner, where the escape comment goes.
      expect(d.location.nodeId).toBe('open');
      expect(d.message).toContain('"bannerOpen"');
      expect(d.message).toContain(HOME);
      expect(d.message).toContain('/Card is drawn 2 times');
      expect(d.suggestion).toMatch(/shared on purpose/);
    }
    // One cause, one finding: the two doors produce the identical diagnostic.
    expect(ours(page)).toEqual(ours(card));
  });

  it('placed twice: validate_project reports it exactly once', async () => {
    const s = await open('twice');
    const project = (await call<Report>(s, 'validate_project', {})).data;
    expect(codes(project)).toContain('interfaceless-instance');
    expect(ours(project)).toHaveLength(1);
  });

  it('placed once: silent, beside the codes known to fire in the same responses', async () => {
    const s = await open('once');
    const page = await validate(s, HOME);
    const card = await validate(s, CARD);
    expect(codes(page)).toContain('interfaceless-instance');
    expect(codes(card)).toContain('component-port-direction');
    expect(ours(page)).toEqual([]);
    expect(ours(card)).toEqual([]);
  });

  it('placed twice and marked "shared on purpose" on one node of that name: silent', async () => {
    const s = await open('twice', 'Shared on purpose: every banner shows the one answer.');
    const page = await validate(s, HOME);
    const card = await validate(s, CARD);
    expect(codes(page)).toContain('interfaceless-instance');
    expect(codes(card)).toContain('component-port-direction');
    expect(ours(page)).toEqual([]);
    expect(ours(card)).toEqual([]);
  });

  it('a comment that does not say it does not silence it', async () => {
    const s = await open('twice', 'Opens when the answer is checked.');
    expect(ours(await validate(s, CARD))).toHaveLength(1);
  });

  it('a For Each drawing the banner per row is more than one copy', async () => {
    const s = await open('repeater');
    const page = await validate(s, HOME);
    expect(codes(page)).toContain('interfaceless-instance');
    const [d] = ours(page);
    expect(d).toBeDefined();
    expect(d.message).toMatch(/For Each/);
  });
});

describe('GAM-005 AC3 — the write door carries it, and does not refuse over it', () => {
  it('create_component of a page placing the banner twice is accepted and names the Variable', async () => {
    const dir = copyFixture();
    // A clean banner: no backwards port, so the write's only warning is this one.
    writeNodes(
      dir,
      CARD_KEY,
      (banner() as { id: string }[]).filter((n) => n.id !== 'card_in'),
      ['card_root']
    );
    // The fixture's Home places the card once. Without this the two copies would come from two
    // parents, and a sabotage that counts each placement as one could not reach this arm.
    writeNodes(dir, HOME_KEY, (home('once') as { id: string }[]).filter((n) => n.id !== 'card1'), ['page']);
    const session = await connect(dir);
    try {
      const res = await call<unknown>(session, 'create_component', {
        path: 'Pages/Twice',
        nodes: [
          { id: 'page', type: 'Page', label: 'Twice', parameters: { title: 'Twice' } },
          { id: 'a', type: CARD, label: 'First banner', parent: 'page' },
          { id: 'b', type: CARD, label: 'Second banner', parent: 'page' }
        ],
        visual_roots: ['page']
      });
      expect(res.isError).toBe(false);
      const text = JSON.stringify(res.data);
      expect(text).toContain(CODE);
      expect(text).toContain('bannerOpen');
    } finally {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
