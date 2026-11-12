/**
 * P115 HST-017 (R8) — when the app's backend cannot answer, the visitor reads a sentence and the builder gets one email
 * a day (`cloudflare/refusal.ts`), and the deploy writes the sender into the Worker's config (`wranglerConfig`).
 *
 * The front Worker itself needs workerd (`cloudflare:workers`); its catch is graded there (HST-017 §3). Here: the words,
 * the once-a-day rule against a Map-backed cache, a failed send leaving the day open, and the config.
 */
import { alertTestEmail, forgetToldForTests, refusalAnswer, refusalEmail, refusalKind, sendAlert, tellOnce, type AlertEnv, type TellCache } from '../cloudflare/refusal';
import { emailProblem, wranglerConfig } from '../cloudflare/wranglerConfig';

function mapCache(): TellCache & { keys: string[] } {
  const m = new Map<string, Response>();
  return {
    keys: [] as string[],
    async match(k: string) {
      return m.get(k);
    },
    async put(k: string, v: Response) {
      m.set(k, v);
      this.keys.push(k);
    }
  };
}

function mailer(fail?: { code: string; message: string }) {
  const sent: Array<Record<string, unknown>> = [];
  const env: AlertEnv = {
    NODEGX_ALERT_FROM: 'alerts@my-hearth.org',
    NODEGX_ALERT_TO: 'owner@example.com',
    ALERT_EMAIL: {
      async send(m) {
        if (fail) throw Object.assign(new Error(fail.message), { code: fail.code });
        sent.push(m);
        return { messageId: `m${sent.length}` };
      }
    }
  };
  return { env, sent };
}

const AT = new Date(Date.UTC(2026, 10, 7, 21, 15));

beforeEach(() => forgetToldForTests());

describe('the words', () => {
  test('a limit in any wording is the daily allowance; anything else is the backend failing', () => {
    for (const said of ['Exceeded allowed rows written', 'Durable Object request limit', 'quota exceeded', 'Too many requests']) {
      expect(refusalKind(new Error(said))).toBe('daily-allowance');
    }
    expect(refusalKind(new Error('Network connection lost.'))).toBe('backend-failed');
    expect(refusalKind('internal error')).toBe('backend-failed');
  });

  test("the page gets the backend's own error shape, a 503, and the sentence", async () => {
    const r = refusalAnswer('daily-allowance');
    expect(r.status).toBe(503);
    expect(r.headers.get('x-nodegx-refusal')).toBe('daily-allowance');
    const body = (await r.json()) as { code: number; error: string };
    expect(body.error).toMatch(/allowance for today\. It will work again after midnight UTC/);
    expect(((await refusalAnswer('backend-failed').json()) as { error: string }).error).toMatch(/could not answer just now/);
  });

  test("the email carries Cloudflare's own words, the time and what to do", () => {
    const m = refusalEmail('daily-allowance', 'https://campus.my-hearth.org', 'Exceeded allowed rows written', AT);
    expect(m.subject).toBe("https://campus.my-hearth.org went over the free plan's allowance for today");
    expect(m.text).toMatch(/at 21:15 UTC on 7 November 2026/);
    expect(m.text).toMatch(/Cloudflare's own words: "Exceeded allowed rows written"/);
    expect(m.text).toMatch(/\$5 a month/);
    expect(alertTestEmail('https://x').text).toMatch(/Not spam/);
  });
});

describe('once a day', () => {
  test('two refusals the same day: one email; the next day: another', async () => {
    const { env, sent } = mailer();
    const cache = mapCache();
    const lines: string[] = [];
    const deps = { env, cache, now: () => AT, log: (l: string) => lines.push(l) };
    expect(await tellOnce(deps, 'daily-allowance', 'https://a', new Error('Exceeded allowed rows written'))).toMatchObject({ ok: true, via: 'cloudflare', id: 'm1' });
    expect(await tellOnce(deps, 'daily-allowance', 'https://a', new Error('Exceeded allowed rows written'))).toBe('already-told');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ from: { email: 'alerts@my-hearth.org', name: 'NodeGX' }, to: 'owner@example.com' });
    expect(lines).toHaveLength(2); // every refusal is a log line, told or not
    expect(JSON.parse(lines[0])).toMatchObject({ nodegxRefusal: 'daily-allowance', said: 'Exceeded allowed rows written', ok: true });

    // Another isolate the same day (this isolate's memory forgotten): the cache still says told.
    forgetToldForTests();
    expect(await tellOnce(deps, 'daily-allowance', 'https://a', new Error('x limit'))).toBe('already-told');
    // The next UTC day.
    expect(await tellOnce({ ...deps, now: () => new Date(AT.getTime() + 24 * 3600e3) }, 'daily-allowance', 'https://a', new Error('x limit'))).toMatchObject({ ok: true });
    expect(sent).toHaveLength(2);
  });

  test('a failed send leaves the day open (a sender set up later still tells); nothing set up = a log line only', async () => {
    const failing = mailer({ code: 'E_SENDER_NOT_VERIFIED', message: 'sender not verified' });
    const cache = mapCache();
    const first = await tellOnce({ env: failing.env, cache, now: () => AT, log: () => undefined }, 'backend-failed', 'https://a', new Error('boom'));
    expect(first).toMatchObject({ ok: false, error: 'E_SENDER_NOT_VERIFIED: sender not verified' });
    expect(cache.keys).toEqual([]);
    const working = mailer();
    expect(await tellOnce({ env: working.env, cache, now: () => AT, log: () => undefined }, 'backend-failed', 'https://a', new Error('boom'))).toMatchObject({ ok: true });

    expect(await sendAlert({}, alertTestEmail('https://a'))).toMatchObject({ via: 'none', ok: false });
  });
});

describe('the config', () => {
  test('the send binding and the two addresses only when there is an alert', () => {
    const withAlert = wranglerConfig({ name: 'campus', bucket: null, alert: { from: 'alerts@my-hearth.org', to: 'owner@example.com' } });
    expect(withAlert).toMatch(/\[\[send_email\]\]\nname = "ALERT_EMAIL"/);
    expect(withAlert).toMatch(/NODEGX_ALERT_FROM = "alerts@my-hearth.org"\nNODEGX_ALERT_TO = "owner@example.com"/);
    expect(wranglerConfig({ name: 'campus', bucket: null })).not.toMatch(/send_email|NODEGX_ALERT/);
    expect(emailProblem('--alert-to', 'owner@example.com')).toBeNull();
    for (const bad of ['owner', 'Owner <owner@example.com>', 'owner@localhost', 'a b@example.com']) expect(emailProblem('--alert-to', bad)).toMatch(/not an email address/);
  });
});

describe('the front Worker (front.ts): a backend that cannot answer', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handleRequest } = require('../cloudflare/front') as typeof import('../cloudflare/front');
  const FILES: Record<string, string> = { '/': '<html>app</html>', '/noodl.deploy.js': 'engine' };
  const ASSETS = {
    async fetch(r: Request) {
      const p = new URL(r.url).pathname;
      return p in FILES ? new Response(FILES[p], { status: 200 }) : new Response('nope', { status: 404 });
    }
  };
  function front(backendThrows: string | null, familiesFail = false) {
    const waited: Array<Promise<unknown>> = [];
    const { env, sent } = mailer();
    const deps = {
      env: { ...env, ASSETS, NODEGX_ADMIN_TOKEN: 'admin-secret' },
      backend: {
        async fetch() {
          if (backendThrows) throw new Error(backendThrows);
          return Response.json({ results: [] });
        }
      },
      families: async () => {
        if (familiesFail) throw new Error('route families: refused');
        return new Set(['classes', 'users']);
      },
      waitUntil: (p: Promise<unknown>) => waited.push(p),
      appId: 'campus',
      cache: mapCache()
    };
    return { call: (path: string, init?: RequestInit) => handleRequest(new Request(`https://campus.my-hearth.org${path}`, init), deps), waited, sent };
  }

  test('control: a backend that answers is passed through, nothing told', async () => {
    const f = front(null);
    const r = await f.call('/classes/Reader');
    expect(r.status).toBe(200);
    expect(f.waited).toHaveLength(0);
  });

  test('a data call the object refuses: the sentence in the page, the email after the answer', async () => {
    const f = front('Exceeded allowed rows written');
    const r = await f.call('/classes/Answer', { method: 'POST', body: '{}' });
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toMatch(/allowance for today/);
    await Promise.all(f.waited);
    expect(f.sent).toHaveLength(1);
    expect(String(f.sent[0].text)).toMatch(/Cloudflare's own words: "Exceeded allowed rows written"/);
  });

  test('the object cannot answer at all: the page and its files still load; a backend path says why', async () => {
    const f = front('Durable Object reset because its code was updated or exceeded a limit', true);
    expect(await (await f.call('/home', { headers: { accept: 'text/html,application/xhtml+xml', 'sec-fetch-mode': 'navigate' } })).text()).toBe('<html>app</html>');
    expect(await (await f.call('/noodl.deploy.js')).text()).toBe('engine');
    const data = await f.call('/classes/Reader');
    expect(data.status).toBe(503);
    expect(data.headers.get('x-nodegx-refusal')).toBe('daily-allowance');
  });

  test('the alert test door answers only the admin credential (else it does not exist)', async () => {
    const f = front(null);
    expect((await f.call('/__nodegx/alert-test', { method: 'POST' })).status).toBe(404);
    expect((await f.call('/__nodegx/alert-test', { method: 'POST', headers: { authorization: 'Bearer wrong-secret!' } })).status).toBe(404);
    const ok = await f.call('/__nodegx/alert-test', { method: 'POST', headers: { authorization: 'Bearer admin-secret' } });
    expect(await ok.json()).toMatchObject({ ok: true, via: 'cloudflare' });
    expect(String(f.sent[0].subject)).toMatch(/will tell you here/);
  });
});
