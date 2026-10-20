/**
 * A stand-in for Paystack's API (TWO-004), as far as the marketplace's `startPayment` and `checkPayment` use it, and
 * its hosted checkout page, so a drive can click through it.
 *
 * Shaped on what was read 2026-10-15 (TWO-004 §7): `POST /transaction/initialize` with a Bearer secret key answers
 * `{status, message, data: {authorization_url, access_code, reference}}` and refuses a used reference (400,
 * `duplicate_reference`); `GET /transaction/verify/:reference` answers 200 with `data.status` (`ongoing` until the
 * buyer finishes), `data.amount` in the subunit, `data.currency`, `data.metadata`, or 404 for a reference it never
 * saw; the checkout page sends the buyer to `callback_url?reference=…`. A key that didn't start the payment can't
 * verify it, as two Paystack businesses can't see each other's.
 *
 * It is a stand-in, not a model: the real round trip is step 4's, with test keys.
 *
 * `hold(reference)` makes every verify for that reference wait until `release`, so a spec can put the buyer's page and
 * Paystack's webhook (step 5) into a chosen order, or let them go at the same instant. The answer is read at release.
 */
import * as crypto from 'crypto';
import * as http from 'http';

export interface FakeTx {
  key: string;
  body: Record<string, any>;
  status: string;
  /** What the buyer actually paid, and in what, when a test wants it to differ from what was asked. */
  paid?: number;
  currency?: string;
}

export interface FakePaystack {
  url: string;
  keys: string[];
  txs: Map<string, FakeTx>;
  /** Every initialize the functions sent, in order, with the key they sent it with. */
  initialized: Array<{ key: string; body: Record<string, any> }>;
  settle(reference: string, status: string, paid?: number, currency?: string): void;
  /**
   * Paystack's webhook: once a buyer pays at the checkout page, a `charge.success` signed with the key that started
   * the payment goes to the URL set for that key, as the buyer is sent back (so the page and the webhook check it at
   * about the same moment, as they do with Paystack). Every post's answer status, in order.
   */
  webhookTo(key: string, url: string): void;
  webhooksSent: Array<{ reference: string; status: number }>;
  /** How many verifies have been asked, for a reference. */
  verifies(reference: string): number;
  /** Verifies for this reference wait from now on, in arrival order. */
  hold(reference: string): void;
  /** How many verifies for this reference are waiting. */
  held(reference: string): number;
  /** Answer the first, or the last, waiting verify; or all of them at once (and stop holding). */
  release(reference: string, which: 'first' | 'last' | 'all'): void;
  close(): Promise<void>;
}

export async function startFakePaystack(keys: string[]): Promise<FakePaystack> {
  const txs = new Map<string, FakeTx>();
  const waiting = new Map<string, Array<() => void>>();
  const asked = new Map<string, number>();
  const hooks = new Map<string, string>();
  const webhooksSent: FakePaystack['webhooksSent'] = [];
  const sendWebhook = (tx: FakeTx) => {
    const url = hooks.get(tx.key);
    if (!url) return;
    const body = JSON.stringify({ event: 'charge.success', data: { reference: tx.body.reference, status: 'success', amount: Number(tx.body.amount), currency: tx.body.currency, metadata: tx.body.metadata } });
    const signature = crypto.createHmac('sha512', tx.key).update(body).digest('hex');
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': signature }, body })
      .then((r) => webhooksSent.push({ reference: tx.body.reference, status: r.status }))
      .catch(() => webhooksSent.push({ reference: tx.body.reference, status: 0 }));
  };
  const initialized: FakePaystack['initialized'] = [];
  const answer = (res: http.ServerResponse, status: number, json: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(json));
  };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const url = new URL(req.url || '/', 'http://x');
      const auth = String(req.headers.authorization || '');
      const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const page = /^\/checkout\/([^/]+)(\/pay|\/fail)?$/.exec(url.pathname);
      if (req.method === 'GET' && page) {
        const tx = txs.get(decodeURIComponent(page[1]));
        if (!tx) return answer(res, 404, { status: false, message: 'No such checkout' });
        if (page[2]) {
          tx.status = page[2] === '/pay' ? 'success' : 'failed';
          if (tx.status === 'success') sendWebhook(tx);
          res.writeHead(302, {
            Location: `${tx.body.callback_url}?reference=${encodeURIComponent(tx.body.reference)}`
          });
          return res.end();
        }
        const amount = (Number(tx.body.amount) / 100).toFixed(2);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(
          `<!doctype html><meta name="viewport" content="width=device-width"><title>Stand-in Paystack</title>` +
            `<body style="font-family:sans-serif;padding:24px"><h1>Stand-in Paystack</h1><p id="what">${tx.body.currency} ${amount} to ${tx.body.email}</p>` +
            `<p><a id="pay" href="/checkout/${encodeURIComponent(tx.body.reference)}/pay">Pay ${
              tx.body.currency
            } ${amount}</a></p>` +
            `<p><a id="fail" href="/checkout/${encodeURIComponent(tx.body.reference)}/fail">Decline</a></p></body>`
        );
      }
      if (!keys.includes(key)) return answer(res, 401, { status: false, message: 'Invalid key' });
      if (req.method === 'POST' && url.pathname === '/transaction/initialize') {
        let body: Record<string, any> = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          return answer(res, 400, { status: false, message: 'Invalid JSON' });
        }
        initialized.push({ key, body });
        if (!body.email || !body.amount)
          return answer(res, 400, { status: false, message: 'Email and amount are required' });
        if (txs.has(body.reference))
          return answer(res, 400, {
            status: false,
            message: 'Duplicate Transaction Reference',
            code: 'duplicate_reference'
          });
        txs.set(body.reference, { key, body, status: 'ongoing' });
        return answer(res, 200, {
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: `${fake.url}/checkout/${encodeURIComponent(body.reference)}`,
            access_code: 'ac_fake',
            reference: body.reference
          }
        });
      }
      const verify = /^\/transaction\/verify\/([^/]+)$/.exec(url.pathname);
      if (req.method === 'GET' && verify) {
        const reference = decodeURIComponent(verify[1]);
        asked.set(reference, (asked.get(reference) ?? 0) + 1);
        const queue = waiting.get(reference);
        if (queue) return void queue.push(() => verifyAnswer(res, reference, key));
        return verifyAnswer(res, reference, key);
      }
      answer(res, 404, { status: false, message: 'Not here' });
    });
  });
  const verifyAnswer = (res: http.ServerResponse, reference: string, key: string) => {
    const tx = txs.get(reference);
    if (!tx || tx.key !== key) return answer(res, 404, { status: false, message: 'Transaction reference not found' });
    return answer(res, 200, {
      status: true,
      message: 'Verification successful',
      data: {
        reference: tx.body.reference,
        status: tx.status,
        amount: tx.paid ?? Number(tx.body.amount),
        currency: tx.currency ?? tx.body.currency,
        metadata: tx.body.metadata,
        channel: 'card',
        paid_at: tx.status === 'success' ? new Date().toISOString() : null
      }
    });
  };
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const fake: FakePaystack = {
    url: `http://127.0.0.1:${port}`,
    keys,
    txs,
    initialized,
    settle(reference, status, paid, currency) {
      const tx = txs.get(reference);
      if (!tx) throw new Error(`no such payment ${reference}`);
      tx.status = status;
      tx.paid = paid;
      tx.currency = currency;
    },
    verifies: (reference) => asked.get(reference) ?? 0,
    webhookTo: (key, url) => void hooks.set(key, url),
    webhooksSent,
    hold(reference) {
      if (!waiting.has(reference)) waiting.set(reference, []);
    },
    held: (reference) => waiting.get(reference)?.length ?? 0,
    release(reference, which) {
      const queue = waiting.get(reference) ?? [];
      if (which === 'all') {
        waiting.delete(reference);
        queue.forEach((go) => go());
      } else {
        const go = which === 'first' ? queue.shift() : queue.pop();
        if (go) go();
      }
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
  return fake;
}
