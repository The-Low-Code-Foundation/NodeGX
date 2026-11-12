/**
 * TWO-003 slice 3 — what the admin sets: the tabs (Sellers · Orders · Ways to pay · Rates · Shelves; Orders is slice
 * 4's page, `two003Orders.ts`), the ways to pay turned on per country (and the countries themselves), the rates, and
 * the shelves. Held to the approved picture
 * (`look/marketplace.html`: the admin's Ways to pay and Rates); the picture draws no page for countries or shelves, so
 * countries sit with the ways to pay (each way is turned on per country) and shelves have a tab of their own.
 *
 * Every write is one of slice 3's functions (`two003Checkout.ts`); every page asks `whoAmI` first and shows nothing of
 * the admin's to anyone else, as slice 1's admin pages do.
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two003Basket.test.ts` compiles and runs every one.
 *
 * @module noodl-mcp/tests/two003Admin
 */
import { BUILT_WAYS, FN_SAVE_COUNTRY, FN_SAVE_RATES, FN_SAVE_SHELF, FN_SAVE_WAY_TO_PAY, WAY_WORDS } from './two003Checkout';
import {
  BUTTON,
  button,
  call,
  CARD,
  column,
  COMPONENTS,
  FIELD,
  fn,
  go,
  group,
  input,
  LINE,
  MAIN,
  Node,
  PageComponent,
  PAGES,
  px,
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

const setVar = (id: string, label: string, name: string, extra: Record<string, unknown> = {}): Node => ({ id, type: 'Set Variable', label, parameters: { name, setWith: 'string', ...extra } });
const variable = (id: string, label: string, name: string): Node => ({ id, type: 'Variable2', label, parameters: { name } });
const tabsUnder = (p: string, on: string): Node[] => [{ id: `${p}Tabs`, type: COMPONENTS.tabs, label: 'The admin’s tabs', parent: `${p}Root`, parameters: { on } }];

/** The admin's words for currencies: a symbol, the code, and the currency's English name where the browser knows it. */
const ADMIN = `${READ}
function symbolOf(cur) {
  try {
    var part = new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).filter(function (x) { return x.type === 'currency'; })[0];
    return part ? part.value : cur;
  } catch (e) { return cur; }
}
function currencyName(cur) { try { return new Intl.DisplayNames(['en'], { type: 'currency' }).of(cur) || cur; } catch (e) { return cur; } }
function day(iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
function stamp() { return String(Date.now()); }
`;

// ── /Admin/Tabs ───────────────────────────────────────────────────────────────────────────────────────────────────

const TABS_LIST: Array<[string, string, string]> = [
  ['sellers', 'Sellers', PAGES.sellers],
  ['orders', 'Orders', PAGES.orders],
  ['enquiries', 'Enquiries', PAGES.enquiries],
  ['pay', 'Ways to pay', PAGES.waysToPay],
  ['rates', 'Rates', PAGES.rates],
  ['shelves', 'Shelves', PAGES.shelves]
];

/**
 * The tab this page is: indigo words over a saffron line; the others muted. Six tabs are wider than a phone, so there
 * the bar scrolls sideways (`mk-tabs-many`).
 */
export const TABS_LOOK = `var on = String(Inputs.on || '');
Outputs.sellers = on === 'sellers' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.orders = on === 'orders' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.enquiries = on === 'enquiries' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.pay = on === 'pay' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.rates = on === 'rates' ? 'mk-tab mk-tab-on' : 'mk-tab';
Outputs.shelves = on === 'shelves' ? 'mk-tab mk-tab-on' : 'mk-tab';`;

/**
 * P121-TWO003-SCROLLINTOVIEW: once the bar is drawn, this page's tab is told to Scroll Into View (every visual node has
 * it, P109 ISL-009). Its Scroll Align is Nearest, so on a phone the bar scrolls until the tab is on screen and the page,
 * whose top the bar is on, does not move. This was DOM code reading the bar's `scrollLeft` until s15.
 */
export const TABS_SHOW = `var on = String(Inputs.on || '');
${TABS_LIST.map(([key]) => `if (on === '${key}') Outputs.${key}();`).join('\n')}`;

const TABS: PageComponent = {
  path: COMPONENTS.tabs,
  description: 'The admin’s tabs: Sellers, Orders, Enquiries, Ways to pay, Rates, Shelves',
  nodes: [
    group('tbRoot', 'The tabs', undefined, rowOf({ backgroundColor: 'var(--surface)', columnGap: 'var(--space-0)', cssClassName: 'mk-tabs mk-tabs-many' })),
    ...TABS_LIST.map(([key, words]) => ({ id: `tb_${key}`, type: BUTTON, label: words, parent: 'tbRoot', parameters: { label: words, backgroundColor: 'transparent', borderStyle: 'none', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', sizeMode: 'contentHeight', cssClassName: 'mk-tab' } })),
    { id: 'tbIn', type: 'Component Inputs', label: 'Which tab', ports: [{ name: 'on', type: 'string', plug: 'output' }] },
    fn('tbLook', 'Which tab is this page', TABS_LOOK, []),
    fn('tbShow', 'Bring this page’s tab into view', TABS_SHOW, TABS_LIST.map(([key]) => key), ['on']),
    ...TABS_LIST.map(([key, words, target]) => go(`tbTo_${key}`, `To ${words}`, target))
  ],
  connections: [
    wire('tbIn', 'on', 'tbLook', 'in-on'),
    wire('tbIn', 'on', 'tbShow', 'in-on'),
    wire('tbRoot', 'didMount', 'tbShow', 'run'),
    ...TABS_LIST.map(([key]) => wire('tbShow', `out-${key}`, `tb_${key}`, 'scrollIntoView')),
    ...TABS_LIST.flatMap(([key]) => [wire('tbLook', `out-${key}`, `tb_${key}`, 'cssClassName'), wire(`tb_${key}`, 'onClick', `tbTo_${key}`, 'navigate')])
  ]
};

// ── /Pages/Admin/WaysToPay ────────────────────────────────────────────────────────────────────────────────────────

/** The countries, and for each built way to pay: its words to buyers and the countries it is on in. */
export const WAYS_LOAD = `${ADMIN}
var BUILT = ${JSON.stringify(BUILT_WAYS)};
var WORDS = ${JSON.stringify(WAY_WORDS)};
void Inputs.changed;
try {
  await adminOnly();
  var countries = await all('Country');
  var ways = await all('WayToPay');
  var onIn = {};
  for (var i = 0; i < ways.length; i++) onIn[ways[i].method] = (await all('Country', { relatedTo: { id: ways[i].objectId, key: 'country', className: 'WayToPay' } })).map(function (c) { return c.objectId; });
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
countries.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
var byMethod = {};
ways.forEach(function (w) { byMethod[w.method] = w; });
Outputs.countries = countries.length ? countries.map(function (c) { return c.name + ' · ' + c.currency; }).join(',  ') : 'No countries yet. Add the first one: sellers, prices and ways to pay all belong to a country.';
Outputs.rows = Object.keys(BUILT).map(function (m) {
  var w = byMethod[m], on = onIn[m] || [];
  return {
    id: m,
    method: m,
    name: w ? w.name : BUILT[m],
    instructions: w ? w.instructions || '' : WORDS[m],
    onIds: on,
    where: on.length ? 'On in ' + countries.filter(function (c) { return on.indexOf(c.objectId) >= 0; }).map(function (c) { return c.name; }).join(', ') + '.' : 'Not on anywhere yet.',
    toggles: countries.map(function (c) { return { id: m + ':' + c.objectId, method: m, countryId: c.objectId, name: c.name, isOn: on.indexOf(c.objectId) >= 0, onIds: on, instructions: w ? w.instructions || '' : WORDS[m] }; })
  };
});
Outputs.hasCountries = countries.length > 0;
Outputs.refused = false;
Outputs.ok = true;`;

export const COUNTRY_GATHER = `Outputs.country = { name: String(Inputs.name || ''), currency: String(Inputs.currency || '') };
Outputs.go();`;

/** A country switched on or off for one way: the whole list goes, so nothing another toggle did is lost. */
export const WAY_TOGGLE = `var on = Array.isArray(Inputs.onIds) ? Inputs.onIds.slice() : [];
var id = String(Inputs.countryId || '');
if (!id || !Inputs.method) return;
on = on.filter(function (x) { return x !== id; });
if (Inputs.checked) on.push(id);
Outputs.way = { method: String(Inputs.method), countries: on };
Outputs.go();`;

export const WAY_WORDS_GATHER = `function v(typed, loaded) { return typed === undefined ? (loaded || '') : String(typed); }
Outputs.way = { method: String(Inputs.method || ''), countries: Array.isArray(Inputs.onIds) ? Inputs.onIds : [], instructions: v(Inputs.words, Inputs.words0) };
Outputs.go();`;

export const STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const WAY_TOGGLE_ROW: PageComponent = {
  path: '/Admin/WayToggle',
  description: 'One country, on or off, for one way to pay',
  nodes: [
    {
      id: 'wtBox',
      type: 'net.noodl.controls.checkbox',
      label: 'On in this country',
      parameters: { useLabel: true, width: px(22), height: px(22), borderWidth: px(2), borderColor: 'var(--secondary)', borderRadius: 'var(--radius-sm)', labelSpacing: px(8), labelfontSize: 'var(--text-sm)', labelcolor: 'var(--foreground)' }
    },
    {
      id: 'wtIn',
      type: 'Component Inputs',
      label: 'One country, for one way',
      ports: [
        { name: 'method', type: 'string', plug: 'output' },
        { name: 'countryId', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'isOn', type: 'boolean', plug: 'output' },
        { name: 'onIds', type: 'array', plug: 'output' }
      ]
    },
    fn('wtGather', 'This way, with this country on or off', WAY_TOGGLE, ['go'], ['method', 'countryId', 'onIds', 'checked']),
    call('wtCall', 'saveWayToPay(way)', FN_SAVE_WAY_TO_PAY),
    fn('wtStamp', 'Say the ways changed', STAMP, ['go']),
    setVar('wtChanged', 'The ways to pay changed', 'waysChanged')
  ],
  connections: [
    wire('wtIn', 'name', 'wtBox', 'label'),
    wire('wtIn', 'isOn', 'wtBox', 'checked'),
    wire('wtIn', 'method', 'wtGather', 'in-method'),
    wire('wtIn', 'countryId', 'wtGather', 'in-countryId'),
    wire('wtIn', 'onIds', 'wtGather', 'in-onIds'),
    wire('wtBox', 'checked', 'wtGather', 'in-checked'),
    wire('wtBox', 'onChange', 'wtGather', 'run'),
    wire('wtGather', 'out-way', 'wtCall', 'in-way'),
    wire('wtGather', 'out-go', 'wtCall', 'call'),
    wire('wtCall', 'done', 'wtStamp', 'run'),
    wire('wtCall', 'failure', 'wtStamp', 'run'),
    wire('wtStamp', 'out-at', 'wtChanged', 'value'),
    wire('wtStamp', 'out-go', 'wtChanged', 'do')
  ]
};

const WAY_CARD: PageComponent = {
  path: '/Admin/WayCard',
  description: 'One way to pay: the countries it is on in, and what it tells buyers at checkout',
  nodes: [
    group('wcRoot', 'A way to pay', undefined, CARD),
    text('wcName', 'Its name', 'wcRoot', '', T_NAME),
    text('wcWhere', 'Where it is on', 'wcRoot', '', T_META),
    group('wcToggles', 'One switch per country', 'wcRoot', rowOf({ flexWrap: 'wrap', columnGap: 'var(--space-4)', rowGap: 'var(--space-2)' })),
    { id: 'wcEach', type: 'For Each', label: 'One switch per country', parent: 'wcToggles', parameters: { template: WAY_TOGGLE_ROW.path } },
    input('wcWords', 'wcRoot', 'What it tells buyers at checkout', { type: 'textArea' }),
    button('wcSave', 'Save the words', 'wcRoot', 'Save the words', LINE),
    text('wcError', 'What went wrong', 'wcRoot', '', T_REFUSED),
    {
      id: 'wcIn',
      type: 'Component Inputs',
      label: 'One way',
      ports: [
        { name: 'method', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'where', type: 'string', plug: 'output' },
        { name: 'instructions', type: 'string', plug: 'output' },
        { name: 'onIds', type: 'array', plug: 'output' },
        { name: 'toggles', type: 'array', plug: 'output' }
      ]
    },
    fn('wcGather', 'This way, with its words', WAY_WORDS_GATHER, ['go'], ['method', 'onIds', 'words', 'words0']),
    call('wcCall', 'saveWayToPay(way)', FN_SAVE_WAY_TO_PAY),
    fn('wcStamp', 'Say the ways changed', STAMP, ['go']),
    setVar('wcChanged', 'The ways to pay changed', 'waysChanged')
  ],
  connections: [
    wire('wcIn', 'name', 'wcName', 'text'),
    wire('wcIn', 'where', 'wcWhere', 'text'),
    wire('wcIn', 'toggles', 'wcEach', 'items'),
    wire('wcIn', 'instructions', 'wcWords', 'startValue'),
    wire('wcIn', 'instructions', 'wcGather', 'in-words0'),
    wire('wcWords', 'onTextChanged', 'wcGather', 'in-words'),
    wire('wcIn', 'method', 'wcGather', 'in-method'),
    wire('wcIn', 'onIds', 'wcGather', 'in-onIds'),
    wire('wcSave', 'onClick', 'wcGather', 'run'),
    wire('wcGather', 'out-way', 'wcCall', 'in-way'),
    wire('wcGather', 'out-go', 'wcCall', 'call'),
    wire('wcCall', 'error', 'wcError', 'text'),
    wire('wcCall', 'done', 'wcStamp', 'run'),
    wire('wcStamp', 'out-at', 'wcChanged', 'value'),
    wire('wcStamp', 'out-go', 'wcChanged', 'do')
  ]
};

const WAYS_TO_PAY: PageComponent = {
  path: PAGES.waysToPay,
  description: 'The admin’s ways to pay: the countries, and each way turned on per country',
  nodes: [
    ...shell('wp', 'Ways to pay', 'admin/ways-to-pay', 'Admin', 960, tabsUnder('wp', 'pay')),
    group('wpContent', 'Ways to pay', 'wpBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('wpTitle', 'Heading', 'wpContent', 'Turn each way on for each country', T_TITLE),
    group('wpCountries', 'The countries', 'wpContent', CARD),
    text('wpCountriesHead', 'The countries', 'wpCountries', 'Countries', T_NAME),
    text('wpCountryList', 'Each country and its currency', 'wpCountries', '', T_META),
    group('wpAdd', 'Add a country', 'wpCountries', rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 'var(--space-2)' })),
    { ...input('wpName', 'wpAdd', 'Country'), parameters: { ...FIELD, label: 'Country', width: px(200) } },
    { ...input('wpCurrency', 'wpAdd', 'Currency code (GHS, NGN, KES)'), parameters: { ...FIELD, label: 'Currency code (GHS, NGN, KES)', width: px(200) } },
    button('wpAddGo', 'Add the country', 'wpAdd', 'Add the country', LINE),
    text('wpAddError', 'What went wrong', 'wpCountries', '', T_REFUSED),
    group('wpWays', 'The ways', 'wpContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    { id: 'wpEach', type: 'For Each', label: 'One card per way to pay', parent: 'wpWays', parameters: { template: WAY_CARD.path } },
    text('wpNote', 'What buyers see', 'wpContent', 'A buyer pays each seller country on its own, choosing among the ways on there. Where a way isn’t on, buyers there see the others.', T_META),
    text('wpPaystack', 'What card payments need', 'wpContent', 'Card or mobile money goes through Paystack, which splits each payment between the sellers in one country. Each country needs its own Paystack business, with its secret key saved on the backend under the country’s currency (PAYSTACK_SECRET_KEY_GHS for Ghana), and each seller there needs their payout account at Paystack (ACCT_…).', T_META),
    ...refusedBox('wp'),
    fn('wpLoad', 'The countries and the ways to pay', WAYS_LOAD, []),
    variable('wpChanged', 'The ways to pay changed', 'waysChanged'),
    fn('wpGather', 'The new country', COUNTRY_GATHER, ['go'], ['name', 'currency']),
    call('wpCall', 'saveCountry(country)', FN_SAVE_COUNTRY),
    fn('wpStamp', 'Say the ways changed', STAMP, ['go']),
    setVar('wpSetChanged', 'The countries changed', 'waysChanged')
  ],
  connections: [
    wire('wpRoot', 'didMount', 'wpLoad', 'run'),
    wire('wpChanged', 'value', 'wpLoad', 'in-changed'),
    wire('wpLoad', 'out-ok', 'wpContent', 'mounted'),
    wire('wpLoad', 'out-countries', 'wpCountryList', 'text'),
    wire('wpLoad', 'out-rows', 'wpEach', 'items'),
    wire('wpLoad', 'out-hasCountries', 'wpWays', 'mounted'),
    ...refusedWires('wp', 'wpLoad'),
    wire('wpName', 'onTextChanged', 'wpGather', 'in-name'),
    wire('wpCurrency', 'onTextChanged', 'wpGather', 'in-currency'),
    wire('wpAddGo', 'onClick', 'wpGather', 'run'),
    wire('wpGather', 'out-country', 'wpCall', 'in-country'),
    wire('wpGather', 'out-go', 'wpCall', 'call'),
    wire('wpCall', 'error', 'wpAddError', 'text'),
    wire('wpCall', 'done', 'wpStamp', 'run'),
    // P112-OWN021-ADDKEEPS: added, the fields empty, so the list is the only place the new country is.
    wire('wpCall', 'done', 'wpName', 'clear'),
    wire('wpCall', 'done', 'wpCurrency', 'clear'),
    wire('wpStamp', 'out-at', 'wpSetChanged', 'value'),
    wire('wpStamp', 'out-go', 'wpSetChanged', 'do')
  ]
};

// ── /Pages/Admin/Rates ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One row per currency the marketplace uses (each country's, and any with a rate), the marketplace's own first and
 * fixed at 1; when it has none yet, every row asks, and the note says to start with the own one at 1.
 */
export const RATES_LOAD = `${ADMIN}
void Inputs.changed;
try {
  await adminOnly();
  var rates = await all('Rate');
  var countries = await all('Country');
  var history = await Noodl.Records.query('RateHistory', {}, { plain: true, limit: 1000, sort: ['-at'] });
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var own = rates.filter(function (r) { return Number(r.value) === 1; })[0] || null;
var rate = {}, last = {};
rates.forEach(function (r) { rate[r.currency] = r; });
history.forEach(function (h) { var id = idOf(h.rate); if (!last[id]) last[id] = h; });
var codes = [];
countries.concat(rates).forEach(function (x) { if (x.currency && codes.indexOf(x.currency) < 0) codes.push(x.currency); });
codes.sort(function (a, b) { return (own && a === own.currency ? -1 : own && b === own.currency ? 1 : a.localeCompare(b)); });
Outputs.heading = own ? 'What one unit is worth in ' + currencyName(own.currency) : 'Set the rates';
Outputs.lead = own ? 'Set by hand: no live rates. Buyers see prices converted with these, as an approximation, and pay each seller in the seller’s own currency.' : 'Start with the marketplace’s own currency: type 1 beside it. It stays 1, and every other rate is what one unit is worth in it.';
Outputs.rows = codes.map(function (c) {
  var r = rate[c], isOwn = !!(own && own.currency === c), h = r ? last[r.objectId] : null;
  return {
    id: c,
    currency: c,
    label: symbolOf(c) + ' ' + c + ' · ' + currencyName(c),
    value: r ? String(r.value) : '',
    own: isOwn,
    notOwn: !isOwn,
    changed: isOwn ? 'The marketplace’s own: always 1' : h ? 'Changed ' + day(h.at && (h.at.iso || h.at)) : r ? '' : 'No rate yet: its prices show unconverted'
  };
});
Outputs.empty = codes.length === 0;
Outputs.refused = false;
Outputs.ok = true;`;

/** A rate typed in a row, kept with the others typed so far (by currency) until Save. */
export const RATE_TYPED = `var m = {};
try { m = JSON.parse(Inputs.typed || '{}') || {}; } catch (e) { m = {}; }
if (!Inputs.currency) return;
m[String(Inputs.currency)] = String(Inputs.value === undefined ? '' : Inputs.value);
Outputs.typed = JSON.stringify(m);
Outputs.go();`;

/** Every row with a rate (typed now, or as loaded) goes: `saveRates` checks them all before it writes any. */
export const RATES_GATHER = `var typed = {};
try { typed = JSON.parse(Inputs.typed || '{}') || {}; } catch (e) { typed = {}; }
var rows = Array.isArray(Inputs.rows) ? Inputs.rows : [];
var rates = [];
rows.forEach(function (r) {
  var v = r.own ? '1' : typed[r.currency] !== undefined ? typed[r.currency] : r.value;
  v = String(v || '').trim();
  if (v) rates.push({ currency: r.currency, value: Number(v.split(',').join('.')) });
});
Outputs.rates = { rates: rates };
Outputs.go();`;

const RATE_ROW: PageComponent = {
  path: '/Admin/RateRow',
  description: 'One currency’s rate: what one unit is worth in the marketplace’s own',
  nodes: [
    group('rrRoot', 'A rate', undefined, rowOf({ flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 'var(--space-1)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' })),
    group('rrWords', 'The currency, and when it changed', 'rrRoot', column({ width: px(260), rowGap: 'var(--space-0-5)' })),
    text('rrLabel', 'The currency', 'rrWords', '', T_NAME),
    text('rrChanged', 'When it changed', 'rrWords', '', T_META),
    { ...input('rrValue', 'rrRoot', 'Rate'), parameters: { ...FIELD, useLabel: false, placeholder: 'Rate', inputMode: 'decimal', width: px(140), mounted: false } },
    {
      id: 'rrIn',
      type: 'Component Inputs',
      label: 'One currency',
      ports: [
        { name: 'currency', type: 'string', plug: 'output' },
        { name: 'label', type: 'string', plug: 'output' },
        { name: 'value', type: 'string', plug: 'output' },
        { name: 'changed', type: 'string', plug: 'output' },
        { name: 'notOwn', type: 'boolean', plug: 'output' }
      ]
    },
    variable('rrTypedNow', 'The rates typed so far', 'ratesTyped'),
    fn('rrTyped', 'Keep what was typed', RATE_TYPED, ['go'], ['typed', 'currency']),
    setVar('rrSetTyped', 'The rates typed so far', 'ratesTyped')
  ],
  connections: [
    wire('rrIn', 'label', 'rrLabel', 'text'),
    wire('rrIn', 'changed', 'rrChanged', 'text'),
    wire('rrIn', 'value', 'rrValue', 'startValue'),
    wire('rrIn', 'notOwn', 'rrValue', 'mounted'),
    wire('rrIn', 'currency', 'rrTyped', 'in-currency'),
    wire('rrTypedNow', 'value', 'rrTyped', 'in-typed'),
    wire('rrValue', 'onTextChanged', 'rrTyped', 'in-value'),
    wire('rrValue', 'textChanged', 'rrTyped', 'run'),
    wire('rrTyped', 'out-typed', 'rrSetTyped', 'value'),
    wire('rrTyped', 'out-go', 'rrSetTyped', 'do')
  ]
};

const RATES: PageComponent = {
  path: PAGES.rates,
  description: 'The admin’s rates: what one unit of each currency is worth in the marketplace’s own',
  nodes: [
    ...shell('rt', 'Rates', 'admin/rates', 'Admin', 960, tabsUnder('rt', 'rates')),
    group('rtContent', 'Rates', 'rtBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('rtTitle', 'Heading', 'rtContent', '', T_TITLE),
    text('rtLead', 'How rates are used', 'rtContent', '', T_META),
    group('rtList', 'One row per currency', 'rtContent', CARD),
    { id: 'rtEach', type: 'For Each', label: 'One row per currency', parent: 'rtList', parameters: { template: RATE_ROW.path } },
    text('rtEmpty', 'No currencies yet', 'rtContent', 'No currencies yet: add a country on Ways to pay first. Its currency appears here.', { ...T_META, mounted: false }),
    button('rtSave', 'Save rates', 'rtContent', 'Save rates', MAIN),
    text('rtSaved', 'Saved', 'rtContent', 'Saved.', { ...T_META, mounted: false }),
    text('rtError', 'What went wrong', 'rtContent', '', T_REFUSED),
    ...refusedBox('rt'),
    fn('rtLoad', 'Every currency, its rate, and when it changed', RATES_LOAD, []),
    variable('rtChanged', 'The rates were saved', 'ratesChanged'),
    variable('rtTyped', 'The rates typed so far', 'ratesTyped'),
    setVar('rtForget', 'Nothing typed yet', 'ratesTyped', { value: '{}' }),
    fn('rtGather', 'Every rate, as one save', RATES_GATHER, ['go'], ['typed', 'rows']),
    call('rtCall', 'saveRates(rates)', FN_SAVE_RATES),
    fn('rtStamp', 'Say the rates were saved', STAMP, ['go']),
    setVar('rtSetChanged', 'The rates were saved', 'ratesChanged'),
    { id: 'rtShowSaved', type: 'Switch', label: 'Saved, just now' }
  ],
  connections: [
    wire('rtRoot', 'didMount', 'rtForget', 'do'),
    wire('rtRoot', 'didMount', 'rtLoad', 'run'),
    wire('rtChanged', 'value', 'rtLoad', 'in-changed'),
    wire('rtLoad', 'out-ok', 'rtContent', 'mounted'),
    wire('rtLoad', 'out-heading', 'rtTitle', 'text'),
    wire('rtLoad', 'out-lead', 'rtLead', 'text'),
    wire('rtLoad', 'out-rows', 'rtEach', 'items'),
    wire('rtLoad', 'out-rows', 'rtGather', 'in-rows'),
    wire('rtLoad', 'out-empty', 'rtEmpty', 'mounted'),
    ...refusedWires('rt', 'rtLoad'),
    wire('rtTyped', 'value', 'rtGather', 'in-typed'),
    wire('rtSave', 'onClick', 'rtGather', 'run'),
    wire('rtSave', 'onClick', 'rtShowSaved', 'off'),
    wire('rtGather', 'out-rates', 'rtCall', 'in-rates'),
    wire('rtGather', 'out-go', 'rtCall', 'call'),
    wire('rtCall', 'error', 'rtError', 'text'),
    wire('rtCall', 'done', 'rtShowSaved', 'on'),
    wire('rtShowSaved', 'state', 'rtSaved', 'mounted'),
    wire('rtCall', 'done', 'rtStamp', 'run'),
    wire('rtStamp', 'out-at', 'rtSetChanged', 'value'),
    wire('rtStamp', 'out-go', 'rtSetChanged', 'do')
  ]
};

// ── /Pages/Admin/Shelves ──────────────────────────────────────────────────────────────────────────────────────────

/** Every shelf, with how many products are on it. Nothing is deleted: a shelf is renamed, never taken away. */
export const SHELVES_LOAD = `${ADMIN}
void Inputs.changed;
try {
  await adminOnly();
  var shelves = await all('Category');
  var products = await all('Product');
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
shelves.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
Outputs.rows = shelves.map(function (c) {
  var n = products.filter(function (p) { return idOf(p.category) === c.objectId; }).length;
  return { id: c.objectId, name: c.name || '', count: n === 1 ? '1 product' : n + ' products' };
});
Outputs.empty = shelves.length === 0;
Outputs.refused = false;
Outputs.ok = true;`;

export const SHELF_GATHER = `function v(typed, loaded) { return typed === undefined ? (loaded || '') : String(typed); }
var shelf = { name: v(Inputs.name, Inputs.name0) };
if (Inputs.id) shelf.id = String(Inputs.id);
Outputs.shelf = shelf;
Outputs.go();`;

const SHELF_ROW: PageComponent = {
  path: '/Admin/ShelfRow',
  description: 'One shelf: its name, to change, and how many products are on it',
  nodes: [
    group('shRoot', 'A shelf', undefined, rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 'var(--space-1)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' })),
    { ...input('shName', 'shRoot', 'Shelf'), parameters: { ...FIELD, label: 'Shelf', width: px(240) } },
    text('shCount', 'How many products', 'shRoot', '', { ...T_META, sizeMode: 'contentSize' }),
    button('shSave', 'Rename', 'shRoot', 'Rename', LINE),
    text('shError', 'What went wrong', 'shRoot', '', T_REFUSED),
    { id: 'shIn', type: 'Component Inputs', label: 'One shelf', ports: [{ name: 'id', type: 'string', plug: 'output' }, { name: 'name', type: 'string', plug: 'output' }, { name: 'count', type: 'string', plug: 'output' }] },
    fn('shGather', 'This shelf, renamed', SHELF_GATHER, ['go'], ['id', 'name', 'name0']),
    call('shCall', 'saveShelf(shelf)', FN_SAVE_SHELF),
    fn('shStamp', 'Say the shelves changed', STAMP, ['go']),
    setVar('shChanged', 'The shelves changed', 'shelvesChanged')
  ],
  connections: [
    wire('shIn', 'name', 'shName', 'startValue'),
    wire('shIn', 'name', 'shGather', 'in-name0'),
    wire('shIn', 'id', 'shGather', 'in-id'),
    wire('shIn', 'count', 'shCount', 'text'),
    wire('shName', 'onTextChanged', 'shGather', 'in-name'),
    wire('shSave', 'onClick', 'shGather', 'run'),
    wire('shGather', 'out-shelf', 'shCall', 'in-shelf'),
    wire('shGather', 'out-go', 'shCall', 'call'),
    wire('shCall', 'error', 'shError', 'text'),
    wire('shCall', 'done', 'shStamp', 'run'),
    wire('shStamp', 'out-at', 'shChanged', 'value'),
    wire('shStamp', 'out-go', 'shChanged', 'do')
  ]
};

const SHELVES: PageComponent = {
  path: PAGES.shelves,
  description: 'The admin’s shelves: add one, rename one',
  nodes: [
    ...shell('sv', 'Shelves', 'admin/shelves', 'Admin', 960, tabsUnder('sv', 'shelves')),
    group('svContent', 'Shelves', 'svBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('svTitle', 'Heading', 'svContent', 'Shelves', T_TITLE),
    group('svAdd', 'Add a shelf', 'svContent', rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 'var(--space-2)' })),
    { ...input('svName', 'svAdd', 'A new shelf'), parameters: { ...FIELD, label: 'A new shelf', width: px(240) } },
    button('svAddGo', 'Add the shelf', 'svAdd', 'Add the shelf', MAIN),
    text('svError', 'What went wrong', 'svContent', '', T_REFUSED),
    group('svList', 'The shelves', 'svContent', CARD),
    { id: 'svEach', type: 'For Each', label: 'One row per shelf', parent: 'svList', parameters: { template: SHELF_ROW.path } },
    text('svEmpty', 'No shelves yet', 'svContent', 'No shelves yet. A product goes on one, so add the first before sellers add products.', { ...T_META, mounted: false }),
    text('svNote', 'Nothing is deleted', 'svContent', 'A shelf is renamed, never taken away: products and old orders stay on it.', T_META),
    ...refusedBox('sv'),
    fn('svLoad', 'Every shelf, and how many products are on it', SHELVES_LOAD, []),
    variable('svChanged', 'The shelves changed', 'shelvesChanged'),
    fn('svGather', 'The new shelf', SHELF_GATHER, ['go'], ['name']),
    call('svCall', 'saveShelf(shelf)', FN_SAVE_SHELF),
    fn('svStamp', 'Say the shelves changed', STAMP, ['go']),
    setVar('svSetChanged', 'The shelves changed', 'shelvesChanged')
  ],
  connections: [
    wire('svRoot', 'didMount', 'svLoad', 'run'),
    wire('svChanged', 'value', 'svLoad', 'in-changed'),
    wire('svLoad', 'out-ok', 'svContent', 'mounted'),
    wire('svLoad', 'out-rows', 'svEach', 'items'),
    wire('svLoad', 'out-empty', 'svEmpty', 'mounted'),
    ...refusedWires('sv', 'svLoad'),
    wire('svName', 'onTextChanged', 'svGather', 'in-name'),
    wire('svAddGo', 'onClick', 'svGather', 'run'),
    wire('svGather', 'out-shelf', 'svCall', 'in-shelf'),
    wire('svGather', 'out-go', 'svCall', 'call'),
    wire('svCall', 'error', 'svError', 'text'),
    wire('svCall', 'done', 'svStamp', 'run'),
    // P112-OWN021-ADDKEEPS: added, the field empties.
    wire('svCall', 'done', 'svName', 'clear'),
    wire('svStamp', 'out-at', 'svSetChanged', 'value'),
    wire('svStamp', 'out-go', 'svSetChanged', 'do')
  ]
};

export const SLICE3_ADMIN_LEAVES: PageComponent[] = [TABS, WAY_TOGGLE_ROW, WAY_CARD, RATE_ROW, SHELF_ROW];
export const SLICE3_ADMIN_PAGES: PageComponent[] = [WAYS_TO_PAY, RATES, SHELVES];

/** Every script the admin's slice 3 pages ship, by name, for the spec that compiles and runs them. */
export const SLICE3_ADMIN_SCRIPTS: Record<string, string> = {
  TABS_LOOK,
  TABS_SHOW,
  WAYS_LOAD,
  COUNTRY_GATHER,
  WAY_TOGGLE,
  WAY_WORDS_GATHER,
  RATES_LOAD,
  RATE_TYPED,
  RATES_GATHER,
  SHELVES_LOAD,
  SHELF_GATHER
};
