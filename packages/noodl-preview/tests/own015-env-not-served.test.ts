/**
 * P112-S14-ENVSERVED — the preview serves a project file only if a deploy would publish it.
 *
 * OWN-015 asks the person to paste their API key into the project's `.env`. The preview served every file in the
 * project folder, so `GET /.env` handed the key to anyone who asked (and with `--host`, to the whole network). The
 * control is an ordinary asset in the same folder, which must still be served, or a blanket 404 would pass.
 */
import * as fs from 'fs';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, type RunningPreview } from './helpers';

beforeAll(() => assertPrerequisites());

const CANARY = 'own015-env-canary-7f3a';

describe('what the preview will serve from the project folder', () => {
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    dir = scratchCopy('hello-world');
    fs.writeFileSync(path.join(dir, '.env'), `GEMINI_API_KEY=${CANARY}\n`);
    fs.writeFileSync(path.join(dir, '.env.local'), `X=${CANARY}\n`);
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `${CANARY}\n`);
    fs.writeFileSync(path.join(dir, '.mcp.json'), `{"x":"${CANARY}"}\n`);
    fs.writeFileSync(path.join(dir, 'secret-notes.txt'), `${CANARY}\n`);
    fs.writeFileSync(path.join(dir, '.noodlignore'), 'secret-notes.txt\n');
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'assets', 'hello.txt'), 'an ordinary asset\n');
    preview = await startPreview(dir, ['--no-watch']);
  });
  afterAll(async () => {
    await preview?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(['/.env', '/%2Eenv', '/./.env', '/assets/../.env', '/.env.local', '/CLAUDE.md', '/.mcp.json', '/secret-notes.txt', '/components/App/nodes.json', '/nodegx.project.json'])(
    'refuses %s',
    async (url) => {
      const res = await get(preview.port, url);
      expect(res.status).toBe(404);
      expect(res.body).not.toContain(CANARY);
    }
  );

  it('still serves an ordinary asset (the control)', async () => {
    const res = await get(preview.port, '/assets/hello.txt');
    expect(res.status).toBe(200);
    expect(res.body).toBe('an ordinary asset\n');
  });
});
