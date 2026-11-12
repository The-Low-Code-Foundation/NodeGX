/**
 * HST-004 session 2: the public stand-in Mailchimp, a second Worker on the same account.
 *
 * It answers 200 to anything, and logs what arrived: method, path, body and a FINGERPRINT of the Authorization header
 * (its length and the first 12 hex of its SHA-256), never the header itself, so the logs (Workers Logs, `wrangler tail`)
 * can prove the key arrived without holding it. Compare locally with `node fingerprint.mjs`.
 *
 * GET /__log answers the last requests this isolate saw: a convenience, not a record (a Worker may run in many isolates).
 */
const seen: unknown[] = [];

async function fingerprint(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `len ${value.length} sha256 ${hex.slice(0, 12)}`;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/__log') {
      return new Response(JSON.stringify(seen, null, 2), { headers: { 'content-type': 'application/json' } });
    }
    const entry = {
      at: new Date().toISOString(),
      method: req.method,
      path: url.pathname,
      authorization: await fingerprint(req.headers.get('authorization')),
      body: await req.text()
    };
    seen.push(entry);
    if (seen.length > 20) seen.shift();
    console.log(JSON.stringify(entry));
    return new Response(JSON.stringify({ id: 'member-1', status: 'subscribed' }), {
      headers: { 'content-type': 'application/json' }
    });
  }
};
