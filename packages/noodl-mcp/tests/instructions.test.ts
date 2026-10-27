/**
 * BST-006 — what the server says before any tool is called.
 *
 * ## Why the bound half is pinned to a byte
 *
 * BST-006 moved a 60-line string literal out of `server.ts` and into
 * `instructions.ts`. Every paragraph in it answers a measured failure — LAS-006's
 * planned-then-built-something-else, AAQ-005's unreachable pages, LAS-005's
 * confidently-wrong render — and the phase-55 replays that produced those numbers
 * were run against this exact text. A move that "tidied" a sentence would
 * invalidate them silently and nothing else in the suite would notice.
 *
 * So the fixtures in `fixtures/boundInstructions.*.txt` were captured from the
 * build **before** the move, with the project directory substituted out, and this
 * file compares against them. They are a record of a moment, not a spec: a
 * deliberate future change to the briefing edits the fixture in the same commit,
 * and the diff is then the review.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { BOOTSTRAP_INSTRUCTIONS, projectInstructions } from '../src/instructions';
import { createServer, type ServerOptions } from '../src/server';
import { copyFixture } from './helpers';

const PLACEHOLDER = '<PROJECT_DIR>';

function golden(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'fixtures', `boundInstructions.${name}.txt`), 'utf8');
}

async function instructionsOf(options: ServerOptions): Promise<string> {
  const { server } = createServer(options);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'instructions-test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const text = client.getInstructions() ?? '';
  await client.close();
  await server.close();
  return text;
}

describe('BST-006 — the bound briefing is unchanged, character for character', () => {
  const cases = [
    { name: 'deferred', allowWrites: true, deferTools: true },
    { name: 'allTools', allowWrites: true, deferTools: false },
    { name: 'readOnly', allowWrites: false, deferTools: true }
  ] as const;

  it.each(cases)('$name mode matches the pre-move capture', async ({ name, allowWrites, deferTools }) => {
    const projectDir = copyFixture();
    const served = await instructionsOf({ projectDir, allowWrites, deferTools });
    expect(served.split(projectDir).join(PLACEHOLDER)).toBe(golden(name));
  });

  it('the exported function is what the server sends', () => {
    // The seam itself: three consumers, one source. A bind result (BST-002) will
    // be the third, and "the bind result must not duplicate the briefing" is only
    // assertable because this call and the server's agree.
    expect(projectInstructions({ projectDir: '/tmp/x', allowWrites: true, deferTools: true })).toContain(
      'NodeGX (OpenNoodl) project server for /tmp/x'
    );
  });

  it('every explanatory comment survived the move', () => {
    // ⚠️ The comments are the only record of which measured failure each
    // paragraph answers, and a paragraph whose reason is lost is a paragraph
    // somebody trims. Named by their task tags, which is how they are found.
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'instructions.ts'), 'utf8');
    for (const tag of ['LAS-006 §4', 'AAQ-005', 'AAQ-011/F13', 'AWP-006', 'LAS-005']) {
      expect(source).toContain(tag);
    }
  });
});

describe('BST-006 — the unbound briefing', () => {
  it('is what an unbound server sends', async () => {
    expect(await instructionsOf({ allowWrites: true })).toBe(BOOTSTRAP_INSTRUCTIONS);
  });

  it('does the four jobs: what NodeGX is, the state, the exits, what happens next', () => {
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('NodeGX (OpenNoodl)');
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('NO PROJECT IS BOUND');
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('list_projects');
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('create_project');
    // 🔴 FIX-008 D — this read `AFTER CREATING`, and the third job ("the exits")
    // was one exit and a cul-de-sac: `list_projects` could name the user's real
    // project and nothing in the briefing could open it. Both exits are now
    // named, and the fourth job covers both.
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('open_project');
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('AFTER OPENING OR CREATING');
  });

  it('🔴 names open_project as what to do with what list_projects found', () => {
    // The ordering assertion below is the *mitigation* for an agent defaulting
    // to creation; this is the thing that makes the alternative actionable. A
    // briefing that names `list_projects` first and gives it no follow-through
    // has one completable path in it, and it is the one that builds a second app
    // beside the user's real one.
    expect(BOOTSTRAP_INSTRUCTIONS.indexOf('list_projects')).toBeLessThan(BOOTSTRAP_INSTRUCTIONS.indexOf('open_project'));
    expect(BOOTSTRAP_INSTRUCTIONS.indexOf('open_project')).toBeLessThan(BOOTSTRAP_INSTRUCTIONS.indexOf('create_project'));
  });

  it('names list_projects before create_project', () => {
    // ⚠️ §2's ordering claim, and the reason it is a claim rather than a
    // preference: an agent that reaches for creation by default builds a second
    // app beside the one the user meant, which is a destructive-feeling outcome
    // even though nothing was deleted. The order is the mitigation, so the order
    // is asserted.
    expect(BOOTSTRAP_INSTRUCTIONS.indexOf('list_projects')).toBeLessThan(BOOTSTRAP_INSTRUCTIONS.indexOf('create_project'));
  });

  it('teaches no authoring', () => {
    // The paragraphs about Routers, Static Data and plan-first order belong to a
    // project and arrive with one. Sent to an agent holding four tools they are
    // noise — and `instructions` is sent once and can never be revised, so by
    // the time they are relevant they are already stale.
    for (const authoring of [
      'Router',
      'Static Data',
      'Component Inputs',
      'create_plan',
      'get_project_info',
      'get_style_vocabulary',
      'render_report',
      'provision_backend'
    ]) {
      expect(BOOTSTRAP_INSTRUCTIONS).not.toContain(authoring);
    }
  });

  it('describes the bind this build DOES perform', () => {
    // ⚠️ This asserted the opposite until BST-002 landed, and the comment said
    // so: promising a bind the build does not make leaves an agent waiting for
    // tools that never arrive, which looks like a hang rather than an
    // instruction. The rule is symmetric, which is why the assertion flipped
    // rather than being deleted — the paragraph must always match the build.
    //
    // 🔴 FIX-008 D — flipped a second time, and for the same reason in the other
    // direction: the build now binds an *opened* project too, so a paragraph
    // that still said "the new project" would be describing half of what the
    // server does and an agent that opened one would be reading about creation.
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('this server binds itself to the project');
    expect(BOOTSTRAP_INSTRUCTIONS).not.toContain('this server stays unbound');
  });

  it('sends the agent to the one field carrying what initialize could not', () => {
    // 🔴 The silent half of BST-002. `instructions` is fixed at `initialize`, so
    // a server that binds mid-session has already spent its briefing on this
    // text — and the authoring paragraphs it never sent are the ones written
    // because measured models failed without them. They travel in the bind
    // result instead, and this is the sentence that makes an agent read them.
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('bound.guidance');
  });

  it('says a second create_project does not repoint the server', () => {
    // Otherwise an agent tidying up mid-session describes its next twenty calls
    // as being about the new project when every one is about the old one.
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('does NOT repoint this server');
  });

  it('is a fraction of the bound briefing', () => {
    // Not a budget, a shape check: if this ever approaches the bound text's
    // length, somebody has started teaching authoring here.
    //
    // P125-BRIEFSHAPE (settled 2026-10-25, CCN-008): the ceiling was 70% and two P125 sentences took the briefing
    // past it, neither about authoring: call the tools through your client (CCN-001 s2) and show a look to choose
    // in a mini editor, not a mock-up (CCN-008). In Claude Desktop the server always starts unbound, so this is the
    // only NodeGX text the model holds all conversation, and how the person sees and steers the app belongs in it.
    // The ceiling is restated at 85%, and the intent is now asserted directly below: no authoring tool is named.
    expect(BOOTSTRAP_INSTRUCTIONS.length).toBeLessThan(golden('deferred').length * 0.85);
  });

  it('teaches no authoring: it names none of the tools that write a graph', () => {
    for (const tool of ['create_component', 'update_component', 'create_plan', 'apply_plan', 'stage_plan_operation', 'validate_component']) {
      expect(BOOTSTRAP_INSTRUCTIONS).not.toContain(tool);
    }
  });

  it('CCN-008: a look to choose is shown as the real part (show_mini_editor), never a mock-up', () => {
    // Richard's first run (2026-10-25): "some options for the buttons" became four HTML mock-ups in Desktop's own
    // visualizer, and no tool here was called.
    expect(BOOTSTRAP_INSTRUCTIONS).toContain('show_mini_editor');
    expect(BOOTSTRAP_INSTRUCTIONS).toMatch(/never a mock-up drawn as HTML, a widget or an artifact/);
  });
});

describe('P112-OWN023-RESUMEUNBOUND — a resumed session is told the app already in its folder', () => {
  // The gala's arm B: `create_project` built `gala-app` in a sub-folder of the session's folder, the person said
  // "done", the resumed session's server started unbound with seven tools, and the agent said the connection had
  // dropped. The briefing is all it read before choosing; the project was one `list_projects` away.
  const sessionFolder = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'resumeunbound-'));

  it('names the sub-folder project, says the unbound start is normal, and sends it to open_project first', async () => {
    const folder = sessionFolder();
    const app = path.join(folder, 'gala-app');
    fs.cpSync(copyFixture(), app, { recursive: true });
    const served = await instructionsOf({ allowWrites: true, startFolder: folder });
    expect(served).toContain(`THIS FOLDER ALREADY HOLDS A NODEGX PROJECT: `);
    expect(served).toContain(`(${app})`);
    expect(served).toMatch(/not a dropped connection, and reconnecting gives the same ones/);
    expect(served).toMatch(/call open_project with its directory before anything else/);
    // Before the two exits, so it is read before create_project is.
    expect(served.indexOf('THIS FOLDER ALREADY HOLDS')).toBeLessThan(served.indexOf('TWO WAYS ON'));
    // Everything else is the briefing it was.
    expect(served.replace(/THIS FOLDER ALREADY HOLDS[^]*?before anything else\. /, '')).toBe(BOOTSTRAP_INSTRUCTIONS);
  });

  it('names a started-in project folder itself', async () => {
    const app = copyFixture();
    expect(await instructionsOf({ allowWrites: true, startFolder: app })).toContain(`(${app})`);
  });

  it('counts several and asks for the one the person means', async () => {
    const folder = sessionFolder();
    for (const name of ['one', 'two']) fs.cpSync(copyFixture(), path.join(folder, name), { recursive: true });
    const served = await instructionsOf({ allowWrites: true, startFolder: folder });
    expect(served).toContain('THIS FOLDER ALREADY HOLDS 2 NODEGX PROJECTS: ');
    expect(served).toContain('the directory of the one the person means');
  });

  it('says nothing new in a folder with no project', async () => {
    expect(await instructionsOf({ allowWrites: true, startFolder: sessionFolder() })).toBe(BOOTSTRAP_INSTRUCTIONS);
  });
});
