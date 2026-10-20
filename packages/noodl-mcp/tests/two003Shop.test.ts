/**
 * TWO-003 slice 2 — the catalogue's scripts, run on fixtures: what a buyer is shown, what is never shown, and how a
 * price is converted. The drive (`nodegx-backend/tests/two-003-shop-drive.test.ts`) proves the same in the rendered
 * app; this proves each rule fast enough to mutate.
 *
 * 1. **Every page script the template ships compiles** (slices 1 and 2). The door writes an inline script without
 *    compiling it (P121-TWO003-SCRIPTCOMPILE), and a backslash in a template literal is eaten before the script exists.
 * 2. **The rules**, each against the shipped script text.
 * 3. **Mutants**: each loosens one rule in the script text; the rule's check must go red. They live here, so the
 *    reading can be repeated (s3's generator was in a scratchpad and is gone).
 */
import * as Pages from './two003Pages';
import { compiles, run as runScript } from './two003Run';
import { CURRENCY_KEY, SLICE2_SCRIPTS } from './two003Shop';

type Row = Record<string, unknown>;

/** slice 2's way of calling the shared runner (`two003Run.ts`): a script, its inputs, the tables, the phone's storage. */
async function run(script: string, inputs: Row, tables: Record<string, Row[]> = {}, stored: Record<string, string> = {}) {
  return runScript(script, inputs, { tables: { ...tables, __relations: RELATIONS as unknown as Row[] }, stored });
}

// ── the fixture: three countries, four sellers (one stopped), six products ───────────────────────────────────────

const ENDED = '2026-10-01T09:00:00.000Z';
const P = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const photo = (n: string) => ({ name: n, url: `https://b.example/files/${n}` });
const DATA = {
  countries: [
    { objectId: 'gh', name: 'Ghana', currency: 'GHS' },
    { objectId: 'ng', name: 'Nigeria', currency: 'NGN' },
    { objectId: 'ke', name: 'Kenya', currency: 'KES' }
  ],
  rates: [
    { currency: 'GHS', value: 1 },
    { currency: 'NGN', value: 0.0091 },
    { currency: 'KES', value: 0.11 }
  ],
  shelves: [
    { objectId: 'food', name: 'Food and drinks' },
    { objectId: 'cars', name: 'Cars' },
    { objectId: 'phones', name: 'Phones and laptops' }
  ],
  sellers: [
    { objectId: 'kofi', name: 'Kofi’s Kitchen', country: P('Country', 'gh'), whatsapp: '+233 24 555 0100', story: 'Since 1998.', logo: photo('logo.png') },
    { objectId: 'ada', name: 'Ada’s Farm Drinks', country: P('Country', 'ng'), phone: '+234 80 555 0101' },
    { objectId: 'beans', name: 'Nairobi Beans', country: P('Country', 'ke') },
    { objectId: 'shut', name: 'Shut Shop Ltd', country: P('Country', 'ng'), endedAt: ENDED }
  ],
  products: [
    { objectId: 'gari', name: 'Gari, 2 kg', price: 38, mode: 'buy', seller: P('Seller', 'kofi'), category: P('Category', 'food'), endedAt: ENDED, createdAt: '2026-10-14T10:00:00Z', photos: [photo('g.jpg')] },
    { objectId: 'ghost', name: 'Ghost pepper oil', price: 9000, mode: 'buy', seller: P('Seller', 'shut'), category: P('Category', 'phones'), createdAt: '2026-10-14T10:01:00Z', photos: [] },
    { objectId: 'corolla', name: 'Toyota Corolla 2015', price: 98000, mode: 'enquire', seller: P('Seller', 'kofi'), category: P('Category', 'cars'), createdAt: '2026-10-14T10:02:00Z', photos: [photo('c1.jpg'), photo('c2.jpg')] },
    { objectId: 'coffee', name: 'AA coffee beans, 1 kg', price: 1900, mode: 'buy', seller: P('Seller', 'beans'), category: P('Category', 'food'), createdAt: '2026-10-14T10:03:00Z', photos: [photo('k.jpg')] },
    { objectId: 'zobo', name: 'Zobo drink, 6 bottles', price: 6800, mode: 'buy', seller: P('Seller', 'ada'), category: P('Category', 'food'), createdAt: '2026-10-14T10:04:00Z', photos: [] },
    { objectId: 'shito', name: 'Shito pepper sauce, 500 g', price: 45, mode: 'buy', seller: P('Seller', 'kofi'), category: P('Category', 'food'), description: 'Hot.', createdAt: '2026-10-14T10:05:00Z', photos: [photo('s1.jpg'), photo('s2.jpg')] }
  ]
};
/** The ways to pay: WhatsApp on in Ghana only, pay on delivery in Ghana and Nigeria. */
const WAYS = [
  { objectId: 'wa', name: 'Order on WhatsApp', method: 'whatsapp' },
  { objectId: 'cod', name: 'Pay on delivery', method: 'on-delivery' }
];
let RELATIONS: Record<string, string[]> = { 'WayToPay:wa:country': ['gh'], 'WayToPay:cod:country': ['gh', 'ng'] };
const TABLES = { Country: DATA.countries, Rate: DATA.rates, Category: DATA.shelves, Seller: DATA.sellers, Product: DATA.products, WayToPay: WAYS };
const ON_SALE = ['Shito pepper sauce, 500 g', 'Zobo drink, 6 bottles', 'AA coffee beans, 1 kg', 'Toyota Corolla 2015'];
const names = (rows: Array<{ name: string }>) => rows.map((r) => r.name);
/** A price with its spacing taken out: the locale decides whether a narrow space sits between symbol and number. */
const strip = (s: string) => s.replace(/\s/g, '').replace(/^(Ksh|KES)/, 'KSh');

// ── the checks, each a function of the script text so a mutant can be run through it ────────────────────────────

const CHECKS: Record<string, (s: Record<string, string>) => Promise<void>> = {
  async 'home: only what is on sale, newest first; never an off-sale product or a stopped seller’s'(s) {
    const { out } = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS' });
    expect(names(out.cards)).toEqual(ON_SALE);
    expect(names(out.sellers)).toEqual(['Ada’s Farm Drinks', 'Kofi’s Kitchen', 'Nairobi Beans']);
    expect(out.sellersSub).toBe('in 3 countries');
  },
  async 'home: shelves offered are All and those with something on sale; a shelf picked filters'(s) {
    const all = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS' });
    expect(names(all.out.shelves)).toEqual(['All', 'Cars', 'Food and drinks']);
    expect(all.out.shelves[0].bg).toBe('var(--secondary)');
    const cars = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS', shelf: 'cars' });
    expect(names(cars.out.cards)).toEqual(['Toyota Corolla 2015']);
    expect([cars.out.shelves[0].bg, cars.out.shelves[1].bg, cars.out.heading]).toEqual(['var(--surface)', 'var(--secondary)', 'Cars']);
    // A shelf with nothing on sale (only the stopped seller's product is on it) falls back to All.
    const phones = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS', shelf: 'phones' });
    expect(names(phones.out.cards)).toEqual(ON_SALE);
  },
  async 'home: a search needs every word, in the name, description, seller, shelf or country'(s) {
    const found = async (search: string) => names((await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS', search })).out.cards);
    expect(await found('kenya coffee')).toEqual(['AA coffee beans, 1 kg']);
    expect(await found('kofi zobo')).toEqual([]); // each word matches something, but no one product has both
    expect(await found('KOFI')).toEqual(['Shito pepper sauce, 500 g', 'Toyota Corolla 2015']);
    expect(await found('hot')).toEqual(['Shito pepper sauce, 500 g']);
    expect(await found('cars')).toEqual(['Toyota Corolla 2015']);
    expect(await found('ghost')).toEqual([]);
    expect(await found('gari')).toEqual([]);
    const none = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS', search: ' ghost ', shelf: 'food' });
    expect([none.out.empty, none.out.emptyWords]).toEqual([true, 'Nothing matches “ghost” on Food and drinks. Try fewer words, or All.']);
    const one = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS', search: 'zobo' });
    expect([one.out.heading, strip(one.out.sub)]).toEqual(['Found for “zobo”', '1product·pricesinGH₵']);
  },
  async 'a price converts through the rates, with the seller’s own beside it; no rate, no conversion'(s) {
    const gh = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS' });
    const zobo = gh.out.cards.find((c: Row) => c.name === 'Zobo drink, 6 bottles');
    expect([strip(zobo.price), strip(zobo.was), zobo.hasWas]).toEqual(['GH₵62', '₦6,800', true]);
    const shito = gh.out.cards.find((c: Row) => c.name === 'Shito pepper sauce, 500 g');
    expect([strip(shito.price), shito.was, shito.hasWas]).toEqual(['GH₵45', '', false]);
    const ng = await run(s.HOME_SHAPE, { data: DATA, currency: 'NGN' });
    expect(strip(ng.out.cards.find((c: Row) => c.name === 'Shito pepper sauce, 500 g').price)).toBe('₦4,945');
    const noRates = await run(s.HOME_SHAPE, { data: { ...DATA, rates: [] }, currency: 'GHS' });
    expect(noRates.out.cards.map((c: Row) => strip(String(c.price)))).toEqual(['GH₵45', '₦6,800', 'KSh1,900', 'GH₵98,000']);
    expect(noRates.out.cards.every((c: Row) => !c.hasWas)).toBe(true);
    expect(noRates.out.sub).toBe('prices in each seller’s currency');
  },
  async 'a card uses the md thumbnail, says when there is no photo, and marks an enquire product'(s) {
    const { out } = await run(s.HOME_SHAPE, { data: DATA, currency: 'GHS' });
    const by = (n: string) => out.cards.find((c: Row) => c.name === n);
    expect(by('Shito pepper sauce, 500 g').photo).toBe('https://b.example/files/s1.jpg?thumb=md');
    expect([by('Zobo drink, 6 bottles').hasPhoto, by('Zobo drink, 6 bottles').noPhoto]).toEqual([false, true]);
    expect([by('Toyota Corolla 2015').enquire, by('Shito pepper sauce, 500 g').enquire]).toEqual([true, false]);
    expect(by('AA coffee beans, 1 kg').who).toBe('Nairobi Beans · Kenya');
  },
  async 'a product: off sale, or its seller stopped, says so and shows nothing else'(s) {
    for (const [id, says] of [
      ['gari', 'This product isn’t on sale now.'],
      ['ghost', 'This product isn’t on sale now.'],
      ['nope', 'There is no such product here.']
    ]) {
      const { out } = await run(s.PRODUCT_PAGE_LOAD, { productId: id, currency: 'GHS' }, TABLES);
      expect([id, out.gone, out.ok, out.problem, out.name]).toEqual([id, true, false, says, undefined]);
    }
  },
  async 'a product to buy: photos lg, WhatsApp with the number and the product named, who confirms delivery'(s) {
    const { out } = await run(s.PRODUCT_PAGE_LOAD, { productId: 'shito', currency: 'NGN' }, TABLES);
    expect(out.photos.map((p: Row) => p.src)).toEqual(['https://b.example/files/s1.jpg?thumb=lg', 'https://b.example/files/s2.jpg?thumb=lg']);
    expect(out.photos[1].alt).toBe('Shito pepper sauce, 500 g, photo 2 of 2');
    expect([out.swipe, out.hasSwipe]).toEqual(['2 photos: swipe to see them all', true]);
    expect([strip(out.price), strip(out.was), out.buy, out.enquire]).toEqual(['₦4,945', 'GH₵45', true, false]);
    expect(out.whatsappLabel).toBe('Order on WhatsApp instead');
    expect([out.hasWhatsapp, out.productId, out.unitCurrency, Math.round(out.unit)]).toEqual([true, 'shito', 'NGN', 4945]);
    expect(out.whatsappLink.startsWith('https://wa.me/233245550100?text=')).toBe(true);
    expect(decodeURIComponent(out.whatsappLink.split('text=')[1])).toBe(`Hello, I would like to order this: Shito pepper sauce, 500 g (${out.was}). https://shop.example/item/x`);
    expect([out.hasCall, out.delivery, out.sellerPlace]).toEqual([false, 'Kofi’s Kitchen confirms the delivery and what it costs before you pay.', 'Ghana · Food and drinks']);
  },
  async '🔴 AC4: no WhatsApp order where the seller’s country has it off; an enquiry is a message, so it stays'(s) {
    const was = RELATIONS;
    RELATIONS = { 'WayToPay:cod:country': ['gh', 'ng'] };
    try {
      const shito = await run(s.PRODUCT_PAGE_LOAD, { productId: 'shito', currency: 'GHS' }, TABLES);
      expect([shito.out.buy, shito.out.hasWhatsapp, shito.out.hasCall]).toEqual([true, false, false]);
      const car = await run(s.PRODUCT_PAGE_LOAD, { productId: 'corolla', currency: 'GHS' }, TABLES);
      expect([car.out.enquire, car.out.hasWhatsapp]).toEqual([true, true]);
    } finally {
      RELATIONS = was;
    }
  },
  async 'a product to enquire about, and a seller with no WhatsApp'(s) {
    const car = await run(s.PRODUCT_PAGE_LOAD, { productId: 'corolla', currency: 'GHS' }, TABLES);
    expect([car.out.enquire, car.out.buy, car.out.whatsappLabel, car.out.askLabel]).toEqual([true, false, 'Message Kofi’s Kitchen on WhatsApp', 'Send to Kofi’s Kitchen']);
    expect(decodeURIComponent(car.out.whatsappLink).includes('is this still for sale? Toyota Corolla 2015')).toBe(true);
    const zobo = await run(s.PRODUCT_PAGE_LOAD, { productId: 'zobo', currency: 'GHS' }, TABLES);
    expect([zobo.out.hasWhatsapp, zobo.out.whatsappLink, zobo.out.hasCall, zobo.out.call]).toEqual([false, '', true, 'Call Ada’s Farm Drinks: +234 80 555 0101']);
    const beans = await run(s.PRODUCT_PAGE_LOAD, { productId: 'coffee', currency: 'GHS' }, { ...TABLES, Seller: DATA.sellers.map((x) => (x.objectId === 'beans' ? { ...x, whatsapp: '' } : x)) });
    expect(beans.out.call).toBe('Nairobi Beans hasn’t left a number here yet.');
  },
  async 'a seller’s page: a stopped seller is not here; a selling one shows only what is on sale'(s) {
    const shut = await run(s.SELLER_PAGE_LOAD, { sellerId: 'shut', currency: 'GHS' }, TABLES);
    expect([shut.out.gone, shut.out.problem, shut.out.cards]).toEqual([true, 'Shut Shop Ltd isn’t selling here now.', undefined]);
    const kofi = await run(s.SELLER_PAGE_LOAD, { sellerId: 'kofi', currency: 'GHS' }, TABLES);
    expect(names(kofi.out.cards)).toEqual(['Shito pepper sauce, 500 g', 'Toyota Corolla 2015']);
    expect([kofi.out.place, kofi.out.logo, kofi.out.hasStory]).toEqual(['Ghana · 2 products on sale', 'https://b.example/files/logo.png?thumb=md', true]);
  },
  async 'the currency: kept if valid, else the phone’s, else the one worth 1; one currency, no picker'(s) {
    const kept = await run(s.TOP_LOAD, { current: 'KES' }, TABLES);
    expect([kept.fired, kept.out.has, kept.out.items.map((i: Row) => i.Value)]).toEqual([[], true, ['GHS', 'KES', 'NGN']]);
    const phone = await run(s.TOP_LOAD, {}, TABLES, { [CURRENCY_KEY]: 'NGN' });
    expect([phone.out.chosen, phone.fired]).toEqual(['NGN', ['set']]);
    const own = await run(s.TOP_LOAD, {}, { Rate: [{ currency: 'NGN', value: 110 }, { currency: 'GHS', value: 1 }] }, { [CURRENCY_KEY]: 'XOF' });
    expect(own.out.chosen).toBe('GHS');
    const one = await run(s.TOP_LOAD, {}, { Rate: [{ currency: 'GHS', value: 1 }] });
    expect([one.out.has, one.out.chosen]).toEqual([false, 'GHS']);
  }
};

const SHIPPED: Record<string, string> = { ...SLICE2_SCRIPTS };

describe('TWO-003 slice 2 — the catalogue’s scripts', () => {
  it('every page script the template ships compiles (slices 1 and 2)', () => {
    const slice1 = Object.entries(Pages).filter(([, v]) => typeof v === 'string' && /Outputs\./.test(v as string)) as Array<[string, string]>;
    expect(slice1.length).toBeGreaterThan(10);
    const broken = [...slice1, ...Object.entries(SLICE2_SCRIPTS)].filter(([, code]) => !compiles(code));
    expect(broken.map(([name]) => name)).toEqual([]);
  });

  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  /** Each loosens one rule; the named check must go red. */
  const MUTANTS: Array<[string, string, string, string, string]> = [
    ['an off-sale product listed', 'HOME_SHAPE', 'return !p.endedAt && seller[idOf(p.seller)];', 'return seller[idOf(p.seller)];', 'home: only what is on sale, newest first; never an off-sale product or a stopped seller’s'],
    ['a stopped seller’s product listed', 'HOME_SHAPE', "d.sellers.forEach(function (s) { if (!s.endedAt) seller[s.objectId] = s; });", "d.sellers.forEach(function (s) { seller[s.objectId] = s; });", 'home: only what is on sale, newest first; never an off-sale product or a stopped seller’s'],
    ['a stopped seller in the row', 'HOME_SHAPE', 'var sellers = d.sellers.filter(function (s) { return !s.endedAt; })', 'var sellers = d.sellers.filter(function (s) { return true; })', 'home: only what is on sale, newest first; never an off-sale product or a stopped seller’s'],
    ['oldest first', 'HOME_SHAPE', '.sort(newest);', '.sort(newest).reverse();', 'home: only what is on sale, newest first; never an off-sale product or a stopped seller’s'],
    ['every shelf offered', 'HOME_SHAPE', 'd.shelves.filter(function (c) { return onShelf[c.objectId]; })', 'd.shelves.filter(function (c) { return true; })', 'home: shelves offered are All and those with something on sale; a shelf picked filters'],
    ['the shelf ignored', 'HOME_SHAPE', '(!shelf || idOf(p.category) === shelf)', '(true)', 'home: shelves offered are All and those with something on sale; a shelf picked filters'],
    ['any word is enough', 'HOME_SHAPE', 'words.every(', 'words.length === 0 || words.some(', 'home: a search needs every word, in the name, description, seller, shelf or country'],
    ['search by name only', 'HOME_SHAPE', 'return [p.name, p.description, s.name, shelfName[idOf(p.category)], c && c.name]', 'return [p.name]', 'home: a search needs every word, in the name, description, seller, shelf or country'],
    ['the rate turned upside down', 'HOME_SHAPE', 'Number(price) * a / b', 'Number(price) * b / a', 'a price converts through the rates, with the seller’s own beside it; no rate, no conversion'],
    ['a conversion with no rate', 'HOME_SHAPE', 'if (!to || to === from || !a || !b)', 'if (!to || to === from)', 'a price converts through the rates, with the seller’s own beside it; no rate, no conversion'],
    ['the original photo on a card', 'HOME_SHAPE', "photo: thumb(first, 'md')", 'photo: first ? first.url : \'\'', 'a card uses the md thumbnail, says when there is no photo, and marks an enquire product'],
    ['an off-sale product opens', 'PRODUCT_PAGE_LOAD', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || s.endedAt)', 'a product: off sale, or its seller stopped, says so and shows nothing else'],
    ['a stopped seller’s product opens', 'PRODUCT_PAGE_LOAD', 'if (!p || !s || p.endedAt || s.endedAt)', 'if (!p || !s || p.endedAt)', 'a product: off sale, or its seller stopped, says so and shows nothing else'],
    ['the product page shows md', 'PRODUCT_PAGE_LOAD', "src: thumb(f, 'lg')", "src: thumb(f, 'md')", 'a product to buy: photos lg, WhatsApp with the number and the product named, who confirms delivery'],
    ['the number kept with its spaces', 'PRODUCT_PAGE_LOAD', ".replace(/[^0-9]/g, '')", '', 'a product to buy: photos lg, WhatsApp with the number and the product named, who confirms delivery'],
    ['WhatsApp offered where the country has it off', 'PRODUCT_PAGE_LOAD', '!!wa && (enquire || waOn)', '!!wa', '🔴 AC4: no WhatsApp order where the seller’s country has it off; an enquiry is a message, so it stays'],
    ['an enquiry worded as an order', 'PRODUCT_PAGE_LOAD', "(enquire ? 'Hello, is this still for sale? ' : 'Hello, I would like to order this: ')", "'Hello, I would like to order this: '", 'a product to enquire about, and a seller with no WhatsApp'],
    ['a stopped seller’s page opens', 'SELLER_PAGE_LOAD', 'if (!s || s.endedAt)', 'if (!s)', 'a seller’s page: a stopped seller is not here; a selling one shows only what is on sale'],
    ['an off-sale product on a seller’s page', 'SELLER_PAGE_LOAD', 'got[1].filter(function (p) { return !p.endedAt; })', 'got[1].filter(function (p) { return true; })', 'a seller’s page: a stopped seller is not here; a selling one shows only what is on sale'],
    ['the phone’s currency forgotten', 'TOP_LOAD', "want = localStorage.getItem('mk-currency');", "want = '';", 'the currency: kept if valid, else the phone’s, else the one worth 1; one currency, no picker'],
    ['a picker for one currency', 'TOP_LOAD', 'Outputs.has = usable.length > 1;', 'Outputs.has = usable.length > 0;', 'the currency: kept if valid, else the phone’s, else the one worth 1; one currency, no picker']
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect(SHIPPED[script].includes(from)).toBe(true);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});
