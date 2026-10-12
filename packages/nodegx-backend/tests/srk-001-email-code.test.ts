/**
 * SRK-001 — a six-digit code by email, typed into the app.
 *
 * Phase 119's learner app is an installed PWA. A magic link tapped in a
 * phone's mail app opens the browser, a different context from the installed
 * app, so the person ends up signed in to Safari and signed out of the app.
 * A code is typed where it is needed. These arms drive the routes a person
 * takes (ask, read the mail, type), plus the ones an attacker takes (guess,
 * ask again, guess again), and the one rule that joins the two doors: a code
 * and a link for the same address are the same account.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { validateAuthConfig } from '../src/auth/model';
import { EMAIL_CODE_MAX_ATTEMPTS } from '../src/email/tokens';
import { BackendService } from '../src/service';
import { AuthSpecBody } from './helpers/http';

jest.setTimeout(30000);

interface Mail {
  to: string;
  subject: string;
  text: string;
}

async function startBackend(name: string, rateLimit: boolean) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-${name}-`));
  if (!rateLimit) {
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  }
  const service = new BackendService({ dataDir, port: 0, backendId: name, backendName: 'Simple Rick', authToken: 'admin-token' });
  const base = (await service.start()).listen.url;
  const mails: Mail[] = [];
  service.getMailerForTesting()!.setTransportForTesting({
    sendMail: async (opts: Record<string, unknown>) => {
      mails.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text) });
    }
  });

  async function req(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual'
    });
    const text = await res.text();
    let json = {} as AuthSpecBody;
    try {
      json = JSON.parse(text);
    } catch {
      /* HTML or empty */
    }
    return { status: res.status, json, text, location: res.headers.get('location'), headers: res.headers };
  }

  const admin = { authorization: 'Bearer admin-token' };
  await req(
    'PUT',
    '/admin/email/config',
    { baseUrl: base, enabled: true, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'noreply@test' },
    admin
  );
  const put = await req('PUT', '/admin/auth', { emailCode: { enabled: true }, magicLink: { enabled: true } }, admin);
  expect(put.status).toBe(200);

  /** Ask for a code; the mail is sent after the 200, so wait for it. */
  async function ask(email: string): Promise<Mail | undefined> {
    const before = mails.length;
    expect((await req('POST', '/auth/email-code', { email })).status).toBe(200);
    for (let i = 0; i < 40 && mails.length === before; i++) await new Promise((r) => setTimeout(r, 10));
    return mails.length > before ? mails[mails.length - 1] : undefined;
  }
  const codeIn = (mail: Mail) => (/\b(\d{6})\b/.exec(mail.text) as RegExpExecArray)[1];
  const verify = (email: string, code: string) => req('POST', '/auth/email-code/verify', { email, code });
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

  return {
    dataDir,
    service,
    base,
    mails,
    req,
    admin,
    ask,
    codeIn,
    verify,
    wrong,
    stop: async () => {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

describe('SRK-001 sign in with a six-digit code', () => {
  let b: Awaited<ReturnType<typeof startBackend>>;

  beforeAll(async () => {
    b = await startBackend('srk001', false);
  });
  afterAll(async () => {
    await b.stop();
  });

  it('asks, reads the mail, types the code: a session in /login shape, with roles', async () => {
    const mail = (await b.ask('Learner@Example.com '))!;
    expect(mail.to).toBe('learner@example.com');
    const code = b.codeIn(mail);
    // The code leads the subject, so a phone notification shows it.
    expect(mail.subject.startsWith(`${code} is your sign-in code for Simple Rick`)).toBe(true);
    expect(mail.text).toContain('expires in 10 minutes');

    const signedIn = await b.verify('learner@example.com', code);
    expect(signedIn.status).toBe(200);
    expect(signedIn.json).toEqual(
      expect.objectContaining({ email: 'learner@example.com', sessionToken: expect.any(String), roles: [], authOutcome: 'created' })
    );
    expect(signedIn.headers.get('cache-control')).toBe('no-store');

    const me = await b.req('GET', '/users/me', undefined, { 'x-parse-session-token': signedIn.json.sessionToken as string });
    expect(me.status).toBe(200);
    expect(me.json.objectId).toBe(signedIn.json.objectId);
  });

  it('a code works once', async () => {
    const code = b.codeIn((await b.ask('once@example.com'))!);
    expect((await b.verify('once@example.com', code)).status).toBe(200);
    expect((await b.verify('once@example.com', code)).status).toBe(400);
  });

  it('a code typed with spaces, as people copy it, still works', async () => {
    const code = b.codeIn((await b.ask('spaces@example.com'))!);
    expect((await b.verify('spaces@example.com', `${code.slice(0, 3)} ${code.slice(3)}\n`)).status).toBe(200);
  });

  it('a code is for its address only', async () => {
    const code = b.codeIn((await b.ask('owner@example.com'))!);
    await b.ask('other@example.com');
    expect((await b.verify('other@example.com', code)).status).toBe(400);
    expect((await b.verify('owner@example.com', code)).status).toBe(200);
  });

  it(`${EMAIL_CODE_MAX_ATTEMPTS - 1} wrong guesses leave the code alive; the right one still signs in`, async () => {
    const code = b.codeIn((await b.ask('typo@example.com'))!);
    for (let i = 0; i < EMAIL_CODE_MAX_ATTEMPTS - 1; i++) expect((await b.verify('typo@example.com', b.wrong(code))).status).toBe(400);
    expect((await b.verify('typo@example.com', code)).status).toBe(200);
  });

  it(`the ${EMAIL_CODE_MAX_ATTEMPTS}th wrong guess spends the code: the right one no longer works`, async () => {
    const code = b.codeIn((await b.ask('guessed@example.com'))!);
    for (let i = 0; i < EMAIL_CODE_MAX_ATTEMPTS; i++) expect((await b.verify('guessed@example.com', b.wrong(code))).status).toBe(400);
    const late = await b.verify('guessed@example.com', code);
    expect(late.status).toBe(400);
    // Control: a fresh code for the same address works, so the refusal above was the spent code, not the address.
    const fresh = b.codeIn((await b.ask('guessed@example.com'))!);
    expect((await b.verify('guessed@example.com', fresh)).status).toBe(200);
  });

  it('asking again spends the code already out: only the newest works', async () => {
    const first = b.codeIn((await b.ask('twice@example.com'))!);
    const second = b.codeIn((await b.ask('twice@example.com'))!);
    if (first !== second) expect((await b.verify('twice@example.com', first)).status).toBe(400);
    expect((await b.verify('twice@example.com', second)).status).toBe(200);
  });

  it('wrong, spent and never-sent all answer the same words: no oracle', async () => {
    const code = b.codeIn((await b.ask('oracle@example.com'))!);
    const wrong = await b.verify('oracle@example.com', b.wrong(code));
    const never = await b.verify('nobody-asked@example.com', '123456');
    const malformed = await b.verify('oracle@example.com', 'abc');
    expect(wrong.status).toBe(400);
    expect(never.status).toBe(400);
    expect(malformed.status).toBe(400);
    // Each body carries its own requestId, so the words and the code are compared.
    const said = (r: { json: AuthSpecBody }) => ({ error: r.json.error, code: r.json.code });
    expect(said(wrong).error).toMatch(/not right/);
    expect(said(never)).toEqual(said(wrong));
    expect(said(malformed)).toEqual(said(wrong));
  });

  it('an expired code is refused', async () => {
    expect((await b.req('PUT', '/admin/auth', { emailCode: { ttlMinutes: 0.002 } }, b.admin)).status).toBe(200);
    try {
      const code = b.codeIn((await b.ask('slow@example.com'))!);
      await new Promise((r) => setTimeout(r, 250));
      expect((await b.verify('slow@example.com', code)).status).toBe(400);
    } finally {
      await b.req('PUT', '/admin/auth', { emailCode: { ttlMinutes: 10 } }, b.admin);
    }
  });

  it('a link last week and a code today are ONE account and ONE identity', async () => {
    b.mails.length = 0;
    expect((await b.req('POST', '/auth/magic-link', { email: 'both@example.com' })).status).toBe(200);
    for (let i = 0; i < 40 && b.mails.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
    const token = decodeURIComponent((/\/auth\/magic-link\/callback\?token=([^\s&]+)/.exec(b.mails[0].text) as RegExpExecArray)[1]);
    const form = await fetch(`${b.base}/auth/magic-link/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      redirect: 'manual'
    });
    const handoff = new URL(form.headers.get('location') as string).searchParams.get('nodegx_auth');
    const byLink = await b.req('POST', '/oauth/exchange', { code: handoff });
    expect(byLink.status).toBe(200);

    const byCode = await b.verify('both@example.com', b.codeIn((await b.ask('both@example.com'))!));
    expect(byCode.status).toBe(200);
    expect(byCode.json.objectId).toBe(byLink.json.objectId);
    expect(byCode.json.authOutcome).toBe('signed-in');

    const ids = await b.req('GET', '/users/me/identities', undefined, { 'x-parse-session-token': byCode.json.sessionToken as string });
    expect(ids.status).toBe(200);
    const identities = (ids.json as unknown as { identities: { displayName: string }[] }).identities;
    expect(identities.map((i) => i.displayName)).toEqual(['Email']);
  });

  it('with signup off, an unknown address gets no mail and no account', async () => {
    expect((await b.req('PUT', '/admin/auth', { emailCode: { allowSignup: false } }, b.admin)).status).toBe(200);
    try {
      expect(await b.ask('stranger@example.com')).toBeUndefined();
      // Control, same setting: a known address still gets its code.
      const known = await b.ask('learner@example.com');
      expect(known).toBeDefined();
      expect((await b.verify('learner@example.com', b.codeIn(known!))).status).toBe(200);
    } finally {
      await b.req('PUT', '/admin/auth', { emailCode: { allowSignup: true } }, b.admin);
    }
  });

  it('switched off: the ask still answers 200 and sends nothing; typing says why', async () => {
    expect((await b.req('PUT', '/admin/auth', { emailCode: { enabled: false } }, b.admin)).status).toBe(200);
    try {
      expect(await b.ask('learner@example.com')).toBeUndefined();
      const typed = await b.verify('learner@example.com', '123456');
      expect(typed.status).toBe(400);
      expect(typed.text).toMatch(/switched off/);
      const providers = await b.req('GET', '/auth/providers');
      expect((providers.json as unknown as { emailCode: { enabled: boolean } }).emailCode.enabled).toBe(false);
    } finally {
      await b.req('PUT', '/admin/auth', { emailCode: { enabled: true } }, b.admin);
    }
    const providers = await b.req('GET', '/auth/providers');
    expect((providers.json as unknown as { emailCode: { enabled: boolean; verifyUrl: string } }).emailCode).toEqual(
      expect.objectContaining({ enabled: true, verifyUrl: `${b.base}/auth/email-code/verify` })
    );
  });

  it('the config refuses a code that lives longer than an hour', () => {
    expect(validateAuthConfig({ emailCode: { ttlMinutes: 61 } } as never).join()).toMatch(/at most 60/);
    expect(validateAuthConfig({ emailCode: { ttlMinutes: 0 } } as never).join()).toMatch(/positive number/);
    expect(validateAuthConfig({ emailCode: { ttlMinutes: 60, enabled: true, allowSignup: false } } as never)).toEqual([]);
  });
});

describe('SRK-001 guessing is bounded per address, whoever is asking', () => {
  let b: Awaited<ReturnType<typeof startBackend>>;

  beforeAll(async () => {
    b = await startBackend('srk001rl', true);
  });
  afterAll(async () => {
    await b.stop();
  });

  it('the eleventh try for one address in a window is 429 with Retry-After, even with the right code', async () => {
    const statuses: number[] = [];
    let code = b.codeIn((await b.ask('target@example.com'))!);
    for (let i = 0; i < 10; i++) {
      // A spent code is replaced, as an attacker would, so each try is a real guess at a live code.
      if (i === EMAIL_CODE_MAX_ATTEMPTS) code = b.codeIn((await b.ask('target@example.com'))!);
      statuses.push((await b.verify('target@example.com', b.wrong(code))).status);
    }
    expect(statuses).toEqual(Array(10).fill(400));
    const right = await b.verify('target@example.com', code);
    expect(right.status).toBe(429);
    expect(right.headers.get('retry-after')).toBeTruthy();
  });
});
