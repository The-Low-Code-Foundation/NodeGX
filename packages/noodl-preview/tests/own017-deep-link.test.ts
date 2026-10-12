/**
 * P112-S16-DEEPLINK — an app routed by path survives a reload in the preview.
 *
 * OWN-017: Richard saved an edit in a home-made editor while on the French app's lesson page; the preview's live
 * reload asked for `/lesson/greetings` and the server answered a plain-text 404 "Not found". The deploy's server
 * (Caddy `try_files {path} /index.html`) answers every such address with the app. The controls: `/` is the same page,
 * a missing asset with an extension stays 404, and a file the deploy would not publish stays 404.
 */
import * as fs from 'fs';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, type RunningPreview } from './helpers';

beforeAll(() => assertPrerequisites());

describe('an address that names no file is the app', () => {
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    dir = scratchCopy('hello-world');
    fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=own017-canary\n');
    preview = await startPreview(dir, ['--no-watch']);
  });
  afterAll(async () => {
    await preview?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each(['/lesson/greetings', '/lesson', '/a/b/c/d'])('%s is the same page as /', async (url) => {
    const home = await get(preview.port, '/');
    const res = await get(preview.port, url);
    expect(home.status).toBe(200);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toBe(home.body);
  });

  it.each(['/missing.png', '/lesson/greetings.json', '/.env', '/components/App/nodes.json'])('%s stays 404', async (url) => {
    const res = await get(preview.port, url);
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('own017-canary');
  });
});
