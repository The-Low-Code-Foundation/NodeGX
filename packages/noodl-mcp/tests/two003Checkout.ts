/**
 * TWO-003 slice 3 — the marketplace's cloud functions for what the admin sets (countries, rates, shelves, the ways to
 * pay each country has) and for a buyer's checkout (an order placed with no account, followed by its private link).
 *
 * The same shape as slice 1 (`two003Cloud.ts`): the policy lets nobody write a row directly, so every write is a
 * function that checks and writes the history beside the change (the world's rule 6). The admin's four are
 * `role:admin`. The buyer's two are **open**: a buyer has no account (W2), so the policy's only gate is a rate limit,
 * and the scripts check everything the buyer sent against the store.
 *
 * ## One payment per seller country (R8, ruled A)
 *
 * A basket with sellers in Ghana and Nigeria is paid twice: once in cedis to the Ghana sellers, once in naira to the
 * Nigeria sellers. So the buyer picks **a way to pay for each seller country**, among the ways the admin turned on
 * there (the approved picture's "How you'll pay in Ghana / in Nigeria"), and each order part keeps the way picked for
 * its seller's country. The world said one way per order until s6; it moved to the order part then (TWO-003 §9.1).
 *
 * ## What `placeOrder` never takes from the buyer
 *
 * A price, a seller, a subtotal or a total. Each line's price is the product's price **now**, read from the store, and
 * kept on the line (the world's rule 2); the parts are made by grouping the products by their seller. The buyer sends
 * product ids, quantities, where it goes, who they are, and the way they picked for each country.
 *
 * Card and mobile money through Paystack came with TWO-004 (`two004Paystack.ts`): the admin turns it on only in a
 * country whose currency Paystack takes, and a checkout picks it only with an email (Paystack's receipt goes there)
 * and when every seller in that country has a subaccount. Flutterwave is still refused until its door exists.
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two003Checkout.test.ts` compiles every one.
 *
 * @module noodl-mcp/tests/two003Checkout
 */
import { CloudComponent, PRELUDE, scripted } from './two003Cloud';
import { PAYSTACK_CURRENCIES, SUBACCOUNT } from './two004Paystack';

export const FN_SAVE_COUNTRY = 'saveCountry';
export const FN_SAVE_RATES = 'saveRates';
export const FN_SAVE_SHELF = 'saveShelf';
export const FN_SAVE_WAY_TO_PAY = 'saveWayToPay';
export const FN_PLACE_ORDER = 'placeOrder';
export const FN_FOLLOW_ORDER = 'followOrder';

/** The policy's `functions` rules slice 3 adds. */
export const SLICE3_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_SAVE_COUNTRY]: { call: 'role:admin' },
  [FN_SAVE_RATES]: { call: 'role:admin' },
  [FN_SAVE_SHELF]: { call: 'role:admin' },
  [FN_SAVE_WAY_TO_PAY]: { call: 'role:admin' },
  [FN_PLACE_ORDER]: { call: 'public', rateLimit: { ratePerMinute: 10, burst: 10 } },
  [FN_FOLLOW_ORDER]: { call: 'public', rateLimit: { ratePerMinute: 30, burst: 10 } }
};

/** The ways to pay that are built, and the name each starts with. Paystack is TWO-004's; Flutterwave isn't built. */
export const BUILT_WAYS: Record<string, string> = {
  'on-delivery': 'Pay on delivery',
  'bank-transfer': 'Bank transfer',
  whatsapp: 'Order on WhatsApp',
  paystack: 'Card or mobile money'
};
/** What each way says to a buyer at checkout until the admin writes its own words. */
export const WAY_WORDS: Record<string, string> = {
  'on-delivery': 'Pay the seller’s rider when it arrives, in cash or by mobile money.',
  'bank-transfer': 'The seller gives you their account when they confirm. Use your order number as the reference.',
  whatsapp: 'Finish the order in a chat with the seller.',
  paystack: 'Pay here by card, mobile money or bank through Paystack, once the sellers confirm delivery. Each seller is paid their share.'
};

/** How many of one product a basket may hold, and how many different products. */
export const MOST_OF_ONE = 99;
export const MOST_LINES = 50;

const CURRENCY_CODE = '/^[A-Z][A-Z][A-Z]$/';

// ── saveCountry ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Add a country, or rename one. Its currency can't change once a seller is in it: the seller's prices are in it.
 */
export const SAVE_COUNTRY_SCRIPT = `${PRELUDE}
var c = Inputs.country;
if (c === undefined || Inputs.userId === undefined) return;
if (!c || typeof c !== 'object' || Array.isArray(c)) { refuse('The country arrived empty.'); return; }
var fields = { name: text(c.name, 80), currency: text(c.currency, 20).toUpperCase() };
if (!fields.name) { refuse('A country needs a name.'); return; }
if (!${CURRENCY_CODE}.test(fields.currency)) { refuse('A currency is its three-letter code: GHS, NGN, KES.'); return; }
var id = text(c.id, 64);
var same = await Noodl.Records.query('Country', { name: { equalTo: fields.name } }, { plain: true, limit: 2 });
if (same.some(function (x) { return x.objectId !== id; })) { refuse('There is already a country called ' + fields.name + '.'); return; }
if (id) {
  var before = await one('Country', { objectId: { equalTo: id } });
  if (!before) { refuse('There is no such country.'); return; }
  if (fields.currency !== before.currency && await one('Seller', { country: { equalTo: ptr('Country', id) } })) {
    refuse('Its currency can’t change: its sellers’ prices are in ' + before.currency + '.');
    return;
  }
  var changed = diff(before, fields);
  if (Object.keys(changed).length) {
    await Noodl.Records.save(id, fields, { className: 'Country' });
    await history('Country', 'country', id, Inputs.userId, changed);
  }
  Outputs.id = id;
  Outputs.done();
  return;
}
var made = await Noodl.Records.create('Country', fields);
await history('Country', 'country', made.getId(), Inputs.userId, diff(null, fields));
Outputs.id = made.getId();
Outputs.done();`;

// ── saveRates ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Set what one unit of each currency is worth in the marketplace's own. The marketplace's own currency is the one worth
 * exactly 1: the first rate ever saved names it, it stays 1, and no other currency may be worth exactly 1 (the buyer's
 * pages take "the one worth 1" as the currency to start with). Every rate is checked before any is written.
 */
export const SAVE_RATES_SCRIPT = `${PRELUDE}
var a = Inputs.rates;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || !Array.isArray(a.rates) || a.rates.length === 0) { refuse('Say which rates.'); return; }
var have = await Noodl.Records.query('Rate', {}, { plain: true, limit: 1000 });
var by = {};
have.forEach(function (r) { by[r.currency] = r; });
var own = have.filter(function (r) { return Number(r.value) === 1; })[0] || null;
var wanted = [], seen = {};
for (var i = 0; i < a.rates.length; i++) {
  var x = a.rates[i] || {};
  var cur = text(x.currency, 20).toUpperCase();
  if (!${CURRENCY_CODE}.test(cur)) { refuse('A currency is its three-letter code: GHS, NGN, KES.'); return; }
  if (seen[cur]) { refuse(cur + ' is there twice.'); return; }
  seen[cur] = true;
  var v = Number(x.value);
  if (!isFinite(v) || v <= 0) { refuse('A rate is a number more than 0: what one ' + cur + ' is worth' + (own ? ' in ' + own.currency : '') + '.'); return; }
  if (own && cur === own.currency && v !== 1) { refuse('The marketplace’s own currency, ' + own.currency + ', is always worth 1.'); return; }
  if (own && cur !== own.currency && v === 1) { refuse('Only the marketplace’s own currency, ' + own.currency + ', is worth exactly 1.'); return; }
  wanted.push({ currency: cur, value: v });
}
if (!own && wanted.filter(function (w) { return w.value === 1; }).length !== 1) { refuse('Start with the marketplace’s own currency: the one worth 1.'); return; }
var saved = 0;
for (var j = 0; j < wanted.length; j++) {
  var w = wanted[j], before = by[w.currency];
  if (before && Number(before.value) === w.value) continue;
  if (before) {
    await Noodl.Records.save(before.objectId, { value: w.value }, { className: 'Rate' });
    await history('Rate', 'rate', before.objectId, Inputs.userId, { value: { from: Number(before.value), to: w.value } });
  } else {
    var made = await Noodl.Records.create('Rate', w);
    await history('Rate', 'rate', made.getId(), Inputs.userId, diff(null, w));
  }
  saved++;
}
Outputs.saved = saved;
Outputs.done();`;

// ── saveShelf ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Add a shelf, or rename one. The world keeps no history for shelves; nothing is deleted. */
export const SAVE_SHELF_SCRIPT = `${PRELUDE}
var c = Inputs.shelf;
if (c === undefined || Inputs.userId === undefined) return;
if (!c || typeof c !== 'object' || Array.isArray(c)) { refuse('The shelf arrived empty.'); return; }
var name = text(c.name, 80);
if (!name) { refuse('A shelf needs a name.'); return; }
var id = text(c.id, 64);
var same = await Noodl.Records.query('Category', { name: { equalTo: name } }, { plain: true, limit: 2 });
if (same.some(function (x) { return x.objectId !== id; })) { refuse('There is already a shelf called ' + name + '.'); return; }
if (id) {
  if (!(await one('Category', { objectId: { equalTo: id } }))) { refuse('There is no such shelf.'); return; }
  await Noodl.Records.save(id, { name: name }, { className: 'Category' });
  Outputs.id = id;
  Outputs.done();
  return;
}
var made = await Noodl.Records.create('Category', { name: name });
Outputs.id = made.getId();
Outputs.done();`;

// ── saveWayToPay ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One way to pay, by its method, and the countries it is on in (the whole list each time, so a toggle can't lose a
 * country another one added). The row is made the first time a way is turned on; it is never deleted, because order
 * parts point at it. Its words to buyers can change.
 */
export const SAVE_WAY_TO_PAY_SCRIPT = `${PRELUDE}
var BUILT = ${JSON.stringify(BUILT_WAYS)};
var PAYSTACK = ${JSON.stringify(PAYSTACK_CURRENCIES)};
var WORDS = ${JSON.stringify(WAY_WORDS)};
var w = Inputs.way;
if (w === undefined || Inputs.userId === undefined) return;
if (!w || typeof w !== 'object' || Array.isArray(w)) { refuse('The way to pay arrived empty.'); return; }
var method = text(w.method, 40);
if (method === 'flutterwave') { refuse('Flutterwave isn’t set up yet.'); return; }
if (!BUILT[method]) { refuse('There is no such way to pay.'); return; }
if (!Array.isArray(w.countries)) { refuse('Say which countries it is on in.'); return; }
var countries = await Noodl.Records.query('Country', {}, { plain: true, limit: 1000 });
var nameOf = {}, currencyOf = {};
countries.forEach(function (c) { nameOf[c.objectId] = c.name || ''; currencyOf[c.objectId] = c.currency || ''; });
var want = [];
for (var i = 0; i < w.countries.length; i++) {
  var cid = idOf(w.countries[i]);
  if (!nameOf[cid]) { refuse('There is no such country.'); return; }
  if (method === 'paystack' && PAYSTACK.indexOf(currencyOf[cid]) < 0) { refuse('Paystack doesn’t take ' + currencyOf[cid] + ', so it can’t be on in ' + nameOf[cid] + '.'); return; }
  if (want.indexOf(cid) < 0) want.push(cid);
}
var before = await one('WayToPay', { method: { equalTo: method } });
var wayId = before ? before.objectId : '';
var changed = {};
if (!before) {
  var fields = { name: BUILT[method], method: method, instructions: typeof w.instructions === 'string' ? text(w.instructions, 500) : WORDS[method] };
  wayId = (await Noodl.Records.create('WayToPay', fields)).getId();
  changed = diff(null, fields);
} else if (typeof w.instructions === 'string' && text(w.instructions, 500) !== (before.instructions || '')) {
  await Noodl.Records.save(wayId, { instructions: text(w.instructions, 500) }, { className: 'WayToPay' });
  changed.instructions = { from: before.instructions || null, to: text(w.instructions, 500) };
}
var onNow = before ? (await Noodl.Records.query('Country', { relatedTo: { id: wayId, key: 'country', className: 'WayToPay' } }, { plain: true, limit: 1000 })).map(function (c) { return c.objectId; }) : [];
for (var j = 0; j < want.length; j++) {
  if (onNow.indexOf(want[j]) < 0) await Noodl.Records.addRelation({ className: 'WayToPay', recordId: wayId, key: 'country', targetClassName: 'Country', targetRecordId: want[j] });
}
for (var k = 0; k < onNow.length; k++) {
  if (want.indexOf(onNow[k]) < 0) await Noodl.Records.removeRelation({ className: 'WayToPay', recordId: wayId, key: 'country', targetClassName: 'Country', targetRecordId: onNow[k] });
}
var names = function (ids) { return ids.map(function (x) { return nameOf[x] || x; }).sort(); };
if (JSON.stringify(names(onNow)) !== JSON.stringify(names(want))) changed.countries = { from: names(onNow), to: names(want) };
if (Object.keys(changed).length) await history('WayToPay', 'wayToPay', wayId, Inputs.userId, changed);
Outputs.id = wayId;
Outputs.done();`;

// ── placeOrder ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A buyer's checkout, with or without an account: one order, one part per seller, one line per product, each line at
 * the price the product has now. Each seller country is paid the way the buyer picked for it, which must be one the
 * admin turned on there. The order's number is the next one this year (MK-2026-00042); its private link is a random
 * token nobody can guess, made here, never by the phone.
 */
export const PLACE_ORDER_SCRIPT = `${PRELUDE}
var BUILT = ${JSON.stringify(BUILT_WAYS)};
var o = Inputs.order;
if (o === undefined) return;
if (!o || typeof o !== 'object' || Array.isArray(o)) { refuse('The order arrived empty.'); return; }
var buyer = { buyerName: text(o.buyerName, 120), phone: text(o.phone, 40), email: text(o.email, 200), address: text(o.address, 500) };
if (!buyer.buyerName) { refuse('Say who the order is for.'); return; }
if (buyer.phone.replace(/[^0-9]/g, '').length < 6) { refuse('A phone number the sellers can call.'); return; }
if (!buyer.address) { refuse('Say where it goes.'); return; }
if (buyer.email && buyer.email.indexOf('@') < 1) { refuse('That email doesn’t look right. Leave it empty if you’d rather.'); return; }
var to = await one('Country', { objectId: { equalTo: idOf(o.country) } });
if (!to) { refuse('Say which country it goes to.'); return; }
if (!Array.isArray(o.lines) || o.lines.length === 0) { refuse('The basket is empty.'); return; }
if (o.lines.length > ${MOST_LINES}) { refuse('A basket holds ${MOST_LINES} different products at most.'); return; }
var qty = {}, order = [];
for (var i = 0; i < o.lines.length; i++) {
  var l = o.lines[i] || {};
  var pid = idOf(l.productId), q = Number(l.quantity);
  if (!pid || !isFinite(q) || q < 1 || Math.floor(q) !== q) { refuse('Each product needs a whole number of 1 or more.'); return; }
  if (!qty[pid]) order.push(pid);
  qty[pid] = (qty[pid] || 0) + q;
  if (qty[pid] > ${MOST_OF_ONE}) { refuse('${MOST_OF_ONE} of one product at most.'); return; }
}
var products = await Noodl.Records.query('Product', { objectId: { containedIn: order } }, { plain: true, limit: ${MOST_LINES} });
var sellers = await Noodl.Records.query('Seller', { objectId: { containedIn: products.map(function (p) { return idOf(p.seller); }) } }, { plain: true, limit: ${MOST_LINES} });
var countries = await Noodl.Records.query('Country', {}, { plain: true, limit: 1000 });
var rates = await Noodl.Records.query('Rate', {}, { plain: true, limit: 1000 });
var product = {}, seller = {}, country = {};
products.forEach(function (p) { product[p.objectId] = p; });
sellers.forEach(function (s) { seller[s.objectId] = s; });
countries.forEach(function (c) { country[c.objectId] = c; });
// The parts: one per seller, in the order the buyer put their products in the basket.
var parts = [], partOf = {};
for (var j = 0; j < order.length; j++) {
  var p = product[order[j]];
  var s = p ? seller[idOf(p.seller)] : null;
  if (!p || !s || p.endedAt || s.endedAt) { refuse((p ? p.name : 'A product') + ' isn’t on sale now. Take it out of the basket and check out again.'); return; }
  if (p.mode !== 'buy') { refuse(p.name + ' isn’t bought here: message the seller about it.'); return; }
  if (!partOf[s.objectId]) { partOf[s.objectId] = { seller: s, country: country[idOf(s.country)], lines: [], subtotal: 0 }; parts.push(partOf[s.objectId]); }
  var price = Number(p.price) || 0;
  partOf[s.objectId].lines.push({ product: p, quantity: qty[p.objectId], price: price });
  partOf[s.objectId].subtotal += price * qty[p.objectId];
}
// The way each seller country is paid: picked by the buyer, turned on there by the admin.
var pay = o.pay && typeof o.pay === 'object' ? o.pay : {};
var wayFor = {};
for (var k = 0; k < parts.length; k++) {
  var c = parts[k].country;
  if (!c) { refuse('A seller in the basket has no country the marketplace sells in.'); return; }
  if (wayFor[c.objectId]) { parts[k].way = wayFor[c.objectId]; continue; }
  var way = await one('WayToPay', { objectId: { equalTo: idOf(pay[c.objectId]) } });
  if (!way || !BUILT[way.method]) { refuse('Pick how you’ll pay in ' + c.name + '.'); return; }
  var on = await Noodl.Records.query('Country', { relatedTo: { id: way.objectId, key: 'country', className: 'WayToPay' } }, { plain: true, limit: 1000 });
  if (!on.some(function (x) { return x.objectId === c.objectId; })) { refuse(way.name + ' isn’t a way to pay in ' + c.name + '.'); return; }
  wayFor[c.objectId] = way;
  parts[k].way = way;
}
for (var m = 0; m < parts.length; m++) {
  if (parts[m].way.method === 'whatsapp' && !String(parts[m].seller.whatsapp || '').replace(/[^0-9]/g, '')) { refuse(parts[m].seller.name + ' has no WhatsApp number: pick another way to pay in ' + parts[m].country.name + '.'); return; }
  if (parts[m].way.method === 'paystack' && !${SUBACCOUNT}.test(String(parts[m].seller.payoutAccount || ''))) { refuse(parts[m].seller.name + ' can’t be paid by card yet: pick another way to pay in ' + parts[m].country.name + '.'); return; }
  if (parts[m].way.method === 'paystack' && !buyer.email) { refuse('Paying by card needs your email: Paystack sends the receipt there.'); return; }
}
// What the buyer saw it in: a currency there is a rate for, else the currency of where it goes.
var rateOf = {};
rates.forEach(function (r) { if (Number(r.value) > 0) rateOf[r.currency] = Number(r.value); });
var seen = text(o.currency, 20).toUpperCase();
if (!rateOf[seen]) seen = to.currency;
var total = 0, sure = !!rateOf[seen];
parts.forEach(function (pt) { var r = rateOf[pt.country.currency]; if (!r) sure = false; else total += pt.subtotal * r / rateOf[seen]; });
// The private link: random, long, made here.
if (typeof crypto === 'undefined' || !crypto.getRandomValues) { refuse('This order could not be placed just now.'); return; }
var bytes = new Uint8Array(24);
crypto.getRandomValues(bytes);
var token = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
// The number: the next one this year. Two checkouts at once may reach for the same one; the store's unique index
// refuses the second, which takes the next.
var year = new Date().getUTCFullYear();
var prefix = 'MK-' + year + '-';
var last = await Noodl.Records.query('Order', { number: { startsWith: prefix } }, { plain: true, limit: 1, sort: ['-number'] });
var n = last[0] ? parseInt(String(last[0].number).slice(prefix.length), 10) || 0 : 0;
var row = Object.assign({}, buyer, { currency: seen, followToken: token, country: ptr('Country', to.objectId) });
if (sure) row.total = Math.round(total * 100) / 100;
if (!row.email) delete row.email;
var made = null, problem = null;
for (var attempt = 1; attempt <= 5 && !made; attempt++) {
  row.number = prefix + String(n + attempt).padStart(5, '0');
  try { made = await Noodl.Records.create('Order', row); } catch (e) { problem = e; }
}
if (!made) { refuse('This order could not be placed just now: ' + ((problem && (problem.error || problem.message)) || 'try again') + '.'); return; }
var orderId = made.getId();
for (var t = 0; t < parts.length; t++) {
  var pt = parts[t];
  var partRow = { status: 'new', subtotal: pt.subtotal, order: ptr('Order', orderId), seller: ptr('Seller', pt.seller.objectId), wayToPay: ptr('WayToPay', pt.way.objectId) };
  var part = await Noodl.Records.create('OrderPart', partRow);
  await history('OrderPart', 'orderPart', part.getId(), Inputs.userId, { status: { from: null, to: 'new' }, wayToPay: { from: null, to: pt.way.name } });
  for (var u = 0; u < pt.lines.length; u++) {
    var ln = pt.lines[u];
    await Noodl.Records.create('OrderLine', { quantity: ln.quantity, price: ln.price, productName: ln.product.name || '', orderPart: ptr('OrderPart', part.getId()), product: ptr('Product', ln.product.objectId) });
  }
}
Outputs.order = { number: row.number, followToken: token };
Outputs.done();`;

// ── followOrder ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * An order as its private link opens it: the facts, not the words (the order page words them). The token is the only
 * key: a short or unknown one is refused the same way, and the rate limit keeps anyone from trying many.
 */
export const FOLLOW_ORDER_SCRIPT = `${PRELUDE}
var a = Inputs.follow;
if (a === undefined) return;
var token = a && typeof a === 'object' ? text(a.token, 100) : '';
var order = token.length >= 32 ? await one('Order', { followToken: { equalTo: token } }) : null;
if (!order) { refuse('There is no order at this link. Check it was copied whole.'); return; }
var parts = await Noodl.Records.query('OrderPart', { order: { equalTo: ptr('Order', order.objectId) } }, { plain: true, limit: 100, sort: ['createdAt'] });
var partIds = parts.map(function (p) { return p.objectId; });
var lines = partIds.length ? await Noodl.Records.query('OrderLine', { orderPart: { containedIn: parts.map(function (p) { return ptr('OrderPart', p.objectId); }) } }, { plain: true, limit: 1000, sort: ['createdAt'] }) : [];
var sellers = await Noodl.Records.query('Seller', { objectId: { containedIn: parts.map(function (p) { return idOf(p.seller); }) } }, { plain: true, limit: 100 });
var ways = await Noodl.Records.query('WayToPay', {}, { plain: true, limit: 100 });
var countries = await Noodl.Records.query('Country', {}, { plain: true, limit: 1000 });
var payments = await Noodl.Records.query('Payment', { order: { equalTo: ptr('Order', order.objectId) } }, { plain: true, limit: 100, sort: ['at'] });
var seller = {}, way = {}, country = {};
sellers.forEach(function (s) { seller[s.objectId] = s; });
ways.forEach(function (w) { way[w.objectId] = w; });
countries.forEach(function (c) { country[c.objectId] = c; });
Outputs.order = {
  number: order.number,
  placedAt: order.createdAt,
  buyerName: order.buyerName || '',
  phone: order.phone || '',
  email: order.email || '',
  address: order.address || '',
  country: (country[idOf(order.country)] || {}).name || '',
  currency: order.currency || '',
  total: typeof order.total === 'number' ? order.total : null,
  payments: payments.map(function (x) { return { country: x.country || '', currency: x.currency || '', amount: Number(x.amount) || 0, outcome: x.outcome || '', at: x.at && x.at.iso ? x.at.iso : x.at || '' }; }),
  parts: parts.map(function (p) {
    var s = seller[idOf(p.seller)] || {}, w = way[idOf(p.wayToPay)] || {}, c = country[idOf(s.country)] || {};
    return {
      seller: s.name || '',
      sellerId: s.objectId || '',
      whatsapp: String(s.whatsapp || '').replace(/[^0-9]/g, ''),
      phone: s.phone || '',
      country: c.name || '',
      countryId: c.objectId || '',
      currency: c.currency || '',
      status: p.status || 'new',
      subtotal: Number(p.subtotal) || 0,
      deliveryCost: typeof p.deliveryCost === 'number' ? p.deliveryCost : null,
      deliveryNote: p.deliveryNote || '',
      cancelledReason: p.cancelledReason || '',
      way: { name: w.name || '', method: w.method || '', instructions: w.instructions || '' },
      lines: lines.filter(function (l) { return idOf(l.orderPart) === p.objectId; }).map(function (l) { return { name: l.productName || '', quantity: Number(l.quantity) || 0, price: Number(l.price) || 0 }; })
    };
  })
};
Outputs.done();`;

export const SLICE3_CLOUD: CloudComponent[] = [
  scripted(FN_SAVE_COUNTRY, 'Add a country, or rename one', 'country', SAVE_COUNTRY_SCRIPT, 'id'),
  scripted(FN_SAVE_RATES, 'Set what each currency is worth in the marketplace’s own', 'rates', SAVE_RATES_SCRIPT, 'saved'),
  scripted(FN_SAVE_SHELF, 'Add a shelf, or rename one', 'shelf', SAVE_SHELF_SCRIPT, 'id'),
  scripted(FN_SAVE_WAY_TO_PAY, 'Turn a way to pay on or off for each country, and say what it tells buyers', 'way', SAVE_WAY_TO_PAY_SCRIPT, 'id'),
  scripted(FN_PLACE_ORDER, 'Place an order, with or without an account: one part per seller, each line at today’s price', 'order', PLACE_ORDER_SCRIPT, 'order', true),
  scripted(FN_FOLLOW_ORDER, 'An order, as its private link opens it', 'follow', FOLLOW_ORDER_SCRIPT, 'order', true)
];

/** Every script slice 3's functions ship, by name, for the spec that compiles them. */
export const SLICE3_CLOUD_SCRIPTS: Record<string, string> = {
  SAVE_COUNTRY_SCRIPT,
  SAVE_RATES_SCRIPT,
  SAVE_SHELF_SCRIPT,
  SAVE_WAY_TO_PAY_SCRIPT,
  PLACE_ORDER_SCRIPT,
  FOLLOW_ORDER_SCRIPT
};
