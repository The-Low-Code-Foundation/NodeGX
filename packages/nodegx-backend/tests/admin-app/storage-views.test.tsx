/**
 * BMG-011 — the Storage, Backups, Secrets, Search, Server and Activity pages
 * under jsdom, over a stubbed backend.
 *
 * AC1: the browser lists what the route answers, names the record a file is
 * used by, and a refused delete offers to clear the fields. AC2: ticking a
 * category sends its documented types; a custom chip appends. AC3: the
 * presets editor sends `thumbnails.presets`. AC4: both schedules are the
 * builder. AC5: the restore dialog waits for the backend's typed name with
 * *back up first* ticked, and blocks the page while it runs. AC6: a secret's
 * value field is a password field; the name rule is inline. AC8: the CORS
 * card sends `['*']` or the sites; an origin without a scheme is refused
 * inline. AC9: no comma-separated or cron text field on any of the six pages.
 */
import { mount, unmount, change, click, press, settle, q, qa, text, typeInto } from './dom';

import { session } from '../../src/admin/app/api';
import { ModalHost } from '../../src/admin/app/ui/modal';
import { FILE_KINDS, denyListFrom, kindsFrom, mimeProblem } from '../../src/admin/app/fileKinds';
import { canSaveSecret, describeDeleteOutcome, envNameForSecret, secretNameProblem } from '../../src/admin/app/secretsModel';
import { actionWords, activityQuery, actorWords, targetWords } from '../../src/admin/app/activity';
import { FilesView, presetsFrom, presetsProblem, sweepWords } from '../../src/admin/app/views/files';
import { BackupsView, keepWords } from '../../src/admin/app/views/backups';
import { SecretsView } from '../../src/admin/app/views/secrets';
import { SearchView, textFields } from '../../src/admin/app/views/search';
import { ServerView, listsProblem, proxyProblem } from '../../src/admin/app/views/server';
import { AuditView } from '../../src/admin/app/views/audit';
import { NAV } from '../../src/admin/app/nav';
import { VIEWS } from '../../src/admin/app/views';

// ------------------------------------------------------------ the backend --

interface Call {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}
const calls: Call[] = [];
const answer = (status: number, json: unknown) => Promise.resolve(new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));

const PNG_NAME = 'a1b2c3d4e5f60718_paws.png';
const TXT_NAME = 'ffeeddccbbaa9988_note.txt';
let filesConfig: Record<string, unknown> = {
  maxUploadBytes: 25 * 1024 * 1024,
  contentTypes: { allowList: null, denyList: ['text/html', 'text/css', 'text/javascript'] },
  signedUrlTtlSeconds: 300,
  thumbnails: { presets: { sm: { width: 64, height: 64, fit: 'cover' }, md: { width: 256, height: 256, fit: 'cover' }, lg: { width: 1024, height: 1024, fit: 'contain' } } },
  orphanSweep: { enabled: true, cron: '0 3 * * *' },
  sweepStatus: { lastReport: null, nextRunAt: null }
};
let deleteAnswers: Array<{ status: number; json: unknown }> = [];
let restoreResolve: (() => void) | null = null;

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = (init && init.method) || 'GET';
  const body = init && init.body && typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
  calls.push({ method, url, body });
  const u = new URL(url, 'http://127.0.0.1');
  const p = u.pathname;
  if (p === '/admin/files/config') {
    if (method === 'PUT' && body) {
      filesConfig = { ...filesConfig, ...body, contentTypes: { ...(filesConfig.contentTypes as object), ...((body.contentTypes as object) || {}) } };
    }
    return answer(200, { config: filesConfig, driverKind: 'local', transformsAvailable: true });
  }
  if (p === '/admin/files') {
    return answer(200, {
      count: 2,
      files: [
        { name: TXT_NAME, originalName: 'note.txt', size: 34, contentType: 'text/plain', createdAt: '2026-09-25T10:00:00.000Z', owner: null, private: false, objectId: 'f2' },
        { name: PNG_NAME, originalName: 'paws.png', size: 2048, contentType: 'image/png', createdAt: '2026-09-25T09:00:00.000Z', owner: null, private: false, objectId: 'f1' }
      ]
    });
  }
  if (p === '/admin/files/uses') return answer(200, { uses: { [TXT_NAME]: [], [PNG_NAME]: [{ collection: 'Pet', objectId: 'pet-1', field: 'photo' }] } });
  if (/^\/files\/[^/]+\/sign$/.test(p)) return answer(200, { url: 'http://127.0.0.1:8697' + p.replace(/\/sign$/, '') + '?exp=1&sig=abc' });
  if (/^\/admin\/files\/[^/]+$/.test(p) && method === 'DELETE') {
    const next = deleteAnswers.shift() || { status: 200, json: { success: true, existed: true, cleared: [] } };
    return answer(next.status, next.json);
  }
  if (p === '/admin/triggers/preview') return answer(200, { valid: true, error: null, words: 'Every day at 03:00', next: ['2026-09-26T03:00:00.000Z'], from: 'now', timezone: 'UTC' });
  if (p === '/admin/backups') {
    return answer(200, {
      config: {
        schedule: null,
        retention: { keepLast: 7, keepDaily: 0, keepWeekly: 0 },
        destination: { type: 'local', path: '/data/backups' },
        includeSecrets: false,
        status: { lastRunAt: null, lastResult: null, nextRunAt: null, lastSuccessAt: '2026-09-25T02:00:00.000Z' }
      },
      backups: [{ file: 'backup-2026-09-25T02-00-00.tar', path: '/data/backups/backup-2026-09-25T02-00-00.tar', bytes: 4096, createdAt: '2026-09-25T02:00:00.000Z' }]
    });
  }
  if (p === '/admin/backups/config') return answer(200, { config: {} });
  if (p === '/admin/backups/restore') {
    return new Promise((resolve) => {
      restoreResolve = () => resolve(new Response(JSON.stringify({ ok: true, reconnected: true, safetyArchive: '/data/backups/pre-restore-1.tar' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    });
  }
  if (p === '/admin/secrets') return answer(200, { namespace: 'functions', secrets: [{ name: 'STRIPE_KEY', envName: 'NODEGX_SECRET_STRIPE_KEY', alsoInEnvironment: false }], environment: ['NODEGX_SECRET_MAILGUN'], readable: false, envPrefix: 'NODEGX_SECRET_' });
  if (/^\/admin\/secrets\/[^/]+$/.test(p)) return answer(method === 'PUT' ? 201 : 200, { success: true, name: decodeURIComponent(p.split('/').pop() || ''), created: true, existed: true, stillResolvesFromEnvironment: false, envName: 'X' });
  if (p === '/admin/search') return answer(200, { config: { collections: { Pet: { enabled: true, fields: ['bio'] } } }, fts5Available: true });
  if (p === '/admin/schema') return answer(200, { tables: [{ name: 'Pet', columns: [{ name: 'objectId', type: 'String' }, { name: 'name', type: 'String' }, { name: 'bio', type: 'String' }, { name: 'age', type: 'Number' }, { name: 'ACL', type: 'ACL' }] }, { name: '_User', columns: [] }] });
  if (/^\/admin\/search\/collections\//.test(p)) return answer(200, { success: true, collection: 'Pet', rebuild: { tableName: 'Pet', fields: ['bio'], tokenizer: 'unicode61', rowsIndexed: 3, elapsedMs: 2 } });
  if (p === '/admin/ops') {
    return answer(200, {
      config: {
        logging: { level: 'info', format: 'auto', requests: true },
        rateLimit: { enabled: true, trustedProxies: ['loopback'], policies: { auth: { ratePerMinute: 60, burst: 30 }, admin: { ratePerMinute: 300, burst: 100 }, data: { ratePerMinute: 1200, burst: 400 }, files: { ratePerMinute: 300, burst: 100 }, hooks: { ratePerMinute: 300, burst: 150 }, functions: { ratePerMinute: 600, burst: 200 }, realtime: { ratePerMinute: 0, burst: 0 }, public: { ratePerMinute: 600, burst: 200 } }, realtimeMaxConnections: 500, functionRunQueries: 1000 },
        cors: { origins: ['*'], credentials: false },
        audit: { enabled: true, retentionDays: 90 },
        executions: { retentionDays: 30, idempotencyTtlHours: 24, maxCount: 10000, maxValueBytes: 51200, maxRunBytes: 8388608 },
        queries: { defaultLimit: 1000, maxLimit: 10000 },
        metrics: { enabled: true, allowLoopback: true }
      }
    });
  }
  if (p === '/admin/audit') {
    return answer(200, {
      enabled: true,
      retentionDays: 90,
      count: 2,
      actions: ['permissions.collection.update', 'role.update', 'file.delete'],
      entries: [
        { objectId: 'a1', at: 1758790000000, action: 'permissions.collection.update', actorKind: 'admin', actor: '', route: 'admin/permissions/collections/:name', target: { name: 'Pets' }, outcome: 'success', detail: { changed: ['find'] }, ip: '127.0.0.1' },
        { objectId: 'a2', at: 1758790001000, action: 'role.update', actorKind: 'apiKey', actor: 'deploy', route: 'admin/roles/:name', target: { name: 'editors' }, outcome: 'failure', detail: {}, status: 400 }
      ]
    });
  }
  if (/^\/admin\/users\//.test(p)) return answer(404, { error: 'no' });
  return answer(404, { error: 'unstubbed ' + method + ' ' + p });
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as typeof fetch;
  session.set({ ...session.get(), whoami: { backend: { id: 'b', name: 'Puppy backend', host: '127.0.0.1', port: 8697 } } as never });
});
afterAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});
const freshFilesConfig = () => ({
  maxUploadBytes: 25 * 1024 * 1024,
  contentTypes: { allowList: null, denyList: ['text/html', 'text/css', 'text/javascript'] },
  signedUrlTtlSeconds: 300,
  thumbnails: { presets: { sm: { width: 64, height: 64, fit: 'cover' }, md: { width: 256, height: 256, fit: 'cover' }, lg: { width: 1024, height: 1024, fit: 'contain' } } },
  orphanSweep: { enabled: true, cron: '0 3 * * *' },
  sweepStatus: { lastReport: null, nextRunAt: null }
});
beforeEach(() => {
  calls.length = 0;
  deleteAnswers = [];
  filesConfig = freshFilesConfig();
});

const sent = (method: string, re: RegExp) => calls.filter((c) => c.method === method && re.test(c.url));

// ---------------------------------------------------------------- pure --

describe('BMG-011 pure rules', () => {
  it('the kinds table: a tick is its documented list, a custom type appends, and a hand-written list round-trips', () => {
    const web = FILE_KINDS.find((k) => k.id === 'web')!;
    expect(denyListFrom({ categories: ['web'], custom: [] })).toEqual(web.types);
    expect(denyListFrom({ categories: ['web'], custom: ['application/x-msdownload', 'TEXT/HTML'] })).toEqual([...web.types, 'application/x-msdownload']);
    expect(kindsFrom(['image/png'])).toEqual({ categories: [], custom: ['image/png'] });
    expect(mimeProblem('png')).toContain('image/png');
    expect(mimeProblem('image/png')).toBeNull();
  });

  it('presets: a name goes in a URL, sizes are whole pixels, names are unique', () => {
    expect(presetsProblem([{ name: 'sm', width: '64', height: '64', fit: 'cover' }])).toBeNull();
    expect(presetsProblem([{ name: '', width: '64', height: '64', fit: 'cover' }])).toBe('Every preset needs a name.');
    expect(presetsProblem([{ name: 'a b', width: '64', height: '64', fit: 'cover' }])).toContain('?thumb=');
    expect(presetsProblem([{ name: 'sm', width: '64', height: '64', fit: 'cover' }, { name: 'sm', width: '1', height: '1', fit: 'cover' }])).toContain('Two presets');
    expect(presetsProblem([{ name: 'sm', width: '64.5', height: '64', fit: 'cover' }])).toContain('whole');
    expect(presetsFrom([{ name: ' sm ', width: '64', height: '48', fit: 'contain' }])).toEqual({ sm: { width: 64, height: 48, fit: 'contain' } });
  });

  it('keep, in words', () => {
    expect(keepWords({ keepLast: 7 })).toBe('Keeps the last 7.');
    expect(keepWords({ keepLast: 3, keepDaily: 2, keepWeekly: 1 })).toBe('Keeps the last 3, and one a day for 2 days, and one a week for 1 week.');
    expect(keepWords({})).toContain('Nothing is kept');
  });

  it('secrets: the server’s name rule, the env name, what a delete says', () => {
    expect(secretNameProblem('')).toBeNull();
    expect(secretNameProblem('STRIPE_KEY')).toBeNull();
    expect(secretNameProblem('not a name')).toContain('letters, digits');
    expect(envNameForSecret('stripe.key')).toBe('NODEGX_SECRET_STRIPE_KEY');
    expect(canSaveSecret({ name: 'A', value: '', busy: false })).toBe(false);
    expect(canSaveSecret({ name: 'A', value: 'x', busy: false })).toBe(true);
    expect(describeDeleteOutcome({ name: 'A', existed: true, stillResolvesFromEnvironment: true, envName: 'NODEGX_SECRET_A' }).severity).toBe('bad');
    expect(describeDeleteOutcome({ name: 'A', existed: false, stillResolvesFromEnvironment: false, envName: 'NODEGX_SECRET_A' }).message).toContain('nothing changed');
  });

  it('search: only the String fields a person made are offered', () => {
    expect(textFields({ name: 'Pet', columns: [{ name: 'objectId', type: 'String' }, { name: 'name', type: 'String' }, { name: 'age', type: 'Number' }, { name: 'ACL', type: 'ACL' }] })).toEqual(['name']);
  });

  it('server: a proxy is an address, loopback or any', () => {
    expect(proxyProblem('loopback')).toBeNull();
    expect(proxyProblem('*')).toBeNull();
    expect(proxyProblem('10.0.0.1')).toBeNull();
    expect(proxyProblem('my-proxy')).toContain('IP address');
  });

  it('activity: the target is the thing, the actor is a person or a key, the query is the route’s', () => {
    expect(targetWords({ route: 'admin/permissions/collections/:name', target: { name: 'Pets' } })).toEqual({ text: 'Pets · permissions', href: '#/permissions' });
    expect(targetWords({ route: 'admin/roles/:name', target: { name: 'editors' } })).toEqual({ text: 'editors · role', href: '#/roles/editors' });
    expect(targetWords({ route: 'admin/users/:id', target: { id: 'u1' } })).toEqual({ text: 'u1 · user', href: '#/users/u1' });
    expect(targetWords({ route: 'admin/files/:name', target: { name: 'x_a.png' } })).toEqual({ text: 'x_a.png · file', href: '#/files' });
    expect(targetWords({ action: 'admin.login' })).toEqual({ text: '—' });
    expect(actorWords({ actorKind: 'admin', actor: '' })).toBe('the admin credential');
    expect(actorWords({ actorKind: 'admin', actor: 'u1' }, (id) => (id === 'u1' ? 'ann@example.com' : null))).toBe('ann@example.com');
    expect(actorWords({ actorKind: 'apiKey', actor: 'deploy' })).toBe('API key: deploy');
    expect(actionWords('permissions.collection.update')).toBe('permissions · collection · update');
    const q = activityQuery({ kind: 'group', conj: 'and', items: [{ kind: 'cond', field: 'who', op: 'is', value: 'apiKey' }, { kind: 'cond', field: 'outcome', op: 'is', value: 'failure' }, { kind: 'cond', field: 'when', op: 'on', value: '2026-09-25' }] });
    expect(q.actorKind).toBe('apiKey');
    expect(q.outcome).toBe('failure');
    expect(Number(q.until) - Number(q.since)).toBe(24 * 3600 * 1000 - 1);
    expect(() => activityQuery({ kind: 'group', conj: 'or', items: [{ kind: 'cond', field: 'who', op: 'is', value: 'a' }, { kind: 'cond', field: 'who', op: 'is', value: 'b' }] })).toThrow('"and" only');
  });

  it('the nav and the registry agree on the three new pages', () => {
    const ids = VIEWS.map((v) => v.id);
    for (const id of ['secrets', 'search', 'server', 'audit', 'files', 'backups']) expect(ids).toContain(id);
    const navIds = NAV.reduce<string[]>((all, g) => all.concat(g.entries.map((e) => e.id)), []);
    expect(navIds).toEqual(ids);
    expect(NAV.find((g) => g.label === 'Activity')!.entries[0].label).toBe('Activity');
  });
});

// ------------------------------------------------------------- Storage --

describe('BMG-011 Storage page', () => {
  it('AC1: lists what the route answers, names the record a file is used by, and a refused delete offers to clear', async () => {
    deleteAnswers = [{ status: 409, json: { error: '"paws.png" is used by 1 record: Pet pet-1 (photo). Delete it anyway to clear those fields too.', code: 'FILE_IN_USE', uses: [{ collection: 'Pet', objectId: 'pet-1', field: 'photo' }] } }];
    const root = mount(
      <>
        <ModalHost />
        <FilesView params={[]} />
      </>
    );
    await settle(30);
    const rows = qa(root, 'table.files tbody tr');
    expect(rows.map((r) => r.getAttribute('data-file'))).toEqual([TXT_NAME, PNG_NAME]);
    expect(text(rows[0])).toContain('note.txt');
    expect(text(rows[0])).toContain('34 B');
    expect(text(rows[1])).toContain('2.0 KB');
    const use = q<HTMLAnchorElement>(rows[1], '.uses-cell a');
    expect(use.getAttribute('href')).toBe('#/collections/Pet/pet-1');
    expect(text(q(rows[0], '.uses-cell'))).toBe('nothing');
    expect(sent('GET', /\/admin\/files\/uses\?names=/).length).toBe(1);
    expect(q<HTMLImageElement>(rows[1], 'img.file-thumb').getAttribute('src')).toBe('/files/' + PNG_NAME + '?exp=1&sig=abc&thumb=sm');

    click(qa(rows[1], 'button').find((b) => text(b).trim() === 'Delete')!);
    await settle(10);
    click(qa(root, '.modal .foot button').find((b) => text(b).trim() === 'Delete')!);
    await settle(30);
    expect(sent('DELETE', /\/admin\/files\/[^?]+$/).length).toBe(1);
    const dialog = q(root, '.modal');
    expect(text(dialog)).toContain('is in use');
    expect(q<HTMLAnchorElement>(dialog, '.uses-list a').getAttribute('href')).toBe('#/collections/Pet/pet-1');
    const anyway = qa(dialog, 'button').find((b) => /Delete anyway/.test(text(b)))!;
    expect(text(anyway)).toContain('clear 1 field');
    click(anyway);
    await settle(30);
    expect(sent('DELETE', /clear=1$/).length).toBe(1);
    unmount(root);
  });

  it('AC2: the stored deny list ticks its category; a tick sends the documented list; a custom chip appends', async () => {
    const root = mount(<FilesView params={[]} />);
    await settle(30);
    const box = (id: string) => q<HTMLInputElement>(root, '#kind-boxes input[value="' + id + '"]');
    expect(box('web').checked).toBe(true);
    expect(box('unknown').checked).toBe(false);
    change(box('unknown'), true);
    const add = q<HTMLInputElement>(root, '#custom-types .chips-add input');
    typeInto(add, 'exe');
    press(add, 'Enter');
    await settle();
    expect(text(q(root, '#custom-types .chips-problem'))).toContain('image/png');
    typeInto(add, 'application/x-msdownload');
    press(add, 'Enter');
    await settle();
    click(q(root, '#save-limits'));
    await settle(20);
    const put = sent('PUT', /\/admin\/files\/config$/)[0];
    expect(put).toBeTruthy();
    const deny = (put.body!.contentTypes as { denyList: string[] }).denyList;
    expect(deny).toEqual(denyListFrom({ categories: ['web', 'unknown'], custom: ['application/x-msdownload'] }));
    expect(deny).toContain('application/octet-stream');
    expect(deny[deny.length - 1]).toBe('application/x-msdownload');
    unmount(root);
  });

  it('AC3: presets edited in the list are sent as thumbnails.presets', async () => {
    const root = mount(<FilesView params={[]} />);
    await settle(30);
    const rows = qa(root, '#presets .list-row:not(.list-head)');
    expect(rows.length).toBe(3);
    typeInto(q<HTMLInputElement>(rows[0], 'input[aria-label="Width"]'), '96');
    await settle();
    click(q(root, '#save-presets'));
    await settle(20);
    const put = sent('PUT', /\/admin\/files\/config$/)[0];
    expect(put.body).toEqual({ thumbnails: { presets: { sm: { width: 96, height: 64, fit: 'cover' }, md: { width: 256, height: 256, fit: 'cover' }, lg: { width: 1024, height: 1024, fit: 'contain' } } } });
    unmount(root);
  });

  it('AC4/AC9: the clean-up schedule is the builder, and it sends the cron the builder made', async () => {
    const root = mount(<FilesView params={[]} />);
    await settle(30);
    expect(q(root, '#sweep-schedule .sched-modes')).toBeTruthy();
    await settle(400);
    expect(text(root)).toContain('Every day at 03:00');
    expect(sent('POST', /\/admin\/triggers\/preview$/).length).toBeGreaterThan(0);
    click(q(root, '#save-sweep'));
    await settle(20);
    expect(sent('PUT', /\/admin\/files\/config$/)[0].body).toEqual({ orphanSweep: { enabled: true, cron: '0 3 * * *' } });
    unmount(root);
  });
});

// ------------------------------------------------------------- Backups --

describe('BMG-011 Backups page', () => {
  it('AC4: turning the schedule on shows the builder; saving sends the cron and the missed-run policy', async () => {
    const root = mount(<BackupsView params={[]} />);
    await settle(30);
    expect(root.querySelector('#backup-schedule')).toBeNull();
    change(q<HTMLInputElement>(root, '#backup-enabled'), true);
    await settle(20);
    expect(q(root, '#backup-schedule .sched-modes')).toBeTruthy();
    click(q(root, '#save-schedule'));
    await settle(20);
    expect(sent('PUT', /\/admin\/backups\/config$/)[0].body).toEqual({ schedule: { enabled: true, cron: '0 3 * * *', missedFirePolicy: 'skip' } });
    expect(text(q(root, '#keep-words'))).toBe('Keeps the last 7.');
    unmount(root);
  });

  it('AC5: Restore waits for the backend’s typed name with back-up-first ticked, then blocks the page until the backend answers', async () => {
    const root = mount(
      <>
        <ModalHost />
        <BackupsView params={[]} />
      </>
    );
    await settle(30);
    click(qa(root, 'tr[data-archive] button').find((b) => /Restore/.test(text(b)))!);
    await settle(10);
    const dialog = q(root, '.modal');
    expect(text(dialog)).toContain('Everything written since');
    const confirm = q<HTMLButtonElement>(dialog, '#restore-confirm');
    expect(confirm.disabled).toBe(true);
    expect(q<HTMLInputElement>(dialog, 'input[type="checkbox"]').checked).toBe(true);
    typeInto(q<HTMLInputElement>(dialog, '#restore-typed'), 'Puppy');
    await settle();
    expect(confirm.disabled).toBe(true);
    typeInto(q<HTMLInputElement>(dialog, '#restore-typed'), 'Puppy backend');
    await settle();
    expect(confirm.disabled).toBe(false);
    click(confirm);
    await settle(20);
    const post = sent('POST', /\/admin\/backups\/restore$/)[0];
    expect(post.body).toEqual({ archive: 'backup-2026-09-25T02-00-00.tar', safetySnapshot: true });
    expect(text(root)).toContain('Restoring backup-2026-09-25T02-00-00.tar');
    expect(root.querySelector('.blocked')).toBeTruthy();
    expect(q<HTMLButtonElement>(root, '#backup-now').disabled).toBe(true);
    restoreResolve!();
    await settle(40);
    expect(root.querySelector('.blocked')).toBeNull();
    expect(text(root)).not.toContain('Restoring backup');
    unmount(root);
  });
});

// ------------------------------------------------------------- Secrets --

describe('BMG-011 Secrets page', () => {
  it('AC6: a value is a password field typed once; the name rule is inline; save sends {value}', async () => {
    const root = mount(
      <>
        <ModalHost />
        <SecretsView params={[]} />
      </>
    );
    await settle(30);
    expect(text(root)).toContain('STRIPE_KEY');
    expect(text(root)).toContain('NODEGX_SECRET_MAILGUN');
    click(q(root, '#add-secret'));
    await settle(10);
    const save = q<HTMLButtonElement>(root, '#secret-save');
    expect(save.disabled).toBe(true);
    expect(q<HTMLInputElement>(root, '#secret-value').type).toBe('password');
    typeInto(q<HTMLInputElement>(root, '#secret-name'), 'not a name');
    await settle();
    expect(text(q(root, '.modal'))).toContain('letters, digits');
    typeInto(q<HTMLInputElement>(root, '#secret-name'), 'STRIPE_KEY');
    await settle();
    expect(text(q(root, '.modal'))).toContain('already a secret');
    typeInto(q<HTMLInputElement>(root, '#secret-name'), 'MAILGUN_KEY');
    typeInto(q<HTMLInputElement>(root, '#secret-value'), 'key-123');
    await settle();
    expect(save.disabled).toBe(false);
    click(save);
    await settle(20);
    const put = sent('PUT', /\/admin\/secrets\/MAILGUN_KEY$/)[0];
    expect(put.body).toEqual({ value: 'key-123' });
    unmount(root);
  });
});

// -------------------------------------------------------------- Search --

describe('BMG-011 Search page', () => {
  it('AC7: a collection’s switch and its text fields as chips; save sends the fields and reports the rebuild', async () => {
    const root = mount(<SearchView params={[]} />);
    await settle(30);
    expect(root.querySelector('#search-card-_User')).toBeNull();
    const card = q(root, '#search-card-Pet');
    expect(q<HTMLInputElement>(card, '#search-Pet').checked).toBe(true);
    expect(qa(card, '.chips-set .chip').map((c) => text(c).replace('✕', '').trim())).toEqual(['bio']);
    // With suggestions, the add box is a Picker over the collection's text fields.
    const add = q<HTMLInputElement>(card, '.picker input');
    typeInto(add, 'ag');
    await settle(260);
    expect(qa(card, '.picker-row').length).toBe(0);
    typeInto(add, 'na');
    await settle(260);
    expect(qa(card, '.picker-row').map((r) => text(r).trim())).toEqual(['name']);
    press(add, 'Enter');
    await settle();
    expect(qa(card, '.chips-set .chip').map((c) => text(c).replace('✕', '').trim())).toEqual(['bio', 'name']);
    click(qa(card, 'button').find((b) => text(b).trim() === 'Save')!);
    await settle(20);
    expect(sent('PUT', /\/admin\/search\/collections\/Pet$/)[0].body).toEqual({ enabled: true, fields: ['bio', 'name'] });
    expect(text(card)).toContain('3 records indexed');
    unmount(root);
  });
});

// -------------------------------------------------------------- Server --

describe('BMG-011 Server page', () => {
  it('AC8: any-site sends ["*"]; naming sites sends them; an origin without a scheme is refused inline', async () => {
    const root = mount(<ServerView params={[]} />);
    await settle(30);
    expect(q<HTMLInputElement>(root, '#cors-any').checked).toBe(true);
    expect(root.querySelector('#cors-origins')).toBeNull();
    change(q<HTMLInputElement>(root, '#cors-any'), false);
    await settle();
    const add = q<HTMLInputElement>(root, '#cors-origins .chips-add input');
    typeInto(add, 'app.example.com');
    press(add, 'Enter');
    await settle();
    expect(text(q(root, '#cors-origins .chips-problem'))).toContain('https://app.example.com');
    typeInto(add, 'https://app.example.com/some/page');
    press(add, 'Enter');
    await settle();
    click(q(root, '#save-cors'));
    await settle(20);
    expect(sent('PUT', /\/admin\/ops$/)[0].body).toEqual({ cors: { origins: ['https://app.example.com'], credentials: false } });
    expect(qa(root, '#rate-table .list-row[data-class]').length).toBe(7);
    expect(text(q(root, '#metrics-url'))).toMatch(/\/metrics$/);
    unmount(root);
  });

  it('§7: how long a list can be — two numbers in words, refused inline when upside down, saved as the queries section', async () => {
    expect(listsProblem('1000', '10000')).toBeNull();
    expect(listsProblem('0', '10')).toContain('at least 1');
    expect(listsProblem('10', '2.5')).toContain('at least 1');
    expect(listsProblem('50', '20')).toBe('The longest list cannot be shorter than the one the app gets without asking.');
    const root = mount(<ServerView params={[]} />);
    await settle(30);
    expect(q<HTMLInputElement>(root, '#lists-default').value).toBe('1000');
    typeInto(q<HTMLInputElement>(root, '#lists-max'), '500');
    await settle();
    expect(text(q(root, '#lists-problem'))).toContain('cannot be shorter');
    expect(q<HTMLButtonElement>(root, '#save-lists').disabled).toBe(true);
    typeInto(q<HTMLInputElement>(root, '#lists-max'), '5000');
    typeInto(q<HTMLInputElement>(root, '#lists-default'), '200');
    await settle();
    expect(root.querySelector('#lists-problem')).toBeNull();
    click(q(root, '#save-lists'));
    await settle(20);
    expect(sent('PUT', /\/admin\/ops$/).pop()!.body).toEqual({ queries: { defaultLimit: 200, maxLimit: 5000 } });
    unmount(root);
  });
});

// ------------------------------------------------------------ Activity --

describe('BMG-011 Activity page', () => {
  it('AC (§3.6): the target is a link to the thing, the actor is in words, the filter is the route’s', async () => {
    const root = mount(<AuditView params={[]} />);
    await settle(30);
    const rows = qa(root, 'tbody tr');
    expect(rows.length).toBe(2);
    expect(text(rows[0])).toContain('permissions · collection · update');
    expect(text(rows[0])).toContain('the admin credential');
    expect(q<HTMLAnchorElement>(rows[0], 'a').getAttribute('href')).toBe('#/permissions');
    expect(text(q(rows[0], 'a'))).toBe('Pets · permissions');
    expect(text(rows[1])).toContain('API key: deploy');
    expect(q<HTMLAnchorElement>(rows[1], 'a').getAttribute('href')).toBe('#/roles/editors');
    expect(text(rows[1])).toContain('failed');
    expect(text(root)).toContain('Showing 1–2 of 2');
    click(q(root, '#activity-filter .filter-adds button'));
    await settle();
    const fieldSelect = q<HTMLSelectElement>(root, '#activity-filter .filter-line select');
    expect(Array.from(fieldSelect.options).map((o) => o.value)).toEqual(['action', 'who', 'outcome', 'when']);
    expect(root.querySelector('#activity-filter .filter-adds button + button')).toBeNull(); // flat: no group
    unmount(root);
  });
});

// ----------------------------------------------------------------- AC9 --

describe('BMG-011 AC9 — no comma-separated or cron text field at rest', () => {
  const CRON = /^[\d*\/,-]+(\s+[\d*\/,-]+){4}$/;
  const pages: Array<[string, () => import('preact').VNode]> = [
    ['Storage', () => <FilesView params={[]} />],
    ['Backups', () => <BackupsView params={[]} />],
    ['Secrets', () => <SecretsView params={[]} />],
    ['Search', () => <SearchView params={[]} />],
    ['Server', () => <ServerView params={[]} />],
    ['Activity', () => <AuditView params={[]} />]
  ];
  it.each(pages)('%s', async (_name, make) => {
    const root = mount(make());
    await settle(30);
    const inputs = qa<HTMLInputElement>(root, 'input:not([type]), input[type="text"], input[type="search"], textarea');
    for (const el of inputs) {
      const words = [el.placeholder, el.getAttribute('aria-label') || '', el.closest('label') ? text(el.closest('label')!) : ''].join(' ').toLowerCase();
      expect({ id: el.id || el.placeholder, words }).not.toMatchObject({ words: expect.stringMatching(/comma|cron/) });
      expect({ id: el.id || el.placeholder, value: el.value }).not.toMatchObject({ value: expect.stringMatching(CRON) });
    }
    unmount(root);
  });
});

describe('BMG-017 — the Clean-up sentence counts the files too new to judge', () => {
  it('says what was deleted, and what was left alone because it may still be arriving', () => {
    expect(sweepWords({ orphanBlobs: ['a'], orphanRows: [], tooNew: [], graceMinutes: 5, deleted: true })).toBe(
      'Done: 1 file no record knows about, 0 records whose file is missing — the unknown files were deleted.'
    );
    expect(sweepWords({ orphanBlobs: [], orphanRows: ['r'], tooNew: ['x', 'y'], graceMinutes: 5, deleted: true })).toBe(
      'Done: 0 files no record knows about, 1 record whose file is missing; 2 files are too new to judge — under 5 minutes old and perhaps still arriving — so they were left alone.'
    );
    expect(sweepWords({ orphanBlobs: [], orphanRows: [], tooNew: ['x'], graceMinutes: 5, deleted: false })).toMatch(/; 1 file is too new to judge — .* — so it was left alone\.$/);
  });
});
