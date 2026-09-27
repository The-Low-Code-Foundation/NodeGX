/**
 * HLT-010's gate, on its first Linux run to get past launch (2026-09-22, run 35711441660), failed
 * on two UNKNOWN classes: a 401 from api.github.com and "[GitHub OAuth] Failed to load/verify
 * token", in a profile created seconds earlier that had never signed in.
 *
 * The cause: `jsonstorage.get` answers a missing file with the STRING '{}', which is truthy, and
 * where `safeStorage` has no encryption the loader handed that string back as the token.
 */
import * as fs from 'fs';
import * as path from 'path';

const MAIN = path.join(__dirname, '../../src/main');
const { storedTokenOrNull } = require(path.join(MAIN, 'src/github-stored-token.js'));

describe('HLT-010 — a profile that never signed in to GitHub has no GitHub token', () => {
  it('CONTROL: jsonstorage still answers a missing file with the string "{}"', () => {
    // The premise. If this goes red, jsonstorage changed and the guard below may be moot.
    const src = fs.readFileSync(path.join(__dirname, '../../src/shared/utils/jsonstorage.js'), 'utf8');
    expect(src).toMatch(/error\.code === 'ENOENT'\)\s*\{\s*return callback\(JSON\.stringify\(\{\}\)\)/);
  });

  it('the missing-file answer is not a token', () => {
    expect(storedTokenOrNull(JSON.stringify({}))).toBeNull();
  });

  it('nor is what github-clear-token writes, a failed read, or an empty string', () => {
    expect(storedTokenOrNull(null)).toBeNull();
    expect(storedTokenOrNull(undefined)).toBeNull();
    expect(storedTokenOrNull('')).toBeNull();
    expect(storedTokenOrNull({})).toBeNull();
  });

  it('a stored token, encrypted or plain, still comes back unchanged', () => {
    expect(storedTokenOrNull('djEwAAAA3q2+7w==')).toBe('djEwAAAA3q2+7w==');
    expect(storedTokenOrNull('gho_16C7e42F292c6912E7710c838347Ae178B4a')).toBe('gho_16C7e42F292c6912E7710c838347Ae178B4a');
  });

  it('the github-load-token handler passes what it read through the guard before anything else', () => {
    const main = fs.readFileSync(path.join(MAIN, 'main.js'), 'utf8');
    const handler = main.slice(main.indexOf("ipcMain.handle('github-load-token'"), main.indexOf("ipcMain.handle('github-clear-token'"));
    expect(handler.length).toBeGreaterThan(0);
    const guarded = handler.indexOf('storedTokenOrNull(');
    expect(guarded).toBeGreaterThan(-1);
    expect(guarded).toBeLessThan(handler.indexOf('safeStorage.isEncryptionAvailable()'));
  });
});
