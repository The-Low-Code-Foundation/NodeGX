/**
 * P112-OWN023-KEYNEEDSAGENT — a key the person pastes into the project's `.env` reaches a cloud function by itself.
 *
 * The OWN-023 agent told the person to paste the key into `openwave/.env` and then "tell me. I'll then load it into
 * the backend": before this the backend never read that file, so the key reached a function only through a second
 * `set_function_secret` call that copied it into `secrets.json`. This spec drives a real service started beside a
 * project (`projectDir`, as the preview, the editor and `provision_backend` start it) and asserts the consequence:
 * the key the person saved is the one an upstream server receives, with no admin call and no restart.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { SecretsStore } from '../src/config/SecretsStore';
import { SecretValueScrubber } from '../src/ops/log-scrub';
import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

const PASTED = 'sk_pasted_into_env_5f20aa_do_not_leak';
const OLD_COPY = 'sk_old_stored_copy_71c3e9_do_not_leak';
const STORED_ONLY = 'sk_stored_only_2b9d40_do_not_leak';

/** Request → Secret → HTTP (as a header) → Response: the admin-secrets spec's fixture. */
const callWithSecret = (upstream: string) => ({
  name: '/#__cloud__/callWithSecret',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true, params: 'secretName' }, ports: [], children: [] },
    { id: 'sec', type: 'noodl.cloud.secret', x: 0, y: 100, parameters: {}, ports: [], children: [] },
    {
      id: 'http',
      type: 'net.noodl.HTTP',
      x: 0,
      y: 200,
      parameters: { url: `${upstream}/paid-api`, method: 'GET', headers: 'X-Api-Key' },
      ports: [],
      children: []
    },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 300, parameters: { params: 'status' }, ports: [], children: [] },
    { id: 'resErr', type: 'noodl.cloud.response', x: 0, y: 400, parameters: { params: 'error' }, ports: [], children: [] }
  ],
  connections: [
    { sourceId: 'req', sourcePort: 'pm-secretName', targetId: 'sec', targetPort: 'name' },
    { sourceId: 'req', sourcePort: 'receive', targetId: 'sec', targetPort: 'fetch' },
    { sourceId: 'sec', sourcePort: 'value', targetId: 'http', targetPort: 'header-X-Api-Key' },
    { sourceId: 'sec', sourcePort: 'done', targetId: 'http', targetPort: 'fetch' },
    { sourceId: 'http', sourcePort: 'statusCode', targetId: 'res', targetPort: 'pm-status' },
    { sourceId: 'http', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
    { sourceId: 'sec', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
    { sourceId: 'sec', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
  ],
  roots: []
});

interface Listing {
  secrets: Array<{ name: string; alsoInProjectEnvFile?: boolean }>;
  projectEnvFile?: string[] | null;
}

function startable(upstreamUrl: string): string {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keyneedsagent-data-'));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'secrets.workflow.json'),
    JSON.stringify({ components: [callWithSecret(upstreamUrl)], settings: {}, metadata: {} })
  );
  return dataDir;
}

describe('P112-OWN023-KEYNEEDSAGENT: the project .env is a door for a function secret', () => {
  let upstream: http.Server;
  let upstreamUrl: string;
  const hits: Array<{ apiKey?: string }> = [];
  let dataDir: string;
  let projectDir: string;
  let service: BackendService;
  let base: string;
  const client = httpClient(() => base);
  const envFile = () => path.join(projectDir, '.env');

  /** The key the upstream received for `name`, or the Secret node's error when it failed. */
  async function keyFor(name: string): Promise<{ apiKey?: string; error?: string }> {
    const before = hits.length;
    const call = await client.request<{ result: { status?: number; error?: string } }>('POST', '/functions/callWithSecret', {
      body: { secretName: name }
    });
    expect(call.status).toBe(200);
    return { apiKey: hits.slice(before)[0]?.apiKey, error: call.json.result.error };
  }

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      hits.push({ apiKey: req.headers['x-api-key'] as string | undefined });
      res.setHeader('content-type', 'application/json');
      res.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    upstreamUrl = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;

    dataDir = startable(upstreamUrl);
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keyneedsagent-project-'));
    // What `set_function_secret` writes on its first call: an empty line waiting for the person.
    fs.writeFileSync(envFile(), '# Keys for this app\n\nMISTRAL_API_KEY=\n');
    service = new BackendService({ dataDir, port: 0, backendId: 'keyneedsagent', backendName: 'Key', projectDir });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('the empty placeholder line answers nothing, and the error says which line to fill', async () => {
    const got = await keyFor('MISTRAL_API_KEY');
    expect(got.apiKey).toBeUndefined();
    expect(got.error).toContain('"MISTRAL_API_KEY" is not provisioned');
    expect(got.error).toContain("pastes it after MISTRAL_API_KEY= in the app's .env file");
    // A public Response may carry this sentence: it names no path on this machine.
    expect(got.error).not.toContain(projectDir);
  });

  it('the person pastes and saves: the next call carries the key, with no admin call and no restart', async () => {
    fs.writeFileSync(envFile(), fs.readFileSync(envFile(), 'utf8').replace('MISTRAL_API_KEY=\n', `MISTRAL_API_KEY=${PASTED}\n`));
    expect((await keyFor('MISTRAL_API_KEY')).apiKey).toBe(PASTED);
    // Read from the file, not copied anywhere: secrets.json has no functions section at all.
    const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf8'));
    expect(onDisk.functions).toBeUndefined();
  });

  it('a filled .env line wins over an older stored copy; an emptied line falls back to it', async () => {
    new SecretsStore(dataDir).set('functions', 'MISTRAL_API_KEY', OLD_COPY);
    expect((await keyFor('MISTRAL_API_KEY')).apiKey).toBe(PASTED);
    fs.writeFileSync(envFile(), 'MISTRAL_API_KEY=\n');
    expect((await keyFor('MISTRAL_API_KEY')).apiKey).toBe(OLD_COPY);
    fs.writeFileSync(envFile(), `MISTRAL_API_KEY="${PASTED}"\n`);
    expect((await keyFor('MISTRAL_API_KEY')).apiKey).toBe(PASTED);
  });

  it('an empty .env line does not shadow a stored secret of the same name', async () => {
    new SecretsStore(dataDir).set('functions', 'STORED_KEY', STORED_ONLY);
    fs.writeFileSync(envFile(), `MISTRAL_API_KEY=${PASTED}\nSTORED_KEY=\n`);
    expect((await keyFor('STORED_KEY')).apiKey).toBe(STORED_ONLY);
  });

  it('the listing names what the file fills, never a value; a delete says the file still answers', async () => {
    const token = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf8')).adminToken as string;
    const asAdmin = { authorization: `Bearer ${token}` };
    const list = await client.get<Listing>('/admin/secrets', asAdmin);
    expect(list.status).toBe(200);
    expect(list.json.projectEnvFile).toEqual(['MISTRAL_API_KEY']);
    expect(list.json.secrets.find((s) => s.name === 'MISTRAL_API_KEY')?.alsoInProjectEnvFile).toBe(true);
    expect(list.json.secrets.find((s) => s.name === 'STORED_KEY')?.alsoInProjectEnvFile).toBe(false);
    expect(list.text).not.toContain(PASTED);

    const del = await client.del<{ stillResolvesFromProjectEnvFile?: boolean }>('/admin/secrets/MISTRAL_API_KEY', asAdmin);
    expect(del.status).toBe(200);
    expect(del.json.stillResolvesFromProjectEnvFile).toBe(true);
    expect((await keyFor('MISTRAL_API_KEY')).apiKey).toBe(PASTED);
  });

  it('a Log line carrying the pasted key is scrubbed', () => {
    const scrubber = new SecretValueScrubber(new SecretsStore(dataDir), projectDir);
    expect(scrubber.scrub(`calling with ${PASTED}`)).not.toContain(PASTED);
    // Control: the same scrubber with no project leaves it, so the line above is the .env door's doing.
    expect(new SecretValueScrubber(new SecretsStore(dataDir)).scrub(`calling with ${PASTED}`)).toContain(PASTED);
  });
});

describe('a backend started without a project reads no .env', () => {
  it('says so in the listing (null), so a caller can tell it from one that does', async () => {
    const dataDir = startable('http://127.0.0.1:9');
    const service = new BackendService({ dataDir, port: 0, backendId: 'noproject', backendName: 'No project' });
    try {
      const base = (await service.start()).listen.url;
      const token = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf8')).adminToken as string;
      const list = await httpClient(() => base).get<Listing>('/admin/secrets', { authorization: `Bearer ${token}` });
      expect(list.status).toBe(200);
      expect(list.json.projectEnvFile).toBeNull();
    } finally {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
