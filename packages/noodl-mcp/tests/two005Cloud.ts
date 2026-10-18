/**
 * TWO-005 slice 1 — the community app's cloud functions for joining and being let in.
 *
 * The world (`templates/gram/docs/WORLD.md`) and its policy (TWO-001 s2) let **nobody** write a row directly: every
 * write is one of these functions, which checks who is writing and keeps the history the world's rule 6 asks for. The
 * marketplace's shape is reused (`two003Cloud.ts`): Request → one script → Done / Refused, stock nodes only where a
 * script can't reach (Create User, Add User To Role, Update User, Secret, Send Email).
 *
 * - **`setUpCommunity`**: the first admin, once, against the backend's setup secret. The builder's sign-in gets a
 *   password, so they can sign in before the backend sends email.
 * - **`askToJoin`**: anyone, with no account. A name, an email and "I am 13 or older" (the world's rule for children:
 *   the admin who lets them in is the check). It makes a sign-in with **no password** (members sign in by an emailed
 *   link) and a waiting Member. An email already asked answers exactly as a new one does: the door is public, and a
 *   different answer would tell a stranger who belongs to the community.
 * - **`letIn`** (admins): the member is approved, holds `role:member` (what the policy reads by), and is emailed
 *   "you're in" with a link to sign in (the picture's waiting screen promises it). No email service yet: still let in,
 *   and the answer says the message didn't go.
 * - **`turnAway`** (admins): the picture's "No". The world has no "refused" state and deletes nothing, so a person not
 *   let in is BLOCKED with that reason (`blockedReason` + `endedAt`, the schema's all-or-none) and their sign-in is
 *   switched off. Slice 5's blocking brings them back.
 * - **`makeAdmin`** (admins): an approved member becomes an admin (the builder makes volunteers admins).
 * - **`whoAmI`** (signed in): the caller's Member, for routing (waiting, a member, an admin) and the band.
 *
 * @module noodl-mcp/tests/two005Cloud
 */
import { CloudComponent, PRELUDE } from './two003Cloud';
import { quiet, signals, wire } from './two003Pages';

export const GRAM_SETUP_TOKEN_SECRET = 'GRAM_SETUP_TOKEN';

export const FN_SET_UP_COMMUNITY = 'setUpCommunity';
export const FN_ASK_TO_JOIN = 'askToJoin';
export const FN_GRAM_WHO_AM_I = 'whoAmI';
export const FN_LET_IN = 'letIn';
export const FN_TURN_AWAY = 'turnAway';
export const FN_MAKE_ADMIN = 'makeAdmin';

/** The policy's `functions` block for slice 1. `templates/gram/nodegx.security.json` carries exactly this. */
export const GRAM_SLICE1_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_SET_UP_COMMUNITY]: { call: 'public', rateLimit: { ratePerMinute: 5, burst: 5 } },
  [FN_ASK_TO_JOIN]: { call: 'public', rateLimit: { ratePerMinute: 5, burst: 5 } },
  [FN_GRAM_WHO_AM_I]: { call: 'authenticated' },
  [FN_LET_IN]: { call: 'role:admin' },
  [FN_TURN_AWAY]: { call: 'role:admin' },
  [FN_MAKE_ADMIN]: { call: 'role:admin' }
};

/** What "No" records as the reason: the fact, in the admin's words. */
export const NOT_LET_IN = 'Not let in.';

/**
 * The marketplace's prelude with the community's caller: the Member behind the session, not the marketplace's Person.
 * `email(v)` is a plain check without a pattern: a script is a template literal and must carry no backslash.
 */
export const GRAM_PRELUDE =
  PRELUDE.replace(/async function caller\(userId\) \{[\s\S]*?\n\}\n/, '') +
  `async function member(userId) {
  if (!userId) return null;
  return one('Member', { login: { equalTo: ptr('_User', userId) } });
}
function email(v) {
  var e = typeof v === 'string' ? v.trim().toLowerCase() : '';
  var at = e.indexOf('@');
  if (e.length > 200 || at < 1 || e.indexOf(' ') >= 0 || e.indexOf('@', at + 1) >= 0) return '';
  var dot = e.lastIndexOf('.');
  return dot > at + 1 && dot < e.length - 1 ? e : '';
}
`;

// ── whoAmI ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const GRAM_WHO_AM_I_SCRIPT = `${GRAM_PRELUDE}
if (Inputs.userId === undefined) return;
var m = await member(Inputs.userId);
if (!m) { refuse('This sign-in isn’t a member of the community.'); return; }
Outputs.me = { id: idOf(m), name: m.name || '', status: m.status, role: m.role, blocked: !!m.endedAt };
Outputs.done();`;

const WHO_AM_I: CloudComponent = {
  name: FN_GRAM_WHO_AM_I,
  path: `#__cloud__/${FN_GRAM_WHO_AM_I}`,
  description: 'Who is signed in: their name, waiting or let in, member or admin',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'whoAmI()', parameters: { allowNoAuth: false } },
    { id: 'run', type: 'JavaScriptFunction', label: 'Read the caller’s member', ports: signals('done', 'refused'), parameters: { functionScript: GRAM_WHO_AM_I_SCRIPT, ...quiet('userId') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'me' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'run', 'in-userId'),
    wire('req', 'receive', 'run', 'run'),
    wire('run', 'out-me', 'ok', 'pm-me'),
    wire('run', 'out-done', 'ok', 'send'),
    wire('run', 'out-reason', 'no', 'errorMessage'),
    wire('run', 'out-refused', 'no', 'send'),
    wire('run', 'failure', 'no', 'send')
  ]
};

// ── setUpCommunity ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The token matches in constant time, there is no admin yet, and the details will do. */
export const SET_UP_COMMUNITY_GATE_SCRIPT = `${GRAM_PRELUDE}
var a = Inputs.setup;
if (a === undefined || Inputs.expected === undefined) return;
if (!a || typeof a !== 'object') { Outputs.denied(); return; }
var expected = String(Inputs.expected || '');
var supplied = String(a.setupToken || '');
var d = expected.length ^ supplied.length;
for (var i = 0; i < Math.max(expected.length, supplied.length); i++) d |= (expected.charCodeAt(i) || 0) ^ (supplied.charCodeAt(i) || 0);
if (expected.length === 0 || d !== 0) { Outputs.denied(); return; }
var admin = await one('Member', { role: { equalTo: 'admin' } });
if (admin) { Outputs.denied(); return; }
var community = text(a.community, 80);
if (!community) { refuse('The community’s name, as its members know it.'); return; }
var name = text(a.name, 80);
if (!name) { refuse('Your name, as the community knows you.'); return; }
var e = email(a.email);
if (!e) { refuse('An email address, such as name@example.com.'); return; }
if (!a.password || String(a.password).length < 8) { refuse('A password of 8 characters or more.'); return; }
Outputs.username = e;
Outputs.email = e;
Outputs.password = String(a.password);
Outputs.name = name;
Outputs.community = community;
Outputs.ok();`;

/** After the sign-in holds `role:admin`: the admin's Member (let in, an admin), the Community, both histories. */
export const FIRST_ADMIN_SCRIPT = `${GRAM_PRELUDE}
if (Inputs.loginId === undefined) return;
var row = { name: Inputs.name, email: Inputs.email, status: 'approved', role: 'admin', login: ptr('_User', Inputs.loginId) };
var made = await Noodl.Records.create('Member', row);
await history('Member', 'member', made.getId(), Inputs.loginId, diff(null, { name: row.name, email: row.email, status: row.status, role: row.role }));
var c = await one('Community', {});
if (!c) {
  var community = await Noodl.Records.create('Community', { name: Inputs.community });
  await history('Community', 'community', community.getId(), Inputs.loginId, diff(null, { name: Inputs.community }));
}
Outputs.memberId = made.getId();
Outputs.done();`;

const SET_UP_COMMUNITY: CloudComponent = {
  name: FN_SET_UP_COMMUNITY,
  path: `#__cloud__/${FN_SET_UP_COMMUNITY}`,
  description: 'Make the community and its first admin, once, with the setup token',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'setUpCommunity(setup)', parameters: { params: 'setup', 'ptype-setup': 'object', 'preq-setup': true, allowNoAuth: true } },
    { id: 'secret', type: 'noodl.cloud.secret', label: GRAM_SETUP_TOKEN_SECRET, parameters: { name: GRAM_SETUP_TOKEN_SECRET } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'The token matches, and there is no admin yet', ports: signals('ok', 'denied', 'refused'), parameters: { functionScript: SET_UP_COMMUNITY_GATE_SCRIPT, ...quiet('setup', 'expected') } },
    { id: 'create', type: 'noodl.cloud.createuser', label: 'The admin’s sign-in', parameters: { emailVerified: true } },
    { id: 'grant', type: 'noodl.cloud.addusertorole', label: 'Make them an admin', parameters: { role: 'admin', createRole: true } },
    { id: 'first', type: 'JavaScriptFunction', label: 'The admin’s member and the community, with their histories', ports: signals('done', 'refused'), parameters: { functionScript: FIRST_ADMIN_SCRIPT, ...quiet('loginId', 'name', 'email', 'community') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Set up', parameters: { params: 'memberId' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'This community couldn’t be set up with that.' } },
    { id: 'why', type: 'noodl.cloud.response', label: 'Refused, with why', parameters: { status: 'failure' } }
  ],
  connections: [
    wire('req', 'pm-setup', 'gate', 'in-setup'),
    wire('req', 'receive', 'secret', 'fetch'),
    wire('secret', 'value', 'gate', 'in-expected'),
    wire('secret', 'done', 'gate', 'run'),
    wire('gate', 'out-username', 'create', 'username'),
    wire('gate', 'out-email', 'create', 'email'),
    wire('gate', 'out-password', 'create', 'password'),
    wire('gate', 'out-ok', 'create', 'create'),
    wire('create', 'userId', 'grant', 'userId'),
    wire('create', 'done', 'grant', 'add'),
    // An account with this email already exists: refused, never granted (it may be somebody else's).
    wire('create', 'unchanged', 'no', 'send'),
    wire('create', 'userId', 'first', 'in-loginId'),
    wire('gate', 'out-name', 'first', 'in-name'),
    wire('gate', 'out-email', 'first', 'in-email'),
    wire('gate', 'out-community', 'first', 'in-community'),
    wire('grant', 'done', 'first', 'run'),
    wire('grant', 'unchanged', 'first', 'run'),
    wire('first', 'out-memberId', 'ok', 'pm-memberId'),
    wire('first', 'out-done', 'ok', 'send'),
    wire('gate', 'out-reason', 'why', 'errorMessage'),
    wire('gate', 'out-refused', 'why', 'send'),
    wire('gate', 'out-denied', 'no', 'send'),
    ...['secret', 'gate', 'create', 'grant', 'first'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

// ── askToJoin ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A name, an email, 13 or older. An email already asked is caught by Create User (one account per email), whose
 * "unchanged" answers as a new ask does, and nothing is made: a check here first was an equivalent mutant (s11).
 */
export const ASK_TO_JOIN_GATE_SCRIPT = `${GRAM_PRELUDE}
var a = Inputs.join;
if (a === undefined) return;
if (!a || typeof a !== 'object') { refuse('Fill in your name and your email.'); return; }
var name = typeof a.name === 'string' ? a.name.trim() : '';
if (!name) { refuse('Your name, as the community knows you.'); return; }
if (name.length > 80) { refuse('A name of 80 characters or fewer.'); return; }
var e = email(a.email);
if (!e) { refuse('An email address, such as name@example.com. Your sign-in link goes there.'); return; }
if (a.over13 !== true) { refuse('Members are 13 or older. Tick the box to say you are.'); return; }
Outputs.asked = true;
Outputs.username = e;
Outputs.email = e;
Outputs.name = name;
Outputs.ok();`;

/** After the passwordless sign-in exists: the waiting Member, and its history. */
export const WAITING_MEMBER_SCRIPT = `${GRAM_PRELUDE}
if (Inputs.loginId === undefined) return;
var row = { name: Inputs.name, email: Inputs.email, status: 'waiting', role: 'member', login: ptr('_User', Inputs.loginId) };
var made = await Noodl.Records.create('Member', row);
await history('Member', 'member', made.getId(), Inputs.loginId, diff(null, { name: row.name, email: row.email, status: row.status, role: row.role }));
Outputs.asked = true;
Outputs.done();`;

const ASK_TO_JOIN: CloudComponent = {
  name: FN_ASK_TO_JOIN,
  path: `#__cloud__/${FN_ASK_TO_JOIN}`,
  description: 'Ask to join: a sign-in with no password, and a member waiting to be let in',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'askToJoin(join)', parameters: { params: 'join', 'ptype-join': 'object', 'preq-join': true, allowNoAuth: true } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'A name, an email, 13 or older', ports: signals('ok', 'refused'), parameters: { functionScript: ASK_TO_JOIN_GATE_SCRIPT, ...quiet('join') } },
    // No password: a member signs in by the link the backend emails. Nothing to verify yet: the link is the proof.
    { id: 'create', type: 'noodl.cloud.createuser', label: 'Their sign-in, with no password', parameters: { emailVerified: false } },
    { id: 'wait', type: 'JavaScriptFunction', label: 'Their member, waiting, and its history', ports: signals('done', 'refused'), parameters: { functionScript: WAITING_MEMBER_SCRIPT, ...quiet('loginId', 'name', 'email') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Asked', parameters: { params: 'asked' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'pm-join', 'gate', 'in-join'),
    wire('req', 'receive', 'gate', 'run'),
    wire('gate', 'out-username', 'create', 'username'),
    wire('gate', 'out-email', 'create', 'email'),
    wire('gate', 'out-ok', 'create', 'create'),
    wire('create', 'userId', 'wait', 'in-loginId'),
    wire('gate', 'out-name', 'wait', 'in-name'),
    wire('gate', 'out-email', 'wait', 'in-email'),
    wire('create', 'done', 'wait', 'run'),
    // An account with the email exists (asked before, or turned away): answered as asked, so the door tells a
    // stranger nothing, and nothing is made.
    wire('create', 'unchanged', 'ok', 'send'),
    wire('gate', 'out-asked', 'ok', 'pm-asked'),
    wire('wait', 'out-done', 'ok', 'send'),
    wire('gate', 'out-reason', 'no', 'errorMessage'),
    wire('gate', 'out-refused', 'no', 'send'),
    ...['gate', 'create', 'wait'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

// ── letIn ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The member is waiting and not blocked; the message they'll get, with the app's own sign-in page. */
export const LET_IN_GATE_SCRIPT = `${GRAM_PRELUDE}
var a = Inputs.letIn;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say who to let in.'); return; }
var id = text(a.memberId, 64);
var m = id ? await one('Member', { objectId: { equalTo: id } }) : null;
if (!m) { refuse('There is no such member.'); return; }
if (m.endedAt) { refuse(m.name + ' is blocked. Bring them back before letting them in.'); return; }
var app = text(a.appUrl, 300);
if (app.indexOf('https://') !== 0 && app.indexOf('http://') !== 0) { refuse('The app’s address didn’t come with the request.'); return; }
var c = await one('Community', {});
var place = c && c.name ? c.name : 'the community';
Outputs.memberId = id;
Outputs.loginId = idOf(m.login);
Outputs.to = m.email;
Outputs.subject = 'You’re in: ' + place;
Outputs.body = 'Hello ' + m.name + ',' + String.fromCharCode(10, 10) + 'An admin has let you in to ' + place + '. Sign in with your email here:' + String.fromCharCode(10) + app.replace(/[/]+$/, '') + '/sign-in' + String.fromCharCode(10, 10) + 'You’ll get a link to press. No password is needed.';
Outputs.was = m.status;
Outputs.ok();`;

/** After the sign-in holds `role:member`: approved, and its history. Pressed twice, the second changes nothing. */
export const APPROVE_SCRIPT = `${GRAM_PRELUDE}
if (Inputs.memberId === undefined) return;
if (Inputs.was !== 'approved') {
  await Noodl.Records.save(Inputs.memberId, { status: 'approved' }, { className: 'Member' });
  await history('Member', 'member', Inputs.memberId, Inputs.by, { status: { from: Inputs.was || null, to: 'approved' } });
}
Outputs.done();`;

const LET_IN: CloudComponent = {
  name: FN_LET_IN,
  path: `#__cloud__/${FN_LET_IN}`,
  description: 'Let a waiting member in, and email them that they’re in',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'letIn(letIn)', parameters: { params: 'letIn', 'ptype-letIn': 'object', 'preq-letIn': true, allowNoAuth: false } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'They are waiting, not blocked; the message', ports: signals('ok', 'refused'), parameters: { functionScript: LET_IN_GATE_SCRIPT, ...quiet('letIn', 'userId') } },
    { id: 'grant', type: 'noodl.cloud.addusertorole', label: 'Make them a member (what the policy reads by)', parameters: { role: 'member', createRole: true } },
    { id: 'approve', type: 'JavaScriptFunction', label: 'Approved, and its history', ports: signals('done', 'refused'), parameters: { functionScript: APPROVE_SCRIPT, ...quiet('memberId', 'was', 'by') } },
    { id: 'mail', type: 'noodl.cloud.sendemail', label: 'Tell them they’re in', parameters: { template: 'none' } },
    { id: 'sent', type: 'noodl.cloud.response', label: 'Let in, and told', parameters: { params: 'emailed', 'pm-emailed': 'yes' } },
    { id: 'unsent', type: 'noodl.cloud.response', label: 'Let in, not told (no email service)', parameters: { params: 'emailed', 'pm-emailed': 'no' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'gate', 'in-userId'),
    wire('req', 'pm-letIn', 'gate', 'in-letIn'),
    wire('req', 'receive', 'gate', 'run'),
    wire('gate', 'out-loginId', 'grant', 'userId'),
    wire('gate', 'out-ok', 'grant', 'add'),
    wire('gate', 'out-memberId', 'approve', 'in-memberId'),
    wire('gate', 'out-was', 'approve', 'in-was'),
    wire('req', 'userId', 'approve', 'in-by'),
    wire('grant', 'done', 'approve', 'run'),
    wire('grant', 'unchanged', 'approve', 'run'),
    wire('gate', 'out-to', 'mail', 'to'),
    wire('gate', 'out-subject', 'mail', 'subject'),
    wire('gate', 'out-body', 'mail', 'text'),
    wire('approve', 'out-done', 'mail', 'send'),
    wire('mail', 'done', 'sent', 'send'),
    wire('mail', 'failure', 'unsent', 'send'),
    wire('gate', 'out-reason', 'no', 'errorMessage'),
    wire('gate', 'out-refused', 'no', 'send'),
    ...['gate', 'grant', 'approve'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

// ── turnAway ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** "No": a waiting member is blocked with the reason, and their sign-in switched off. Never deleted (rule 1). */
export const TURN_AWAY_SCRIPT = `${GRAM_PRELUDE}
var a = Inputs.turnAway;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say who not to let in.'); return; }
var id = text(a.memberId, 64);
var m = id ? await one('Member', { objectId: { equalTo: id } }) : null;
if (!m) { refuse('There is no such member.'); return; }
if (m.status !== 'waiting') { refuse(m.name + ' is in already. Blocking a member is on their profile.'); return; }
Outputs.loginId = idOf(m.login);
Outputs.disabled = true;
Outputs.id = id;
if (m.endedAt) { Outputs.done(); return; }
var reason = text(a.reason, 500) || '${NOT_LET_IN}';
await Noodl.Records.save(id, { blockedReason: reason, endedAt: now() }, { className: 'Member' });
await history('Member', 'member', id, Inputs.userId, { blocked: { from: false, to: true }, blockedReason: { from: null, to: reason } });
Outputs.done();`;

const TURN_AWAY: CloudComponent = {
  name: FN_TURN_AWAY,
  path: `#__cloud__/${FN_TURN_AWAY}`,
  description: 'Don’t let someone in: blocked, with why, and their sign-in switched off',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'turnAway(turnAway)', parameters: { params: 'turnAway', 'ptype-turnAway': 'object', 'preq-turnAway': true, allowNoAuth: false } },
    { id: 'run', type: 'JavaScriptFunction', label: 'Blocked, with why, and its history', ports: signals('done', 'refused'), parameters: { functionScript: TURN_AWAY_SCRIPT, ...quiet('turnAway', 'userId') } },
    // `disabled` is the account flag every backend door checks, a magic link included; the generic store can't write it.
    { id: 'off', type: 'noodl.cloud.updateuser', label: 'Their sign-in, off', parameters: { properties: 'disabled' } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'id' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'run', 'in-userId'),
    wire('req', 'pm-turnAway', 'run', 'in-turnAway'),
    wire('req', 'receive', 'run', 'run'),
    wire('run', 'out-loginId', 'off', 'userId'),
    wire('run', 'out-disabled', 'off', 'prop-disabled'),
    wire('run', 'out-done', 'off', 'store'),
    wire('run', 'out-id', 'ok', 'pm-id'),
    wire('off', 'done', 'ok', 'send'),
    wire('off', 'failure', 'no', 'send'),
    wire('run', 'out-reason', 'no', 'errorMessage'),
    wire('run', 'out-refused', 'no', 'send'),
    wire('run', 'failure', 'no', 'send')
  ]
};

// ── makeAdmin ──────────────────────────────────────────────────────────────────────────────────────────────────────

export const MAKE_ADMIN_GATE_SCRIPT = `${GRAM_PRELUDE}
var a = Inputs.admin;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say who to make an admin.'); return; }
var id = text(a.memberId, 64);
var m = id ? await one('Member', { objectId: { equalTo: id } }) : null;
if (!m) { refuse('There is no such member.'); return; }
if (m.endedAt) { refuse(m.name + ' is blocked.'); return; }
if (m.status !== 'approved') { refuse('Let ' + m.name + ' in first.'); return; }
Outputs.memberId = id;
Outputs.loginId = idOf(m.login);
Outputs.was = m.role;
Outputs.ok();`;

export const PROMOTE_SCRIPT = `${GRAM_PRELUDE}
if (Inputs.memberId === undefined) return;
if (Inputs.was !== 'admin') {
  await Noodl.Records.save(Inputs.memberId, { role: 'admin' }, { className: 'Member' });
  await history('Member', 'member', Inputs.memberId, Inputs.by, { role: { from: Inputs.was || null, to: 'admin' } });
}
Outputs.id = Inputs.memberId;
Outputs.done();`;

const MAKE_ADMIN: CloudComponent = {
  name: FN_MAKE_ADMIN,
  path: `#__cloud__/${FN_MAKE_ADMIN}`,
  description: 'Make a member an admin',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'makeAdmin(admin)', parameters: { params: 'admin', 'ptype-admin': 'object', 'preq-admin': true, allowNoAuth: false } },
    { id: 'gate', type: 'JavaScriptFunction', label: 'A member who is in and not blocked', ports: signals('ok', 'refused'), parameters: { functionScript: MAKE_ADMIN_GATE_SCRIPT, ...quiet('admin', 'userId') } },
    { id: 'grant', type: 'noodl.cloud.addusertorole', label: 'Make them an admin', parameters: { role: 'admin', createRole: true } },
    { id: 'promote', type: 'JavaScriptFunction', label: 'An admin, and its history', ports: signals('done', 'refused'), parameters: { functionScript: PROMOTE_SCRIPT, ...quiet('memberId', 'was', 'by') } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'id' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'gate', 'in-userId'),
    wire('req', 'pm-admin', 'gate', 'in-admin'),
    wire('req', 'receive', 'gate', 'run'),
    wire('gate', 'out-loginId', 'grant', 'userId'),
    wire('gate', 'out-ok', 'grant', 'add'),
    wire('gate', 'out-memberId', 'promote', 'in-memberId'),
    wire('gate', 'out-was', 'promote', 'in-was'),
    wire('req', 'userId', 'promote', 'in-by'),
    wire('grant', 'done', 'promote', 'run'),
    wire('grant', 'unchanged', 'promote', 'run'),
    wire('promote', 'out-id', 'ok', 'pm-id'),
    wire('promote', 'out-done', 'ok', 'send'),
    wire('gate', 'out-reason', 'no', 'errorMessage'),
    wire('gate', 'out-refused', 'no', 'send'),
    ...['gate', 'grant', 'promote'].map((n) => wire(n, 'failure', 'no', 'send'))
  ]
};

export const GRAM_SLICE1_CLOUD: CloudComponent[] = [WHO_AM_I, SET_UP_COMMUNITY, ASK_TO_JOIN, LET_IN, TURN_AWAY, MAKE_ADMIN];
