/**
 * COMMUNITY-CFSECRETS and COMMUNITY-ADMINPATH: a builder deploying to Cloudflare with no agent got the app up, then
 * looked for the cloud function's token in Cloudflare's dashboard, then opened `/admin` for the backend's own page
 * and got a JSON 404.
 *
 * Graded here:
 *   - every guide section the deploy links to is a `{#id}` heading of `docs-site/docs/deploy/cloudflare.md`, at the
 *     address the docs site serves that file from;
 *   - the secret names come out of the functions bundle, and the report against a REAL backend's
 *     `GET /admin/secrets` names the set one, the missing one, the `.env` one and the page to set them on;
 *   - a deploy that stops prints the guide's section for the step it stopped at;
 *   - a browser's `GET /admin` goes to `/_admin`; an API caller keeps the JSON 404.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { main as deploy } from '../cloudflare/deployCloudflare';
import { GUIDE_SECTIONS, GUIDE_URL, guideLink, secretNamesRead, secretsReport, type SecretsListing } from '../cloudflare/guide';
import { BackendService } from '../src/service';

jest.setTimeout(60000);

const REPO = path.join(__dirname, '..', '..', '..');
const GUIDE_FILE = path.join(REPO, 'docs-site', 'docs', 'deploy', 'cloudflare.md');

describe('the guide the deploy links to', () => {
  test('its address is where the docs site serves docs-site/docs/deploy/cloudflare.md', () => {
    const config = fs.readFileSync(path.join(REPO, 'docs-site', 'docusaurus.config.js'), 'utf8');
    const url = /url:\s*'([^']+)'/.exec(config)?.[1];
    const baseUrl = /baseUrl:\s*'([^']+)'/.exec(config)?.[1];
    expect(GUIDE_URL).toBe(`${url}${baseUrl}docs/deploy/cloudflare`);
    expect(fs.existsSync(GUIDE_FILE)).toBe(true);
  });

  test('every section the deploy names is a heading id on that page', () => {
    const ids = [...fs.readFileSync(GUIDE_FILE, 'utf8').matchAll(/^#+ .*\{#([a-z0-9-]+)\}\s*$/gm)].map((m) => m[1]);
    for (const id of Object.values(GUIDE_SECTIONS)) expect([id, ids.includes(id)]).toEqual([id, true]);
    expect(guideLink('secrets')).toBe(`${GUIDE_URL}#secrets`);
  });

  test("the npm package's help and README carry the same address", () => {
    const bin = fs.readFileSync(path.join(REPO, 'packages', 'nodegx-backend-npm', 'bin', 'nodegx-online.js'), 'utf8');
    const readme = fs.readFileSync(path.join(REPO, 'packages', 'nodegx-backend-npm', 'README.md'), 'utf8');
    expect(bin).toContain(GUIDE_URL);
    expect(readme).toContain(`${GUIDE_URL}#secrets`);
    expect(readme).toMatch(/_admin/);
  });
});

describe('secretNamesRead', () => {
  test('typed-in names of Secret nodes, nested ones too; nothing else', () => {
    const names = secretNamesRead([
      {
        nodes: [
          { type: 'noodl.cloud.secret', parameters: { name: 'STRIPE_KEY' } },
          { type: 'Group', children: [{ type: 'noodl.cloud.secret', parameters: { name: ' MAILCHIMP_KEY ' } }] },
          { type: 'noodl.cloud.secret', parameters: {} },
          { type: 'noodl.cloud.secret', parameters: { name: '' } },
          { type: 'String', parameters: { name: 'NOT_A_SECRET' } }
        ]
      },
      { nodes: [{ type: 'noodl.cloud.secret', parameters: { name: 'STRIPE_KEY' } }] },
      {}
    ]);
    expect(names).toEqual(['MAILCHIMP_KEY', 'STRIPE_KEY']);
  });
});

describe('secretsReport against a real backend', () => {
  let service: BackendService;
  let base: string;
  let token: string;
  let dataDir: string;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfsecrets-'));
    service = new BackendService({ dataDir, port: 0 });
    base = (await service.start()).listen.url;
    token = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf8')).adminToken;
    const put = await fetch(`${base}/admin/secrets/STRIPE_KEY`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'sk_test_cfsecrets' })
    });
    expect(put.status).toBeLessThan(300);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function listing(): Promise<SecretsListing> {
    const r = await fetch(`${base}/admin/secrets`, { headers: { authorization: `Bearer ${token}` } });
    expect(r.status).toBe(200);
    return (await r.json()) as SecretsListing;
  }

  test('names the set one and the missing one, the .env one, the page and the credential file; never a value', async () => {
    const lines = secretsReport({
      read: ['MAILCHIMP_KEY', 'STRIPE_KEY'],
      listing: await listing(),
      inEnvFile: ['MAILCHIMP_KEY'],
      dashboard: 'https://app.someone.workers.dev/_admin',
      credentialFile: '/home/x/.nodegx/cloudflare/app/deployment.json'
    });
    const text = lines.join('\n');
    expect(text).toMatch(/Set on this backend: STRIPE_KEY\./);
    expect(text).toMatch(/NOT set on this backend: MAILCHIMP_KEY\./);
    expect(text).toMatch(/\.env has MAILCHIMP_KEY/);
    expect(text).toContain('https://app.someone.workers.dev/_admin#/secrets');
    expect(text).toMatch(/not in Cloudflare's dashboard/);
    expect(text).toContain('adminToken in /home/x/.nodegx/cloudflare/app/deployment.json');
    expect(text).toContain(`${GUIDE_URL}#secrets`);
    expect(text).not.toContain('sk_test_cfsecrets');
  });

  test('all set: one line, no warning', async () => {
    const lines = secretsReport({ read: ['STRIPE_KEY'], listing: await listing(), inEnvFile: [], dashboard: 'd', credentialFile: 'f' });
    expect(lines).toEqual(['Secrets the functions read: STRIPE_KEY. All are set on this backend.']);
  });

  test('a backend that could not be asked is never reported as all set', () => {
    const text = secretsReport({ read: ['STRIPE_KEY'], listing: null, inEnvFile: [], dashboard: 'd', credentialFile: 'f' }).join('\n');
    expect(text).toMatch(/could not be asked/);
    expect(text).not.toMatch(/All are set/);
  });

  test('no Secret node: nothing printed', () => {
    expect(secretsReport({ read: [], listing: null, inEnvFile: [], dashboard: 'd', credentialFile: 'f' })).toEqual([]);
  });

  test('COMMUNITY-ADMINPATH: a browser opening /admin goes to /_admin; an API caller keeps the JSON 404', async () => {
    const browser = await fetch(`${base}/admin`, { headers: { accept: 'text/html,application/xhtml+xml' }, redirect: 'manual' });
    expect(browser.status).toBe(302);
    expect(browser.headers.get('location')).toBe('/_admin');
    const slash = await fetch(`${base}/admin/`, { headers: { accept: 'text/html' }, redirect: 'manual' });
    expect(slash.status).toBe(302);
    const api = await fetch(`${base}/admin`, { headers: { accept: 'application/json' }, redirect: 'manual' });
    expect(api.status).toBe(404);
    expect(((await api.json()) as { error: string }).error).toBe('Not found: GET /admin');
    const below = await fetch(`${base}/admin/nothing-here`, { headers: { accept: 'text/html' }, redirect: 'manual' });
    expect(below.status).toBe(404);
  });
});

describe('COMMUNITY-ADMINPATH with the dashboard off', () => {
  test('no redirect to a page that is not there', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfsecrets-off-'));
    const service = new BackendService({ dataDir, port: 0, adminDashboard: false });
    try {
      const base = (await service.start()).listen.url;
      const r = await fetch(`${base}/admin`, { headers: { accept: 'text/html' }, redirect: 'manual' });
      expect(r.status).toBe(404);
    } finally {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe('a deploy that stops prints the guide for that step', () => {
  const saved = { home: process.env.NODEGX_CLOUDFLARE_HOME, bundle: process.env.NODEGX_CLOUD_BUNDLE };
  let tmp: string;
  let out: string;
  let err: string;
  let spies: jest.SpyInstance[];

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfsecrets-deploy-'));
    process.env.NODEGX_CLOUDFLARE_HOME = path.join(tmp, 'home');
    out = '';
    err = '';
    spies = [
      jest.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => ((out += String(s)), true)),
      jest.spyOn(process.stderr, 'write').mockImplementation((s: string | Uint8Array) => ((err += String(s)), true))
    ];
  });

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    for (const [k, v] of [['NODEGX_CLOUDFLARE_HOME', saved.home], ['NODEGX_CLOUD_BUNDLE', saved.bundle]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('before any step: the whole guide', async () => {
    expect(await deploy([path.join(tmp, 'not-a-project')])).toBe(1);
    expect(err).toMatch(/is not a NodeGX project/);
    expect(err).toContain(`Help with this step: ${GUIDE_URL}\n`);
  });

  test('at step 1: the step line links its section, and so does the refusal', async () => {
    const project = path.join(tmp, 'app');
    fs.mkdirSync(project);
    fs.writeFileSync(path.join(project, 'nodegx.project.json'), JSON.stringify({ name: 'cfsecrets-app', components: [] }));
    process.env.NODEGX_CLOUD_BUNDLE = path.join(tmp, 'no-bundler-here.cjs');
    expect(await deploy([project])).toBe(1);
    expect(out).toContain(`The guide to every step below: ${GUIDE_URL}\n`);
    expect(out).toContain(`1. Cloud functions   (help: ${GUIDE_URL}#cloud-functions)`);
    expect(err).toMatch(/cloud-function bundler is not here/);
    expect(err).toContain(`Help with this step: ${GUIDE_URL}#cloud-functions`);
  });
});
