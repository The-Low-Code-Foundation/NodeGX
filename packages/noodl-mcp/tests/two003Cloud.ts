/**
 * TWO-003 slice 1 — the marketplace's cloud functions for sellers and their products.
 *
 * The policy (`templates/marketplace/nodegx.security.json`, TWO-001 s2) lets **nobody** write a row directly, admins
 * included: every write is one of these functions, because only a function can check WHO is writing and write the
 * history row beside the change (the world's rule 6). Each function is gated twice:
 *
 * 1. **By the policy's `functions.<name>.call` rule**, which names the role (`role:admin`, `role:staff`). A function
 *    runs as the system, so that rule is the only thing in front of it.
 * 2. **In its own script, by the caller's `Person` row**, for what a role cannot say: a seller's staff reach only
 *    their own seller's products, and nobody writes for a stopped seller.
 *
 * ## The shape: one script per function
 *
 * A cloud script reaches the store through `Noodl.Records` (`noodl-viewer-cloud/src/noodl-js-api.js`), as the system.
 * So each function is the Request, one script that checks and writes, and two Responses (done, refused). Stock nodes
 * appear only where a script cannot reach: making a sign-in (`Create User`), granting a role (`Add User To Role`),
 * and reading a secret.
 *
 * Measured s3 (2026-10-14), with a throwaway function on a real backend:
 *
 * - A script's `create` takes a string id for a pointer and stores it as one.
 * - 🔴 **A `pointsTo` filter is refused in a cloud script** ("needs the collection schema"): the cloud runtime has no
 *   collection schema. `equalTo` with an explicit `{__type: 'Pointer'}` works, so every pointer filter here is spelled
 *   that way (`ptr`).
 * - A signal a script fires must be a declared port on the node: a hand-made bundle without one throws
 *   `Outputs.done is not a function`.
 *
 * ## Why every function takes ONE object parameter
 *
 * A function that creates OR updates has optional fields, so "every parameter has arrived" cannot be a readiness test.
 * One `ptype: object, preq: true` parameter is: the script waits for it (and the caller's id) and nothing else.
 *
 * ## Rule 4 — stopping a seller
 *
 * A seller is **stopped, never deleted** (the world's rule 1; TWO-003 §3 said "deletes", the plan of record was
 * wrong). Stopping writes `endedAt` and `stoppedReason` together (the schema's `allOrNone`); bringing back clears
 * both. Its logins are switched off with it (the account's `disabled` flag, which every backend door checks, sessions
already given included) and back on when it returns; every function a seller's staff call also refuses a stopped
seller, so a login made later can't write for it either.
 *
 * @module noodl-mcp/tests/two003Cloud
 */

export const SETUP_TOKEN_SECRET = 'MARKETPLACE_SETUP_TOKEN';

export const FN_SET_UP = 'setUpMarketplace';
export const FN_WHO_AM_I = 'whoAmI';
export const FN_SAVE_SELLER = 'saveSeller';
export const FN_STOP_SELLER = 'stopSeller';
export const FN_GIVE_LOGIN = 'giveLogin';
export const FN_SAVE_PRODUCT = 'saveProduct';
export const FN_TAKE_OFF_SALE = 'takeOffSale';
export const FN_NAME_MARKETPLACE = 'nameMarketplace';

/** The policy's `functions` block for slice 1. The template's `nodegx.security.json` carries exactly this. */
export const SLICE1_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_SET_UP]: { call: 'public', rateLimit: { ratePerMinute: 5, burst: 5 } },
  [FN_WHO_AM_I]: { call: 'authenticated' },
  [FN_SAVE_SELLER]: { call: 'role:admin' },
  [FN_STOP_SELLER]: { call: 'role:admin' },
  [FN_GIVE_LOGIN]: { call: 'role:admin' },
  [FN_SAVE_PRODUCT]: { call: ['role:admin', 'role:staff'] },
  [FN_TAKE_OFF_SALE]: { call: ['role:admin', 'role:staff'] },
  [FN_NAME_MARKETPLACE]: { call: 'role:admin' }
};

type Node = Record<string, unknown>;
type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
export interface CloudComponent {
  name: string;
  path: string;
  description: string;
  nodes: Node[];
  connections: Wire[];
}

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });
const quiet = (...names: string[]) => Object.fromEntries(names.map((n) => [`runOnChange-in-${n}`, false]));
const signals = (...names: string[]) => names.map((n) => ({ name: `out-${n}`, plug: 'output', type: 'signal' }));

/**
 * What every script starts with. `ptr` because a cloud script has no schema (see the header); `idOf` because a plain
 * row hands a pointer back as an object or an id; `history` writes the row rule 6 asks for; `caller` is the Person
 * behind the session, the one thing a role cannot tell a script.
 */
export const PRELUDE = `function ptr(className, id) { return { __type: 'Pointer', className: className, objectId: String(id) }; }
function idOf(v) { return v && typeof v === 'object' ? String(v.objectId || v.id || '') : v ? String(v) : ''; }
function now() { return { __type: 'Date', iso: new Date().toISOString() }; }
function text(v, max) { return typeof v === 'string' ? v.trim().slice(0, max || 2000) : ''; }
async function one(className, where) {
  var rows = await Noodl.Records.query(className, where, { plain: true, limit: 1 });
  return rows[0] || null;
}
async function caller(userId) {
  if (!userId) return null;
  return one('Person', { login: { equalTo: ptr('_User', userId) } });
}
function blank(v) { return v === undefined || v === '' ? null : v; }
function diff(before, after) {
  var changed = {};
  Object.keys(after).forEach(function (k) {
    var a = blank(before ? before[k] : undefined);
    var b = blank(after[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) changed[k] = { from: a, to: b };
  });
  return changed;
}
async function history(className, field, id, userId, changed) {
  var row = { at: now(), changed: changed };
  row[field] = ptr(className, id);
  if (userId) row.who = ptr('_User', userId);
  await Noodl.Records.create(className + 'History', row);
}
function refuse(why) { Outputs.reason = why; Outputs.refused(); }
`;

// ── whoAmI ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Who is signed in, as the app needs it: admin or a seller's staff, and the seller (stopped or not). */
export const WHO_AM_I_SCRIPT = `${PRELUDE}
if (Inputs.userId === undefined) return;
var me = await caller(Inputs.userId);
if (!me) { refuse('This sign-in has no place in the marketplace.'); return; }
var out = { personId: me.objectId, name: me.name || '', role: me.role || '' };
var sellerId = idOf(me.seller);
if (sellerId) {
  var s = await one('Seller', { objectId: { equalTo: sellerId } });
  out.seller = s ? { id: s.objectId, name: s.name || '', stopped: !!s.endedAt } : null;
}
Outputs.me = out;
Outputs.done();`;

// ── saveSeller ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Add a seller, or change one. The country is fixed once set: a seller's prices are in its country's currency. */
export const SAVE_SELLER_SCRIPT = `${PRELUDE}
var s = Inputs.seller;
if (s === undefined || Inputs.userId === undefined) return;
if (!s || typeof s !== 'object' || Array.isArray(s)) { refuse('The seller arrived empty.'); return; }
var fields = { name: text(s.name, 120), story: text(s.story, 4000), phone: text(s.phone, 40), whatsapp: text(s.whatsapp, 40), payoutAccount: text(s.payoutAccount, 120) };
if (s.logo && typeof s.logo === 'object' && /^https?:[/][/]/.test(String(s.logo.url || ''))) fields.logo = { __type: 'File', name: String(s.logo.name || 'logo'), url: String(s.logo.url) };
if (!fields.name) { refuse('A seller needs a name.'); return; }
var id = text(s.id, 64);
if (id) {
  var before = await one('Seller', { objectId: { equalTo: id } });
  if (!before) { refuse('There is no such seller.'); return; }
  if (s.country && idOf(s.country) !== idOf(before.country)) { refuse('A seller’s country can’t change: its prices are in that country’s currency.'); return; }
  var changed = diff(before, fields);
  if (Object.keys(changed).length === 0) { Outputs.id = id; Outputs.done(); return; }
  await Noodl.Records.save(id, fields, { className: 'Seller' });
  await history('Seller', 'seller', id, Inputs.userId, changed);
  Outputs.id = id;
  Outputs.done();
  return;
}
var countryId = idOf(s.country);
var country = countryId ? await one('Country', { objectId: { equalTo: countryId } }) : null;
if (!country) { refuse('A seller needs a country the marketplace sells in.'); return; }
fields.country = ptr('Country', countryId);
Object.keys(fields).forEach(function (k) { if (fields[k] === '') delete fields[k]; });
var made = await Noodl.Records.create('Seller', fields);
var newId = made.getId();
var record = Object.assign({}, fields, { country: countryId });
delete record.logo;
await history('Seller', 'seller', newId, Inputs.userId, diff(null, record));
Outputs.id = newId;
Outputs.done();`;

// ── stopSeller ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Stop a seller (with a reason, always) or bring it back. Nothing is deleted: old orders still name it. */
export const STOP_SELLER_SCRIPT = `${PRELUDE}
var a = Inputs.stop;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say which seller to stop or bring back.'); return; }
var id = text(a.sellerId, 64);
var before = id ? await one('Seller', { objectId: { equalTo: id } }) : null;
if (!before) { refuse('There is no such seller.'); return; }
var stop = a.stopped !== false;
var reason = text(a.reason, 500);
if (stop && !reason) { refuse('Say why the seller is stopped: it is kept with the seller.'); return; }
var fields = stop ? { endedAt: now(), stoppedReason: reason } : { endedAt: null, stoppedReason: null };
if (!stop && !before.endedAt) { Outputs.logins = []; Outputs.id = id; Outputs.done(); return; }
await Noodl.Records.save(id, fields, { className: 'Seller' });
await history('Seller', 'seller', id, Inputs.userId, stop ? { stopped: { from: !!before.endedAt, to: true }, stoppedReason: { from: before.stoppedReason || null, to: reason } } : { stopped: { from: true, to: false } });
// Rule 4: its logins stop too (and start again when it comes back). Each is one Update User, run per login.
var staff = await Noodl.Records.query('Person', { seller: { equalTo: ptr('Seller', id) } }, { plain: true, limit: 1000 });
Outputs.logins = staff.map(function (p) { return { loginId: idOf(p.login), disabled: stop }; }).filter(function (l) { return l.loginId; });
Outputs.id = id;
Outputs.done();`;

// ── saveProduct ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Add a product or change one. The admin may write for any seller; a seller's staff only for their own, and the
 * seller is taken from THEIR row, never from what they sent. Nobody writes for a stopped seller.
 */
export const SAVE_PRODUCT_SCRIPT = `${PRELUDE}
var p = Inputs.product;
if (p === undefined || Inputs.userId === undefined) return;
if (!p || typeof p !== 'object' || Array.isArray(p)) { refuse('The product arrived empty.'); return; }
var me = await caller(Inputs.userId);
if (!me) { refuse('This sign-in has no place in the marketplace.'); return; }
var isAdmin = me.role === 'admin';
var id = text(p.id, 64);
var before = id ? await one('Product', { objectId: { equalTo: id } }) : null;
if (id && !before) { refuse('There is no such product.'); return; }
var sellerId = before ? idOf(before.seller) : isAdmin ? idOf(p.seller) : idOf(me.seller);
if (!isAdmin && sellerId !== idOf(me.seller)) { refuse('That product belongs to another seller.'); return; }
if (before && p.seller && idOf(p.seller) !== sellerId) { refuse('A product can’t move to another seller.'); return; }
var seller = sellerId ? await one('Seller', { objectId: { equalTo: sellerId } }) : null;
if (!seller) { refuse('Say which seller sells it.'); return; }
if (seller.endedAt) { refuse('This seller is stopped: its products can’t change until the admin brings it back.'); return; }
var price = Number(p.price);
var fields = { name: text(p.name, 160), description: text(p.description, 4000), price: price, mode: p.mode === 'enquire' ? 'enquire' : 'buy' };
if (!fields.name) { refuse('A product needs a name.'); return; }
if (!isFinite(price) || price < 0) { refuse('A price is a number, 0 or more.'); return; }
// Photos not sent keep what the product had; a list sent replaces them (at most 8, web addresses only).
if (Array.isArray(p.photos) || !before) {
  fields.photos = (Array.isArray(p.photos) ? p.photos : []).filter(function (f) { return f && typeof f === 'object' && /^https?:[/][/]/.test(String(f.url || '')); }).slice(0, 8).map(function (f) { return { name: String(f.name || 'photo'), url: String(f.url) }; });
}
var categoryId = idOf(p.category) || (before ? idOf(before.category) : '');
var category = categoryId ? await one('Category', { objectId: { equalTo: categoryId } }) : null;
if (!category) { refuse('Put the product on a shelf.'); return; }
fields.category = ptr('Category', categoryId);
var record = Object.assign({}, fields, { category: categoryId });
if (before) {
  var changed = diff(Object.assign({}, before, { category: idOf(before.category) }), record);
  if (Object.keys(changed).length) {
    await Noodl.Records.save(id, fields, { className: 'Product' });
    await history('Product', 'product', id, Inputs.userId, changed);
  }
  Outputs.id = id;
  Outputs.done();
  return;
}
fields.seller = ptr('Seller', sellerId);
var made = await Noodl.Records.create('Product', fields);
await history('Product', 'product', made.getId(), Inputs.userId, diff(null, Object.assign(record, { seller: sellerId })));
Outputs.id = made.getId();
Outputs.done();`;

// ── takeOffSale ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Take a product off sale, or put it back. Nothing is deleted: old orders still show it. */
export const TAKE_OFF_SALE_SCRIPT = `${PRELUDE}
var a = Inputs.sale;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say which product.'); return; }
var me = await caller(Inputs.userId);
if (!me) { refuse('This sign-in has no place in the marketplace.'); return; }
var id = text(a.productId, 64);
var before = id ? await one('Product', { objectId: { equalTo: id } }) : null;
if (!before) { refuse('There is no such product.'); return; }
if (me.role !== 'admin' && idOf(before.seller) !== idOf(me.seller)) { refuse('That product belongs to another seller.'); return; }
var seller = await one('Seller', { objectId: { equalTo: idOf(before.seller) } });
if (!seller || seller.endedAt) { refuse('This seller is stopped: its products can’t change until the admin brings it back.'); return; }
var off = a.off !== false;
if (off === !!before.endedAt) { Outputs.id = id; Outputs.done(); return; }
await Noodl.Records.save(id, { endedAt: off ? now() : null }, { className: 'Product' });
await history('Product', 'product', id, Inputs.userId, { onSale: { from: off, to: !off } });
Outputs.id = id;
Outputs.done();`;

export const LOGIN_SWITCH = 'helpers/setLoginDisabled';

/**
 * One login switched off or on: the per-item work `stopSeller`'s Run Tasks does. A helper, not a function (the
 * policy names no call rule for it, and nothing outside a function can reach it). `disabled` is the account flag the
 * backend checks at every door, sessions it already gave included (BMG-004); the generic store refuses to write it,
 * Update User may.
 */
const SET_LOGIN_DISABLED: CloudComponent = {
  name: LOGIN_SWITCH,
  path: `#__cloud__/${LOGIN_SWITCH}`,
  description: 'Switch one login off or on',
  nodes: [
    {
      id: 'in',
      type: 'Component Inputs',
      label: 'One login',
      ports: [
        { name: 'Do', plug: 'output', type: 'signal' },
        { name: 'loginId', plug: 'output', type: 'string' },
        { name: 'disabled', plug: 'output', type: 'boolean' }
      ]
    },
    { id: 'switch', type: 'noodl.cloud.updateuser', label: 'Switch it', parameters: { properties: 'disabled' } },
    {
      id: 'out',
      type: 'Component Outputs',
      label: 'Switched',
      ports: [
        { name: 'Success', plug: 'input', type: 'signal' },
        { name: 'Failure', plug: 'input', type: 'signal' }
      ]
    }
  ],
  connections: [
    wire('in', 'loginId', 'switch', 'userId'),
    wire('in', 'disabled', 'switch', 'prop-disabled'),
    wire('in', 'Do', 'switch', 'store'),
    wire('switch', 'done', 'out', 'Success'),
    wire('switch', 'failure', 'out', 'Failure')
  ]
};

/** `stopSeller` — the script stops (or brings back) the seller, then every login it has is switched to match. */
const STOP_SELLER: CloudComponent = {
  name: FN_STOP_SELLER,
  path: `#__cloud__/${FN_STOP_SELLER}`,
  description: 'Stop a seller with a reason, or bring it back; its logins follow',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'stopSeller(stop)', parameters: { params: 'stop', 'ptype-stop': 'object', 'preq-stop': true, allowNoAuth: false } },
    { id: 'run', type: 'JavaScriptFunction', label: 'Stop or bring back the seller, and list its logins', ports: signals('done', 'refused'), parameters: { functionScript: STOP_SELLER_SCRIPT, ...quiet('stop', 'userId') } },
    { id: 'logins', type: 'RunTasks', label: 'Switch each login to match', parameters: { taskTemplate: `/#__cloud__/${LOGIN_SWITCH}`, maxRunningTasks: 4, stopOnFailure: true } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'id' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'run', 'in-userId'),
    wire('req', 'pm-stop', 'run', 'in-stop'),
    wire('req', 'receive', 'run', 'run'),
    wire('run', 'out-logins', 'logins', 'items'),
    wire('run', 'out-done', 'logins', 'run'),
    wire('run', 'out-id', 'ok', 'pm-id'),
    wire('logins', 'done', 'ok', 'send'),
    // No logins to switch (a seller nobody was given one for): nothing to do is still done.
    wire('logins', 'unchanged', 'ok', 'send'),
    wire('logins', 'failure', 'no', 'send'),
    wire('run', 'out-reason', 'no', 'errorMessage'),
    wire('run', 'out-refused', 'no', 'send'),
    wire('run', 'failure', 'no', 'send')
  ]
};

/**
 * Request → one script → done or refused. The shape of every function but the two that make a sign-in. `open` is a
 * function anyone may call with no account (a guest's checkout): its Request allows no session, and its script waits
 * for the parameter alone.
 */
export function scripted(name: string, description: string, param: string, script: string, answer: string, open = false): CloudComponent {
  // Only a script that reads the caller gets the caller: the door refuses a wire to a port the script never names.
  const who = script.includes('Inputs.userId');
  return {
    name,
    path: `#__cloud__/${name}`,
    description,
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', label: `${name}(${param})`, parameters: { params: param, [`ptype-${param}`]: 'object', [`preq-${param}`]: true, allowNoAuth: open } },
      { id: 'run', type: 'JavaScriptFunction', label: description, ports: signals('done', 'refused'), parameters: { functionScript: script, ...quiet(param, ...(who ? ['userId'] : [])) } },
      { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: answer } },
      { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
    ],
    connections: [
      ...(who ? [wire('req', 'userId', 'run', 'in-userId')] : []),
      wire('req', `pm-${param}`, 'run', `in-${param}`),
      wire('req', 'receive', 'run', 'run'),
      wire('run', `out-${answer}`, 'ok', `pm-${answer}`),
      wire('run', 'out-done', 'ok', 'send'),
      wire('run', 'out-reason', 'no', 'errorMessage'),
      wire('run', 'out-refused', 'no', 'send'),
      wire('run', 'failure', 'no', 'send')
    ]
  };
}

/** `whoAmI` takes nothing: a Request with no parameter, so the script waits only for the caller. */
const WHO_AM_I: CloudComponent = {
  name: FN_WHO_AM_I,
  path: `#__cloud__/${FN_WHO_AM_I}`,
  description: 'Who is signed in: the admin or a seller’s staff, and their seller',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'whoAmI()', parameters: { allowNoAuth: false } },
    { id: 'run', type: 'JavaScriptFunction', label: 'Read the caller’s person and seller', ports: signals('done', 'refused'), parameters: { functionScript: WHO_AM_I_SCRIPT, ...quiet('userId') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'me' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'run', 'in-userId'),
    wire('req', 'receive', 'run', 'run'),
    wire('run', 'out-me', 'ok', 'pm-me'),
    wire('run', 'out-done', 'ok', 'send'),
    wire('run', 'out-reason', 'no', 'errorMessage'),
    wire('run', 'out-refused', 'no', 'send'),
    wire('run', 'failure', 'no', 'send')
  ]
};

// ── the two functions that make a sign-in ──────────────────────────────────────────────────────────────────────────

/** The longest name a marketplace may have: the bar holds it on a phone. Longer is refused, never cut. */
export const MOST_MARKETPLACE_NAME = 60;

/** Check a setup token in constant time, that the marketplace has no admin yet, and its name. */
export const SET_UP_GATE_SCRIPT = `${PRELUDE}
var a = Inputs.setup;
if (a === undefined || Inputs.expected === undefined) return;
if (!a || typeof a !== 'object') { Outputs.denied(); return; }
var expected = String(Inputs.expected || '');
var supplied = String(a.setupToken || '');
var d = expected.length ^ supplied.length;
for (var i = 0; i < Math.max(expected.length, supplied.length); i++) d |= (expected.charCodeAt(i) || 0) ^ (supplied.charCodeAt(i) || 0);
if (expected.length === 0 || d !== 0) { Outputs.denied(); return; }
var admin = await one('Person', { role: { equalTo: 'admin' } });
if (admin) { Outputs.denied(); return; }
var shop = typeof a.marketplace === 'string' ? a.marketplace.trim() : '';
if (!shop) { refuse('The marketplace’s name, as buyers will see it.'); return; }
if (shop.length > ${MOST_MARKETPLACE_NAME}) { refuse('A name of ${MOST_MARKETPLACE_NAME} characters or fewer.'); return; }
var email = text(a.email, 200).toLowerCase();
if (!email || !a.password || String(a.password).length < 8) { refuse('An email and a password of 8 characters or more.'); return; }
Outputs.marketplace = shop;
Outputs.username = email;
Outputs.email = email;
Outputs.password = String(a.password);
Outputs.name = text(a.name, 120) || email;
Outputs.ok();`;

/** After the sign-in exists and holds its role: the Person row, and its history. */
export const personScript = (role: 'admin' | 'seller') => `${PRELUDE}
if (Inputs.loginId === undefined) return;
var row = { name: Inputs.name, email: Inputs.email, role: '${role}', login: ptr('_User', Inputs.loginId) };
if (Inputs.sellerId) row.seller = ptr('Seller', Inputs.sellerId);
var made = await Noodl.Records.create('Person', row);
await history('Person', 'person', made.getId(), Inputs.by || Inputs.loginId, diff(null, { name: row.name, email: row.email, role: row.role, seller: Inputs.sellerId || null }));
Outputs.personId = made.getId();
Outputs.done();`;

/**
 * R13 (Richard, 2026-10-15): the marketplace keeps its name in its one `Marketplace` row, which every page reads.
 * Made by the first admin, with its history. Once: the gate lets set-up through only while there is no admin, so a
 * "is there a row already?" check here could never be reached (s18's mutant stayed green; removed).
 */
export const NAME_MARKETPLACE_SCRIPT = `${PRELUDE}
if (Inputs.loginId === undefined || Inputs.marketplace === undefined) return;
var made = await Noodl.Records.create('Marketplace', { name: Inputs.marketplace });
await history('Marketplace', 'marketplace', made.getId(), Inputs.loginId, diff(null, { name: Inputs.marketplace }));
Outputs.done();`;

/**
 * `nameMarketplace` — the admin renames the marketplace (s19, R13's follow-up). The row is the policy's `update:
 * nobody`, so this is the one way to change it, and it writes the history beside the change. The same name again
 * changes nothing and writes no history; an empty or too long name is refused, never cut, as at set-up.
 */
export const RENAME_MARKETPLACE_SCRIPT = `${PRELUDE}
var a = Inputs.marketplace;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || Array.isArray(a)) { refuse('The name arrived empty.'); return; }
var name = typeof a.name === 'string' ? a.name.trim() : '';
if (!name) { refuse('The marketplace’s name, as buyers will see it.'); return; }
if (name.length > ${MOST_MARKETPLACE_NAME}) { refuse('A name of ${MOST_MARKETPLACE_NAME} characters or fewer.'); return; }
var row = await one('Marketplace', {});
if (!row) { refuse('This marketplace is not set up yet. Set it up first.'); return; }
var changed = diff({ name: row.name }, { name: name });
if (Object.keys(changed).length) {
  await Noodl.Records.save(row.objectId, { name: name }, { className: 'Marketplace' });
  await history('Marketplace', 'marketplace', row.objectId, Inputs.userId, changed);
}
Outputs.name = name;
Outputs.done();`;

/** `setUpMarketplace` — the first admin and the marketplace's name, against the backend's setup secret, once. */
const SET_UP: CloudComponent = {
  name: FN_SET_UP,
  path: `#__cloud__/${FN_SET_UP}`,
  description: 'Name the marketplace and make its first admin, once, with the setup token',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'setUpMarketplace(setup)', parameters: { params: 'setup', 'ptype-setup': 'object', 'preq-setup': true, allowNoAuth: true } },
    { id: 'secret', type: 'noodl.cloud.secret', label: SETUP_TOKEN_SECRET, parameters: { name: SETUP_TOKEN_SECRET } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'The token matches, and there is no admin yet', ports: signals('ok', 'denied', 'refused'), parameters: { functionScript: SET_UP_GATE_SCRIPT, ...quiet('setup', 'expected') } },
    { id: 'create', type: 'noodl.cloud.createuser', label: 'The admin’s sign-in', parameters: { emailVerified: true } },
    { id: 'grant', type: 'noodl.cloud.addusertorole', label: 'Make them the admin', parameters: { role: 'admin', createRole: true } },
    { id: 'person', type: 'JavaScriptFunction', label: 'The admin’s person, and its history', ports: signals('done', 'refused'), parameters: { functionScript: personScript('admin'), ...quiet('loginId', 'name', 'email') } },
    { id: 'named', type: 'JavaScriptFunction', label: 'The marketplace’s name, and its history', ports: signals('done'), parameters: { functionScript: NAME_MARKETPLACE_SCRIPT, ...quiet('loginId', 'marketplace') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Set up', parameters: { params: 'personId' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'This marketplace could not be set up with that.' } },
    { id: 'why', type: 'noodl.cloud.response', label: 'Refused, with why', parameters: { status: 'failure' } }
  ],
  connections: [
    wire('req', 'pm-setup', 'gate', 'in-setup'),
    wire('req', 'receive', 'secret', 'fetch'),
    wire('secret', 'value', 'gate', 'in-expected'),
    wire('secret', 'done', 'gate', 'run'),
    wire('gate', 'out-username', 'create', 'username'),
    wire('gate', 'out-email', 'create', 'email'),
    wire('gate', 'out-password', 'create', 'password'),
    wire('gate', 'out-ok', 'create', 'create'),
    wire('create', 'userId', 'grant', 'userId'),
    wire('create', 'done', 'grant', 'add'),
    // An account with this email already exists: refused, never granted (it may be somebody else's).
    wire('create', 'unchanged', 'no', 'send'),
    wire('create', 'userId', 'person', 'in-loginId'),
    wire('gate', 'out-name', 'person', 'in-name'),
    wire('gate', 'out-email', 'person', 'in-email'),
    wire('grant', 'done', 'person', 'run'),
    wire('grant', 'unchanged', 'person', 'run'),
    wire('person', 'out-personId', 'ok', 'pm-personId'),
    wire('create', 'userId', 'named', 'in-loginId'),
    wire('gate', 'out-marketplace', 'named', 'in-marketplace'),
    wire('person', 'out-done', 'named', 'run'),
    wire('named', 'out-done', 'ok', 'send'),
    wire('gate', 'out-reason', 'why', 'errorMessage'),
    wire('gate', 'out-refused', 'why', 'send'),
    wire('gate', 'out-denied', 'no', 'send'),
    ...['secret', 'gate', 'create', 'grant', 'person', 'named'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

/** The seller exists and isn't stopped, and the email and password will do. */
export const GIVE_LOGIN_GATE_SCRIPT = `${PRELUDE}
var a = Inputs.login;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say whose login this is.'); return; }
var sellerId = text(a.sellerId, 64);
var seller = sellerId ? await one('Seller', { objectId: { equalTo: sellerId } }) : null;
if (!seller) { refuse('There is no such seller.'); return; }
if (seller.endedAt) { refuse('This seller is stopped: bring it back before giving it a login.'); return; }
var email = text(a.email, 200).toLowerCase();
if (!email || email.indexOf('@') < 1) { refuse('A login needs an email address.'); return; }
if (!a.password || String(a.password).length < 8) { refuse('A password of 8 characters or more.'); return; }
var taken = await one('Person', { email: { equalTo: email } });
if (taken) { refuse('Someone in the marketplace already signs in with that email.'); return; }
Outputs.username = email;
Outputs.email = email;
Outputs.password = String(a.password);
Outputs.name = text(a.name, 120) || email;
Outputs.sellerId = sellerId;
Outputs.by = Inputs.userId;
Outputs.ok();`;

/** `giveLogin` — the admin gives a seller's staff member a sign-in: an account, `role:staff`, and their Person row. */
const GIVE_LOGIN: CloudComponent = {
  name: FN_GIVE_LOGIN,
  path: `#__cloud__/${FN_GIVE_LOGIN}`,
  description: 'Give a seller’s staff member a login',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'giveLogin(login)', parameters: { params: 'login', 'ptype-login': 'object', 'preq-login': true, allowNoAuth: false } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'The seller is open, the email is free', ports: signals('ok', 'refused'), parameters: { functionScript: GIVE_LOGIN_GATE_SCRIPT, ...quiet('login', 'userId') } },
    { id: 'create', type: 'noodl.cloud.createuser', label: 'Their sign-in', parameters: { emailVerified: true } },
    { id: 'grant', type: 'noodl.cloud.addusertorole', label: 'Make them staff (for uploading photos)', parameters: { role: 'staff', createRole: true } },
    { id: 'person', type: 'JavaScriptFunction', label: 'Their person, for that seller, and its history', ports: signals('done', 'refused'), parameters: { functionScript: personScript('seller'), ...quiet('loginId', 'name', 'email', 'sellerId', 'by') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Given', parameters: { params: 'personId' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That login could not be made.' } },
    { id: 'why', type: 'noodl.cloud.response', label: 'Refused, with why', parameters: { status: 'failure' } }
  ],
  connections: [
    wire('req', 'userId', 'gate', 'in-userId'),
    wire('req', 'pm-login', 'gate', 'in-login'),
    wire('req', 'receive', 'gate', 'run'),
    wire('gate', 'out-username', 'create', 'username'),
    wire('gate', 'out-email', 'create', 'email'),
    wire('gate', 'out-password', 'create', 'password'),
    wire('gate', 'out-ok', 'create', 'create'),
    wire('create', 'userId', 'grant', 'userId'),
    wire('create', 'done', 'grant', 'add'),
    // An account with this email already exists: refused, never granted (it may be somebody else's).
    wire('create', 'unchanged', 'no', 'send'),
    wire('create', 'userId', 'person', 'in-loginId'),
    wire('gate', 'out-name', 'person', 'in-name'),
    wire('gate', 'out-email', 'person', 'in-email'),
    wire('gate', 'out-sellerId', 'person', 'in-sellerId'),
    wire('gate', 'out-by', 'person', 'in-by'),
    wire('grant', 'done', 'person', 'run'),
    wire('grant', 'unchanged', 'person', 'run'),
    wire('person', 'out-personId', 'ok', 'pm-personId'),
    wire('person', 'out-done', 'ok', 'send'),
    wire('gate', 'out-reason', 'why', 'errorMessage'),
    wire('gate', 'out-refused', 'why', 'send'),
    ...['gate', 'create', 'grant', 'person'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

export const SLICE1_CLOUD: CloudComponent[] = [
  SET_UP,
  WHO_AM_I,
  scripted(FN_SAVE_SELLER, 'Add a seller, or change one', 'seller', SAVE_SELLER_SCRIPT, 'id'),
  SET_LOGIN_DISABLED,
  STOP_SELLER,
  GIVE_LOGIN,
  scripted(FN_SAVE_PRODUCT, 'Add a product, or change one, for a seller the caller may write for', 'product', SAVE_PRODUCT_SCRIPT, 'id'),
  scripted(FN_TAKE_OFF_SALE, 'Take a product off sale, or put it back', 'sale', TAKE_OFF_SALE_SCRIPT, 'id'),
  scripted(FN_NAME_MARKETPLACE, 'Rename the marketplace', 'marketplace', RENAME_MARKETPLACE_SCRIPT, 'name')
];
