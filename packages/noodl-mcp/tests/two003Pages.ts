/**
 * TWO-003 slice 1 — the marketplace's pages for sellers and the admin, held to the approved picture
 * (`look/marketplace.html`: the admin's Sellers tab, a seller's Products tab and its Add a product form).
 *
 * ## How a page is put together
 *
 * - **Every write is a `Call Cloud Function` node** (`two003Cloud.ts`), so the canvas shows where each change goes.
 *   A form gathers its fields in one script (`gather`), which fires the call: the value and the signal leave the
 *   same node, so the call never runs with a field still in flight.
 * - **Every list is one script that reads with `Noodl.Records`** as the signed-in person, so the policy decides what
 *   comes back, and hands a For Each plain rows already worded for the screen.
 * - **Ids live in the URL** (`admin/seller/{sellerId}`): a page can be reloaded, bookmarked or opened from a link.
 *   `products/mine` is a seller's own shop; the admin opens `products/<sellerId>`.
 * - A page whose read is refused (nobody signed in, or the wrong person) shows why and a way to sign in, and
 *   nothing else.
 *
 * - **Photos are made smaller on the phone before they upload** (Upload File's Shrink To, P121-TWO008-UPLOADSHRINK),
 *   and every list shows the backend's thumbnail (`?thumb=sm`, `md`), never the original.
 *
 * The admin's Ways to pay, Rates and Shelves tabs are slice 3's (`two003Admin.ts`); the Orders tab (a seller's, and the
 * admin's) is slice 4's (`two003Orders.ts`).
 *
 * @module noodl-mcp/tests/two003Pages
 */
import { FN_GIVE_LOGIN, FN_NAME_MARKETPLACE, FN_SAVE_PRODUCT, FN_SAVE_SELLER, FN_SET_UP, FN_STOP_SELLER, FN_TAKE_OFF_SALE, MOST_MARKETPLACE_NAME } from './two003Cloud';
import { TWO003_CSS } from './two003Look';

export type Node = Record<string, unknown>;
export type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
export interface PageComponent {
  path: string;
  description: string;
  nodes: Node[];
  connections: Wire[];
}

export const px = (value: number) => ({ value, unit: 'px' });
export const pct = (value: number) => ({ value, unit: '%' });
export const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });
export const quiet = (...names: string[]) => Object.fromEntries(names.map((n) => [`runOnChange-in-${n}`, false]));
export const signals = (...names: string[]) => names.map((n) => ({ name: `out-${n}`, plug: 'output', type: 'signal' }));

const FUNCTION = 'JavaScriptFunction';
export const BUTTON = 'net.noodl.controls.button';
export const TEXT_INPUT = 'net.noodl.controls.textinput';
export const DROPDOWN = 'net.noodl.controls.options';
const CALL = 'CloudFunction2';
const GO = 'RouterNavigate';

export const PAGES = {
  signIn: '/Pages/SignIn',
  setUp: '/Pages/SetUp',
  sellers: '/Pages/Admin/Sellers',
  name: '/Pages/Admin/Name',
  sellerForm: '/Pages/Admin/SellerForm',
  giveLogin: '/Pages/Admin/GiveLogin',
  stopSeller: '/Pages/Admin/StopSeller',
  products: '/Pages/Seller/Products',
  productForm: '/Pages/Seller/ProductForm',
  waysToPay: '/Pages/Admin/WaysToPay',
  rates: '/Pages/Admin/Rates',
  shelves: '/Pages/Admin/Shelves',
  orders: '/Pages/Orders',
  enquiries: '/Pages/Enquiries'
};

export const COMPONENTS = {
  band: '/UI/Band',
  brand: '/UI/Brand',
  sellerRow: '/Admin/SellerRow',
  productRow: '/Seller/ProductRow',
  photoTile: '/Seller/PhotoTile',
  tabs: '/Admin/Tabs',
  sellerTabs: '/Seller/Tabs',
  orderSection: '/Seller/OrderSection',
  orderCard: '/Seller/OrderCard',
  kpi: '/Seller/Kpi',
  enquirySection: '/Seller/EnquirySection',
  enquiryCard: '/Seller/EnquiryCard'
};

/** A product photo's longer side once it is shrunk on the phone; a logo's. The picture's largest use is 1024 px wide. */
export const PHOTO_SIDE = 1600;
export const LOGO_SIDE = 512;
/** How many photos a product may have (`saveProduct` keeps at most this many). */
export const MOST_PHOTOS = 8;

// ── the look, as parameters ───────────────────────────────────────────────────────────────────────────────────────

export const column = (extra: Record<string, unknown> = {}) => ({ width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', ...extra });
export const rowOf = (extra: Record<string, unknown> = {}) => ({ width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-3)', ...extra });
export const CARD = column({
  backgroundColor: 'var(--surface)',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border)',
  borderRadius: 'var(--radius-xl)',
  paddingLeft: 'var(--space-4)',
  paddingRight: 'var(--space-4)',
  paddingTop: 'var(--space-3)',
  paddingBottom: 'var(--space-3)',
  rowGap: 'var(--space-2)'
});
export const FIELD = {
  useLabel: true,
  sizeMode: 'contentHeight',
  width: pct(100),
  backgroundColor: 'var(--surface)',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border-control)',
  borderRadius: 'var(--radius-md)',
  paddingLeft: 'var(--space-3)',
  paddingRight: 'var(--space-3)',
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)',
  fontSize: 'var(--text-base)',
  color: 'var(--foreground)'
};
export const BTN_BASE = { borderRadius: 'var(--radius-lg)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' };
/** The one filled action on a screen: saffron. */
export const MAIN = { ...BTN_BASE, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderStyle: 'none', sizeMode: 'contentHeight', width: pct(100) };
/** A back link: indigo words, no box. */
export const BACK = { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--secondary)', backgroundColor: 'transparent', borderStyle: 'none', paddingLeft: 'var(--space-0)', paddingRight: 'var(--space-0)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', sizeMode: 'contentSize' };
/** Indigo outline, small: the actions on a row. */
export const LINE = { ...BTN_BASE, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', backgroundColor: 'var(--surface)', color: 'var(--secondary)', borderStyle: 'solid', borderWidth: px(1.5), borderColor: 'var(--secondary)', sizeMode: 'contentSize' };
export const T_TITLE = { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'mk-display', as: 'h1' };
export const T_NAME = { fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)' };
export const T_META = { fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' };
export const T_REFUSED = { fontSize: 'var(--text-sm)', color: 'var(--destructive)' };
export const PILL = { sizeMode: 'contentSize', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', borderRadius: 'var(--radius-full)' };

export const group = (id: string, label: string, parent: string | undefined, parameters: Record<string, unknown>): Node => ({ id, type: 'Group', label, ...(parent ? { parent } : {}), parameters });
export const text = (id: string, label: string, parent: string, words: string, look: Record<string, unknown>): Node => ({ id, type: 'Text', label, parent, parameters: { text: words, ...look } });
export const button = (id: string, label: string, parent: string, words: string, look: Record<string, unknown>): Node => ({ id, type: BUTTON, label, parent, parameters: { label: words, ...look } });
export const input = (id: string, parent: string, label: string, extra: Record<string, unknown> = {}): Node => ({ id, type: TEXT_INPUT, label, parent, parameters: { ...FIELD, label, ...extra } });
export const dropdown = (id: string, parent: string, label: string): Node => ({ id, type: DROPDOWN, label, parent, parameters: { ...FIELD, label } });
export const fn = (id: string, label: string, script: string, outs: string[], quietIns: string[] = []): Node => ({ id, type: FUNCTION, label, ports: signals(...outs), parameters: { functionScript: script, ...quiet(...quietIns) } });
export const call = (id: string, label: string, name: string): Node => ({ id, type: CALL, label, parameters: { function: name } });
/** Router Navigate to a page COMPONENT (the plan resolves it), carrying any URL parameter as `pm-<name>`. */
export const go = (id: string, label: string, target: string, params: Record<string, string> = {}): Node => ({ id, type: GO, label, parameters: { target, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [`pm-${k}`, v])) } });

// ── the page shell: the bar, the band, the body ───────────────────────────────────────────────────────────────────

/**
 * Every page: the indigo bar with the marketplace's name (`/UI/Brand`), the saffron band saying who is signed in (`/UI/Band`), and
 * a body column that is the phone's width on a phone and a readable measure on a tablet.
 */
export function shell(p: string, title: string, urlPath: string, bandWords: string | null, measure = 960, underBand: Node[] = []): Node[] {
  return [
    { id: `${p}Page`, type: 'Page', label: title, parameters: { title, urlPath } },
    group(`${p}Root`, 'The screen', `${p}Page`, column({ backgroundColor: 'var(--background)', minHeight: { value: 100, unit: 'vh' }, alignItems: 'center', cssClassName: 'mk-app' })),
    group(`${p}Bar`, 'The bar', `${p}Root`, rowOf({ backgroundColor: 'var(--secondary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' })),
    { id: `${p}Brand`, type: COMPONENTS.brand, label: 'The marketplace’s name', parent: `${p}Bar` },
    ...(bandWords === null ? [] : [{ id: `${p}Band`, type: COMPONENTS.band, label: 'Who is signed in', parent: `${p}Root`, parameters: { words: bandWords } }]),
    ...underBand,
    group(`${p}Body`, 'The page', `${p}Root`, column({ maxWidth: px(measure), paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-8)', rowGap: 'var(--space-4)' }))
  ];
}

/**
 * Pick a photo, shrink it on the phone, upload it: `<p>Pick` → `<p>Upload` (Shrink To `side`), with `<p>Busy` saying
 * so while it goes and `<p>PhotoError` saying why when it didn't. The caller wires `<p>Upload.cloudFile` on.
 */
function photoUpload(p: string, parent: string, side: number): Node[] {
  return [
    text(`${p}Uploading`, 'Sending the photo', parent, 'Making the photo smaller and sending it…', { ...T_META, mounted: false }),
    text(`${p}PhotoError`, 'Why the photo did not go', parent, '', T_REFUSED),
    { id: `${p}Pick`, type: 'Open File Picker', label: 'Choose a photo', parameters: { acceptedFileTypes: 'image/*' } },
    { id: `${p}Upload`, type: 'Upload File', label: `Send it, shrunk to ${side} px`, parameters: { shrinkTo: side, photoQuality: 80 } },
    { id: `${p}Busy`, type: 'Switch', label: 'Sending a photo' }
  ];
}
const photoUploadWires = (p: string, button: string): Wire[] => [
  wire(button, 'onClick', `${p}Pick`, 'open'),
  wire(`${p}Pick`, 'file', `${p}Upload`, 'file'),
  wire(`${p}Pick`, 'done', `${p}Upload`, 'upload'),
  wire(`${p}Pick`, 'done', `${p}Busy`, 'on'),
  wire(`${p}Upload`, 'completed', `${p}Busy`, 'off'),
  wire(`${p}Busy`, 'state', `${p}Uploading`, 'mounted'),
  wire(`${p}Upload`, 'error', `${p}PhotoError`, 'text')
];

/** What a page shows when its read was refused: the reason, and the way to sign in. */
export function refusedBox(p: string): Node[] {
  return [
    group(`${p}Refused`, 'Refused: why, and sign in', `${p}Body`, column({ rowGap: 'var(--space-3)', mounted: false })),
    text(`${p}RefusedWhy`, 'Why', `${p}Refused`, '', T_REFUSED),
    button(`${p}RefusedSignIn`, 'Sign in', `${p}Refused`, 'Sign in', LINE),
    go(`${p}ToSignIn`, 'To sign in', PAGES.signIn)
  ];
}
export const refusedWires = (p: string, loader: string): Wire[] => [
  wire(loader, 'out-problem', `${p}RefusedWhy`, 'text'),
  wire(loader, 'out-refused', `${p}Refused`, 'mounted'),
  wire(`${p}RefusedSignIn`, 'onClick', `${p}ToSignIn`, 'navigate')
];

/** The script prelude every list and form loader shares: read as the signed-in person, say why when refused. */
export const READ = `function idOf(v) { return v && typeof v === 'object' ? String(v.objectId || v.id || '') : v ? String(v) : ''; }
function ptr(c, id) { return { __type: 'Pointer', className: c, objectId: String(id) }; }
async function all(c, where) { return Noodl.Records.query(c, where || {}, { plain: true, limit: 1000 }); }
function why(e) { var m = e && (e.error || e.message) || String(e || ''); if (/admin’s/.test(m)) return m; return /session|auth|permission|forbidden|401|403/i.test(m) ? 'Sign in to see this page.' : 'This page could not be read: ' + m; }
async function adminOnly() {
  var me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;
  if (!me || me.role !== 'admin') throw { error: 'This page is the admin’s. Sign in as the admin to see it.' };
}
function thumb(f, size) { var u = f && f.url ? String(f.url) : ''; return u ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'thumb=' + size : ''; }
function money(n, cur) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'GHS', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(Number(n) || 0); } catch (e) { return (cur || '') + ' ' + n; } }
`;

// ── /UI/Brand ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The variable every page shows the marketplace's name from: read once, then on screen at once on the next page. */
export const NAME_VARIABLE = 'marketplaceName';

/**
 * R13 (Richard, 2026-10-15): the marketplace's name is the one `Marketplace` row's, named at set-up, never written
 * into a page. Anyone may read it. Read on every page, so a renamed marketplace shows its new name on the next page;
 * written to the shared variable only when it differs, so a page doesn't redraw for nothing. Before set-up there is
 * no row and the bar is empty: only the builder sees the app then, on the way to Set up.
 */
export const NAME_LOAD = `var rows = [];
try { rows = await Noodl.Records.query('Marketplace', {}, { plain: true, limit: 1 }); } catch (e) { return; }
var name = rows[0] && rows[0].name ? String(rows[0].name) : '';
if (name === String(Inputs.current || '')) return;
Outputs.name = name;
Outputs.set();`;

/** The name's three nodes for a component that shows it: `<p>NameNow` holds it, `<p>NameLoad` reads it. */
export const nameNodes = (p: string): Node[] => [
  fn(`${p}NameLoad`, 'The marketplace’s name, read', NAME_LOAD, ['set'], ['current']),
  { id: `${p}NameNow`, type: 'Variable2', label: 'The marketplace’s name', parameters: { name: NAME_VARIABLE } },
  { id: `${p}NameSet`, type: 'Set Variable', label: 'The marketplace’s name, as read', parameters: { name: NAME_VARIABLE, setWith: 'string' } }
];
export const nameWires = (p: string, root: string): Wire[] => [
  wire(root, 'didMount', `${p}NameLoad`, 'run'),
  wire(`${p}NameNow`, 'value', `${p}NameLoad`, 'in-current'),
  wire(`${p}NameLoad`, 'out-name', `${p}NameSet`, 'value'),
  wire(`${p}NameLoad`, 'out-set', `${p}NameSet`, 'do')
];

const BRAND: PageComponent = {
  path: COMPONENTS.brand,
  description: 'The marketplace’s name, in the indigo bar of every admin and seller page',
  nodes: [
    group('brRoot', 'The name', undefined, rowOf({})),
    text('brName', 'The marketplace’s name', 'brRoot', '', { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--secondary-foreground)', cssClassName: 'mk-display' }),
    ...nameNodes('br')
  ],
  connections: [wire('brNameNow', 'value', 'brName', 'text'), ...nameWires('br', 'brRoot')]
};

// ── /UI/Band ───────────────────────────────────────────────────────────────────────────────────────────────────────

const BAND: PageComponent = {
  path: COMPONENTS.band,
  description: 'The saffron band: who is signed in, and Sign out',
  nodes: [
    group('bdRoot', 'Band', undefined, rowOf({ backgroundColor: 'var(--primary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', justifyContent: 'space-between' })),
    text('bdWords', 'Who', 'bdRoot', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-widest)', color: 'var(--primary-foreground)' }),
    button('bdOut', 'Sign out', 'bdRoot', 'Sign out', { ...LINE, paddingTop: 'var(--space-0-5)', paddingBottom: 'var(--space-0-5)', fontSize: 'var(--text-xs)', backgroundColor: 'transparent', color: 'var(--primary-foreground)', borderColor: 'var(--primary-foreground)' }),
    { id: 'bdIn', type: 'Component Inputs', label: 'Inputs', ports: [{ name: 'words', type: 'string', plug: 'output' }] },
    { id: 'bdLogOut', type: 'net.noodl.user.LogOut', label: 'Sign out' },
    go('bdToSignIn', 'To sign in', PAGES.signIn)
  ],
  connections: [wire('bdIn', 'words', 'bdWords', 'text'), wire('bdOut', 'onClick', 'bdLogOut', 'login'), wire('bdLogOut', 'done', 'bdToSignIn', 'navigate')]
};

// ── /Pages/SignIn ──────────────────────────────────────────────────────────────────────────────────────────────────

/** After a sign-in: the admin to the sellers, a seller's staff to their orders, anyone else told plainly. */
export const ROUTE_SCRIPT = `try {
  var r = await Noodl.CloudFunctions.run('whoAmI', {});
  var me = r && r.me;
  if (me && me.role === 'admin') { Outputs.admin(); return; }
  if (me && me.seller) { Outputs.seller(); return; }
  Outputs.problem = 'This sign-in has no place in the marketplace.';
} catch (e) {
  Outputs.problem = (e && e.error) || 'This sign-in has no place in the marketplace.';
}
Outputs.refused();`;

const SIGN_IN: PageComponent = {
  path: PAGES.signIn,
  description: 'Sign in: the admin and sellers’ staff',
  nodes: [
    ...shell('si', 'Sign in', 'sign-in', null, 480),
    text('siTitle', 'Heading', 'siBody', 'Sign in', T_TITLE),
    text('siLead', 'Who signs in here', 'siBody', 'For the marketplace’s admin and sellers’ staff. Buyers don’t need an account.', T_META),
    input('siEmail', 'siBody', 'Email', { type: 'email' }),
    input('siPassword', 'siBody', 'Password', { type: 'password' }),
    button('siGo', 'Sign in', 'siBody', 'Sign in', MAIN),
    text('siError', 'What went wrong', 'siBody', '', T_REFUSED),
    text('siSetUpHint', 'First time', 'siBody', 'Setting up a new marketplace? You need the setup token from whoever started its backend.', T_META),
    button('siSetUp', 'Set up', 'siBody', 'Set up this marketplace', LINE),
    { id: 'siLogIn', type: 'net.noodl.user.LogIn', label: 'Sign in' },
    fn('siRoute', 'Admin to sellers, staff to their orders', ROUTE_SCRIPT, ['admin', 'seller', 'refused']),
    go('siToSellers', 'To the sellers', PAGES.sellers),
    go('siToOrders', 'To my orders', PAGES.orders),
    go('siToSetUp', 'To set up', PAGES.setUp)
  ],
  connections: [
    wire('siEmail', 'onTextChanged', 'siLogIn', 'username'),
    wire('siPassword', 'onTextChanged', 'siLogIn', 'password'),
    wire('siGo', 'onClick', 'siLogIn', 'login'),
    wire('siPassword', 'onEnter', 'siLogIn', 'login'),
    wire('siLogIn', 'error', 'siError', 'text'),
    wire('siLogIn', 'done', 'siRoute', 'run'),
    wire('siRoute', 'out-admin', 'siToSellers', 'navigate'),
    wire('siRoute', 'out-seller', 'siToOrders', 'navigate'),
    wire('siRoute', 'out-problem', 'siError', 'text'),
    wire('siSetUp', 'onClick', 'siToSetUp', 'navigate')
  ]
};

// ── /Pages/SetUp ───────────────────────────────────────────────────────────────────────────────────────────────────

export const SET_UP_GATHER = `Outputs.setup = { setupToken: Inputs.token || '', marketplace: Inputs.marketplace || '', name: Inputs.name || '', email: Inputs.email || '', password: Inputs.password || '' };
Outputs.go();`;

const SET_UP: PageComponent = {
  path: PAGES.setUp,
  description: 'Set up: the marketplace’s name and its first admin, with the setup token',
  nodes: [
    ...shell('su', 'Set up', 'setup', null, 480),
    text('suTitle', 'Heading', 'suBody', 'Set up this marketplace', T_TITLE),
    text('suLead', 'What this does', 'suBody', 'This names the marketplace and makes you its admin. It works once, with the setup token from whoever started the backend.', T_META),
    input('suToken', 'suBody', 'Setup token', { type: 'password' }),
    input('suShop', 'suBody', 'The marketplace’s name', { placeholder: 'As buyers will see it at the top of every page' }),
    input('suName', 'suBody', 'Your name'),
    input('suEmail', 'suBody', 'Your email', { type: 'email' }),
    input('suPassword', 'suBody', 'A password (8 characters or more)', { type: 'password' }),
    button('suGo', 'Set up', 'suBody', 'Make me the admin', MAIN),
    text('suError', 'What went wrong', 'suBody', '', T_REFUSED),
    fn('suGather', 'The form, as one setup', SET_UP_GATHER, ['go'], ['token', 'marketplace', 'name', 'email', 'password']),
    call('suCall', 'setUpMarketplace(setup)', FN_SET_UP),
    go('suToSignIn', 'To sign in', PAGES.signIn)
  ],
  connections: [
    wire('suToken', 'onTextChanged', 'suGather', 'in-token'),
    wire('suShop', 'onTextChanged', 'suGather', 'in-marketplace'),
    wire('suName', 'onTextChanged', 'suGather', 'in-name'),
    wire('suEmail', 'onTextChanged', 'suGather', 'in-email'),
    wire('suPassword', 'onTextChanged', 'suGather', 'in-password'),
    wire('suGo', 'onClick', 'suGather', 'run'),
    wire('suGather', 'out-setup', 'suCall', 'in-setup'),
    wire('suGather', 'out-go', 'suCall', 'call'),
    wire('suCall', 'error', 'suError', 'text'),
    wire('suCall', 'done', 'suToSignIn', 'navigate')
  ]
};

// ── /Pages/Admin/Sellers ───────────────────────────────────────────────────────────────────────────────────────────

export const SELLERS_LOAD = `${READ}
try {
  await adminOnly();
  var sellers = await all('Seller');
  var countries = await all('Country');
  var products = await all('Product');
  var people = await all('Person');
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var countryName = {};
countries.forEach(function (c) { countryName[c.objectId] = c.name || ''; });
var count = function (rows, field, id) { return rows.filter(function (r) { return idOf(r[field]) === id; }).length; };
var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
Outputs.rows = sellers
  .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); })
  .map(function (s) {
    var stopped = !!s.endedAt;
    return {
      id: s.objectId,
      name: s.name || '',
      logo: thumb(s.logo, 'sm'),
      hasLogo: !!(s.logo && s.logo.url),
      place: (countryName[idOf(s.country)] || '') + ' · ' + plural(count(products, 'seller', s.objectId), 'product', 'products') + ' · ' + plural(count(people, 'seller', s.objectId), 'login', 'logins'),
      status: stopped ? 'Stopped' : 'Selling',
      stopped: stopped,
      selling: !stopped,
      stopLabel: stopped ? 'Bring back' : 'Stop'
    };
  });
Outputs.empty = sellers.length === 0;
Outputs.refused = false;
Outputs.ok = true;`;

const SELLERS: PageComponent = {
  path: PAGES.sellers,
  description: 'The admin’s sellers: add, change, give a login, stop or bring back',
  nodes: [
    ...shell('as', 'Sellers', 'admin/sellers', 'Admin', 960, [{ id: 'asTabs', type: COMPONENTS.tabs, label: 'The admin’s tabs', parent: 'asRoot', parameters: { on: 'sellers' } }]),
    group('asContent', 'Sellers', 'asBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('asTitle', 'Heading', 'asContent', 'Sellers', T_TITLE),
    button('asAdd', 'Add a seller', 'asContent', 'Add a seller', MAIN),
    button('asRename', 'Rename the marketplace', 'asContent', 'Rename the marketplace', LINE),
    text('asEmpty', 'No sellers yet', 'asContent', 'No sellers yet. Add the first one: it can sell once it has a login.', { ...T_META, mounted: false }),
    group('asList', 'The sellers', 'asContent', column({ rowGap: 'var(--space-3)' })),
    { id: 'asEach', type: 'For Each', label: 'One row per seller', parent: 'asList', parameters: { template: COMPONENTS.sellerRow } },
    text('asNote', 'What stopping does', 'asContent', 'Payout accounts at the payment provider are seen only by you. Stopping a seller hides their products and stops their logins; you write why, and you can bring them back.', T_META),
    ...refusedBox('as'),
    fn('asLoad', 'Every seller, with its country and counts', SELLERS_LOAD, []),
    go('asToNew', 'To a new seller', PAGES.sellerForm, { sellerId: 'new' }),
    go('asToName', 'To the marketplace’s name', PAGES.name)
  ],
  connections: [
    wire('asRoot', 'didMount', 'asLoad', 'run'),
    wire('asLoad', 'out-rows', 'asEach', 'items'),
    wire('asLoad', 'out-ok', 'asContent', 'mounted'),
    wire('asLoad', 'out-empty', 'asEmpty', 'mounted'),
    ...refusedWires('as', 'asLoad'),
    wire('asAdd', 'onClick', 'asToNew', 'navigate'),
    wire('asRename', 'onClick', 'asToName', 'navigate')
  ]
};

// ── /Pages/Admin/Name ─────────────────────────────────────────────────────────────────────────────────────────────

/** The rename page is the admin's: anyone else is told so and shown the way to sign in. */
export const NAME_PAGE_LOAD = `${READ}
try { await adminOnly(); } catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
Outputs.refused = false;
Outputs.ok = true;`;

/** The name as typed, or the one on screen when nothing was typed; trimmed, as the function keeps it. */
export const NAME_GATHER = `var name = (Inputs.typed === undefined ? String(Inputs.current || '') : String(Inputs.typed)).trim();
Outputs.marketplace = { name: name };
Outputs.name = name;
Outputs.go();`;

/**
 * s19 (R13's follow-up): the admin renames the marketplace. Reached from the Sellers page, not a seventh tab. On
 * Save the bar takes the new name at once (the shared variable), and every other page reads it on its next mount.
 */
const NAME_PAGE: PageComponent = {
  path: PAGES.name,
  description: 'The admin renames the marketplace',
  nodes: [
    ...shell('nm', 'The marketplace’s name', 'admin/name', 'Admin', 480),
    group('nmContent', 'The name', 'nmBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('nmTitle', 'Heading', 'nmContent', 'The marketplace’s name', T_TITLE),
    text('nmLead', 'Where it shows', 'nmContent', `Buyers see it at the top of every page and in their browser’s tab. ${MOST_MARKETPLACE_NAME} characters at most.`, T_META),
    input('nmName', 'nmContent', 'Name'),
    button('nmSave', 'Save', 'nmContent', 'Save the name', MAIN),
    text('nmError', 'What went wrong', 'nmContent', '', { ...T_REFUSED, mounted: false }),
    text('nmSaved', 'Saved', 'nmContent', 'Saved. Every page shows the new name.', { ...T_META, mounted: false }),
    button('nmBack', 'Back to the sellers', 'nmContent', 'Back to the sellers', LINE),
    ...refusedBox('nm'),
    fn('nmLoad', 'The admin only', NAME_PAGE_LOAD, []),
    { id: 'nmNow', type: 'Variable2', label: 'The marketplace’s name', parameters: { name: NAME_VARIABLE } },
    fn('nmGather', 'The new name', NAME_GATHER, ['go'], ['typed', 'current']),
    call('nmCall', 'nameMarketplace(marketplace)', FN_NAME_MARKETPLACE),
    { id: 'nmSet', type: 'Set Variable', label: 'The marketplace’s name, as saved', parameters: { name: NAME_VARIABLE, setWith: 'string' } },
    { id: 'nmShowSaved', type: 'Switch', label: 'Saved, just now' },
    // An old refusal goes when Save is pressed again: shot two003-phone-admin-renamed showed it under "Saved." (s19).
    { id: 'nmShowError', type: 'Switch', label: 'Refused, just now' },
    go('nmToSellers', 'To the sellers', PAGES.sellers)
  ],
  connections: [
    wire('nmRoot', 'didMount', 'nmLoad', 'run'),
    wire('nmLoad', 'out-ok', 'nmContent', 'mounted'),
    ...refusedWires('nm', 'nmLoad'),
    wire('nmNow', 'value', 'nmName', 'startValue'),
    wire('nmNow', 'value', 'nmGather', 'in-current'),
    wire('nmName', 'onTextChanged', 'nmGather', 'in-typed'),
    wire('nmSave', 'onClick', 'nmGather', 'run'),
    wire('nmSave', 'onClick', 'nmShowSaved', 'off'),
    wire('nmGather', 'out-marketplace', 'nmCall', 'in-marketplace'),
    wire('nmGather', 'out-go', 'nmCall', 'call'),
    wire('nmCall', 'error', 'nmError', 'text'),
    wire('nmSave', 'onClick', 'nmShowError', 'off'),
    wire('nmCall', 'failure', 'nmShowError', 'on'),
    wire('nmShowError', 'state', 'nmError', 'mounted'),
    wire('nmGather', 'out-name', 'nmSet', 'value'),
    wire('nmCall', 'done', 'nmSet', 'do'),
    wire('nmCall', 'done', 'nmShowSaved', 'on'),
    wire('nmShowSaved', 'state', 'nmSaved', 'mounted'),
    wire('nmBack', 'onClick', 'nmToSellers', 'navigate')
  ]
};

const SELLER_ROW: PageComponent = {
  path: COMPONENTS.sellerRow,
  description: 'One seller on the admin’s list, with its actions',
  nodes: [
    group('srRoot', 'Seller', undefined, CARD),
    group('srHead', 'Name and status', 'srRoot', rowOf({ justifyContent: 'space-between' })),
    group('srWho', 'Logo and name', 'srHead', { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' }),
    { id: 'srLogo', type: 'Image', label: 'Logo', parent: 'srWho', parameters: { width: px(40), height: px(40), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-full)', alt: '', mounted: false } },
    text('srName', 'Name', 'srWho', '', T_NAME),
    group('srSelling', 'Selling', 'srHead', { ...PILL, backgroundColor: 'var(--ok-bg)', mounted: false }),
    text('srSellingWords', 'Selling', 'srSelling', 'Selling', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--ok)' }),
    group('srStopped', 'Stopped', 'srHead', { ...PILL, backgroundColor: 'var(--bad-bg)', mounted: false }),
    text('srStoppedWords', 'Stopped', 'srStopped', 'Stopped', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--bad)' }),
    text('srPlace', 'Country and counts', 'srRoot', '', T_META),
    group('srActions', 'Actions', 'srRoot', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)' })),
    button('srEdit', 'Edit', 'srActions', 'Edit', LINE),
    button('srLogin', 'Give a login', 'srActions', 'Give a login', LINE),
    button('srProducts', 'Their products', 'srActions', 'Their products', LINE),
    button('srStop', 'Stop or bring back', 'srActions', 'Stop', LINE),
    {
      id: 'srIn',
      type: 'Component Inputs',
      label: 'One seller',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'logo', type: 'string', plug: 'output' },
        { name: 'hasLogo', type: 'boolean', plug: 'output' },
        { name: 'place', type: 'string', plug: 'output' },
        { name: 'selling', type: 'boolean', plug: 'output' },
        { name: 'stopped', type: 'boolean', plug: 'output' },
        { name: 'stopLabel', type: 'string', plug: 'output' }
      ]
    },
    go('srToEdit', 'To edit', PAGES.sellerForm),
    go('srToLogin', 'To give a login', PAGES.giveLogin),
    go('srToProducts', 'To their products', PAGES.products),
    go('srToStop', 'To stop or bring back', PAGES.stopSeller)
  ],
  connections: [
    wire('srIn', 'name', 'srName', 'text'),
    wire('srIn', 'logo', 'srLogo', 'src'),
    wire('srIn', 'hasLogo', 'srLogo', 'mounted'),
    wire('srIn', 'place', 'srPlace', 'text'),
    wire('srIn', 'selling', 'srSelling', 'mounted'),
    wire('srIn', 'stopped', 'srStopped', 'mounted'),
    wire('srIn', 'stopLabel', 'srStop', 'label'),
    ...['srToEdit', 'srToLogin', 'srToProducts', 'srToStop'].map((n) => wire('srIn', 'id', n, 'pm-sellerId')),
    wire('srEdit', 'onClick', 'srToEdit', 'navigate'),
    wire('srLogin', 'onClick', 'srToLogin', 'navigate'),
    wire('srProducts', 'onClick', 'srToProducts', 'navigate'),
    wire('srStop', 'onClick', 'srToStop', 'navigate')
  ]
};

// ── /Pages/Admin/SellerForm ────────────────────────────────────────────────────────────────────────────────────────

export const SELLER_FORM_LOAD = `${READ}
if (Inputs.sellerId === undefined) return;
var isNew = !Inputs.sellerId || Inputs.sellerId === 'new';
try {
  await adminOnly();
  var countries = await all('Country');
  var s = isNew ? null : (await all('Seller', { objectId: { equalTo: String(Inputs.sellerId) } }))[0];
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
if (!isNew && !s) { Outputs.problem = 'There is no such seller.'; Outputs.refused = true; Outputs.ok = false; return; }
countries.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
Outputs.countries = countries.map(function (c) { return { Label: c.name + ' (' + c.currency + ')', Value: c.objectId }; });
var here = s ? countries.filter(function (c) { return c.objectId === idOf(s.country); })[0] : null;
Outputs.heading = isNew ? 'Add a seller' : 'Edit ' + (s.name || 'the seller');
Outputs.isNew = isNew;
Outputs.notNew = !isNew;
Outputs.countryFixed = here ? 'Country: ' + here.name + ' (' + here.currency + '). A seller’s country stays: its prices are in that currency.' : '';
Outputs.country = s ? idOf(s.country) : (countries[0] ? countries[0].objectId : '');
Outputs.name = s ? s.name || '' : '';
Outputs.phone = s ? s.phone || '' : '';
Outputs.whatsapp = s ? s.whatsapp || '' : '';
Outputs.story = s ? s.story || '' : '';
Outputs.payoutAccount = s ? s.payoutAccount || '' : '';
Outputs.logo = s && s.logo && s.logo.url ? { name: s.logo.name || 'logo', url: s.logo.url } : null;
Outputs.logoThumb = thumb(s && s.logo, 'md');
Outputs.hasLogo = !!(s && s.logo && s.logo.url);
Outputs.refused = false;
Outputs.ok = true;`;

/** The logo just uploaded, shown in place of the one loaded. */
export const LOGO_SHOWN = `${READ}
var up = Inputs.uploaded;
var url = up && typeof up.getUrl === 'function' ? up.getUrl() : '';
Outputs.src = url ? thumb({ url: url }, 'md') : Inputs.loaded || '';
Outputs.has = !!Outputs.src;`;

/** A field that was never typed in keeps what was loaded; one cleared on purpose is sent empty. */
export const SELLER_FORM_GATHER = `function v(typed, loaded) { return typed === undefined ? (loaded || '') : String(typed); }
var isNew = !Inputs.sellerId || Inputs.sellerId === 'new';
var seller = {
  name: v(Inputs.name, Inputs.name0),
  phone: v(Inputs.phone, Inputs.phone0),
  whatsapp: v(Inputs.whatsapp, Inputs.whatsapp0),
  story: v(Inputs.story, Inputs.story0),
  payoutAccount: v(Inputs.payoutAccount, Inputs.payoutAccount0)
};
if (isNew) seller.country = v(Inputs.country, Inputs.country0); else seller.id = String(Inputs.sellerId);
var up = Inputs.logo;
if (up && typeof up.getUrl === 'function') seller.logo = { name: up.getName(), url: up.getUrl() };
Outputs.seller = seller;
Outputs.go();`;

const SELLER_FIELDS = ['name', 'phone', 'whatsapp', 'story', 'payoutAccount'] as const;
const SELLER_LABELS: Record<(typeof SELLER_FIELDS)[number], string> = {
  name: 'Name',
  phone: 'Phone',
  whatsapp: 'WhatsApp number (buyers can message it)',
  story: 'Their story (shown on their page)',
  payoutAccount: 'Payout account at the payment provider (only you see it)'
};

const SELLER_FORM: PageComponent = {
  path: PAGES.sellerForm,
  description: 'Add a seller, or change one',
  nodes: [
    ...shell('sf', 'Seller', 'admin/seller/{sellerId}', 'Admin', 640),
    { id: 'sfUrl', type: 'PageInputs', label: 'Which seller', parameters: { pathParams: 'sellerId' } },
    group('sfContent', 'The form', 'sfBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    button('sfBack', 'Back', 'sfContent', '← Sellers', BACK),
    text('sfTitle', 'Heading', 'sfContent', '', T_TITLE),
    input('sfName', 'sfContent', SELLER_LABELS.name),
    group('sfLogoRow', 'The logo', 'sfContent', rowOf({ columnGap: 'var(--space-3)' })),
    { id: 'sfLogo', type: 'Image', label: 'Logo', parent: 'sfLogoRow', parameters: { width: px(64), height: px(64), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-full)', alt: 'The seller’s logo', mounted: false } },
    button('sfLogoPick', 'Choose a logo', 'sfLogoRow', 'Choose a logo', LINE),
    ...photoUpload('sf', 'sfContent', LOGO_SIDE),
    fn('sfLogoShown', 'The logo to show', LOGO_SHOWN, []),
    { ...dropdown('sfCountry', 'sfContent', 'Country'), parameters: { ...FIELD, label: 'Country', mounted: false } },
    text('sfCountryFixed', 'The country, fixed', 'sfContent', '', { ...T_META, mounted: false }),
    input('sfPhone', 'sfContent', SELLER_LABELS.phone, { inputMode: 'tel' }),
    input('sfWhatsapp', 'sfContent', SELLER_LABELS.whatsapp, { inputMode: 'tel' }),
    input('sfStory', 'sfContent', SELLER_LABELS.story, { type: 'textArea' }),
    input('sfPayoutAccount', 'sfContent', SELLER_LABELS.payoutAccount),
    button('sfSave', 'Save', 'sfContent', 'Save', MAIN),
    text('sfError', 'What went wrong', 'sfContent', '', T_REFUSED),
    ...refusedBox('sf'),
    fn('sfLoad', 'The seller, and the countries', SELLER_FORM_LOAD, [], []),
    fn('sfGather', 'The form, as one seller', SELLER_FORM_GATHER, ['go'], [...SELLER_FIELDS, ...SELLER_FIELDS.map((f) => `${f}0`), 'country', 'country0', 'sellerId', 'logo']),
    call('sfCall', 'saveSeller(seller)', FN_SAVE_SELLER),
    go('sfToSellers', 'Back to the sellers', PAGES.sellers)
  ],
  connections: [
    wire('sfUrl', 'pm-sellerId', 'sfLoad', 'in-sellerId'),
    wire('sfUrl', 'pm-sellerId', 'sfGather', 'in-sellerId'),
    wire('sfLoad', 'out-ok', 'sfContent', 'mounted'),
    wire('sfLoad', 'out-heading', 'sfTitle', 'text'),
    wire('sfLoad', 'out-countries', 'sfCountry', 'items'),
    wire('sfLoad', 'out-country', 'sfCountry', 'value'),
    wire('sfLoad', 'out-country', 'sfGather', 'in-country0'),
    wire('sfLoad', 'out-isNew', 'sfCountry', 'mounted'),
    wire('sfLoad', 'out-notNew', 'sfCountryFixed', 'mounted'),
    wire('sfLoad', 'out-countryFixed', 'sfCountryFixed', 'text'),
    wire('sfCountry', 'value', 'sfGather', 'in-country'),
    ...SELLER_FIELDS.flatMap((f) => {
      const id = `sf${f[0].toUpperCase()}${f.slice(1)}`;
      return [wire('sfLoad', `out-${f}`, id, 'startValue'), wire('sfLoad', `out-${f}`, 'sfGather', `in-${f}0`), wire(id, 'onTextChanged', 'sfGather', `in-${f}`)];
    }),
    ...refusedWires('sf', 'sfLoad'),
    ...photoUploadWires('sf', 'sfLogoPick'),
    wire('sfLoad', 'out-logoThumb', 'sfLogoShown', 'in-loaded'),
    wire('sfUpload', 'cloudFile', 'sfLogoShown', 'in-uploaded'),
    wire('sfLogoShown', 'out-src', 'sfLogo', 'src'),
    wire('sfLogoShown', 'out-has', 'sfLogo', 'mounted'),
    wire('sfUpload', 'cloudFile', 'sfGather', 'in-logo'),
    wire('sfSave', 'onClick', 'sfGather', 'run'),
    wire('sfGather', 'out-seller', 'sfCall', 'in-seller'),
    wire('sfGather', 'out-go', 'sfCall', 'call'),
    wire('sfCall', 'error', 'sfError', 'text'),
    wire('sfCall', 'done', 'sfToSellers', 'navigate'),
    wire('sfBack', 'onClick', 'sfToSellers', 'navigate')
  ]
};

// ── /Pages/Admin/GiveLogin ─────────────────────────────────────────────────────────────────────────────────────────

export const ONE_SELLER_LOAD = `${READ}
if (Inputs.sellerId === undefined) return;
try {
  await adminOnly();
  var s = (await all('Seller', { objectId: { equalTo: String(Inputs.sellerId) } }))[0];
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
if (!s) { Outputs.problem = 'There is no such seller.'; Outputs.refused = true; Outputs.ok = false; return; }
Outputs.name = s.name || '';
Outputs.stopped = !!s.endedAt;
Outputs.selling = !s.endedAt;
Outputs.reason = s.stoppedReason || '';
Outputs.refused = false;
Outputs.ok = true;`;

export const LOGIN_GATHER = `Outputs.login = { sellerId: String(Inputs.sellerId || ''), name: Inputs.name || '', email: Inputs.email || '', password: Inputs.password || '' };
Outputs.go();`;

const GIVE_LOGIN: PageComponent = {
  path: PAGES.giveLogin,
  description: 'Give a seller’s staff member a login',
  nodes: [
    ...shell('gl', 'Give a login', 'admin/seller/{sellerId}/login', 'Admin', 640),
    { id: 'glUrl', type: 'PageInputs', label: 'Which seller', parameters: { pathParams: 'sellerId' } },
    group('glContent', 'The form', 'glBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    button('glBack', 'Back', 'glContent', '← Sellers', BACK),
    text('glTitle', 'Heading', 'glContent', 'Give a login', T_TITLE),
    text('glFor', 'For which seller', 'glContent', '', T_NAME),
    text('glLead', 'What a login can do', 'glContent', 'They sign in with this email and password, and see and change only this seller’s products and orders. Tell them the password yourself.', T_META),
    input('glName', 'glContent', 'Their name'),
    input('glEmail', 'glContent', 'Their email', { type: 'email' }),
    input('glPassword', 'glContent', 'A password (8 characters or more)', { type: 'password' }),
    button('glSave', 'Give the login', 'glContent', 'Give the login', MAIN),
    text('glError', 'What went wrong', 'glContent', '', T_REFUSED),
    ...refusedBox('gl'),
    fn('glLoad', 'The seller', ONE_SELLER_LOAD, []),
    fn('glGather', 'The form, as one login', LOGIN_GATHER, ['go'], ['sellerId', 'name', 'email', 'password']),
    call('glCall', 'giveLogin(login)', FN_GIVE_LOGIN),
    go('glToSellers', 'Back to the sellers', PAGES.sellers)
  ],
  connections: [
    wire('glUrl', 'pm-sellerId', 'glLoad', 'in-sellerId'),
    wire('glUrl', 'pm-sellerId', 'glGather', 'in-sellerId'),
    wire('glLoad', 'out-ok', 'glContent', 'mounted'),
    wire('glLoad', 'out-name', 'glFor', 'text'),
    ...refusedWires('gl', 'glLoad'),
    wire('glName', 'onTextChanged', 'glGather', 'in-name'),
    wire('glEmail', 'onTextChanged', 'glGather', 'in-email'),
    wire('glPassword', 'onTextChanged', 'glGather', 'in-password'),
    wire('glSave', 'onClick', 'glGather', 'run'),
    wire('glGather', 'out-login', 'glCall', 'in-login'),
    wire('glGather', 'out-go', 'glCall', 'call'),
    wire('glCall', 'error', 'glError', 'text'),
    wire('glCall', 'done', 'glToSellers', 'navigate'),
    wire('glBack', 'onClick', 'glToSellers', 'navigate')
  ]
};

// ── /Pages/Admin/StopSeller ────────────────────────────────────────────────────────────────────────────────────────

export const STOP_GATHER = `Outputs.stop = { sellerId: String(Inputs.sellerId || ''), stopped: true, reason: Inputs.reason || '' };
Outputs.go();`;
export const BRING_BACK_GATHER = `Outputs.stop = { sellerId: String(Inputs.sellerId || ''), stopped: false };
Outputs.go();`;

const STOP_SELLER: PageComponent = {
  path: PAGES.stopSeller,
  description: 'Stop a seller, with a reason, or bring it back',
  nodes: [
    ...shell('ss', 'Stop a seller', 'admin/seller/{sellerId}/stop', 'Admin', 640),
    { id: 'ssUrl', type: 'PageInputs', label: 'Which seller', parameters: { pathParams: 'sellerId' } },
    group('ssContent', 'The form', 'ssBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    button('ssBack', 'Back', 'ssContent', '← Sellers', BACK),
    text('ssName', 'Which seller', 'ssContent', '', T_TITLE),
    group('ssSelling', 'Selling: stop it', 'ssContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('ssLead', 'What stopping does', 'ssSelling', 'Stopping hides their products from buyers and stops their logins. Old orders still show what was bought. You can bring them back.', T_META),
    input('ssReason', 'ssSelling', 'Why (kept with the seller; only you see it)'),
    button('ssStop', 'Stop', 'ssSelling', 'Stop this seller', MAIN),
    group('ssStopped', 'Stopped: bring it back', 'ssContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('ssWhy', 'Why it was stopped', 'ssStopped', '', T_META),
    button('ssBringBack', 'Bring back', 'ssStopped', 'Bring this seller back', MAIN),
    text('ssError', 'What went wrong', 'ssContent', '', T_REFUSED),
    ...refusedBox('ss'),
    fn('ssLoad', 'The seller', ONE_SELLER_LOAD, []),
    { id: 'ssWhyWords', type: 'Expression', label: '“Stopped: <reason>”', parameters: { expression: "'Stopped: ' + reason" } },
    fn('ssGatherStop', 'Stop, with the reason', STOP_GATHER, ['go'], ['sellerId', 'reason']),
    fn('ssGatherBack', 'Bring back', BRING_BACK_GATHER, ['go'], ['sellerId']),
    call('ssCall', 'stopSeller(stop)', FN_STOP_SELLER),
    go('ssToSellers', 'Back to the sellers', PAGES.sellers)
  ],
  connections: [
    wire('ssUrl', 'pm-sellerId', 'ssLoad', 'in-sellerId'),
    wire('ssUrl', 'pm-sellerId', 'ssGatherStop', 'in-sellerId'),
    wire('ssUrl', 'pm-sellerId', 'ssGatherBack', 'in-sellerId'),
    wire('ssLoad', 'out-ok', 'ssContent', 'mounted'),
    wire('ssLoad', 'out-name', 'ssName', 'text'),
    wire('ssLoad', 'out-selling', 'ssSelling', 'mounted'),
    wire('ssLoad', 'out-stopped', 'ssStopped', 'mounted'),
    wire('ssLoad', 'out-reason', 'ssWhyWords', 'reason'),
    wire('ssWhyWords', 'result', 'ssWhy', 'text'),
    ...refusedWires('ss', 'ssLoad'),
    wire('ssReason', 'onTextChanged', 'ssGatherStop', 'in-reason'),
    wire('ssStop', 'onClick', 'ssGatherStop', 'run'),
    wire('ssBringBack', 'onClick', 'ssGatherBack', 'run'),
    wire('ssGatherStop', 'out-stop', 'ssCall', 'in-stop'),
    wire('ssGatherStop', 'out-go', 'ssCall', 'call'),
    wire('ssGatherBack', 'out-stop', 'ssCall', 'in-stop'),
    wire('ssGatherBack', 'out-go', 'ssCall', 'call'),
    wire('ssCall', 'error', 'ssError', 'text'),
    wire('ssCall', 'done', 'ssToSellers', 'navigate'),
    wire('ssBack', 'onClick', 'ssToSellers', 'navigate')
  ]
};

// ── /Pages/Seller/Products ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * `mine` is the signed-in seller's own shop; any other id is the admin looking at that seller. Off-sale products are
 * listed too (their staff and the admin manage them); buyers' pages leave them out (slice 2).
 */
export const PRODUCTS_LOAD = `${READ}
if (Inputs.sellerId === undefined) return;
void Inputs.changed; // a row took a product off sale or put it back: read the list again
try {
  var me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var isAdmin = me.role === 'admin';
var sellerId = Inputs.sellerId === 'mine' ? (me.seller && me.seller.id) : String(Inputs.sellerId);
if (!sellerId || (!isAdmin && (!me.seller || me.seller.id !== sellerId))) { Outputs.problem = 'These are another seller’s products.'; Outputs.refused = true; Outputs.ok = false; return; }
try {
  var s = (await all('Seller', { objectId: { equalTo: sellerId } }))[0];
  var country = s ? (await all('Country', { objectId: { equalTo: idOf(s.country) } }))[0] : null;
  var shelves = await all('Category');
  var products = await all('Product', { seller: { equalTo: ptr('Seller', sellerId) } });
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var shelf = {};
shelves.forEach(function (c) { shelf[c.objectId] = c.name || ''; });
var cur = country ? country.currency : '';
Outputs.band = isAdmin ? 'Admin · ' + (s ? s.name : '') : 'Signed in as ' + (s ? s.name : '');
Outputs.heading = isAdmin ? (s ? s.name : '') + '’s products' : 'Your products';
Outputs.isAdmin = isAdmin;
Outputs.isStaff = !isAdmin;
Outputs.urlSeller = String(Inputs.sellerId);
Outputs.stoppedNote = s && s.endedAt ? 'This seller is stopped: its products are hidden from buyers and can’t change until it is brought back.' : '';
Outputs.isStopped = !!(s && s.endedAt);
Outputs.rows = products
  .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); })
  .map(function (p) {
    var on = !p.endedAt;
    return {
      id: p.objectId,
      urlSeller: String(Inputs.sellerId),
      name: p.name || '',
      thumb: thumb((p.photos || [])[0], 'sm'),
      hasThumb: !!((p.photos || [])[0] && p.photos[0].url),
      line: money(p.price, cur) + ' · ' + (shelf[idOf(p.category)] || '') + (p.mode === 'enquire' ? ' · Enquire' : ''),
      onSale: on,
      offSale: !on,
      toggleLabel: on ? 'Take off sale' : 'Put on sale'
    };
  });
Outputs.empty = products.length === 0;
Outputs.refused = false;
Outputs.ok = true;`;

const PRODUCTS: PageComponent = {
  path: PAGES.products,
  description: 'A seller’s products: add, change, take off sale',
  nodes: [
    ...shell('sp', 'Products', 'products/{sellerId}', '', 960, [
      group('spTabsBox', 'A seller’s tabs (not the admin’s)', 'spRoot', { width: pct(100), sizeMode: 'contentHeight', mounted: false }),
      { id: 'spTabs', type: COMPONENTS.sellerTabs, label: 'Orders, Products, Enquiries', parent: 'spTabsBox', parameters: { on: 'products' } }
    ]),
    { id: 'spUrl', type: 'PageInputs', label: 'Whose products', parameters: { pathParams: 'sellerId' } },
    group('spContent', 'Products', 'spBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    button('spBack', 'Back to the sellers (admin)', 'spContent', '← Sellers', { ...BACK, mounted: false }),
    text('spTitle', 'Heading', 'spContent', '', T_TITLE),
    text('spStopped', 'This seller is stopped', 'spContent', '', { ...T_REFUSED, mounted: false }),
    button('spAdd', 'Add a product', 'spContent', 'Add a product', MAIN),
    text('spEmpty', 'No products yet', 'spContent', 'No products yet. Add the first one.', { ...T_META, mounted: false }),
    group('spList', 'The products', 'spContent', column({ rowGap: 'var(--space-3)' })),
    { id: 'spEach', type: 'For Each', label: 'One row per product', parent: 'spList', parameters: { template: COMPONENTS.productRow } },
    text('spNote', 'What off sale means', 'spContent', 'Taking a product off sale hides it from buyers. Orders that already have it keep it, at the price it had.', T_META),
    ...refusedBox('sp'),
    fn('spLoad', 'This seller’s products', PRODUCTS_LOAD, [], []),
    { id: 'spVersion', type: 'Variable2', label: 'A product changed', parameters: { name: 'productsChanged' } },
    go('spToNew', 'To a new product', PAGES.productForm, { productId: 'new' }),
    go('spToSellers', 'Back to the sellers', PAGES.sellers)
  ],
  connections: [
    wire('spUrl', 'pm-sellerId', 'spLoad', 'in-sellerId'),
    wire('spRoot', 'didMount', 'spLoad', 'run'),
    wire('spVersion', 'value', 'spLoad', 'in-changed'),
    wire('spLoad', 'out-ok', 'spContent', 'mounted'),
    wire('spLoad', 'out-band', 'spBand', 'words'),
    wire('spLoad', 'out-heading', 'spTitle', 'text'),
    wire('spLoad', 'out-isAdmin', 'spBack', 'mounted'),
    wire('spLoad', 'out-isStaff', 'spTabsBox', 'mounted'),
    wire('spLoad', 'out-isStopped', 'spStopped', 'mounted'),
    wire('spLoad', 'out-stoppedNote', 'spStopped', 'text'),
    wire('spLoad', 'out-rows', 'spEach', 'items'),
    wire('spLoad', 'out-empty', 'spEmpty', 'mounted'),
    wire('spLoad', 'out-urlSeller', 'spToNew', 'pm-sellerId'),
    ...refusedWires('sp', 'spLoad'),
    wire('spAdd', 'onClick', 'spToNew', 'navigate'),
    wire('spBack', 'onClick', 'spToSellers', 'navigate')
  ]
};

export const TOGGLE_GATHER = `Outputs.sale = { productId: String(Inputs.id || ''), off: Inputs.onSale === true };
Outputs.go();`;
export const STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const PRODUCT_ROW: PageComponent = {
  path: COMPONENTS.productRow,
  description: 'One product on a seller’s list: edit, take off sale or put back',
  nodes: [
    group('prRoot', 'Product', undefined, CARD),
    group('prHead', 'Name and status', 'prRoot', rowOf({ justifyContent: 'space-between' })),
    group('prWho', 'Photo and name', 'prHead', { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' }),
    { id: 'prThumb', type: 'Image', label: 'First photo', parent: 'prWho', parameters: { width: px(40), height: px(40), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-md)', alt: '', mounted: false } },
    text('prName', 'Name', 'prWho', '', T_NAME),
    group('prOn', 'On sale', 'prHead', { ...PILL, backgroundColor: 'var(--ok-bg)', mounted: false }),
    text('prOnWords', 'On sale', 'prOn', 'On sale', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--ok)' }),
    group('prOff', 'Off sale', 'prHead', { ...PILL, backgroundColor: 'var(--bad-bg)', mounted: false }),
    text('prOffWords', 'Off sale', 'prOff', 'Off sale', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--bad)' }),
    text('prLine', 'Price and shelf', 'prRoot', '', T_META),
    group('prActions', 'Actions', 'prRoot', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)' })),
    button('prEdit', 'Edit', 'prActions', 'Edit', LINE),
    button('prToggle', 'Take off sale or put back', 'prActions', 'Take off sale', LINE),
    text('prError', 'What went wrong', 'prRoot', '', T_REFUSED),
    {
      id: 'prIn',
      type: 'Component Inputs',
      label: 'One product',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'urlSeller', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'thumb', type: 'string', plug: 'output' },
        { name: 'hasThumb', type: 'boolean', plug: 'output' },
        { name: 'line', type: 'string', plug: 'output' },
        { name: 'onSale', type: 'boolean', plug: 'output' },
        { name: 'offSale', type: 'boolean', plug: 'output' },
        { name: 'toggleLabel', type: 'string', plug: 'output' }
      ]
    },
    fn('prGather', 'Off sale or back on', TOGGLE_GATHER, ['go'], ['id', 'onSale']),
    call('prCall', 'takeOffSale(sale)', FN_TAKE_OFF_SALE),
    fn('prStamp', 'Say a product changed', STAMP, ['go']),
    { id: 'prChanged', type: 'Set Variable', label: 'A product changed', parameters: { name: 'productsChanged', setWith: 'string' } },
    go('prToEdit', 'To edit', PAGES.productForm)
  ],
  connections: [
    wire('prIn', 'name', 'prName', 'text'),
    wire('prIn', 'thumb', 'prThumb', 'src'),
    wire('prIn', 'hasThumb', 'prThumb', 'mounted'),
    wire('prIn', 'line', 'prLine', 'text'),
    wire('prIn', 'onSale', 'prOn', 'mounted'),
    wire('prIn', 'offSale', 'prOff', 'mounted'),
    wire('prIn', 'toggleLabel', 'prToggle', 'label'),
    wire('prIn', 'id', 'prGather', 'in-id'),
    wire('prIn', 'onSale', 'prGather', 'in-onSale'),
    wire('prIn', 'id', 'prToEdit', 'pm-productId'),
    wire('prIn', 'urlSeller', 'prToEdit', 'pm-sellerId'),
    wire('prEdit', 'onClick', 'prToEdit', 'navigate'),
    wire('prToggle', 'onClick', 'prGather', 'run'),
    wire('prGather', 'out-sale', 'prCall', 'in-sale'),
    wire('prGather', 'out-go', 'prCall', 'call'),
    wire('prCall', 'error', 'prError', 'text'),
    wire('prCall', 'done', 'prStamp', 'run'),
    wire('prStamp', 'out-at', 'prChanged', 'value'),
    wire('prStamp', 'out-go', 'prChanged', 'do')
  ]
};

// ── /Seller/PhotoTile ──────────────────────────────────────────────────────────────────────────────────────────────

/** Which photo to take off, made unique so taking off the same one twice in a session is still news. */
export const PHOTO_GONE = `Outputs.removed = String(Inputs.url || '') + '|' + Date.now();
Outputs.go();`;

const PHOTO_TILE: PageComponent = {
  path: COMPONENTS.photoTile,
  description: 'One photo on the product form, with a way to take it off',
  nodes: [
    group('ptRoot', 'Photo', undefined, { width: px(96), sizeMode: 'contentHeight', flexDirection: 'column', rowGap: 'var(--space-1)' }),
    { id: 'ptImage', type: 'Image', label: 'The photo', parent: 'ptRoot', parameters: { width: px(96), height: px(96), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-md)', alt: 'A photo of the product' } },
    button('ptRemove', 'Take it off', 'ptRoot', 'Remove', { ...LINE, width: px(96), sizeMode: 'contentHeight' }),
    {
      id: 'ptIn',
      type: 'Component Inputs',
      label: 'One photo',
      ports: [
        { name: 'url', type: 'string', plug: 'output' },
        { name: 'thumb', type: 'string', plug: 'output' }
      ]
    },
    fn('ptGone', 'Say which photo goes', PHOTO_GONE, ['go'], ['url']),
    { id: 'ptRemoved', type: 'Set Variable', label: 'A photo was taken off', parameters: { name: 'photoRemoved', setWith: 'string' } }
  ],
  connections: [
    wire('ptIn', 'thumb', 'ptImage', 'src'),
    wire('ptIn', 'url', 'ptGone', 'in-url'),
    wire('ptRemove', 'onClick', 'ptGone', 'run'),
    wire('ptGone', 'out-removed', 'ptRemoved', 'value'),
    wire('ptGone', 'out-go', 'ptRemoved', 'do')
  ]
};

// ── /Pages/Seller/ProductForm ──────────────────────────────────────────────────────────────────────────────────────

export const PRODUCT_FORM_LOAD = `${READ}
if (Inputs.sellerId === undefined || Inputs.productId === undefined) return;
var isNew = !Inputs.productId || Inputs.productId === 'new';
try {
  var me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;
  var sellerId = Inputs.sellerId === 'mine' ? (me.seller && me.seller.id) : String(Inputs.sellerId);
  var s = sellerId ? (await all('Seller', { objectId: { equalTo: sellerId } }))[0] : null;
  var country = s ? (await all('Country', { objectId: { equalTo: idOf(s.country) } }))[0] : null;
  var shelves = await all('Category');
  var p = isNew ? null : (await all('Product', { objectId: { equalTo: String(Inputs.productId) } }))[0];
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
if (!s || (!isNew && !p)) { Outputs.problem = 'There is no such product.'; Outputs.refused = true; Outputs.ok = false; return; }
shelves.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
Outputs.shelves = shelves.map(function (c) { return { Label: c.name, Value: c.objectId }; });
Outputs.modes = [{ Label: 'Buy through the basket', Value: 'buy' }, { Label: 'Enquire (they message you; you settle it yourselves)', Value: 'enquire' }];
Outputs.heading = isNew ? 'Add a product' : 'Edit ' + (p.name || 'the product');
Outputs.band = me.role === 'admin' ? 'Admin · ' + s.name : 'Signed in as ' + s.name;
Outputs.priceLabel = 'Price (' + (country ? country.currency : '') + ')';
Outputs.sellerId = sellerId;
Outputs.name = p ? p.name || '' : '';
Outputs.description = p ? p.description || '' : '';
Outputs.price = p ? String(p.price) : '';
Outputs.category = p ? idOf(p.category) : ''; // no shelf chosen for a new product: the seller picks one
Outputs.mode = p ? p.mode || 'buy' : 'buy';
Outputs.photos = (p && Array.isArray(p.photos) ? p.photos : []).filter(function (f) { return f && f.url; }).map(function (f) { return { name: f.name || 'photo', url: f.url }; });
Outputs.refused = false;
Outputs.ok = true;`;

export const PRODUCT_FORM_GATHER = `function v(typed, loaded) { return typed === undefined ? (loaded || '') : String(typed); }
var isNew = !Inputs.productId || Inputs.productId === 'new';
var product = {
  seller: String(Inputs.sellerId || ''),
  name: v(Inputs.name, Inputs.name0),
  description: v(Inputs.description, Inputs.description0),
  price: Number(v(Inputs.price, Inputs.price0).replace(/[^0-9.]/g, '')),
  category: v(Inputs.category, Inputs.category0),
  mode: v(Inputs.mode, Inputs.mode0) || 'buy'
};
if (Array.isArray(Inputs.photos)) product.photos = Inputs.photos;
if (!isNew) product.id = String(Inputs.productId);
Outputs.product = product;
Outputs.go();`;

/**
 * The form's photos, kept on the page's own object while it is open: the product's when it loads, one more when an
 * upload lands, one fewer when a tile says so. A new load starts again and swallows what came before it, so a photo
 * taken off on a form that was left unsaved is back when the product is opened again.
 */
export const PHOTO_LIST = `${READ}
var keep = Component.Object;
var photos = keep.get('photos') || [];
if (Inputs.loaded !== keep.get('loadedFrom')) {
  keep.set('loadedFrom', Inputs.loaded);
  keep.set('addedFrom', Inputs.added);
  keep.set('removedFrom', Inputs.removed);
  photos = Array.isArray(Inputs.loaded) ? Inputs.loaded.slice() : [];
}
var up = Inputs.added;
if (up && up !== keep.get('addedFrom')) {
  keep.set('addedFrom', up);
  if (typeof up.getUrl === 'function' && up.getUrl()) photos = photos.concat([{ name: up.getName() || 'photo', url: up.getUrl() }]).slice(0, ${MOST_PHOTOS});
}
if (Inputs.removed && Inputs.removed !== keep.get('removedFrom')) {
  keep.set('removedFrom', Inputs.removed);
  var gone = String(Inputs.removed).split('|')[0];
  photos = photos.filter(function (f) { return f.url !== gone; });
}
keep.set('photos', photos);
Outputs.photos = photos;
Outputs.tiles = photos.map(function (f) { return { id: f.url, url: f.url, thumb: thumb(f, 'md') }; });
Outputs.room = photos.length < ${MOST_PHOTOS};`;

const ADD_TILE = { ...BTN_BASE, width: px(96), height: px(96), sizeMode: 'explicit', backgroundColor: 'var(--surface)', color: 'var(--muted-foreground)', borderStyle: 'dashed', borderWidth: px(2), borderColor: 'var(--border)' };

const PRODUCT_FORM: PageComponent = {
  path: PAGES.productForm,
  description: 'Add a product, or change one',
  nodes: [
    ...shell('pf', 'Product', 'product/{sellerId}/{productId}', '', 640),
    { id: 'pfUrl', type: 'PageInputs', label: 'Which product', parameters: { pathParams: 'sellerId,productId' } },
    group('pfContent', 'The form', 'pfBody', column({ rowGap: 'var(--space-3)', mounted: false })),
    button('pfBack', 'Back', 'pfContent', '← Products', BACK),
    text('pfTitle', 'Heading', 'pfContent', '', T_TITLE),
    group('pfPhotos', 'The photos', 'pfContent', column({ rowGap: 'var(--space-2)' })),
    group('pfGrid', 'One tile per photo, then Add', 'pfPhotos', rowOf({ flexWrap: 'wrap', alignItems: 'flex-start', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)' })),
    { id: 'pfEach', type: 'For Each', label: 'One tile per photo', parent: 'pfGrid', parameters: { template: COMPONENTS.photoTile } },
    button('pfAddPhoto', 'Add a photo', 'pfGrid', '+ Add a photo', ADD_TILE),
    ...photoUpload('pf', 'pfPhotos', PHOTO_SIDE),
    text('pfPhotoNote', 'Photos are made smaller', 'pfPhotos', `Photos are made smaller on your phone before they upload, so they’re quick on mobile data. Up to ${MOST_PHOTOS}.`, T_META),
    fn('pfPhotoList', 'The photos, while the form is open', PHOTO_LIST, []),
    { id: 'pfRemoved', type: 'Variable2', label: 'A photo was taken off', parameters: { name: 'photoRemoved' } },
    input('pfName', 'pfContent', 'Name'),
    input('pfDescription', 'pfContent', 'Description', { type: 'textArea' }),
    input('pfPrice', 'pfContent', 'Price', { inputMode: 'decimal' }),
    { ...dropdown('pfCategory', 'pfContent', 'Shelf'), parameters: { ...FIELD, label: 'Shelf', placeholder: 'Choose a shelf' } },
    dropdown('pfMode', 'pfContent', 'How buyers get it'),
    button('pfSave', 'Save', 'pfContent', 'Save and put on sale', MAIN),
    text('pfError', 'What went wrong', 'pfContent', '', T_REFUSED),
    ...refusedBox('pf'),
    fn('pfLoad', 'The product, the shelves, the seller’s currency', PRODUCT_FORM_LOAD, [], []),
    fn('pfGather', 'The form, as one product', PRODUCT_FORM_GATHER, ['go'], ['sellerId', 'productId', 'name', 'name0', 'description', 'description0', 'price', 'price0', 'category', 'category0', 'mode', 'mode0', 'photos']),
    call('pfCall', 'saveProduct(product)', FN_SAVE_PRODUCT),
    go('pfToProducts', 'Back to the products', PAGES.products)
  ],
  connections: [
    wire('pfUrl', 'pm-sellerId', 'pfLoad', 'in-sellerId'),
    wire('pfUrl', 'pm-productId', 'pfLoad', 'in-productId'),
    wire('pfUrl', 'pm-productId', 'pfGather', 'in-productId'),
    wire('pfUrl', 'pm-sellerId', 'pfToProducts', 'pm-sellerId'),
    wire('pfLoad', 'out-sellerId', 'pfGather', 'in-sellerId'),
    wire('pfLoad', 'out-ok', 'pfContent', 'mounted'),
    wire('pfLoad', 'out-band', 'pfBand', 'words'),
    wire('pfLoad', 'out-heading', 'pfTitle', 'text'),
    wire('pfLoad', 'out-priceLabel', 'pfPrice', 'label'),
    wire('pfLoad', 'out-shelves', 'pfCategory', 'items'),
    wire('pfLoad', 'out-modes', 'pfMode', 'items'),
    ...(['name', 'description', 'price'] as const).flatMap((f) => {
      const id = `pf${f[0].toUpperCase()}${f.slice(1)}`;
      return [wire('pfLoad', `out-${f}`, id, 'startValue'), wire('pfLoad', `out-${f}`, 'pfGather', `in-${f}0`), wire(id, 'onTextChanged', 'pfGather', `in-${f}`)];
    }),
    ...(['category', 'mode'] as const).flatMap((f) => {
      const id = `pf${f[0].toUpperCase()}${f.slice(1)}`;
      return [wire('pfLoad', `out-${f}`, id, 'value'), wire('pfLoad', `out-${f}`, 'pfGather', `in-${f}0`), wire(id, 'value', 'pfGather', `in-${f}`)];
    }),
    ...refusedWires('pf', 'pfLoad'),
    ...photoUploadWires('pf', 'pfAddPhoto'),
    wire('pfLoad', 'out-photos', 'pfPhotoList', 'in-loaded'),
    wire('pfUpload', 'cloudFile', 'pfPhotoList', 'in-added'),
    wire('pfRemoved', 'value', 'pfPhotoList', 'in-removed'),
    wire('pfPhotoList', 'out-tiles', 'pfEach', 'items'),
    wire('pfPhotoList', 'out-room', 'pfAddPhoto', 'mounted'),
    wire('pfPhotoList', 'out-photos', 'pfGather', 'in-photos'),
    wire('pfSave', 'onClick', 'pfGather', 'run'),
    wire('pfGather', 'out-product', 'pfCall', 'in-product'),
    wire('pfGather', 'out-go', 'pfCall', 'call'),
    wire('pfCall', 'error', 'pfError', 'text'),
    wire('pfCall', 'done', 'pfToProducts', 'navigate'),
    wire('pfBack', 'onClick', 'pfToProducts', 'navigate')
  ]
};

// ── App ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const APP_NODES: Node[] = [
  group('appRoot', 'App', undefined, { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', backgroundColor: 'var(--background)' }),
  { id: 'appRouter', type: 'Router', label: 'Main router', parent: 'appRoot', parameters: { name: 'Main' } },
  { id: 'appCss', type: 'CSS Definition', label: 'The two faces and the focus ring (two003Look.ts)', parameters: { style: TWO003_CSS } }
];

/** Leaves first, then what places them; then the pages (the template puts the shop's home page before them all). */
export const SLICE1_LEAVES: PageComponent[] = [BRAND, BAND, SELLER_ROW, PRODUCT_ROW, PHOTO_TILE];
export const SLICE1_SCREENS: PageComponent[] = [SIGN_IN, SET_UP, SELLERS, NAME_PAGE, SELLER_FORM, GIVE_LOGIN, STOP_SELLER, PRODUCTS, PRODUCT_FORM];
