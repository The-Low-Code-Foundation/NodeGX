/**
 * P112-S14-NOBACKEND — the preview keeps a backend on this machine and still blanks any other.
 *
 * `provision_backend` binds a project to `http://127.0.0.1:<port>`. The preview blanked every cloud-services
 * endpoint, so an app built from npm ran with no backend at all ("This project has no backend configured") while
 * its backend was up. The remote arm is the rule the blanking exists for, and the control: a deployed backend must
 * never be reached by a local preview by accident.
 */
import * as fs from 'fs';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, writeJson } from './helpers';

beforeAll(() => assertPrerequisites());

const MARKER = 'window.projectData = ';

async function servedCloudServices(endpoint: string | undefined): Promise<TSFixme> {
  const dir = scratchCopy('hello-world');
  if (endpoint) {
    writeJson<TSFixme>(path.join(dir, 'nodegx.project.json'), (p) => {
      p.metadata = { cloudservices: { instanceId: 'backend_test', endpoint, appId: 'backend_test', type: 'nodegx' } };
    });
  }
  const preview = await startPreview(dir, ['--no-watch']);
  try {
    const body = (await get(preview.port, '/index.js')).body;
    const data = JSON.parse(body.slice(body.indexOf(MARKER) + MARKER.length).replace(/;\s*$/, ''));
    return data.metadata.cloudservices;
  } finally {
    await preview.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('the backend a preview hands its page', () => {
  it('keeps a backend on this machine (what provision_backend binds)', async () => {
    const cs = await servedCloudServices('http://127.0.0.1:8578');
    expect(cs.endpoint).toBe('http://127.0.0.1:8578');
    expect(cs.appId).toBe('backend_test');
    expect(cs.type).toBe('nodegx');
  });

  it('keeps localhost too', async () => {
    expect((await servedCloudServices('http://localhost:8600')).endpoint).toBe('http://localhost:8600');
  });

  it('still blanks a deployed backend, so a preview never reaches it by accident', async () => {
    const cs = await servedCloudServices('https://lingo.nodegx.io');
    expect(cs.endpoint).toBeUndefined();
  });

  it('a lookalike host is not this machine', async () => {
    expect((await servedCloudServices('http://127.0.0.1.example.com')).endpoint).toBeUndefined();
  });

  it('no backend stays no backend', async () => {
    expect((await servedCloudServices(undefined)).endpoint).toBeUndefined();
  });
});
