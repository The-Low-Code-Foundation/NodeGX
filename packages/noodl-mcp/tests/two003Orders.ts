/**
 * TWO-003 slice 4 — orders: a seller's **Orders** tab, where each of their order parts is confirmed (with the delivery
 * cost) and moved along one step at a time, and the same page for the admin, who sees every seller's parts. The buyer's
 * order page (slice 3, `two003Basket.ts`) already draws every step; this is what moves them. Held to the approved
 * picture (`look/marketplace.html`: "Their orders": to confirm, paid to pack, sent, and the confirm box).
 *
 * ## One function, one step at a time
 *
 * `movePart` takes a part and where it goes. It moves only to the NEXT step for that part's way to pay, or to
 * cancelled (always with why, which the buyer sees). Delivered and cancelled are the end. Confirming needs the delivery
 * cost, in the seller's currency (0 when it is free), and may carry when it comes. Each move writes its history row
 * (the world's rule 6). A seller's staff move only their own seller's parts, taken from THEIR Person row, never from
 * what they send; the admin moves any.
 *
 * **Paid on delivery has no "paid" step**: confirmed, packed, sent, delivered, and it is paid when it is delivered. The
 * other ways (bank transfer, WhatsApp) are paid before they are packed, and the seller says so when the money is with
 * them. Card and mobile money (TWO-004) are marked paid by the provider (`checkPayment`), never by the seller: from
 * confirmed, a seller can only wait for it (or cancel).
 *
 * ## The page reads as the signed-in person
 *
 * The policy (TWO-001) lets staff read their own parts, the orders those parts are in (the buyer's name, phone and
 * address, never the private link) and their lines, and the admin read everything; the page asks for what it needs
 * and the policy decides what comes back. Up to 1,000 parts (the slice 1 `all()`): a seller past that needs paging.
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two003Orders.test.ts` compiles and runs every one.
 *
 * @module noodl-mcp/tests/two003Orders
 */
import { CloudComponent, PRELUDE, scripted } from './two003Cloud';
import { PAID_BY_PROVIDER } from './two004Paystack';
import {
  BUTTON,
  button,
  call,
  CARD,
  column,
  COMPONENTS,
  fn,
  go,
  group,
  input,
  LINE,
  MAIN,
  PageComponent,
  PAGES,
  PILL,
  pct,
  READ,
  refusedBox,
  refusedWires,
  rowOf,
  shell,
  T_META,
  T_NAME,
  T_REFUSED,
  T_TITLE,
  text,
  wire
} from './two003Pages';

export const FN_MOVE_PART = 'movePart';

/** The policy's `functions` rules slice 4 adds. */
export const SLICE4_FUNCTION_RULES: Record<string, { call: unknown }> = {
  [FN_MOVE_PART]: { call: ['role:admin', 'role:staff'] }
};

/** Every step an order part can reach, in order; `cancelled` sits beside them. */
export const STEPS = ['new', 'confirmed', 'paid', 'packed', 'sent', 'delivered'];
/** The ways to pay with no "paid" step: the money changes hands at the door. */
export const PAID_AT_THE_DOOR = ['on-delivery'];
const STEP_NAMES: Record<string, string> = { new: 'New', confirmed: 'Confirmed', paid: 'Paid', packed: 'Packed', sent: 'Sent', delivered: 'Delivered', cancelled: 'Cancelled' };

// ── movePart ───────────────────────────────────────────────────────────────────────────────────────────────────────

export const MOVE_PART_SCRIPT = `${PRELUDE}
var STEPS = ${JSON.stringify(STEPS)};
var AT_THE_DOOR = ${JSON.stringify(PAID_AT_THE_DOOR)};
var BY_PROVIDER = ${JSON.stringify(PAID_BY_PROVIDER)};
var NAMES = ${JSON.stringify(STEP_NAMES)};
var m = Inputs.move;
if (m === undefined || Inputs.userId === undefined) return;
if (!m || typeof m !== 'object' || Array.isArray(m)) { refuse('Say which part, and where it moves.'); return; }
var me = await caller(Inputs.userId);
if (!me) { refuse('This sign-in has no place in the marketplace.'); return; }
var id = text(m.partId, 64);
var part = id ? await one('OrderPart', { objectId: { equalTo: id } }) : null;
if (!part) { refuse('There is no such order part.'); return; }
if (me.role !== 'admin' && (!idOf(me.seller) || idOf(part.seller) !== idOf(me.seller))) { refuse('That part of the order is another seller’s.'); return; }
var from = part.status || 'new';
if (from === 'delivered' || from === 'cancelled') { refuse('This part is ' + from + ': it doesn’t move any more.'); return; }
var way = await one('WayToPay', { objectId: { equalTo: idOf(part.wayToPay) } });
var steps = way && AT_THE_DOOR.indexOf(way.method) >= 0 ? STEPS.filter(function (s) { return s !== 'paid'; }) : STEPS;
var to = typeof m.to === 'string' ? m.to : '';
var fields = {};
if (to === 'cancelled') {
  var why = text(m.reason, 500);
  if (!why) { refuse('Say why it is cancelled: the buyer sees it.'); return; }
  fields = { status: 'cancelled', cancelledReason: why };
} else {
  var next = steps[steps.indexOf(from) + 1];
  if (to !== next) { refuse('From ' + NAMES[from] + ' it moves to ' + NAMES[next] + ' next.'); return; }
  if (to === 'paid' && way && BY_PROVIDER.indexOf(way.method) >= 0) { refuse('A card payment is marked paid by the payment provider, once the buyer has paid.'); return; }
  fields.status = to;
  if (to === 'confirmed') {
    var typed = m.deliveryCost === undefined || m.deliveryCost === null ? '' : String(m.deliveryCost).trim().replace(',', '.');
    var cost = Number(typed);
    if (!typed || !isFinite(cost) || cost < 0) { refuse('Say what delivery costs: 0 if it is free.'); return; }
    fields.deliveryCost = Math.round(cost * 100) / 100;
    fields.deliveryNote = text(m.deliveryNote, 200);
  }
}
await Noodl.Records.save(id, fields, { className: 'OrderPart' });
await history('OrderPart', 'orderPart', id, Inputs.userId, diff(part, fields));
Outputs.part = { id: id, status: fields.status };
Outputs.done();`;

export const SLICE4_CLOUD: CloudComponent[] = [
  scripted(FN_MOVE_PART, 'Move an order part one step along, or cancel it with why: its seller’s staff, or the admin', 'move', MOVE_PART_SCRIPT, 'part')
];

export const SLICE4_CLOUD_SCRIPTS: Record<string, string> = { MOVE_PART_SCRIPT };

// ── /Seller/Tabs ───────────────────────────────────────────────────────────────────────────────────────────────────

const SELLER_TABS_LIST: Array<[string, string, string, Record<string, string>]> = [
  ['orders', 'Orders', PAGES.orders, {}],
  ['products', 'Products', PAGES.products, { sellerId: 'mine' }],
  ['enquiries', 'Enquiries', PAGES.enquiries, {}]
];

export const SELLER_TABS_LOOK = `var on = String(Inputs.on || '');
Outputs.orders = on === 'orders' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.products = on === 'products' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.enquiries = on === 'enquiries' ? 'mk-tab mk-tab-on' : 'mk-tab';`;

const SELLER_TABS: PageComponent = {
  path: COMPONENTS.sellerTabs,
  description: 'A seller’s tabs: Orders, Products, Enquiries',
  nodes: [
    group('stbRoot', 'The tabs', undefined, rowOf({ backgroundColor: 'var(--surface)', columnGap: 'var(--space-0)', cssClassName: 'mk-tabs' })),
    ...SELLER_TABS_LIST.map(([key, words]) => ({ id: `stb_${key}`, type: BUTTON, label: words, parent: 'stbRoot', parameters: { label: words, backgroundColor: 'transparent', borderStyle: 'none', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', sizeMode: 'contentHeight', cssClassName: 'mk-tab' } })),
    { id: 'stbIn', type: 'Component Inputs', label: 'Which tab', ports: [{ name: 'on', type: 'string', plug: 'output' }] },
    fn('stbLook', 'Which tab is this page', SELLER_TABS_LOOK, []),
    ...SELLER_TABS_LIST.map(([key, words, target, params]) => go(`stbTo_${key}`, `To ${words}`, target, params))
  ],
  connections: [
    wire('stbIn', 'on', 'stbLook', 'in-on'),
    ...SELLER_TABS_LIST.flatMap(([key]) => [wire('stbLook', `out-${key}`, `stb_${key}`, 'cssClassName'), wire(`stb_${key}`, 'onClick', `stbTo_${key}`, 'navigate')])
  ]
};

// ── /Seller/OrderCard ──────────────────────────────────────────────────────────────────────────────────────────────

/** Confirm: the delivery cost and when, as typed. What is sent is checked by `movePart`, not here. */
export const CONFIRM_GATHER = `Outputs.move = { partId: String(Inputs.id || ''), to: 'confirmed', deliveryCost: Inputs.cost === undefined ? '' : String(Inputs.cost), deliveryNote: Inputs.when === undefined ? '' : String(Inputs.when) };
Outputs.go();`;
export const MOVE_GATHER = `Outputs.move = { partId: String(Inputs.id || ''), to: String(Inputs.next || '') };
Outputs.go();`;
export const CANCEL_GATHER = `Outputs.move = { partId: String(Inputs.id || ''), to: 'cancelled', reason: Inputs.reason === undefined ? '' : String(Inputs.reason) };
Outputs.go();`;
export const ORDERS_STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const SMALL = { ...LINE, paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', fontSize: 'var(--text-sm)' };

const ORDER_CARD: PageComponent = {
  path: COMPONENTS.orderCard,
  description: 'One seller’s part of an order, as the seller (or the admin) moves it: confirm with the delivery cost, the next step, or cancel with why',
  nodes: [
    group('ocRoot', 'A part of an order', undefined, CARD),
    group('ocHead', 'Order and buyer, and where it is', 'ocRoot', rowOf({ justifyContent: 'space-between', alignItems: 'flex-start' })),
    text('ocTitle', 'MK-… · the buyer', 'ocHead', '', { ...T_NAME, sizeMode: 'contentHeight', width: pct(100), cssClassName: 'mk-grow' }),
    group('ocPill', 'Where it is', 'ocHead', { ...PILL }),
    text('ocPillWords', 'Where it is', 'ocPill', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', cssClassName: 'mk-nowrap' }),
    text('ocSeller', 'Whose part (the admin sees it)', 'ocRoot', '', { ...T_META, fontWeight: 'var(--font-bold)', mounted: false }),
    text('ocLines', 'What is in it', 'ocRoot', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    text('ocWhere', 'Where it goes, and the buyer’s phone', 'ocRoot', '', T_META),
    text('ocWay', 'How it is paid', 'ocRoot', '', T_META),
    text('ocNote', 'The delivery, or why it was cancelled', 'ocRoot', '', T_META),
    group('ocConfirm', 'Confirm: the delivery cost and when', 'ocRoot', column({ rowGap: 'var(--space-2)', mounted: false })),
    group('ocConfirmFields', 'Cost and when', 'ocConfirm', rowOf({ alignItems: 'flex-end', flexWrap: 'wrap', rowGap: 'var(--space-2)', cssClassName: 'mk-row2' })),
    input('ocCost', 'ocConfirmFields', 'Delivery cost', { type: 'number' }),
    input('ocWhen', 'ocConfirmFields', 'When it comes'),
    button('ocConfirmGo', 'Confirm', 'ocConfirm', 'Confirm and ask the buyer to pay', MAIN),
    group('ocActions', 'Next step, or cancel', 'ocRoot', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)', mounted: false })),
    button('ocMove', 'The next step', 'ocActions', '', { ...SMALL, backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)', mounted: false }),
    button('ocCancelOpen', 'Cancel…', 'ocActions', 'Cancel this part…', { ...SMALL, mounted: false }),
    group('ocCancel', 'Cancel, with why', 'ocRoot', column({ rowGap: 'var(--space-2)', mounted: false })),
    input('ocReason', 'ocCancel', 'Why it is cancelled (the buyer sees this)'),
    group('ocCancelButtons', 'Cancel it, or keep it', 'ocCancel', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)' })),
    button('ocCancelGo', 'Cancel it', 'ocCancelButtons', 'Cancel it', { ...SMALL, color: 'var(--destructive)', borderColor: 'var(--destructive)' }),
    button('ocCancelKeep', 'Keep it', 'ocCancelButtons', 'Keep it', SMALL),
    text('ocError', 'What went wrong', 'ocRoot', '', { ...T_REFUSED, mounted: false }),
    {
      id: 'ocIn',
      type: 'Component Inputs',
      label: 'One part',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'head', type: 'string', plug: 'output' },
        { name: 'pill', type: 'string', plug: 'output' },
        { name: 'pillBg', type: 'string', plug: 'output' },
        { name: 'pillInk', type: 'string', plug: 'output' },
        { name: 'seller', type: 'string', plug: 'output' },
        { name: 'hasSeller', type: 'boolean', plug: 'output' },
        { name: 'lines', type: 'string', plug: 'output' },
        { name: 'where', type: 'string', plug: 'output' },
        { name: 'way', type: 'string', plug: 'output' },
        { name: 'note', type: 'string', plug: 'output' },
        { name: 'canConfirm', type: 'boolean', plug: 'output' },
        { name: 'costLabel', type: 'string', plug: 'output' },
        { name: 'confirmLabel', type: 'string', plug: 'output' },
        { name: 'canMove', type: 'boolean', plug: 'output' },
        { name: 'next', type: 'string', plug: 'output' },
        { name: 'moveLabel', type: 'string', plug: 'output' },
        { name: 'canCancel', type: 'boolean', plug: 'output' },
        { name: 'hasActions', type: 'boolean', plug: 'output' }
      ]
    },
    fn('ocGatherConfirm', 'Confirm, with the cost and when', CONFIRM_GATHER, ['go'], ['id', 'cost', 'when']),
    fn('ocGatherMove', 'The next step', MOVE_GATHER, ['go'], ['id', 'next']),
    fn('ocGatherCancel', 'Cancel, with why', CANCEL_GATHER, ['go'], ['id', 'reason']),
    call('ocCall', 'movePart(move)', FN_MOVE_PART),
    { id: 'ocCancelling', type: 'Switch', label: 'Asking why it is cancelled' },
    { id: 'ocFailed', type: 'Switch', label: 'The last move was refused' },
    fn('ocStamp', 'Say an order part moved', ORDERS_STAMP, ['go']),
    { id: 'ocMoved', type: 'Set Variable', label: 'An order part moved', parameters: { name: 'ordersChanged', setWith: 'string' } }
  ],
  connections: [
    wire('ocIn', 'head', 'ocTitle', 'text'),
    wire('ocIn', 'pill', 'ocPillWords', 'text'),
    wire('ocIn', 'pillBg', 'ocPill', 'backgroundColor'),
    wire('ocIn', 'pillInk', 'ocPillWords', 'color'),
    wire('ocIn', 'seller', 'ocSeller', 'text'),
    wire('ocIn', 'hasSeller', 'ocSeller', 'mounted'),
    wire('ocIn', 'lines', 'ocLines', 'text'),
    wire('ocIn', 'where', 'ocWhere', 'text'),
    wire('ocIn', 'way', 'ocWay', 'text'),
    wire('ocIn', 'note', 'ocNote', 'text'),
    wire('ocIn', 'canConfirm', 'ocConfirm', 'mounted'),
    wire('ocIn', 'costLabel', 'ocCost', 'label'),
    wire('ocIn', 'confirmLabel', 'ocConfirmGo', 'label'),
    wire('ocIn', 'canMove', 'ocMove', 'mounted'),
    wire('ocIn', 'moveLabel', 'ocMove', 'label'),
    wire('ocIn', 'canCancel', 'ocCancelOpen', 'mounted'),
    wire('ocIn', 'hasActions', 'ocActions', 'mounted'),
    wire('ocIn', 'id', 'ocGatherConfirm', 'in-id'),
    wire('ocIn', 'id', 'ocGatherMove', 'in-id'),
    wire('ocIn', 'id', 'ocGatherCancel', 'in-id'),
    wire('ocIn', 'next', 'ocGatherMove', 'in-next'),
    wire('ocCost', 'onTextChanged', 'ocGatherConfirm', 'in-cost'),
    wire('ocWhen', 'onTextChanged', 'ocGatherConfirm', 'in-when'),
    wire('ocReason', 'onTextChanged', 'ocGatherCancel', 'in-reason'),
    wire('ocConfirmGo', 'onClick', 'ocGatherConfirm', 'run'),
    wire('ocMove', 'onClick', 'ocGatherMove', 'run'),
    wire('ocCancelOpen', 'onClick', 'ocCancelling', 'on'),
    wire('ocCancelKeep', 'onClick', 'ocCancelling', 'off'),
    wire('ocCancelling', 'state', 'ocCancel', 'mounted'),
    wire('ocCancelGo', 'onClick', 'ocGatherCancel', 'run'),
    wire('ocGatherConfirm', 'out-move', 'ocCall', 'in-move'),
    wire('ocGatherConfirm', 'out-go', 'ocCall', 'call'),
    wire('ocGatherMove', 'out-move', 'ocCall', 'in-move'),
    wire('ocGatherMove', 'out-go', 'ocCall', 'call'),
    wire('ocGatherCancel', 'out-move', 'ocCall', 'in-move'),
    wire('ocGatherCancel', 'out-go', 'ocCall', 'call'),
    wire('ocCall', 'error', 'ocError', 'text'),
    wire('ocCall', 'failure', 'ocFailed', 'on'),
    wire('ocCall', 'done', 'ocFailed', 'off'),
    wire('ocFailed', 'state', 'ocError', 'mounted'),
    wire('ocCall', 'done', 'ocCancelling', 'off'),
    wire('ocCall', 'done', 'ocStamp', 'run'),
    wire('ocStamp', 'out-at', 'ocMoved', 'value'),
    wire('ocStamp', 'out-go', 'ocMoved', 'do')
  ]
};

// ── /Seller/OrderSection ───────────────────────────────────────────────────────────────────────────────────────────

const ORDER_SECTION: PageComponent = {
  path: COMPONENTS.orderSection,
  description: 'One kind of order part on the Orders page (to confirm, to pack, on its way…): a heading and its parts',
  nodes: [
    group('osRoot', 'A section', undefined, column({ rowGap: 'var(--space-2)' })),
    group('osHead', 'Heading and what to do', 'osRoot', rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 'var(--space-2)', rowGap: 'var(--space-0)' })),
    text('osHeading', 'The heading', 'osHead', '', { fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'mk-display', as: 'h2', sizeMode: 'contentSize' }),
    text('osNote', 'What to do with these', 'osHead', '', { ...T_META, sizeMode: 'contentSize' }),
    group('osList', 'The parts', 'osRoot', column({ rowGap: 'var(--space-3)' })),
    { id: 'osEach', type: 'For Each', label: 'One card per part', parent: 'osList', parameters: { template: COMPONENTS.orderCard } },
    {
      id: 'osIn',
      type: 'Component Inputs',
      label: 'One section',
      ports: [
        { name: 'heading', type: 'string', plug: 'output' },
        { name: 'note', type: 'string', plug: 'output' },
        { name: 'cards', type: 'array', plug: 'output' }
      ]
    }
  ],
  connections: [wire('osIn', 'heading', 'osHeading', 'text'), wire('osIn', 'note', 'osNote', 'text'), wire('osIn', 'cards', 'osEach', 'items')]
};

// ── /Pages/Orders ──────────────────────────────────────────────────────────────────────────────────────────────────

/** The sections, in the order the seller works through them: what needs them first. */
export const SECTIONS: Array<[string, string, string]> = [
  ['confirm', 'To confirm', 'tell the buyer the delivery cost'],
  ['pay', 'Waiting for the buyer to pay', 'mark it paid when the money is with you; a card payment marks itself'],
  ['pack', 'To pack', ''],
  ['send', 'Packed, to send', ''],
  ['sent', 'On its way', 'mark it delivered when the buyer has it'],
  ['delivered', 'Delivered', ''],
  ['cancelled', 'Cancelled', '']
];

/**
 * Every order part the signed-in person may see (their seller's, or every seller's for the admin), worded for the
 * screen: by section, newest first, each with what it holds, where it goes, how it is paid, and the one move it can
 * make next.
 */
export const ORDERS_LOAD = `${READ}
var STEPS = ${JSON.stringify(STEPS)};
var AT_THE_DOOR = ${JSON.stringify(PAID_AT_THE_DOOR)};
var BY_PROVIDER = ${JSON.stringify(PAID_BY_PROVIDER)};
var SECTIONS = ${JSON.stringify(SECTIONS)};
var MOVES = { paid: 'The buyer has paid', packed: 'Packed', sent: 'Sent', delivered: 'Delivered' };
var PILLS = { new: 'New', confirmed: 'Confirmed', paid: 'Paid', packed: 'Packed', sent: 'Sent', delivered: 'Delivered', cancelled: 'Cancelled' };
function symbolOf(cur) {
  try {
    var part = new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).filter(function (x) { return x.type === 'currency'; })[0];
    return part ? part.value : cur;
  } catch (e) { return cur; }
}
void Inputs.changed; // a card moved a part: read again
try {
  var me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var isAdmin = !!me && me.role === 'admin';
if (!me || (!isAdmin && !me.seller)) { Outputs.problem = 'This page is for the marketplace’s sellers and its admin.'; Outputs.refused = true; Outputs.ok = false; return; }
try {
  var parts = await all('OrderPart', isAdmin ? {} : { seller: { equalTo: ptr('Seller', me.seller.id) } });
  var orderIds = [];
  parts.forEach(function (p) { if (orderIds.indexOf(idOf(p.order)) < 0) orderIds.push(idOf(p.order)); });
  var orders = orderIds.length ? await all('Order', { objectId: { containedIn: orderIds } }) : [];
  var lines = parts.length ? await all('OrderLine', { orderPart: { containedIn: parts.map(function (p) { return ptr('OrderPart', p.objectId); }) } }) : [];
  var sellers = await all('Seller', isAdmin ? {} : { objectId: { equalTo: me.seller.id } });
  var countries = await all('Country');
  var ways = await all('WayToPay');
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var order = {}, seller = {}, country = {}, way = {};
orders.forEach(function (o) { order[o.objectId] = o; });
sellers.forEach(function (s) { seller[s.objectId] = s; });
countries.forEach(function (c) { country[c.objectId] = c; });
ways.forEach(function (w) { way[w.objectId] = w; });
function stageOf(p, atTheDoor) {
  var s = p.status || 'new';
  if (s === 'new') return 'confirm';
  if (s === 'confirmed') return atTheDoor ? 'pack' : 'pay';
  if (s === 'paid') return 'pack';
  if (s === 'packed') return 'send';
  return s;
}
var bySection = {};
parts
  .slice()
  .sort(function (a, b) { return String((order[idOf(b.order)] || {}).number || '').localeCompare(String((order[idOf(a.order)] || {}).number || '')); })
  .forEach(function (p) {
    var o = order[idOf(p.order)] || {}, s = seller[idOf(p.seller)] || {}, c = country[idOf(s.country)] || {}, w = way[idOf(p.wayToPay)] || {};
    var atTheDoor = AT_THE_DOOR.indexOf(w.method) >= 0, byProvider = BY_PROVIDER.indexOf(w.method) >= 0;
    var steps = atTheDoor ? STEPS.filter(function (x) { return x !== 'paid'; }) : STEPS;
    var status = p.status || 'new', cur = c.currency || '';
    var done = status === 'delivered' || status === 'cancelled';
    var next = done ? '' : steps[steps.indexOf(status) + 1] || '';
    var mine = lines.filter(function (l) { return idOf(l.orderPart) === p.objectId; });
    var cost = typeof p.deliveryCost === 'number';
    var note = status === 'cancelled' ? 'Cancelled: ' + (p.cancelledReason || 'no reason kept') + '.'
      : cost ? 'Delivery ' + money(p.deliveryCost, cur) + (p.deliveryNote ? ', ' + p.deliveryNote : '') + '. Total ' + money((Number(p.subtotal) || 0) + p.deliveryCost, cur) + '.' + (byProvider && status === 'confirmed' ? ' The buyer pays by card; it says paid here once they have.' : '')
      : '';
    var card = {
      id: p.objectId,
      head: (o.number || 'An order') + ' · ' + (o.buyerName || ''),
      pill: PILLS[status] || status,
      pillBg: status === 'cancelled' ? 'var(--bad-bg)' : status === 'new' ? 'var(--warn-bg)' : 'var(--ok-bg)',
      pillInk: status === 'cancelled' ? 'var(--bad)' : status === 'new' ? 'var(--warn)' : 'var(--ok)',
      seller: isAdmin ? (s.name || '') + (c.name ? ' · ' + c.name : '') : '',
      hasSeller: isAdmin,
      lines: mine.map(function (l) { return (l.productName || '') + ' × ' + (Number(l.quantity) || 0); }).join(', ') + ' · ' + money(p.subtotal, cur),
      where: [o.address, o.phone].filter(Boolean).join(' · '),
      way: (w.name || 'Way to pay not kept') + (w.method === 'bank-transfer' ? ', reference ' + (o.number || '') : ''),
      note: note,
      canConfirm: status === 'new',
      costLabel: 'Delivery cost (' + symbolOf(cur) + ')',
      confirmLabel: atTheDoor ? 'Confirm: they pay when it arrives' : 'Confirm and ask the buyer to pay',
      canMove: !done && status !== 'new' && !!next && !(next === 'paid' && byProvider),
      next: next,
      moveLabel: next === 'delivered' && atTheDoor ? 'Delivered and paid' : MOVES[next] || '',
      canCancel: !done,
      hasActions: !done
    };
    var key = stageOf(p, atTheDoor);
    (bySection[key] = bySection[key] || []).push(card);
  });
var count = function (k) { return (bySection[k] || []).length; };
Outputs.sections = SECTIONS.filter(function (x) { return count(x[0]); }).map(function (x) { return { id: x[0], heading: x[1], note: x[2], cards: bySection[x[0]] }; });
Outputs.kpis = [
  { id: 'confirm', n: String(count('confirm')), words: 'to confirm' },
  { id: 'pay', n: String(count('pay')), words: 'to be paid' },
  { id: 'pack', n: String(count('pack') + count('send')), words: 'to pack and send' },
  { id: 'sent', n: String(count('sent')), words: 'on their way' }
];
Outputs.empty = parts.length === 0;
Outputs.band = isAdmin ? 'Admin' : 'Signed in as ' + (me.seller.name || '');
Outputs.heading = isAdmin ? 'Every order' : 'Your orders';
Outputs.fine = isAdmin
  ? 'You see every seller’s part of every order, and can move any of them.'
  : 'You see only your part of each order: your products, the buyer’s name, phone and address. Other sellers in the same order don’t see yours.';
Outputs.isAdmin = isAdmin;
Outputs.isStaff = !isAdmin;
Outputs.refused = false;
Outputs.ok = true;`;

// ── /Seller/Kpi ─────────────────────────────────────────────────────────────────────────────────────────────────────

const KPI: PageComponent = {
  path: COMPONENTS.kpi,
  description: 'How many order parts are at one stage, at a glance',
  nodes: [
    group('kpRoot', 'How many', undefined, column({ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', cssClassName: 'mk-grow' })),
    text('kpN', 'The count', 'kpRoot', '0', { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--secondary)', cssClassName: 'mk-display' }),
    text('kpWords', 'Of what', 'kpRoot', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }),
    { id: 'kpIn', type: 'Component Inputs', label: 'One count', ports: [{ name: 'n', type: 'string', plug: 'output' }, { name: 'words', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('kpIn', 'n', 'kpN', 'text'), wire('kpIn', 'words', 'kpWords', 'text')]
};

const ORDERS: PageComponent = {
  path: PAGES.orders,
  description: 'Orders: a seller’s parts of each order (or every part, for the admin), confirmed and moved along',
  nodes: [
    ...shell('or', 'Orders', 'orders', '', 960, [
      group('orAdminTabsBox', 'The admin’s tabs', 'orRoot', { width: pct(100), sizeMode: 'contentHeight', mounted: false }),
      { id: 'orAdminTabs', type: COMPONENTS.tabs, label: 'The admin’s tabs', parent: 'orAdminTabsBox', parameters: { on: 'orders' } },
      group('orSellerTabsBox', 'A seller’s tabs', 'orRoot', { width: pct(100), sizeMode: 'contentHeight', mounted: false }),
      { id: 'orSellerTabs', type: COMPONENTS.sellerTabs, label: 'Orders, Products, Enquiries', parent: 'orSellerTabsBox', parameters: { on: 'orders' } }
    ]),
    group('orContent', 'The orders', 'orBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('orTitle', 'Heading', 'orContent', '', T_TITLE),
    group('orKpis', 'How many, at a glance', 'orContent', rowOf({ alignItems: 'stretch', columnGap: 'var(--space-2)' })),
    { id: 'orEachKpi', type: 'For Each', label: 'To confirm, to be paid, to pack and send, on their way', parent: 'orKpis', parameters: { template: COMPONENTS.kpi } },
    text('orEmpty', 'No orders yet', 'orContent', 'No orders yet. They arrive here when a buyer checks out.', { ...T_META, mounted: false }),
    group('orSections', 'The parts, by what they need', 'orContent', column({ rowGap: 'var(--space-6)' })),
    { id: 'orEach', type: 'For Each', label: 'One section per kind', parent: 'orSections', parameters: { template: COMPONENTS.orderSection } },
    text('orFine', 'What this page shows, and whose', 'orContent', '', T_META),
    ...refusedBox('or'),
    fn('orLoad', 'The order parts this person may see', ORDERS_LOAD, []),
    { id: 'orVersion', type: 'Variable2', label: 'An order part moved', parameters: { name: 'ordersChanged' } }
  ],
  connections: [
    wire('orRoot', 'didMount', 'orLoad', 'run'),
    wire('orVersion', 'value', 'orLoad', 'in-changed'),
    wire('orLoad', 'out-ok', 'orContent', 'mounted'),
    wire('orLoad', 'out-band', 'orBand', 'words'),
    wire('orLoad', 'out-heading', 'orTitle', 'text'),
    wire('orLoad', 'out-isAdmin', 'orAdminTabsBox', 'mounted'),
    wire('orLoad', 'out-isStaff', 'orSellerTabsBox', 'mounted'),
    wire('orLoad', 'out-kpis', 'orEachKpi', 'items'),
    wire('orLoad', 'out-empty', 'orEmpty', 'mounted'),
    wire('orLoad', 'out-sections', 'orEach', 'items'),
    wire('orLoad', 'out-fine', 'orFine', 'text'),
    ...refusedWires('or', 'orLoad')
  ]
};

/** Leaves first (a leaf before what places it), then the page. */
export const SLICE4_LEAVES: PageComponent[] = [SELLER_TABS, ORDER_CARD, ORDER_SECTION, KPI];
export const SLICE4_PAGES: PageComponent[] = [ORDERS];

/** Every script slice 4's pages ship, by name, for the spec that compiles and runs them. */
export const SLICE4_SCRIPTS: Record<string, string> = {
  SELLER_TABS_LOOK,
  CONFIRM_GATHER,
  MOVE_GATHER,
  CANCEL_GATHER,
  ORDERS_STAMP,
  ORDERS_LOAD
};
