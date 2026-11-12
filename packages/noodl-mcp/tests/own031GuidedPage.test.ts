/**
 * P112 OWN-031 AC3 — the paired gate: the port of OWN-029's question tree (`src/guided/page.ts`) builds the same page
 * as the lab harness it came from, for the same answers.
 *
 * Each fixture is one of OWN-030's frozen graph-lane runs (harness 22989dd1): the round-0 decisions of its source run
 * (`S0-<brief>`), the words its own round 0 wrote (`G-<brief>`), the photos the scout kept, and the tree the harness
 * built from them (`runs/G-<brief>/r0/tree.json`). The answers replay through `replayDoor`, which fails on any
 * question the run never answered, so a port that asks something new, or the same thing under a new signature, fails
 * here before it reaches a person.
 *
 * What it does not grade: the words of a question (they may change freely), and the photo scout's first question,
 * which is new in the port (a replay arrives with its photos decided).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { replayDoor } from '../src/guided/door';
import { buildPage, startCard, treeOf, type Skipped, type ToolOut } from '../src/guided/page';
import { createServer } from '../src/server';

const FIXTURES = path.join(__dirname, 'fixtures', 'own031');
const BRIEFS = ['bakery', 'jazz', 'plumber', 'pottery', 'puppy', 'running'];

describe('OWN-031 AC3: the ported question tree builds what the lab built', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'own031-'));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it.each(BRIEFS)('%s: same answers, same trees, and the page applies', async (brief) => {
    const fx = JSON.parse(fs.readFileSync(path.join(FIXTURES, `${brief}.json`), 'utf8'));
    const { server } = createServer({ allowWrites: true });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'own031', version: '0.0.0' });
    await Promise.all([server.connect(st), client.connect(ct)]);
    try {
      const tool = async (name: string, args: Record<string, unknown>): Promise<ToolOut> => {
        const r = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: { text?: string }[] };
        const text = r.content?.[0]?.text ?? '';
        let json: any = null;
        try {
          json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        } catch {
          /* text only */
        }
        return { isError: !!r.isError, text, json };
      };
      const door = replayDoor(fx.answers);
      const skipped: Skipped = [];
      const deps = { door, request: fx.request, skipped };
      const card = await startCard(deps);
      const directory = path.join(tmp, 'p');
      const created = await tool('create_project', { directory, name: brief, request: fx.request, summary: fx.request, audience: 'visitors', pages: [{ name: 'Home', purpose: fx.request }], backend: { kind: 'none', description: 'None.' }, agreed: false });
      expect(created.isError).toBe(false);
      // a client reaches the theme tools through their group (the lab did this too); build_app calls them in-process
      await tool('find_tools', { group: 'theme' });
      const page = await buildPage({ ...deps, projectDir: directory }, card, tool);

      const got = JSON.parse(JSON.stringify(treeOf(page.card, page.built)));
      expect(got.card).toEqual(fx.tree.card);
      expect(got.sections.map((s: any) => `${s.kind}: ${s.bits.join(', ')}`)).toEqual(fx.tree.sections.map((s: any) => `${s.kind}: ${s.bits.join(', ')}`));
      got.sections.forEach((s: any, i: number) => expect(s.nodes).toEqual(fx.tree.sections[i].nodes));
      expect(page.applied).toBe(true);
      expect(page.staging).toEqual([]);
      // every answer the run recorded for this page was asked for, so nothing in the tree came from a default
      const asked = new Set(door.calls.map((c) => c.sig));
      const unasked = Object.keys(fx.answers).filter((sig) => !asked.has(sig) && sig !== 'card|photos' && !sig.startsWith('sections.add'));
      expect(unasked).toEqual([]);
    } finally {
      await client.close();
      await server.close();
    }
  }, 60_000);
});
