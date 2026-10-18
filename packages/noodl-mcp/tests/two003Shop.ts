/**
 * TWO-003 slice 2 — the catalogue: what a buyer with no account sees, held to the approved picture
 * (`look/marketplace.html`: Home, A product, Enquire a car).
 *
 * ## What a buyer can do here
 *
 * - **Home** (`/`): the shelves, the sellers, every product on sale as a card, a search, prices in a currency they pick.
 * - **A seller's page** (`seller/{sellerId}`): its logo, story and products.
 * - **A product's page** (`item/{productId}`): its photos, price, seller and description; **buy** products can be
 *   ordered on WhatsApp, **enquire** products (a car) say they are settled with the seller, off the site (R10).
 *
 * ## The rules the pages keep
 *
 * - **Off-sale products and stopped sellers are left out** everywhere a buyer looks, and a link to one says it isn't on
 *   sale now. The policy lets anyone read them (TWO-001: `Product` and `Seller` are public reads, the stopped reason
 *   is not); the pages are what hide them.
 * - **Every read is the public's**, with `Noodl.Records`, so the policy decides what comes back: no function is needed
 *   to browse. A seller's payout account and stopped reason never reach these pages.
 * - **Prices convert through the admin's rates** (`Rate`: what one unit is worth in the marketplace's own currency), so a
 *   price from Lagos reads in cedis with its naira beside it. With no rate for either currency, a price shows in the
 *   seller's own currency and nothing is made up.
 * - **The currency picked is remembered** on the phone (`localStorage`, `mk-currency`) and shared by every page through
 *   the `currency` variable; the shelf picked stays while the buyer looks at a product and comes back.
 * - **Cards use the backend's `md` thumbnail, the product page `lg`**, never the original.
 *
 * The basket and checkout are slice 3's (`two003Basket.ts`); the product page's enquiry form is slice 5's
 * (`two003Enquire.ts` holds its scripts and `sendEnquiry`; the form is placed here, on the page it belongs to).
 *
 * 🔴 These scripts are TypeScript template literals: a backslash in one is eaten before the script exists (`\s`
 * arrives as `s`). They hold none; `two003Shop.test.ts` compiles every one.
 *
 * @module noodl-mcp/tests/two003Shop
 */
import { ENQUIRY_GATHER, ENQUIRY_SENT, FN_SEND_ENQUIRY } from './two003Enquire';
import {
  BACK,
  BUTTON,
  NAME_VARIABLE,
  nameNodes,
  nameWires,
  BTN_BASE,
  button,
  call,
  column,
  fn,
  go,
  group,
  input,
  LINE,
  MAIN,
  Node,
  PAGES,
  PageComponent,
  PILL,
  px,
  pct,
  READ,
  rowOf,
  T_META,
  T_NAME,
  T_REFUSED,
  T_TITLE,
  text,
  wire
} from './two003Pages';

export const SHOP_PAGES = {
  home: '/Pages/Shop/Home',
  seller: '/Pages/Shop/Seller',
  product: '/Pages/Shop/Product',
  basket: '/Pages/Shop/Basket',
  checkout: '/Pages/Shop/Checkout',
  order: '/Pages/Shop/Order'
};

export const SHOP_COMPONENTS = {
  top: '/Shop/Top',
  shelfChip: '/Shop/ShelfChip',
  sellerChip: '/Shop/SellerChip',
  productCard: '/Shop/ProductCard',
  galleryPhoto: '/Shop/GalleryPhoto',
  nav: '/Shop/Nav',
  basketSeller: '/Shop/BasketSeller',
  basketLine: '/Shop/BasketLine',
  payCountry: '/Shop/PayCountry',
  payOption: '/Shop/PayOption',
  orderPart: '/Shop/OrderPart',
  payBox: '/Shop/PayBox',
  step: '/Shop/Step'
};

/** Where the phone keeps the currency a buyer picked. */
export const CURRENCY_KEY = 'mk-currency';
/** Where the phone keeps the basket (`[{productId, quantity}]`), and the orders placed on it (`[{number, token}]`). */
export const BASKET_KEY = 'mk-basket';
export const ORDERS_KEY = 'mk-orders';
/** The ways to pay in the order a checkout offers them (the picture's): the providers first, WhatsApp last. */
export const WAY_RANK = ['paystack', 'flutterwave', 'on-delivery', 'bank-transfer', 'whatsapp'];

// ── the scripts' shared words ─────────────────────────────────────────────────────────────────────────────────────

/**
 * `READ` (slice 1's prelude: `idOf`, `ptr`, `all`, `thumb`, `money`) and what a buyer's page adds: a currency's
 * symbol, a price converted through the rates, a seller as a chip, a product as a card.
 */
export const SHOP = `${READ}
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
function byName(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); }
function newest(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || byName(a, b); }
function symbolOf(cur) {
  try {
    var part = new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).filter(function (x) { return x.type === 'currency'; })[0];
    return part ? part.value : cur;
  } catch (e) { return cur; }
}
function rateOf(rates, cur) {
  var r = (rates || []).filter(function (x) { return x.currency === cur; })[0];
  var v = r ? Number(r.value) : 0;
  return v > 0 ? v : 0;
}
function converted(price, from, to, rates) {
  var a = rateOf(rates, from), b = rateOf(rates, to);
  if (!to || to === from || !a || !b) return { amount: Number(price) || 0, currency: from, same: true };
  return { amount: Number(price) * a / b, currency: to, same: false };
}
function priced(price, from, to, rates) {
  var c = converted(price, from, to, rates);
  return c.same ? { price: money(price, from), was: '' } : { price: money(c.amount, to), was: money(price, from) };
}
function list(words) { return words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]; }
function readBasket() {
  var b = [];
  try { b = JSON.parse(localStorage.getItem('${BASKET_KEY}') || '[]'); } catch (e) { b = []; }
  return (Array.isArray(b) ? b : []).filter(function (l) { return l && typeof l.productId === 'string' && Number(l.quantity) >= 1; }).map(function (l) { return { productId: l.productId, quantity: Math.min(99, Math.floor(Number(l.quantity))) }; });
}
function writeBasket(b) { try { localStorage.setItem('${BASKET_KEY}', JSON.stringify(b)); } catch (e) {} return Date.now() + ':' + b.map(function (l) { return l.productId + 'x' + l.quantity; }).join(','); }
function basketCount(b) { return b.reduce(function (n, l) { return n + l.quantity; }, 0); }
function readOrders() {
  var o = [];
  try { o = JSON.parse(localStorage.getItem('${ORDERS_KEY}') || '[]'); } catch (e) { o = []; }
  return (Array.isArray(o) ? o : []).filter(function (x) { return x && typeof x.token === 'string' && x.token; });
}
/** The ways to pay turned on in each country, by its id, in the order a checkout offers them. */
async function waysByCountry() {
  var ways = await all('WayToPay');
  var by = {};
  for (var i = 0; i < ways.length; i++) {
    var on = await all('Country', { relatedTo: { id: ways[i].objectId, key: 'country', className: 'WayToPay' } });
    on.forEach(function (c) { (by[c.objectId] = by[c.objectId] || []).push(ways[i]); });
  }
  var rank = ${JSON.stringify(WAY_RANK)};
  Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return rank.indexOf(a.method) - rank.indexOf(b.method); }); });
  return by;
}
var TINTS = ['var(--secondary)', 'var(--ok)', 'var(--bad)', 'var(--warn)', 'var(--secondary-hover)'];
function tintOf(id) { var h = 0; String(id).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; }); return TINTS[h % TINTS.length]; }
function initials(name) { return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''); }
function hasFile(f) { return !!(f && f.url); }
function sellerChip(s, country) {
  return { id: s.objectId, name: s.name || '', place: country ? country.name || '' : '', logo: thumb(s.logo, 'sm'), hasLogo: hasFile(s.logo), noLogo: !hasFile(s.logo), initials: initials(s.name), tint: tintOf(s.objectId) };
}
function card(p, s, country, cur, rates) {
  var pr = priced(p.price, country ? country.currency : '', cur, rates);
  var first = (p.photos || []).filter(hasFile)[0];
  return { id: p.objectId, name: p.name || '', who: (s.name || '') + (country ? ' · ' + country.name : ''), price: pr.price, was: pr.was, hasWas: !!pr.was, enquire: p.mode === 'enquire', photo: thumb(first, 'md'), hasPhoto: !!first, noPhoto: !first };
}
`;

// ── /Shop/Top: the bar every buyer's page opens with ──────────────────────────────────────────────────────────────

/**
 * The currencies a buyer can pick: one per rate the admin set. The choice already made stays; then the one this phone
 * remembers; then the marketplace's own (worth 1); then the first. One currency, or none: nothing to pick.
 */
export const TOP_LOAD = `${SHOP}
try { var rates = await all('Rate'); } catch (e) { Outputs.has = false; return; }
var usable = rates.filter(function (r) { return r.currency && Number(r.value) > 0; }).sort(function (a, b) { return String(a.currency).localeCompare(String(b.currency)); });
var codes = usable.map(function (r) { return r.currency; });
Outputs.items = usable.map(function (r) { var s = symbolOf(r.currency); return { Label: s === r.currency ? r.currency : s + ' ' + r.currency, Value: r.currency }; });
Outputs.has = usable.length > 1;
var want = Inputs.current;
if (codes.indexOf(want) < 0) { try { want = localStorage.getItem('${CURRENCY_KEY}'); } catch (e) { want = ''; } }
if (codes.indexOf(want) < 0) { var own = usable.filter(function (r) { return Number(r.value) === 1; })[0]; want = own ? own.currency : codes[0] || ''; }
if (want && want !== Inputs.current) { Outputs.chosen = want; Outputs.set(); }`;

/** A currency a person picked: remembered on this phone, then shared with every page. */
export const CURRENCY_PICKED = `var v = String(Inputs.picked || '');
if (!v) return;
try { localStorage.setItem('${CURRENCY_KEY}', v); } catch (e) {}
Outputs.chosen = v;
Outputs.set();`;

const TOP: PageComponent = {
  path: SHOP_COMPONENTS.top,
  description: 'The indigo bar: the marketplace’s name (back to the shop) and the currency prices are shown in',
  nodes: [
    group('tpRoot', 'The bar', undefined, rowOf({ backgroundColor: 'var(--secondary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', justifyContent: 'space-between' })),
    {
      id: 'tpBrand',
      type: BUTTON,
      label: 'The marketplace’s name: to the shop',
      parent: 'tpRoot',
      parameters: { label: '', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--secondary-foreground)', backgroundColor: 'transparent', borderStyle: 'none', paddingLeft: 'var(--space-0)', paddingRight: 'var(--space-0)', paddingTop: 'var(--space-0)', paddingBottom: 'var(--space-0)', sizeMode: 'contentSize', cssClassName: 'mk-display' }
    },
    {
      id: 'tpCurrency',
      type: 'net.noodl.controls.options',
      label: 'Prices in',
      parent: 'tpRoot',
      parameters: {
        useLabel: false,
        mounted: false,
        sizeMode: 'contentSize',
        backgroundColor: 'var(--secondary-hover)',
        color: 'var(--secondary-foreground)',
        borderStyle: 'none',
        borderRadius: 'var(--radius-md)',
        paddingLeft: 'var(--space-2)',
        paddingRight: 'var(--space-2)',
        paddingTop: 'var(--space-1)',
        paddingBottom: 'var(--space-1)',
        fontSize: 'var(--text-sm)'
      }
    },
    fn('tpLoad', 'The currencies there are rates for, and which one is shown', TOP_LOAD, ['set'], ['current']),
    fn('tpPicked', 'A currency picked: remember it', CURRENCY_PICKED, ['set'], ['picked']),
    { id: 'tpCurrent', type: 'Variable2', label: 'The currency prices are shown in', parameters: { name: 'currency' } },
    { id: 'tpSetFirst', type: 'Set Variable', label: 'The currency to start with', parameters: { name: 'currency', setWith: 'string' } },
    { id: 'tpSetPicked', type: 'Set Variable', label: 'The currency picked', parameters: { name: 'currency', setWith: 'string' } },
    go('tpToShop', 'To the shop', SHOP_PAGES.home),
    ...nameNodes('tp')
  ],
  connections: [
    wire('tpNameNow', 'value', 'tpBrand', 'label'),
    ...nameWires('tp', 'tpRoot'),
    wire('tpRoot', 'didMount', 'tpLoad', 'run'),
    wire('tpCurrent', 'value', 'tpLoad', 'in-current'),
    wire('tpCurrent', 'value', 'tpCurrency', 'value'),
    wire('tpLoad', 'out-items', 'tpCurrency', 'items'),
    wire('tpLoad', 'out-has', 'tpCurrency', 'mounted'),
    wire('tpLoad', 'out-chosen', 'tpSetFirst', 'value'),
    wire('tpLoad', 'out-set', 'tpSetFirst', 'do'),
    wire('tpCurrency', 'value', 'tpPicked', 'in-picked'),
    wire('tpCurrency', 'onChange', 'tpPicked', 'run'),
    wire('tpPicked', 'out-chosen', 'tpSetPicked', 'value'),
    wire('tpPicked', 'out-set', 'tpSetPicked', 'do'),
    wire('tpBrand', 'onClick', 'tpToShop', 'navigate')
  ]
};

// ── the leaves a list draws ───────────────────────────────────────────────────────────────────────────────────────

/** A text-sized button: how a card or chip is reached from the keyboard (a Group can be clicked, not tabbed to). */
export const LINK = { backgroundColor: 'transparent', borderStyle: 'none', paddingLeft: 'var(--space-0)', paddingRight: 'var(--space-0)', paddingTop: 'var(--space-0)', paddingBottom: 'var(--space-0)', color: 'var(--foreground)', clickBubbling: 'never' };

const SHELF_CHIP: PageComponent = {
  path: SHOP_COMPONENTS.shelfChip,
  description: 'One shelf to pick on the home page (All, then each shelf with something on it)',
  nodes: [
    {
      id: 'chButton',
      type: BUTTON,
      label: 'The shelf',
      parameters: {
        ...BTN_BASE,
        fontWeight: 'var(--font-normal)',
        borderRadius: 'var(--radius-full)',
        paddingTop: 'var(--space-2)',
        paddingBottom: 'var(--space-2)',
        paddingLeft: 'var(--space-3)',
        paddingRight: 'var(--space-3)',
        borderStyle: 'solid',
        borderWidth: 'var(--border-1)',
        sizeMode: 'contentSize',
        cssClassName: 'mk-chip'
      }
    },
    {
      id: 'chIn',
      type: 'Component Inputs',
      label: 'One shelf',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'bg', type: 'string', plug: 'output' },
        { name: 'ink', type: 'string', plug: 'output' },
        { name: 'line', type: 'string', plug: 'output' }
      ]
    },
    { id: 'chPick', type: 'Set Variable', label: 'The shelf picked', parameters: { name: 'shelf', setWith: 'string' } }
  ],
  connections: [
    wire('chIn', 'name', 'chButton', 'label'),
    wire('chIn', 'bg', 'chButton', 'backgroundColor'),
    wire('chIn', 'ink', 'chButton', 'color'),
    wire('chIn', 'line', 'chButton', 'borderColor'),
    wire('chIn', 'id', 'chPick', 'value'),
    wire('chButton', 'onClick', 'chPick', 'do')
  ]
};

/** A seller's logo, or its initials on a colour when it has none. */
export function logoOrInitials(p: string, parent: string, side: number, inPort: string): { nodes: Node[]; wires: ReturnType<typeof wire>[] } {
  return {
    nodes: [
      { id: `${p}Logo`, type: 'Image', label: 'Logo', parent, parameters: { width: px(side), height: px(side), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-full)', alt: '', mounted: false } },
      group(`${p}Initials`, 'Initials, when there is no logo', parent, { width: px(side), height: px(side), sizeMode: 'explicit', borderRadius: 'var(--radius-full)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mounted: false }),
      text(`${p}InitialsWords`, 'Initials', `${p}Initials`, '', { textAlignX: 'center', fontSize: side >= 60 ? 'var(--text-lg)' : 'var(--text-sm)', fontWeight: 'var(--font-extrabold)', color: 'var(--secondary-foreground)', cssClassName: 'mk-display' })
    ],
    wires: [
      wire(inPort, 'logo', `${p}Logo`, 'src'),
      wire(inPort, 'hasLogo', `${p}Logo`, 'mounted'),
      wire(inPort, 'noLogo', `${p}Initials`, 'mounted'),
      wire(inPort, 'tint', `${p}Initials`, 'backgroundColor'),
      wire(inPort, 'initials', `${p}InitialsWords`, 'text')
    ]
  };
}
export const LOGO_PORTS = [
  { name: 'logo', type: 'string', plug: 'output' },
  { name: 'hasLogo', type: 'boolean', plug: 'output' },
  { name: 'noLogo', type: 'boolean', plug: 'output' },
  { name: 'initials', type: 'string', plug: 'output' },
  { name: 'tint', type: 'string', plug: 'output' }
];

const chipLogo = logoOrInitials('sc', 'scRoot', 60, 'scIn');
const SELLER_CHIP: PageComponent = {
  path: SHOP_COMPONENTS.sellerChip,
  description: 'One seller in the home page’s row: logo, name, country; opens its page',
  nodes: [
    group('scRoot', 'Seller', undefined, { width: px(92), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-1)', cssClassName: 'mk-pointer' }),
    ...chipLogo.nodes,
    { id: 'scName', type: BUTTON, label: 'Name: to their page', parent: 'scRoot', parameters: { ...LINK, fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', sizeMode: 'contentSize', cssClassName: 'mk-wrap' } },
    text('scPlace', 'Country', 'scRoot', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', textAlignX: 'center' }),
    { id: 'scIn', type: 'Component Inputs', label: 'One seller', ports: [{ name: 'id', type: 'string', plug: 'output' }, { name: 'name', type: 'string', plug: 'output' }, { name: 'place', type: 'string', plug: 'output' }, ...LOGO_PORTS] },
    go('scGo', 'To their page', SHOP_PAGES.seller)
  ],
  connections: [
    ...chipLogo.wires,
    wire('scIn', 'name', 'scName', 'label'),
    wire('scIn', 'place', 'scPlace', 'text'),
    wire('scIn', 'id', 'scGo', 'pm-sellerId'),
    wire('scRoot', 'onClick', 'scGo', 'navigate'),
    wire('scName', 'onClick', 'scGo', 'navigate')
  ]
};

const PRODUCT_CARD: PageComponent = {
  path: SHOP_COMPONENTS.productCard,
  description: 'One product as a card: photo, name, seller and country, price in the buyer’s currency; opens its page',
  nodes: [
    group('pcRoot', 'Product', undefined, {
      width: pct(100),
      sizeMode: 'contentHeight',
      flexDirection: 'column',
      backgroundColor: 'var(--surface)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border)',
      borderRadius: 'var(--radius-xl)',
      cssClassName: 'mk-card'
    }),
    { id: 'pcPhoto', type: 'Image', label: 'First photo (md)', parent: 'pcRoot', parameters: { width: pct(100), height: px(160), sizeMode: 'explicit', objectFit: 'cover', alt: '', cssClassName: 'mk-square', mounted: false } },
    group('pcNoPhoto', 'No photo yet', 'pcRoot', { width: pct(100), height: px(160), sizeMode: 'explicit', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--muted)', cssClassName: 'mk-square', mounted: false }),
    text('pcNoPhotoWords', 'No photo yet', 'pcNoPhoto', 'No photo yet', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', textAlignX: 'center' }),
    group('pcInfo', 'Name, seller, price', 'pcRoot', column({ paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-3)', rowGap: 'var(--space-1)' })),
    { id: 'pcName', type: BUTTON, label: 'Name: to the product', parent: 'pcInfo', parameters: { ...LINK, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', width: pct(100), sizeMode: 'contentHeight', cssClassName: 'mk-wrap mk-left' } },
    text('pcWho', 'Seller and country', 'pcInfo', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }),
    group('pcPriceRow', 'Price', 'pcInfo', rowOf({ flexWrap: 'wrap', columnGap: 'var(--space-2)', rowGap: 'var(--space-1)' })),
    text('pcPrice', 'Price, in the buyer’s currency', 'pcPriceRow', '', { sizeMode: 'contentSize', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'mk-num' }),
    text('pcWas', 'Price, in the seller’s currency', 'pcPriceRow', '', { sizeMode: 'contentSize', fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', cssClassName: 'mk-num', mounted: false }),
    group('pcEnquire', 'Enquire', 'pcPriceRow', { ...PILL, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warn-bg)', mounted: false }),
    text('pcEnquireWords', 'Enquire', 'pcEnquire', 'Enquire', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--warn)' }),
    {
      id: 'pcIn',
      type: 'Component Inputs',
      label: 'One product',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'who', type: 'string', plug: 'output' },
        { name: 'price', type: 'string', plug: 'output' },
        { name: 'was', type: 'string', plug: 'output' },
        { name: 'hasWas', type: 'boolean', plug: 'output' },
        { name: 'enquire', type: 'boolean', plug: 'output' },
        { name: 'photo', type: 'string', plug: 'output' },
        { name: 'hasPhoto', type: 'boolean', plug: 'output' },
        { name: 'noPhoto', type: 'boolean', plug: 'output' }
      ]
    },
    go('pcGo', 'To the product', SHOP_PAGES.product)
  ],
  connections: [
    wire('pcIn', 'photo', 'pcPhoto', 'src'),
    wire('pcIn', 'hasPhoto', 'pcPhoto', 'mounted'),
    wire('pcIn', 'noPhoto', 'pcNoPhoto', 'mounted'),
    wire('pcIn', 'name', 'pcName', 'label'),
    wire('pcIn', 'who', 'pcWho', 'text'),
    wire('pcIn', 'price', 'pcPrice', 'text'),
    wire('pcIn', 'was', 'pcWas', 'text'),
    wire('pcIn', 'hasWas', 'pcWas', 'mounted'),
    wire('pcIn', 'enquire', 'pcEnquire', 'mounted'),
    wire('pcIn', 'id', 'pcGo', 'pm-productId'),
    wire('pcRoot', 'onClick', 'pcGo', 'navigate'),
    wire('pcName', 'onClick', 'pcGo', 'navigate')
  ]
};

const GALLERY_PHOTO: PageComponent = {
  path: SHOP_COMPONENTS.galleryPhoto,
  description: 'One photo on a product’s page (lg)',
  nodes: [
    { id: 'gpImage', type: 'Image', label: 'The photo (lg)', parameters: { width: pct(100), height: px(280), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-xl)', cssClassName: 'mk-photo' } },
    { id: 'gpIn', type: 'Component Inputs', label: 'One photo', ports: [{ name: 'src', type: 'string', plug: 'output' }, { name: 'alt', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('gpIn', 'src', 'gpImage', 'src'), wire('gpIn', 'alt', 'gpImage', 'alt')]
};

// ── the shell of a buyer's page ───────────────────────────────────────────────────────────────────────────────────

/**
 * Page → the screen → the bar (`/Shop/Top`) → anything under the bar → the page's column, 1080 px at most → the bottom
 * bar (`/Shop/Nav`: Home, Basket, My order), with `on` saying which of the three this page is.
 */
export function shopShell(p: string, title: string, urlPath: string, underBar: Node[] = [], on = ''): Node[] {
  return [
    { id: `${p}Page`, type: 'Page', label: title, parameters: { title, urlPath } },
    group(`${p}Root`, 'The screen', `${p}Page`, column({ backgroundColor: 'var(--background)', minHeight: { value: 100, unit: 'vh' }, alignItems: 'center', cssClassName: 'mk-app' })),
    { id: `${p}Top`, type: SHOP_COMPONENTS.top, label: 'The bar', parent: `${p}Root` },
    ...underBar,
    group(`${p}Body`, 'The page', `${p}Root`, column({ maxWidth: px(1080), paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-8)', rowGap: 'var(--space-4)' })),
    { id: `${p}Nav`, type: SHOP_COMPONENTS.nav, label: 'The bottom bar', parent: `${p}Root`, parameters: { on } }
  ];
}

/** The last thing on a buyer's page: where sellers and the admin sign in. */
export function footer(p: string): { nodes: Node[]; wires: ReturnType<typeof wire>[] } {
  return {
    nodes: [
      group(`${p}Foot`, 'For sellers', `${p}Body`, rowOf({ flexWrap: 'wrap', columnGap: 'var(--space-2)', paddingTop: 'var(--space-6)' })),
      text(`${p}FootWords`, 'Sell here?', `${p}Foot`, 'Selling here?', { ...T_META, sizeMode: 'contentSize' }),
      { id: `${p}FootSignIn`, type: BUTTON, label: 'Sign in (sellers and the admin)', parent: `${p}Foot`, parameters: { ...BACK, fontSize: 'var(--text-sm)', label: 'Sign in' } },
      go(`${p}ToSignIn`, 'To sign in', PAGES.signIn)
    ],
    wires: [wire(`${p}FootSignIn`, 'onClick', `${p}ToSignIn`, 'navigate')]
  };
}

/** slice 1's field, without the label a field with Use Label off never reads. */
const { label: _unread, ...searchField } = input('x', 'x', 'x').parameters as Record<string, unknown>;
void _unread;

export const H2 = { fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--foreground)', cssClassName: 'mk-display', as: 'h2' };
/** A section's heading with its small words on the right: "Sellers · in 3 countries". */
export function sectionHead(p: string, parent: string, words: string): Node[] {
  return [
    group(`${p}Head`, `${words || 'Heading'}`, parent, rowOf({ alignItems: 'flex-end' })),
    text(`${p}HeadWords`, 'Heading', `${p}Head`, words, H2),
    text(`${p}HeadSub`, 'Small words', `${p}Head`, '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', sizeMode: 'contentSize', cssClassName: 'mk-nowrap' })
  ];
}

// ── /Pages/Shop/Home ──────────────────────────────────────────────────────────────────────────────────────────────

/** Everything a buyer's home page needs, read once as the public; `HOME_SHAPE` does the rest as they pick and type. */
export const HOME_LOAD = `${SHOP}
try {
  var got = await Promise.all([all('Seller'), all('Country'), all('Category'), all('Product'), all('Rate')]);
} catch (e) { Outputs.problem = 'The shop could not be read just now. Check the connection, then open it again.'; Outputs.failed = true; return; }
Outputs.failed = false;
Outputs.data = { sellers: got[0], countries: got[1], shelves: got[2], products: got[3], rates: got[4] };`;

/**
 * What is on sale (not off sale, its seller not stopped), on the shelf picked, matching every word searched for in
 * its name, description, seller, shelf or country; newest first, priced in the currency picked.
 */
export const HOME_SHAPE = `${SHOP}
var d = Inputs.data;
if (!d) return;
var country = {};
d.countries.forEach(function (c) { country[c.objectId] = c; });
var seller = {};
d.sellers.forEach(function (s) { if (!s.endedAt) seller[s.objectId] = s; });
var shelfName = {};
d.shelves.forEach(function (c) { shelfName[c.objectId] = c.name || ''; });
var live = d.products.filter(function (p) { return !p.endedAt && seller[idOf(p.seller)]; });
var onShelf = {};
live.forEach(function (p) { var k = idOf(p.category); onShelf[k] = (onShelf[k] || 0) + 1; });
var shelf = Inputs.shelf && onShelf[Inputs.shelf] ? String(Inputs.shelf) : '';
function chip(id, name, on) { return { id: id, name: name, bg: on ? 'var(--secondary)' : 'var(--surface)', ink: on ? 'var(--secondary-foreground)' : 'var(--foreground)', line: on ? 'var(--secondary)' : 'var(--border)' }; }
Outputs.shelves = [chip('all', 'All', !shelf)].concat(d.shelves.filter(function (c) { return onShelf[c.objectId]; }).sort(byName).map(function (c) { return chip(c.objectId, c.name || '', c.objectId === shelf); }));
var searched = String(Inputs.search || '').trim();
var words = searched.toLowerCase().split(' ').filter(Boolean);
function about(p) { var s = seller[idOf(p.seller)], c = country[idOf(s.country)]; return [p.name, p.description, s.name, shelfName[idOf(p.category)], c && c.name].join(' ').toLowerCase(); }
var shown = live.filter(function (p) { return (!shelf || idOf(p.category) === shelf) && words.every(function (w) { return about(p).indexOf(w) >= 0; }); }).sort(newest);
var cur = Inputs.currency || '';
Outputs.cards = shown.map(function (p) { var s = seller[idOf(p.seller)]; return card(p, s, country[idOf(s.country)], cur, d.rates); });
var sellers = d.sellers.filter(function (s) { return !s.endedAt; }).sort(byName);
Outputs.sellers = sellers.map(function (s) { return sellerChip(s, country[idOf(s.country)]); });
var places = {};
sellers.forEach(function (s) { places[idOf(s.country)] = true; });
var n = Object.keys(places).length;
Outputs.sellersSub = n ? 'in ' + plural(n, 'country', 'countries') : '';
Outputs.hasSellers = sellers.length > 0;
Outputs.heading = words.length ? 'Found for “' + searched + '”' : shelf ? shelfName[shelf] : 'On sale';
Outputs.sub = (words.length ? plural(shown.length, 'product', 'products') + ' · ' : '') + (cur && rateOf(d.rates, cur) ? 'prices in ' + symbolOf(cur) : 'prices in each seller’s currency');
Outputs.empty = shown.length === 0;
Outputs.emptyWords = live.length === 0 ? 'Nothing is on sale yet. Come back soon.' : words.length ? 'Nothing matches “' + searched + '”' + (shelf ? ' on ' + shelfName[shelf] : '') + '. Try fewer words' + (shelf ? ', or All' : '') + '.' : 'Nothing on this shelf just now.';`;

const HOME: PageComponent = {
  path: SHOP_PAGES.home,
  description: 'The shop: shelves, sellers, everything on sale, a search, prices in the buyer’s currency',
  nodes: [
    ...shopShell('hm', 'Shop', '', [
      group('hmSearchBar', 'The search', 'hmRoot', column({ backgroundColor: 'var(--secondary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingBottom: 'var(--space-3)' })),
      // No label drawn (the picture has none): the placeholder is what a screen reader names it.
      { id: 'hmSearch', type: 'net.noodl.controls.textinput', label: 'Search', parent: 'hmSearchBar', parameters: { ...searchField, useLabel: false, placeholder: 'Search shito, laptops, cars…', borderColor: 'var(--surface)', 'runOnChange-startValue': false } }
    ], 'home'),
    group('hmSplit', 'Shelves beside the rest (tablet), above it (phone)', 'hmBody', column({ rowGap: 'var(--space-4)', cssClassName: 'mk-split' })),
    group('hmShelves', 'The shelves', 'hmSplit', rowOf({ columnGap: 'var(--space-2)', cssClassName: 'mk-chips' })),
    { id: 'hmEachShelf', type: 'For Each', label: 'One chip per shelf', parent: 'hmShelves', parameters: { template: SHOP_COMPONENTS.shelfChip } },
    group('hmMain', 'Sellers and products', 'hmSplit', column({ rowGap: 'var(--space-3)' })),
    group('hmSellersBox', 'The sellers', 'hmMain', column({ rowGap: 'var(--space-2)', mounted: false })),
    ...sectionHead('hmSellers', 'hmSellersBox', 'Sellers'),
    group('hmSellers', 'One per seller', 'hmSellersBox', rowOf({ alignItems: 'flex-start', columnGap: 'var(--space-3)', cssClassName: 'mk-strip' })),
    { id: 'hmEachSeller', type: 'For Each', label: 'One chip per seller', parent: 'hmSellers', parameters: { template: SHOP_COMPONENTS.sellerChip } },
    ...sectionHead('hmProducts', 'hmMain', ''),
    group('hmGrid', 'The products', 'hmMain', column({ rowGap: 'var(--space-3)', cssClassName: 'mk-grid' })),
    { id: 'hmEachProduct', type: 'For Each', label: 'One card per product', parent: 'hmGrid', parameters: { template: SHOP_COMPONENTS.productCard } },
    text('hmEmpty', 'Nothing to show', 'hmMain', '', { ...T_META, mounted: false }),
    text('hmProblem', 'The shop could not be read', 'hmBody', '', { ...T_REFUSED, mounted: false }),
    fn('hmLoad', 'Everything on the shelves, read once', HOME_LOAD, []),
    fn('hmShape', 'What is on sale, on the shelf picked, matching the search', HOME_SHAPE, []),
    { id: 'hmShelf', type: 'Variable2', label: 'The shelf picked', parameters: { name: 'shelf' } },
    { id: 'hmSearched', type: 'Variable2', label: 'What was searched for', parameters: { name: 'search' } },
    { id: 'hmSetSearch', type: 'Set Variable', label: 'What was searched for', parameters: { name: 'search', setWith: 'string' } },
    { id: 'hmCurrency', type: 'Variable2', label: 'The currency prices are shown in', parameters: { name: 'currency' } },
    // The browser tab says the marketplace's name (R13): `/Shop/Top` reads it into the variable.
    { id: 'hmName', type: 'Variable2', label: 'The marketplace’s name', parameters: { name: NAME_VARIABLE } },
    ...footer('hm').nodes
  ],
  connections: [
    wire('hmName', 'value', 'hmPage', 'title'),
    wire('hmRoot', 'didMount', 'hmLoad', 'run'),
    wire('hmLoad', 'out-data', 'hmShape', 'in-data'),
    wire('hmLoad', 'out-failed', 'hmProblem', 'mounted'),
    wire('hmLoad', 'out-problem', 'hmProblem', 'text'),
    wire('hmShelf', 'value', 'hmShape', 'in-shelf'),
    wire('hmSearched', 'value', 'hmShape', 'in-search'),
    wire('hmCurrency', 'value', 'hmShape', 'in-currency'),
    // The search a buyer left comes back with them; typing is shared with the shape, not echoed into the field.
    wire('hmSearched', 'value', 'hmSearch', 'startValue'),
    wire('hmSearchBar', 'didMount', 'hmSearch', 'set'),
    wire('hmSearch', 'onTextChanged', 'hmSetSearch', 'value'),
    wire('hmSearch', 'textChanged', 'hmSetSearch', 'do'),
    wire('hmShape', 'out-shelves', 'hmEachShelf', 'items'),
    wire('hmShape', 'out-sellers', 'hmEachSeller', 'items'),
    wire('hmShape', 'out-hasSellers', 'hmSellersBox', 'mounted'),
    wire('hmShape', 'out-sellersSub', 'hmSellersHeadSub', 'text'),
    wire('hmShape', 'out-heading', 'hmProductsHeadWords', 'text'),
    wire('hmShape', 'out-sub', 'hmProductsHeadSub', 'text'),
    wire('hmShape', 'out-cards', 'hmEachProduct', 'items'),
    wire('hmShape', 'out-empty', 'hmEmpty', 'mounted'),
    wire('hmShape', 'out-emptyWords', 'hmEmpty', 'text'),
    ...footer('hm').wires
  ]
};

// ── /Pages/Shop/Seller ────────────────────────────────────────────────────────────────────────────────────────────

/** One seller as a buyer sees it: nothing of a stopped one, and only what it has on sale. */
export const SELLER_PAGE_LOAD = `${SHOP}
if (Inputs.sellerId === undefined) return;
try {
  var s = (await all('Seller', { objectId: { equalTo: String(Inputs.sellerId) } }))[0];
  var got = s ? await Promise.all([all('Country', { objectId: { equalTo: idOf(s.country) } }), all('Product', { seller: { equalTo: ptr('Seller', s.objectId) } }), all('Rate')]) : null;
} catch (e) { Outputs.problem = 'This seller could not be read just now. Check the connection, then open it again.'; Outputs.gone = true; Outputs.ok = false; return; }
if (!s || s.endedAt) { Outputs.problem = s ? (s.name || 'This seller') + ' isn’t selling here now.' : 'There is no such seller here.'; Outputs.gone = true; Outputs.ok = false; return; }
var country = got[0][0];
var products = got[1].filter(function (p) { return !p.endedAt; }).sort(newest);
var chip = sellerChip(s, country);
Outputs.title = s.name || 'A seller';
Outputs.name = s.name || '';
Outputs.logo = thumb(s.logo, 'md');
Outputs.hasLogo = chip.hasLogo;
Outputs.noLogo = chip.noLogo;
Outputs.initials = chip.initials;
Outputs.tint = chip.tint;
Outputs.place = (country ? country.name + ' · ' : '') + plural(products.length, 'product', 'products') + ' on sale';
Outputs.story = s.story || '';
Outputs.hasStory = !!s.story;
Outputs.cards = products.map(function (p) { return card(p, s, country, Inputs.currency || '', got[2]); });
Outputs.empty = products.length === 0;
Outputs.gone = false;
Outputs.ok = true;`;

const pageLogo = logoOrInitials('sl', 'slWho', 64, 'slLoad');
const SELLER: PageComponent = {
  path: SHOP_PAGES.seller,
  description: 'A seller’s page: logo, story, everything it has on sale',
  nodes: [
    ...shopShell('sl', 'A seller', 'seller/{sellerId}'),
    { id: 'slUrl', type: 'PageInputs', label: 'Which seller', parameters: { pathParams: 'sellerId' } },
    button('slBack', 'Back', 'slBody', '← The shop', BACK),
    group('slContent', 'The seller', 'slBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    group('slWho', 'Logo and name', 'slContent', rowOf({ columnGap: 'var(--space-3)' })),
    ...pageLogo.nodes.map((n) => (n.id === 'slLogo' ? { ...n, parameters: { ...(n.parameters as object), alt: 'The seller’s logo' } } : n)),
    group('slNames', 'Name and place', 'slWho', column({ rowGap: 'var(--space-1)' })),
    text('slName', 'Name', 'slNames', '', T_TITLE),
    text('slPlace', 'Country and how many on sale', 'slNames', '', T_META),
    text('slStory', 'Their story', 'slContent', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', mounted: false }),
    group('slGrid', 'Their products', 'slContent', column({ rowGap: 'var(--space-3)', cssClassName: 'mk-grid' })),
    { id: 'slEach', type: 'For Each', label: 'One card per product', parent: 'slGrid', parameters: { template: SHOP_COMPONENTS.productCard } },
    text('slEmpty', 'Nothing on sale', 'slContent', 'Nothing on sale here just now.', { ...T_META, mounted: false }),
    text('slGone', 'Not here', 'slBody', '', { ...T_NAME, mounted: false }),
    fn('slLoad', 'The seller and what it has on sale', SELLER_PAGE_LOAD, []),
    { id: 'slCurrency', type: 'Variable2', label: 'The currency prices are shown in', parameters: { name: 'currency' } },
    go('slToShop', 'To the shop', SHOP_PAGES.home),
    ...footer('sl').nodes
  ],
  connections: [
    wire('slUrl', 'pm-sellerId', 'slLoad', 'in-sellerId'),
    wire('slCurrency', 'value', 'slLoad', 'in-currency'),
    wire('slLoad', 'out-ok', 'slContent', 'mounted'),
    wire('slLoad', 'out-gone', 'slGone', 'mounted'),
    wire('slLoad', 'out-problem', 'slGone', 'text'),
    wire('slLoad', 'out-title', 'slPage', 'title'),
    wire('slLoad', 'out-name', 'slName', 'text'),
    wire('slLoad', 'out-place', 'slPlace', 'text'),
    wire('slLoad', 'out-story', 'slStory', 'text'),
    wire('slLoad', 'out-hasStory', 'slStory', 'mounted'),
    wire('slLoad', 'out-cards', 'slEach', 'items'),
    wire('slLoad', 'out-empty', 'slEmpty', 'mounted'),
    ...pageLogo.wires.map((w) => ({ ...w, fromProperty: `out-${w.fromProperty}` })),
    wire('slBack', 'onClick', 'slToShop', 'navigate'),
    ...footer('sl').wires
  ]
};

// ── /Pages/Shop/Product ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * One product as a buyer sees it. Off sale, or its seller stopped: it says so and shows nothing else. A buy product goes
 * in the basket, and can be ordered on WhatsApp instead when the seller has a number AND WhatsApp is a way to pay the
 * admin turned on in the seller's country (slice 3; the checkout offers the same way by the same rule). An enquire
 * product says the sale is settled with the seller, off the site, and offers their WhatsApp or phone: that is a
 * message, not a way to pay, so no country turns it off.
 */
export const PRODUCT_PAGE_LOAD = `${SHOP}
if (Inputs.productId === undefined) return;
try {
  var p = (await all('Product', { objectId: { equalTo: String(Inputs.productId) } }))[0];
  var s = p ? (await all('Seller', { objectId: { equalTo: idOf(p.seller) } }))[0] : null;
  var got = s ? await Promise.all([all('Country', { objectId: { equalTo: idOf(s.country) } }), all('Category', { objectId: { equalTo: idOf(p.category) } }), all('Rate'), waysByCountry()]) : null;
} catch (e) { Outputs.problem = 'This product could not be read just now. Check the connection, then open it again.'; Outputs.gone = true; Outputs.ok = false; return; }
if (!p || !s || p.endedAt || s.endedAt) { Outputs.problem = p ? 'This product isn’t on sale now.' : 'There is no such product here.'; Outputs.gone = true; Outputs.ok = false; return; }
var country = got[0][0], shelf = got[1][0], cur = country ? country.currency : '';
var pr = priced(p.price, cur, Inputs.currency || '', got[2]);
var enquire = p.mode === 'enquire';
var photos = (p.photos || []).filter(hasFile);
var chip = sellerChip(s, country);
var wa = String(s.whatsapp || '').replace(/[^0-9]/g, '');
var line = (enquire ? 'Hello, is this still for sale? ' : 'Hello, I would like to order this: ') + (p.name || '') + ' (' + money(p.price, cur) + '). ';
var waOn = (got[3][idOf(s.country)] || []).some(function (w) { return w.method === 'whatsapp'; });
var unit = converted(p.price, cur, Inputs.currency || '', got[2]);
Outputs.productId = p.objectId;
Outputs.unit = unit.amount;
Outputs.unitCurrency = unit.currency;
Outputs.title = p.name || 'A product';
Outputs.name = p.name || '';
Outputs.price = pr.price;
Outputs.was = pr.was;
Outputs.hasWas = !!pr.was;
Outputs.enquire = enquire;
Outputs.buy = !enquire;
Outputs.photos = photos.map(function (f, i) { return { id: f.url, src: thumb(f, 'lg'), alt: (p.name || 'The product') + ', photo ' + (i + 1) + ' of ' + photos.length }; });
Outputs.hasPhotos = photos.length > 0;
Outputs.swipe = photos.length > 1 ? plural(photos.length, 'photo', 'photos') + ': swipe to see them all' : '';
Outputs.hasSwipe = photos.length > 1;
Outputs.description = p.description || '';
Outputs.hasDescription = !!p.description;
Outputs.sellerId = s.objectId;
Outputs.sellerName = s.name || '';
Outputs.sellerPlace = [country && country.name, shelf && shelf.name].filter(Boolean).join(' · ');
Outputs.logo = chip.logo;
Outputs.hasLogo = chip.hasLogo;
Outputs.noLogo = chip.noLogo;
Outputs.initials = chip.initials;
Outputs.tint = chip.tint;
Outputs.delivery = (s.name || 'The seller') + ' confirms the delivery and what it costs before you pay.';
Outputs.hasWhatsapp = !!wa && (enquire || waOn);
Outputs.whatsappLabel = enquire ? 'Message ' + (s.name || 'the seller') + ' on WhatsApp' : 'Order on WhatsApp instead';
Outputs.askLabel = 'Send to ' + (s.name || 'the seller');
Outputs.whatsappLink = wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(line + location.href) : '';
Outputs.call = !wa && s.phone ? 'Call ' + (s.name || 'the seller') + ': ' + s.phone : !wa ? (s.name || 'The seller') + ' hasn’t left a number here yet.' : '';
Outputs.hasCall = !wa;
Outputs.gone = false;
Outputs.ok = true;
Outputs.loaded();`;

/** The Add button's words: how many, at what, in the buyer's currency. */
export const ADD_LABEL = `${SHOP}
var q = Math.max(1, Math.floor(Number(Inputs.quantity) || 1));
Outputs.label = 'Add to basket · ' + money((Number(Inputs.unit) || 0) * q, Inputs.unitCurrency || '');
Outputs.quantityWords = String(q);`;

/** Put this many in the basket on this phone (more of one already there adds to it), and say how many it holds now. */
export const ADD_TO_BASKET = `${SHOP}
var id = String(Inputs.productId || '');
if (!id) return;
var q = Math.max(1, Math.min(99, Math.floor(Number(Inputs.quantity) || 1)));
var b = readBasket();
var line = b.filter(function (l) { return l.productId === id; })[0];
if (line) line.quantity = Math.min(99, line.quantity + q); else b.push({ productId: id, quantity: q });
Outputs.basket = writeBasket(b);
Outputs.added = (line ? line.quantity : q) + ' in your basket.';
Outputs.has = true;
Outputs.go();`;

export const WHATSAPP = { ...BTN_BASE, backgroundColor: 'var(--whatsapp)', color: 'var(--secondary-foreground)', borderStyle: 'none', sizeMode: 'contentHeight', width: pct(100) };
const productLogo = logoOrInitials('pp', 'ppSeller', 40, 'ppLoad');

const PRODUCT: PageComponent = {
  path: SHOP_PAGES.product,
  description: 'A product: its photos, price, seller, description; how many, into the basket, or order on WhatsApp; or enquire',
  nodes: [
    ...shopShell('pp', 'A product', 'item/{productId}'),
    { id: 'ppUrl', type: 'PageInputs', label: 'Which product', parameters: { pathParams: 'productId' } },
    button('ppBack', 'Back', 'ppBody', '← The shop', BACK),
    group('ppContent', 'Photos beside the rest (tablet), above it (phone)', 'ppBody', column({ rowGap: 'var(--space-4)', cssClassName: 'mk-two', mounted: false })),
    group('ppGallery', 'The photos', 'ppContent', column({ rowGap: 'var(--space-2)', cssClassName: 'mk-gallery', mounted: false })),
    { id: 'ppEachPhoto', type: 'For Each', label: 'One per photo', parent: 'ppGallery', parameters: { template: SHOP_COMPONENTS.galleryPhoto } },
    text('ppSwipe', 'More photos: swipe (phone only)', 'ppContent', '', { ...T_META, textAlignX: 'center', cssClassName: 'mk-phone-only', mounted: false }),
    group('ppInfo', 'Name, price, seller, how to get it', 'ppContent', column({ rowGap: 'var(--space-3)' })),
    text('ppName', 'Name', 'ppInfo', '', T_TITLE),
    group('ppPriceRow', 'Price', 'ppInfo', rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 'var(--space-2)', rowGap: 'var(--space-1)' })),
    text('ppPrice', 'Price, in the buyer’s currency', 'ppPriceRow', '', { sizeMode: 'contentSize', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'mk-num' }),
    text('ppWas', 'Price, in the seller’s currency', 'ppPriceRow', '', { sizeMode: 'contentSize', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', cssClassName: 'mk-num', mounted: false }),
    group('ppEnquireTag', 'Enquire', 'ppPriceRow', { ...PILL, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warn-bg)', mounted: false }),
    text('ppEnquireTagWords', 'Enquire', 'ppEnquireTag', 'Enquire', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--warn)' }),
    group('ppSeller', 'The seller', 'ppInfo', rowOf({ columnGap: 'var(--space-3)', cssClassName: 'mk-pointer' })),
    ...productLogo.nodes,
    group('ppSellerWords', 'Name and place', 'ppSeller', column()),
    { id: 'ppSellerName', type: BUTTON, label: 'Seller: to their page', parent: 'ppSellerWords', parameters: { ...LINK, fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', sizeMode: 'contentSize', cssClassName: 'mk-left' } },
    text('ppSellerPlace', 'Country and shelf', 'ppSellerWords', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }),
    text('ppDescription', 'Description', 'ppInfo', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', mounted: false }),
    group('ppEnquireBox', 'Settled off the site', 'ppInfo', column({ backgroundColor: 'var(--warn-bg)', borderRadius: 'var(--radius-xl)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', mounted: false })),
    text('ppEnquireWords', 'How an enquiry works', 'ppEnquireBox', 'This one isn’t bought here. Message the seller: you agree the price and the handover between you, away from the site.', { fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    group('ppAsk', 'Ask the seller (enquire)', 'ppInfo', column({ rowGap: 'var(--space-3)', mounted: false })),
    group('ppAskForm', 'The message', 'ppAsk', column({ rowGap: 'var(--space-3)' })),
    input('ppAskName', 'ppAskForm', 'Your name'),
    input('ppAskContact', 'ppAskForm', 'Your phone or WhatsApp, with the country code', { inputMode: 'tel', placeholder: '+233 24 555 0187' }),
    input('ppAskMessage', 'ppAskForm', 'Your message', { type: 'textArea', placeholder: 'Is it still for sale? Can I see it on Saturday?' }),
    button('ppAskGo', 'Send to the seller', 'ppAskForm', 'Send', MAIN),
    text('ppAskError', 'Why it was not sent', 'ppAskForm', '', { ...T_REFUSED, mounted: false }),
    group('ppAskSent', 'Sent', 'ppAsk', column({ backgroundColor: 'var(--ok-bg)', borderRadius: 'var(--radius-xl)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', mounted: false })),
    text('ppAskSentWords', 'Who has it, and how they’ll reach you', 'ppAskSent', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    group('ppBuyBox', 'Buy: how many, and the basket', 'ppInfo', column({ rowGap: 'var(--space-2)', mounted: false })),
    group('ppQtyRow', 'How many', 'ppBuyBox', rowOf({ justifyContent: 'space-between' })),
    text('ppQtyLabel', 'How many', 'ppQtyRow', 'How many', { ...T_META, sizeMode: 'contentSize' }),
    group('ppStepper', 'One fewer, how many, one more', 'ppQtyRow', { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-3)' }),
    button('ppLess', 'One fewer', 'ppStepper', '−', { ...LINE, paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)' }),
    text('ppQty', 'How many', 'ppStepper', '1', { ...T_NAME, sizeMode: 'contentSize', cssClassName: 'mk-num' }),
    button('ppMore', 'One more', 'ppStepper', '+', { ...LINE, paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)' }),
    button('ppAdd', 'Add to basket', 'ppBuyBox', 'Add to basket', MAIN),
    group('ppAdded', 'In the basket now', 'ppBuyBox', rowOf({ flexWrap: 'wrap', columnGap: 'var(--space-2)', mounted: false })),
    text('ppAddedWords', 'How many the basket holds', 'ppAdded', '', { ...T_META, sizeMode: 'contentSize' }),
    button('ppSeeBasket', 'See your basket', 'ppAdded', 'See your basket →', BACK),
    { id: 'ppWhatsapp', type: BUTTON, label: 'WhatsApp', parent: 'ppInfo', parameters: { ...WHATSAPP, mounted: false } },
    text('ppCall', 'No WhatsApp: their phone', 'ppInfo', '', { ...T_META, mounted: false }),
    text('ppDelivery', 'Who confirms the delivery', 'ppInfo', '', { ...T_META, mounted: false }),
    text('ppGone', 'Not on sale', 'ppBody', '', { ...T_NAME, mounted: false }),
    fn('ppLoad', 'The product, its seller, its price in the buyer’s currency', PRODUCT_PAGE_LOAD, ['loaded']),
    { id: 'ppCount', type: 'Counter', label: 'How many (1 to 99)', parameters: { startValue: 1, limitsEnabled: true, limitsMin: 1, limitsMax: 99 } },
    fn('ppAddLabel', 'The Add button’s words', ADD_LABEL, []),
    fn('ppAddIt', 'Put them in the basket on this phone', ADD_TO_BASKET, ['go'], ['productId', 'quantity']),
    { id: 'ppSetBasket', type: 'Set Variable', label: 'The basket changed', parameters: { name: 'basket', setWith: 'string' } },
    go('ppToBasket', 'To the basket', SHOP_PAGES.basket),
    { id: 'ppCurrency', type: 'Variable2', label: 'The currency prices are shown in', parameters: { name: 'currency' } },
    { id: 'ppOpenWhatsapp', type: 'net.noodl.externallink', label: 'Open WhatsApp', parameters: { openInNewTab: true } },
    fn('ppAskGather', 'The message, as one enquiry', ENQUIRY_GATHER, ['go'], ['productId', 'name', 'contact', 'message']),
    call('ppAskCall', 'sendEnquiry(enquiry)', FN_SEND_ENQUIRY),
    { id: 'ppAskFailed', type: 'Switch', label: 'The last send was refused' },
    { id: 'ppAskDone', type: 'Switch', label: 'Sent (a new product starts unsent)' },
    { id: 'ppAskOpen', type: 'Inverter', label: 'Not sent yet: the form shows' },
    fn('ppAskSay', 'Who has it, and how they’ll reach you', ENQUIRY_SENT, [], ['seller', 'contact']),
    go('ppToShop', 'To the shop', SHOP_PAGES.home),
    go('ppToSeller', 'To the seller', SHOP_PAGES.seller),
    ...footer('pp').nodes
  ],
  connections: [
    wire('ppUrl', 'pm-productId', 'ppLoad', 'in-productId'),
    wire('ppCurrency', 'value', 'ppLoad', 'in-currency'),
    wire('ppLoad', 'out-ok', 'ppContent', 'mounted'),
    wire('ppLoad', 'out-gone', 'ppGone', 'mounted'),
    wire('ppLoad', 'out-problem', 'ppGone', 'text'),
    wire('ppLoad', 'out-title', 'ppPage', 'title'),
    wire('ppLoad', 'out-photos', 'ppEachPhoto', 'items'),
    wire('ppLoad', 'out-hasPhotos', 'ppGallery', 'mounted'),
    wire('ppLoad', 'out-swipe', 'ppSwipe', 'text'),
    wire('ppLoad', 'out-hasSwipe', 'ppSwipe', 'mounted'),
    wire('ppLoad', 'out-name', 'ppName', 'text'),
    wire('ppLoad', 'out-price', 'ppPrice', 'text'),
    wire('ppLoad', 'out-was', 'ppWas', 'text'),
    wire('ppLoad', 'out-hasWas', 'ppWas', 'mounted'),
    wire('ppLoad', 'out-enquire', 'ppEnquireTag', 'mounted'),
    wire('ppLoad', 'out-enquire', 'ppEnquireBox', 'mounted'),
    wire('ppLoad', 'out-sellerName', 'ppSellerName', 'label'),
    wire('ppLoad', 'out-sellerPlace', 'ppSellerPlace', 'text'),
    wire('ppLoad', 'out-sellerId', 'ppToSeller', 'pm-sellerId'),
    ...productLogo.wires.map((w) => ({ ...w, fromProperty: `out-${w.fromProperty}` })),
    wire('ppLoad', 'out-description', 'ppDescription', 'text'),
    wire('ppLoad', 'out-hasDescription', 'ppDescription', 'mounted'),
    wire('ppLoad', 'out-whatsappLabel', 'ppWhatsapp', 'label'),
    wire('ppLoad', 'out-hasWhatsapp', 'ppWhatsapp', 'mounted'),
    wire('ppLoad', 'out-whatsappLink', 'ppOpenWhatsapp', 'link'),
    wire('ppLoad', 'out-call', 'ppCall', 'text'),
    wire('ppLoad', 'out-hasCall', 'ppCall', 'mounted'),
    wire('ppLoad', 'out-delivery', 'ppDelivery', 'text'),
    wire('ppLoad', 'out-buy', 'ppDelivery', 'mounted'),
    wire('ppLoad', 'out-buy', 'ppBuyBox', 'mounted'),
    wire('ppLoad', 'out-loaded', 'ppCount', 'reset'),
    wire('ppLess', 'onClick', 'ppCount', 'decrease'),
    wire('ppMore', 'onClick', 'ppCount', 'increase'),
    wire('ppCount', 'currentCount', 'ppAddLabel', 'in-quantity'),
    wire('ppCount', 'currentCount', 'ppAddIt', 'in-quantity'),
    wire('ppLoad', 'out-unit', 'ppAddLabel', 'in-unit'),
    wire('ppLoad', 'out-unitCurrency', 'ppAddLabel', 'in-unitCurrency'),
    wire('ppAddLabel', 'out-label', 'ppAdd', 'label'),
    wire('ppAddLabel', 'out-quantityWords', 'ppQty', 'text'),
    wire('ppLoad', 'out-productId', 'ppAddIt', 'in-productId'),
    wire('ppAdd', 'onClick', 'ppAddIt', 'run'),
    wire('ppAddIt', 'out-basket', 'ppSetBasket', 'value'),
    wire('ppAddIt', 'out-go', 'ppSetBasket', 'do'),
    wire('ppAddIt', 'out-added', 'ppAddedWords', 'text'),
    wire('ppAddIt', 'out-has', 'ppAdded', 'mounted'),
    wire('ppSeeBasket', 'onClick', 'ppToBasket', 'navigate'),
    wire('ppWhatsapp', 'onClick', 'ppOpenWhatsapp', 'do'),
    wire('ppLoad', 'out-enquire', 'ppAsk', 'mounted'),
    wire('ppLoad', 'out-askLabel', 'ppAskGo', 'label'),
    wire('ppLoad', 'out-productId', 'ppAskGather', 'in-productId'),
    wire('ppLoad', 'out-sellerName', 'ppAskSay', 'in-seller'),
    wire('ppLoad', 'out-loaded', 'ppAskDone', 'off'),
    wire('ppAskName', 'onTextChanged', 'ppAskGather', 'in-name'),
    wire('ppAskContact', 'onTextChanged', 'ppAskGather', 'in-contact'),
    wire('ppAskContact', 'onTextChanged', 'ppAskSay', 'in-contact'),
    wire('ppAskMessage', 'onTextChanged', 'ppAskGather', 'in-message'),
    wire('ppAskGo', 'onClick', 'ppAskGather', 'run'),
    wire('ppAskGather', 'out-enquiry', 'ppAskCall', 'in-enquiry'),
    wire('ppAskGather', 'out-go', 'ppAskCall', 'call'),
    wire('ppAskCall', 'error', 'ppAskError', 'text'),
    wire('ppAskCall', 'failure', 'ppAskFailed', 'on'),
    wire('ppAskCall', 'done', 'ppAskFailed', 'off'),
    wire('ppAskFailed', 'state', 'ppAskError', 'mounted'),
    wire('ppAskCall', 'done', 'ppAskSay', 'run'),
    wire('ppAskSay', 'out-words', 'ppAskSentWords', 'text'),
    wire('ppAskCall', 'done', 'ppAskDone', 'on'),
    wire('ppAskDone', 'state', 'ppAskSent', 'mounted'),
    wire('ppAskDone', 'state', 'ppAskOpen', 'value'),
    wire('ppAskOpen', 'result', 'ppAskForm', 'mounted'),
    wire('ppSeller', 'onClick', 'ppToSeller', 'navigate'),
    wire('ppSellerName', 'onClick', 'ppToSeller', 'navigate'),
    wire('ppBack', 'onClick', 'ppToShop', 'navigate'),
    ...footer('pp').wires
  ]
};

/** The leaves first, then the pages. The home page is the app's first page (the plan registers it first). */
export const SLICE2_LEAVES: PageComponent[] = [TOP, SHELF_CHIP, SELLER_CHIP, PRODUCT_CARD, GALLERY_PHOTO];
export const SLICE2_PAGES: PageComponent[] = [HOME, SELLER, PRODUCT];

/** Every script slice 2 ships, by name, for the spec that compiles and runs them. */
export const SLICE2_SCRIPTS: Record<string, string> = { TOP_LOAD, CURRENCY_PICKED, HOME_LOAD, HOME_SHAPE, SELLER_PAGE_LOAD, PRODUCT_PAGE_LOAD, ADD_LABEL, ADD_TO_BASKET };
