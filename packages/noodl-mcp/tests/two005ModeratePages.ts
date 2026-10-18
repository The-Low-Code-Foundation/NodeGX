/**
 * TWO-005 slice 5 — the community app's moderation pages, held to the approved picture (`look/gram.html`: the admins'
 * queue "Waiting for you", its "Reported" list and the note on hiding; "Read the community rules").
 *
 * - **Report** (`/Pages/Report`, at `report?post=…` or `report?comment=…`): any member, from a post's page or a
 *   comment. The world's reasons, a few words when it's something else, and "the member won't see who reported it".
 * - **The admins' queue** (`/Pages/Admin/Queue`): slice 1's new members, then **Reported** (one row per post or
 *   comment, a child shown without a parent's yes first, then the newest), **Hidden** (still the admins', with why)
 *   and **Blocked** (each opens the profile, where they're let back). It moved here from `two005Pages.ts`: the queue is
 *   where moderation happens.
 * - **Look** (`/Pages/Admin/Look`, at `admin/look?post=…` or `?comment=…`): one post or comment as an admin sees it,
 *   its state, every report on it (who and why: admins only), Hide from members with why, or Bring it back.
 * - **Community rules** (`/Pages/Rules`): everyone reads them; an admin writes them there (it moved here too).
 *
 * Blocking is on a member's profile (`two005ProfilePages.ts`); Report, Take down and Hide… are on a post's page and
 * each comment (`two005FeedPages.ts`). Every write is a function (`two005Moderate.ts`).
 *
 * @module noodl-mcp/tests/two005ModeratePages
 */
import { NOT_LET_IN } from './two005Cloud';
import { COMMENT_REASONS, FN_HIDE, FN_REPORT, FN_WRITE_RULES, MOST_NOTE, MOST_REASON, MOST_RULES, POST_REASONS } from './two005Moderate';
import { FEED_COMPONENTS, FEED_READ, LOOK_PAGE, MEMBER_PAGE, REPORT_PAGE } from './two005FeedPages';
import { GM_FINE, GM_LINE, GM_LINE_SMALL, GM_LINK, GM_MAIN, GM_NAME, GM_REFUSED, GM_TITLE, GO_BACK, GRAM_COMPONENTS, GRAM_PAGES, GRAM_READ, gramShell, QUEUE_LOAD } from './two005Pages';
import { button, call, column, DROPDOWN, fn, go, group, input, Node, PageComponent, pct, px, rowOf, text, Wire, wire } from './two003Pages';

export const MODERATE_PAGES = {
  report: REPORT_PAGE,
  look: LOOK_PAGE,
  queue: GRAM_PAGES.queue,
  rules: GRAM_PAGES.rules
};

export const MODERATE_COMPONENTS = {
  queueRow: '/Admin/QueueRow',
  reportLine: '/Admin/ReportLine'
};

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
const META = { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', cssClassName: 'gm-wrap' };
const HEADING = { fontSize: 'var(--text-base)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)' };
/** A pill: its colours are its class (a Text has no box of its own), wired per row. */
const PILL = { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', sizeMode: 'contentSize', cssClassName: 'gm-pill' };
/** The plum box the picture puts "Hiding" in (`.note-pop`): the gold rule box's shape. */
const NOTE = column({ rowGap: 'var(--space-1)', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', cssClassName: 'gm-rule' });

/** What a page shows when its read was refused: the reason, and the way to sign in. */
function refused(p: string): Node[] {
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

/** The reasons, for a script: words for a value, and the order the queue ranks them in (the child's first). */
const REASONS_READ = `var REASONS = ${JSON.stringify(POST_REASONS)};
function reasonWords(v) { var r = REASONS.filter(function (x) { return x.value === v; })[0]; return r ? r.words : 'Something else'; }
function rank(v) { var i = REASONS.map(function (x) { return x.value; }).indexOf(v); return i < 0 ? REASONS.length : i; }
function pillOf(v) { return v === 'child-photo' ? 'gm-pill gm-pill-bad' : 'gm-pill gm-pill-gold'; }
function cut(words, n) { var w = String(words || '').trim(); return w.length > n ? w.slice(0, n - 1).trim() + '…' : w; }
`;

// ── /Pages/Report ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What is being reported, as a member may see it: a post in the feed, or a comment in the feed under one. Its own
 * reasons (a comment has no photo). Your own isn't reported: you take it down.
 */
export const REPORT_LOAD = `${FEED_READ}
${REASONS_READ}
var isComment = typeof Inputs.comment === 'string' && Inputs.comment !== '';
var id = String((isComment ? Inputs.comment : Inputs.post) || '');
var who = await me();
if (!who) { refused({ error: 'Sign in to report a post.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.refused = false;
if (!id) { Outputs.gone = true; Outputs.ok = false; return; }
try {
  var members = await all('Member');
  var row = null;
  var post = null;
  if (isComment) {
    row = (await all('Comment', { objectId: { equalTo: id } }))[0] || null;
    post = row ? shown(await all('Post', { objectId: { equalTo: idOf(row.post) } }), members)[0] || null : null;
  } else {
    row = post = shown(await all('Post', { objectId: { equalTo: id } }), members)[0] || null;
  }
} catch (e) { refused(e); return; }
var by = {};
members.forEach(function (m) { by[m.objectId] = m; });
var author = row ? by[idOf(row.member)] : null;
if (!row || !post || row.endedAt || !author || author.endedAt) { Outputs.gone = true; Outputs.ok = false; return; }
var own = author.objectId === String(who.id || '');
var words = cut(isComment ? row.text : row.caption, 140);
var what = isComment ? 'A comment by ' : row.kind === 'prayer' ? 'A prayer request by ' : 'A post by ';
Outputs.kind = isComment ? 'comment' : 'post';
Outputs.id = id;
Outputs.title = isComment ? 'Report a comment' : 'Report a post';
Outputs.what = what + (author.name || 'a member') + (words ? ': “' + words + '”' : ', photos only');
Outputs.own = own;
Outputs.other = !own;
// No reason chosen yet: the Dropdown's own placeholder says "Choose why", and its hidden empty option holds the place.
Outputs.reasons = (isComment ? ${JSON.stringify(COMMENT_REASONS)} : REASONS).map(function (r) { return { Label: r.words, Value: r.value }; });
Outputs.thanks = 'Thanks. The admins will look at it. ' + (firstName(author) || 'The member') + ' won’t see who reported it.';
Outputs.gone = false;
Outputs.ok = true;`;

export const REPORT_GATHER = `var reason = typeof Inputs.reason === 'string' ? Inputs.reason : '';
var note = typeof Inputs.note === 'string' ? Inputs.note.trim() : '';
if (!reason) { Outputs.problem = 'Choose why.'; Outputs.held(); return; }
if (reason === 'other' && !note) { Outputs.problem = 'Say in a few words what’s wrong.'; Outputs.held(); return; }
if (note.length > ${MOST_NOTE}) { Outputs.problem = 'A note of ${MOST_NOTE} characters or fewer. This one has ' + note.length + '.'; Outputs.held(); return; }
Outputs.problem = '';
var r = { reason: reason, note: note };
if (Inputs.kind === 'comment') r.commentId = Inputs.id; else r.postId = Inputs.id;
Outputs.report = r;
Outputs.go();`;

const REPORT: PageComponent = {
  path: MODERATE_PAGES.report,
  description: 'Report a post or a comment to the admins, saying why',
  nodes: [
    ...gramShell('rp', 'Report', 'report', null, 560),
    { id: 'rpUrl', type: 'PageInputs', label: 'What is reported', parameters: { queryParams: 'post,comment' } },
    button('rpBack', 'Back', 'rpBody', '← Back', GM_LINK),
    group('rpContent', 'Report', 'rpBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('rpTitle', 'Heading', 'rpContent', 'Report a post', GM_TITLE),
    text('rpWhat', 'What is reported', 'rpContent', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap' }),
    text('rpOwn', 'Your own', 'rpContent', 'This is yours. Take it down from its page instead: members stop seeing it, and an admin can bring it back.', { ...GM_FINE, mounted: false }),
    group('rpForm', 'Why, and a note', 'rpContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    // 🔴 Value set to nothing on purpose: unset, a Dropdown's value output stays its default items' first ("Option 1")
    // after a wired Items list replaces them, while the screen shows the placeholder (P121-TWO005-DROPDOWNSTALE).
    { id: 'rpReason', type: DROPDOWN, label: 'Why', parent: 'rpForm', parameters: { ...FIELD, label: 'Why are you reporting it?', placeholder: 'Choose why', value: '' } },
    field('rpNote', 'rpForm', `Anything the admins should know (${MOST_NOTE} characters at most)`, { type: 'textArea' }),
    text('rpFine', 'Who sees it', 'rpForm', 'Only the admins see your report and who sent it. The member you report never does.', GM_FINE),
    button('rpSend', 'Send to the admins', 'rpForm', 'Send to the admins', GM_MAIN),
    text('rpError', 'What went wrong', 'rpForm', '', GM_REFUSED),
    group('rpThanks', 'Sent', 'rpBody', column({ rowGap: 'var(--space-3)', paddingTop: 'var(--space-4)', mounted: false })),
    text('rpThanksWords', 'Thanks', 'rpThanks', '', { ...GM_TITLE, fontSize: 'var(--text-xl)' }),
    text('rpThanksFine', 'What happens next', 'rpThanks', 'An admin looks at every report. A post or comment that breaks the rules is hidden from the members.', GM_FINE),
    button('rpDone', 'Back', 'rpThanks', '← Back', GM_LINE_SMALL),
    text('rpGone', 'Not in the feed', 'rpBody', 'This isn’t in the feed any more.', { ...GM_FINE, mounted: false }),
    ...refused('rp'),
    fn('rpLoad', 'What is reported, and its reasons', REPORT_LOAD, ['waiting']),
    fn('rpGather', 'The report', REPORT_GATHER, ['go', 'held'], ['kind', 'id', 'reason', 'note']),
    call('rpCall', 'report(report)', FN_REPORT),
    { id: 'rpSent', type: 'Switch', label: 'Sent' },
    { id: 'rpSending', type: 'Switch', label: 'Not sent yet', parameters: { onFromStart: true } },
    fn('rpGoBack', 'Back where they came from', GO_BACK, []),
    go('rpToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    // Runs once on arrival, and again as the address's post or comment arrives (NEVERRUNS: an optional URL value).
    wire('rpRoot', 'didMount', 'rpLoad', 'run'),
    wire('rpUrl', 'pm-post', 'rpLoad', 'in-post'),
    wire('rpUrl', 'pm-comment', 'rpLoad', 'in-comment'),
    wire('rpLoad', 'out-ok', 'rpContent', 'mounted'),
    wire('rpLoad', 'out-gone', 'rpGone', 'mounted'),
    wire('rpLoad', 'out-band', 'rpBar', 'band'),
    wire('rpLoad', 'out-waiting', 'rpToWaiting', 'navigate'),
    ...refusedWires('rp', 'rpLoad'),
    wire('rpLoad', 'out-title', 'rpTitle', 'text'),
    wire('rpLoad', 'out-what', 'rpWhat', 'text'),
    wire('rpLoad', 'out-own', 'rpOwn', 'mounted'),
    wire('rpLoad', 'out-other', 'rpForm', 'mounted'),
    wire('rpLoad', 'out-reasons', 'rpReason', 'items'),
    wire('rpLoad', 'out-thanks', 'rpThanksWords', 'text'),
    wire('rpLoad', 'out-kind', 'rpGather', 'in-kind'),
    wire('rpLoad', 'out-id', 'rpGather', 'in-id'),
    wire('rpReason', 'value', 'rpGather', 'in-reason'),
    wire('rpNote', 'onTextChanged', 'rpGather', 'in-note'),
    wire('rpSend', 'onClick', 'rpGather', 'run'),
    wire('rpGather', 'out-problem', 'rpError', 'text'),
    wire('rpGather', 'out-report', 'rpCall', 'in-report'),
    wire('rpGather', 'out-go', 'rpCall', 'call'),
    wire('rpCall', 'error', 'rpError', 'text'),
    wire('rpCall', 'done', 'rpSent', 'on'),
    wire('rpSent', 'state', 'rpThanks', 'mounted'),
    wire('rpCall', 'done', 'rpSending', 'off'),
    wire('rpSending', 'state', 'rpContent', 'mounted'),
    wire('rpBack', 'onClick', 'rpGoBack', 'run'),
    wire('rpDone', 'onClick', 'rpGoBack', 'run')
  ]
};

// ── /Pages/Admin/Queue ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The queue's moderation: what members reported and nobody has dealt with (one row per post or comment, by person,
 * the child's reason first and then the newest), what is hidden, and who is blocked. Admins read every row, the hidden
 * ones and their reasons included (their ACL); the newest thousand of each are read.
 */
export const MODERATION_LOAD = `${FEED_READ}
${REASONS_READ}
// Read so that a hide, a block or a let-back anywhere runs the lists again.
var version = [Inputs.changed, Inputs.members];
try {
  await adminsOnly();
  var members = await all('Member');
  var posts = await all('Post');
  var comments = await all('Comment');
  var reports = await all('Report');
  var commentReports = await all('CommentReport');
} catch (e) { refused(e); return; }
var by = {}, byPost = {}, byComment = {};
members.forEach(function (m) { by[m.objectId] = m; });
posts.forEach(function (p) { byPost[p.objectId] = p; });
comments.forEach(function (c) { byComment[c.objectId] = c; });
function out(row) { var m = by[idOf(row.member)]; return !!row.endedAt || !m || !!m.endedAt; }
function off(kind, row) { return out(row) || (kind === 'comment' && (!byPost[idOf(row.post)] || out(byPost[idOf(row.post)]))); }
function thing(kind, row) { return kind === 'comment' ? 'Comment' : row.kind === 'prayer' ? 'Prayer request' : 'Post'; }
function byWhom(row) { return (by[idOf(row.member)] || {}).name || 'a member'; }
function when(v) { return String((v && (v.iso || v)) || ''); }
/** Why a member is out: blocked, and why; someone not let in says only that, unless the admin wrote more. */
function outWhy(m) {
  var why = m.blockedReason || '';
  if (m.status === 'waiting') return 'Not let in' + (why && why !== '${NOT_LET_IN}' ? ': ' + why : '');
  return 'Blocked: ' + (why || 'no reason given');
}
function grouped(list, field, table, kind) {
  var seen = {};
  list.forEach(function (r) {
    var id = idOf(r[field]);
    var row = table[id];
    if (!row) return;
    var g = seen[id] || (seen[id] = { id: id, kind: kind, row: row, people: {}, reasons: {}, latest: '' });
    var u = idOf(r.doneBy);
    if (!g.people[u]) { g.people[u] = true; g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1; }
    var at = when(r.at) || when(r.createdAt);
    if (at > g.latest) g.latest = at;
  });
  return Object.keys(seen).map(function (k) { return seen[k]; });
}
// The child's reason wins whenever anyone gave it; otherwise the reason most people gave.
function top(g) { return Object.keys(g.reasons).sort(function (a, b) { return (a === 'child-photo' ? -1 : 0) - (b === 'child-photo' ? -1 : 0) || g.reasons[b] - g.reasons[a] || rank(a) - rank(b); })[0]; }
var open = grouped(reports, 'post', byPost, 'post').concat(grouped(commentReports, 'comment', byComment, 'comment')).filter(function (g) { return !off(g.kind, g.row); });
open.forEach(function (g) { g.top = top(g); });
open.sort(function (a, b) { return (a.top === 'child-photo' ? 0 : 1) - (b.top === 'child-photo' ? 0 : 1) || b.latest.localeCompare(a.latest); });
Outputs.reported = open.map(function (g) {
  var n = Object.keys(g.people).length;
  return { id: g.kind + ':' + g.id, kind: g.kind, itemId: g.id, pill: reasonWords(g.top), pillClass: pillOf(g.top), hasPill: true, title: '', hasTitle: false, sub: thing(g.kind, g.row) + ' by ' + byWhom(g.row) + ' · reported by ' + plural(n, 'member', 'members') + ' · ' + ago(g.latest), look: 'Look' };
});
Outputs.reportedHeading = 'Reported (' + open.length + ')';
Outputs.noneReported = open.length === 0;
var hidden = posts.filter(function (p) { return p.endedAt; }).map(function (p) { return { kind: 'post', row: p }; })
  .concat(comments.filter(function (c) { return c.endedAt; }).map(function (c) { return { kind: 'comment', row: c }; }));
hidden.sort(function (a, b) { return when(b.row.endedAt).localeCompare(when(a.row.endedAt)); });
Outputs.hidden = hidden.map(function (h) {
  return { id: h.kind + ':' + h.row.objectId, kind: h.kind, itemId: h.row.objectId, pill: 'Hidden', pillClass: 'gm-pill gm-pill-quiet', hasPill: true, title: '', hasTitle: false, sub: thing(h.kind, h.row) + ' by ' + byWhom(h.row) + ' · ' + (h.row.hiddenReason || 'no reason given') + ' · ' + ago(h.row.endedAt), look: 'Look' };
});
Outputs.hiddenHeading = 'Hidden from members (' + hidden.length + ')';
Outputs.hasHidden = hidden.length > 0;
var blocked = members.filter(function (m) { return m.endedAt; }).sort(function (a, b) { return when(b.endedAt).localeCompare(when(a.endedAt)); });
Outputs.blocked = blocked.map(function (m) {
  return { id: 'member:' + m.objectId, kind: 'member', itemId: m.objectId, pill: '', pillClass: 'gm-pill', hasPill: false, title: m.name || '', hasTitle: true, sub: outWhy(m) + ' · ' + ago(m.endedAt), look: 'Profile' };
});
Outputs.blockedHeading = 'Blocked (' + blocked.length + ')';
Outputs.hasBlocked = blocked.length > 0;
Outputs.ok = true;`;

const QUEUE: PageComponent = {
  path: MODERATE_PAGES.queue,
  description: 'The admins’ queue: who is waiting to be let in, what members reported, what is hidden, who is blocked',
  nodes: [
    ...gramShell('qu', 'Waiting for you', 'admin', 'Admin', 720),
    group('quContent', 'Waiting for you', 'quBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('quTitle', 'Heading', 'quContent', 'Waiting for you', GM_TITLE),
    text('quHeading', 'New members', 'quContent', '', HEADING),
    text('quEmpty', 'Nobody waiting', 'quContent', 'Nobody is waiting to be let in.', { ...GM_FINE, mounted: false }),
    group('quList', 'The people waiting', 'quContent', column({ cssClassName: 'gm-list', mounted: false })),
    { id: 'quEach', type: 'For Each', label: 'One row per person waiting', parent: 'quList', parameters: { template: GRAM_COMPONENTS.newMember } },
    text('quNote', 'What happened last', 'quContent', '', { ...GM_FINE, color: 'var(--foreground)' }),
    text('quHow', 'What No does', 'quContent', 'No keeps them out: they can’t sign in. Nothing is deleted.', { ...GM_FINE, mounted: false }),
    // Slice 5: the picture's "Reported", and what the admins have dealt with.
    group('quMod', 'Reported, hidden, blocked', 'quBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('quReportedHeading', 'Reported', 'quMod', '', HEADING),
    text('quNoneReported', 'Nothing reported', 'quMod', 'Nothing is waiting: no member has reported a post or a comment.', { ...GM_FINE, mounted: false }),
    group('quReported', 'What members reported', 'quMod', column({ cssClassName: 'gm-list' })),
    { id: 'quEachReported', type: 'For Each', label: 'One row per post or comment reported', parent: 'quReported', parameters: { template: MODERATE_COMPONENTS.queueRow } },
    group('quHiding', 'Hiding', 'quMod', NOTE),
    text('quHidingTitle', 'Heading', 'quHiding', 'Hiding', { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)' }),
    text('quHidingWords', 'What hiding does', 'quHiding', 'A hidden post keeps its photos, comments and reports. Members stop seeing it; admins still see it, with the reason. Nothing is deleted, and it can be brought back.', { ...GM_FINE, color: 'var(--foreground)' }),
    group('quHiddenBox', 'What is hidden', 'quMod', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('quHiddenHeading', 'Hidden', 'quHiddenBox', '', HEADING),
    group('quHidden', 'Hidden from members', 'quHiddenBox', column({ cssClassName: 'gm-list' })),
    { id: 'quEachHidden', type: 'For Each', label: 'One row per post or comment hidden', parent: 'quHidden', parameters: { template: MODERATE_COMPONENTS.queueRow } },
    group('quBlockedBox', 'Who is blocked', 'quMod', column({ rowGap: 'var(--space-3)', mounted: false })),
    text('quBlockedHeading', 'Blocked', 'quBlockedBox', '', HEADING),
    group('quBlocked', 'Blocked members', 'quBlockedBox', column({ cssClassName: 'gm-list' })),
    { id: 'quEachBlocked', type: 'For Each', label: 'One row per member blocked', parent: 'quBlocked', parameters: { template: MODERATE_COMPONENTS.queueRow } },
    group('quMore', 'More', 'quMod', rowOf({ flexWrap: 'wrap', rowGap: 'var(--space-2)', columnGap: 'var(--space-2-5)' })),
    button('quRules', 'Community rules', 'quMore', 'Community rules', GM_LINE_SMALL),
    button('quAdmins', 'Admins', 'quMore', 'Admins', GM_LINE_SMALL),
    button('quFeed', 'The feed', 'quMore', 'The feed', GM_LINE_SMALL),
    ...refused('qu'),
    fn('quLoad', 'Who is waiting', QUEUE_LOAD, []),
    fn('quModLoad', 'What is reported, hidden and blocked', MODERATION_LOAD, []),
    { id: 'quVersion', type: 'Variable2', label: 'The members changed', parameters: { name: 'membersChanged' } },
    { id: 'quLast', type: 'Variable2', label: 'What happened last', parameters: { name: 'membersNote' } },
    { id: 'quFeedChanged', type: 'Variable2', label: 'The feed changed', parameters: { name: 'feedChanged' } },
    { id: 'quLiveReport', type: 'SubscribeToChanges', label: 'Reports, as they arrive', parameters: { collectionName: 'Report' } },
    { id: 'quLiveCommentReport', type: 'SubscribeToChanges', label: 'Reports on comments, as they arrive', parameters: { collectionName: 'CommentReport' } },
    go('quToRules', 'To the rules', MODERATE_PAGES.rules),
    go('quToAdmins', 'To the admins', GRAM_PAGES.admins),
    go('quToFeed', 'To the feed', GRAM_PAGES.feed)
  ],
  connections: [
    wire('quRoot', 'didMount', 'quLoad', 'run'),
    wire('quVersion', 'value', 'quLoad', 'in-changed'),
    wire('quLoad', 'out-ok', 'quContent', 'mounted'),
    wire('quLoad', 'out-rows', 'quEach', 'items'),
    wire('quLoad', 'out-heading', 'quHeading', 'text'),
    wire('quLoad', 'out-empty', 'quEmpty', 'mounted'),
    wire('quLoad', 'out-hasRows', 'quList', 'mounted'),
    wire('quLoad', 'out-hasRows', 'quHow', 'mounted'),
    wire('quLast', 'value', 'quNote', 'text'),
    ...refusedWires('qu', 'quLoad'),
    wire('quRoot', 'didMount', 'quModLoad', 'run'),
    wire('quFeedChanged', 'value', 'quModLoad', 'in-changed'),
    wire('quVersion', 'value', 'quModLoad', 'in-members'),
    wire('quLiveReport', 'changed', 'quModLoad', 'run'),
    wire('quLiveCommentReport', 'changed', 'quModLoad', 'run'),
    wire('quModLoad', 'out-ok', 'quMod', 'mounted'),
    wire('quModLoad', 'out-reportedHeading', 'quReportedHeading', 'text'),
    wire('quModLoad', 'out-noneReported', 'quNoneReported', 'mounted'),
    wire('quModLoad', 'out-reported', 'quEachReported', 'items'),
    wire('quModLoad', 'out-hiddenHeading', 'quHiddenHeading', 'text'),
    wire('quModLoad', 'out-hasHidden', 'quHiddenBox', 'mounted'),
    wire('quModLoad', 'out-hidden', 'quEachHidden', 'items'),
    wire('quModLoad', 'out-blockedHeading', 'quBlockedHeading', 'text'),
    wire('quModLoad', 'out-hasBlocked', 'quBlockedBox', 'mounted'),
    wire('quModLoad', 'out-blocked', 'quEachBlocked', 'items'),
    wire('quRules', 'onClick', 'quToRules', 'navigate'),
    wire('quAdmins', 'onClick', 'quToAdmins', 'navigate'),
    wire('quFeed', 'onClick', 'quToFeed', 'navigate')
  ]
};

// ── /Admin/QueueRow ────────────────────────────────────────────────────────────────────────────────────────────────

/** Look opens the post or the comment; a blocked member's row opens their profile. */
export const QUEUE_ROW_WHERE = `if (Inputs.kind === 'member') Outputs.member(); else if (Inputs.kind === 'comment') Outputs.comment(); else Outputs.post();`;

const QUEUE_ROW: PageComponent = {
  path: MODERATE_COMPONENTS.queueRow,
  description: 'One row in the queue: why, what and whose, and Look',
  nodes: [
    group('qrRoot', 'A row in the queue', undefined, rowOf({ columnGap: 'var(--space-2-5)', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', backgroundColor: 'var(--surface)' })),
    group('qrWords', 'Why, what and whose', 'qrRoot', column({ rowGap: 'var(--space-1)', alignItems: 'flex-start', cssClassName: 'gm-grow' })),
    text('qrPill', 'Why', 'qrWords', '', { ...PILL, mounted: false }),
    text('qrTitle', 'Who', 'qrWords', '', { ...GM_NAME, mounted: false }),
    text('qrSub', 'What, whose and when', 'qrWords', '', META),
    button('qrLook', 'Look', 'qrRoot', 'Look', GM_LINE_SMALL),
    {
      id: 'qrIn',
      type: 'Component Inputs',
      label: 'One row',
      ports: [
        ...['id', 'kind', 'itemId', 'pill', 'pillClass', 'title', 'sub', 'look'].map((name) => ({ name, type: 'string', plug: 'output' })),
        { name: 'hasPill', type: 'boolean', plug: 'output' },
        { name: 'hasTitle', type: 'boolean', plug: 'output' }
      ]
    },
    fn('qrWhere', 'The post, the comment or the profile', QUEUE_ROW_WHERE, ['post', 'comment', 'member'], ['kind']),
    go('qrToPost', 'To look at the post', MODERATE_PAGES.look),
    go('qrToComment', 'To look at the comment', MODERATE_PAGES.look),
    go('qrToMember', 'To their profile', MEMBER_PAGE)
  ],
  connections: [
    wire('qrIn', 'pill', 'qrPill', 'text'),
    wire('qrIn', 'pillClass', 'qrPill', 'cssClassName'),
    wire('qrIn', 'hasPill', 'qrPill', 'mounted'),
    wire('qrIn', 'title', 'qrTitle', 'text'),
    wire('qrIn', 'hasTitle', 'qrTitle', 'mounted'),
    wire('qrIn', 'sub', 'qrSub', 'text'),
    wire('qrIn', 'look', 'qrLook', 'label'),
    wire('qrIn', 'kind', 'qrWhere', 'in-kind'),
    wire('qrLook', 'onClick', 'qrWhere', 'run'),
    wire('qrIn', 'itemId', 'qrToPost', 'pm-post'),
    wire('qrIn', 'itemId', 'qrToComment', 'pm-comment'),
    wire('qrIn', 'itemId', 'qrToMember', 'pm-memberId'),
    wire('qrWhere', 'out-post', 'qrToPost', 'navigate'),
    wire('qrWhere', 'out-comment', 'qrToComment', 'navigate'),
    wire('qrWhere', 'out-member', 'qrToMember', 'navigate')
  ]
};

// ── /Pages/Admin/Look ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One post or comment, as an admin sees it: the post as the feed draws it (photos and all, so a child's photo can be
 * judged) or the comment and what it is under; whether members see it, and why not; every report on it, who sent it
 * and why. The reason to hide it with starts as the reason most reporters gave.
 */
export const LOOK_LOAD = `${FEED_READ}
${REASONS_READ}
// Read so that a hide or a bring-back runs the page again.
var version = Inputs.changed;
var isComment = typeof Inputs.comment === 'string' && Inputs.comment !== '';
var id = String((isComment ? Inputs.comment : Inputs.post) || '');
try { await adminsOnly(); } catch (e) { refused(e); return; }
Outputs.refused = false;
if (!id) { Outputs.gone = true; Outputs.ok = false; return; }
try {
  var members = await all('Member');
  var row = (await all(isComment ? 'Comment' : 'Post', { objectId: { equalTo: id } }))[0] || null;
  var postId = row ? (isComment ? idOf(row.post) : id) : '';
  var post = postId ? (await all('Post', { objectId: { equalTo: postId } }))[0] || null : null;
  var on = [ptr('Post', postId)];
  var hearts = post && !isComment ? await all('Heart', { post: { containedIn: on } }) : [];
  var said = post && !isComment ? await all('Comment', { post: { containedIn: on } }) : [];
  var prayed = post && !isComment ? await all('Prayed', { post: { containedIn: on } }) : [];
  var reports = !row ? [] : isComment ? await all('CommentReport', { comment: { equalTo: ptr('Comment', id) } }) : await all('Report', { post: { equalTo: ptr('Post', id) } });
} catch (e) { refused(e); return; }
if (!row || !post) { Outputs.gone = true; Outputs.ok = false; return; }
var by = {}, byLogin = {};
members.forEach(function (m) { by[m.objectId] = m; byLogin[idOf(m.login)] = m; });
var author = by[idOf(row.member)] || {};
var poster = by[idOf(post.member)] || {};
var mine = Noodl.Users.Current ? String(Noodl.Users.Current.id || '') : '';
var hidden = !!row.endedAt;
var blocked = !!author.endedAt;
var underHidden = isComment && (!!post.endedAt || !!poster.endedAt);
Outputs.card = isComment ? [] : await cardsOf([post], members, hearts, said, mine, true, prayed);
Outputs.isPost = !isComment;
Outputs.isComment = isComment;
Outputs.title = isComment ? 'A comment' : post.kind === 'prayer' ? 'A prayer request' : 'A post';
Outputs.commentBy = (author.name || 'A member') + ' · ' + ago(row.createdAt);
Outputs.commentText = isComment ? row.text || '' : '';
Outputs.under = isComment ? 'Under ' + (poster.name || 'a member') + '’s post: “' + cut(post.caption, 80) + '”' : '';
Outputs.state = hidden ? 'Hidden from members: ' + (row.hiddenReason || 'no reason given') + '.'
  : blocked ? 'Hidden from members while ' + (author.name || 'its member') + ' is blocked.'
  : underHidden ? 'Hidden from members with the post it is under.'
  : 'In the feed: every member sees it.';
Outputs.stateClass = hidden || blocked || underHidden ? 'gm-pill gm-wrap gm-pill-quiet' : 'gm-pill gm-wrap gm-pill-ok';
Outputs.canHide = !hidden;
Outputs.canBringBack = hidden && !blocked;
Outputs.blockedNote = hidden && blocked ? (author.name || 'Its member') + ' is blocked. Let them back from their profile first.' : '';
Outputs.hasBlockedNote = hidden && blocked;
var people = {};
var lines = reports.slice().sort(function (a, b) { return rank(a.reason) - rank(b.reason) || String((b.at && b.at.iso) || '').localeCompare(String((a.at && a.at.iso) || '')); }).map(function (r) {
  people[idOf(r.doneBy)] = (people[idOf(r.doneBy)] || 0) + 1;
  var from = byLogin[idOf(r.doneBy)] || {};
  return { id: r.objectId, pill: reasonWords(r.reason), pillClass: pillOf(r.reason), who: 'Reported by ' + (from.name || 'a member') + ' · ' + ago(r.at || r.createdAt), note: r.note || '', hasNote: !!r.note };
});
Outputs.reports = lines;
Outputs.reportsHeading = lines.length === 0 ? 'Nobody has reported it.' : 'Reported by ' + plural(Object.keys(people).length, 'member', 'members');
var count = {};
reports.forEach(function (r) { count[r.reason] = (count[r.reason] || 0) + 1; });
var top = Object.keys(count).sort(function (a, b) { return (a === 'child-photo' ? -1 : 0) - (b === 'child-photo' ? -1 : 0) || count[b] - count[a] || rank(a) - rank(b); })[0];
Outputs.suggest = top ? reasonWords(top) : '';
Outputs.kind = isComment ? 'comment' : 'post';
Outputs.id = id;
Outputs.authorId = author.objectId || '';
Outputs.profileLabel = (firstName(author) || 'Their') + '’s profile';
Outputs.gone = false;
Outputs.ok = true;`;

/** Hide it, with why: what the admin typed, or the reason it started with. */
export const LOOK_HIDE = `var typed = Inputs.reason === undefined ? Inputs.reason0 : Inputs.reason;
var reason = String(typed || '').trim();
if (!reason) { Outputs.problem = 'Say why it’s hidden. Admins see the reason; the member who wrote it doesn’t.'; Outputs.held(); return; }
if (reason.length > ${MOST_REASON}) { Outputs.problem = 'A reason of ${MOST_REASON} characters or fewer. This one has ' + reason.length + '.'; Outputs.held(); return; }
Outputs.problem = '';
var h = { hidden: true, reason: reason };
if (Inputs.kind === 'comment') h.commentId = Inputs.id; else h.postId = Inputs.id;
Outputs.hide = h;
Outputs.go();`;
export const LOOK_BRING_BACK = `var h = { hidden: false };
if (Inputs.kind === 'comment') h.commentId = Inputs.id; else h.postId = Inputs.id;
Outputs.hide = h;
Outputs.go();`;
/** Say it changed, so the page (and the queue, the feed) read again. */
export const CHANGED_STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const LOOK: PageComponent = {
  path: MODERATE_PAGES.look,
  description: 'One post or comment as an admin sees it: whether members see it, its reports, hide it or bring it back',
  nodes: [
    ...gramShell('lk', 'Look', 'admin/look', 'Admin', 560),
    { id: 'lkUrl', type: 'PageInputs', label: 'What to look at', parameters: { queryParams: 'post,comment' } },
    button('lkBack', 'Back', 'lkBody', '← Waiting for you', GM_LINK),
    group('lkContent', 'The post or the comment', 'lkBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('lkTitle', 'Heading', 'lkContent', 'A post', GM_TITLE),
    text('lkState', 'Whether members see it', 'lkContent', '', { ...PILL, cssClassName: 'gm-pill gm-wrap' }),
    group('lkCardBox', 'The post, as the feed draws it', 'lkContent', column({ mounted: false })),
    { id: 'lkEachCard', type: 'For Each', label: 'The post', parent: 'lkCardBox', parameters: { template: FEED_COMPONENTS.card } },
    group('lkComment', 'The comment', 'lkContent', column({ rowGap: 'var(--space-1)', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', cssClassName: 'gm-box', mounted: false })),
    text('lkCommentBy', 'Who wrote it, and when', 'lkComment', '', { ...GM_NAME, fontSize: 'var(--text-sm)' }),
    text('lkCommentText', 'What it says', 'lkComment', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap' }),
    text('lkUnder', 'What it is under', 'lkComment', '', META),
    text('lkReportsHeading', 'Who reported it', 'lkContent', '', HEADING),
    group('lkReports', 'The reports', 'lkContent', column({ cssClassName: 'gm-list' })),
    { id: 'lkEachReport', type: 'For Each', label: 'One line per report', parent: 'lkReports', parameters: { template: MODERATE_COMPONENTS.reportLine } },
    group('lkHideBox', 'Hide it from the members', 'lkContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    field('lkReason', 'lkHideBox', `Why it’s hidden (admins see this; ${MOST_REASON} characters at most)`),
    button('lkHide', 'Hide from members', 'lkHideBox', 'Hide from members', GM_MAIN),
    button('lkBringBack', 'Bring it back', 'lkContent', 'Bring it back', { ...GM_LINE, sizeMode: 'contentHeight', width: pct(100), mounted: false }),
    text('lkBlockedNote', 'Blocked: let them back first', 'lkContent', '', { ...GM_FINE, mounted: false }),
    text('lkError', 'What went wrong', 'lkContent', '', GM_REFUSED),
    button('lkProfile', 'Their profile', 'lkContent', '', GM_LINE_SMALL),
    text('lkBlockFine', 'Where blocking is', 'lkContent', 'Blocking a member is on their profile.', GM_FINE),
    group('lkHiding', 'Hiding', 'lkContent', NOTE),
    text('lkHidingTitle', 'Heading', 'lkHiding', 'Hiding', { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)' }),
    text('lkHidingWords', 'What hiding does', 'lkHiding', 'A hidden post keeps its photos, comments and reports. Members stop seeing it; admins still see it, with the reason. Nothing is deleted, and it can be brought back.', { ...GM_FINE, color: 'var(--foreground)' }),
    text('lkGone', 'There is no such post', 'lkBody', 'There is no such post or comment.', { ...GM_FINE, mounted: false }),
    ...refused('lk'),
    fn('lkLoad', 'The post or the comment, its state and its reports', LOOK_LOAD, []),
    fn('lkHideGather', 'Hide it, with why', LOOK_HIDE, ['go', 'held'], ['reason', 'reason0', 'kind', 'id']),
    fn('lkBackGather', 'Bring it back', LOOK_BRING_BACK, ['go'], ['kind', 'id']),
    call('lkCall', 'hide(hide)', FN_HIDE),
    fn('lkStamp', 'Say the feed changed', CHANGED_STAMP, ['go']),
    { id: 'lkChanged', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } },
    { id: 'lkFeedChanged', type: 'Variable2', label: 'The feed changed', parameters: { name: 'feedChanged' } },
    go('lkToQueue', 'To the admins’ queue', MODERATE_PAGES.queue),
    go('lkToMember', 'To their profile', MEMBER_PAGE)
  ],
  connections: [
    wire('lkRoot', 'didMount', 'lkLoad', 'run'),
    wire('lkUrl', 'pm-post', 'lkLoad', 'in-post'),
    wire('lkUrl', 'pm-comment', 'lkLoad', 'in-comment'),
    wire('lkFeedChanged', 'value', 'lkLoad', 'in-changed'),
    wire('lkLoad', 'out-ok', 'lkContent', 'mounted'),
    wire('lkLoad', 'out-gone', 'lkGone', 'mounted'),
    ...refusedWires('lk', 'lkLoad'),
    wire('lkLoad', 'out-title', 'lkTitle', 'text'),
    wire('lkLoad', 'out-state', 'lkState', 'text'),
    wire('lkLoad', 'out-stateClass', 'lkState', 'cssClassName'),
    wire('lkLoad', 'out-isPost', 'lkCardBox', 'mounted'),
    wire('lkLoad', 'out-card', 'lkEachCard', 'items'),
    wire('lkLoad', 'out-isComment', 'lkComment', 'mounted'),
    wire('lkLoad', 'out-commentBy', 'lkCommentBy', 'text'),
    wire('lkLoad', 'out-commentText', 'lkCommentText', 'text'),
    wire('lkLoad', 'out-under', 'lkUnder', 'text'),
    wire('lkLoad', 'out-reportsHeading', 'lkReportsHeading', 'text'),
    wire('lkLoad', 'out-reports', 'lkEachReport', 'items'),
    wire('lkLoad', 'out-canHide', 'lkHideBox', 'mounted'),
    wire('lkLoad', 'out-canBringBack', 'lkBringBack', 'mounted'),
    wire('lkLoad', 'out-blockedNote', 'lkBlockedNote', 'text'),
    wire('lkLoad', 'out-hasBlockedNote', 'lkBlockedNote', 'mounted'),
    wire('lkLoad', 'out-suggest', 'lkReason', 'startValue'),
    wire('lkLoad', 'out-suggest', 'lkHideGather', 'in-reason0'),
    wire('lkReason', 'onTextChanged', 'lkHideGather', 'in-reason'),
    ...['lkHideGather', 'lkBackGather'].flatMap((g) => [wire('lkLoad', 'out-kind', g, 'in-kind'), wire('lkLoad', 'out-id', g, 'in-id'), wire(g, 'out-hide', 'lkCall', 'in-hide'), wire(g, 'out-go', 'lkCall', 'call')]),
    wire('lkHide', 'onClick', 'lkHideGather', 'run'),
    wire('lkHideGather', 'out-problem', 'lkError', 'text'),
    wire('lkBringBack', 'onClick', 'lkBackGather', 'run'),
    wire('lkCall', 'error', 'lkError', 'text'),
    wire('lkCall', 'done', 'lkStamp', 'run'),
    wire('lkStamp', 'out-at', 'lkChanged', 'value'),
    wire('lkStamp', 'out-go', 'lkChanged', 'do'),
    wire('lkLoad', 'out-profileLabel', 'lkProfile', 'label'),
    wire('lkLoad', 'out-authorId', 'lkToMember', 'pm-memberId'),
    wire('lkProfile', 'onClick', 'lkToMember', 'navigate'),
    wire('lkBack', 'onClick', 'lkToQueue', 'navigate')
  ]
};

// ── /Admin/ReportLine ──────────────────────────────────────────────────────────────────────────────────────────────

const REPORT_LINE: PageComponent = {
  path: MODERATE_COMPONENTS.reportLine,
  description: 'One report: why, who sent it and when, and their note',
  nodes: [
    group('rlRoot', 'A report', undefined, column({ rowGap: 'var(--space-1)', alignItems: 'flex-start', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', backgroundColor: 'var(--surface)' })),
    text('rlPill', 'Why', 'rlRoot', '', PILL),
    text('rlWho', 'Who sent it, and when', 'rlRoot', '', META),
    text('rlNote', 'Their note', 'rlRoot', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)', cssClassName: 'gm-wrap', mounted: false }),
    {
      id: 'rlIn',
      type: 'Component Inputs',
      label: 'One report',
      ports: [...['pill', 'pillClass', 'who', 'note'].map((name) => ({ name, type: 'string', plug: 'output' })), { name: 'hasNote', type: 'boolean', plug: 'output' }]
    }
  ],
  connections: [
    wire('rlIn', 'pill', 'rlPill', 'text'),
    wire('rlIn', 'pillClass', 'rlPill', 'cssClassName'),
    wire('rlIn', 'who', 'rlWho', 'text'),
    wire('rlIn', 'note', 'rlNote', 'text'),
    wire('rlIn', 'hasNote', 'rlNote', 'mounted')
  ]
};

// ── /Pages/Rules ───────────────────────────────────────────────────────────────────────────────────────────────────

/** The rules, as the admins wrote them; an admin may change them here. Nobody signed in is asked nothing. */
export const RULES_LOAD = `${GRAM_READ}
// Read so that a save runs the page again.
var version = Inputs.changed;
var rows = [];
try { rows = await Noodl.Records.query('Community', {}, { plain: true, limit: 1 }); } catch (e) { rows = []; }
var c = rows[0];
Outputs.rules = c && c.rules ? c.rules : 'The admins haven’t written the rules yet.';
Outputs.current = c && c.rules ? c.rules : '';
var who = await me();
var admin = !!who && who.status === 'approved' && who.role === 'admin';
Outputs.isAdmin = admin;
Outputs.band = admin ? 'Admin' : '';`;

export const RULES_GATHER = `var typed = Inputs.rules === undefined ? Inputs.rules0 : Inputs.rules;
var rules = String(typed || '').trim();
if (!rules) { Outputs.problem = 'Write the rules first.'; Outputs.held(); return; }
if (rules.length > ${MOST_RULES}) { Outputs.problem = 'Rules of ${MOST_RULES.toLocaleString('en-GB')} characters or fewer. These have ' + rules.length.toLocaleString('en-GB') + '.'; Outputs.held(); return; }
Outputs.problem = '';
Outputs.save = { rules: rules };
Outputs.go();`;

const RULES: PageComponent = {
  path: MODERATE_PAGES.rules,
  description: 'The community rules; an admin changes them here',
  nodes: [
    ...gramShell('ru', 'Community rules', 'rules', null, 560),
    button('ruBack', 'Back', 'ruBody', '← Back', GM_LINK),
    text('ruTitle', 'Heading', 'ruBody', 'Community rules', GM_TITLE),
    text('ruRules', 'The rules', 'ruBody', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-read gm-wrap gm-lines' }),
    text('ruReport', 'Breaking them', 'ruBody', 'A post or comment that breaks them can be reported from its page. Only the admins see who reported it.', GM_FINE),
    group('ruEdit', 'Change the rules (admins)', 'ruBody', column({ rowGap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderStyle: 'solid', borderColor: 'var(--border)', borderTopWidth: px(1), borderBottomWidth: px(0), borderLeftWidth: px(0), borderRightWidth: px(0), mounted: false })),
    field('ruWrite', 'ruEdit', `The rules, as members will read them (${MOST_RULES.toLocaleString('en-GB')} characters at most)`, { type: 'textArea', cssClassName: 'gm-tall' }),
    button('ruSave', 'Save the rules', 'ruEdit', 'Save the rules', GM_MAIN),
    text('ruSaved', 'Saved', 'ruEdit', 'Saved. Every member reads these now, and who changed them is kept.', { ...GM_FINE, color: 'var(--foreground)', mounted: false }),
    text('ruError', 'What went wrong', 'ruEdit', '', GM_REFUSED),
    fn('ruLoad', 'The rules, as the admins wrote them', RULES_LOAD, []),
    fn('ruGoBack', 'Back where they came from', GO_BACK, []),
    fn('ruGather', 'The rules, as one save', RULES_GATHER, ['go', 'held'], ['rules', 'rules0']),
    call('ruCall', 'writeRules(rules)', FN_WRITE_RULES),
    { id: 'ruSavedSw', type: 'Switch', label: 'Saved' },
    fn('ruStamp', 'Read the rules again', CHANGED_STAMP, ['go'])
  ],
  connections: [
    wire('ruRoot', 'didMount', 'ruLoad', 'run'),
    wire('ruLoad', 'out-rules', 'ruRules', 'text'),
    wire('ruLoad', 'out-band', 'ruBar', 'band'),
    wire('ruLoad', 'out-isAdmin', 'ruEdit', 'mounted'),
    wire('ruLoad', 'out-current', 'ruWrite', 'startValue'),
    wire('ruLoad', 'out-current', 'ruGather', 'in-rules0'),
    wire('ruWrite', 'onTextChanged', 'ruGather', 'in-rules'),
    wire('ruWrite', 'onTextChanged', 'ruSavedSw', 'off'),
    wire('ruSave', 'onClick', 'ruGather', 'run'),
    wire('ruGather', 'out-problem', 'ruError', 'text'),
    wire('ruGather', 'out-save', 'ruCall', 'in-rules'),
    wire('ruGather', 'out-go', 'ruCall', 'call'),
    wire('ruCall', 'error', 'ruError', 'text'),
    wire('ruCall', 'done', 'ruSavedSw', 'on'),
    wire('ruSavedSw', 'state', 'ruSaved', 'mounted'),
    wire('ruCall', 'done', 'ruStamp', 'run'),
    wire('ruStamp', 'out-at', 'ruLoad', 'in-changed'),
    wire('ruBack', 'onClick', 'ruGoBack', 'run')
  ]
};

/** Leaves first, then the pages that place them. */
export const GRAM_SLICE5_LEAVES: PageComponent[] = [QUEUE_ROW, REPORT_LINE];
export const GRAM_SLICE5_PAGES: PageComponent[] = [REPORT, LOOK];
/** Slice 1's two pages that moderation grew: the plan places them where slice 1 did, so the router's start is unchanged. */
export { QUEUE as GRAM_QUEUE_PAGE, RULES as GRAM_RULES_PAGE };
