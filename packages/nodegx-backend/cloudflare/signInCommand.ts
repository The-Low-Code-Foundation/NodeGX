/**
 * P135 ODT-000 / ODT-001 — the Cloudflare sign-in from a terminal, to MEASURE what the connector's
 * `cloudflare_sign_in` will meet (the same `signIn.ts`, the same file), on a private OAuth client on the person's own
 * account.
 *
 *   NODEGX_CLOUDFLARE_CLIENT_ID=<client id> node packages/nodegx-backend/cloudflare/sign-in.mjs sign-in [--port <n>] [--host localhost] [--scopes a,b]
 *   node packages/nodegx-backend/cloudflare/sign-in.mjs status        what is saved (no token printed)
 *   node packages/nodegx-backend/cloudflare/sign-in.mjs refresh       renews once now: (d) does a refresh work, does it rotate
 *   node packages/nodegx-backend/cloudflare/sign-in.mjs probe [--domain <name>]   read-only API calls with the sign-in: (b), (c) reads
 *   node packages/nodegx-backend/cloudflare/sign-in.mjs probe-writes [--zone <name>]   (c) writes + (e): a throwaway Worker, then deleted (probeWrites.ts)
 *   node packages/nodegx-backend/cloudflare/sign-in.mjs sign-out
 *
 * Every reading is appended to `~/.nodegx/cloudflare/odt000-readings.json` (0600) with its time, and never holds a
 * token: a session reads that file to write ODT-000 up. Nothing here writes to Cloudflare except the sign-in itself,
 * the refresh, the sign-out's revoke, and `probe-writes` (a Worker, a bucket and a domain it makes and then deletes).
 *
 * @module nodegx-backend/cloudflare/signInCommand
 */
import { spawn } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { probeWrites } from './probeWrites';
import {
  CLOUDFLARE_SCOPES,
  cloudflareAccessToken,
  cloudflareClientId,
  cloudflareHome,
  missingScopes,
  oauthSettings,
  readSignIn,
  signOut,
  startSignIn,
  summarize
} from './signIn';

const API = () => process.env.NODEGX_CF_API || 'https://api.cloudflare.com/client/v4';
const say = (s: string) => process.stdout.write(s + '\n');

/** A token's fingerprint, so a reading can say "the refresh token changed" without holding either. */
const fp = (t: string | undefined) => (t ? crypto.createHash('sha256').update(t).digest('hex').slice(0, 12) : null);

function record(kind: string, reading: Record<string, unknown>): void {
  const file = path.join(cloudflareHome(), 'odt000-readings.json');
  let all: unknown[] = [];
  try {
    all = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    /* first */
  }
  all.push({ at: new Date().toISOString(), kind, ...reading });
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(all, null, 2) + '\n', { mode: 0o600 });
  say(`(reading saved to ${file})`);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function openBrowser(url: string): void {
  if (process.env.NODEGX_STUDIO_NO_OPEN) return; // a test: never a real browser
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* the address is printed anyway */
  }
}

async function signInVerb(argv: string[]): Promise<number> {
  const clientId = cloudflareClientId();
  if (!clientId) {
    say('Set NODEGX_CLOUDFLARE_CLIENT_ID to the private OAuth client\'s id (Manage Account → OAuth clients) and run this again.');
    return 2;
  }
  const settings = oauthSettings();
  const port = flag(argv, '--port');
  const host = flag(argv, '--host') === 'localhost' ? 'localhost' : '127.0.0.1';
  const scopes = flag(argv, '--scopes')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [...CLOUDFLARE_SCOPES];
  const flow = await startSignIn({ clientId, ...settings, port: port !== undefined ? Number(port) : settings.port, redirectHost: host, scopes });
  say(`Opening Cloudflare's page. If it does not open, paste this into the browser:\n\n${flow.url}\n`);
  say(`Waiting for Cloudflare's answer on ${flow.redirectUri} (10 minutes).`);
  say('If Cloudflare shows an error page instead of a consent page, copy its words here: that is reading (a) or (b).');
  openBrowser(flow.url);
  const base = { clientIdTail: clientId.slice(-6), redirectUri: flow.redirectUri, asked: scopes };
  try {
    const s = await flow.done;
    const granted = s.scopes;
    const missing = missingScopes(s, scopes);
    const lifetimeS = Math.round((Date.parse(s.expiresAt) - Date.parse(s.signedInAt)) / 1000);
    say(`\nSigned in. Redirect accepted: ${flow.redirectUri}`);
    say(`Granted (${granted.length}): ${granted.join(' ')}`);
    say(missing.length ? `NOT granted: ${missing.join(' ')}` : 'Every scope asked for was granted.');
    say(`Access token lifetime: ${lifetimeS} s. Refresh token: ${s.refreshToken ? 'yes' : 'NO'}.`);
    record('sign-in', { ...base, ok: true, granted, missing, accessLifetimeS: lifetimeS, refreshToken: !!s.refreshToken, refreshFp: fp(s.refreshToken) });
    return 0;
  } catch (e) {
    say(`\nNot signed in: ${(e as Error).message}`);
    record('sign-in', { ...base, ok: false, error: (e as Error).message, code: (e as any).code });
    return 1;
  }
}

async function refreshVerb(): Promise<number> {
  const before = readSignIn();
  if (!before) return say('Not signed in: run sign-in first.'), 1;
  try {
    await cloudflareAccessToken({ ...oauthSettings(), force: true });
  } catch (e) {
    say(`The refresh failed: ${(e as Error).message}`);
    record('refresh', { ok: false, error: (e as Error).message });
    return 1;
  }
  const after = readSignIn()!;
  const lifetimeS = Math.round((Date.parse(after.expiresAt) - Date.parse(after.refreshedAt!)) / 1000);
  const rotated = fp(after.refreshToken) !== fp(before.refreshToken);
  say(`Refreshed. New access token lifetime ${lifetimeS} s; refresh token ${rotated ? 'ROTATED (a new one each time)' : 'kept'}; scopes ${after.scopes.length}.`);
  record('refresh', { ok: true, accessLifetimeS: lifetimeS, refreshRotated: rotated, scopesAfter: after.scopes });
  return 0;
}

/** Read-only calls that say whether the sign-in reaches what a deploy and a purchase touch. Status codes only. */
async function probeVerb(argv: string[]): Promise<number> {
  const token = await cloudflareAccessToken(oauthSettings());
  if (!token) return say('Not signed in: run sign-in first.'), 1;
  const get = async (p: string) => {
    const res = await fetch(API() + p, { headers: { authorization: `Bearer ${token}` } });
    let j: any = null;
    try {
      j = await res.json();
    } catch {
      /* not JSON */
    }
    const errs = (j?.errors ?? []).map((e: any) => `${e.code}: ${e.message}`).join('; ');
    return { status: res.status, count: Array.isArray(j?.result) ? j.result.length : undefined, errs, result: j?.result };
  };
  const rows: Array<Record<string, unknown>> = [];
  const row = (what: string, p: string, r: { status: number; count?: number; errs: string }) => {
    rows.push({ what, path: p.replace(/accounts\/[0-9a-f]{32}/, 'accounts/<id>'), status: r.status, count: r.count, errors: r.errs || undefined });
    say(`${String(r.status).padEnd(4)} ${what}${r.count !== undefined ? ` (${r.count})` : ''}${r.errs ? `  ${r.errs}` : ''}`);
  };
  const user = await get('/user');
  row('who signed in (user-details.read)', '/user', user);
  const accounts = await get('/accounts?per_page=50');
  row('accounts it sees', '/accounts', accounts);
  const account = (accounts.result ?? [])[0]?.id as string | undefined;
  if (account) {
    for (const [what, p] of [
      ['Workers scripts (workers-scripts)', `/accounts/${account}/workers/scripts`],
      ['R2 buckets (workers-r2)', `/accounts/${account}/r2/buckets`],
      ['KV namespaces (workers-kv-storage)', `/accounts/${account}/storage/kv/namespaces`],
      ['Workers subdomain', `/accounts/${account}/workers/subdomain`],
      ['Workers custom domains (workers-routes)', `/accounts/${account}/workers/domains`],
      ['zones (zone.read)', `/zones?account.id=${account}`]
    ] as const) {
      row(what, p, await get(p));
    }
    const domain = flag(argv, '--domain');
    if (domain) row(`registration of ${domain} (registrar-domains)`, `/accounts/${account}/registrar/registrations/${domain}`, await get(`/accounts/${account}/registrar/registrations/${encodeURIComponent(domain)}`));
  }
  record('probe', { rows });
  return 0;
}

/** ODT-000 (c) part 2 and (e): live writes on the person's account, made and deleted by `probeWrites`. */
async function probeWritesVerb(argv: string[]): Promise<number> {
  const token = await cloudflareAccessToken(oauthSettings());
  if (!token) return say('Not signed in: run sign-in first.'), 1;
  const zone = flag(argv, '--zone') ?? null;
  say(`Putting up a throwaway Worker "odt000-probe"${zone ? ` on odt000.${zone}` : ''}, then deleting it (a few minutes).\n`);
  const r = await probeWrites({ token, api: API(), zoneName: zone, log: say });
  say('\nAnswers:');
  for (const [q, a] of Object.entries(r.answers)) say(`  ${q}: ${a}`);
  record('probe-writes', { zone, steps: r.steps, answers: r.answers });
  const cleanedUp = Object.entries(r.answers).filter(([q]) => q.startsWith('clean up')).every(([, a]) => a === 'true');
  if (!cleanedUp) say('\n🔴 Something was NOT deleted: look for odt000-probe in the dashboard (Workers, R2, the domain).');
  return cleanedUp ? 0 : 1;
}

export async function main(argv: string[]): Promise<number> {
  const [verb, ...rest] = argv;
  try {
    if (verb === 'sign-in') return await signInVerb(rest);
    if (verb === 'refresh') return await refreshVerb();
    if (verb === 'probe') return await probeVerb(rest);
    if (verb === 'probe-writes') return await probeWritesVerb(rest);
    if (verb === 'status') {
      const s = summarize(readSignIn());
      say(JSON.stringify({ ...s, missing: s.signedIn ? missingScopes(s) : undefined }, null, 2));
      return s.signedIn ? 0 : 1;
    }
    if (verb === 'sign-out') {
      const r = await signOut(oauthSettings());
      say(r.wasSignedIn ? `Signed out${r.revoked ? ' and revoked at Cloudflare' : ' (Cloudflare did not confirm the revoke)'}.` : 'Not signed in.');
      return 0;
    }
  } catch (e) {
    say((e as Error).message);
    return 1;
  }
  say('sign-in [--port n] [--host localhost] [--scopes a,b] | status | refresh | probe [--domain name] | probe-writes [--zone name] | sign-out');
  return 2;
}
