/**
 * P128 S1 (CCN-009) — the agent reads the canon.
 *
 * The audit (`dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md` §1.4) found no surface the agent reads that
 * named Studio, the mini editor or the NodeGX editor, or said what Studio does not edit. These specs pin:
 *
 * 1. the copy both clients carry (`noodl-editor/src/editor/src/models/canon.ts`) is `docs/CANON.md`, word for word;
 * 2. `get_project_info` carries `surfacesDoctrine` and the MUST_KNOW line, and `section: "surfaces"` returns it whole;
 * 3. the three surface tools name each other and the download;
 * 4. the seeded `CLAUDE.md` / `AGENTS.md` quote the canon under its markers;
 * 5. the `apply_plan` that builds the scope's last page carries `handover`, once.
 */
import * as fs from 'fs';
import * as path from 'path';

import { CANON, renderAgentsMd, renderClaudeMd } from '../src/editor-deps';
import { CANON_OFFER, EDITOR_DOWNLOAD, SURFACES_DOCTRINE_MD, resetHandovers } from '../src/surfaces';
import { call, callRawText, connect, copyFixture, reveal, TestSession } from './helpers';

const CANON_PATH = path.resolve(__dirname, '../../../docs/CANON.md');

/** `## heading` → body, trimmed: the same split `scripts/pin-canon.mjs` makes. */
function canonSections(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of text.split(/^## /m).slice(1)) {
    const nl = block.indexOf('\n');
    out[block.slice(0, nl).trim()] = block.slice(nl + 1).trim();
  }
  return out;
}

const MUST_KNOW_LINE =
  'The person sees the app in Studio unless you showed a mini editor; a fixed list (a language, a status) is a Static ' +
  'Data node in its own component under `Option sets/`, never typed strings; a part Studio does not draw is said so, ' +
  'with the editor named and the two ways offered. [surfaces]';

describe('P128 S1 — the pinned canon is docs/CANON.md', () => {
  it('every pinned section equals the canon (on drift: node packages/noodl-mcp/scripts/pin-canon.mjs)', () => {
    const canon = canonSections(fs.readFileSync(CANON_PATH, 'utf8'));
    for (const [heading, body] of Object.entries(CANON)) {
      expect({ heading, same: canon[heading] === body }).toEqual({ heading, same: true });
    }
    expect(Object.keys(CANON).length).toBeGreaterThanOrEqual(6);
  });

  it('the offer sentence and the download are read from it, not retyped', () => {
    expect(CANON_OFFER.startsWith('I could make you an editor to tweak that now')).toBe(true);
    expect(CANON_OFFER).not.toContain('\n');
    expect(EDITOR_DOWNLOAD).toBe('nodegx.io/start#download');
  });
});

describe('P128 S1 — get_project_info carries the surfaces section', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it('surfacesDoctrine quotes the canon sections whole, and readFirst says the MUST_KNOW line and the section', async () => {
    const info = JSON.parse(await callRawText(session, 'get_project_info'));
    expect(info.surfacesDoctrine).toBe(SURFACES_DOCTRINE_MD);
    for (const heading of ['Which AI coder', 'Three ways to touch your app', 'The wiring underneath', 'Get the tools', 'For the agent (the rules, not copy)'] as const) {
      expect({ heading, quoted: info.surfacesDoctrine.includes(`### ${heading}\n\n${CANON[heading]}\n`) }).toEqual({ heading, quoted: true });
    }
    expect(info.readFirst.mustKnow).toContain(MUST_KNOW_LINE);
    // second: inside the 2 KB Claude Code shows of a saved result (P128-S1-PREVIEWCUT)
    expect(info.readFirst.mustKnow[1]).toBe(MUST_KNOW_LINE);
    expect(Object.keys(info.readFirst.sections)).toEqual(['traps', 'authoring', 'interface', 'design', 'backend', 'surfaces']);
    expect(info.moreGuidance).toContain('surfaces');
  });

  it('section "surfaces" returns it in parts that join to the whole', async () => {
    const parts: string[] = [];
    let next: string | undefined = 'surfaces';
    while (next) {
      const answer = JSON.parse(await callRawText(session, 'get_project_info', { section: next })) as { text: string; next?: string; field: string };
      expect(answer.field).toBe('surfacesDoctrine');
      parts.push(answer.text);
      next = answer.next;
    }
    expect(parts.join('')).toBe(SURFACES_DOCTRINE_MD);
  });
});

describe('P128 S1 — the surface tools name each other and the download', () => {
  it('open_studio, show_mini_editor and open_in_editor each name the other two', async () => {
    const session = await connect(copyFixture());
    try {
      await reveal(session, 'project');
      const tools = (await session.client.listTools()).tools;
      const desc = (name: string) => tools.find((t) => t.name === name)?.description ?? '';
      expect(desc('open_studio')).toEqual(expect.stringContaining('show_mini_editor'));
      expect(desc('open_studio')).toEqual(expect.stringContaining('open_in_editor'));
      expect(desc('show_mini_editor')).toEqual(expect.stringContaining('open_studio'));
      expect(desc('show_mini_editor')).toEqual(expect.stringContaining('open_in_editor'));
      expect(desc('open_in_editor')).toEqual(expect.stringContaining('open_studio'));
      expect(desc('open_in_editor')).toEqual(expect.stringContaining('show_mini_editor'));
      expect(desc('open_in_editor')).toEqual(expect.stringContaining(EDITOR_DOWNLOAD));
      expect(desc('open_in_editor')).toEqual(expect.stringContaining('Connect Claude'));
    } finally {
      await session.close();
    }
  });
});

describe('P128 S1 — the seeded CLAUDE.md and AGENTS.md quote the canon', () => {
  const options = {
    projectName: 'Muddy Paws',
    serverName: 'nodegx-muddy-paws',
    hasDocs: true,
    registration: { type: 'stdio' as const, command: 'node', args: ['/x/noodl-mcp.cjs'], env: {} }
  };

  it.each([
    ['CLAUDE.md', renderClaudeMd],
    ['AGENTS.md', renderAgentsMd]
  ])('%s: "Where the person sees this app", each quote a verbatim run of its canon section', (_name, render) => {
    const text = render(options);
    expect(text).toContain('## Where the person sees this app');
    const canon = canonSections(fs.readFileSync(CANON_PATH, 'utf8'));
    const quotes = [...text.matchAll(/<!-- canon: (.+?) -->\n([\s\S]+?)(?:\n\n|$)/g)];
    expect(quotes.map((q) => q[1])).toEqual(['For the agent (the rules, not copy)', 'The wiring underneath']);
    for (const [, heading, block] of quotes) {
      expect({ heading, verbatim: canon[heading].includes(block) }).toEqual({ heading, verbatim: true });
    }
    // agent-agnostic: the paragraph names no one agent
    const para = text.slice(text.indexOf('## Where the person sees this app'), text.indexOf('## Where the decisions are'));
    expect(para).not.toMatch(/Claude|Cline|Mistral|Codex/);
  });
});

interface Applied {
  isError: boolean;
  data: { applied?: unknown[]; handover?: { note: string; theyOwn: string; comeBack: string; rule: string } };
}

describe('P128 S1 — the apply that builds the scope\'s last page hands over', () => {
  let dir: string;
  let session: TestSession;

  const SCOPE = [
    '# 000 — Initial scope',
    '',
    '## What was asked for',
    '',
    '> A shelter site.',
    '',
    '## What was decided',
    '',
    '**Pages.**',
    '',
    '- Home — The landing page.',
    '- Dogs — The dogs.',
    '- Visit — Book a visit.',
    '',
    '**Records.**',
    '',
    '- Dog — a dog — name',
    ''
  ].join('\n');

  async function buildPages(names: string[]): Promise<Applied> {
    const plan = await call<{ planId: string; operations: Array<{ id: string; target: string }> }>(session, 'create_plan', {
      request: 'Pages',
      operations: names.map((n) => ({ kind: 'create', target: `Pages/${n}`, intent: `The ${n} page` }))
    });
    for (const op of plan.data.operations) {
      const title = op.target.split('/').pop() as string;
      const id = op.id.replace('-', '_');
      await call(session, 'stage_plan_operation', {
        plan_id: plan.data.planId,
        operation_id: op.id,
        nodes: [
          { id: `${id}_page`, type: 'Page', parameters: { title, urlPath: title.toLowerCase() } },
          { id: `${id}_text`, type: 'Text', parent: `${id}_page`, parameters: { text: title } }
        ]
      });
    }
    return (await call(session, 'apply_plan', { plan_id: plan.data.planId })) as Applied;
  }

  beforeEach(async () => {
    resetHandovers();
    dir = copyFixture();
    fs.mkdirSync(path.join(dir, 'docs', 'decisions'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs', 'decisions', '000-initial-scope.md'), SCOPE);
    session = await connect(dir);
  });
  afterEach(async () => {
    await session.close();
  });

  it('not while a scoped page is missing; then once, with the canon\'s words; then never again', async () => {
    const first = await buildPages(['Dogs']);
    expect(first.isError).toBe(false);
    expect(first.data.handover).toBeUndefined();

    const last = await buildPages(['Visit']);
    expect(last.isError).toBe(false);
    const handover = last.data.handover!;
    expect(handover).toBeDefined();
    expect(handover.theyOwn.startsWith("When it's finished, the app is yours")).toBe(true);
    expect(handover.comeBack.startsWith('When you want more, come back.')).toBe(true);
    expect(handover.rule.startsWith('When the plan is done, hand over: say what they own')).toBe(true);
    expect(handover.note).toContain('000-initial-scope.md');

    const after = await buildPages(['Extra']);
    expect(after.data.handover).toBeUndefined();
  });

  it('a project with no recorded scope gets no hand-over from apply_plan', async () => {
    fs.rmSync(path.join(dir, 'docs'), { recursive: true });
    const applied = await buildPages(['Dogs']);
    expect(applied.isError).toBe(false);
    expect(applied.data.handover).toBeUndefined();
  });
});
