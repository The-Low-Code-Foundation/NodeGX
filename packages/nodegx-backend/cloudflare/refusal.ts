/**
 * P115 HST-017 (R8, Richard 2026-11-07: "catch it, say it, email") — when the app's backend cannot answer, the visitor
 * reads a sentence and the builder gets one email a day.
 *
 * On the product Worker the backend runs in a Durable Object with 30 s of CPU a call (it uses ≤ 54 ms, measured
 * live), so the 1102 that HST-004 §10 was built for is out of reach. What a deployed app meets is the ACCOUNT's daily
 * allowance on Free (100,000 requests; 100,000 rows written; 5M read; 13,000 GB-s; reset 00:00 UTC). Cloudflare does
 * not publish what an object answers once over one, so nothing here waits for a particular wording: ANY failure of the
 * object is caught by the front Worker (which does almost nothing, 0–6 ms), answered in words, and emailed with
 * Cloudflare's own text, from which the next session learns the real wording. Words that look like a limit ("exceeded",
 * "limit", "quota") pick the daily-allowance sentence; anything else is said as the backend failing.
 *
 * Not caught here: the Worker's OWN daily 100,000 (Cloudflare refuses before the Worker runs: its 1027 page).
 *
 * The email goes through Cloudflare's own sending (`send_email` binding `ALERT_EMAIL`), from an address on a domain
 * on the builder's Cloudflare account to an address verified in it: free on Workers Free. Once a UTC day per kind,
 * remembered in this isolate and in the Cache API (best effort across isolates: a second email on a busy day is the
 * worst case, never none). Every refusal is also one log line (`nodegxRefusal`, Workers → the Worker → Logs).
 *
 * Pure: the bindings are handed in, so jest grades it.
 */

export type RefusalKind = 'daily-allowance' | 'backend-failed';

export interface AlertEnv {
  /** Cloudflare's `send_email` binding. */
  ALERT_EMAIL?: { send(message: Record<string, unknown>): Promise<{ messageId: string }> };
  /** The sender: an address on a domain on the builder's Cloudflare account. */
  NODEGX_ALERT_FROM?: string;
  /** The builder: an address verified in the account. */
  NODEGX_ALERT_TO?: string;
}

/** A remembered "told today": the Cache API's shape, so a test can hand in a Map-backed one. */
export interface TellCache {
  match(key: string): Promise<unknown>;
  put(key: string, value: Response): Promise<void>;
}

export type Sent = { via: 'cloudflare' | 'none'; ok: boolean; id?: string; error?: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

/** What failed, from Cloudflare's own words: any of them is enough, and nothing here depends on one wording. */
export function refusalKind(error: unknown): RefusalKind {
  const text = String((error as { message?: string })?.message ?? error);
  return /exceed|limit|quota|allowance|too many/i.test(text) ? 'daily-allowance' : 'backend-failed';
}

/** What the visitor's page receives, in the backend's own error shape (`{ code, error }`), so a Record or Query node's
 *  failure carries the sentence. */
export function refusalAnswer(kind: RefusalKind): Response {
  const error =
    kind === 'daily-allowance'
      ? "This app has used its hosting plan's allowance for today. It will work again after midnight UTC."
      : "This app's server could not answer just now. Please try again in a moment.";
  return new Response(JSON.stringify({ code: 503, error }), {
    status: 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-nodegx-refusal': kind, 'retry-after': '60' }
  });
}

/** The email, in words a builder who has never heard of a Durable Object can act on. */
export function refusalEmail(kind: RefusalKind, site: string, said: string, at: Date): { subject: string; text: string } {
  const cloudflareSaid = `Cloudflare's own words: "${said.slice(0, 500)}"`;
  if (kind === 'daily-allowance') {
    return {
      subject: `${site} went over the free plan's allowance for today`,
      text: [
        `Your app ${site} could not reach its data at ${hhmm(at)} UTC on ${longDate(at)}: Cloudflare refused it, it looks like for going over the free plan's allowance for the day.`,
        `Visitors are told the app will work again after midnight UTC, when the allowance resets. Nothing is lost: the data is kept.`,
        `The free plan allows 100,000 requests and 100,000 saved changes a day across your whole Cloudflare account. If this happens often, the Workers Paid plan ($5 a month) raises those limits. You can upgrade from your Cloudflare dashboard.`,
        cloudflareSaid,
        `NodeGX sends this email at most once a day.`
      ].join('\n\n')
    };
  }
  return {
    subject: `${site} could not reach its data`,
    text: [
      `Your app ${site} could not reach its data at ${hhmm(at)} UTC on ${longDate(at)}. Visitors were asked to try again in a moment.`,
      `If it lasts, the backend's page (${site}/_admin) and the Worker's logs in your Cloudflare dashboard say more.`,
      cloudflareSaid,
      `NodeGX sends this email at most once a day.`
    ].join('\n\n')
  };
}

/** The email the deploy sends once when an alert address is set, so the builder sees where it lands (HST-004 §10.5:
 *  the first one went to Gmail's All Mail, where nobody looks). */
export function alertTestEmail(site: string): { subject: string; text: string } {
  return {
    subject: `${site} will tell you here if it goes over its plan`,
    text: [
      `This is a test from NodeGX. If your app ${site} ever cannot reach its data (for example after going over Cloudflare's free allowance for the day), the email will come from this address and look like this one.`,
      `If this landed in Spam or only in All Mail, mark it "Not spam" or "Important" so the real one is seen.`
    ].join('\n\n')
  };
}

export async function sendAlert(env: AlertEnv, mail: { subject: string; text: string }): Promise<Sent> {
  if (!env.ALERT_EMAIL || !env.NODEGX_ALERT_FROM || !env.NODEGX_ALERT_TO) {
    return { via: 'none', ok: false, error: 'no sender is set up (deploy with --alert-to and --alert-from)' };
  }
  try {
    const result = await env.ALERT_EMAIL.send({ from: { email: env.NODEGX_ALERT_FROM, name: 'NodeGX' }, to: env.NODEGX_ALERT_TO, ...mail });
    return { via: 'cloudflare', ok: true, id: result?.messageId };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return { via: 'cloudflare', ok: false, error: `${err.code ?? 'error'}: ${err.message ?? String(e)}` };
  }
}

const toldInThisIsolate = new Set<string>();
const KEY_ORIGIN = 'https://nodegx-alerts.invalid';

/** Log the refusal, and email the builder if not yet today. Never throws: it runs after the answer (`waitUntil`). */
export async function tellOnce(
  deps: { env: AlertEnv; cache: TellCache | null; now?: () => Date; log?: (line: string) => void },
  kind: RefusalKind,
  site: string,
  error: unknown
): Promise<Sent | 'already-told'> {
  const at = (deps.now ?? (() => new Date()))();
  const said = String((error as { message?: string })?.message ?? error);
  const log = deps.log ?? ((line: string) => console.error(line));
  const key = `${KEY_ORIGIN}/${at.toISOString().slice(0, 10)}/${kind}`;
  try {
    if (toldInThisIsolate.has(key) || (deps.cache && (await deps.cache.match(key)))) {
      log(JSON.stringify({ nodegxRefusal: kind, said, told: 'already today' }));
      return 'already-told';
    }
    toldInThisIsolate.add(key);
    const sent = await sendAlert(deps.env, refusalEmail(kind, site, said, at));
    log(JSON.stringify({ nodegxRefusal: kind, said, ...sent }));
    // Only a sent email closes the day (HST-004 §10.5): a builder who sets a sender up later is still told.
    if (sent.ok && deps.cache) await deps.cache.put(key, new Response('told', { headers: { 'cache-control': 'max-age=172800' } }));
    else if (!sent.ok) toldInThisIsolate.delete(key);
    return sent;
  } catch (e) {
    log(JSON.stringify({ nodegxRefusal: kind, said, error: String((e as Error)?.message ?? e) }));
    return { via: 'none', ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** Only for tests: forget what this isolate told. */
export function forgetToldForTests(): void {
  toldInThisIsolate.clear();
}
