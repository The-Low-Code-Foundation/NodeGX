/**
 * HST-004 §10: tell the builder when Cloudflare refuses their site's requests over the plan's limit.
 *
 * A Worker cannot see its own refusal (Cloudflare stops the isolate; on Free there are no Tail Workers), but the
 * visitor's page can: it gets 503 "error code: 1102" (computing time) or "error code: 1027" (requests a day). The page
 * POSTs `{ code, fn, at }` to `/__nodegx/plan-limit` (the exported client, emitApp.ts), and this module emails the
 * builder, at most once a day for each code:
 *
 *   1. Cloudflare's own sending, when the Worker has a `send_email` binding `ALERT_EMAIL` and `ALERT_FROM` on a domain
 *      onboarded to Cloudflare. Free on every plan to a verified address of the account (`ALERT_TO`).
 *   2. Resend, when it has the secret `RESEND_API_KEY` (no domain needed: from onboarding@resend.dev to the address the
 *      builder signed up with, `ALERT_TO`).
 *   3. Neither: one log line a day (`nodegxPlanLimit`, Workers & Pages → the Worker → Logs).
 *
 * Anyone can POST a report, so nothing in the email comes from it but the code (one of two) and a function name the
 * project really has; the once-a-day note in KV (`NODEGX_ALERTS`) is what keeps a flood of reports to one email.
 */

export interface PlanLimitEnv {
  /** KV: one key a day per code, so one email a day. Without it, once per isolate (a fallback, not a promise). */
  NODEGX_ALERTS?: KVNamespace;
  /** Cloudflare's `send_email` binding. */
  ALERT_EMAIL?: { send(message: Record<string, unknown>): Promise<{ messageId: string }> };
  /** The sender, on a domain onboarded to Cloudflare's Email Service (route 1 only). */
  ALERT_FROM?: string;
  /** The builder's address: verified in the account (route 1), or the one they signed up to Resend with (route 2). */
  ALERT_TO?: string;
  RESEND_API_KEY?: string;
}

type Code = '1102' | '1027';
/** `id` is the sender's own id for the email (Resend's dashboard, or Cloudflare's messageId), to trace a delivery. */
type Sent = { via: 'cloudflare' | 'resend' | 'none'; ok: boolean; id?: string; error?: string };

const KEEP_MS = 3 * 24 * 60 * 60 * 1000;
const toldInThisIsolate = new Set<string>();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

/** The email, in words a builder who has never heard of a CPU limit can act on. */
export function planLimitEmail(code: Code, site: string, fn: string, at: Date): { subject: string; text: string } {
  if (code === '1027') {
    return {
      subject: `${site} reached the free plan's daily limit`,
      text: [
        `Your site ${site} reached the Workers free plan's limit of 100,000 requests a day on ${longDate(at)}. Cloudflare refused requests to it until the limit reset at midnight UTC.`,
        `Visitors saw a message asking them to try again tomorrow.`,
        `Cloudflare's Workers Paid plan has no daily limit on requests. It costs $5 a month. You can upgrade from your Cloudflare dashboard.`,
        `NodeGX sends this email at most once a day, however many requests Cloudflare refuses.`
      ].join('\n\n')
    };
  }
  return {
    subject: `Cloudflare stopped a request to ${site}`,
    text: [
      `Cloudflare stopped a request to your site ${site} at ${hhmm(at)} UTC on ${longDate(at)}. ${
        fn ? `The request ran your cloud function ${fn}. ` : ''
      }It used more computing time than the Workers free plan allows.`,
      `The visitor saw a message asking them to try again in a moment.`,
      `If this keeps happening, Cloudflare's Workers Paid plan raises the limit to 30 seconds of computing time for each request. It costs $5 a month. You can upgrade from your Cloudflare dashboard.`,
      `NodeGX sends this email at most once a day, however many requests Cloudflare stops.`
    ].join('\n\n')
  };
}

async function send(env: PlanLimitEnv, mail: { subject: string; text: string }): Promise<Sent> {
  if (env.ALERT_EMAIL && env.ALERT_FROM && env.ALERT_TO) {
    try {
      const result = await env.ALERT_EMAIL.send({ from: { email: env.ALERT_FROM, name: 'NodeGX' }, to: env.ALERT_TO, ...mail });
      return { via: 'cloudflare', ok: true, id: result?.messageId };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      return { via: 'cloudflare', ok: false, error: `${err.code ?? 'error'}: ${err.message ?? String(e)}` };
    }
  }
  if (env.RESEND_API_KEY && env.ALERT_TO) {
    const answer = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NodeGX <onboarding@resend.dev>', to: [env.ALERT_TO], ...mail })
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }) as const);
    // Resend's 200 means accepted, not delivered: the id is what its dashboard (Emails) shows the delivery under.
    if (answer.ok) return { via: 'resend', ok: true, id: ((await answer.json().catch(() => ({}))) as { id?: string }).id };
    return { via: 'resend', ok: false, error: `${answer.status}: ${(await answer.text()).slice(0, 200)}` };
  }
  return { via: 'none', ok: false, error: 'no sender is set up (ALERT_EMAIL + ALERT_FROM + ALERT_TO, or RESEND_API_KEY + ALERT_TO)' };
}

/** `POST /__nodegx/plan-limit`, the page's report. Answers 204 whether or not an email went, so a page never retries a delivered report. */
export async function handlePlanLimit(req: Request, env: PlanLimitEnv, site: string, functions: Set<string>): Promise<Response> {
  if (req.method !== 'POST') return new Response('POST a report', { status: 405 });
  const report = (await req.json().catch(() => null)) as { code?: unknown; fn?: unknown; at?: unknown } | null;
  const code = report?.code === '1102' || report?.code === '1027' ? (report.code as Code) : null;
  if (!code) return new Response('code must be "1102" or "1027"', { status: 400 });
  const fn = typeof report?.fn === 'string' && functions.has(report.fn) ? report.fn : '';
  const now = Date.now();
  const claimed = typeof report?.at === 'string' ? Date.parse(report.at) : NaN;
  const at = new Date(claimed <= now && now - claimed < KEEP_MS ? claimed : now);

  const key = `plan-limit:${at.toISOString().slice(0, 10)}:${code}`;
  if (toldInThisIsolate.has(key)) return new Response(null, { status: 204 });
  if (env.NODEGX_ALERTS && (await env.NODEGX_ALERTS.get(key)) !== null) {
    toldInThisIsolate.add(key);
    return new Response(null, { status: 204 });
  }

  const sent = await send(env, planLimitEmail(code, site, fn, at));
  console.log(JSON.stringify({ nodegxPlanLimit: code, fn, at: at.toISOString(), ...sent }));
  // Only a sent email is remembered in KV: a failed send, or no sender yet, leaves the day open, so a later report (after
  // the builder sets a sender up) still emails. This isolate does not try again.
  toldInThisIsolate.add(key);
  if (env.NODEGX_ALERTS && sent.ok) {
    await env.NODEGX_ALERTS.put(key, JSON.stringify({ at: at.toISOString(), fn, via: sent.via }), { expirationTtl: 4 * 24 * 60 * 60 });
  }
  return new Response(null, { status: 204 });
}
