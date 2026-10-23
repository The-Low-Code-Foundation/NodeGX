/**
 * P125-PUPPY-ONEAPPLY / P125-PUPPY-TWOPANELS — what Richard's puppy run in Claude Desktop (2026-10-23) showed.
 *
 * The model staged eight components for three minutes and applied them in one second: the person watched an empty
 * Studio and had nothing to stop. While Studio is running for the project, `create_plan` now refuses a plan of more
 * than `STUDIO_BURST` components, and says the order that fills the screen (the page first, then each section created
 * and placed in one apply). The control: the same plan, no Studio, is accepted — a build nobody watches is unchanged.
 *
 * Studio here is a stand-in (`editor/serve.mjs` that reports a port, as Studio's does), found through NODEGX_STUDIO,
 * so `open_studio` starts it the way it starts the real one, and `studioFor` reads it as running.
 *
 * @module noodl-mcp/tests/p125PuppyBursts
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { studioFor } from '../src/studio/studioProcess';
import { STUDIO_BURST } from '../src/tools/planTools';
import { call, connect, copyFixture, reveal, type TestSession } from './helpers';

type Refusal = { error: { code: string; message: string; details?: { watched?: boolean; limit?: number } } };
type Plan = { planId: string };

const FAKE_STUDIO = `import http from 'node:http';
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html>studio'); });
server.listen(0, '127.0.0.1', () => { console.log('nodegx-studio: http://127.0.0.1:' + server.address().port + '/  (fake)'); });
`;

/** A plan creating `n` new sections, each a plain visual component. */
function sections(n: number): Array<{ kind: 'create'; target: string; intent: string }> {
  return Array.from({ length: n }, (_, i) => ({ kind: 'create' as const, target: `Components/Section${i + 1}`, intent: `Section ${i + 1} of the landing page` }));
}

describe('P125-PUPPY-ONEAPPLY — a plan reaches a watching person in bursts', () => {
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

  describe('with no Studio open (the control)', () => {
    let session: TestSession;
    beforeAll(async () => {
      session = await connect(copyFixture());
    });
    afterAll(async () => {
      await session.close();
    });

    it(`accepts a plan of ${STUDIO_BURST + 3} components, as before`, async () => {
      const res = await call<Plan | Refusal>(session, 'create_plan', { request: 'a landing page', scroll: 'page', operations: sections(STUDIO_BURST + 3) });
      expect(res.isError).toBe(false);
      expect((res.data as Plan).planId).toEqual(expect.any(String));
    });
  });

  describe('with Studio open for the project', () => {
    let session: TestSession;
    let pid: number | undefined;
    let opened: { note: string; url: string };
    beforeAll(async () => {
      session = await connect(copyFixture());
      await reveal(session, 'project');
      const res = await call<{ note: string; url: string }>(session, 'open_studio');
      if (res.isError) throw new Error(`open_studio failed: ${JSON.stringify(res.data)}`);
      opened = res.data;
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

    it('Studio is running for the project (the precondition the refusal reads)', () => {
      expect(pid).toEqual(expect.any(Number));
    });

    it(`refuses a plan of ${STUDIO_BURST + 1} components, and says the order that fills the screen`, async () => {
      const res = await call<Refusal>(session, 'create_plan', { request: 'a landing page', scroll: 'page', operations: sections(STUDIO_BURST + 1) });
      expect(res.isError).toBe(true);
      expect(res.data.error.code).toBe('invalid-argument');
      expect(res.data.error.details).toMatchObject({ watched: true, limit: STUDIO_BURST });
      expect(res.data.error.message).toMatch(/watching this app in Studio/);
      expect(res.data.error.message).toMatch(/first the page with its Page node/);
      expect(res.data.error.message).toMatch(/AND updates the page to place it/);
    });

    it(`accepts a plan of ${STUDIO_BURST} components (a section, its leaf, the page that places it)`, async () => {
      const res = await call<Plan | Refusal>(session, 'create_plan', { request: 'one section', scroll: 'page', operations: sections(STUDIO_BURST) });
      expect(res.isError).toBe(false);
    });

    it('counts components, not project docs: a burst plus its doc is one burst', async () => {
      const ops = [...sections(STUDIO_BURST), { kind: 'doc', target: 'docs/decisions/001-landing.md', intent: 'Why the landing page is built this way' }];
      const res = await call<Plan | Refusal>(session, 'create_plan', { request: 'one section and a note', scroll: 'page', operations: ops });
      expect(res.isError).toBe(false);
    });

    it("open_studio's result says the order and says not to call it again in the same turn (P125-PUPPY-TWOPANELS)", () => {
      expect(opened.note).toMatch(/first the page with its Page node and nothing on it/);
      expect(opened.note).toMatch(/do not call open_studio again until the next turn/);
    });

    it("open_studio's description asks for one call per turn, first, never to finish the turn", async () => {
      const tools = await session.client.listTools();
      const desc = tools.tools.find((t) => t.name === 'open_studio')?.description ?? '';
      expect(desc).toMatch(/ONCE per turn, as the turn's FIRST call/);
      expect(desc).toMatch(/never to finish it/);
      expect(desc).not.toMatch(/no-op/);
    });
  });
});
