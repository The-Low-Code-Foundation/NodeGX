/**
 * P127 BKO-001 — the workflows and triggers a project carries to its backend.
 *
 * Before this, an agent's reminder lived in one backend's data dir only
 * (P127-BKO001-BACKENDONLY). The file `nodegx.automations.json` is the
 * project's copy, and a backend with none is seeded from it at start.
 *
 * **1. The file's validator**: the backend's own rules, plus two of its own
 * (every entry has an id; no secret in a project file).
 * **2. Seeding, as a unit**: through the registries' upserts, so a webhook is
 * minted a secret; never into a backend that has its own (and the difference
 * is said); all or nothing.
 * **3. Through a started service**: the ordering claim (seeded before the
 * scheduler) is only visible on a real start, and a restart changes nothing.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  automationsFromBackend,
  describeProjectAutomationsOutcome,
  diffAutomations,
  PROJECT_AUTOMATIONS_FILE,
  ProjectAutomations,
  ProjectAutomationsError,
  readProjectAutomations,
  seedProjectAutomations,
  validateProjectAutomations
} from '../src/automations/projectAutomations';
import { SecretsStore, WEBHOOK_SECRETS_NAMESPACE } from '../src/config/SecretsStore';
import { BackendService } from '../src/service';
import { TriggerRegistry } from '../src/triggers/registry';
import { WorkflowRegistry } from '../src/workflow/WorkflowRegistry';

const made: string[] = [];
afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `p127-${prefix}-`));
  made.push(d);
  return d;
}

const DAILY = {
  id: 'daily-reminders',
  type: 'schedule' as const,
  name: 'Every day at 9',
  target: { kind: 'function' as const, name: 'sendReminders' },
  schedule: { cron: '0 9 * * *' }
};
const ON_TASK = {
  id: 'on-task',
  type: 'db-change' as const,
  target: { kind: 'workflow' as const, name: 'tidy-up' },
  dbChange: { collection: 'Task', actions: ['create' as const] }
};
const HOOK = {
  id: 'from-shop',
  type: 'webhook' as const,
  target: { kind: 'function' as const, name: 'orderPaid' },
  webhook: { slug: 'order-paid' }
};
const TIDY = {
  id: 'tidy-up',
  name: 'Tidy up',
  entry: 'a',
  steps: [
    { id: 'a', kind: 'call-function', ref: 'archiveDone', next: 'b' },
    { id: 'b', kind: 'call-function', ref: 'countLeft' }
  ]
};
const FILE: ProjectAutomations = { version: 1, workflows: [TIDY], triggers: [DAILY, ON_TASK, HOOK] } as ProjectAutomations;

function project(content: unknown, label: string): string {
  const dir = tmp(`${label}-project`);
  fs.writeFileSync(path.join(dir, PROJECT_AUTOMATIONS_FILE), JSON.stringify(content, null, 2));
  return dir;
}
function registries(label: string) {
  const dataDir = tmp(`${label}-data`);
  const secrets = new SecretsStore(dataDir);
  return { dataDir, secrets, workflows: new WorkflowRegistry(dataDir), triggers: new TriggerRegistry(dataDir, secrets) };
}

// ============================================================================

describe('BKO-001 — the file is checked with the backend’s own rules', () => {
  it('accepts a valid file (the known-firing control for the refusals below)', () => {
    expect(validateProjectAutomations(FILE)).toEqual([]);
  });

  it('refuses a secret in a project file', () => {
    const errors = validateProjectAutomations({ ...FILE, triggers: [{ ...HOOK, secret: 'whsec_x' }] });
    expect(errors.join('\n')).toMatch(/trigger "from-shop": holds a secret/);
  });

  it('refuses an entry without an id: a backend made from the file must keep the same one', () => {
    const { id: _id, ...noId } = DAILY;
    expect(validateProjectAutomations({ ...FILE, triggers: [noId] }).join('\n')).toMatch(/a trigger: needs an id/);
  });

  it('refuses what the backend refuses: a key it does not know, a workflow with a dangling edge', () => {
    const errors = validateProjectAutomations({
      version: 1,
      workflows: [{ ...TIDY, steps: [{ id: 'a', kind: 'call-function', ref: 'x', next: 'nowhere' }] }],
      triggers: [{ ...DAILY, colour: 'red' }]
    }).join('\n');
    expect(errors).toMatch(/workflow "tidy-up":/);
    expect(errors).toMatch(/trigger "daily-reminders": unknown key "colour"/);
  });

  it('refuses duplicate ids and duplicate webhook slugs', () => {
    const errors = validateProjectAutomations({
      version: 1,
      workflows: [],
      triggers: [HOOK, { ...HOOK, id: 'again' }, DAILY, DAILY]
    }).join('\n');
    expect(errors).toMatch(/duplicate webhook slug "order-paid"/);
    expect(errors).toMatch(/duplicate trigger id "daily-reminders"/);
  });

  it('reads nothing when there is no file, and throws on a file that is not JSON', () => {
    expect(readProjectAutomations(tmp('none'))).toBeNull();
    const dir = tmp('broken');
    fs.writeFileSync(path.join(dir, PROJECT_AUTOMATIONS_FILE), '{ nope');
    expect(() => readProjectAutomations(dir)).toThrow(ProjectAutomationsError);
  });
});

describe('BKO-001 — seeding a backend from the project', () => {
  it('loads every workflow and trigger into a backend that has none, minting the webhook a secret', () => {
    const r = registries('seed');
    const outcome = seedProjectAutomations({ projectDir: project(FILE, 'seed'), ...r });
    expect(outcome).toMatchObject({
      status: 'applied',
      workflows: ['tidy-up'],
      triggers: ['daily-reminders', 'on-task', 'from-shop'],
      mintedWebhooks: ['from-shop'],
      needsSenderKey: []
    });
    expect(r.workflows.get('tidy-up')).toMatchObject({ entry: 'a', concurrency: 1 });
    expect(r.triggers.get('daily-reminders')).toMatchObject({ enabled: true, schedule: { cron: '0 9 * * *' } });
    expect(r.secrets.get(WEBHOOK_SECRETS_NAMESPACE, 'from-shop')).toMatch(/^whsec_/);
    // The secret reaches the log as a sentence about the sender, never as a value.
    const said = describeProjectAutomationsOutcome(outcome)!;
    expect(said).toMatch(/"from-shop" got a new secret/);
    expect(said).not.toContain(r.secrets.get(WEBHOOK_SECRETS_NAMESPACE, 'from-shop')!);
  });

  it('after seeding, the backend reads back as the file: no difference', () => {
    const r = registries('roundtrip');
    seedProjectAutomations({ projectDir: project(FILE, 'roundtrip'), ...r });
    const backend = automationsFromBackend(r.workflows.list(), r.triggers.list());
    expect(diffAutomations(FILE, backend)).toEqual([]);
    // Run state never reaches the project's shape.
    expect(JSON.stringify(backend)).not.toMatch(/createdAt|updatedAt|lastFiredAt|fireCount/);
  });

  it('leaves out an hmac-sha512 (Paystack) hook and names it: its secret is the sender’s key', () => {
    const r = registries('paystack');
    const paystack = { ...HOOK, id: 'paystack', webhook: { slug: 'paystack', scheme: 'hmac-sha512' as const } };
    const outcome = seedProjectAutomations({ projectDir: project({ version: 1, workflows: [], triggers: [paystack] }, 'paystack'), ...r });
    expect(outcome).toMatchObject({ status: 'applied', triggers: [], needsSenderKey: ['paystack'] });
    expect(describeProjectAutomationsOutcome(outcome)).toMatch(/"paystack" were NOT loaded/);
  });

  it('🔴 never writes into a backend that has its own, and says how the two differ', () => {
    const r = registries('own');
    r.triggers.upsert({ ...DAILY, schedule: { cron: '0 10 * * *' } });
    r.triggers.upsert({ id: 'hand-made', type: 'schedule', target: { kind: 'function', name: 'x' }, schedule: { cron: '* * * * *' } });
    const outcome = seedProjectAutomations({ projectDir: project(FILE, 'own'), ...r });
    expect(outcome.status).toBe('backend-has-its-own');
    expect(r.workflows.list()).toEqual([]);
    expect(r.triggers.get('daily-reminders')!.schedule!.cron).toBe('0 10 * * *');
    const differences = (outcome as { differences: string[] }).differences;
    expect(differences).toEqual(
      expect.arrayContaining([
        'trigger "daily-reminders" differs between the project and the backend',
        'trigger "hand-made" is on the backend, not in the project',
        'workflow "tidy-up" is in the project, not on the backend'
      ])
    );
    expect(describeProjectAutomationsOutcome(outcome)).toMatch(/never overwritten/);
  });

  it('…and is silent when the backend’s own are the project’s', () => {
    const r = registries('same');
    seedProjectAutomations({ projectDir: project(FILE, 'same-a'), ...r });
    const again = seedProjectAutomations({ projectDir: project(FILE, 'same-b'), ...r });
    expect(again).toMatchObject({ status: 'backend-has-its-own', differences: [] });
    expect(describeProjectAutomationsOutcome(again)).toBeNull();
  });

  it('names a bad schedule before a start: the cron is checked on the trigger the backend would store', () => {
    const errors = validateProjectAutomations({ ...FILE, triggers: [{ ...DAILY, schedule: { cron: 'every tuesday' } }] });
    expect(errors.join('\n')).toMatch(/trigger "daily-reminders":.*cron/i);
  });

  it('is all or nothing: a refusal part-way removes what was added and throws', () => {
    const r = registries('allornothing');
    const real = r.triggers.upsert.bind(r.triggers);
    let calls = 0;
    jest.spyOn(r.triggers, 'upsert').mockImplementation((input) => {
      if (++calls === 2) throw new Error('refused for the test');
      return real(input);
    });
    expect(() => seedProjectAutomations({ projectDir: project(FILE, 'allornothing'), ...r })).toThrow(
      /could not be loaded into this backend, so none of it was: refused for the test/
    );
    expect(r.workflows.list()).toEqual([]);
    expect(r.triggers.list()).toEqual([]);
  });
});

describe('BKO-001 — a service started for a project', () => {
  async function start(projectDir: string | null, dataDir: string, label: string) {
    const svc = new BackendService({
      dataDir,
      port: 0,
      backendId: `p127-${label}`,
      backendName: label,
      ...(projectDir ? { projectDir } : {})
    });
    await svc.start();
    return svc;
  }
  const onDisk = (dataDir: string) => ({
    triggers: JSON.parse(fs.readFileSync(path.join(dataDir, 'triggers.json'), 'utf-8')).triggers.map((t: { id: string }) => t.id).sort(),
    workflows: fs.readdirSync(path.join(dataDir, 'workflow-defs')).sort()
  });

  it('🔴 a first start runs the project’s workflows and triggers, and a restart changes nothing', async () => {
    const projectDir = project(FILE, 'service');
    const dataDir = tmp('service-data');
    const first = await start(projectDir, dataDir, 'service');
    await first.stop();
    // (each start is stopped before any expectation, so a red reading here never leaves a port open)
    const seeded = onDisk(dataDir);
    expect(seeded).toEqual({
      triggers: ['daily-reminders', 'from-shop', 'on-task'],
      workflows: ['tidy-up.workflow-def.json']
    });
    const secretBefore = new SecretsStore(dataDir).get(WEBHOOK_SECRETS_NAMESPACE, 'from-shop');

    const second = await start(projectDir, dataDir, 'service');
    await second.stop();
    expect(onDisk(dataDir)).toEqual(seeded);
    // A restart is not a re-seed: the sender's secret still works.
    expect(new SecretsStore(dataDir).get(WEBHOOK_SECRETS_NAMESPACE, 'from-shop')).toBe(secretBefore);
  });

  it('starts with none when no project is supplied (the control)', async () => {
    const dataDir = tmp('control-data');
    const svc = await start(null, dataDir, 'control');
    await svc.stop();
    expect(fs.existsSync(path.join(dataDir, 'workflow-defs')) ? fs.readdirSync(path.join(dataDir, 'workflow-defs')) : []).toEqual([]);
  });

  it('refuses to start on an invalid project file rather than running without it', async () => {
    const projectDir = project({ version: 1, triggers: [{ ...HOOK, secret: 'x' }] }, 'invalid');
    const svc = new BackendService({ dataDir: tmp('invalid-data'), port: 0, backendId: 'p127-invalid', backendName: 'x', projectDir });
    try {
      await expect(svc.start()).rejects.toBeInstanceOf(ProjectAutomationsError);
    } finally {
      // A start that wrongly succeeds must still be stopped, or jest waits on its port forever.
      await svc.stop().catch(() => undefined);
    }
  });
});
