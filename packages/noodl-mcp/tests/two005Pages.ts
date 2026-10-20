/**
 * TWO-005 slice 1 — the community app's pages for joining and being let in, held to the approved picture
 * (`look/gram.html`: the waiting screen, the admins' queue "Waiting for you", "Ask to join").
 *
 * The shape is the marketplace's (`two003Pages.ts`, whose node builders this reuses): every write is a Call Cloud
 * Function node; every list is one script reading as the signed-in person, so the policy decides what comes back; a
 * page whose read is refused says why and offers a way in.
 *
 * - **Signing in is by an emailed link** (Request Magic Link), the plan of record until P119 SRK-001's six-digit code
 *   has its client half (TWO-005 §3). The link brings the person back to this app's start, where the runtime signs
 *   them in and the Welcome page sends them on: a waiting member to Waiting, a member to the feed, an admin to the
 *   queue. **An admin may also sign in with the password made at set-up**, so the builder can sign in before the
 *   backend sends any email.
 * - **The feed is slice 2's** (`two005FeedPages.ts`); a member who is let in lands on it.
 *
 * @module noodl-mcp/tests/two005Pages
 */
import { FN_ASK_TO_JOIN, FN_LET_IN, FN_MAKE_ADMIN, FN_SET_UP_COMMUNITY, FN_TURN_AWAY } from './two005Cloud';
import { TWO005_CSS } from './two005Look';
import { button, call, column, fn, go, group, input, Node, PageComponent, pct, px, rowOf, text, Wire, wire } from './two003Pages';

export const GRAM_PAGES = {
  welcome: '/Pages/Welcome',
  join: '/Pages/Join',
  signIn: '/Pages/SignIn',
  waiting: '/Pages/Waiting',
  rules: '/Pages/Rules',
  setUp: '/Pages/SetUp',
  feed: '/Pages/Feed',
  queue: '/Pages/Admin/Queue',
  admins: '/Pages/Admin/Admins'
};

export const GRAM_COMPONENTS = {
  bar: '/UI/Bar',
  nav: '/UI/Nav',
  newMember: '/Admin/NewMemberRow',
  adminRow: '/Admin/MemberRow'
};

// ── the look, as parameters (the picture's classes) ───────────────────────────────────────────────────────────────

const BTN = { borderRadius: 'var(--radius-lg)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-extrabold)' };
/** `.btn.main`: the one filled action on a screen, plum. */
export const GM_MAIN = { ...BTN, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderStyle: 'none', sizeMode: 'contentHeight', width: pct(100) };
/** `.btn.line`: plum outline on white. */
export const GM_LINE = { ...BTN, backgroundColor: 'var(--surface)', color: 'var(--primary)', borderStyle: 'solid', borderWidth: px(1.5), borderColor: 'var(--primary)', sizeMode: 'contentSize' };
const SMALL = { paddingLeft: 'var(--space-2-5)', paddingRight: 'var(--space-2-5)', paddingTop: 'var(--space-1-5)', paddingBottom: 'var(--space-1-5)', fontSize: 'var(--text-xs)', borderRadius: px(9) };
/** `.btn.ok.small`: "Let in". */
export const GM_OK_SMALL = { ...BTN, ...SMALL, backgroundColor: 'var(--ok)', color: 'var(--primary-foreground)', borderStyle: 'none', sizeMode: 'contentSize' };
export const GM_LINE_SMALL = { ...GM_LINE, ...SMALL };
/** Plum words, no box: Back, and "New here? Ask to join". */
export const GM_LINK = { ...BTN, backgroundColor: 'transparent', color: 'var(--primary)', borderStyle: 'none', paddingLeft: 'var(--space-0)', paddingRight: 'var(--space-0)', sizeMode: 'contentSize' };
export const GM_TITLE = { fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--foreground)', cssClassName: 'gm-read gm-wrap', as: 'h1' };
export const GM_NAME = { fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'gm-wrap' };
/** `.fine`. */
export const GM_FINE = { fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap' };
export const GM_REFUSED = { fontSize: 'var(--text-sm)', color: 'var(--destructive)', cssClassName: 'gm-wrap' };
/** The one destructive action on a screen (Block, Take it down): red words, a red outline. */
export const GM_BAD_LINE = { ...GM_LINE, color: 'var(--bad)', borderColor: 'var(--bad)' };
const FIELD = {
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
  paddingTop: 'var(--space-2-5)',
  paddingBottom: 'var(--space-2-5)',
  fontSize: 'var(--text-base)',
  color: 'var(--foreground)',
  labelfontSize: 'var(--text-sm)',
  labelfontWeight: 'var(--font-semibold)',
  labelcolor: 'var(--foreground)'
};
const field = (id: string, parent: string, label: string, extra: Record<string, unknown> = {}): Node => ({ ...input(id, parent, label, extra), parameters: { ...FIELD, label, ...extra } });

// ── the page shell ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Every page: the white bar with the wordmark (`/UI/Bar`, which offers Sign out only to someone signed in), the plum
 * role band when `band` is given, and a body column: the phone's width on a phone, a readable measure on a tablet.
 * `nav` names the section the page is in, and gives it the sections (`/UI/Nav`).
 */
export function gramShell(p: string, title: string, urlPath: string, band: string | null, measure = 560, nav: string | null = null): Node[] {
  return [
    { id: `${p}Page`, type: 'Page', label: title, parameters: { title, urlPath } },
    group(`${p}Root`, 'The screen', `${p}Page`, column({ backgroundColor: 'var(--background)', minHeight: { value: 100, unit: 'vh' }, alignItems: 'center', cssClassName: nav === null ? 'gm-app' : 'gm-app gm-has-nav' })),
    { id: `${p}Bar`, type: GRAM_COMPONENTS.bar, label: 'The bar', parent: `${p}Root`, parameters: band === null ? {} : { band } },
    group(`${p}Body`, 'The page', `${p}Root`, column({ maxWidth: px(measure), paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-8)', rowGap: 'var(--space-4)' })),
    // Slice 4: the bottom bar on a phone, the rail on a tablet (`two005PrayerPages.ts`). The page wires who is signed
    // in (`meId`, for Profile) and whether to show it (`show`: a member who's been let in).
    ...(nav === null ? [] : [{ id: `${p}Nav`, type: GRAM_COMPONENTS.nav, label: 'The sections', parent: `${p}Root`, parameters: { on: nav } }])
  ];
}

/** What a page shows when its read was refused: the reason, and the way to sign in. */
function refusedBox(p: string): Node[] {
  return [
    group(`${p}Refused`, 'Refused: why, and sign in', `${p}Body`, column({ rowGap: 'var(--space-3)', mounted: false })),
    text(`${p}RefusedWhy`, 'Why', `${p}Refused`, '', GM_REFUSED),
    button(`${p}RefusedSignIn`, 'Sign in', `${p}Refused`, 'Sign in', GM_LINE),
    go(`${p}ToSignIn`, 'To sign in', GRAM_PAGES.signIn)
  ];
}
const refusedWires = (p: string, loader: string): Wire[] => [
  wire(loader, 'out-problem', `${p}RefusedWhy`, 'text'),
  wire(loader, 'out-refused', `${p}Refused`, 'mounted'),
  wire(`${p}RefusedSignIn`, 'onClick', `${p}ToSignIn`, 'navigate')
];

/**
 * The prelude every page loader shares. `me()` asks who is signed in; with nobody signed in it asks nothing (a request
 * the backend must refuse would be a red line in the console for every stranger).
 */
export const GRAM_READ = `function idOf(v) { return v && typeof v === 'object' ? String(v.objectId || v.id || '') : v ? String(v) : ''; }
async function all(c, where) { return Noodl.Records.query(c, where || {}, { plain: true, limit: 1000 }); }
async function me() {
  if (!Noodl.Users.Current) return null;
  try { return (await Noodl.CloudFunctions.run('whoAmI', {})).me || null; } catch (e) { return null; }
}
function why(e) { var m = (e && (e.error || e.message)) || String(e || ''); if (/admins’|^Sign in/.test(m)) return m; return /session|auth|permission|forbidden|401|403/i.test(m) ? 'Sign in to see this page.' : 'This page couldn’t be read: ' + m; }
async function adminsOnly() {
  var who = await me();
  if (!who) throw { error: 'Sign in to see this page.' };
  if (who.role !== 'admin') throw { error: 'This page is the admins’. Sign in as an admin to see it.' };
  return who;
}
function ago(at) {
  var t = at ? new Date(at.iso || at).getTime() : 0;
  if (!t) return '';
  var m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  var h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  var d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : d + ' days ago';
}
var SHADES = ['#4a6a2b', '#6a4a2b', '#2b4a6a', '#7a3e1d', '#4a2160', '#2b6a5a'];
function initials(name) { return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || '?'; }
function shade(id) { var n = 0; String(id).split('').forEach(function (c) { n = (n + c.charCodeAt(0)) % SHADES.length; }); return SHADES[n]; }
`;

/** Where a signed-in person belongs: waiting, a member (the feed), an admin (the queue). Nobody: stays. */
export const GRAM_ROUTE = `${GRAM_READ}
var who = await me();
if (!who) { Outputs.problem = Noodl.Users.Current ? 'This sign-in isn’t a member of the community.' : ''; Outputs.stranger(); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
if (who.role === 'admin') { Outputs.admin(); return; }
Outputs.member();`;

// ── /UI/Bar ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Sign out is offered only to someone signed in: a stranger on the welcome page has nothing to sign out of. */
export const BAR_WHO = `Outputs.signedIn = !!Noodl.Users.Current;
Outputs.hasBand = !!Inputs.band;`;

const BAR: PageComponent = {
  path: GRAM_COMPONENTS.bar,
  description: 'The bar: the wordmark, Sign out for someone signed in, and the role band',
  nodes: [
    group('brRoot', 'Bar', undefined, column({})),
    group('brTop', 'Wordmark and Sign out', 'brRoot', rowOf({ backgroundColor: 'var(--surface)', borderStyle: 'solid', borderColor: 'var(--border)', borderBottomWidth: px(1), borderTopWidth: px(0), borderLeftWidth: px(0), borderRightWidth: px(0), paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' })),
    text('brWord', 'The wordmark', 'brTop', 'gram', { fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--foreground)', cssClassName: 'gm-read gm-grow' }),
    button('brOut', 'Sign out', 'brTop', 'Sign out', { ...GM_LINE_SMALL, mounted: false }),
    group('brBand', 'The role band', 'brRoot', { width: pct(100), sizeMode: 'contentHeight', backgroundColor: 'var(--primary)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: px(5), paddingBottom: px(5), mounted: false }),
    text('brBandWords', 'Who', 'brBand', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--primary-foreground)' }),
    { id: 'brIn', type: 'Component Inputs', label: 'Inputs', ports: [{ name: 'band', type: 'string', plug: 'output' }] },
    fn('brWho', 'Signed in? A band?', BAR_WHO, []),
    { id: 'brLogOut', type: 'net.noodl.user.LogOut', label: 'Sign out' },
    go('brToWelcome', 'To the start', GRAM_PAGES.welcome)
  ],
  connections: [
    wire('brIn', 'band', 'brBandWords', 'text'),
    wire('brIn', 'band', 'brWho', 'in-band'),
    wire('brRoot', 'didMount', 'brWho', 'run'),
    wire('brWho', 'out-signedIn', 'brOut', 'mounted'),
    wire('brWho', 'out-hasBand', 'brBand', 'mounted'),
    wire('brOut', 'onClick', 'brLogOut', 'login'),
    wire('brLogOut', 'done', 'brToWelcome', 'navigate')
  ]
};

// ── /Pages/Welcome ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The start: the community's name for a stranger, with Ask to join and Sign in. Someone signed in is sent on, and so
 * is someone a link has just brought back: the runtime signs them in a moment after the page opens, so the page asks
 * again for a few seconds. A link the backend refused says why (a Sign In With node, the receiver of a link's return).
 * A community nobody has set up yet says so, and offers the set-up.
 */
export const WELCOME_LOAD = `${GRAM_READ}
var rows = [];
try { rows = await all('Community'); } catch (e) { rows = []; }
var c = rows[0];
Outputs.name = c && c.name ? c.name : '';
Outputs.isSetUp = !!c;
Outputs.notSetUp = !c;
Outputs.ok = true;
for (var i = 0; i < 16; i++) {
  if (Noodl.Users.Current) { Outputs.check(); return; }
  await new Promise(function (r) { setTimeout(r, 250); });
}`;

const WELCOME: PageComponent = {
  path: GRAM_PAGES.welcome,
  description: 'The start: what this is, Ask to join, Sign in',
  nodes: [
    ...gramShell('wc', 'Welcome', '', null, 480),
    group('wcContent', 'Welcome', 'wcBody', column({ rowGap: 'var(--space-4)', paddingTop: 'var(--space-8)', mounted: false })),
    text('wcName', 'The community’s name', 'wcContent', '', GM_TITLE),
    text('wcLead', 'What it is', 'wcContent', 'Members read the day’s devotional, pray for each other and share what God is doing. Only members who’ve been let in see posts. Nothing is public.', { ...GM_FINE, fontSize: 'var(--text-base)' }),
    group('wcOpen', 'Ask to join, or sign in', 'wcContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    button('wcJoin', 'Ask to join', 'wcOpen', 'Ask to join', GM_MAIN),
    button('wcSignIn', 'Sign in', 'wcOpen', 'Sign in', { ...GM_LINE, sizeMode: 'contentHeight', width: pct(100) }),
    text('wcAge', 'Who may join', 'wcOpen', 'Members are 13 or older.', GM_FINE),
    group('wcNew', 'Not set up yet', 'wcContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('wcNewWords', 'Not set up yet', 'wcNew', 'This community isn’t set up yet. Whoever started its backend has the setup token.', GM_FINE),
    button('wcSetUp', 'Set it up', 'wcNew', 'Set up the community', GM_MAIN),
    text('wcProblem', 'A sign-in with no member', 'wcContent', '', GM_REFUSED),
    fn('wcLoad', 'The community’s name; someone signed in?', WELCOME_LOAD, ['check']),
    fn('wcRoute', 'Where they belong', GRAM_ROUTE, ['stranger', 'waiting', 'member', 'admin']),
    // A link comes back here. Refused (someone not let in, a link already used), the backend says why: show it.
    { id: 'wcReturn', type: 'net.noodl.user.SignInWith', label: 'Back from a sign-in link' },
    go('wcToJoin', 'To ask to join', GRAM_PAGES.join),
    go('wcToSignIn', 'To sign in', GRAM_PAGES.signIn),
    go('wcToSetUp', 'To set up', GRAM_PAGES.setUp),
    go('wcToWaiting', 'To waiting', GRAM_PAGES.waiting),
    go('wcToFeed', 'To the feed', GRAM_PAGES.feed),
    go('wcToQueue', 'To the admins’ queue', GRAM_PAGES.queue)
  ],
  connections: [
    wire('wcRoot', 'didMount', 'wcLoad', 'run'),
    wire('wcLoad', 'out-ok', 'wcContent', 'mounted'),
    wire('wcLoad', 'out-name', 'wcName', 'text'),
    wire('wcLoad', 'out-isSetUp', 'wcOpen', 'mounted'),
    wire('wcLoad', 'out-notSetUp', 'wcNew', 'mounted'),
    wire('wcLoad', 'out-check', 'wcRoute', 'run'),
    wire('wcRoute', 'out-problem', 'wcProblem', 'text'),
    wire('wcReturn', 'error', 'wcProblem', 'text'),
    wire('wcRoute', 'out-waiting', 'wcToWaiting', 'navigate'),
    wire('wcRoute', 'out-member', 'wcToFeed', 'navigate'),
    wire('wcRoute', 'out-admin', 'wcToQueue', 'navigate'),
    wire('wcJoin', 'onClick', 'wcToJoin', 'navigate'),
    wire('wcSignIn', 'onClick', 'wcToSignIn', 'navigate'),
    wire('wcSetUp', 'onClick', 'wcToSetUp', 'navigate')
  ]
};

// ── /Pages/Join ────────────────────────────────────────────────────────────────────────────────────────────────────

export const JOIN_GATHER = `Outputs.join = { name: Inputs.name || '', email: Inputs.email || '', over13: Inputs.over13 === true };
Outputs.thanks = 'Thanks, ' + String(Inputs.name || '').trim().split(' ')[0] + '. You’re on the list.';
Outputs.go();`;

const JOIN: PageComponent = {
  path: GRAM_PAGES.join,
  description: 'Ask to join: a name, an email, 13 or older',
  nodes: [
    ...gramShell('jn', 'Ask to join', 'join', null, 480),
    group('jnForm', 'The form', 'jnBody', column({ rowGap: 'var(--space-3)' })),
    text('jnTitle', 'Heading', 'jnForm', 'Ask to join', GM_TITLE),
    text('jnLead', 'What happens', 'jnForm', 'An admin lets each new member in. Then you sign in with your email: we send you a link, no password.', GM_FINE),
    field('jnName', 'jnForm', 'Your name'),
    field('jnEmail', 'jnForm', 'Your email', { type: 'email' }),
    {
      id: 'jnOver13',
      type: 'net.noodl.controls.checkbox',
      label: 'I am 13 or older',
      parent: 'jnForm',
      parameters: { useLabel: true, label: 'I am 13 or older', width: px(22), height: px(22), borderWidth: px(2), borderColor: 'var(--primary)', borderRadius: 'var(--radius-sm)', labelSpacing: px(8), labelfontSize: 'var(--text-sm)', labelcolor: 'var(--foreground)', cssClassName: 'gm-check' }
    },
    button('jnGo', 'Ask to join', 'jnForm', 'Ask to join', GM_MAIN),
    text('jnError', 'What went wrong', 'jnForm', '', GM_REFUSED),
    group('jnThanks', 'On the list', 'jnBody', column({ rowGap: 'var(--space-3)', alignItems: 'center', paddingTop: 'var(--space-8)', mounted: false })),
    text('jnThanksWords', 'Thanks', 'jnThanks', '', { ...GM_TITLE, textAlignX: 'center' }),
    text('jnThanksFine', 'What happens next', 'jnThanks', 'An admin lets each new member in, usually within a day. We’ll send you a message when you’re in.', { ...GM_FINE, textAlignX: 'center' }),
    button('jnRules', 'Read the community rules', 'jnThanks', 'Read the community rules', GM_LINE_SMALL),
    fn('jnGather', 'The form, as one ask', JOIN_GATHER, ['go'], ['name', 'email', 'over13']),
    call('jnCall', 'askToJoin(join)', FN_ASK_TO_JOIN),
    { id: 'jnAsked', type: 'Switch', label: 'Asked' },
    { id: 'jnAsking', type: 'Switch', label: 'Not asked yet', parameters: { onFromStart: true } },
    go('jnToRules', 'To the rules', GRAM_PAGES.rules)
  ],
  connections: [
    wire('jnName', 'onTextChanged', 'jnGather', 'in-name'),
    wire('jnEmail', 'onTextChanged', 'jnGather', 'in-email'),
    wire('jnOver13', 'checked', 'jnGather', 'in-over13'),
    wire('jnGo', 'onClick', 'jnGather', 'run'),
    wire('jnGather', 'out-join', 'jnCall', 'in-join'),
    wire('jnGather', 'out-go', 'jnCall', 'call'),
    wire('jnGather', 'out-thanks', 'jnThanksWords', 'text'),
    wire('jnCall', 'error', 'jnError', 'text'),
    wire('jnCall', 'done', 'jnAsked', 'on'),
    wire('jnAsked', 'state', 'jnThanks', 'mounted'),
    wire('jnCall', 'done', 'jnAsking', 'off'),
    wire('jnAsking', 'state', 'jnForm', 'mounted'),
    wire('jnRules', 'onClick', 'jnToRules', 'navigate')
  ]
};

// ── /Pages/SignIn ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Where the link brings them back: this app's start, on whatever address it is served from. */
export const COME_BACK = `if (typeof window !== 'undefined') Outputs.redirect = window.location.origin + '/';`;

const SIGN_IN: PageComponent = {
  path: GRAM_PAGES.signIn,
  description: 'Sign in: a link by email; a password for an admin who made one',
  nodes: [
    ...gramShell('si', 'Sign in', 'sign-in', null, 480),
    text('siTitle', 'Heading', 'siBody', 'Sign in', GM_TITLE),
    text('siLead', 'How', 'siBody', 'We’ll email you a link. Press it and you’re in. No password.', GM_FINE),
    field('siEmail', 'siBody', 'Your email', { type: 'email' }),
    button('siSend', 'Email me a link', 'siBody', 'Email me a link', GM_MAIN),
    text('siSent', 'If that address belongs to a member', 'siBody', 'If that address belongs to a member, a link is on its way. It works once.', { ...GM_FINE, color: 'var(--foreground)', mounted: false }),
    text('siFailed', 'The request itself failed', 'siBody', 'The link couldn’t be sent. Try again in a minute.', { ...GM_REFUSED, mounted: false }),
    group('siAdmin', 'An admin’s password', 'siBody', column({ rowGap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderStyle: 'solid', borderColor: 'var(--border)', borderTopWidth: px(1), borderBottomWidth: px(0), borderLeftWidth: px(0), borderRightWidth: px(0) })),
    text('siAdminLead', 'Admins', 'siAdmin', 'An admin who set a password can use it with the email above.', GM_FINE),
    field('siPassword', 'siAdmin', 'Password', { type: 'password' }),
    button('siGo', 'Sign in with the password', 'siAdmin', 'Sign in with the password', GM_LINE),
    text('siError', 'What went wrong', 'siAdmin', '', GM_REFUSED),
    button('siJoin', 'Ask to join', 'siBody', 'New here? Ask to join', GM_LINK),
    fn('siBack', 'Come back to this app', COME_BACK, []),
    { id: 'siRequest', type: 'net.noodl.user.RequestMagicLink', label: 'Ask the backend to email a link' },
    { id: 'siSentSw', type: 'Switch', label: 'The request was taken' },
    { id: 'siFailSw', type: 'Switch', label: 'The request failed' },
    { id: 'siLogIn', type: 'net.noodl.user.LogIn', label: 'Sign in with the password' },
    fn('siRoute', 'Where they belong', GRAM_ROUTE, ['stranger', 'waiting', 'member', 'admin']),
    go('siToWaiting', 'To waiting', GRAM_PAGES.waiting),
    go('siToFeed', 'To the feed', GRAM_PAGES.feed),
    go('siToQueue', 'To the admins’ queue', GRAM_PAGES.queue),
    go('siToJoin', 'To ask to join', GRAM_PAGES.join)
  ],
  connections: [
    wire('siRoot', 'didMount', 'siBack', 'run'),
    wire('siBack', 'out-redirect', 'siRequest', 'redirect'),
    wire('siEmail', 'onTextChanged', 'siRequest', 'email'),
    wire('siSend', 'onClick', 'siRequest', 'send'),
    wire('siSend', 'onClick', 'siFailSw', 'off'),
    wire('siRequest', 'done', 'siSentSw', 'on'),
    wire('siRequest', 'failure', 'siFailSw', 'on'),
    wire('siRequest', 'failure', 'siSentSw', 'off'),
    wire('siSentSw', 'state', 'siSent', 'mounted'),
    wire('siFailSw', 'state', 'siFailed', 'mounted'),
    wire('siEmail', 'onTextChanged', 'siLogIn', 'username'),
    wire('siPassword', 'onTextChanged', 'siLogIn', 'password'),
    wire('siGo', 'onClick', 'siLogIn', 'login'),
    wire('siPassword', 'onEnter', 'siLogIn', 'login'),
    wire('siLogIn', 'error', 'siError', 'text'),
    wire('siLogIn', 'done', 'siRoute', 'run'),
    wire('siRoute', 'out-problem', 'siError', 'text'),
    wire('siRoute', 'out-waiting', 'siToWaiting', 'navigate'),
    wire('siRoute', 'out-member', 'siToFeed', 'navigate'),
    wire('siRoute', 'out-admin', 'siToQueue', 'navigate'),
    wire('siJoin', 'onClick', 'siToJoin', 'navigate')
  ]
};

// ── /Pages/Waiting ─────────────────────────────────────────────────────────────────────────────────────────────────

export const WAITING_LOAD = `${GRAM_READ}
var who = await me();
if (!who) { Outputs.problem = 'Sign in to see where your request is.'; Outputs.refused = true; Outputs.ok = false; return; }
if (who.status === 'approved') { Outputs.isIn(); return; }
Outputs.thanks = 'Thanks, ' + String(who.name || '').trim().split(' ')[0] + '. You’re on the list.';
Outputs.refused = false;
Outputs.ok = true;`;

const WAITING: PageComponent = {
  path: GRAM_PAGES.waiting,
  description: 'Waiting to be let in',
  nodes: [
    ...gramShell('wt', 'Waiting to be let in', 'waiting', null, 480),
    group('wtContent', 'On the list', 'wtBody', column({ rowGap: 'var(--space-3)', alignItems: 'center', paddingTop: 'var(--space-8)', mounted: false })),
    text('wtThanks', 'Thanks', 'wtContent', '', { ...GM_TITLE, textAlignX: 'center' }),
    text('wtFine', 'What happens next', 'wtContent', 'An admin lets each new member in, usually within a day. We’ll send you a message when you’re in.', { ...GM_FINE, textAlignX: 'center' }),
    button('wtRules', 'Read the community rules', 'wtContent', 'Read the community rules', GM_LINE_SMALL),
    ...refusedBox('wt'),
    fn('wtLoad', 'Their name; in already?', WAITING_LOAD, ['isIn']),
    go('wtToRules', 'To the rules', GRAM_PAGES.rules),
    go('wtToStart', 'In already: to the start, which sends them on', GRAM_PAGES.welcome)
  ],
  connections: [
    wire('wtRoot', 'didMount', 'wtLoad', 'run'),
    wire('wtLoad', 'out-ok', 'wtContent', 'mounted'),
    wire('wtLoad', 'out-thanks', 'wtThanks', 'text'),
    wire('wtLoad', 'out-isIn', 'wtToStart', 'navigate'),
    ...refusedWires('wt', 'wtLoad'),
    wire('wtRules', 'onClick', 'wtToRules', 'navigate')
  ]
};

// ── Back ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Back where they came from (the rules, a report: pages opened from anywhere). */
export const GO_BACK = `if (typeof window !== 'undefined') window.history.back();`;

// ── /Pages/SetUp ───────────────────────────────────────────────────────────────────────────────────────────────────

export const SET_UP_GATHER = `Outputs.setup = { setupToken: Inputs.token || '', community: Inputs.community || '', name: Inputs.name || '', email: Inputs.email || '', password: Inputs.password || '' };
Outputs.go();`;

const SET_UP: PageComponent = {
  path: GRAM_PAGES.setUp,
  description: 'Set up: the community and its first admin, with the setup token',
  nodes: [
    ...gramShell('su', 'Set up', 'setup', null, 480),
    text('suTitle', 'Heading', 'suBody', 'Set up the community', GM_TITLE),
    text('suLead', 'What this does', 'suBody', 'This names the community and makes you its first admin. It works once, with the setup token from whoever started the backend.', GM_FINE),
    field('suToken', 'suBody', 'Setup token', { type: 'password' }),
    field('suCommunity', 'suBody', 'The community’s name'),
    field('suName', 'suBody', 'Your name'),
    field('suEmail', 'suBody', 'Your email', { type: 'email' }),
    field('suPassword', 'suBody', 'A password (8 characters or more)', { type: 'password' }),
    button('suGo', 'Set up', 'suBody', 'Set up the community', GM_MAIN),
    text('suError', 'What went wrong', 'suBody', '', GM_REFUSED),
    fn('suGather', 'The form, as one setup', SET_UP_GATHER, ['go'], ['token', 'community', 'name', 'email', 'password']),
    call('suCall', 'setUpCommunity(setup)', FN_SET_UP_COMMUNITY),
    { id: 'suLogIn', type: 'net.noodl.user.LogIn', label: 'Sign the new admin in' },
    go('suToQueue', 'To the admins’ queue', GRAM_PAGES.queue)
  ],
  connections: [
    wire('suToken', 'onTextChanged', 'suGather', 'in-token'),
    wire('suCommunity', 'onTextChanged', 'suGather', 'in-community'),
    wire('suName', 'onTextChanged', 'suGather', 'in-name'),
    wire('suEmail', 'onTextChanged', 'suGather', 'in-email'),
    wire('suPassword', 'onTextChanged', 'suGather', 'in-password'),
    wire('suEmail', 'onTextChanged', 'suLogIn', 'username'),
    wire('suPassword', 'onTextChanged', 'suLogIn', 'password'),
    wire('suGo', 'onClick', 'suGather', 'run'),
    wire('suGather', 'out-setup', 'suCall', 'in-setup'),
    wire('suGather', 'out-go', 'suCall', 'call'),
    wire('suCall', 'error', 'suError', 'text'),
    wire('suCall', 'done', 'suLogIn', 'login'),
    wire('suLogIn', 'error', 'suError', 'text'),
    wire('suLogIn', 'done', 'suToQueue', 'navigate')
  ]
};

// ── /Pages/Admin/Queue ─────────────────────────────────────────────────────────────────────────────────────────────

/** Say the members changed, so the page reads again (whichever row changed them). */
export const MEMBERS_STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

export const QUEUE_LOAD = `${GRAM_READ}
// Read so that a row's change runs the list again.
var version = Inputs.changed;
try {
  await adminsOnly();
  var waiting = await all('Member', { status: { equalTo: 'waiting' } });
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
waiting = waiting.filter(function (m) { return !m.endedAt; }).sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
Outputs.rows = waiting.map(function (m) {
  return { id: m.objectId, name: m.name || '', initials: initials(m.name), shade: shade(m.objectId), sub: 'Confirmed 13 or older · asked ' + ago(m.createdAt) };
});
Outputs.heading = 'New members (' + waiting.length + ')';
Outputs.empty = waiting.length === 0;
// Slice 5's shots: an empty list drew its border as a line, and the note on No stood alone.
Outputs.hasRows = waiting.length > 0;
Outputs.refused = false;
Outputs.ok = true;`;

// The queue's page grew moderation in slice 5 and lives in `two005ModeratePages.ts`; its new members are this script.

// ── /Admin/NewMemberRow ────────────────────────────────────────────────────────────────────────────────────────────

/** Let in: the app's own address goes with it, so the message they get links back here. */
export const LET_IN_GATHER = `Outputs.letIn = { memberId: Inputs.id, appUrl: typeof window !== 'undefined' ? window.location.origin : '' };
Outputs.go();`;
export const TURN_AWAY_GATHER = `Outputs.turnAway = { memberId: Inputs.id };
Outputs.go();`;
/** What the admin is told once the row has gone from the list. */
export const LET_IN_NOTE = `Outputs.note = Inputs.emailed === 'yes'
  ? Inputs.name + ' is in, and has been sent a message to say so.'
  : Inputs.name + ' is in. The message didn’t go: email isn’t set up on the backend yet, so tell them yourself.';
Outputs.at = String(Date.now());
Outputs.go();`;
export const TURN_AWAY_NOTE = `Outputs.note = Inputs.name + ' wasn’t let in.';
Outputs.at = String(Date.now());
Outputs.go();`;

const NEW_MEMBER_ROW: PageComponent = {
  path: GRAM_COMPONENTS.newMember,
  description: 'One person waiting: Let in, or No',
  nodes: [
    group('nmRoot', 'Someone waiting', undefined, column({ paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', rowGap: 'var(--space-2)', backgroundColor: 'var(--surface)' })),
    group('nmLine', 'Who, and the two answers', 'nmRoot', rowOf({ columnGap: 'var(--space-2-5)' })),
    group('nmAv', 'Their initials', 'nmLine', { width: px(34), height: px(34), sizeMode: 'explicit', cssClassName: 'gm-av' }),
    text('nmInitials', 'Initials', 'nmAv', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', color: 'var(--primary-foreground)', sizeMode: 'contentSize' }),
    group('nmWho', 'Name, and when they asked', 'nmLine', column({ cssClassName: 'gm-grow' })),
    text('nmName', 'Name', 'nmWho', '', GM_NAME),
    text('nmSub', 'Confirmed 13 or older, and when', 'nmWho', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', cssClassName: 'gm-wrap' }),
    button('nmLetIn', 'Let in', 'nmLine', 'Let in', GM_OK_SMALL),
    button('nmNo', 'No', 'nmLine', 'No', GM_LINE_SMALL),
    text('nmError', 'What went wrong', 'nmRoot', '', { ...GM_REFUSED, mounted: false }),
    {
      id: 'nmIn',
      type: 'Component Inputs',
      label: 'One person waiting',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'initials', type: 'string', plug: 'output' },
        { name: 'shade', type: 'string', plug: 'output' },
        { name: 'sub', type: 'string', plug: 'output' }
      ]
    },
    fn('nmLetInGather', 'Let this person in', LET_IN_GATHER, ['go'], ['id']),
    call('nmLetInCall', 'letIn(letIn)', FN_LET_IN),
    fn('nmLetInNote', 'Say who is in, and whether they were told', LET_IN_NOTE, ['go'], ['name', 'emailed']),
    fn('nmNoGather', 'Don’t let this person in', TURN_AWAY_GATHER, ['go'], ['id']),
    call('nmNoCall', 'turnAway(turnAway)', FN_TURN_AWAY),
    fn('nmNoNote', 'Say who wasn’t let in', TURN_AWAY_NOTE, ['go'], ['name']),
    { id: 'nmFailed', type: 'Switch', label: 'The last answer was refused' },
    { id: 'nmSay', type: 'Set Variable', label: 'What happened last', parameters: { name: 'membersNote', setWith: 'string' } },
    { id: 'nmChanged', type: 'Set Variable', label: 'The members changed', parameters: { name: 'membersChanged', setWith: 'string' } }
  ],
  connections: [
    wire('nmIn', 'name', 'nmName', 'text'),
    wire('nmIn', 'initials', 'nmInitials', 'text'),
    wire('nmIn', 'shade', 'nmAv', 'backgroundColor'),
    wire('nmIn', 'sub', 'nmSub', 'text'),
    wire('nmIn', 'id', 'nmLetInGather', 'in-id'),
    wire('nmIn', 'id', 'nmNoGather', 'in-id'),
    wire('nmIn', 'name', 'nmLetInNote', 'in-name'),
    wire('nmIn', 'name', 'nmNoNote', 'in-name'),
    wire('nmLetIn', 'onClick', 'nmLetInGather', 'run'),
    wire('nmLetInGather', 'out-letIn', 'nmLetInCall', 'in-letIn'),
    wire('nmLetInGather', 'out-go', 'nmLetInCall', 'call'),
    wire('nmLetInCall', 'out-emailed', 'nmLetInNote', 'in-emailed'),
    wire('nmLetInCall', 'done', 'nmLetInNote', 'run'),
    wire('nmNo', 'onClick', 'nmNoGather', 'run'),
    wire('nmNoGather', 'out-turnAway', 'nmNoCall', 'in-turnAway'),
    wire('nmNoGather', 'out-go', 'nmNoCall', 'call'),
    wire('nmNoCall', 'done', 'nmNoNote', 'run'),
    ...['nmLetInCall', 'nmNoCall'].flatMap((c) => [wire(c, 'error', 'nmError', 'text'), wire(c, 'failure', 'nmFailed', 'on'), wire(c, 'done', 'nmFailed', 'off')]),
    wire('nmFailed', 'state', 'nmError', 'mounted'),
    ...['nmLetInNote', 'nmNoNote'].flatMap((n) => [
      wire(n, 'out-note', 'nmSay', 'value'),
      wire(n, 'out-go', 'nmSay', 'do'),
      wire(n, 'out-at', 'nmChanged', 'value'),
      wire(n, 'out-go', 'nmChanged', 'do')
    ])
  ]
};

// ── /Pages/Admin/Admins ────────────────────────────────────────────────────────────────────────────────────────────

export const ADMINS_LOAD = `${GRAM_READ}
// Read so that a row's change runs the list again.
var version = Inputs.changed;
try {
  await adminsOnly();
  var members = await all('Member', { status: { equalTo: 'approved' } });
} catch (e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; return; }
members = members.filter(function (m) { return !m.endedAt; });
members.sort(function (a, b) {
  if ((a.role === 'admin') !== (b.role === 'admin')) return a.role === 'admin' ? -1 : 1;
  return String(a.name || '').localeCompare(String(b.name || ''));
});
Outputs.rows = members.map(function (m) {
  var admin = m.role === 'admin';
  return { id: m.objectId, name: m.name || '', initials: initials(m.name), shade: shade(m.objectId), sub: admin ? 'Admin' : 'Member', canMake: !admin };
});
Outputs.refused = false;
Outputs.ok = true;`;

const ADMINS: PageComponent = {
  path: GRAM_PAGES.admins,
  description: 'The admins, and making a member one',
  nodes: [
    ...gramShell('ad', 'Admins', 'admin/admins', 'Admin', 720),
    group('adContent', 'Admins', 'adBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    button('adBack', 'Back', 'adContent', '← Waiting for you', GM_LINK),
    text('adTitle', 'Heading', 'adContent', 'Admins', GM_TITLE),
    text('adLead', 'What an admin does', 'adContent', 'Admins let people in, hide posts and comments, block members and write devotionals. Make a member you trust an admin.', GM_FINE),
    group('adList', 'Everyone who is in', 'adContent', column({ cssClassName: 'gm-list' })),
    { id: 'adEach', type: 'For Each', label: 'One row per member', parent: 'adList', parameters: { template: GRAM_COMPONENTS.adminRow } },
    ...refusedBox('ad'),
    fn('adLoad', 'Everyone who is in, admins first', ADMINS_LOAD, []),
    { id: 'adVersion', type: 'Variable2', label: 'The members changed', parameters: { name: 'membersChanged' } },
    go('adToQueue', 'To the admins’ queue', GRAM_PAGES.queue)
  ],
  connections: [
    wire('adRoot', 'didMount', 'adLoad', 'run'),
    wire('adVersion', 'value', 'adLoad', 'in-changed'),
    wire('adLoad', 'out-ok', 'adContent', 'mounted'),
    wire('adLoad', 'out-rows', 'adEach', 'items'),
    ...refusedWires('ad', 'adLoad'),
    wire('adBack', 'onClick', 'adToQueue', 'navigate')
  ]
};

export const MAKE_ADMIN_GATHER = `Outputs.admin = { memberId: Inputs.id };
Outputs.go();`;

const MEMBER_ROW: PageComponent = {
  path: GRAM_COMPONENTS.adminRow,
  description: 'One member: an admin, or Make admin',
  nodes: [
    group('mrRoot', 'A member', undefined, column({ paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', rowGap: 'var(--space-2)', backgroundColor: 'var(--surface)' })),
    group('mrLine', 'Who, and Make admin', 'mrRoot', rowOf({ columnGap: 'var(--space-2-5)' })),
    group('mrAv', 'Their initials', 'mrLine', { width: px(34), height: px(34), sizeMode: 'explicit', cssClassName: 'gm-av' }),
    text('mrInitials', 'Initials', 'mrAv', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', color: 'var(--primary-foreground)', sizeMode: 'contentSize' }),
    group('mrWho', 'Name, and admin or member', 'mrLine', column({ cssClassName: 'gm-grow' })),
    text('mrName', 'Name', 'mrWho', '', GM_NAME),
    text('mrSub', 'Admin or member', 'mrWho', '', { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }),
    button('mrMake', 'Make admin', 'mrLine', 'Make admin', { ...GM_LINE_SMALL, mounted: false }),
    text('mrError', 'What went wrong', 'mrRoot', '', { ...GM_REFUSED, mounted: false }),
    {
      id: 'mrIn',
      type: 'Component Inputs',
      label: 'One member',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'initials', type: 'string', plug: 'output' },
        { name: 'shade', type: 'string', plug: 'output' },
        { name: 'sub', type: 'string', plug: 'output' },
        { name: 'canMake', type: 'boolean', plug: 'output' }
      ]
    },
    fn('mrGather', 'Make this member an admin', MAKE_ADMIN_GATHER, ['go'], ['id']),
    call('mrCall', 'makeAdmin(admin)', FN_MAKE_ADMIN),
    { id: 'mrFailed', type: 'Switch', label: 'The last try was refused' },
    fn('mrStamp', 'Say the members changed', MEMBERS_STAMP, ['go']),
    { id: 'mrChanged', type: 'Set Variable', label: 'The members changed', parameters: { name: 'membersChanged', setWith: 'string' } }
  ],
  connections: [
    wire('mrIn', 'name', 'mrName', 'text'),
    wire('mrIn', 'initials', 'mrInitials', 'text'),
    wire('mrIn', 'shade', 'mrAv', 'backgroundColor'),
    wire('mrIn', 'sub', 'mrSub', 'text'),
    wire('mrIn', 'canMake', 'mrMake', 'mounted'),
    wire('mrIn', 'id', 'mrGather', 'in-id'),
    wire('mrMake', 'onClick', 'mrGather', 'run'),
    wire('mrGather', 'out-admin', 'mrCall', 'in-admin'),
    wire('mrGather', 'out-go', 'mrCall', 'call'),
    wire('mrCall', 'error', 'mrError', 'text'),
    wire('mrCall', 'failure', 'mrFailed', 'on'),
    wire('mrCall', 'done', 'mrFailed', 'off'),
    wire('mrFailed', 'state', 'mrError', 'mounted'),
    wire('mrCall', 'done', 'mrStamp', 'run'),
    wire('mrStamp', 'out-at', 'mrChanged', 'value'),
    wire('mrStamp', 'out-go', 'mrChanged', 'do')
  ]
};

// ── App ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const GRAM_APP_NODES: Node[] = [
  group('appRoot', 'App', undefined, { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', backgroundColor: 'var(--background)' }),
  { id: 'appRouter', type: 'Router', label: 'Main router', parent: 'appRoot', parameters: { name: 'Main' } },
  { id: 'appCss', type: 'CSS Definition', label: 'The two faces, the focus ring, the list (two005Look.ts)', parameters: { style: TWO005_CSS } }
];

/** Leaves first; then the pages, the start first (the router opens on the first page the plan registers). */
export const GRAM_SLICE1_LEAVES: PageComponent[] = [BAR, NEW_MEMBER_ROW, MEMBER_ROW];
/** The feed itself is slice 2's (`two005FeedPages.ts`), at `GRAM_PAGES.feed`. */
/** The rules and the queue are slice 5's now (`two005ModeratePages.ts`); the assembler places them after these. */
export const GRAM_SLICE1_PAGES: PageComponent[] = [WELCOME, JOIN, SIGN_IN, WAITING, SET_UP, ADMINS];
