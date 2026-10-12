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
import * as os from 'os';
import * as path from 'path';

import { ensureEnvPlaceholder, findEnvValue, readEnvSecret } from '../src/backend/envSecret';

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
