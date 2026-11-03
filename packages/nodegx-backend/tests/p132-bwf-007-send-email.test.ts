/**
 * P132 BWF-007 — *Send an email*, over a real BackendService with the mailer's transport faked.
 *
 *   AC1 — sent, its values filled from the run; a list of recipients (a text with commas, and a list of records found
 *         by the step before); no SMTP set FAILS the step in words that say where to set it, never a stack, and
 *         `onError` catches it; the SMTP password is in no run record.
 *
 * Plus the write-time check: an address that is not one, no subject, a list past the cap, refused before anything is
 * written.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';
import { EMAIL_MAX_RECIPIENTS, htmlToText, readRecipients, validateSendEmailParams } from '../src/workflow/steps';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

const SMTP_PASSWORD = 'smtp-pass-7d2e91c4b8';

interface Sent {
  to: unknown;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from: string;
}

function backend(label: string) {
  const ctx = { dataDir: '', base: '', service: null as BackendService | null };
  const sent: Sent[] = [];
  const client = httpClient(
    () => ctx.base,
    () => adminHeaders(ctx.dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => client.request<T>(method, p, { body });
  const define = async (def: Record<string, unknown>) => {
    const made = await req<{ error?: string }>('POST', '/admin/workflow-defs', def);
    if (made.status !== 201) throw new Error(`workflow ${String(def.id)} refused: ${JSON.stringify(made.json)}`);
  };
  const run = async (id: string, payload: unknown = {}) =>
    (await req<WorkflowRunResponse>('POST', `/admin/workflow-defs/${id}/run`, { payload })).json.run;
  const start = async () => {
    ctx.dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-bwf007-${label}-`));
    ctx.service = new BackendService({ dataDir: ctx.dataDir, port: 0, backendId: `bwf007${label}`, backendName: 'BWF-007' });
    ctx.base = (await ctx.service.start()).listen.url;
    ctx.service.getMailerForTesting()!.setTransportForTesting({
      sendMail: async (opts: Record<string, unknown>) => {
        sent.push({
          to: opts.to,
          subject: String(opts.subject),
          text: String(opts.text),
          html: opts.html as string | undefined,
          replyTo: opts.replyTo as string | undefined,
          from: String(opts.from)
        });
        return { messageId: `<${sent.length}@smtp.test>` };
      }
    });
  };
  const configure = async () => {
    const r = await req('PUT', '/admin/email/config', {
      enabled: true,
      smtp: { host: 'smtp.test', port: 587, secure: false, username: 'garden' },
      smtpPassword: SMTP_PASSWORD,
      fromAddress: 'greenhouse@example.com',
      fromName: 'Greenhouse'
    });
    if (r.status !== 200) throw new Error(`email config refused: ${r.status} ${JSON.stringify(r.json)}`);
  };
  const stop = async () => {
    if (ctx.service) await ctx.service.stop();
    fs.rmSync(ctx.dataDir, { recursive: true, force: true });
  };
  return { ctx, sent, req, define, run, start, stop, configure };
}

/** Every file under `dir` but the backend's own secrets file, read as bytes, that contains `needle`. */
function filesContaining(dir: string, needle: string): string[] {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (fs.readFileSync(p).includes(Buffer.from(needle))) hits.push(path.relative(dir, p));
    }
  };
  walk(dir);
  return hits.filter((f) => f !== 'secrets.json');
}

describe('P132 BWF-007: send-email (SMTP set)', () => {
  const b = backend('set');

  beforeAll(async () => {
    await b.start();
    await b.configure();
    for (const [name, needsWater] of [
      ['Fern', true],
      ['Basil', true],
      ['Cactus', false]
    ] as const) {
      const r = await b.req('POST', '/classes/Plant', { name, needsWater, keeper: `${name.toLowerCase()}@example.com` });
      expect(r.status).toBe(201);
    }
  });
  afterAll(() => b.stop());

  it('sends one email, its subject and words filled from the run, and hands on the message id', async () => {
    await b.define({
      id: 'thanks',
      entry: 'mail',
      steps: [
        {
          id: 'mail',
          kind: 'send-email',
          params: {
            to: { $path: 'body.email' },
            subject: { $fn: 'text', args: ['Thank you, ', { $path: 'body.name' }] },
            body: { $fn: 'text', args: ['We got your order for ', { $path: 'body.count' }, ' seedlings.'] },
            replyTo: 'help@example.com'
          }
        }
      ]
    });
    const before = b.sent.length;
    const r = await b.run('thanks', { email: 'ann@example.com', name: 'Ann', count: 3 });
    expect(r.failedStep?.message).toBeUndefined();
    expect(r.status).toBe('success');
    expect(b.sent.length).toBe(before + 1);
    const m = b.sent[b.sent.length - 1];
    expect(m).toMatchObject({
      to: ['ann@example.com'],
      subject: 'Thank you, Ann',
      text: 'We got your order for 3 seedlings.',
      replyTo: 'help@example.com',
      from: '"Greenhouse" <greenhouse@example.com>'
    });
    expect(m.html).toBeUndefined();
    expect(r.output).toEqual({ sent: true, messageId: `<${b.sent.length}@smtp.test>`, to: ['ann@example.com'] });
  });

  it('writes to everyone in a list: a text with commas, and the records the step before found', async () => {
    await b.define({
      id: 'morning',
      entry: 'find',
      steps: [
        {
          id: 'find',
          kind: 'find-records',
          params: { table: 'Plant', where: [{ field: 'needsWater', op: 'eq', value: true }], sortBy: 'name' },
          next: ['tell', 'keepers']
        },
        {
          id: 'tell',
          kind: 'send-email',
          params: {
            to: 'gardener@example.com, ; helper@example.com',
            subject: 'Plants that need water today',
            body: { $fn: 'join', args: [{ $fn: 'pick', args: [{ $path: 'upstream.find.items' }, 'name'] }, '\n'] }
          }
        },
        {
          id: 'keepers',
          kind: 'send-email',
          params: {
            to: { $fn: 'pick', args: [{ $path: 'upstream.find.items' }, 'keeper'] },
            subject: 'Your plant needs water',
            body: '<p>Please water it <b>today</b>.</p><ul><li>Fern</li><li>Basil</li></ul>',
            bodyFormat: 'html'
          }
        }
      ]
    });
    const before = b.sent.length;
    const r = await b.run('morning');
    expect(r.status).toBe('success');
    const mine = b.sent.slice(before);
    expect(mine).toHaveLength(2);
    const tell = mine.find((m) => m.subject === 'Plants that need water today')!;
    expect(tell.to).toEqual(['gardener@example.com', 'helper@example.com']);
    expect(tell.text).toBe('Basil\nFern');
    const keepers = mine.find((m) => m.subject === 'Your plant needs water')!;
    expect(keepers.to).toEqual(['basil@example.com', 'fern@example.com']);
    expect(keepers.html).toContain('<b>today</b>');
    expect(keepers.text).toBe('Please water it today.\n• Fern\n• Basil');
  });

  it('refuses at run time an address that is not one, and sends nothing', async () => {
    await b.define({
      id: 'badto',
      entry: 'mail',
      steps: [{ id: 'mail', kind: 'send-email', params: { to: { $path: 'body.email' }, subject: 'Hi' } }]
    });
    const before = b.sent.length;
    const r = await b.run('badto', { email: 'not an address' });
    expect(r.status).toBe('error');
    expect(r.failedStep?.message).toBe(
      'Step "mail": "not an address" is not an email address, so no email was sent.'
    );
    const empty = await b.run('badto', {});
    expect(empty.failedStep?.message).toMatch(/no address to write to/);
    expect(b.sent.length).toBe(before);
  });

  it('keeps the SMTP password out of every run record', async () => {
    expect(b.sent.length).toBeGreaterThan(0);
    // the backend's secrets file holds it, as it should; nothing else under the data folder does
    expect(fs.readFileSync(path.join(b.ctx.dataDir, 'secrets.json'), 'utf8')).toContain(SMTP_PASSWORD);
    expect(filesContaining(b.ctx.dataDir, SMTP_PASSWORD)).toEqual([]);
  });
});

describe('P132 BWF-007: send-email (no SMTP set)', () => {
  const b = backend('unset');

  beforeAll(() => b.start());
  afterAll(() => b.stop());

  it('fails the step in words that say where to set it, and onError catches it', async () => {
    await b.define({
      id: 'nosmtp',
      entry: 'mail',
      steps: [
        { id: 'mail', kind: 'send-email', params: { to: 'ann@example.com', subject: 'Hi', body: 'Hello' }, onError: ['said'] },
        { id: 'said', kind: 'return', params: { value: { $path: 'previous.error.message' } } }
      ]
    });
    const r = await b.run('nosmtp');
    expect(b.sent).toHaveLength(0);
    expect(r.status).toBe('success');
    const message = String(r.output);
    expect(message).toMatch(/^Step "mail": no email was sent\. Email is not configured for this backend/);
    expect(message).toContain('Email page of the backend manager');
    expect(message).not.toMatch(/\n\s+at /); // no stack
  });
});

describe('P132 BWF-007: the write-time check', () => {
  const at = 'steps[0]';
  it('passes a whole step, a list and values from the run', () => {
    expect(validateSendEmailParams({ to: 'a@example.com', subject: 'Hi', body: 'x', bodyFormat: 'html', replyTo: 'b@example.com' }, at)).toEqual([]);
    expect(validateSendEmailParams({ to: ['a@example.com', 'b@example.com'], subject: 'Hi' }, at)).toEqual([]);
    expect(validateSendEmailParams({ to: { $path: 'body.email' }, subject: { $fn: 'text', args: ['Hi ', { $path: 'body.name' }] } }, at)).toEqual([]);
    expect(validateSendEmailParams({ to: ['a@example.com', { $path: 'body.email' }], subject: 'Hi' }, at)).toEqual([]);
  });
  it('refuses, in words, what cannot be sent', () => {
    expect(validateSendEmailParams({ subject: 'Hi' }, at)).toEqual([`${at}: send-email needs "to" — the address it writes to`]);
    expect(validateSendEmailParams({ to: 'ann at example', subject: 'Hi' }, at)).toEqual([`${at}.params.to: "ann at example" is not an email address`]);
    expect(validateSendEmailParams({ to: 'a@example.com' }, at)).toEqual([`${at}: send-email needs a "subject"`]);
    expect(validateSendEmailParams({ to: 'a@example.com', subject: 'Hi', bodyFormat: 'markdown' }, at)).toEqual([`${at}.params.bodyFormat must be one of text, html`]);
    expect(validateSendEmailParams({ to: 'a@example.com', subject: 'Hi', replyTo: 'nobody' }, at)).toEqual([`${at}.params.replyTo "nobody" is not an email address`]);
    const many = Array.from({ length: EMAIL_MAX_RECIPIENTS + 1 }, (_, i) => `p${i}@example.com`);
    expect(validateSendEmailParams({ to: many, subject: 'Hi' }, at)).toEqual([`${at}.params.to has ${EMAIL_MAX_RECIPIENTS + 1} addresses; one email goes to at most ${EMAIL_MAX_RECIPIENTS}`]);
  });
  it('is applied when the definition is written', async () => {
    const b = backend('write');
    await b.start();
    try {
      const r = await b.req<{ error?: string; errors?: string[] }>('POST', '/admin/workflow-defs', {
        id: 'refused',
        entry: 'mail',
        steps: [{ id: 'mail', kind: 'send-email', params: { to: 'ann at example', subject: 'Hi' } }]
      });
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.json)).toContain('\\"ann at example\\" is not an email address');
      expect(fs.existsSync(path.join(b.ctx.dataDir, 'workflows', 'refused.workflow-def.json'))).toBe(false);
    } finally {
      await b.stop();
    }
  });
  it('reads recipients the way a person writes them', () => {
    expect(readRecipients('a@example.com; b@example.com\nc@example.com, a@example.com')).toEqual({
      addresses: ['a@example.com', 'b@example.com', 'c@example.com'],
      bad: []
    });
    expect(readRecipients([{ email: 'a@example.com' }, 'b@example.com', 7])).toEqual({ addresses: ['a@example.com', 'b@example.com'], bad: ['7'] });
    expect(htmlToText('<h1>Hi &amp; welcome</h1><p>Line<br>two</p>')).toBe('Hi & welcome\nLine\ntwo');
  });
});
