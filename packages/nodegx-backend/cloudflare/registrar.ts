/**
 * P115 HST-018 — find and buy the app's domain on the person's own Cloudflare account, through Cloudflare's Registrar
 * API (beta since 2026-04-15: search, check, register at cost; the account's default card is charged).
 *
 * The rule Cloudflare's docs give an agent, and the one this module enforces in code rather than in a prompt: **check
 * right before registering, show the name and the price, and register only after the person said yes to exactly that
 * name and that price.** `buyProblem` refuses a purchase whose confirmation does not repeat the fresh check word for
 * word (`<name> <first-year cost> <currency>`), so a price that moved, a typo'd name, or a confirmation copied from
 * another name never spends money. A registration is non-refundable.
 *
 * Endpoints (developers.cloudflare.com/registrar/registrar-api, read 2026-11-07), under /accounts/<id>/registrar/:
 *   GET  domain-search?q=&limit=            ideas, with `registrable` and `pricing`
 *   POST domain-check {domains: [≤20]}      the authoritative answer, right before buying
 *   POST registrations {domain_name, …}     201 done, or 202 in progress
 *   GET  registrations/<name>/registration-status   in_progress | succeeded | failed | action_required | blocked
 *
 * Transport-free (`CfCall`), so jest grades it against a scripted API.
 */

export interface CfAnswer {
  status: number;
  json: any;
}
export type CfCall = (method: string, path: string, body?: unknown, headers?: Record<string, string>) => Promise<CfAnswer>;

export interface DomainOffer {
  name: string;
  registrable: boolean;
  /** Present when it cannot be registered: domain_unavailable, extension_not_supported_via_api, … */
  reason?: string;
  tier?: string;
  pricing?: { currency: string; registration_cost: string; renewal_cost: string };
}

export class RegistrarError extends Error {}

/** Cloudflare's envelope: `{ success, errors: [{code, message}], result }`. */
function unwrap(answer: CfAnswer, what: string): any {
  if (answer.status >= 300 || answer.json?.success === false) {
    const errs = (answer.json?.errors ?? []).map((e: { code?: number; message?: string }) => `${e.code ?? ''} ${e.message ?? ''}`.trim());
    throw new RegistrarError(`${what} answered ${answer.status}${errs.length ? `: ${errs.join('; ')}` : ''}`);
  }
  return answer.json?.result;
}

const base = (account: string) => `/accounts/${encodeURIComponent(account)}/registrar`;

export async function searchDomains(call: CfCall, account: string, q: string, limit = 20): Promise<DomainOffer[]> {
  const r = unwrap(await call('GET', `${base(account)}/domain-search?q=${encodeURIComponent(q)}&limit=${limit}`), 'The domain search');
  return r?.domains ?? [];
}

export async function checkDomains(call: CfCall, account: string, names: string[]): Promise<DomainOffer[]> {
  if (!names.length) return [];
  if (names.length > 20) throw new RegistrarError('Cloudflare checks at most 20 names at a time.');
  const r = unwrap(await call('POST', `${base(account)}/domain-check`, { domains: names }), 'The domain check');
  return r?.domains ?? [];
}

/** The sentence the person says yes to, and must be repeated to buy. */
export function confirmationFor(offer: DomainOffer): string {
  return `${offer.name} ${offer.pricing!.registration_cost} ${offer.pricing!.currency}`;
}

const REASONS: Record<string, string> = {
  domain_unavailable: 'it is already registered by someone',
  extension_not_supported_via_api: "Cloudflare's API cannot register this ending yet (its beta covers some endings); it can be bought in the dashboard, or try another ending",
  extension_not_supported: 'Cloudflare does not sell this ending',
  extension_disallows_registration: 'this ending does not allow registration',
  domain_premium: "it is a premium name, which Cloudflare's API does not sell (the dashboard may)"
};

/** One line a person reads, for a table of ideas or a check. */
export function offerLine(o: DomainOffer): string {
  if (!o.registrable) return `${o.name}: not available (${REASONS[o.reason ?? ''] ?? o.reason ?? 'no reason given'})`;
  const p = o.pricing;
  return `${o.name}: available, ${p ? `${p.registration_cost} ${p.currency} the first year, then ${p.renewal_cost} ${p.currency} a year` : 'price not given'}${o.tier && o.tier !== 'standard' ? ` (${o.tier})` : ''}`;
}

/** Why this purchase must not happen, or null. `fresh` is a check made just now for `name`. */
export function buyProblem(name: string, fresh: DomainOffer | undefined, confirm: string | undefined): string | null {
  if (!fresh) return `Cloudflare did not answer for ${name}: nothing was bought.`;
  if (!fresh.registrable) return `${offerLine(fresh)}. Nothing was bought.`;
  if (!fresh.pricing) return `Cloudflare gave no price for ${name}: nothing was bought.`;
  // Cloudflare's own workflow: "If tier: premium, … do not proceed to POST /registrations."
  if (fresh.tier === 'premium') return `${name} is a premium name, which Cloudflare's API does not sell: nothing was bought.`;
  const expected = confirmationFor(fresh);
  if (!confirm) {
    return `${offerLine(fresh)}.\nTo buy it, the person must say yes to exactly this, and the command is run again with --confirm "${expected}". It is charged to the account's default card and cannot be refunded.`;
  }
  if (confirm.trim().replace(/\s+/g, ' ') !== expected) {
    return `The confirmation "${confirm}" is not today's offer "${expected}" (the price or the name differ). Show the person the new offer; nothing was bought.`;
  }
  return null;
}

export type RegistrationState = 'in_progress' | 'succeeded' | 'failed' | 'action_required' | 'blocked';

export interface Registration {
  domain_name: string;
  state: RegistrationState;
  completed?: boolean;
  error?: { code?: string; message?: string };
  context?: { registration?: { expires_at?: string; auto_renew?: boolean; status?: string } };
}

export async function registerDomain(
  call: CfCall,
  account: string,
  name: string,
  options: { autoRenew: boolean }
): Promise<Registration> {
  const r = unwrap(await call('POST', `${base(account)}/registrations`, { domain_name: name, auto_renew: options.autoRenew }), 'The registration');
  // Measured on the first real purchase (2026-11-07): a registration that completes at once did not carry
  // `domain_name` where the docs show it, and the person read "undefined is yours". The name is the one we asked for.
  return { ...r, domain_name: r?.domain_name ?? r?.context?.registration?.domain_name ?? name, state: r?.state ?? (r?.completed ? 'succeeded' : 'in_progress') };
}

/** The canonical record of a domain the account owns (`status`, `expires_at`, `auto_renew`, `privacy_mode`, `locked`). */
export async function getRegistration(call: CfCall, account: string, name: string): Promise<{ domain_name: string; status?: string; expires_at?: string; auto_renew?: boolean }> {
  return unwrap(await call('GET', `${base(account)}/registrations/${encodeURIComponent(name)}`), 'The registration record');
}

export async function registrationStatus(call: CfCall, account: string, name: string): Promise<Registration> {
  return unwrap(await call('GET', `${base(account)}/registrations/${encodeURIComponent(name)}/registration-status`), 'The registration status');
}

/** Poll until the registration leaves `in_progress` (Cloudflare: stop on action_required and failed), or time is up. */
export async function waitForRegistration(
  call: CfCall,
  account: string,
  first: Registration,
  options: { everyMs?: number; forMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<Registration> {
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  let reg = first;
  const until = Date.now() + (options.forMs ?? 120_000);
  while (reg.state === 'in_progress' && Date.now() < until) {
    await sleep(options.everyMs ?? 2000);
    reg = await registrationStatus(call, account, first.domain_name);
  }
  return reg;
}

/** What the person is told about where a registration ended. */
export function registrationSentence(reg: Registration): string {
  switch (reg.state) {
    case 'succeeded': {
      const exp = reg.context?.registration?.expires_at?.slice(0, 10);
      const renew = reg.context?.registration?.auto_renew;
      return `${reg.domain_name} is yours${exp ? ` until ${exp}` : ''}${renew === true ? ', renewed automatically each year' : renew === false ? ' (it does NOT renew by itself: turn on auto-renew in the dashboard, or it stops working when it expires)' : ''}.`;
    }
    case 'in_progress':
      return `${reg.domain_name} is still being registered: ask again in a minute (status ${reg.domain_name}).`;
    case 'action_required':
      return `Cloudflare needs something from the person before ${reg.domain_name} is theirs: ${reg.error?.message ?? 'see Domain Registration in the dashboard'}.`;
    default:
      return `${reg.domain_name} was not registered (${reg.state}${reg.error ? `: ${reg.error.code ?? ''} ${reg.error.message ?? ''}`.trimEnd() : ''}).`;
  }
}
