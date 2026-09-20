/**
 * PRD-005 — secrets are provisioned, never invented.
 *
 * The n8n failure this closes: a first start mints the key and writes it to a file, so a
 * container on an empty volume comes up healthy with a DIFFERENT key and locks the operator out
 * of everything under the old one. NodeGX has the same shape (`--token` or a mint; the signed-URL
 * secret minted on first use), and the fix is a stance a deploy can take: **secrets must be
 * provided; a start that cannot find one refuses and says which.**
 *
 * What is asserted, and why each half matters:
 *
 *  1. Under `requireSecrets`, an empty data dir with nothing in the environment REFUSES, the
 *     message names the secret, every place it looked, and the fix — and NOTHING WAS MINTED.
 *     A refusal that had already written a fresh secret would be the failure with extra steps.
 *  2. Supplied by `NODEGX_*` (or `_FILE`), it starts, the value IS the credential, it is reported
 *     as provisioned, and it is NOT written to `secrets.json` — the point of an environment-
 *     supplied secret is that it never lands in the volume.
 *  3. The default stance is unchanged: a laptop still mints, and says so.
 *  4. An existing `secrets.json` keeps working untouched, under either stance.
 *  5. `/admin/status` never returns a value. Sources only.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import {
  ADMIN_TOKEN_ENV,
  FILES_SIGNING_SECRET_ENV,
  READONLY_TOKEN_ENV,
  REQUIRE_SECRETS_ENV,
  readProvisionedSecret,
  requireSecretsFromEnv,
  SecretsStartupError
} from '../src/config/provisioned-secrets';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

const ENV_KEYS = [
  ADMIN_TOKEN_ENV,
  `${ADMIN_TOKEN_ENV}_FILE`,
  READONLY_TOKEN_ENV,
  `${READONLY_TOKEN_ENV}_FILE`,
  FILES_SIGNING_SECRET_ENV,
  `${FILES_SIGNING_SECRET_ENV}_FILE`,
  REQUIRE_SECRETS_ENV
];

/** Planted values. Long enough to be real, distinctive enough to grep for. */
const ADMIN = 'env_admin_token_5f1c9a_provisioned_do_not_leak';
const ADMIN_FROM_FILE = 'file_admin_token_8b2d3e_provisioned_do_not_leak';
const READONLY = 'env_readonly_token_2c7e41_provisioned_do_not_leak';
const SIGNING = 'env_signing_secret_9e0f6b_provisioned_do_not_leak';
const STALE = 'stale_admin_token_in_the_file_1a2b3c_do_not_leak';

interface Provenance {
  source: string;
  persisted: boolean;
}
interface AdminStatus {
  ok: boolean;
  secrets: {
    stance: 'provisioned' | 'generate';
    adminToken: Provenance;
    adminReadonlyToken: Provenance;
    filesSigningSecret: Provenance;
  };
}

describe('PRD-005 secrets are provisioned, never invented', () => {
  let dataDir: string;
  let service: BackendService | null;
  let base = '';
  const saved: Record<string, string | undefined> = {};
  const client = httpClient(() => base);
  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

  const secretsPath = () => path.join(dataDir, 'secrets.json');
  const onDisk = (): Record<string, unknown> =>
    fs.existsSync(secretsPath()) ? (JSON.parse(fs.readFileSync(secretsPath(), 'utf-8')) as Record<string, unknown>) : {};

  async function start(requireSecrets: boolean): Promise<BackendService> {
    service = new BackendService({ dataDir, port: 0, requireSecrets, backendId: 'prd005', backendName: 'PRD-005' });
    base = (await service.start()).listen.url;
    return service;
  }

  /** Start and expect a refusal. Returns the error so the message can be read. */
  async function refuses(requireSecrets: boolean): Promise<Error> {
    service = new BackendService({ dataDir, port: 0, requireSecrets, backendId: 'prd005', backendName: 'PRD-005' });
    let caught: unknown = null;
    try {
      await service.start();
    } catch (e) {
      caught = e;
    }
    // A partially-started service still holds the database; release it.
    await service.stop().catch(() => undefined);
    service = null;
    if (!(caught instanceof Error)) throw new Error('the service started when it should have refused');
    return caught;
  }

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd005-'));
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    service = null;
  });

  afterEach(async () => {
    if (service) await service.stop().catch(() => undefined);
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // 1. The refusal
  // ==========================================================================

  it('refuses to start under the production stance with nothing provisioned — names the secret, where it looked, and the fix — and mints nothing', async () => {
    const err = await refuses(true);
    expect(err).toBeInstanceOf(SecretsStartupError);
    expect((err as SecretsStartupError).code).toBe('SECRET_NOT_PROVISIONED');
    // The secret, by the name an operator sees in secrets.json.
    expect(err.message).toContain('adminToken');
    // Every place it looked.
    expect(err.message).toContain(`${ADMIN_TOKEN_ENV}_FILE`);
    expect(err.message).toContain(ADMIN_TOKEN_ENV);
    expect(err.message).toContain('--token');
    expect(err.message).toContain(secretsPath());
    // The fix — a command, not a link.
    expect(err.message).toMatch(/nodegx-backend serve/);
    expect(err.message).toContain('--require-secrets');
    // 🔴 Nothing was minted on the way to refusing. A refusal that had already written a fresh
    // credential would be the n8n failure with extra steps.
    expect(onDisk().adminToken).toBeUndefined();
  });

  it('refuses when only the admin credential is provisioned — the signed-URL secret is named too', async () => {
    process.env[ADMIN_TOKEN_ENV] = ADMIN;
    const err = await refuses(true);
    expect(err).toBeInstanceOf(SecretsStartupError);
    expect(err.message).toContain('files.signingSecret');
    expect(err.message).toContain(FILES_SIGNING_SECRET_ENV);
    expect(err.message).toContain(`${FILES_SIGNING_SECRET_ENV}_FILE`);
    // Not minted, and the environment-supplied admin token was not written either.
    const disk = onDisk();
    expect(disk.adminToken).toBeUndefined();
    expect((disk.files as Record<string, unknown> | undefined)?.signingSecret).toBeUndefined();
  });

  it('a _FILE that cannot be read is a refusal, not a mint — under either stance', async () => {
    process.env[`${ADMIN_TOKEN_ENV}_FILE`] = path.join(dataDir, 'does-not-exist');
    const err = await refuses(false);
    expect(err).toBeInstanceOf(SecretsStartupError);
    expect((err as SecretsStartupError).code).toBe('SECRET_FILE_UNREADABLE');
    expect(err.message).toContain(`${ADMIN_TOKEN_ENV}_FILE`);
    expect(onDisk().adminToken).toBeUndefined();
  });

  // ==========================================================================
  // 2. Provisioned from the environment
  // ==========================================================================

  it('starts under the production stance with both from the environment: the value IS the credential, reported as provisioned, persisted nowhere', async () => {
    process.env[ADMIN_TOKEN_ENV] = ADMIN;
    process.env[FILES_SIGNING_SECRET_ENV] = SIGNING;
    await start(true);

    // The credential works, and only it works.
    expect((await client.get('/admin/status')).status).toBe(401);
    expect((await client.get('/admin/status', bearer('not-the-token'))).status).toBe(401);
    const res = await client.get<AdminStatus>('/admin/status', bearer(ADMIN));
    expect(res.status).toBe(200);

    expect(res.json.secrets.stance).toBe('provisioned');
    expect(res.json.secrets.adminToken).toEqual({ source: 'env', persisted: false });
    expect(res.json.secrets.filesSigningSecret).toEqual({ source: 'env', persisted: false });
    expect(res.json.secrets.adminReadonlyToken.source).toBe('absent');

    // Never the values.
    expect(res.text).not.toContain(ADMIN);
    expect(res.text).not.toContain(SIGNING);

    // Not written to the file — the whole point of supplying it from the environment.
    const disk = onDisk();
    expect(disk.adminToken).toBeUndefined();
    expect((disk.files as Record<string, unknown> | undefined)?.signingSecret).toBeUndefined();
  });

  it('_FILE wins over the plain variable, strips the trailing newline, and reports env-file', async () => {
    const tokenFile = path.join(dataDir, 'admin_token');
    fs.writeFileSync(tokenFile, `${ADMIN_FROM_FILE}\n`); // `echo secret > file` adds one
    process.env[`${ADMIN_TOKEN_ENV}_FILE`] = tokenFile;
    process.env[ADMIN_TOKEN_ENV] = ADMIN; // present, and must lose
    process.env[FILES_SIGNING_SECRET_ENV] = SIGNING;
    await start(true);

    expect((await client.get('/admin/status', bearer(ADMIN))).status).toBe(401);
    const res = await client.get<AdminStatus>('/admin/status', bearer(ADMIN_FROM_FILE));
    expect(res.status).toBe(200);
    expect(res.json.secrets.adminToken).toEqual({ source: 'env-file', persisted: false });
    expect(res.text).not.toContain(ADMIN_FROM_FILE);
    expect(onDisk().adminToken).toBeUndefined();
  });

  it('the environment wins over a stale value in secrets.json, and does not rewrite the file', async () => {
    fs.writeFileSync(secretsPath(), JSON.stringify({ adminToken: STALE, webhooks: { trg_1: 'keep-me' } }, null, 2), {
      mode: 0o600
    });
    const before = fs.readFileSync(secretsPath(), 'utf-8');
    process.env[ADMIN_TOKEN_ENV] = ADMIN;
    await start(false);

    expect((await client.get('/admin/status', bearer(STALE))).status).toBe(401);
    const res = await client.get<AdminStatus>('/admin/status', bearer(ADMIN));
    expect(res.status).toBe(200);
    expect(res.json.secrets.adminToken).toEqual({ source: 'env', persisted: false });
    // The file is byte-for-byte what it was for the keys security owns; the signing secret was
    // minted into its own namespace (default stance), which is the pre-existing behaviour.
    const after = JSON.parse(fs.readFileSync(secretsPath(), 'utf-8')) as Record<string, unknown>;
    expect(after.adminToken).toBe(STALE);
    expect(after.webhooks).toEqual({ trg_1: 'keep-me' });
    expect(before).toContain(STALE);
  });

  it('the read-only credential can come from the environment too, and reads', async () => {
    process.env[ADMIN_TOKEN_ENV] = ADMIN;
    process.env[READONLY_TOKEN_ENV] = READONLY;
    await start(false);
    const res = await client.get<AdminStatus>('/admin/status', bearer(READONLY));
    expect(res.status).toBe(200);
    expect(res.json.secrets.adminReadonlyToken).toEqual({ source: 'env', persisted: false });
    expect(res.text).not.toContain(READONLY);
    expect(onDisk().adminReadonlyToken).toBeUndefined();
  });

  // ==========================================================================
  // 3. The default stance is unchanged
  // ==========================================================================

  it('default stance, empty data dir: mints as before — and says so, per secret', async () => {
    await start(false);
    const disk = onDisk();
    expect(typeof disk.adminToken).toBe('string');
    expect(typeof (disk.files as Record<string, string>).signingSecret).toBe('string');

    const res = await client.get<AdminStatus>('/admin/status', bearer(disk.adminToken as string));
    expect(res.status).toBe(200);
    expect(res.json.secrets.stance).toBe('generate');
    expect(res.json.secrets.adminToken).toEqual({ source: 'generated', persisted: true });
    expect(res.json.secrets.filesSigningSecret).toEqual({ source: 'generated', persisted: true });
    expect(res.text).not.toContain(disk.adminToken as string);
    expect(res.text).not.toContain((disk.files as Record<string, string>).signingSecret);
  });

  // ==========================================================================
  // 4. An existing deploy keeps working
  // ==========================================================================

  it('an existing secrets.json satisfies the production stance untouched, and reads as file', async () => {
    const existing = {
      adminToken: ADMIN_FROM_FILE,
      files: { signingSecret: SIGNING },
      webhooks: { trg_1: 'keep-me' }
    };
    fs.writeFileSync(secretsPath(), JSON.stringify(existing, null, 2), { mode: 0o600 });
    const before = fs.readFileSync(secretsPath(), 'utf-8');

    await start(true);
    const res = await client.get<AdminStatus>('/admin/status', bearer(ADMIN_FROM_FILE));
    expect(res.status).toBe(200);
    expect(res.json.secrets.stance).toBe('provisioned');
    expect(res.json.secrets.adminToken).toEqual({ source: 'file', persisted: true });
    expect(res.json.secrets.filesSigningSecret).toEqual({ source: 'file', persisted: true });
    expect(fs.readFileSync(secretsPath(), 'utf-8')).toBe(before);
  });

  // ==========================================================================
  // 5. The switch, and the reader
  // ==========================================================================

  it('NODEGX_REQUIRE_SECRETS is the same switch as the flag', () => {
    expect(requireSecretsFromEnv({})).toBe(false);
    expect(requireSecretsFromEnv({ [REQUIRE_SECRETS_ENV]: '0' })).toBe(false);
    expect(requireSecretsFromEnv({ [REQUIRE_SECRETS_ENV]: 'false' })).toBe(false);
    expect(requireSecretsFromEnv({ [REQUIRE_SECRETS_ENV]: '1' })).toBe(true);
    expect(requireSecretsFromEnv({ [REQUIRE_SECRETS_ENV]: 'true' })).toBe(true);
    expect(requireSecretsFromEnv({ [REQUIRE_SECRETS_ENV]: 'YES' })).toBe(true);
  });

  it('readProvisionedSecret: unset is null, empty is null, _FILE wins and is trimmed', () => {
    expect(readProvisionedSecret('X', {})).toBeNull();
    expect(readProvisionedSecret('X', { X: '' })).toBeNull();
    expect(readProvisionedSecret('X', { X: 'plain' })).toEqual({ value: 'plain', source: 'env', from: 'X' });
    const f = path.join(dataDir, 'x');
    fs.writeFileSync(f, 'from-file\r\n');
    expect(readProvisionedSecret('X', { X: 'plain', X_FILE: f })).toEqual({
      value: 'from-file',
      source: 'env-file',
      from: `X_FILE=${f}`
    });
    fs.writeFileSync(f, '\n');
    expect(() => readProvisionedSecret('X', { X_FILE: f })).toThrow(/empty/);
  });
});
