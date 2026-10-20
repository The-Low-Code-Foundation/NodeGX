/**
 * TWO-003 slice 5 — enquire: a buyer's message to the seller about one product sold by enquiry (a car), sent from the
 * product page with no account, and a seller's **Enquiries** tab where they read them and mark each one answered. Held
 * to the approved picture (`look/marketplace.html`: "Enquire (a car)": your name, phone or WhatsApp, your message,
 * Send to the seller).
 *
 * ## The marketplace takes no part in the sale (R10)
 *
 * An enquiry is a message, not an order: no price is agreed here and nothing is paid. The seller reaches the buyer on
 * the number they left (WhatsApp, or a call), and they settle it between them, off the site. The product page still
 * offers the seller's own WhatsApp beside the form when they have a number.
 *
 * ## Two functions
 *
 * - `sendEnquiry` (anyone, rate-limited): one product, which must be on sale, sold by enquiry, by a seller who isn't
 *   stopped; the buyer's name, a number WITH its country code (a seller opens WhatsApp on it, and `wa.me` needs the
 *   whole number), and what they ask. Each is checked whole, never cut to fit.
 * - `answerEnquiry` (the admin, or the staff of the seller whose product it is, from THEIR Person row): marks an
 *   enquiry answered, or not answered yet. It writes `answeredAt` (TWO-001's world gained it in s8, §11.1) and
 *   nothing else.
 *
 * ## The page reads as the signed-in person
 *
 * The policy (TWO-001) lets staff read the enquiries about their own seller's products and the admin read every one;
 * the page asks for them by product, and the policy decides what comes back. Up to 1,000 (the slice 1 `all()`).
 *
 * 🔴 These scripts are TypeScript template literals: a backslash is eaten before the script exists. They hold none;
 * `two003Enquire.test.ts` compiles and runs every one.
 *
 * @module noodl-mcp/tests/two003Enquire
 */
import { CloudComponent, PRELUDE, scripted } from './two003Cloud';
import {
  BTN_BASE,
  button,
  call,
  CARD,
  column,
  COMPONENTS,
  fn,
  group,
  LINE,
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

export const FN_SEND_ENQUIRY = 'sendEnquiry';
export const FN_ANSWER_ENQUIRY = 'answerEnquiry';

/** The policy's `functions` rules slice 5 adds. Sending is open to anyone, so it is held to five a minute. */
export const SLICE5_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_SEND_ENQUIRY]: { call: 'public', rateLimit: { ratePerMinute: 5, burst: 5 } },
  [FN_ANSWER_ENQUIRY]: { call: ['role:admin', 'role:staff'] }
};

/** The longest each part of an enquiry may be. Longer is refused, not cut. */
export const MOST = { name: 120, contact: 40, message: 2000 };

// ── sendEnquiry ────────────────────────────────────────────────────────────────────────────────────────────────────

export const SEND_ENQUIRY_SCRIPT = `${PRELUDE}
var e = Inputs.enquiry;
if (e === undefined) return;
if (!e || typeof e !== 'object' || Array.isArray(e)) { refuse('The message arrived empty.'); return; }
function whole(v) { return typeof v === 'string' ? v.trim() : ''; }
var name = whole(e.buyerName), contact = whole(e.contact), message = whole(e.message);
if (!name) { refuse('Say who the message is from.'); return; }
if (name.length > ${MOST.name}) { refuse('A name of ${MOST.name} characters at most.'); return; }
var digits = contact.replace(/[^0-9]/g, '');
var international = contact.charAt(0) === '+' || contact.slice(0, 2) === '00';
if (!international || digits.length < 8 || contact.length > ${MOST.contact}) { refuse('A number the seller can call or WhatsApp, with its country code, like +233 24 555 0187.'); return; }
if (!message) { refuse('Say what you’d like to ask.'); return; }
if (message.length > ${MOST.message}) { refuse('A message of ${MOST.message.toLocaleString('en')} characters at most.'); return; }
var p = await one('Product', { objectId: { equalTo: text(e.productId, 64) } });
var s = p ? await one('Seller', { objectId: { equalTo: idOf(p.seller) } }) : null;
if (!p || !s || p.endedAt || s.endedAt) { refuse('This product isn’t on sale now.'); return; }
if (p.mode !== 'enquire') { refuse((p.name || 'This product') + ' is bought through the basket, not by message.'); return; }
await Noodl.Records.create('Enquiry', { product: ptr('Product', p.objectId), buyerName: name, contact: contact, message: message });
Outputs.sent = { seller: s.name || '' };
Outputs.done();`;

// ── answerEnquiry ──────────────────────────────────────────────────────────────────────────────────────────────────

export const ANSWER_ENQUIRY_SCRIPT = `${PRELUDE}
var a = Inputs.answer;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || Array.isArray(a)) { refuse('Say which enquiry, and whether it is answered.'); return; }
var me = await caller(Inputs.userId);
if (!me) { refuse('This sign-in has no place in the marketplace.'); return; }
var id = text(a.enquiryId, 64);
var q = id ? await one('Enquiry', { objectId: { equalTo: id } }) : null;
var p = q ? await one('Product', { objectId: { equalTo: idOf(q.product) } }) : null;
if (!q || !p) { refuse('There is no such enquiry.'); return; }
if (me.role !== 'admin' && (!idOf(me.seller) || idOf(p.seller) !== idOf(me.seller))) { refuse('That enquiry is about another seller’s product.'); return; }
if (typeof a.answered !== 'boolean') { refuse('Say whether it is answered.'); return; }
await Noodl.Records.save(id, { answeredAt: a.answered ? now() : null }, { className: 'Enquiry' });
Outputs.enquiry = { id: id, answered: a.answered };
Outputs.done();`;

export const SLICE5_CLOUD: CloudComponent[] = [
  scripted(FN_SEND_ENQUIRY, 'Send a seller a message about one product sold by enquiry, with or without an account', 'enquiry', SEND_ENQUIRY_SCRIPT, 'sent', true),
  scripted(FN_ANSWER_ENQUIRY, 'Mark an enquiry answered, or not answered yet: its seller’s staff, or the admin', 'answer', ANSWER_ENQUIRY_SCRIPT, 'enquiry')
];

export const SLICE5_CLOUD_SCRIPTS: Record<string, string> = { SEND_ENQUIRY_SCRIPT, ANSWER_ENQUIRY_SCRIPT };

// ── the product page's form (placed by `two003Shop.ts`) ────────────────────────────────────────────────────────────

/** The form, as one enquiry. What is sent is checked by `sendEnquiry`, not here. */
export const ENQUIRY_GATHER = `var s = function (v) { return v === undefined || v === null ? '' : String(v); };
Outputs.enquiry = { productId: s(Inputs.productId), buyerName: s(Inputs.name), contact: s(Inputs.contact), message: s(Inputs.message) };
Outputs.go();`;

/** What the buyer reads once it is sent: who has it, and where they will be reached. */
export const ENQUIRY_SENT = `var seller = String(Inputs.seller || 'The seller');
// A number reads whole: its spaces don't break across lines.
var contact = String(Inputs.contact || '').trim().split(' ').join(String.fromCharCode(160));
Outputs.words = 'Sent to ' + seller + '. They’ll reach you on ' + contact + ', and you agree the rest between you.';`;

// ── /Seller/EnquiryCard ────────────────────────────────────────────────────────────────────────────────────────────

export const ANSWER_GATHER = `Outputs.answer = { enquiryId: String(Inputs.id || ''), answered: !Inputs.answered };
Outputs.go();`;
export const ENQUIRIES_STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const SMALL = { ...LINE, paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', fontSize: 'var(--text-sm)' };
const SMALL_WHATSAPP = { ...BTN_BASE, paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', backgroundColor: 'var(--whatsapp)', color: 'var(--secondary-foreground)', borderStyle: 'none', sizeMode: 'contentSize' };

const ENQUIRY_CARD: PageComponent = {
  path: COMPONENTS.enquiryCard,
  description: 'One enquiry, as its seller (or the admin) reads it: about what, from whom, how to reach them; marked answered or not',
  nodes: [
    group('ecRoot', 'An enquiry', undefined, CARD),
    group('ecHead', 'About what, and answered or not', 'ecRoot', rowOf({ justifyContent: 'space-between', alignItems: 'flex-start' })),
    text('ecProduct', 'The product it is about', 'ecHead', '', { ...T_NAME, sizeMode: 'contentHeight', width: pct(100), cssClassName: 'mk-grow' }),
    group('ecPill', 'New or answered', 'ecHead', { ...PILL }),
    text('ecPillWords', 'New or answered', 'ecPill', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', cssClassName: 'mk-nowrap' }),
    text('ecSeller', 'Whose product (the admin sees it)', 'ecRoot', '', { ...T_META, fontWeight: 'var(--font-bold)', mounted: false }),
    text('ecFrom', 'From whom, their number, and when', 'ecRoot', '', T_META),
    text('ecMessage', 'What they ask', 'ecRoot', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)' }),
    group('ecActions', 'Reach them, and mark it', 'ecRoot', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2)' })),
    button('ecWhatsapp', 'WhatsApp them', 'ecActions', '', SMALL_WHATSAPP),
    button('ecCall', 'Call them', 'ecActions', '', SMALL),
    button('ecToggle', 'Answered, or not yet', 'ecActions', '', { ...SMALL, backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }),
    text('ecError', 'What went wrong', 'ecRoot', '', { ...T_REFUSED, mounted: false }),
    {
      id: 'ecIn',
      type: 'Component Inputs',
      label: 'One enquiry',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'product', type: 'string', plug: 'output' },
        { name: 'pill', type: 'string', plug: 'output' },
        { name: 'pillBg', type: 'string', plug: 'output' },
        { name: 'pillInk', type: 'string', plug: 'output' },
        { name: 'seller', type: 'string', plug: 'output' },
        { name: 'hasSeller', type: 'boolean', plug: 'output' },
        { name: 'from', type: 'string', plug: 'output' },
        { name: 'message', type: 'string', plug: 'output' },
        { name: 'whatsappLabel', type: 'string', plug: 'output' },
        { name: 'whatsappLink', type: 'string', plug: 'output' },
        { name: 'callLabel', type: 'string', plug: 'output' },
        { name: 'callLink', type: 'string', plug: 'output' },
        { name: 'answered', type: 'boolean', plug: 'output' },
        { name: 'toggleLabel', type: 'string', plug: 'output' },
        { name: 'toggleBg', type: 'string', plug: 'output' },
        { name: 'toggleInk', type: 'string', plug: 'output' }
      ]
    },
    { id: 'ecOpenWhatsapp', type: 'net.noodl.externallink', label: 'Open WhatsApp on their number', parameters: { openInNewTab: true } },
    { id: 'ecOpenCall', type: 'net.noodl.externallink', label: 'Call their number', parameters: { openInNewTab: false } },
    fn('ecGather', 'Answered, or not yet', ANSWER_GATHER, ['go'], ['id', 'answered']),
    call('ecCallFn', 'answerEnquiry(answer)', FN_ANSWER_ENQUIRY),
    { id: 'ecFailed', type: 'Switch', label: 'The last mark was refused' },
    fn('ecStamp', 'Say an enquiry changed', ENQUIRIES_STAMP, ['go']),
    { id: 'ecChanged', type: 'Set Variable', label: 'An enquiry changed', parameters: { name: 'enquiriesChanged', setWith: 'string' } }
  ],
  connections: [
    wire('ecIn', 'product', 'ecProduct', 'text'),
    wire('ecIn', 'pill', 'ecPillWords', 'text'),
    wire('ecIn', 'pillBg', 'ecPill', 'backgroundColor'),
    wire('ecIn', 'pillInk', 'ecPillWords', 'color'),
    wire('ecIn', 'seller', 'ecSeller', 'text'),
    wire('ecIn', 'hasSeller', 'ecSeller', 'mounted'),
    wire('ecIn', 'from', 'ecFrom', 'text'),
    wire('ecIn', 'message', 'ecMessage', 'text'),
    wire('ecIn', 'whatsappLabel', 'ecWhatsapp', 'label'),
    wire('ecIn', 'whatsappLink', 'ecOpenWhatsapp', 'link'),
    wire('ecIn', 'callLabel', 'ecCall', 'label'),
    wire('ecIn', 'callLink', 'ecOpenCall', 'link'),
    wire('ecIn', 'toggleLabel', 'ecToggle', 'label'),
    wire('ecIn', 'toggleBg', 'ecToggle', 'backgroundColor'),
    wire('ecIn', 'toggleInk', 'ecToggle', 'color'),
    wire('ecIn', 'id', 'ecGather', 'in-id'),
    wire('ecIn', 'answered', 'ecGather', 'in-answered'),
    wire('ecWhatsapp', 'onClick', 'ecOpenWhatsapp', 'do'),
    wire('ecCall', 'onClick', 'ecOpenCall', 'do'),
    wire('ecToggle', 'onClick', 'ecGather', 'run'),
    wire('ecGather', 'out-answer', 'ecCallFn', 'in-answer'),
    wire('ecGather', 'out-go', 'ecCallFn', 'call'),
    wire('ecCallFn', 'error', 'ecError', 'text'),
    wire('ecCallFn', 'failure', 'ecFailed', 'on'),
    wire('ecCallFn', 'done', 'ecFailed', 'off'),
    wire('ecFailed', 'state', 'ecError', 'mounted'),
    wire('ecCallFn', 'done', 'ecStamp', 'run'),
    wire('ecStamp', 'out-at', 'ecChanged', 'value'),
    wire('ecStamp', 'out-go', 'ecChanged', 'do')
  ]
};

// ── /Seller/EnquirySection ─────────────────────────────────────────────────────────────────────────────────────────

const ENQUIRY_SECTION: PageComponent = {
  path: COMPONENTS.enquirySection,
  description: 'To answer, or answered: a heading and its enquiries',
  nodes: [
    group('esRoot', 'A section', undefined, column({ rowGap: 'var(--space-2)' })),
    group('esHead', 'Heading and what to do', 'esRoot', rowOf({ flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 'var(--space-2)', rowGap: 'var(--space-0)' })),
    text('esHeading', 'The heading', 'esHead', '', { fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'mk-display', as: 'h2', sizeMode: 'contentSize' }),
    text('esNote', 'What to do with these', 'esHead', '', { ...T_META, sizeMode: 'contentSize' }),
    group('esList', 'The enquiries', 'esRoot', column({ rowGap: 'var(--space-3)' })),
    { id: 'esEach', type: 'For Each', label: 'One card per enquiry', parent: 'esList', parameters: { template: COMPONENTS.enquiryCard } },
    {
      id: 'esIn',
      type: 'Component Inputs',
      label: 'One section',
      ports: [
        { name: 'heading', type: 'string', plug: 'output' },
        { name: 'note', type: 'string', plug: 'output' },
        { name: 'cards', type: 'array', plug: 'output' }
      ]
    }
  ],
  connections: [wire('esIn', 'heading', 'esHeading', 'text'), wire('esIn', 'note', 'esNote', 'text'), wire('esIn', 'cards', 'esEach', 'items')]
};

// ── /Pages/Enquiries ───────────────────────────────────────────────────────────────────────────────────────────────

/** The two sections, the one that needs the seller first. */
export const ENQUIRY_SECTIONS: Array<[string, string, string]> = [
  ['open', 'To answer', 'reach them on WhatsApp or by phone'],
  ['answered', 'Answered', '']
];

/**
 * Every enquiry the signed-in person may read (about their seller's products, or every one for the admin), newest first,
 * in two sections: to answer, and answered. Each says what it is about, who sent it, when, and how to reach them.
 */
export const ENQUIRIES_LOAD = `${READ}
var SECTIONS = ${JSON.stringify(ENQUIRY_SECTIONS)};
function at(d) { var iso = d && typeof d === 'object' ? d.iso : d; var t = iso ? new Date(iso).getTime() : NaN; return isFinite(t) ? t : 0; }
function day(d) { var t = at(d); return t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; }
void Inputs.changed; // a card marked one: read again
try {
  var me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var isAdmin = !!me && me.role === 'admin';
if (!me || (!isAdmin && !me.seller)) { Outputs.problem = 'This page is for the marketplace’s sellers and its admin.'; Outputs.refused = true; Outputs.ok = false; return; }
try {
  var products = await all('Product', isAdmin ? {} : { seller: { equalTo: ptr('Seller', me.seller.id) } });
  var enquiries = isAdmin ? await all('Enquiry') : products.length ? await all('Enquiry', { product: { containedIn: products.map(function (p) { return ptr('Product', p.objectId); }) } }) : [];
  var sellers = isAdmin ? await all('Seller') : [];
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
var product = {}, seller = {};
products.forEach(function (p) { product[p.objectId] = p; });
sellers.forEach(function (s) { seller[s.objectId] = s; });
var bySection = { open: [], answered: [] };
enquiries
  .slice()
  .sort(function (a, b) { return at(b.createdAt) - at(a.createdAt); })
  .forEach(function (q) {
    var p = product[idOf(q.product)] || {}, s = seller[idOf(p.seller)] || {};
    var answered = !!q.answeredAt;
    var contact = String(q.contact || '');
    var digits = contact.replace(/[^0-9]/g, '');
    if (contact.slice(0, 2) === '00') digits = digits.slice(2);
    var first = String(q.buyerName || '').split(' ')[0];
    bySection[answered ? 'answered' : 'open'].push({
      id: q.objectId,
      product: p.name || 'A product no longer here',
      pill: answered ? 'Answered' : 'New',
      pillBg: answered ? 'var(--ok-bg)' : 'var(--warn-bg)',
      pillInk: answered ? 'var(--ok)' : 'var(--warn)',
      seller: isAdmin ? s.name || '' : '',
      hasSeller: isAdmin,
      from: [q.buyerName, contact, 'sent ' + day(q.createdAt)].filter(Boolean).join(' · ') + (answered ? ' · answered ' + day(q.answeredAt) : ''),
      message: q.message || '',
      whatsappLabel: 'WhatsApp ' + (first || 'them'),
      whatsappLink: 'https://wa.me/' + digits + '?text=' + encodeURIComponent('Hello ' + (first || '') + ', about ' + (p.name || 'your message') + ': '),
      callLabel: 'Call ' + contact,
      callLink: 'tel:+' + digits,
      answered: answered,
      toggleLabel: answered ? 'Not answered yet' : 'Mark answered',
      // The one thing to do with a new one is filled; undoing an answered one is not.
      toggleBg: answered ? 'var(--surface)' : 'var(--secondary)',
      toggleInk: answered ? 'var(--secondary)' : 'var(--secondary-foreground)'
    });
  });
Outputs.sections = SECTIONS.filter(function (x) { return bySection[x[0]].length; }).map(function (x) { return { id: x[0], heading: x[1] + ' (' + bySection[x[0]].length + ')', note: x[2], cards: bySection[x[0]] }; });
Outputs.empty = enquiries.length === 0;
Outputs.band = isAdmin ? 'Admin' : 'Signed in as ' + (me.seller.name || '');
Outputs.heading = isAdmin ? 'Every enquiry' : 'Enquiries';
Outputs.fine = isAdmin
  ? 'Every buyer’s message about a product sold by enquiry, each named with its seller. The sale is settled between buyer and seller, away from the site.'
  : 'Buyers’ messages about the products you sell by enquiry. Reach them on the number they left; you agree the price and the handover between you, away from the site.';
Outputs.isAdmin = isAdmin;
Outputs.isStaff = !isAdmin;
Outputs.refused = false;
Outputs.ok = true;`;

const ENQUIRIES: PageComponent = {
  path: PAGES.enquiries,
  description: 'Enquiries: buyers’ messages about a seller’s products sold by enquiry (or every one, for the admin), marked answered',
  nodes: [
    ...shell('eq', 'Enquiries', 'enquiries', '', 960, [
      group('eqAdminTabsBox', 'The admin’s tabs', 'eqRoot', { width: pct(100), sizeMode: 'contentHeight', mounted: false }),
      { id: 'eqAdminTabs', type: COMPONENTS.tabs, label: 'The admin’s tabs', parent: 'eqAdminTabsBox', parameters: { on: 'enquiries' } },
      group('eqSellerTabsBox', 'A seller’s tabs', 'eqRoot', { width: pct(100), sizeMode: 'contentHeight', mounted: false }),
      { id: 'eqSellerTabs', type: COMPONENTS.sellerTabs, label: 'Orders, Products, Enquiries', parent: 'eqSellerTabsBox', parameters: { on: 'enquiries' } }
    ]),
    group('eqContent', 'The enquiries', 'eqBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('eqTitle', 'Heading', 'eqContent', '', T_TITLE),
    text('eqEmpty', 'No enquiries yet', 'eqContent', 'No enquiries yet. They arrive here when a buyer messages you about a product you sell by enquiry.', { ...T_META, mounted: false }),
    group('eqSections', 'To answer, then answered', 'eqContent', column({ rowGap: 'var(--space-6)' })),
    { id: 'eqEach', type: 'For Each', label: 'One section each', parent: 'eqSections', parameters: { template: COMPONENTS.enquirySection } },
    text('eqFine', 'What this page shows, and whose', 'eqContent', '', T_META),
    ...refusedBox('eq'),
    fn('eqLoad', 'The enquiries this person may read', ENQUIRIES_LOAD, []),
    { id: 'eqVersion', type: 'Variable2', label: 'An enquiry changed', parameters: { name: 'enquiriesChanged' } }
  ],
  connections: [
    wire('eqRoot', 'didMount', 'eqLoad', 'run'),
    wire('eqVersion', 'value', 'eqLoad', 'in-changed'),
    wire('eqLoad', 'out-ok', 'eqContent', 'mounted'),
    wire('eqLoad', 'out-band', 'eqBand', 'words'),
    wire('eqLoad', 'out-heading', 'eqTitle', 'text'),
    wire('eqLoad', 'out-isAdmin', 'eqAdminTabsBox', 'mounted'),
    wire('eqLoad', 'out-isStaff', 'eqSellerTabsBox', 'mounted'),
    wire('eqLoad', 'out-empty', 'eqEmpty', 'mounted'),
    wire('eqLoad', 'out-sections', 'eqEach', 'items'),
    wire('eqLoad', 'out-fine', 'eqFine', 'text'),
    ...refusedWires('eq', 'eqLoad')
  ]
};

/** Leaves first (a leaf before what places it), then the page. */
export const SLICE5_LEAVES: PageComponent[] = [ENQUIRY_CARD, ENQUIRY_SECTION];
export const SLICE5_PAGES: PageComponent[] = [ENQUIRIES];

/** Every script slice 5's pages ship (the product page's form included), by name, for the spec that runs them. */
export const SLICE5_SCRIPTS: Record<string, string> = {
  ENQUIRY_GATHER,
  ENQUIRY_SENT,
  ANSWER_GATHER,
  ENQUIRIES_STAMP,
  ENQUIRIES_LOAD
};
