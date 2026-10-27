/**
 * P112-S14-PERSONKEY — the person pastes their key into the project's `.env`; `set_function_secret` (no `value`)
 * sends it from there to the backend. The value must never appear in what the agent is shown.
 *
 * Richard's ruling, 2026-10-12: no terminal commands for people who aren't technical, and no key in the chat.
 *
 * The end-to-end half (a real backend) is in `provision.test.ts`'s real-backend block, so it never races another
 * suite's backend for port 8578 in a parallel worker.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { ensureEnvPlaceholder, findEnvValue, readEnvSecret } from '../src/backend/envSecret';
import { secretsEnv } from '../src/tools/deployToVm';
import { callRawText, connect, copyFixture, reveal, TestSession } from './helpers';

describe('reading a .env the way a person writes it', () => {
  it.each([
    ['GEMINI_API_KEY=abc123', 'abc123'],
    ['GEMINI_API_KEY = abc123  ', 'abc123'],
    ['GEMINI_API_KEY="abc 123"', 'abc 123'],
    ["GEMINI_API_KEY='abc123'", 'abc123'],
    ['export GEMINI_API_KEY=abc123', 'abc123'],
    ['# GEMINI_API_KEY=commented\nGEMINI_API_KEY=real', 'real'],
    ['OTHER=x\r\nGEMINI_API_KEY=crlf\r\n', 'crlf'],
    ['GEMINI_API_KEY=', '']
  ])('%j → %j', (text, expected) => {
    expect(findEnvValue(text, 'GEMINI_API_KEY')).toBe(expected);
  });

  it('a name that is only a prefix of another does not match', () => {
    expect(findEnvValue('GEMINI_API_KEY_OLD=x', 'GEMINI_API_KEY')).toBeUndefined();
  });
});

describe('the placeholder', () => {
  let dir: string;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own015-env-'))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('creates .env with a line to fill and a plain-words header, and git ignores it', () => {
    const { file, added } = ensureEnvPlaceholder(dir, 'GEMINI_API_KEY');
    expect(added).toBe(true);
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toMatch(/^# .*paste each key right after its = sign/i);
    expect(text.endsWith('GEMINI_API_KEY=\n')).toBe(true);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').split('\n')).toContain('.env');
    expect(readEnvSecret(dir, 'GEMINI_API_KEY').state).toBe('empty');
  });

  it('never touches a line the person already filled, and appends a second name to an existing file', () => {
    fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=pasted');
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/');
    expect(ensureEnvPlaceholder(dir, 'GEMINI_API_KEY').added).toBe(false);
    expect(ensureEnvPlaceholder(dir, 'STRIPE_KEY').added).toBe(true);
    expect(fs.readFileSync(path.join(dir, '.env'), 'utf8')).toBe('GEMINI_API_KEY=pasted\nSTRIPE_KEY=\n');
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toBe('node_modules/\n.env\n');
    // Idempotent: a second call adds nothing anywhere.
    ensureEnvPlaceholder(dir, 'STRIPE_KEY');
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toBe('node_modules/\n.env\n');
  });
});

describe('P112-OWN023-KEYNEEDSAGENT: deploy_to_vm sends what this computer answers with', () => {
  let dir: string;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own023-deploy-env-'))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('a key only in .env travels, a filled line wins over a stored copy, an empty line ships nothing', () => {
    const secretsFile = path.join(dir, 'secrets.json');
    fs.writeFileSync(secretsFile, JSON.stringify({ adminToken: 'not-a-function-secret', functions: { STRIPE_KEY: 'stored-old', KEPT: 'stored-kept' } }));
    const projectDir = path.join(dir, 'app');
    fs.mkdirSync(projectDir);
    fs.writeFileSync(path.join(projectDir, '.env'), 'STRIPE_KEY=pasted-new\nMISTRAL_API_KEY=only-in-env\nEMPTY_ONE=\n');

    const sent = secretsEnv(secretsFile, projectDir);
    expect(sent.names.sort()).toEqual(['KEPT', 'MISTRAL_API_KEY', 'STRIPE_KEY']);
    expect(sent.text).toContain('NODEGX_SECRET_STRIPE_KEY=pasted-new\n');
    expect(sent.text).toContain('NODEGX_SECRET_MISTRAL_API_KEY=only-in-env\n');
    expect(sent.text).toContain('NODEGX_SECRET_KEPT=stored-kept\n');
    expect(sent.text).not.toContain('stored-old');
    expect(sent.text).not.toContain('EMPTY_ONE');
    expect(sent.text).not.toContain('adminToken');
    // No local backend at all: the .env still travels.
    expect(secretsEnv(undefined, projectDir).names.sort()).toEqual(['MISTRAL_API_KEY', 'STRIPE_KEY']);
    // Control: without the project, the store alone (what shipped before).
    expect(secretsEnv(secretsFile).text).toContain('NODEGX_SECRET_STRIPE_KEY=stored-old\n');
  });
});

describe('P112-OWN023-KEYNEEDSAGENT: a backend that does not read .env still gets the key sent', () => {
  // An older backend (or one started without the project): its listing has no `projectEnvFile`. The old words and
  // the old copy, so the key still arrives; only a backend that says it reads the file is spared the copy.
  let server: http.Server;
  let root: string;
  let session: TestSession;
  const puts: Array<{ url: string; body: string }> = [];
  const previousRoot = process.env.NODEGX_BACKENDS_DIR;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        if (req.url === '/health') return res.end('{"ok":true}');
        if (req.method === 'GET' && req.url === '/admin/secrets') return res.end('{"namespace":"functions","secrets":[],"environment":[]}');
        if (req.method === 'PUT') {
          puts.push({ url: String(req.url), body });
          return res.end('{"success":true,"created":true}');
        }
        res.statusCode = 404;
        res.end('{}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'own023-old-backend-'));
    fs.mkdirSync(path.join(root, 'old'));
    fs.writeFileSync(path.join(root, 'old', 'config.json'), JSON.stringify({ id: 'old', name: 'Old', port: (server.address() as { port: number }).port }));
    process.env.NODEGX_BACKENDS_DIR = root;
    session = await connect(copyFixture(), true);
    await reveal(session, 'backend');
  });

  afterAll(async () => {
    await session.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousRoot === undefined) delete process.env.NODEGX_BACKENDS_DIR;
    else process.env.NODEGX_BACKENDS_DIR = previousRoot;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(session.projectDir, { recursive: true, force: true });
  });

  it('asks the person to say when it is done, then sends the key from the file', async () => {
    const ask = JSON.parse(await callRawText(session, 'set_function_secret', { name: 'MISTRAL_API_KEY' }));
    expect(ask.tellThePerson).toContain('tell me you are done');
    expect(ask.next).toContain('call set_function_secret { name: "MISTRAL_API_KEY" } again');

    fs.writeFileSync(path.join(session.projectDir, '.env'), 'MISTRAL_API_KEY=old-backend-key\n');
    const sentText = await callRawText(session, 'set_function_secret', { name: 'MISTRAL_API_KEY' });
    expect(JSON.parse(sentText)).toMatchObject({ set: true, characters: 'old-backend-key'.length });
    expect(sentText).not.toContain('old-backend-key');
    expect(puts).toEqual([{ url: '/admin/secrets/MISTRAL_API_KEY', body: JSON.stringify({ value: 'old-backend-key' }) }]);
  });
});
