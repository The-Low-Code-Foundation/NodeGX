/**
 * P112-OWN026-CONFIGFOUROHFOUR — the preview's "no override" for nodegx-config.json is not an error status.
 *
 * The viewer asks for `nodegx-config.json` on boot (DEP-001). The preview answered 404 on purpose (a stray file in the
 * project must not re-point the preview's backend), and every browser logs a 404 as a red console error: 27 of them
 * across one OWN-026 walkthrough, so no previewed app could pass "no console errors". It now answers `{}`, which the
 * viewer applies nothing from. The rule is unchanged, and the control is a stray config file in the project that
 * still does not come back.
 */
import * as fs from 'fs';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, type RunningPreview } from './helpers';

beforeAll(() => assertPrerequisites());

describe('GET /nodegx-config.json on a preview', () => {
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    dir = scratchCopy('hello-world');
    // The stray file the rule is there for: it would point the app at another backend.
    fs.writeFileSync(path.join(dir, 'nodegx-config.json'), JSON.stringify({ cloudservices: { endpoint: 'https://elsewhere.example' } }));
    preview = await startPreview(dir, ['--no-watch']);
  });
  afterAll(async () => {
    await preview?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('answers 200 with an empty object, so the browser logs nothing', async () => {
    const res = await get(preview.port, '/nodegx-config.json');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({});
  });

  it("control: the project's own nodegx-config.json is still never served", async () => {
    const res = await get(preview.port, '/nodegx-config.json');
    expect(res.body).not.toContain('elsewhere.example');
  });
});
