/**
 * BMG-011 §7 — a restore unpacks the archive's settings files over the data
 * dir, and the running backend re-reads them (the HTTP half, with a live
 * restore, is in `bmg-011-files-backups-ops.test.ts`). This is the REFUSAL
 * half: a settings file that does not validate must not take the backend down
 * mid-restore, must leave the live settings in force, and must not be left on
 * disk — the next start would refuse it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SecretsStore } from '../src/config/SecretsStore';
import { EmailConfigState } from '../src/email/EmailConfigState';
import { BackupConfigStore } from '../src/backup/config';
import { SecurityState } from '../src/security/state';
import { TriggerRegistry } from '../src/triggers/registry';
import { restoreRefusedSentence } from '../src/admin/app/views/backups';

let dataDir: string;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg011-settings-'));
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const file = (name: string) => path.join(dataDir, name);
const readJSON = (name: string) => JSON.parse(fs.readFileSync(file(name), 'utf-8'));

describe('BMG-011 §7 — restored settings files', () => {
  it('security.json: a valid restored file is live at once; an invalid one is refused, the live rules kept and written back', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const security = new SecurityState({ dataDir, loopback: true, cliToken: null, deployedFunctions: [], facade: {} as any });
    const held = security.config; // what every reader holds
    const restored = { ...readJSON('security.json'), collections: { Pet: { permissions: { find: 'public' } } } };
    fs.writeFileSync(file('security.json'), JSON.stringify(restored));
    security.reloadConfig();
    expect(held.collections.Pet.permissions?.find).toBe('public');

    fs.writeFileSync(file('security.json'), JSON.stringify({ version: 99, nonsense: true }));
    expect(() => security.reloadConfig()).toThrow(/security\.json is invalid/);
    expect(held.collections.Pet.permissions?.find).toBe('public');
    expect(readJSON('security.json').collections.Pet.permissions.find).toBe('public');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => new SecurityState({ dataDir, loopback: true, cliToken: null, deployedFunctions: [], facade: {} as any })).not.toThrow();
  });

  it('triggers.json: refused whole, live triggers kept and written back', () => {
    const registry = new TriggerRegistry(dataDir, new SecretsStore(dataDir));
    registry.upsert({ id: 'nightly', type: 'schedule', target: { kind: 'function', name: 'tidy' }, schedule: { cron: '0 3 * * *' } } as never);
    fs.writeFileSync(file('triggers.json'), JSON.stringify({ version: 1, triggers: [{ id: 'x', type: 'nope' }] }));
    expect(() => registry.reload()).toThrow(/invalid/);
    expect(registry.list().map((t) => t.id)).toEqual(['nightly']);
    expect(() => new TriggerRegistry(dataDir, new SecretsStore(dataDir))).not.toThrow();
  });

  it('email.json and backups.json: the same', () => {
    const email = new EmailConfigState(dataDir);
    email.save();
    const before = JSON.stringify(email.config);
    fs.writeFileSync(file('email.json'), '{ not json');
    expect(() => email.reload()).toThrow();
    expect(JSON.stringify(email.config)).toBe(before);
    expect(() => new EmailConfigState(dataDir)).not.toThrow();

    const backups = new BackupConfigStore(dataDir);
    fs.writeFileSync(file('backups.json'), '[]');
    expect(() => backups.reload()).toThrow(/must be a JSON object/);
    expect(() => new BackupConfigStore(dataDir)).not.toThrow();
  });

  it('the page says which were not taken up, and that the old settings stay', () => {
    expect(restoreRefusedSentence([{ file: 'security.json', reason: 'security.json is invalid: version must be 1.' }])).toBe(
      'The data is restored, but security.json was not taken up: security.json is invalid: version must be 1. The settings from before the restore stay in force.'
    );
    expect(restoreRefusedSentence([{ file: 'email.json', reason: 'x.' }, { file: 'triggers.json', reason: 'y.' }])).toMatch(/^The data is restored, but email\.json, triggers\.json were not taken up/);
  });
});
