/**
 * P115 HST-018 — the app's own domain, found and bought by Claude on the person's Cloudflare account.
 *
 *   node packages/nodegx-backend/cloudflare/domain.mjs find <idea words…>        names that are free, with their prices
 *   node packages/nodegx-backend/cloudflare/domain.mjs check <name…>              the authoritative answer, ≤ 20 names
 *   node packages/nodegx-backend/cloudflare/domain.mjs buy <name> [--confirm "<name> <cost> <currency>"] [--no-auto-renew]
 *   node packages/nodegx-backend/cloudflare/domain.mjs status <name>
 *   node packages/nodegx-backend/cloudflare/domain.mjs email <domain> [--to <the person's address>]
 *
 * `buy` without `--confirm` only checks and prints the sentence the person says yes to; with it, it checks AGAIN and
 * buys only when the confirmation repeats that check word for word (`registrar.ts` `buyProblem`). Auto-renew is on
 * unless `--no-auto-renew`: an app whose name lapses after a year stops working, and a non-technical owner would not
 * know why.
 *
 * `email` sets up what HST-017's refusal email needs, with the deploy's own `wrangler login` (which can, measured:
 * `email_sending:write`, `email_routing:write`; it cannot buy): `wrangler email sending enable <domain>`, then
 * `wrangler email routing addresses create <to>` (Cloudflare emails the person a link to click: the one human step).
 *
 * Credentials, in order (none is ever printed): `CLOUDFLARE_API_TOKEN`; **NodeGX's own Cloudflare sign-in** (P135
 * ODT-001, `signIn.ts`: one browser Allow from Claude Desktop, kept in `~/.nodegx/cloudflare/sign-in.json`) when its grant
 * includes `registrar-domains.admin`; **the person's sign-in to Cloudflare's own CLI**
 * (`cf auth login`, a browser OAuth sign-in whose grant includes `registrar:write` / `registrar-domains.admin`: measured
 * on Richard's account 2026-11-07, HST-018 §5), read from where `cf` keeps it; then an API token in
 * `~/.nodegx/cloudflare/registrar-token` (mode 600). Wrangler's login cannot buy (no registrar scope).
 * The account is `--account <id>`, `CLOUDFLARE_ACCOUNT_ID`, or the one account the token can see.
 * Each purchase is written to `~/.nodegx/cloudflare/domains.json`.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { cloudflareAccessToken, readSignIn } from './signIn';
import {
  buyProblem,
  checkDomains,
  confirmationFor,
  getRegistration,
  offerLine,
  registerDomain,
  registrationSentence,
  registrationStatus,
  RegistrarError,
  searchDomains,
  waitForRegistration,
  type CfCall
} from './registrar';
import { domainProblem, emailProblem } from './wranglerConfig';

const say = (line = '') => process.stdout.write(line + '\n');
class CommandError extends Error {}

const USAGE = `usage: domain.mjs find <idea words…>
       domain.mjs check <name…>
       domain.mjs buy <name> [--confirm "<name> <cost> <currency>"] [--no-auto-renew]
       domain.mjs status <name>
       domain.mjs email <domain> [--to <address>]
  options: --account <id>`;

function home(): string {
  return process.env.NODEGX_CLOUDFLARE_HOME || path.join(os.homedir(), '.nodegx', 'cloudflare');
}

/** Where `cf` keeps its sign-in (`cf auth whoami` names it; macOS measured, the others by the same convention). */
export function cfLoginFiles(): string[] {
  const h = os.homedir();
  return [
    process.env.NODEGX_CF_LOGIN_FILE,
    path.join(h, 'Library', 'Preferences', 'cloudflare', 'config', 'default.json'),
    process.env.XDG_CONFIG_HOME ? path.join(process.env.XDG_CONFIG_HOME, 'cloudflare', 'config', 'default.json') : undefined,
    path.join(h, '.config', 'cloudflare', 'config', 'default.json'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'cloudflare', 'config', 'default.json') : undefined
  ].filter((p): p is string => !!p);
}

interface CfLogin {
  oauth_token?: string;
  expiration_time?: string;
  scopes?: string[];
}

function readCfLogin(): { file: string; login: CfLogin } | null {
  for (const file of cfLoginFiles()) {
    if (!fs.existsSync(file)) continue;
    try {
      return { file, login: JSON.parse(fs.readFileSync(file, 'utf8')) as CfLogin };
    } catch {
      /* not this one */
    }
  }
  return null;
}

/** The person's `cf` sign-in, refreshed once through `cf` when it has expired; null when there is none. */
export function cfLoginToken(now = Date.now(), refresh: () => void = () => void spawnSync('cf', ['auth', 'whoami', '--quiet'], { encoding: 'utf8', timeout: 60_000 })): string | null {
  let found = readCfLogin();
  if (!found?.login.oauth_token) return null;
  const expired = (l: CfLogin) => !l.expiration_time || Date.parse(l.expiration_time) - 60_000 < now;
  if (expired(found.login)) {
    refresh();
    found = readCfLogin();
    if (!found?.login.oauth_token || expired(found.login)) {
      throw new CommandError('Your Cloudflare sign-in has expired: run `cf auth login` (a browser sign-in), then ask again.');
    }
  }
  const scopes = found.login.scopes ?? [];
  if (scopes.length && !scopes.some((s) => s === 'registrar:write' || s === 'registrar-domains.admin')) {
    throw new CommandError('Your Cloudflare sign-in does not allow buying domains: run `cf auth login --force` and allow Registrar.');
  }
  return found.login.oauth_token;
}

export function readToken(): string {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const signedIn = cfLoginToken();
  if (signedIn) return signedIn;
  const file = path.join(home(), 'registrar-token');
  if (fs.existsSync(file)) {
    const mode = fs.statSync(file).mode & 0o077;
    if (mode) throw new CommandError(`${file} can be read by other users of this computer: run \`chmod 600 ${file}\` first.`);
    return fs.readFileSync(file, 'utf8').trim();
  }
  throw new CommandError(
    'Finding and buying a domain needs you signed in to Cloudflare once: `npm i -g cf`, then `cf auth login` (a browser\n' +
      'sign-in; no key to make or save). The account also needs a default card (Billing) and a default registrant contact\n' +
      `(Domain Registration), once. (An API token with Registrar · Edit in ${file}, chmod 600, works too.)`
  );
}

/**
 * P135 ODT-001 — the credential for a domain call: an explicit token first, then NodeGX's own sign-in when it was
 * granted the registrar (refreshed if it is about to run out), then {@link readToken}'s `cf` sign-in and token file.
 */
export async function domainCredential(): Promise<string> {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const ours = readSignIn();
  if (ours && ours.scopes.includes('registrar-domains.admin')) {
    const token = await cloudflareAccessToken();
    if (token) return token;
  }
  return readToken();
}

export function cfCaller(token: string, apiBase = process.env.NODEGX_CF_API || 'https://api.cloudflare.com/client/v4'): CfCall {
  return async (method, p, body, headers = {}) => {
    const res = await fetch(apiBase + p, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* not JSON */
    }
    return { status: res.status, json };
  };
}

export async function accountOf(call: CfCall, given?: string): Promise<string> {
  if (given) return given;
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const r = await call('GET', '/accounts?per_page=50');
  const accounts = (r.json?.result ?? []) as Array<{ id: string; name: string }>;
  if (r.status >= 300 || !accounts.length) throw new CommandError(`The token sees no Cloudflare account (${r.status}): give it Account · Account Settings · Read, or pass --account <id>.`);
  if (accounts.length > 1) throw new CommandError(`The token sees ${accounts.length} accounts; choose one with --account:\n${accounts.map((a) => `  ${a.id}  ${a.name}`).join('\n')}`);
  return accounts[0].id;
}

function wrangler(args: string[]): { status: number; out: string } {
  const pre = process.env.NODEGX_WRANGLER ? [process.execPath, process.env.NODEGX_WRANGLER] : ['npx', '--yes', 'wrangler@4'];
  const run = spawnSync(pre[0], [...pre.slice(1), ...args], { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  return { status: run.status ?? 1, out: `${run.stdout || ''}${run.stderr || ''}`.trim() };
}

function remember(entry: Record<string, unknown>): void {
  const file = path.join(home(), 'domains.json');
  fs.mkdirSync(home(), { recursive: true });
  const list = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as unknown[]) : [];
  list.push(entry);
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
}

export interface ParsedArgs {
  verb: string;
  rest: string[];
  confirm?: string;
  autoRenew: boolean;
  account?: string;
  to?: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [verb = '', ...tail] = argv;
  const o: ParsedArgs = { verb, rest: [], autoRenew: true };
  for (let i = 0; i < tail.length; i++) {
    const a = tail[i];
    const next = () => {
      const v = tail[++i];
      if (v === undefined) throw new CommandError(`${a} needs a value.\n${USAGE}`);
      return v;
    };
    if (a === '--confirm') o.confirm = next();
    else if (a === '--no-auto-renew') o.autoRenew = false;
    else if (a === '--account') o.account = next();
    else if (a === '--to') o.to = next();
    else if (a.startsWith('--')) throw new CommandError(`${a} is not an option.\n${USAGE}`);
    else o.rest.push(a);
  }
  if (!['find', 'check', 'buy', 'status', 'email'].includes(verb) || !o.rest.length) throw new CommandError(USAGE);
  return o;
}

const bare = (n: string) => {
  const name = n.trim().toLowerCase();
  const bad = domainProblem(name);
  if (bad) throw new CommandError(bad);
  return name;
};

export async function run(o: ParsedArgs, call?: CfCall): Promise<number> {
  if (o.verb === 'email') {
    const domain = bare(o.rest[0]);
    if (o.to && emailProblem('--to', o.to)) throw new CommandError(emailProblem('--to', o.to)!);
    const sending = wrangler(['email', 'sending', 'enable', domain]);
    say(sending.status === 0 || /already/i.test(sending.out) ? `Email sending is on for ${domain} (Cloudflare adds its records itself; 5–15 minutes).` : `Email sending could not be turned on for ${domain}:\n${sending.out}`);
    if (o.to) {
      const addr = wrangler(['email', 'routing', 'addresses', 'create', o.to]);
      say(addr.status === 0 || /already/i.test(addr.out) ? `Cloudflare is emailing ${o.to} a link: the person clicks it once, and the app's alerts can reach them.` : `${o.to} could not be added:\n${addr.out}`);
    }
    return sending.status === 0 ? 0 : 1;
  }

  // Every name is checked before anything is asked of Cloudflare.
  const names = o.verb === 'find' ? [] : o.rest.map(bare);
  const c = call ?? cfCaller(await domainCredential());
  const account = await accountOf(c, o.account);

  if (o.verb === 'find') {
    const offers = await searchDomains(c, account, o.rest.join(' '));
    if (!offers.length) say('Cloudflare suggested nothing for those words: try other words, or check names with `check`.');
    for (const x of offers) say(offerLine(x));
    say('\nIdeas only: `check` a name right before buying it.');
    return 0;
  }
  if (o.verb === 'check') {
    for (const x of await checkDomains(c, account, names)) say(offerLine(x));
    return 0;
  }
  if (o.verb === 'status') {
    say(registrationSentence(await registrationStatus(c, account, names[0])));
    return 0;
  }

  // buy
  const name = names[0];
  const [fresh] = await checkDomains(c, account, [name]);
  const problem = buyProblem(name, fresh, o.confirm);
  if (problem) {
    say(problem);
    if (fresh?.registrable && fresh.pricing && !o.confirm) {
      say(o.autoRenew ? `It renews automatically at ${fresh.pricing.renewal_cost} ${fresh.pricing.currency} a year (--no-auto-renew to turn that off).` : 'It will NOT renew by itself.');
    }
    return o.confirm ? 1 : 0;
  }
  say(`Buying ${confirmationFor(fresh!)} on the account's default card…`);
  const first = await registerDomain(c, account, name, { autoRenew: o.autoRenew });
  let reg = await waitForRegistration(c, account, first);
  if (reg.state === 'succeeded') {
    // The canonical record says how long it is theirs and whether it renews (the registration answer may not).
    const held = await getRegistration(c, account, name).catch(() => null);
    if (held) reg = { ...reg, context: { registration: { ...reg.context?.registration, expires_at: held.expires_at, auto_renew: held.auto_renew, status: held.status } } };
  }
  say(registrationSentence(reg));
  remember({ name, at: new Date().toISOString(), account, offer: fresh, state: reg.state, autoRenew: o.autoRenew });
  if (reg.state === 'succeeded') {
    say(`\nNext: \`domain.mjs email ${name} --to <your address>\`, then deploy with --domain <name or app.${name}> --alert-to … --alert-from alerts@${name}.`);
  }
  return reg.state === 'succeeded' ? 0 : 1;
}

export async function main(argv: string[]): Promise<number> {
  try {
    return await run(parseArgs(argv));
  } catch (e) {
    if (e instanceof CommandError || e instanceof RegistrarError) {
      process.stderr.write(`\n${(e as Error).message}\n`);
      return 1;
    }
    throw e;
  }
}
