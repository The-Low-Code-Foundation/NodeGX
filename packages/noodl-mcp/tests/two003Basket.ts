/**
 * TWO-003 slice 3 — the basket, the checkout and the order's private page, held to the approved picture
 * (`look/marketplace.html`: Basket, Checkout, Following an order).
 *
 * ## What a buyer can do here, with no account (W2)
 *
 * - **The basket** (`basket`): products from several sellers, grouped by seller, with how many and what each costs in
 *   the seller's currency; one total per seller country, because each country is paid on its own (R8, ruled A); about
 *   how much together, in the buyer's currency. It lives on the phone (`mk-basket`), so nothing is sent until checkout.
 * - **The checkout** (`checkout`): who it's for, where it goes, and how they'll pay **in each seller country**, among
 *   the ways the admin turned on there (a WhatsApp order only where every seller in that country has a number). Then
 *   `placeOrder`, and the order's page.
 * - **The order** (`order/{token}`): the private link. Its number (and how to read it out on the phone), each seller's
 *   part moving through new, confirmed, paid, packed, sent, delivered, what is owed and how, and a WhatsApp message to
 *   the seller. The phone remembers the orders placed or opened on it (`mk-orders`): **My order** in the bottom bar.
 *
 * ## How the pages share the basket
 *
 * The basket's truth is the phone's storage. Whatever changes it (Add on a product, − + Remove on a line, a checkout)
 * writes the storage and sets the `basket` variable to a fresh stamp; every page that shows the basket reads the
 * storage again when that stamp changes. The way picked for each country is the `payPicks` variable (JSON, by country
 * id), so a pick made once is offered first next time; a pick that is no longer offered falls back to the first way.
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two003Basket.test.ts` compiles and runs every one.
 *
 * @module noodl-mcp/tests/two003Basket
 */
import { BUILT_WAYS, FN_PLACE_ORDER } from './two003Checkout';
import { PAID_AT_THE_DOOR, STEPS } from './two003Orders';
import { FN_CHECK_PAYMENT, FN_START_PAYMENT } from './two004Paystack';
import {
  BACK,
  BUTTON,
  button,
  CARD,
  column,
  DROPDOWN,
  FIELD,
  fn,
  go,
  group,
  input,
  LINE,
  MAIN,
  Node,
  PageComponent,
  PILL,
  px,
  pct,
  rowOf,
  T_META,
  T_NAME,
  T_REFUSED,
  T_TITLE,
  text,
  wire
} from './two003Pages';
import { H2, LINK, LOGO_PORTS, logoOrInitials, ORDERS_KEY, SHOP, SHOP_COMPONENTS, SHOP_PAGES, shopShell, WHATSAPP } from './two003Shop';

const callFn = (id: string, label: string, name: string): Node => ({ id, type: 'CloudFunction2', label, parameters: { function: name } });
const setVar = (id: string, label: string, name: string): Node => ({ id, type: 'Set Variable', label, parameters: { name, setWith: 'string' } });
const variable = (id: string, label: string, name: string): Node => ({ id, type: 'Variable2', label, parameters: { name } });

// ── /Shop/Nav: the bottom bar ─────────────────────────────────────────────────────────────────────────────────────

/** Home, the basket with how many it holds, and the order this phone placed or opened last (when there is one). */
export const NAV_LOAD = `${SHOP}
void Inputs.basket;
void Inputs.lastOrder;
var n = basketCount(readBasket()), orders = readOrders(), on = String(Inputs.on || '');
Outputs.basketLabel = n ? 'Basket · ' + n : 'Basket';
Outputs.hasOrder = orders.length > 0;
Outputs.token = orders.length ? orders[0].token : '';
Outputs.homeInk = on === 'home' ? 'var(--secondary)' : 'var(--muted-foreground)';
Outputs.basketInk = on === 'basket' ? 'var(--secondary)' : 'var(--muted-foreground)';
Outputs.orderInk = on === 'order' ? 'var(--secondary)' : 'var(--muted-foreground)';`;

const NAV_BUTTON = { ...LINK, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', sizeMode: 'contentSize', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' };

const NAV: PageComponent = {
  path: SHOP_COMPONENTS.nav,
  description: 'The bottom bar: Home, the basket and how many it holds, My order',
  nodes: [
    group('nvRoot', 'The bottom bar', undefined, rowOf({ backgroundColor: 'var(--surface)', justifyContent: 'space-around', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', cssClassName: 'mk-nav' })),
    { id: 'nvHome', type: BUTTON, label: 'Home', parent: 'nvRoot', parameters: { ...NAV_BUTTON, label: 'Home' } },
    { id: 'nvBasket', type: BUTTON, label: 'Basket', parent: 'nvRoot', parameters: { ...NAV_BUTTON, label: 'Basket' } },
    { id: 'nvOrder', type: BUTTON, label: 'My order', parent: 'nvRoot', parameters: { ...NAV_BUTTON, label: 'My order', mounted: false } },
    { id: 'nvIn', type: 'Component Inputs', label: 'Which page this is', ports: [{ name: 'on', type: 'string', plug: 'output' }] },
    fn('nvLoad', 'How many in the basket; the last order on this phone', NAV_LOAD, []),
    variable('nvBasketNow', 'The basket changed', 'basket'),
    variable('nvLastOrder', 'An order was placed', 'lastOrder'),
    go('nvToHome', 'To the shop', SHOP_PAGES.home),
    go('nvToBasket', 'To the basket', SHOP_PAGES.basket),
    go('nvToOrder', 'To my order', SHOP_PAGES.order)
  ],
  connections: [
    wire('nvRoot', 'didMount', 'nvLoad', 'run'),
    wire('nvIn', 'on', 'nvLoad', 'in-on'),
    wire('nvBasketNow', 'value', 'nvLoad', 'in-basket'),
    wire('nvLastOrder', 'value', 'nvLoad', 'in-lastOrder'),
    wire('nvLoad', 'out-basketLabel', 'nvBasket', 'label'),
    wire('nvLoad', 'out-hasOrder', 'nvOrder', 'mounted'),
    wire('nvLoad', 'out-token', 'nvToOrder', 'pm-token'),
    wire('nvLoad', 'out-homeInk', 'nvHome', 'color'),
    wire('nvLoad', 'out-basketInk', 'nvBasket', 'color'),
    wire('nvLoad', 'out-orderInk', 'nvOrder', 'color'),
    wire('nvHome', 'onClick', 'nvToHome', 'navigate'),
    wire('nvBasket', 'onClick', 'nvToBasket', 'navigate'),
    wire('nvOrder', 'onClick', 'nvToOrder', 'navigate')
  ]
};

// ── /Shop/BasketLine and /Shop/BasketSeller ───────────────────────────────────────────────────────────────────────

/** One line changed on this phone: `how` is the new quantity, from `l.quantity`; 0 takes it out. */
const lineEdit = (how: string) => `${SHOP}
var id = String(Inputs.id || '');
if (!id) return;
var b = readBasket().map(function (l) { return l.productId !== id ? l : { productId: id, quantity: ${how} }; }).filter(function (l) { return l.quantity > 0; });
Outputs.basket = writeBasket(b);
Outputs.go();`;
export const LINE_LESS = lineEdit('l.quantity - 1');
export const LINE_MORE = lineEdit('Math.min(99, l.quantity + 1)');
export const LINE_REMOVE = lineEdit('0');

const SMALL_LINE = { ...LINE, paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', fontSize: 'var(--text-sm)' };

const BASKET_LINE: PageComponent = {
  path: SHOP_COMPONENTS.basketLine,
  description: 'One product in the basket: how many, what each costs, the line’s total; one fewer, one more, take it out',
  nodes: [
    group('blRoot', 'A line', undefined, column({ rowGap: 'var(--space-2)', paddingTop: 'var(--space-2)' })),
    group('blTop', 'Photo, name, total', 'blRoot', rowOf({ alignItems: 'flex-start' })),
    { id: 'blThumb', type: 'Image', label: 'Photo (sm)', parent: 'blTop', parameters: { width: px(52), height: px(52), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-md)', alt: '', mounted: false } },
    group('blNoThumb', 'No photo', 'blTop', { width: px(52), height: px(52), sizeMode: 'explicit', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--muted)', mounted: false }),
    group('blWords', 'Name, and how many at what', 'blTop', column({ rowGap: 'var(--space-0-5)', cssClassName: 'mk-grow' })),
    text('blName', 'Name', 'blWords', '', { ...T_NAME, fontSize: 'var(--text-sm)' }),
    text('blEach', 'How many at what', 'blWords', '', { ...T_META, cssClassName: 'mk-num' }),
    text('blTotal', 'The line’s total', 'blTop', '', { ...T_NAME, fontSize: 'var(--text-sm)', sizeMode: 'contentSize', cssClassName: 'mk-num' }),
    group('blActions', 'One fewer, one more, take it out', 'blRoot', rowOf({ columnGap: 'var(--space-2)', paddingLeft: 'var(--space-16)' })),
    button('blLess', 'One fewer', 'blActions', '−', SMALL_LINE),
    button('blMore', 'One more', 'blActions', '+', SMALL_LINE),
    button('blRemove', 'Take it out', 'blActions', 'Remove', { ...BACK, fontWeight: 'var(--font-normal)', color: 'var(--destructive)' }),
    {
      id: 'blIn',
      type: 'Component Inputs',
      label: 'One line',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'thumb', type: 'string', plug: 'output' },
        { name: 'hasThumb', type: 'boolean', plug: 'output' },
        { name: 'noThumb', type: 'boolean', plug: 'output' },
        { name: 'each', type: 'string', plug: 'output' },
        { name: 'total', type: 'string', plug: 'output' },
        { name: 'less', type: 'boolean', plug: 'output' }
      ]
    },
    fn('blDoLess', 'One fewer', LINE_LESS, ['go'], ['id']),
    fn('blDoMore', 'One more', LINE_MORE, ['go'], ['id']),
    fn('blDoRemove', 'Take it out', LINE_REMOVE, ['go'], ['id']),
    setVar('blSetLess', 'The basket changed', 'basket'),
    setVar('blSetMore', 'The basket changed', 'basket'),
    setVar('blSetRemove', 'The basket changed', 'basket')
  ],
  connections: [
    wire('blIn', 'name', 'blName', 'text'),
    wire('blIn', 'thumb', 'blThumb', 'src'),
    wire('blIn', 'hasThumb', 'blThumb', 'mounted'),
    wire('blIn', 'noThumb', 'blNoThumb', 'mounted'),
    wire('blIn', 'each', 'blEach', 'text'),
    wire('blIn', 'total', 'blTotal', 'text'),
    wire('blIn', 'less', 'blLess', 'mounted'),
    ...(['Less', 'More', 'Remove'] as const).flatMap((k) => [
      wire('blIn', 'id', `blDo${k}`, 'in-id'),
      wire(`bl${k}`, 'onClick', `blDo${k}`, 'run'),
      wire(`blDo${k}`, 'out-basket', `blSet${k}`, 'value'),
      wire(`blDo${k}`, 'out-go', `blSet${k}`, 'do')
    ])
  ]
};

const bsLogo = logoOrInitials('bs', 'bsHead', 40, 'bsIn');
const BASKET_SELLER: PageComponent = {
  path: SHOP_COMPONENTS.basketSeller,
  description: 'One seller’s products in the basket: who, where, and what is paid in which currency',
  nodes: [
    group('bsRoot', 'A seller’s products', undefined, CARD),
    group('bsHead', 'The seller', 'bsRoot', rowOf({ columnGap: 'var(--space-3)' })),
    ...bsLogo.nodes,
    group('bsWords', 'Name, and where it pays', 'bsHead', column()),
    text('bsName', 'Name', 'bsWords', '', T_NAME),
    text('bsPlace', 'Country, and the currency it is paid in', 'bsWords', '', T_META),
    { id: 'bsEach', type: 'For Each', label: 'One line per product', parent: 'bsRoot', parameters: { template: SHOP_COMPONENTS.basketLine } },
    { id: 'bsIn', type: 'Component Inputs', label: 'One seller', ports: [{ name: 'name', type: 'string', plug: 'output' }, { name: 'place', type: 'string', plug: 'output' }, { name: 'lines', type: 'array', plug: 'output' }, ...LOGO_PORTS] }
  ],
  connections: [...bsLogo.wires, wire('bsIn', 'name', 'bsName', 'text'), wire('bsIn', 'place', 'bsPlace', 'text'), wire('bsIn', 'lines', 'bsEach', 'items')]
};

/** One row of totals: a country, in its currency. */
const TOTAL_ROW: PageComponent = {
  path: '/Shop/TotalRow',
  description: 'One total: a seller country, in its currency',
  nodes: [
    group('trRoot', 'A total', undefined, rowOf({ justifyContent: 'space-between' })),
    text('trName', 'Which country, in what', 'trRoot', '', { ...T_NAME, fontSize: 'var(--text-sm)', sizeMode: 'contentSize' }),
    text('trTotal', 'How much', 'trRoot', '', { ...T_NAME, fontSize: 'var(--text-sm)', sizeMode: 'contentSize', cssClassName: 'mk-num' }),
    { id: 'trIn', type: 'Component Inputs', label: 'One total', ports: [{ name: 'words', type: 'string', plug: 'output' }, { name: 'total', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('trIn', 'words', 'trName', 'text'), wire('trIn', 'total', 'trTotal', 'text')]
};

// ── /Pages/Shop/Basket ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The basket on this phone, and the rows it needs. A product no longer on sale (or its seller stopped, or now bought by
 * talking) is taken out, and the page says so; the names are kept while the page is open, so the words outlive the
 * second read the clean-up causes.
 */
export const BASKET_LOAD = `${SHOP}
void Inputs.basket;
var b = readBasket();
var gone = Component.Object.get('gone') || [];
if (!b.length) { Outputs.failed = false; Outputs.data = { lines: [], products: [], sellers: [], countries: [], rates: [], gone: gone }; return; }
try {
  var products = await all('Product', { objectId: { containedIn: b.map(function (l) { return l.productId; }) } });
  var got = await Promise.all([all('Seller', { objectId: { containedIn: products.map(function (p) { return idOf(p.seller); }) } }), all('Country'), all('Rate')]);
} catch (e) { Outputs.problem = 'Your basket could not be read just now. Check the connection, then open it again.'; Outputs.failed = true; return; }
var product = {}, seller = {};
products.forEach(function (p) { product[p.objectId] = p; });
got[0].forEach(function (s) { seller[s.objectId] = s; });
var live = b.filter(function (l) {
  var p = product[l.productId], s = p ? seller[idOf(p.seller)] : null;
  var ok = !!(p && s && !p.endedAt && !s.endedAt && p.mode === 'buy');
  if (!ok) gone = gone.concat([p ? p.name || 'A product' : 'A product that is no longer here']);
  return ok;
});
Component.Object.set('gone', gone);
Outputs.failed = false;
Outputs.data = { lines: live, products: products, sellers: got[0], countries: got[1], rates: got[2], gone: gone };
if (live.length !== b.length) { Outputs.basket = writeBasket(live); Outputs.cleaned(); }`;

/** The basket, worded: by seller, one total per seller country, about how much together in the buyer's currency. */
export const BASKET_SHAPE = `${SHOP}
var d = Inputs.data;
if (!d) return;
var product = {}, seller = {}, country = {};
d.products.forEach(function (p) { product[p.objectId] = p; });
d.sellers.forEach(function (s) { seller[s.objectId] = s; });
d.countries.forEach(function (c) { country[c.objectId] = c; });
var cur = Inputs.currency || '';
var groups = [], groupOf = {}, places = [], placeOf = {}, items = 0;
d.lines.forEach(function (l) {
  var p = product[l.productId], s = p ? seller[idOf(p.seller)] : null;
  if (!p || !s) return;
  var c = country[idOf(s.country)] || { objectId: '', name: '', currency: '' };
  if (!groupOf[s.objectId]) {
    groupOf[s.objectId] = Object.assign(sellerChip(s, c), { place: (c.name ? c.name + ' · ' : '') + 'pays in ' + symbolOf(c.currency), lines: [] });
    groups.push(groupOf[s.objectId]);
  }
  var price = Number(p.price) || 0, first = (p.photos || []).filter(hasFile)[0];
  groupOf[s.objectId].lines.push({ id: p.objectId, name: p.name || '', thumb: thumb(first, 'sm'), hasThumb: !!first, noThumb: !first, each: l.quantity + ' × ' + money(price, c.currency), total: money(price * l.quantity, c.currency), less: l.quantity > 1 });
  if (!placeOf[c.objectId]) { placeOf[c.objectId] = { name: c.name, currency: c.currency, amount: 0, sellers: [] }; places.push(placeOf[c.objectId]); }
  placeOf[c.objectId].amount += price * l.quantity;
  if (placeOf[c.objectId].sellers.indexOf(s.name) < 0) placeOf[c.objectId].sellers.push(s.name);
  items += l.quantity;
});
Outputs.groups = groups;
Outputs.places = places.map(function (x) { return { id: x.name, words: x.name + ', in ' + symbolOf(x.currency), total: money(x.amount, x.currency) }; });
var n = places.length;
Outputs.two = n > 1;
Outputs.twoWords = n > 1 ? (n === 2 ? 'Two countries, two payments.' : n + ' countries, ' + n + ' payments.') + ' Your sellers are in ' + list(places.map(function (x) { return x.name; })) + ', so you pay ' + (n === 2 ? 'twice' : n + ' times') + ': ' + list(places.map(function (x) { return 'once in ' + symbolOf(x.currency) + ' for ' + list(x.sellers); })) + '. Each payment goes straight to its sellers.' : '';
var mine = rateOf(d.rates, cur), sure = !!mine && n > 0, about = 0;
places.forEach(function (x) { var r = rateOf(d.rates, x.currency); if (!r) sure = false; else about += x.amount * r / (mine || 1); });
var plain = n === 1 && places[0].currency === cur;
Outputs.together = (sure && !plain ? 'About ' + money(about, cur) + ' together. ' : '') + 'Delivery is added when each seller confirms it.';
Outputs.heading = items ? 'Your basket · ' + plural(items, 'item', 'items') : 'Your basket';
Outputs.gone = d.gone.length ? list(d.gone) + (d.gone.length === 1 ? ' isn’t' : ' aren’t') + ' on sale now, so ' + (d.gone.length === 1 ? 'it was' : 'they were') + ' taken out of your basket.' : '';
Outputs.hasGone = d.gone.length > 0;
Outputs.empty = groups.length === 0;
Outputs.full = groups.length > 0;`;

const BASKET: PageComponent = {
  path: SHOP_PAGES.basket,
  description: 'The basket: by seller, a total per seller country, about how much together; check out with no account',
  nodes: [
    ...shopShell('bk', 'Your basket', 'basket', [], 'basket'),
    button('bkBack', 'Back', 'bkBody', '← The shop', BACK),
    text('bkTitle', 'Heading', 'bkBody', 'Your basket', T_TITLE),
    text('bkGone', 'Taken out: no longer on sale', 'bkBody', '', { ...T_REFUSED, mounted: false }),
    text('bkProblem', 'The basket could not be read', 'bkBody', '', { ...T_REFUSED, mounted: false }),
    group('bkEmpty', 'Nothing in it', 'bkBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('bkEmptyWords', 'Nothing in it', 'bkEmpty', 'Your basket is empty. Products you add on this phone stay here until you check out.', T_META),
    button('bkShop', 'To the shop', 'bkEmpty', 'To the shop', LINE),
    group('bkContent', 'The sellers beside the totals (tablet), above them (phone)', 'bkBody', column({ rowGap: 'var(--space-4)', cssClassName: 'mk-two', mounted: false })),
    group('bkSellers', 'By seller', 'bkContent', column({ rowGap: 'var(--space-3)' })),
    { id: 'bkEachSeller', type: 'For Each', label: 'One box per seller', parent: 'bkSellers', parameters: { template: SHOP_COMPONENTS.basketSeller } },
    group('bkSide', 'What is paid, and how much', 'bkContent', column({ rowGap: 'var(--space-3)' })),
    group('bkTwo', 'Two countries, two payments', 'bkSide', column({ backgroundColor: 'var(--warn-bg)', borderRadius: 'var(--radius-xl)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', mounted: false })),
    text('bkTwoWords', 'Why it is paid more than once', 'bkTwo', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    group('bkTotals', 'One total per seller country', 'bkSide', CARD),
    { id: 'bkEachTotal', type: 'For Each', label: 'One row per country', parent: 'bkTotals', parameters: { template: TOTAL_ROW.path } },
    text('bkTogether', 'About how much together; delivery comes later', 'bkTotals', '', { ...T_META, cssClassName: 'mk-num' }),
    button('bkCheckout', 'Check out', 'bkSide', 'Check out', MAIN),
    text('bkNoAccount', 'No account needed', 'bkSide', 'No account needed.', { ...T_META, textAlignX: 'center' }),
    fn('bkLoad', 'The basket on this phone, and what is in it', BASKET_LOAD, ['cleaned']),
    fn('bkShape', 'The basket, by seller and by country', BASKET_SHAPE, []),
    variable('bkBasket', 'The basket changed', 'basket'),
    variable('bkCurrency', 'The currency prices are shown in', 'currency'),
    setVar('bkCleaned', 'The basket changed: something was taken out', 'basket'),
    go('bkToShop', 'To the shop', SHOP_PAGES.home),
    go('bkToCheckout', 'To check out', SHOP_PAGES.checkout)
  ],
  connections: [
    wire('bkRoot', 'didMount', 'bkLoad', 'run'),
    wire('bkBasket', 'value', 'bkLoad', 'in-basket'),
    wire('bkLoad', 'out-data', 'bkShape', 'in-data'),
    wire('bkLoad', 'out-failed', 'bkProblem', 'mounted'),
    wire('bkLoad', 'out-problem', 'bkProblem', 'text'),
    wire('bkLoad', 'out-basket', 'bkCleaned', 'value'),
    wire('bkLoad', 'out-cleaned', 'bkCleaned', 'do'),
    wire('bkCurrency', 'value', 'bkShape', 'in-currency'),
    wire('bkShape', 'out-heading', 'bkTitle', 'text'),
    wire('bkShape', 'out-groups', 'bkEachSeller', 'items'),
    wire('bkShape', 'out-places', 'bkEachTotal', 'items'),
    wire('bkShape', 'out-two', 'bkTwo', 'mounted'),
    wire('bkShape', 'out-twoWords', 'bkTwoWords', 'text'),
    wire('bkShape', 'out-together', 'bkTogether', 'text'),
    wire('bkShape', 'out-gone', 'bkGone', 'text'),
    wire('bkShape', 'out-hasGone', 'bkGone', 'mounted'),
    wire('bkShape', 'out-empty', 'bkEmpty', 'mounted'),
    wire('bkShape', 'out-full', 'bkContent', 'mounted'),
    wire('bkBack', 'onClick', 'bkToShop', 'navigate'),
    wire('bkShop', 'onClick', 'bkToShop', 'navigate'),
    wire('bkCheckout', 'onClick', 'bkToCheckout', 'navigate')
  ]
};

// ── /Shop/PayOption and /Shop/PayCountry ──────────────────────────────────────────────────────────────────────────

/** A way picked for a country: kept with the picks for the other countries. */
export const PICK = `var m = {};
try { m = JSON.parse(Inputs.picks || '{}') || {}; } catch (e) { m = {}; }
if (!Inputs.countryId || !Inputs.wayId) return;
m[String(Inputs.countryId)] = String(Inputs.wayId);
Outputs.picks = JSON.stringify(m);
Outputs.go();`;

const PAY_OPTION: PageComponent = {
  path: SHOP_COMPONENTS.payOption,
  description: 'One way to pay in one country, to pick: its name and what it asks of the buyer',
  nodes: [
    group('poRoot', 'A way to pay', undefined, column({ backgroundColor: 'var(--surface)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--border)', borderRadius: 'var(--radius-lg)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', rowGap: 'var(--space-0-5)', cssClassName: 'mk-pointer' })),
    { id: 'poName', type: BUTTON, label: 'Pick it', parent: 'poRoot', parameters: { ...LINK, fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', width: pct(100), sizeMode: 'contentHeight', cssClassName: 'mk-left mk-wrap' } },
    text('poFine', 'What it asks of the buyer', 'poRoot', '', { ...T_META, marginLeft: px(22) }),
    {
      id: 'poIn',
      type: 'Component Inputs',
      label: 'One way to pay',
      ports: [
        { name: 'countryId', type: 'string', plug: 'output' },
        { name: 'wayId', type: 'string', plug: 'output' },
        { name: 'label', type: 'string', plug: 'output' },
        { name: 'fine', type: 'string', plug: 'output' },
        { name: 'line', type: 'string', plug: 'output' }
      ]
    },
    variable('poPicks', 'The ways picked so far', 'payPicks'),
    fn('poPick', 'Pick this way for this country', PICK, ['go'], ['picks', 'countryId', 'wayId']),
    setVar('poSetPicks', 'The ways picked', 'payPicks')
  ],
  connections: [
    wire('poIn', 'label', 'poName', 'label'),
    wire('poIn', 'fine', 'poFine', 'text'),
    wire('poIn', 'line', 'poRoot', 'borderColor'),
    wire('poIn', 'countryId', 'poPick', 'in-countryId'),
    wire('poIn', 'wayId', 'poPick', 'in-wayId'),
    wire('poPicks', 'value', 'poPick', 'in-picks'),
    wire('poRoot', 'onClick', 'poPick', 'run'),
    wire('poName', 'onClick', 'poPick', 'run'),
    wire('poPick', 'out-picks', 'poSetPicks', 'value'),
    wire('poPick', 'out-go', 'poSetPicks', 'do')
  ]
};

const PAY_COUNTRY: PageComponent = {
  path: SHOP_COMPONENTS.payCountry,
  description: 'How the buyer pays in one seller country: what it comes to, and the ways turned on there',
  nodes: [
    group('pyRoot', 'One country’s payment', undefined, column({ rowGap: 'var(--space-2)' })),
    group('pyHead', 'How you’ll pay here, and how much', 'pyRoot', rowOf({ alignItems: 'flex-end', justifyContent: 'space-between' })),
    text('pyHeading', 'How you’ll pay in…', 'pyHead', '', { ...H2, sizeMode: 'contentSize' }),
    text('pySub', 'How much, in its currency', 'pyHead', '', { ...T_META, sizeMode: 'contentSize', cssClassName: 'mk-num mk-nowrap' }),
    text('pyNone', 'No way to pay here yet', 'pyRoot', '', { ...T_REFUSED, mounted: false }),
    { id: 'pyEach', type: 'For Each', label: 'One per way to pay', parent: 'pyRoot', parameters: { template: SHOP_COMPONENTS.payOption } },
    {
      id: 'pyIn',
      type: 'Component Inputs',
      label: 'One country',
      ports: [
        { name: 'heading', type: 'string', plug: 'output' },
        { name: 'sub', type: 'string', plug: 'output' },
        { name: 'options', type: 'array', plug: 'output' },
        { name: 'hasNone', type: 'boolean', plug: 'output' },
        { name: 'noneWords', type: 'string', plug: 'output' }
      ]
    }
  ],
  connections: [
    wire('pyIn', 'heading', 'pyHeading', 'text'),
    wire('pyIn', 'sub', 'pySub', 'text'),
    wire('pyIn', 'options', 'pyEach', 'items'),
    wire('pyIn', 'hasNone', 'pyNone', 'mounted'),
    wire('pyIn', 'noneWords', 'pyNone', 'text')
  ]
};

// ── /Pages/Shop/Checkout ──────────────────────────────────────────────────────────────────────────────────────────

/** The basket, and what a checkout needs beside it: the countries, the rates, and the ways to pay on in each. */
export const CHECKOUT_LOAD = `${SHOP}
void Inputs.basket;
var b = readBasket();
if (!b.length) { Outputs.failed = false; Outputs.data = { lines: [], products: [], sellers: [], countries: [], rates: [], ways: {} }; return; }
try {
  var products = await all('Product', { objectId: { containedIn: b.map(function (l) { return l.productId; }) } });
  var got = await Promise.all([all('Seller', { objectId: { containedIn: products.map(function (p) { return idOf(p.seller); }) } }), all('Country'), all('Rate'), waysByCountry()]);
} catch (e) { Outputs.problem = 'The checkout could not be read just now. Check the connection, then open it again.'; Outputs.failed = true; return; }
Outputs.failed = false;
Outputs.data = { lines: b, products: products, sellers: got[0], countries: got[1], rates: got[2], ways: got[3] };`;

/**
 * One payment per seller country, each among the ways the admin turned on there: WhatsApp only when every seller in
 * that country has a number (the same rule `placeOrder` keeps), the providers not until TWO-004 builds their door.
 * The pick made before is kept when it is still offered; otherwise the first way is picked.
 */
export const CHECKOUT_SHAPE = `${SHOP}
var BUILT = ${JSON.stringify(Object.keys(BUILT_WAYS))};
var d = Inputs.data;
if (!d) return;
var picks = {};
try { picks = JSON.parse(Inputs.picks || '{}') || {}; } catch (e) { picks = {}; }
var product = {}, seller = {}, country = {};
d.products.forEach(function (p) { product[p.objectId] = p; });
d.sellers.forEach(function (s) { seller[s.objectId] = s; });
d.countries.forEach(function (c) { country[c.objectId] = c; });
var groups = [], groupOf = {}, lines = [], items = 0, sellerCount = 0;
d.lines.forEach(function (l) {
  var p = product[l.productId], s = p ? seller[idOf(p.seller)] : null, c = s ? country[idOf(s.country)] : null;
  if (!p || !s || !c || p.endedAt || s.endedAt || p.mode !== 'buy') return;
  lines.push({ productId: l.productId, quantity: l.quantity });
  items += l.quantity;
  var g = groupOf[c.objectId];
  if (!g) { g = groupOf[c.objectId] = { country: c, amount: 0, sellers: [], noWhatsapp: false }; groups.push(g); }
  g.amount += (Number(p.price) || 0) * l.quantity;
  if (g.sellers.indexOf(s.name) < 0) { g.sellers.push(s.name); sellerCount++; }
  if (!String(s.whatsapp || '').replace(/[^0-9]/g, '')) g.noWhatsapp = true;
});
var pay = {}, canOrder = groups.length > 0;
Outputs.groups = groups.map(function (g) {
  var id = g.country.objectId;
  var offered = (d.ways[id] || []).filter(function (w) { return BUILT.indexOf(w.method) >= 0 && !(w.method === 'whatsapp' && g.noWhatsapp); });
  var picked = offered.filter(function (w) { return w.objectId === picks[id]; })[0] || offered[0];
  if (picked) pay[id] = picked.objectId; else canOrder = false;
  return {
    id: id,
    heading: 'How you’ll pay in ' + g.country.name,
    sub: money(g.amount, g.country.currency),
    hasNone: offered.length === 0,
    noneWords: 'No way to pay is turned on in ' + g.country.name + ' yet, so nothing from ' + list(g.sellers) + ' can be ordered just now. Take ' + (g.sellers.length === 1 ? 'its' : 'their') + ' products out of your basket to order the rest.',
    options: offered.map(function (w) {
      var on = w === picked;
      return { id: id + ':' + w.objectId, countryId: id, wayId: w.objectId, label: (on ? '◉ ' : '○ ') + (w.name || ''), fine: w.instructions || '', line: on ? 'var(--secondary)' : 'var(--border)' };
    })
  };
});
Outputs.pay = pay;
Outputs.lines = lines;
Outputs.canOrder = canOrder;
Outputs.full = lines.length > 0;
Outputs.empty = lines.length === 0;
Outputs.summary = lines.length ? plural(items, 'item', 'items') + ' from ' + plural(sellerCount, 'seller', 'sellers') + '. Each seller confirms the delivery and what it costs before you pay.' : '';
var sorted = d.countries.slice().sort(byName);
Outputs.countries = sorted.map(function (c) { return { Label: c.name, Value: c.objectId }; });
var home = sorted.filter(function (c) { return c.currency === Inputs.currency; })[0] || (groups[0] && groups[0].country) || sorted[0];
Outputs.countryPick = home ? home.objectId : '';`;

/** The form, the lines and the picks, as one order. Prices are not sent: `placeOrder` reads them from the store. */
export const CHECKOUT_GATHER = `function v(x) { return x === undefined || x === null ? '' : String(x); }
Outputs.order = {
  buyerName: v(Inputs.name),
  phone: v(Inputs.phone),
  address: v(Inputs.address),
  email: v(Inputs.email),
  country: v(Inputs.country) || v(Inputs.country0),
  currency: v(Inputs.currency),
  lines: Array.isArray(Inputs.lines) ? Inputs.lines : [],
  pay: Inputs.pay && typeof Inputs.pay === 'object' ? Inputs.pay : {}
};
Outputs.go();`;

/** Placed: this phone remembers the order (My order), the basket empties, and the order's own page opens. */
export const ORDER_PLACED = `${SHOP}
var o = Inputs.placed;
if (!o || !o.followToken) return;
var orders = readOrders().filter(function (x) { return x.token !== o.followToken; });
orders.unshift({ number: o.number, token: o.followToken });
try { localStorage.setItem('${ORDERS_KEY}', JSON.stringify(orders.slice(0, 20))); } catch (e) {}
Outputs.token = o.followToken;
Outputs.basket = writeBasket([]);
Outputs.go();`;

const CHECKOUT: PageComponent = {
  path: SHOP_PAGES.checkout,
  description: 'Check out with no account: who, where, and how they’ll pay in each seller country',
  nodes: [
    ...shopShell('co', 'Check out', 'checkout', [], ''),
    button('coBack', 'Back', 'coBody', '← Your basket', BACK),
    text('coTitle', 'Heading', 'coBody', 'Check out', T_TITLE),
    text('coProblem', 'The checkout could not be read', 'coBody', '', { ...T_REFUSED, mounted: false }),
    group('coEmpty', 'Nothing to check out', 'coBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('coEmptyWords', 'Nothing to check out', 'coEmpty', 'Your basket is empty: there is nothing to check out.', T_META),
    button('coShop', 'To the shop', 'coEmpty', 'To the shop', LINE),
    group('coContent', 'Who and where beside how they’ll pay (tablet), above it (phone)', 'coBody', column({ rowGap: 'var(--space-4)', cssClassName: 'mk-two', mounted: false })),
    group('coWho', 'Who, and where it goes', 'coContent', column({ rowGap: 'var(--space-3)' })),
    input('coName', 'coWho', 'Name'),
    input('coPhone', 'coWho', 'Phone (the sellers call this number)', { inputMode: 'tel' }),
    input('coAddress', 'coWho', 'Where it goes', { type: 'textArea' }),
    { id: 'coCountry', type: DROPDOWN, label: 'The country it goes to', parent: 'coWho', parameters: { ...FIELD, label: 'The country it goes to' } },
    input('coEmail', 'coWho', 'Email (optional; needed to pay by card)', { type: 'email' }),
    group('coPay', 'How they’ll pay, country by country', 'coContent', column({ rowGap: 'var(--space-4)' })),
    { id: 'coEachCountry', type: 'For Each', label: 'One payment per seller country', parent: 'coPay', parameters: { template: SHOP_COMPONENTS.payCountry } },
    text('coSummary', 'What is being ordered, and who confirms delivery', 'coPay', '', T_META),
    button('coPlace', 'Place order', 'coPay', 'Place order', { ...MAIN, mounted: false }),
    text('coError', 'What went wrong', 'coPay', '', T_REFUSED),
    text('coFine', 'The private link', 'coPay', 'Your order opens on a private link: keep it. This phone keeps it too, under My order.', T_META),
    fn('coLoad', 'The basket, the countries, the rates, the ways to pay', CHECKOUT_LOAD, []),
    fn('coShape', 'One payment per seller country, and the ways on there', CHECKOUT_SHAPE, []),
    fn('coGather', 'The form, as one order', CHECKOUT_GATHER, ['go'], ['name', 'phone', 'address', 'email', 'country', 'country0', 'currency', 'lines', 'pay']),
    callFn('coCall', 'placeOrder(order)', FN_PLACE_ORDER),
    fn('coPlaced', 'Remember the order on this phone; empty the basket', ORDER_PLACED, ['go'], ['placed']),
    variable('coBasket', 'The basket changed', 'basket'),
    variable('coPicks', 'The ways picked', 'payPicks'),
    variable('coCurrency', 'The currency prices are shown in', 'currency'),
    setVar('coEmptied', 'The basket, emptied', 'basket'),
    setVar('coLastOrder', 'The order just placed', 'lastOrder'),
    go('coToBasket', 'Back to the basket', SHOP_PAGES.basket),
    go('coToShop', 'To the shop', SHOP_PAGES.home),
    go('coToOrder', 'To the order', SHOP_PAGES.order)
  ],
  connections: [
    wire('coRoot', 'didMount', 'coLoad', 'run'),
    wire('coBasket', 'value', 'coLoad', 'in-basket'),
    wire('coLoad', 'out-data', 'coShape', 'in-data'),
    wire('coLoad', 'out-failed', 'coProblem', 'mounted'),
    wire('coLoad', 'out-problem', 'coProblem', 'text'),
    wire('coPicks', 'value', 'coShape', 'in-picks'),
    wire('coCurrency', 'value', 'coShape', 'in-currency'),
    wire('coCurrency', 'value', 'coGather', 'in-currency'),
    wire('coShape', 'out-groups', 'coEachCountry', 'items'),
    wire('coShape', 'out-summary', 'coSummary', 'text'),
    wire('coShape', 'out-canOrder', 'coPlace', 'mounted'),
    wire('coShape', 'out-full', 'coContent', 'mounted'),
    wire('coShape', 'out-empty', 'coEmpty', 'mounted'),
    wire('coShape', 'out-countries', 'coCountry', 'items'),
    wire('coShape', 'out-countryPick', 'coCountry', 'value'),
    wire('coShape', 'out-countryPick', 'coGather', 'in-country0'),
    wire('coShape', 'out-lines', 'coGather', 'in-lines'),
    wire('coShape', 'out-pay', 'coGather', 'in-pay'),
    wire('coName', 'onTextChanged', 'coGather', 'in-name'),
    wire('coPhone', 'onTextChanged', 'coGather', 'in-phone'),
    wire('coAddress', 'onTextChanged', 'coGather', 'in-address'),
    wire('coEmail', 'onTextChanged', 'coGather', 'in-email'),
    wire('coCountry', 'value', 'coGather', 'in-country'),
    wire('coPlace', 'onClick', 'coGather', 'run'),
    wire('coGather', 'out-order', 'coCall', 'in-order'),
    wire('coGather', 'out-go', 'coCall', 'call'),
    wire('coCall', 'error', 'coError', 'text'),
    wire('coCall', 'out-order', 'coPlaced', 'in-placed'),
    wire('coCall', 'done', 'coPlaced', 'run'),
    wire('coPlaced', 'out-basket', 'coEmptied', 'value'),
    wire('coPlaced', 'out-go', 'coEmptied', 'do'),
    wire('coPlaced', 'out-token', 'coLastOrder', 'value'),
    wire('coPlaced', 'out-go', 'coLastOrder', 'do'),
    wire('coPlaced', 'out-token', 'coToOrder', 'pm-token'),
    wire('coPlaced', 'out-go', 'coToOrder', 'navigate'),
    wire('coBack', 'onClick', 'coToBasket', 'navigate'),
    wire('coShop', 'onClick', 'coToShop', 'navigate')
  ]
};

// ── /Shop/Step and /Shop/OrderPart ────────────────────────────────────────────────────────────────────────────────

const STEP: PageComponent = {
  path: SHOP_COMPONENTS.step,
  description: 'One step an order part moves through: a bar, filled once it is reached, and its name',
  nodes: [
    group('stRoot', 'A step', undefined, column({ rowGap: 'var(--space-1)', cssClassName: 'mk-step' })),
    group('stBar', 'Reached or not', 'stRoot', { width: pct(100), height: px(5), sizeMode: 'explicit', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--border)' }),
    text('stName', 'The step', 'stRoot', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', cssClassName: 'mk-stepname' }),
    { id: 'stIn', type: 'Component Inputs', label: 'One step', ports: [{ name: 'name', type: 'string', plug: 'output' }, { name: 'bar', type: 'string', plug: 'output' }, { name: 'ink', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('stIn', 'name', 'stName', 'text'), wire('stIn', 'bar', 'stBar', 'backgroundColor'), wire('stIn', 'ink', 'stName', 'color')]
};

const ORDER_PART: PageComponent = {
  path: SHOP_COMPONENTS.orderPart,
  description: 'One seller’s part of an order, as its buyer follows it: where it is, what is owed and how',
  nodes: [
    group('opRoot', 'A seller’s part', undefined, CARD),
    group('opHead', 'Seller and where it is', 'opRoot', rowOf({ justifyContent: 'space-between' })),
    text('opSeller', 'The seller', 'opHead', '', { ...T_NAME, sizeMode: 'contentSize' }),
    group('opPill', 'Where it is', 'opHead', { ...PILL }),
    text('opPillWords', 'Where it is', 'opPill', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', cssClassName: 'mk-nowrap' }),
    group('opSteps', 'New, confirmed, paid, packed, sent, delivered', 'opRoot', rowOf({ alignItems: 'flex-start', columnGap: 'var(--space-1)' })),
    { id: 'opEachStep', type: 'For Each', label: 'One per step', parent: 'opSteps', parameters: { template: SHOP_COMPONENTS.step } },
    text('opLines', 'What is in it', 'opRoot', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    text('opWay', 'How it is paid', 'opRoot', '', T_META),
    text('opFine', 'What happens next, and what is owed', 'opRoot', '', T_META),
    { id: 'opWhatsapp', type: BUTTON, label: 'WhatsApp the seller', parent: 'opRoot', parameters: { ...WHATSAPP, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', mounted: false } },
    {
      id: 'opIn',
      type: 'Component Inputs',
      label: 'One part',
      ports: [
        { name: 'seller', type: 'string', plug: 'output' },
        { name: 'pill', type: 'string', plug: 'output' },
        { name: 'pillBg', type: 'string', plug: 'output' },
        { name: 'pillInk', type: 'string', plug: 'output' },
        { name: 'steps', type: 'array', plug: 'output' },
        { name: 'lines', type: 'string', plug: 'output' },
        { name: 'way', type: 'string', plug: 'output' },
        { name: 'fine', type: 'string', plug: 'output' },
        { name: 'hasWhatsapp', type: 'boolean', plug: 'output' },
        { name: 'whatsappLabel', type: 'string', plug: 'output' },
        { name: 'whatsappLink', type: 'string', plug: 'output' }
      ]
    },
    { id: 'opOpenWhatsapp', type: 'net.noodl.externallink', label: 'Open WhatsApp', parameters: { openInNewTab: true } }
  ],
  connections: [
    wire('opIn', 'seller', 'opSeller', 'text'),
    wire('opIn', 'pill', 'opPillWords', 'text'),
    wire('opIn', 'pillBg', 'opPill', 'backgroundColor'),
    wire('opIn', 'pillInk', 'opPillWords', 'color'),
    wire('opIn', 'steps', 'opEachStep', 'items'),
    wire('opIn', 'lines', 'opLines', 'text'),
    wire('opIn', 'way', 'opWay', 'text'),
    wire('opIn', 'fine', 'opFine', 'text'),
    wire('opIn', 'hasWhatsapp', 'opWhatsapp', 'mounted'),
    wire('opIn', 'whatsappLabel', 'opWhatsapp', 'label'),
    wire('opIn', 'whatsappLink', 'opOpenWhatsapp', 'link'),
    wire('opWhatsapp', 'onClick', 'opOpenWhatsapp', 'do')
  ]
};

// ── /Shop/PayBox: paying one country's sellers through Paystack ──────────────────────────────────────────────────

/**
 * Pay one country's parts: `startPayment` adds them up from the store and answers with Paystack's checkout page, which
 * the phone opens. Paystack sends the buyer back to this order's own address with the payment's reference.
 */
export const PAY_GO = `if (Inputs.token === undefined || Inputs.countryId === undefined) return;
Outputs.problem = '';
try {
  var r = await Noodl.CloudFunctions.run('${FN_START_PAYMENT}', { pay: { token: String(Inputs.token), country: String(Inputs.countryId), returnUrl: location.origin + location.pathname } });
  location.href = r.payment.url;
} catch (e) {
  Outputs.problem = (e && e.error) || 'Paystack couldn’t be opened just now. Check the connection and try again.';
}`;

const PAY_BOX: PageComponent = {
  path: SHOP_COMPONENTS.payBox,
  description: 'Paying one country’s sellers through Paystack: how much, for whom, and the button, once they have all confirmed',
  nodes: [
    group('pbRoot', 'Paying one country', undefined, CARD),
    text('pbHead', 'Paying in Ghana', 'pbRoot', '', T_NAME),
    text('pbWords', 'How much, for whom', 'pbRoot', '', T_META),
    { id: 'pbPay', type: BUTTON, label: 'Pay by card or mobile money', parent: 'pbRoot', parameters: { ...MAIN, mounted: false } },
    text('pbError', 'What went wrong', 'pbRoot', '', T_REFUSED),
    {
      id: 'pbIn',
      type: 'Component Inputs',
      label: 'One country to pay',
      ports: [
        { name: 'head', type: 'string', plug: 'output' },
        { name: 'words', type: 'string', plug: 'output' },
        { name: 'canPay', type: 'boolean', plug: 'output' },
        { name: 'label', type: 'string', plug: 'output' },
        { name: 'countryId', type: 'string', plug: 'output' },
        { name: 'token', type: 'string', plug: 'output' }
      ]
    },
    fn('pbGo', 'Open Paystack for this country', PAY_GO, [], ['token', 'countryId'])
  ],
  connections: [
    wire('pbIn', 'head', 'pbHead', 'text'),
    wire('pbIn', 'words', 'pbWords', 'text'),
    wire('pbIn', 'canPay', 'pbPay', 'mounted'),
    wire('pbIn', 'label', 'pbPay', 'label'),
    wire('pbIn', 'countryId', 'pbGo', 'in-countryId'),
    wire('pbIn', 'token', 'pbGo', 'in-token'),
    wire('pbPay', 'onClick', 'pbGo', 'run'),
    wire('pbGo', 'out-problem', 'pbError', 'text')
  ]
};

// ── /Pages/Shop/Order ─────────────────────────────────────────────────────────────────────────────────────────────

/** The order this link opens, through `followOrder` (the token is the only key). This phone remembers it. */
export const ORDER_LOAD = `${SHOP}
if (Inputs.token === undefined) return;
var token = String(Inputs.token || '');
// Back from Paystack: the address carries the payment's reference. Ask what happened to it, then forget it.
var ref = '';
try { ref = new URLSearchParams(location.search).get('reference') || ''; } catch (e) { ref = ''; }
var said = '';
if (ref) {
  try {
    var c = (await Noodl.CloudFunctions.run('${FN_CHECK_PAYMENT}', { check: { reference: ref } })).result || {};
    said = c.outcome === 'paid' ? 'Paid. Thank you: your sellers can see it.' : c.outcome === 'waiting' ? 'Paystack hasn’t finished with this payment yet. Open this page again in a minute.' : c.wrongAmount ? 'Paystack took a payment that doesn’t match what is owed now. Nothing is marked paid: message your sellers.' : 'That payment didn’t go through. You can try again.';
  } catch (e) { said = (e && e.error) || 'The payment couldn’t be checked just now. Open this page again in a minute.'; }
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
}
Outputs.paidWords = said;
Outputs.hasPaidWords = !!said;
try {
  var r = await Noodl.CloudFunctions.run('followOrder', { follow: { token: token } });
} catch (e) { Outputs.problem = (e && e.error) || 'This order could not be read just now. Check the connection, then open it again.'; Outputs.gone = true; Outputs.ok = false; return; }
var o = r && r.order;
if (!o) { Outputs.problem = 'There is no order at this link. Check it was copied whole.'; Outputs.gone = true; Outputs.ok = false; return; }
var orders = readOrders().filter(function (x) { return x.token !== token; });
orders.unshift({ number: o.number, token: token });
try { localStorage.setItem('${ORDERS_KEY}', JSON.stringify(orders.slice(0, 20))); } catch (e) {}
Outputs.order = o;
Outputs.gone = false;
Outputs.ok = true;`;

/**
 * The order, worded for its buyer: its number and how to say it on the phone, each part's step, what is owed in the
 * seller's currency and how it is paid (which depends on the way picked for that country), and a WhatsApp message
 * naming the order when the seller has a number. Paid on delivery has no "paid" step (slice 4, `two003Orders.ts`): it
 * is paid when it is delivered.
 */
export const ORDER_SHAPE = `${SHOP}
var o = Inputs.order;
if (!o) return;
var STEPS = ${JSON.stringify(STEPS)};
var AT_THE_DOOR = ${JSON.stringify(PAID_AT_THE_DOOR)};
var NAMES = { new: 'New', confirmed: 'Confirmed', paid: 'Paid', packed: 'Packed', sent: 'Sent', delivered: 'Delivered' };
var PILLS = { new: 'Waiting for the seller', confirmed: 'Confirmed: to pay', paid: 'Paid', packed: 'Packed', sent: 'On its way', delivered: 'Delivered', cancelled: 'Cancelled' };
function spoken(n) {
  var m = /^([A-Z]+)-([0-9]{4})-([0-9]+)$/.exec(String(n || ''));
  if (!m) return String(n || '');
  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function two(x) { return x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? '-' + ONES[x % 10] : ''); }
  var y = Number(m[2]), lo = y % 100;
  var year = two(Math.floor(y / 100)) + ' ' + (lo === 0 ? 'hundred' : lo < 10 ? 'oh ' + ONES[lo] : two(lo));
  return m[1].split('').join(' ') + ', ' + year + ', ' + String(Number(m[3])).split('').map(function (d) { return ONES[Number(d)]; }).join(' ');
}
function owed(p, amount, when) {
  var how = p.way.method;
  if (how === 'on-delivery') return 'You’ll pay ' + amount + ' when it arrives.';
  if (how === 'bank-transfer') return 'You’ll pay ' + amount + ' by bank transfer ' + when + ', with ' + o.number + ' as the reference.';
  if (how === 'whatsapp') return 'Finish it with them on WhatsApp, and pay ' + amount + ' the way you agree.';
  if (how === 'paystack') return 'You’ll pay ' + amount + ' here by card or mobile money ' + when + '.';
  return 'You’ll pay ' + amount + ' ' + when + '.';
}
Outputs.title = 'Order ' + o.number;
Outputs.buyer = o.buyerName || '';
Outputs.placed = o.placedAt ? new Date(o.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
Outputs.readAloud = 'Read out the number if you call: ' + spoken(o.number) + '. This page is private to you: keep the link.';
Outputs.where = 'It goes to ' + [o.address, o.country].filter(Boolean).join(', ') + '.';
// One box per country paid through Paystack: the button once every part there is confirmed, never before.
var pays = [], payOf = {};
(o.parts || []).forEach(function (p) {
  if (p.way.method !== 'paystack' || p.status === 'cancelled') return;
  if (!payOf[p.countryId]) { payOf[p.countryId] = { id: p.countryId, country: p.country, currency: p.currency, sellers: [], amount: 0, waiting: 0, confirmed: 0, done: 0 }; pays.push(payOf[p.countryId]); }
  var x = payOf[p.countryId];
  x.sellers.push(p.seller);
  x.amount += p.subtotal + (typeof p.deliveryCost === 'number' ? p.deliveryCost : 0);
  if (p.status === 'new') x.waiting++; else if (p.status === 'confirmed') x.confirmed++; else x.done++;
});
Outputs.pays = pays.map(function (x) {
  var paid = (o.payments || []).filter(function (y) { return y.outcome === 'paid' && y.currency === x.currency && y.country === x.country; })[0];
  var tried = (o.payments || []).some(function (y) { return y.outcome === 'failed' && y.currency === x.currency && y.country === x.country; });
  var words;
  if (x.done && !x.confirmed && !x.waiting) words = 'Paid' + (paid ? ' ' + money(paid.amount, paid.currency) : '') + ' through Paystack. Each seller has their share.';
  else if (x.waiting) words = 'You’ll pay ' + list(x.sellers) + ' here together, once ' + (x.sellers.length > 1 ? 'they have all' : 'they have') + ' confirmed delivery.';
  else words = 'One payment for ' + list(x.sellers) + ', through Paystack: card, mobile money or bank. Each seller is paid their share.' + (tried ? ' The last try didn’t go through.' : '');
  return { id: x.id, head: 'Paying in ' + x.country, words: words, canPay: !x.waiting && x.confirmed > 0 && !x.done, label: 'Pay ' + money(x.amount, x.currency) + ' by card or mobile money', countryId: x.id, token: String(Inputs.token || '') };
});
Outputs.hasPays = pays.length > 0;
Outputs.parts = (o.parts || []).map(function (p, i) {
  var atTheDoor = AT_THE_DOOR.indexOf(p.way.method) >= 0;
  var steps = atTheDoor ? STEPS.filter(function (s) { return s !== 'paid'; }) : STEPS;
  var at = steps.indexOf(p.status), cancelled = p.status === 'cancelled', cost = typeof p.deliveryCost === 'number';
  var paid = atTheDoor ? p.status === 'delivered' : at >= steps.indexOf('paid');
  var what = p.lines.map(function (l) { return l.quantity + ' × ' + l.name; }).join(', ');
  var fine;
  if (cancelled) fine = 'This part was cancelled' + (p.cancelledReason ? ': ' + p.cancelledReason : '') + '.';
  else if (at <= 0) fine = p.seller + ' hasn’t confirmed delivery to ' + (o.country || 'you') + ' yet. ' + owed(p, money(p.subtotal, p.currency) + ' plus delivery', 'once they do');
  else fine = (cost ? 'Delivery ' + money(p.deliveryCost, p.currency) + (p.deliveryNote ? ' (' + p.deliveryNote + ')' : '') + ', confirmed by the seller. ' : '') + (paid ? 'Paid: ' + money(p.subtotal + (cost ? p.deliveryCost : 0), p.currency) + '.' : owed(p, money(p.subtotal + (cost ? p.deliveryCost : 0), p.currency), 'now'));
  return {
    id: String(i),
    seller: p.seller,
    pill: atTheDoor && p.status === 'confirmed' ? 'Confirmed' : PILLS[p.status] || p.status,
    pillBg: cancelled ? 'var(--bad-bg)' : at <= 0 ? 'var(--warn-bg)' : 'var(--ok-bg)',
    pillInk: cancelled ? 'var(--bad)' : at <= 0 ? 'var(--warn)' : 'var(--ok)',
    steps: steps.map(function (s, k) { return { id: s, name: NAMES[s], bar: !cancelled && k <= at ? 'var(--secondary)' : 'var(--border)', ink: !cancelled && k === at ? 'var(--foreground)' : 'var(--muted-foreground)' }; }),
    lines: what + ' · ' + money(p.subtotal, p.currency),
    way: 'Paying in ' + (p.country || 'its country') + ': ' + (p.way.name || 'not said'),
    fine: fine,
    hasWhatsapp: !!p.whatsapp,
    whatsappLabel: 'Message ' + p.seller + ' on WhatsApp',
    whatsappLink: p.whatsapp ? 'https://wa.me/' + p.whatsapp + '?text=' + encodeURIComponent('Hello, about my order ' + o.number + ': ' + what + '.') : ''
  };
});`;

const ORDER: PageComponent = {
  path: SHOP_PAGES.order,
  description: 'An order, opened by its private link: its number, and each seller’s part as it moves',
  nodes: [
    ...shopShell('od', 'Your order', 'order/{token}', [], 'order'),
    { id: 'odUrl', type: 'PageInputs', label: 'Which order', parameters: { pathParams: 'token' } },
    button('odBack', 'Back', 'odBody', '← The shop', BACK),
    group('odContent', 'The order', 'odBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('odTitle', 'Order MK-…', 'odContent', '', T_TITLE),
    group('odHead', 'Who, when, where, and how to say the number', 'odContent', CARD),
    group('odWho', 'Who and when', 'odHead', rowOf({ justifyContent: 'space-between' })),
    text('odBuyer', 'Who it is for', 'odWho', '', { ...T_NAME, sizeMode: 'contentSize' }),
    text('odPlaced', 'When it was placed', 'odWho', '', { ...T_META, sizeMode: 'contentSize' }),
    text('odWhere', 'Where it goes', 'odHead', '', T_META),
    text('odReadAloud', 'The number, to read out', 'odHead', '', T_META),
    text('odPaid', 'What Paystack said', 'odContent', '', { ...T_NAME, mounted: false }),
    group('odPays', 'One box per country paid by card', 'odContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    { id: 'odEachPay', type: 'For Each', label: 'One per country paid by card', parent: 'odPays', parameters: { template: SHOP_COMPONENTS.payBox } },
    group('odParts', 'One box per seller', 'odContent', column({ rowGap: 'var(--space-3)', cssClassName: 'mk-parts' })),
    { id: 'odEachPart', type: 'For Each', label: 'One per seller', parent: 'odParts', parameters: { template: SHOP_COMPONENTS.orderPart } },
    text('odGone', 'No order here', 'odBody', '', { ...T_NAME, mounted: false }),
    fn('odLoad', 'The order this link opens', ORDER_LOAD, []),
    fn('odShape', 'The order, worded for its buyer', ORDER_SHAPE, [], ['token']),
    go('odToShop', 'To the shop', SHOP_PAGES.home)
  ],
  connections: [
    wire('odUrl', 'pm-token', 'odLoad', 'in-token'),
    wire('odLoad', 'out-order', 'odShape', 'in-order'),
    wire('odLoad', 'out-ok', 'odContent', 'mounted'),
    wire('odLoad', 'out-gone', 'odGone', 'mounted'),
    wire('odLoad', 'out-problem', 'odGone', 'text'),
    wire('odShape', 'out-title', 'odTitle', 'text'),
    wire('odShape', 'out-title', 'odPage', 'title'),
    wire('odShape', 'out-buyer', 'odBuyer', 'text'),
    wire('odShape', 'out-placed', 'odPlaced', 'text'),
    wire('odShape', 'out-where', 'odWhere', 'text'),
    wire('odShape', 'out-readAloud', 'odReadAloud', 'text'),
    wire('odShape', 'out-parts', 'odEachPart', 'items'),
    wire('odUrl', 'pm-token', 'odShape', 'in-token'),
    wire('odShape', 'out-pays', 'odEachPay', 'items'),
    wire('odShape', 'out-hasPays', 'odPays', 'mounted'),
    wire('odLoad', 'out-paidWords', 'odPaid', 'text'),
    wire('odLoad', 'out-hasPaidWords', 'odPaid', 'mounted'),
    wire('odBack', 'onClick', 'odToShop', 'navigate')
  ]
};

/** Leaves first (a leaf before what places it), then the pages. */
export const SLICE3_SHOP_LEAVES: PageComponent[] = [NAV, BASKET_LINE, BASKET_SELLER, TOTAL_ROW, PAY_OPTION, PAY_COUNTRY, STEP, ORDER_PART, PAY_BOX];
export const SLICE3_SHOP_PAGES: PageComponent[] = [BASKET, CHECKOUT, ORDER];

/** Every script the buyer's slice 3 pages ship, by name, for the spec that compiles and runs them. */
export const SLICE3_SHOP_SCRIPTS: Record<string, string> = {
  NAV_LOAD,
  LINE_LESS,
  LINE_MORE,
  LINE_REMOVE,
  BASKET_LOAD,
  BASKET_SHAPE,
  PICK,
  CHECKOUT_LOAD,
  CHECKOUT_SHAPE,
  CHECKOUT_GATHER,
  ORDER_PLACED,
  ORDER_LOAD,
  ORDER_SHAPE,
  PAY_GO
};
