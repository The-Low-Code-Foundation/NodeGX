/**
 * TWO-004 — Paystack: a buyer pays one seller country's parts of an order by card, mobile money or bank through
 * Paystack, in one payment that Paystack splits to each of those sellers' subaccounts; the order says paid only once
 * Paystack, asked by the marketplace with its secret key, says the right amount arrived. TWO-003's slice 6.
 *
 * ## Two functions, `startPayment` and `checkPayment`
 *
 * **`startPayment`** takes the order's private link (its token), the country being paid and where to come back to.
 * It pays every part of that order sold in that country and paid by Paystack, once all of them are confirmed (the
 * seller has said the delivery cost): one payment per seller country (R8, ruled A). It never takes an amount from the
 * phone: it adds up each part's subtotal and delivery cost from the store, asks Paystack for a checkout page
 * (`POST /transaction/initialize`, an inline flat split: each seller's share is their whole part, to the subaccount
 * kept on the seller), and hands back the page's address. Nothing is written: a payment is kept only once Paystack
 * says what happened to it (the world's rule 5: kept forever, never changed).
 *
 * **`checkPayment`** takes a reference (Paystack adds it to the address it sends the buyer back to) and asks Paystack
 * (`GET /transaction/verify/:reference`). Success, with the amount and currency the parts add up to now: a `Payment`
 * row (`paid`), and each part moves from confirmed to paid with its history row. Success with any other amount, or a
 * failure: a `Payment` row (`failed`) and nothing moves. Not finished yet (abandoned, ongoing): nothing is written.
 * Asked twice, it answers from the row it already wrote.
 *
 * **`paystackEvent`** (step 5) is what Paystack's webhook runs: a webhook trigger with the `hmac-sha512` scheme, one
 * per Paystack business (its secret that business's key: Paystack signs each call with it), points at it. It is not
 * called over HTTP (`call: nobody`); the trigger checks the signature, then hands it Paystack's event as `body`. A
 * `charge.success` for a reference this marketplace made runs **the same check as `checkPayment`**, asking Paystack
 * again with the key the reference names, so the event's own fields are only a hint. Any other event, or another
 * app's reference, is answered and left alone; a payment Paystack hasn't finished, or a Paystack that can't be
 * reached, is refused, so Paystack sends it again later (it retries for 72 hours).
 *
 * 🔴 **The page and the webhook can check one payment at the same moment** (Paystack sends both as the buyer pays). The
 * world says a payment's reference is one payment (Richard, 2026-10-15: `docs/world/rules.json`), so the store keeps
 * a unique index on it: the second check's row is refused, and that check answers from the row that won and moves
 * nothing. Only the check whose row was kept moves the parts (TWO-004 §9.5).
 *
 * ## One Paystack business per country, so one secret key per currency
 *
 * Read 2026-10-14/15 (TWO-004 §6–§7): a Paystack business charges its own country's currency (Ghana GHS; Nigeria
 * NGN and USD), and a split is one currency. So a marketplace selling in Ghana and Nigeria has a Paystack business in
 * each, and **each country's secret key is saved on the backend as `PAYSTACK_SECRET_KEY_<currency>`**
 * (`PAYSTACK_SECRET_KEY_GHS`). The reference carries the currency (`MK-2026-00042-GHS-…`), so `checkPayment` knows
 * which key to ask with before it asks. A seller's subaccount belongs to the business in the seller's country.
 *
 * The key is read by a Secret node and reaches only the script that calls Paystack: no response carries it, and the
 * graph carries its name, never its value. `PAYSTACK_API_URL`, also a secret, points both functions at a stand-in
 * for Paystack in the specs and drives; leave it unset and they call `https://api.paystack.co`. It is a secret, not a
 * parameter, because whoever chooses that address receives the key.
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two004Paystack.test.ts` compiles every one.
 *
 * @module noodl-mcp/tests/two004Paystack
 */
import { CloudComponent, PRELUDE } from './two003Cloud';

export const FN_START_PAYMENT = 'startPayment';
export const FN_CHECK_PAYMENT = 'checkPayment';
export const FN_PAYSTACK_EVENT = 'paystackEvent';

/** The policy's `functions` rules slice 6 adds: a buyer has no account (W2), so both are public and rate-limited. */
export const SLICE6_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_START_PAYMENT]: { call: 'public', rateLimit: { ratePerMinute: 10, burst: 5 } },
  [FN_CHECK_PAYMENT]: { call: 'public', rateLimit: { ratePerMinute: 30, burst: 10 } },
  // Paystack's webhook only: its trigger checks the signature, then runs it. Nobody calls it over HTTP.
  [FN_PAYSTACK_EVENT]: { call: 'nobody' }
};

/**
 * The currencies Paystack charges in (its OpenAPI spec's `Currency`, read 2026-10-15). XOF (Côte d'Ivoire) is on its
 * help centre but in neither the spec nor the API docs, so its subunit is unknown and it waits.
 */
export const PAYSTACK_CURRENCIES = ['GHS', 'KES', 'NGN', 'USD', 'ZAR'];
/** Each country's key is saved as this followed by its currency. */
export const PAYSTACK_KEY_PREFIX = 'PAYSTACK_SECRET_KEY_';
/** Points both functions at a stand-in for Paystack; unset, they call Paystack. */
export const PAYSTACK_API_SECRET = 'PAYSTACK_API_URL';
export const PAYSTACK_API = 'https://api.paystack.co';
/** The ways to pay a provider marks paid, never a seller. */
export const PAID_BY_PROVIDER = ['paystack', 'flutterwave'];
/** What a subaccount looks like (`ACCT_4hl4xenwpjy5wb`). */
export const SUBACCOUNT = '/^ACCT_[A-Za-z0-9]+$/';
/** The webhook trigger's scheme for Paystack: `x-paystack-signature`, an HMAC-SHA512 of the body keyed with the secret key. */
export const PAYSTACK_WEBHOOK_SCHEME = 'hmac-sha512';
/** What a reference this marketplace made looks like: the order's number, the currency, twelve random hex digits. */
const REFERENCE = '/^(MK-[0-9]{4}-[0-9]+)-([A-Z]{3})-[0-9a-f]{12}$/';

/**
 * The parts of an order a country's Paystack payment covers: sold by a seller in that country, paid by Paystack, not
 * cancelled. Each with its share in the currency's subunit (Paystack's unit: every currency it takes is ×100).
 */
const PAYABLE = `async function payable(orderId, countryId) {
  var way = await one('WayToPay', { method: { equalTo: 'paystack' } });
  if (!way) return [];
  var parts = await Noodl.Records.query('OrderPart', { order: { equalTo: ptr('Order', orderId) } }, { plain: true, limit: 100, sort: ['createdAt'] });
  var sellers = parts.length ? await Noodl.Records.query('Seller', { objectId: { containedIn: parts.map(function (p) { return idOf(p.seller); }) } }, { plain: true, limit: 100 }) : [];
  var seller = {};
  sellers.forEach(function (s) { seller[s.objectId] = s; });
  return parts
    .filter(function (p) { var s = seller[idOf(p.seller)]; return s && idOf(s.country) === countryId && idOf(p.wayToPay) === way.objectId && p.status !== 'cancelled'; })
    .map(function (p) { return { part: p, seller: seller[idOf(p.seller)], share: Math.round(((Number(p.subtotal) || 0) + (typeof p.deliveryCost === 'number' ? p.deliveryCost : 0)) * 100) }; });
}
function apiOf(v) { var s = String(v || ''); return /^https?:[/][/][^ ]+$/.test(s) ? s.replace(/[/]+$/, '') : '${PAYSTACK_API}'; }
async function paystack(method, path, body) {
  var r = await fetch(apiOf(Inputs.api) + path, { method: method, headers: { Authorization: 'Bearer ' + String(Inputs.key), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  var j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, json: j || {} };
}`;

// ── startPayment ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Which country's key: the country being paid, and only one Paystack charges in. */
export const START_KEY_SCRIPT = `${PRELUDE}
var CURRENCIES = ${JSON.stringify(PAYSTACK_CURRENCIES)};
var a = Inputs.pay;
if (a === undefined) return;
var c = a && typeof a === 'object' && !Array.isArray(a) ? await one('Country', { objectId: { equalTo: idOf(a.country) } }) : null;
if (!c) { refuse('Say which country you are paying in.'); return; }
if (CURRENCIES.indexOf(c.currency) < 0) { refuse('Paystack doesn’t take ' + c.currency + ': pay ' + c.name + '’s sellers another way.'); return; }
Outputs.keyName = '${PAYSTACK_KEY_PREFIX}' + c.currency;
Outputs.notSet = 'Paying by card isn’t set up in ' + c.name + ' yet. Ask the seller how else to pay.';
Outputs.go();`;

export const START_PAYMENT_SCRIPT = `${PRELUDE}
${PAYABLE}
var a = Inputs.pay;
if (a === undefined || Inputs.key === undefined) return;
var token = text(a.token, 100);
var order = token.length >= 32 ? await one('Order', { followToken: { equalTo: token } }) : null;
if (!order) { refuse('There is no order at this link. Check it was copied whole.'); return; }
var c = await one('Country', { objectId: { equalTo: idOf(a.country) } });
if (!c) { refuse('Say which country you are paying in.'); return; }
var due = await payable(order.objectId, c.objectId);
if (!due.length) { refuse('Nothing in this order is paid by card in ' + c.name + '.'); return; }
if (due.some(function (x) { return (x.part.status || 'new') === 'new'; })) { refuse('Every seller in ' + c.name + ' confirms the delivery cost first: then you pay them all at once.'); return; }
if (due.some(function (x) { return x.part.status !== 'confirmed'; })) { refuse('This is paid already.'); return; }
var lost = due.filter(function (x) { return !${SUBACCOUNT}.test(String(x.seller.payoutAccount || '')); })[0];
if (lost) { refuse(lost.seller.name + ' can’t be paid by card yet. Ask them how else to pay.'); return; }
if (!order.email) { refuse('Paystack sends the receipt by email, and this order has none.'); return; }
var back = text(a.returnUrl, 500);
if (!/^https?:[/][/][^ ?#]+$/.test(back) || back.slice(-(token.length + 7)) !== '/order/' + token) { refuse('Open this order from its own link to pay.'); return; }
if (typeof crypto === 'undefined' || !crypto.getRandomValues) { refuse('This payment could not be started just now.'); return; }
var bytes = new Uint8Array(6);
crypto.getRandomValues(bytes);
var ref = order.number + '-' + c.currency + '-' + Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
var amount = due.reduce(function (n, x) { return n + x.share; }, 0);
var body = {
  email: order.email,
  amount: amount,
  currency: c.currency,
  reference: ref,
  callback_url: back,
  metadata: { orderId: order.objectId, countryId: c.objectId, number: order.number, parts: due.map(function (x) { return x.part.objectId; }) },
  split: { name: ref, type: 'flat', currency: c.currency, bearer_type: 'all-proportional', subaccounts: due.map(function (x) { return { subaccount: String(x.seller.payoutAccount), share: x.share }; }) }
};
try { var r = await paystack('POST', '/transaction/initialize', body); } catch (e) { refuse('Paystack couldn’t be reached just now. Try again in a minute.'); return; }
var d = r.json.data || {};
if (r.status !== 200 || r.json.status !== true || !/^https?:[/][/]/.test(String(d.authorization_url || ''))) { refuse('Paystack didn’t take this payment: ' + (text(r.json.message, 200) || 'no reason given') + '.'); return; }
Outputs.payment = { url: String(d.authorization_url), reference: ref, amount: amount / 100, currency: c.currency };
Outputs.done();`;

// ── checkPayment ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Which country's key: the currency the reference names. Anything else is not a reference this marketplace made. */
export const CHECK_KEY_SCRIPT = `${PRELUDE}
var a = Inputs.check;
if (a === undefined) return;
var m = ${REFERENCE}.exec(a && typeof a === 'object' ? text(a.reference, 100) : '');
if (!m) { refuse('That isn’t a payment for an order here.'); return; }
Outputs.keyName = '${PAYSTACK_KEY_PREFIX}' + m[2];
Outputs.notSet = 'Paying by card isn’t set up in ' + m[2] + ' any more, so this payment can’t be checked.';
Outputs.go();`;

/**
 * The check `checkPayment` and `paystackEvent` share. `pick` turns the request's input into `{reference}`; `webhook`
 * refuses an unfinished payment (so Paystack sends the event again) where the page is told to wait.
 */
function checkPaymentScript(param: string, pick: string, webhook: boolean): string {
  return `${PRELUDE}
${PAYABLE}
var a = Inputs.${param};
if (a === undefined || Inputs.key === undefined) return;
${pick}
var ref = text(a && typeof a === 'object' ? a.reference : '', 100);
var m = ${REFERENCE}.exec(ref);
if (!m) { refuse('That isn’t a payment for an order here.'); return; }
var known = await one('Payment', { reference: { equalTo: ref } });
if (known) { Outputs.result = { outcome: known.outcome, reference: ref }; Outputs.done(); return; }
try { var r = await paystack('GET', '/transaction/verify/' + encodeURIComponent(ref)); } catch (e) { refuse('Paystack couldn’t be reached just now. Try again in a minute.'); return; }
if (r.status === 404) { refuse('Paystack has no payment with that reference.'); return; }
var d = r.json.data || {};
if (r.status !== 200 || r.json.status !== true || d.reference !== ref) { refuse('Paystack couldn’t say what happened to this payment just now. Try again in a minute.'); return; }
var meta = d.metadata;
if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (e) { meta = null; } }
var order = meta && typeof meta === 'object' ? await one('Order', { objectId: { equalTo: text(meta.orderId, 64) } }) : null;
var c = order ? await one('Country', { objectId: { equalTo: text(meta.countryId, 64) } }) : null;
if (!order || order.number !== m[1] || !c || c.currency !== m[2]) { refuse('That isn’t a payment for an order here.'); return; }
var status = String(d.status || '');
if (status !== 'success' && status !== 'failed' && status !== 'reversed') { ${webhook ? "refuse('Paystack hasn’t finished this payment yet: it sends it again.'); return;" : "Outputs.result = { outcome: 'waiting', reference: ref }; Outputs.done(); return;"} }
var due = status === 'success' ? (await payable(order.objectId, c.objectId)).filter(function (x) { return x.part.status === 'confirmed'; }) : [];
var expected = due.reduce(function (n, x) { return n + x.share; }, 0);
var paid = status === 'success' && expected > 0 && Number(d.amount) === expected && d.currency === c.currency;
var made = null;
try { made = await Noodl.Records.create('Payment', { order: ptr('Order', order.objectId), at: now(), provider: 'paystack', reference: ref, currency: String(d.currency || c.currency), country: c.name || '', amount: (Number(d.amount) || 0) / 100, outcome: paid ? 'paid' : 'failed' }); } catch (e) { made = null; }
if (!made) {
  var won = await one('Payment', { reference: { equalTo: ref } });
  if (!won) { refuse('This payment couldn’t be kept just now. Try again in a minute.'); return; }
  Outputs.result = { outcome: won.outcome, reference: ref };
  Outputs.done();
  return;
}
if (paid) {
  for (var i = 0; i < due.length; i++) {
    await Noodl.Records.save(due[i].part.objectId, { status: 'paid' }, { className: 'OrderPart' });
    await history('OrderPart', 'orderPart', due[i].part.objectId, null, { status: { from: 'confirmed', to: 'paid' }, paidBy: { from: null, to: ref } });
  }
}
Outputs.result = { outcome: paid ? 'paid' : 'failed', reference: ref, wrongAmount: status === 'success' && !paid };
Outputs.done();`;
}

export const CHECK_PAYMENT_SCRIPT = checkPaymentScript('check', '', false);

// ── paystackEvent ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Paystack's event, from the webhook: only a `charge.success` for a reference this marketplace made goes on to the
 * check (with the key the reference names); anything else is answered and left alone, so Paystack stops sending it.
 */
export const EVENT_KEY_SCRIPT = `${PRELUDE}
var e = Inputs.body;
if (e === undefined) return;
var m = e && typeof e === 'object' && e.event === 'charge.success' && e.data && typeof e.data === 'object' ? ${REFERENCE}.exec(text(e.data.reference, 100)) : null;
if (!m) { Outputs.ignored(); return; }
Outputs.keyName = '${PAYSTACK_KEY_PREFIX}' + m[2];
Outputs.notSet = 'Paying by card isn’t set up in ' + m[2] + ' any more, so this payment can’t be checked.';
Outputs.go();`;

export const PAYSTACK_EVENT_SCRIPT = checkPaymentScript('body', "a = a && typeof a === 'object' ? a.data : null;", true);

// ── the two functions ──────────────────────────────────────────────────────────────────────────────────────────────

type Node = Record<string, unknown>;
type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });
const quiet = (...names: string[]) => Object.fromEntries(names.map((n) => [`runOnChange-in-${n}`, false]));
const signals = (...names: string[]) => names.map((n) => ({ name: `out-${n}`, plug: 'output', type: 'signal' }));

/**
 * Request → which key (a script) → that key (a Secret named by the script) → where Paystack is (a Secret that may be
 * unset) → the script that calls Paystack → Done or Refused. A key that isn't saved answers in words naming the
 * country; the second Secret's failure is the ordinary case (Paystack itself) and runs the script all the same.
 * `ignores`: the key script may also answer at once with nothing (the webhook's events this marketplace leaves alone).
 */
function paystackDoor(name: string, description: string, param: string, keyScript: string, script: string, answer: string, ignores = false): CloudComponent {
  const door: CloudComponent = {
    name,
    path: `#__cloud__/${name}`,
    description,
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', label: `${name}(${param})`, parameters: { params: param, [`ptype-${param}`]: 'object', [`preq-${param}`]: true, allowNoAuth: true } },
      { id: 'which', type: 'JavaScriptFunction', label: 'Which country’s Paystack key', ports: signals('go', 'refused'), parameters: { functionScript: keyScript, ...quiet(param) } },
      { id: 'key', type: 'noodl.cloud.secret', label: `${PAYSTACK_KEY_PREFIX}<currency>` },
      { id: 'api', type: 'noodl.cloud.secret', label: `${PAYSTACK_API_SECRET} (unset: Paystack)`, parameters: { name: PAYSTACK_API_SECRET } },
      { id: 'run', type: 'JavaScriptFunction', label: description, ports: signals('done', 'refused'), parameters: { functionScript: script, ...quiet(param, 'key', 'api') } },
      { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: answer } },
      { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } },
      { id: 'noKey', type: 'noodl.cloud.response', label: 'No key for that country', parameters: { status: 'failure', errorMessage: 'Paying by card isn’t set up here yet.' } }
    ],
    connections: [
      wire('req', `pm-${param}`, 'which', `in-${param}`),
      wire('req', 'receive', 'which', 'run'),
      wire('which', 'out-keyName', 'key', 'name'),
      wire('which', 'out-go', 'key', 'fetch'),
      wire('which', 'out-notSet', 'noKey', 'errorMessage'),
      wire('which', 'out-reason', 'no', 'errorMessage'),
      wire('which', 'out-refused', 'no', 'send'),
      wire('which', 'failure', 'no', 'send'),
      wire('key', 'failure', 'noKey', 'send'),
      wire('key', 'done', 'api', 'fetch'),
      wire('req', `pm-${param}`, 'run', `in-${param}`),
      wire('key', 'value', 'run', 'in-key'),
      wire('api', 'value', 'run', 'in-api'),
      wire('api', 'done', 'run', 'run'),
      wire('api', 'failure', 'run', 'run'),
      wire('run', `out-${answer}`, 'ok', `pm-${answer}`),
      wire('run', 'out-done', 'ok', 'send'),
      wire('run', 'out-reason', 'no', 'errorMessage'),
      wire('run', 'out-refused', 'no', 'send'),
      wire('run', 'failure', 'no', 'send')
    ]
  };
  if (ignores) {
    door.nodes.find((n) => n.id === 'which')!.ports = signals('go', 'refused', 'ignored');
    door.nodes.push({ id: 'leave', type: 'noodl.cloud.response', label: 'Not ours: answered, left alone' });
    door.connections.push(wire('which', 'out-ignored', 'leave', 'send'));
  }
  return door;
}

export const SLICE6_CLOUD: CloudComponent[] = [
  paystackDoor(FN_START_PAYMENT, 'Start paying one seller country’s parts of an order through Paystack, split to its sellers', 'pay', START_KEY_SCRIPT, START_PAYMENT_SCRIPT, 'payment'),
  paystackDoor(FN_CHECK_PAYMENT, 'Ask Paystack what happened to a payment, and keep it; the parts it paid move to paid', 'check', CHECK_KEY_SCRIPT, CHECK_PAYMENT_SCRIPT, 'result'),
  paystackDoor(FN_PAYSTACK_EVENT, 'Paystack’s webhook says a payment went through: check it as checkPayment does', 'body', EVENT_KEY_SCRIPT, PAYSTACK_EVENT_SCRIPT, 'result', true)
];

export const SLICE6_CLOUD_SCRIPTS: Record<string, string> = { START_KEY_SCRIPT, START_PAYMENT_SCRIPT, CHECK_KEY_SCRIPT, CHECK_PAYMENT_SCRIPT, EVENT_KEY_SCRIPT, PAYSTACK_EVENT_SCRIPT };
