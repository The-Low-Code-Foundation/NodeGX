/**
 * TWO-003 slice 5 — the enquiry scripts, run on fixtures. `sendEnquiry` and `answerEnquiry` themselves are proved on a
 * real backend by `nodegx-backend/tests/two-003-enquire.test.ts`, and the pages in the rendered app by
 * `two-003-enquire-drive.test.ts`. This proves each page rule fast enough to mutate.
 *
 * 1. Every script slice 5 ships compiles (its pages' and its functions'): the door writes them uncompiled.
 * 2. The rules, against the shipped script text.
 * 3. Mutants, each loosening one rule; its check must go red.
 */
import { SLICE5_CLOUD_SCRIPTS, SLICE5_SCRIPTS } from './two003Enquire';
import { compiles, Row, run } from './two003Run';

const P = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const D = (iso: string) => ({ __type: 'Date', iso });

const SELLERS = [
  { objectId: 'motors', name: 'Ring Road Motors' },
  { objectId: 'kofi', name: 'Kofi’s Kitchen' }
];
const PRODUCTS = [
  { objectId: 'corolla', name: 'Toyota Corolla 2015', mode: 'enquire', seller: P('Seller', 'motors') },
  { objectId: 'hilux', name: 'Toyota Hilux 2012', mode: 'enquire', seller: P('Seller', 'motors'), endedAt: D('2026-10-14T12:00:00Z') },
  { objectId: 'van', name: 'Delivery van', mode: 'enquire', seller: P('Seller', 'kofi') }
];
// Midday times, so the day reads the same in any time zone the spec runs in.
const ENQUIRIES = [
  { objectId: 'q1', product: P('Product', 'corolla'), buyerName: 'Efua Asante', contact: '0044 20 7946 0000', message: 'Does it have air conditioning?', createdAt: '2026-10-14T11:00:00Z' },
  { objectId: 'q2', product: P('Product', 'corolla'), buyerName: 'Kwame Mensah', contact: '+233 24 555 0187', message: 'Is it still for sale? Can I see it on Saturday?', createdAt: '2026-10-15T12:00:00Z' },
  { objectId: 'q3', product: P('Product', 'hilux'), buyerName: 'Yaw Boateng', contact: '+233 20 555 0111', message: 'What is the mileage?', createdAt: '2026-10-13T12:00:00Z', answeredAt: D('2026-10-14T12:00:00Z') },
  { objectId: 'q4', product: P('Product', 'van'), buyerName: 'Ama Owusu', contact: '+233 26 555 0123', message: 'Can it carry 500 kg?', createdAt: '2026-10-15T13:00:00Z' }
];
const TABLES: Record<string, Row[]> = { Seller: SELLERS, Product: PRODUCTS, Enquiry: ENQUIRIES };
const ADMIN = (name: string) => (name === 'whoAmI' ? { me: { role: 'admin' } } : null);
const STAFF = (name: string) => (name === 'whoAmI' ? { me: { role: 'staff', seller: { id: 'motors', name: 'Ring Road Motors' } } } : null);
const NOBODY = (name: string) => (name === 'whoAmI' ? { me: { role: 'buyer' } } : null);
const cardsOf = (out: Row) => Object.fromEntries((out.sections as Row[]).flatMap((s) => s.cards.map((c: Row) => [c.id, { ...c, section: s.id }])));

const CHECKS: Record<string, (s: Record<string, string>) => Promise<void>> = {
  async 'a seller reads only the enquiries about their own products: to answer first, newest first, each counted'(s) {
    const { out } = await run(s.ENQUIRIES_LOAD, {}, { tables: TABLES, cloud: STAFF });
    expect((out.sections as Row[]).map((x) => [x.heading, x.cards.map((c: Row) => c.id)])).toEqual([
      ['To answer (2)', ['q2', 'q1']],
      ['Answered (1)', ['q3']]
    ]);
    expect([out.band, out.heading, out.isAdmin, out.isStaff, out.empty]).toEqual(['Signed in as Ring Road Motors', 'Enquiries', false, true, false]);
    expect(Object.keys(cardsOf(out))).not.toContain('q4');
  },
  async 'the admin reads every enquiry, each named with its seller'(s) {
    const { out } = await run(s.ENQUIRIES_LOAD, {}, { tables: TABLES, cloud: ADMIN });
    const cards = cardsOf(out);
    expect([cards.q4.section, cards.q4.seller, cards.q4.hasSeller, cards.q2.seller, out.band, out.heading]).toEqual(['open', 'Kofi’s Kitchen', true, 'Ring Road Motors', 'Admin', 'Every enquiry']);
    expect((out.sections as Row[])[0].cards.map((c: Row) => c.id)).toEqual(['q4', 'q2', 'q1']);
  },
  async 'each card: about what, from whom, how to reach them, and the mark it can make'(s) {
    const cards = cardsOf((await run(s.ENQUIRIES_LOAD, {}, { tables: TABLES, cloud: STAFF })).out);
    const q2 = cards.q2;
    expect([q2.product, q2.pill, q2.from, q2.message, q2.whatsappLabel, q2.callLabel, q2.callLink, q2.toggleLabel, q2.answered, q2.hasSeller]).toEqual([
      'Toyota Corolla 2015',
      'New',
      'Kwame Mensah · +233 24 555 0187 · sent 15 Oct',
      'Is it still for sale? Can I see it on Saturday?',
      'WhatsApp Kwame',
      'Call +233 24 555 0187',
      'tel:+233245550187',
      'Mark answered',
      false,
      false
    ]);
    expect(decodeURIComponent(q2.whatsappLink)).toBe('https://wa.me/233245550187?text=Hello Kwame, about Toyota Corolla 2015: ');
    // A number written with 00 for its country code opens the same chat as one written with +.
    expect([cards.q1.whatsappLink.split('?')[0], cards.q1.callLink]).toEqual(['https://wa.me/442079460000', 'tel:+442079460000']);
    // An answered one, about a product off sale now: still read, says when it was answered, and can be unmarked.
    expect([cards.q3.product, cards.q3.pill, cards.q3.from, cards.q3.toggleLabel, cards.q3.answered, cards.q3.toggleBg, q2.toggleBg]).toEqual([
      'Toyota Hilux 2012',
      'Answered',
      'Yaw Boateng · +233 20 555 0111 · sent 13 Oct · answered 14 Oct',
      'Not answered yet',
      true,
      'var(--surface)',
      'var(--secondary)'
    ]);
  },
  async 'nobody else: a buyer’s sign-in and a refused read show why, and nothing else; none yet says so'(s) {
    const buyer = await run(s.ENQUIRIES_LOAD, {}, { tables: TABLES, cloud: NOBODY });
    expect([buyer.out.refused, buyer.out.sections, buyer.out.problem]).toEqual([true, undefined, 'This page is for the marketplace’s sellers and its admin.']);
    const out = await run(s.ENQUIRIES_LOAD, {}, { tables: TABLES, cloud: () => { throw { error: 'Invalid session token' }; } });
    expect([out.out.refused, out.out.problem]).toEqual([true, 'Sign in to see this page.']);
    const none = await run(s.ENQUIRIES_LOAD, {}, { tables: { ...TABLES, Enquiry: [] }, cloud: STAFF });
    expect([none.out.empty, none.out.sections, none.out.ok]).toEqual([true, [], true]);
  },
  async 'what the form and the mark send, and what the buyer reads once it is sent'(s) {
    const form = await run(s.ENQUIRY_GATHER, { productId: 'corolla', name: 'Kwame Mensah', contact: '+233 24 555 0187', message: 'Is it still for sale?' });
    const bare = await run(s.ENQUIRY_GATHER, { productId: 'corolla' });
    expect([form.out.enquiry, bare.out.enquiry, form.fired]).toEqual([
      { productId: 'corolla', buyerName: 'Kwame Mensah', contact: '+233 24 555 0187', message: 'Is it still for sale?' },
      { productId: 'corolla', buyerName: '', contact: '', message: '' },
      ['go']
    ]);
    const sent = await run(s.ENQUIRY_SENT, { seller: 'Ring Road Motors', contact: ' +233 24 555 0187 ' });
    expect(sent.out.words).toBe('Sent to Ring Road Motors. They’ll reach you on +233\u00a024\u00a0555\u00a00187, and you agree the rest between you.');
    const mark = await run(s.ANSWER_GATHER, { id: 'q2', answered: false });
    const unmark = await run(s.ANSWER_GATHER, { id: 'q3', answered: true });
    expect([mark.out.answer, unmark.out.answer, mark.fired]).toEqual([{ enquiryId: 'q2', answered: true }, { enquiryId: 'q3', answered: false }, ['go']]);
  }
};

const SHIPPED: Record<string, string> = { ...SLICE5_SCRIPTS };

describe('TWO-003 slice 5 — the enquiry scripts', () => {
  it('every script slice 5 ships compiles: its pages’ and its functions’', () => {
    const all = { ...SLICE5_SCRIPTS, ...SLICE5_CLOUD_SCRIPTS };
    expect(Object.keys(all).length).toBe(7);
    expect(Object.entries(all).filter(([, code]) => !compiles(code)).map(([name]) => name)).toEqual([]);
  });

  for (const [name, check] of Object.entries(CHECKS)) it(name, () => check(SHIPPED));

  const SEES = 'a seller reads only the enquiries about their own products: to answer first, newest first, each counted';
  const CARD = 'each card: about what, from whom, how to reach them, and the mark it can make';
  const SENDS = 'what the form and the mark send, and what the buyer reads once it is sent';
  /** Each loosens one rule; the named check must go red. */
  const MUTANTS: Array<[string, string, string, string, string]> = [
    ['a seller reads every seller’s enquiries', 'ENQUIRIES_LOAD', "all('Product', isAdmin ? {} : { seller: { equalTo: ptr('Seller', me.seller.id) } })", "all('Product', {})", SEES],
    ['oldest first', 'ENQUIRIES_LOAD', 'return at(b.createdAt) - at(a.createdAt);', 'return at(a.createdAt) - at(b.createdAt);', SEES],
    ['an answered one stays to answer', 'ENQUIRIES_LOAD', "bySection[answered ? 'answered' : 'open']", "bySection['open']", SEES],
    ['the count left out of the heading', 'ENQUIRIES_LOAD', "x[1] + ' (' + bySection[x[0]].length + ')'", 'x[1]', SEES],
    ['an empty section shown', 'ENQUIRIES_LOAD', 'SECTIONS.filter(function (x) { return bySection[x[0]].length; })', 'SECTIONS', 'nobody else: a buyer’s sign-in and a refused read show why, and nothing else; none yet says so'],
    ['a number with 00 opens the wrong chat', 'ENQUIRIES_LOAD', "if (contact.slice(0, 2) === '00') digits = digits.slice(2);", '', CARD],
    ['a call without its plus', 'ENQUIRIES_LOAD', "callLink: 'tel:+' + digits,", "callLink: 'tel:' + digits,", CARD],
    ['when it was answered left out', 'ENQUIRIES_LOAD', "(answered ? ' · answered ' + day(q.answeredAt) : '')", "''", CARD],
    ['the mark can’t be undone', 'ENQUIRIES_LOAD', "toggleLabel: answered ? 'Not answered yet' : 'Mark answered'", "toggleLabel: 'Mark answered'", CARD],
    ['the admin not told whose', 'ENQUIRIES_LOAD', "seller: isAdmin ? s.name || '' : '',", "seller: '',", 'the admin reads every enquiry, each named with its seller'],
    ['anyone signed in sees the page', 'ENQUIRIES_LOAD', 'if (!me || (!isAdmin && !me.seller))', 'if (!me)', 'nobody else: a buyer’s sign-in and a refused read show why, and nothing else; none yet says so'],
    ['the form forgets the product', 'ENQUIRY_GATHER', 'productId: s(Inputs.productId)', "productId: ''", SENDS],
    ['the mark sends the same thing twice', 'ANSWER_GATHER', 'answered: !Inputs.answered', 'answered: true', SENDS],
    ['the buyer not told where they’ll be reached', 'ENQUIRY_SENT', "' + contact + '", "' + '", SENDS],
    ['the number breaks across lines', 'ENQUIRY_SENT', ".split(' ').join(String.fromCharCode(160))", '', SENDS],
    ['undoing looks like the thing to do', 'ENQUIRIES_LOAD', "toggleBg: answered ? 'var(--surface)' : 'var(--secondary)',", "toggleBg: 'var(--secondary)',", CARD]
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, check) => {
    expect([script, SHIPPED[script].includes(from)]).toEqual([script, true]);
    const mutated = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    await expect(CHECKS[check](mutated)).rejects.toThrow();
  });
});
