/**
 * P112 OWN-031 step 3 — the paired gate for the review loop: the port (`src/guided/review.ts`) critiques, keeps,
 * reverts and repairs exactly as the lab did, round by round, for the same answers.
 *
 * Each fixture is one of OWN-030's frozen graph-lane runs (harness 22989dd1), all of its rounds: the decisions it
 * preloaded (with their confidence, which the flips read), every ask it made (hinted re-asks, forced flips), every
 * judgement with its exact words, and its `roundsLog`. Replayed through `replayDoor`, a judgement is found by its
 * words, and those words hold the section's whole description: a port that builds, describes or words anything
 * differently fails on the first judgement it cannot find. Then each round's numbers, issues, keep-or-revert and
 * chosen fixes must equal the lab's, and nothing the run recorded may be left unasked.
 *
 * Render findings: the lab rendered each round in Chrome; here the render is off (setupEnv), so each round's findings
 * are rebuilt from the `R|<code>|<section>` issues the lab recorded (weight 6 = error), with evidence quoting that
 * section's first words so the port maps them back to the same section.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { replayDoor, unconsumed } from '../src/guided/door';
import { deleteRound, planRound, preparePage, startCard, writeRound, type Skipped, type ToolOut } from '../src/guided/page';
import { reviewLoop } from '../src/guided/review';
import { createServer } from '../src/server';

const FIXTURES = path.join(__dirname, 'fixtures', 'own031-review');
const BRIEFS = ['bakery', 'jazz', 'plumber', 'pottery', 'puppy', 'running'];

describe('OWN-031 step 3: the ported review loop repairs what the lab repaired', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'own031r-'));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it.each(BRIEFS)('%s: every round critiqued, kept and repaired as recorded', async (brief) => {
    const fx = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, `${brief}.json.gz`))).toString('utf8'));
    const { server } = createServer({ allowWrites: true });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'own031r', version: '0.0.0' });
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
      const door = replayDoor(fx.recording);
      const exclude = new Map<string, Set<string>>();
      const skipped: Skipped = [];
      const deps = { door, request: fx.request, skipped, exclude };
      const card = await startCard(deps);
      const directory = path.join(tmp, 'p');
      expect((await tool('create_project', { directory, name: brief, request: fx.request, summary: fx.request, audience: 'visitors', pages: [{ name: 'Home', purpose: fx.request }], backend: { kind: 'none', description: 'None.' }, agreed: false })).isError).toBe(false);
      await tool('find_tools', { group: 'theme' });
      const prep = await preparePage({ ...deps, projectDir: directory }, card, tool);
      let previous: string[] = [];
      const out = await reviewLoop({
        door,
        request: fx.request,
        card,
        exclude,
        rounds: fx.rounds,
        build: async (round) => {
          const planned = await planRound(deps, card, prep, round === 0 ? 'Sections' : `Sections v${round + 1}`);
          const written = await writeRound(deps, card, planned, tool);
          expect(written.applied).toBe(true);
          await deleteRound(tool, previous);
          previous = written.paths;
          const findings = (fx.log[round]?.issues || [])
            .filter((i: any) => i.id.startsWith('R|'))
            .map((i: any) => {
              const [, code, S] = i.id.split('|');
              const b = planned.built.find((x) => x.S === S);
              const words = b?.nodes!.map((n) => n.params.text || n.params.label).find(Boolean);
              return { code, severity: i.weight === 6 ? 'error' : 'warning', message: code, ...(words ? { evidence: [{ text: words }] } : {}) };
            });
          return { card, built: planned.built, staging: written.staging, findings };
        }
      });

      expect(out.log.map((r) => r.round)).toEqual(fx.log.map((r: any) => r.round));
      out.log.forEach((r, k) => {
        const want = fx.log[k];
        expect({ round: r.round, perLine: r.perLine, defects: r.defects, lines: r.lines, sum: r.sum, org: r.org, shape: r.shape, suits: r.suits, kept: r.kept }).toEqual({ round: want.round, perLine: want.perLine, defects: want.defects, lines: want.lines, sum: want.sum, org: want.org, shape: want.shape, suits: want.suits, kept: want.kept });
        expect(r.issues.map((i) => `${i.id} ${i.weight} ${i.op ?? ''}`)).toEqual(want.issues.map((i: any) => `${i.id} ${i.weight} ${i.op ?? ''}`));
        expect(r.fixesForNext ?? null).toEqual(want.fixesForNext ?? null);
      });
      expect(unconsumed(fx.recording, door)).toEqual([]);
      // the project holds one round's components: each later round deleted the one before it
      const comps = (await tool('list_components', {})).json?.components?.map((c: any) => c.path ?? c.name) ?? [];
      expect(comps.filter((p: string) => /^\/?Sections/.test(p)).every((p: string) => previous.some((q) => p.replace(/^\//, '') === q))).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  }, 120_000);
});
