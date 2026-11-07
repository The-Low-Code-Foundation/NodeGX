/**
 * P115 HST-018 — Claude finds and buys the app's domain on the person's Cloudflare account (`cloudflare/registrar.ts`,
 * `cloudflare/domainCommand.ts`), graded against a scripted Registrar API that records every request.
 *
 * The property that matters is money: a registration request is SENT only after a fresh check, and only when the
 * confirmation repeats that check's name and first-year price word for word. Every refusal below is asserted by the
 * absence of a POST to `/registrations` in the recorded calls, beside the control that does send one.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { accountOf, parseArgs, readToken, run } from '../cloudflare/domainCommand';
import { buyProblem, offerLine, type CfCall, type DomainOffer } from '../cloudflare/registrar';

const ACC = 'acc123';
const OFFER = (name: string, cost = '10.11', extra: Partial<DomainOffer> = {}): DomainOffer => ({
  name,
  registrable: true,
  tier: 'standard',
  pricing: { currency: 'USD', registration_cost: cost, renewal_cost: cost },
  ...extra
});

/** A scripted Cloudflare: `offers` by name, a registration that is 202 then succeeds after `pollsUntilDone` polls. */
function fakeCloudflare(opts: { offers: Record<string, DomainOffer>; pollsUntilDone?: number; endState?: string; accounts?: number }) {
  const calls: Array<{ method: string; path: string; body?: any }> = [];
  let polls = 0;
  const ok = (result: unknown, status = 200) => ({ status, json: { success: true, errors: [], result } });
  const call: CfCall = async (method, p, body) => {
    calls.push({ method, path: p, body });
    if (p.startsWith('/accounts?')) return ok(Array.from({ length: opts.accounts ?? 1 }, (_, i) => ({ id: i ? `acc${i}` : ACC, name: `Account ${i}` })));
    if (p.endsWith('/registrar/domain-check')) return ok({ domains: (body as { domains: string[] }).domains.map((n) => opts.offers[n] ?? { name: n, registrable: false, reason: 'domain_unavailable' }) });
    if (p.includes('/registrar/domain-search')) return ok({ domains: Object.values(opts.offers) });
    if (method === 'POST' && p.endsWith('/registrar/registrations')) return ok({ domain_name: (body as { domain_name: string }).domain_name, state: 'in_progress', completed: false }, 202);
    if (p.endsWith('/registration-status')) {
      polls++;
      const name = decodeURIComponent(p.split('/registrations/')[1].split('/')[0]);
      if (polls < (opts.pollsUntilDone ?? 1)) return ok({ domain_name: name, state: 'in_progress' });
      const state = opts.endState ?? 'succeeded';
      return ok({ domain_name: name, state, completed: state === 'succeeded', error: state === 'action_required' ? { code: 'contact_verification', message: 'verify the registrant email' } : undefined, context: { registration: { expires_at: '2027-11-07T12:00:00Z', auto_renew: true } } });
    }
    return { status: 404, json: { success: false, errors: [{ code: 7000, message: 'No route' }] } };
  };
  const bought = () => calls.filter((c) => c.method === 'POST' && c.path.endsWith('/registrations'));
  return { call, calls, bought };
}

let out: string[] = [];
let home: string;
beforeEach(() => {
  out = [];
  jest.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => (out.push(String(s)), true));
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'hst018-'));
  process.env.NODEGX_CLOUDFLARE_HOME = home;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});
const said = () => out.join('');
// The poll waits 2 s by default; the command's own wait is real time, so these runs use a fake that answers at once.
jest.setTimeout(20000);

describe('buying: money moves only on a confirmation of a fresh check', () => {
  test('control: the person said yes to exactly the offer, so it is bought, polled, and recorded', async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org') }, pollsUntilDone: 1 });
    const code = await run(parseArgs(['buy', 'my-hearth.org', '--confirm', 'my-hearth.org 10.11 USD']), cf.call);
    expect(code).toBe(0);
    expect(cf.bought()).toHaveLength(1);
    expect(cf.bought()[0].body).toEqual({ domain_name: 'my-hearth.org', auto_renew: true });
    // The check came right before the purchase.
    const i = cf.calls.findIndex((c) => c.path.endsWith('/registrations'));
    expect(cf.calls[i - 1].path).toMatch(/domain-check$/);
    expect(said()).toMatch(/my-hearth\.org is yours until 2027-11-07, renewed automatically each year/);
    expect(said()).toMatch(/domain\.mjs email my-hearth\.org --to/);
    expect(JSON.parse(fs.readFileSync(path.join(home, 'domains.json'), 'utf8'))[0]).toMatchObject({ name: 'my-hearth.org', state: 'succeeded' });
  });

  test('no confirmation: only the offer and the sentence to say yes to; nothing bought', async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org') } });
    expect(await run(parseArgs(['buy', 'my-hearth.org']), cf.call)).toBe(0);
    expect(cf.bought()).toHaveLength(0);
    expect(said()).toMatch(/--confirm "my-hearth\.org 10\.11 USD"/);
    expect(said()).toMatch(/cannot be refunded/);
    expect(said()).toMatch(/renews automatically at 10\.11 USD a year/);
  });

  test('the price moved since the person said yes: nothing bought, the new offer named', async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org', '10.44') } });
    expect(await run(parseArgs(['buy', 'my-hearth.org', '--confirm', 'my-hearth.org 10.11 USD']), cf.call)).toBe(1);
    expect(cf.bought()).toHaveLength(0);
    expect(said()).toMatch(/is not today's offer "my-hearth\.org 10\.44 USD"/);
  });

  test("a confirmation for another name: nothing bought", async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org'), 'my-hearth.io': OFFER('my-hearth.io', '10.11') } });
    expect(await run(parseArgs(['buy', 'my-hearth.org', '--confirm', 'my-hearth.io 10.11 USD']), cf.call)).toBe(1);
    expect(cf.bought()).toHaveLength(0);
  });

  test("taken, or an ending the API beta cannot sell: nothing bought, and the person is told why", async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.uk': { name: 'my-hearth.uk', registrable: false, reason: 'extension_not_supported_via_api' } } });
    expect(await run(parseArgs(['buy', 'my-hearth.uk', '--confirm', 'my-hearth.uk 10.11 USD']), cf.call)).toBe(1);
    expect(await run(parseArgs(['buy', 'my-hearth.com', '--confirm', 'my-hearth.com 10.11 USD']), cf.call)).toBe(1);
    expect(cf.bought()).toHaveLength(0);
    expect(said()).toMatch(/my-hearth\.uk: not available \(Cloudflare's API cannot register this ending yet/);
    expect(said()).toMatch(/my-hearth\.com: not available \(it is already registered by someone\)/);
  });

  test('Cloudflare needs something from the person: polling stops and says what', async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org') }, endState: 'action_required' });
    expect(await run(parseArgs(['buy', 'my-hearth.org', '--confirm', 'my-hearth.org 10.11 USD']), cf.call)).toBe(1);
    expect(said()).toMatch(/Cloudflare needs something from the person before my-hearth\.org is theirs: verify the registrant email/);
  });

  test('--no-auto-renew is sent, and the person is warned it will lapse', async () => {
    const cf = fakeCloudflare({ offers: { 'x-y.org': OFFER('x-y.org') } });
    await run(parseArgs(['buy', 'x-y.org', '--confirm', 'x-y.org 10.11 USD', '--no-auto-renew']), cf.call);
    expect(cf.bought()[0].body).toEqual({ domain_name: 'x-y.org', auto_renew: false });
  });

  test('buyProblem: spacing in the confirmation does not matter; the words do', () => {
    expect(buyProblem('a.org', OFFER('a.org'), '  a.org   10.11 USD ')).toBeNull();
    expect(buyProblem('a.org', OFFER('a.org'), 'a.org 10.11 EUR')).toMatch(/not today's offer/);
  });
});

describe('finding and the credentials', () => {
  test('find lists ideas with both prices; check says why one is not available', async () => {
    const cf = fakeCloudflare({ offers: { 'my-hearth.org': OFFER('my-hearth.org'), 'my-hearth.io': OFFER('my-hearth.io', '45.00') } });
    await run(parseArgs(['find', 'my', 'hearth']), cf.call);
    expect(said()).toMatch(/my-hearth\.io: available, 45\.00 USD the first year, then 45\.00 USD a year/);
    expect(cf.calls.some((c) => c.path.includes('domain-search?q=my%20hearth'))).toBe(true);
    expect(offerLine({ name: 'a.app', registrable: true, tier: 'premium', pricing: { currency: 'USD', registration_cost: '900', renewal_cost: '20' } })).toMatch(/\(premium\)/);
  });

  test('the account: the one the token sees, or a refusal listing several', async () => {
    expect(await accountOf(fakeCloudflare({ offers: {} }).call)).toBe(ACC);
    await expect(accountOf(fakeCloudflare({ offers: {}, accounts: 2 }).call)).rejects.toThrow(/sees 2 accounts; choose one with --account/);
  });

  test('the token: a file others can read is refused; none says how to make one', () => {
    expect(() => readToken()).toThrow(/Registrar · Edit/);
    const file = path.join(home, 'registrar-token');
    fs.writeFileSync(file, 'tok\n', { mode: 0o644 });
    fs.chmodSync(file, 0o644);
    expect(() => readToken()).toThrow(/chmod 600/);
    fs.chmodSync(file, 0o600);
    expect(readToken()).toBe('tok');
  });

  test('a name that is not a bare domain is refused before any call', async () => {
    const cf = fakeCloudflare({ offers: {} });
    await expect(run(parseArgs(['check', 'https://my-hearth.org']), cf.call)).rejects.toThrow(/cannot be a domain/);
    expect(cf.calls).toHaveLength(0);
  });
});
