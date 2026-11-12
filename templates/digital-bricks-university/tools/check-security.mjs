#!/usr/bin/env node
/**
 * GATE: ONLY THE RIGHT PEOPLE CAN TOUCH THE DATA (DBU-01).
 *
 *   node tools/check-security.mjs [--backend <url>] [--token <admin>]
 *
 * Runs against the backend reset-demo built, AS REAL USERS: a session is minted
 * for Camille, Jonas, Ana and the coach (master key; the app has no passwords)
 * and every request goes over HTTP exactly as a browser's would.
 *
 *  1. Nobody signed in reaches nothing.
 *  2. A learner cannot read, create, change or delete ANY row of ANY table
 *     directly, their own included (one-gate), or ring a doorbell.
 *  3. A learner cannot read another learner's files, by URL, by signing, or
 *     through fileLink; a file uploaded without the private flag is still closed.
 *  4. A learner's own read (myPlan) holds only their shared steps and their own
 *     hand-ins, ignores any id they send, and never carries coach notes.
 *     Home's read (learnerHome, DBU-05) holds exactly their shared steps in plan
 *     order, counts progress by the rule (live done, homework approved, check-in
 *     done), puts the first homework not approved up next, ignores any id sent,
 *     and answers the coach (no plan of their own) with an empty Home.
 *  5. A learner cannot set a review verdict, directly or through the function.
 *  6. A learner cannot call any role:staff function.
 *  7. The coach can do all of it, through the staff functions; the review is
 *     put back afterwards, so the seed is unchanged when this finishes.
 *  8. Signed out, no function answers (DBU-02) but unsubscribe, the one public function
 *     (DBU-07, checked in 14). The only other doors open to nobody are the sign-in ones
 *     (/auth/*), and public sign-up is closed.
 *  9. Asking for a sign-in link answers the same for an unknown address as for a
 *     known one, and mails only the known one (no account enumeration). This
 *     spends 2 of the backend's 5 link requests per 15 minutes per IP, so a
 *     third run in a row is refused (429) until reset-demo restarts it.
 * 10. The coach adds a learner (addLearner): a learner account, an active plan of
 *     DRAFT steps, one welcome email; a second press changes nothing and mails
 *     nothing; a coach's address is refused; the new learner sees no step. The
 *     learner is deleted afterwards, so the seed is unchanged.
 * 11. The homework library (DBU-03). A coach's resource file opens for a learner
 *     only through resourceLink, from a SHARED homework step of hers that lists
 *     it: an unrelated learner is refused by every door, and so is a draft step.
 *     The coach lists, creates, edits, duplicates and archives items; bad links,
 *     a learner's file and bad minutes are refused; editing the library never
 *     changes a step already copied. Everything is put back afterwards.
 * 12. The plan builder and templates (DBU-04), on a throwaway learner: start a
 *     plan from a template (drafts, 1..n), add live / library homework (a copy) /
 *     check-in steps, move one and then two at once (positions stay 1..n), edit
 *     live and homework fields (Paris times; bad values refused in a sentence),
 *     share only what is ready (the learner sees exactly that), remove (never a
 *     step with a hand-in), plan settings, save a plan as a template (the shape,
 *     no learner data), edit, archive and restore templates. All put back.
 * 13. Homework and hand-ins (DBU-06). myHomework gives a learner exactly their own shared
 *     homework and refuses anyone else's, a draft or a live session. handIn refuses another
 *     learner's step, a draft, an approved homework, another learner's file, a public upload, a
 *     kind not on the list, a file whose bytes are not what its name says, a bad link and empty
 *     text; SVG and anything over 50 MB are refused at upload. A file, a link and text become
 *     versions 1..n (two at once never share a number), the step is handed in and the learner's
 *     bell rings. The hand-in file opens for her and the coach only. Review: never an older
 *     version, changes only with a note, approval closes the homework. All put back.
 * 14. Messages and email (DBU-07). myMessages gives a learner her own conversation only (ids sent
 *     are ignored; another learner's homework thread is refused). sendMessage refuses empty text,
 *     another learner's step or file, too long, too many files; it saves hers and rings her bell
 *     only. The staff functions are refused to learners and the mail flush to everyone.
 *     messagesAsCoach marks only that learner's messages read; replyAsCoach reaches only her.
 *     setEmailPreference changes only the caller; unsubscribe with a wrong signature changes
 *     nothing and answers like any other call. All put back, mail included.
 * 15. The coach inbox (DBU-08). coachInbox answers the coach; it, snoozeQuiet and settleQuestion are
 *     refused to a learner, and the daily morningRound to everyone. QuietFlag is closed to learners,
 *     and the inbox bell snoozeQuiet rings is staff-only. The flag is put back.
 * 16. My creations (DBU-09). myCreations reads the caller's creations only (ids sent are ignored) and a
 *     creation from a hand-in shows what that version holds; creationsAsCoach is staff-only; roster counts
 *     them. saveCreation refuses someone else's row, no title, a kind off the list, a bad link, empty text and
 *     every file handIn refuses; editing one from a hand-in never changes what it holds. deleteCreation
 *     takes only her own row, never the hand-in. handIn's addToCreations makes one creation per homework
 *     that follows the newest version. All put back.
 * 17. Check-ins (DBU-10). myCheckin opens only the caller's own shared check-ins, and nothing signed out;
 *     answerCheckin refuses someone else's, and her own before it is sent, saving nothing; settleCheckin
 *     is staff-only and sendCheckins nobody's; CheckinResponse is closed to learners. Nothing is changed
 *     (tools/check-checkins.mjs answers, sends and settles on a scratch backend).
 *
 * Exit 1 with the failures listed, or exit 0 with a count of checks.
 */
import { adminClient } from './lib/admin-client.mjs';
import { BACKEND, MAILPIT, readJson, token } from './lib/local.mjs';

const schema = readJson('backend', 'schema.json');
const policy = readJson('nodegx.security.json');
const api = adminClient(BACKEND, token());
const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const refused = (r) => r.status >= 400;
const show = (r) => `${r.status} ${r.text.slice(0, 120)}`;

const users = await api.all('_User');
const idOf = (email) => users.find((u) => u.email === email)?.objectId;
const ids = {
  camille: idOf('camille.laurent@example.com'),
  jonas: idOf('jonas.weber@example.com'),
  ana: idOf('ana.ruiz@example.com'),
  sarah: idOf('sarah.oneill@example.com'),
  coach: idOf('coach@example.com')
};
if (Object.values(ids).some((v) => !v)) {
  console.error('check-security: the demo users are not there. Run node tools/reset-demo.mjs first.');
  process.exit(2);
}
const sessions = {};
for (const k of ['camille', 'jonas', 'ana', 'coach']) sessions[k] = await api.sessionFor(ids[k], `sec-${k}`);
const as = (who, method, path, body, headers) => api.as(who ? sessions[who].token : null, method, path, body, headers);
const fn = (who, name, body = {}) => as(who, 'POST', `/functions/${name}`, body);

const files = await api.all('_Files');
const fileOf = (prefix) => files.find((f) => f.originalName.startsWith(prefix)).storedName;
const camilleFile = fileOf('camille-');
const sarahFile = fileOf('sarah-');
// The mail sandbox (Mailpit's API). Each message as {id, to: [addresses], subject, text}.
const authConfig = await api.call('GET', '/admin/auth');
const APP_ORIGIN = ((authConfig.policy || authConfig.config || authConfig).redirectAllowList || [])[0];
if (!APP_ORIGIN) {
  console.error('check-security: the backend allows no app origin for sign-in links. Run node tools/setup-signin.mjs (reset-demo does).');
  process.exit(2);
}
async function inbox() {
  const r = await fetch(`${MAILPIT.web}/api/v1/messages?limit=200`);
  if (!r.ok) throw new Error(`Mailpit is not answering at ${MAILPIT.web} (run tools/reset-demo.mjs)`);
  return (await r.json()).messages.map((m) => ({ id: m.ID, to: m.To.map((t) => t.Address), subject: m.Subject }));
}
/** New mail (not in `before`) matching `match`, with its text, waiting up to 5 s for it to arrive. */
async function waitForMail(before, match) {
  const seen = new Set(before.map((m) => m.id));
  for (let i = 0; i < 25; i++) {
    const found = (await inbox()).filter((m) => !seen.has(m.id) && match(m));
    if (found.length) {
      for (const m of found) m.text = (await (await fetch(`${MAILPIT.web}/api/v1/message/${m.id}`)).json()).Text;
      return found;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return [];
}
/** Delete the mail this run sent, leaving what was there before. */
async function clearMail(before) {
  const keep = new Set(before.map((m) => m.id));
  const ids = (await inbox()).map((m) => m.id).filter((id) => !keep.has(id));
  if (ids.length) await fetch(`${MAILPIT.web}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: ids }) });
}

const staffFunctions = Object.entries(policy.functions).filter(([, r]) => r.call === 'role:staff').map(([n]) => n);

try {
  // ── 1. Signed out ──────────────────────────────────────────────────────────
  expect('signed out: find Plan refused', refused(await as(null, 'GET', '/classes/Plan')));
  expect('signed out: myPlan refused', refused(await fn(null, 'myPlan')));
  expect('signed out: upload refused', refused(await as(null, 'POST', '/files/x.txt', new TextEncoder().encode('x'))));
  expect('signed out: a private file refused', refused(await as(null, 'GET', `/files/${camilleFile}`)));

  // ── 2. No direct table access, own rows included ──────────────────────────
  for (const t of schema.tables.map((x) => x.name).filter((n) => n !== 'Doorbell')) {
    const rows = await api.all(t);
    const other = rows.find((r) => r.learner !== ids.camille);
    const own = rows.find((r) => r.learner === ids.camille);
    const r1 = await as('camille', 'GET', `/classes/${t}`);
    expect(`Camille: find ${t} refused`, refused(r1), show(r1));
    for (const [whose, row] of [['another learner\'s', other], ['her own', own]]) {
      if (!row) continue;
      const g = await as('camille', 'GET', `/classes/${t}/${row.objectId}`);
      expect(`Camille: get ${whose} ${t} refused`, refused(g), show(g));
      const u = await as('camille', 'PUT', `/classes/${t}/${row.objectId}`, { learner: ids.camille, title: 'changed', status: 'approved', review: 'approved' });
      const after = (await api.all(t, { objectId: row.objectId }))[0];
      expect(`Camille: update ${whose} ${t} refused and unchanged`, refused(u) && after.updatedAt === row.updatedAt, show(u));
      const d = await as('camille', 'DELETE', `/classes/${t}/${row.objectId}`);
      expect(`Camille: delete ${whose} ${t} refused and still there`, refused(d) && (await api.all(t, { objectId: row.objectId })).length === 1, show(d));
    }
    const before = await api.countOf(t);
    const c = await as('camille', 'POST', `/classes/${t}`, { learner: ids.camille, title: 'x', body: 'x' });
    expect(`Camille: create ${t} refused`, refused(c) && (await api.countOf(t)) === before, show(c));
  }
  const otherUser = await as('camille', 'GET', `/classes/_User/${ids.jonas}`);
  const userList = await as('camille', 'GET', '/classes/_User');
  expect('Camille: cannot read another user\'s account', refused(otherUser) || !otherUser.json.email, show(otherUser));
  expect('Camille: cannot list users', refused(userList) || (userList.json.results || []).every((u) => u.objectId === ids.camille), show(userList));
  expect('Camille: cannot list files', refused(await as('camille', 'GET', '/classes/_Files')));
  expect('Camille: cannot ring a doorbell', refused(await as('camille', 'POST', '/classes/Doorbell', { learner: ids.jonas, topic: 'plan' })));

  // ── 3. Files ───────────────────────────────────────────────────────────────
  expect('Camille: Sarah\'s file by URL refused', refused(await as('camille', 'GET', `/files/${sarahFile}`)));
  expect('Camille: signing Sarah\'s file refused', refused(await as('camille', 'GET', `/files/${sarahFile}/sign`)));
  const steal = await fn('camille', 'fileLink', { name: sarahFile });
  expect('Camille: fileLink on Sarah\'s file refused', refused(steal), show(steal));
  expect('Camille: deleting Sarah\'s file refused', refused(await as('camille', 'DELETE', `/files/${sarahFile}`)));
  const mine = await fn('camille', 'fileLink', { name: camilleFile });
  const got = mine.ok ? await fetch(BACKEND + mine.json.result.url) : null;
  expect('Camille: fileLink on her own file works', got && got.ok && (got.headers.get('content-type') || '').includes('pdf'), show(mine));
  const pub = await as('camille', 'POST', '/files/not-private.txt', new TextEncoder().encode('hello'));
  if (pub.ok) {
    expect('Jonas: a file uploaded WITHOUT the private flag is still closed', refused(await as('jonas', 'GET', `/files/${pub.json.name}`)));
    await api.raw('DELETE', `/files/${pub.json.name}`, { headers: { 'X-Parse-Master-Key': token() } });
  } else expect('Camille: a plain upload is accepted (files.upload authenticated)', false, show(pub));

  // ── 4. The learner's own read ──────────────────────────────────────────────
  const steps = await api.all('Step');
  const subs = await api.all('Submission');
  const notes = await api.all('CoachNote');
  const sharedIdsOf = (k) => steps.filter((s) => s.learner === ids[k] && s.shared).map((s) => s.objectId).sort();
  for (const k of ['camille', 'jonas']) {
    const r = await fn(k, 'myPlan');
    const res = r.json.result || {};
    const got = (res.steps || []).map((s) => s.id).sort();
    expect(`${k}: myPlan holds exactly their shared steps`, r.ok && JSON.stringify(got) === JSON.stringify(sharedIdsOf(k)), `${got.length} vs ${sharedIdsOf(k).length}`);
    const ownSubs = new Set(subs.filter((s) => s.learner === ids[k]).map((s) => s.objectId));
    expect(`${k}: myPlan holds only their own hand-ins`, (res.submissions || []).every((s) => ownSubs.has(s.id)));
    const text = JSON.stringify(res);
    expect(`${k}: myPlan carries no coach note`, !('notes' in res) && notes.every((n) => !text.includes(n.body)));
  }
  const unshared = steps.find((s) => s.learner === ids.camille && !s.shared);
  expect('Camille: the seed has an unshared step to hide', !!unshared);
  const spoof = await fn('camille', 'myPlan', { learnerId: ids.jonas, learner: ids.jonas, userId: ids.jonas });
  const spoofIds = (spoof.json.result?.steps || []).map((s) => s.id).sort();
  expect('Camille: myPlan ignores another learner\'s id sent in the body', JSON.stringify(spoofIds) === JSON.stringify(sharedIdsOf('camille')));

  // ── 4b. Home (DBU-05): learnerHome, the learner's Home worked out ─────────
  expect('signed out: learnerHome refused', refused(await fn(null, 'learnerHome')));
  const COMPLETE = { live: 'done', homework: 'approved', checkin: 'done' };
  const inOrderOf = (k) => steps.filter((s) => s.learner === ids[k] && s.shared).sort((a, b) => a.position - b.position);
  const homeIds = (r) => ((r.json.result || {}).steps || []).map((s) => s.id);
  for (const k of ['camille', 'jonas', 'ana']) {
    const r = await fn(k, 'learnerHome');
    const res = r.json.result || {};
    const want = inOrderOf(k);
    expect(`${k}: learnerHome holds exactly their shared steps, in plan order`, r.ok && JSON.stringify(homeIds(r)) === JSON.stringify(want.map((s) => s.objectId)), `${homeIds(r).length} vs ${want.length}`);
    const done = want.filter((s) => COMPLETE[s.kind] === s.status).length;
    expect(`${k}: learnerHome progress is complete / shared (${done} of ${want.length})`, res.progress && res.progress.complete === done && res.progress.total === want.length, JSON.stringify(res.progress));
    const owed = want.find((s) => s.kind === 'homework' && s.status !== 'approved');
    expect(`${k}: up next is the first homework in plan order that is not approved`, ((res.upNext && res.upNext.homework && res.upNext.homework.id) || null) === (owed ? owed.objectId : null));
    const text = JSON.stringify(res);
    const hidden = steps.filter((s) => s.learner !== ids[k] || !s.shared);
    expect(`${k}: learnerHome carries no coach note, no draft and nobody else's step`, notes.every((n) => !text.includes(n.body)) && hidden.every((s) => !text.includes(`"${s.objectId}"`)));
  }
  const camLive = inOrderOf('camille').filter((s) => s.kind === 'live' && s.status === 'booked' && Date.parse(s.startsAt) > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const camHome = (await fn('camille', 'learnerHome')).json.result || {};
  const camPlan = (await api.all('Plan', { learner: ids.camille }))[0];
  expect('Camille: up next is her next booked session, with the plan\'s meeting link', camLive && camHome.upNext.live && camHome.upNext.live.id === camLive.objectId &&
    camHome.upNext.live.meetingLink === (camLive.meetingLink || camPlan.meetingLink), JSON.stringify(camHome.upNext && camHome.upNext.live && camHome.upNext.live.id));
  const homeSpoof = await fn('camille', 'learnerHome', { learnerId: ids.jonas, learner: ids.jonas, userId: ids.jonas });
  expect('Camille: learnerHome ignores another learner\'s id sent in the body', JSON.stringify(homeIds(homeSpoof)) === JSON.stringify(inOrderOf('camille').map((s) => s.objectId)));
  const coachHome = await fn('coach', 'learnerHome');
  expect('coach: learnerHome answers with an empty Home (no plan of their own)', coachHome.ok && coachHome.json.result.plan === null && coachHome.json.result.steps.length === 0, show(coachHome));

  // ── 5. Verdicts ────────────────────────────────────────────────────────────
  const anaPending = subs.find((s) => s.learner === ids.ana && s.review === 'pending');
  const direct = await as('ana', 'PUT', `/classes/Submission/${anaPending.objectId}`, { review: 'approved' });
  const viaFn = await fn('ana', 'reviewSubmission', { submissionId: anaPending.objectId, verdict: 'approved' });
  const camOther = await fn('camille', 'reviewSubmission', { submissionId: anaPending.objectId, verdict: 'changes' });
  const still = (await api.all('Submission', { objectId: anaPending.objectId }))[0];
  expect('Ana: setting her own verdict directly refused', refused(direct), show(direct));
  expect('Ana: reviewSubmission refused', refused(viaFn), show(viaFn));
  expect('Camille: reviewSubmission on Ana\'s hand-in refused', refused(camOther), show(camOther));
  expect('Ana\'s hand-in is still pending', still.review === 'pending' && !still.reviewedAt);

  // ── 6. Staff functions ─────────────────────────────────────────────────────
  const staffArgs = { saveLibraryItem: { title: 'Camille was here' }, duplicateLibraryItem: { id: 'lib-vocab-activity' }, archiveLibraryItem: { id: 'lib-vocab-activity', archived: true }, addLearner: { name: 'Eve Example', email: 'eve.camille-tried@example.com' }, learnerAsCoach: { learnerId: ids.jonas }, reviewSubmission: { submissionId: anaPending.objectId, verdict: 'approved' }, fileLinkAsCoach: { name: sarahFile } };
  for (const name of staffFunctions) {
    const r = await fn('camille', name, staffArgs[name] || {});
    expect(`Camille: ${name} (role:staff) refused`, r.status === 403, show(r));
  }

  // ── 7. The coach can do all of it ──────────────────────────────────────────
  for (const k of ['camille', 'jonas', 'ana', 'sarah']) {
    const r = await fn('coach', 'learnerAsCoach', { learnerId: ids[k] });
    const res = r.json.result || {};
    const all = steps.filter((s) => s.learner === ids[k]).map((s) => s.objectId).sort();
    expect(`coach: learnerAsCoach(${k}) returns every step, shared or not`, r.ok && JSON.stringify((res.steps || []).map((s) => s.id).sort()) === JSON.stringify(all), show(r));
    const theirNotes = notes.filter((n) => n.learner === ids[k]).map((n) => n.body).sort();
    expect(`coach: learnerAsCoach(${k}) returns their coach notes`, JSON.stringify((res.notes || []).map((n) => n.body).sort()) === JSON.stringify(theirNotes));
  }
  const cf = await fn('coach', 'fileLinkAsCoach', { name: sarahFile });
  const cfGot = cf.ok ? await fetch(BACKEND + cf.json.result.url) : null;
  const bytes = cfGot && cfGot.ok ? new TextDecoder().decode((await cfGot.arrayBuffer()).slice(0, 5)) : '';
  expect('coach: fileLinkAsCoach opens Sarah\'s PDF', bytes === '%PDF-', show(cf));

  const bellsBefore = (await api.all('Doorbell')).map((b) => b.objectId);
  const anaStep = (await api.all('Step', { objectId: anaPending.step }))[0];
  const review = await fn('coach', 'reviewSubmission', { submissionId: anaPending.objectId, verdict: 'approved', note: 'check-security' });
  try {
    const sub = (await api.all('Submission', { objectId: anaPending.objectId }))[0];
    const step = (await api.all('Step', { objectId: anaPending.step }))[0];
    expect('coach: reviewSubmission approves Ana\'s hand-in', review.ok && sub.review === 'approved' && sub.reviewedAt && step.status === 'approved', show(review));
    const again = await fn('coach', 'reviewSubmission', { submissionId: anaPending.objectId, verdict: 'changes' });
    expect('coach: a second verdict on the same hand-in is refused', refused(again), show(again));
    const bells = (await api.all('Doorbell')).filter((b) => !bellsBefore.includes(b.objectId));
    expect('the review rang one doorbell, for Ana', bells.length === 1 && bells[0].learner === ids.ana);
    const heard = async (who) => ((await as(who, 'GET', '/classes/Doorbell')).json.results || []).filter((b) => b.learner === ids.ana).length;
    expect('Ana hears her doorbell', (await heard('ana')) === 1);
    expect('Camille does not hear Ana\'s doorbell', (await heard('camille')) === 0);
    expect('the coach hears Ana\'s doorbell', (await heard('coach')) === 1);
  } finally {
    // Put the seed back exactly: the hand-in pending, the step handed in, no new bell.
    await api.data('PUT', `/classes/Submission/${anaPending.objectId}`, { review: 'pending', reviewNote: anaPending.reviewNote ?? null, reviewedAt: null });
    await api.data('PUT', `/classes/Step/${anaPending.step}`, { status: anaStep.status });
    for (const b of await api.all('Doorbell')) if (!bellsBefore.includes(b.objectId)) await api.data('DELETE', `/classes/Doorbell/${b.objectId}`);
  }
  const restored = (await api.all('Submission', { objectId: anaPending.objectId }))[0];
  expect('afterwards: Ana\'s hand-in is pending again (seed unchanged)', restored.review === 'pending' && !restored.reviewedAt);

  const coachDirect = await as('coach', 'GET', '/classes/Plan');
  expect('coach: direct table reads are refused too (one gate for everyone)', refused(coachDirect), show(coachDirect));
  expect('nobody was added by Camille\'s addLearner attempt', !(await api.all('_User')).some((u) => u.email === 'eve.camille-tried@example.com'));

  // ── 8. Signed out: no function, only the sign-in doors ────────────────────
  // Two functions are public. unsubscribe (DBU-07): its link comes from an email, and it acts only on a
  // right signature (section 14). coachName (DBU-11): the words name the coach on the Sign in page too,
  // and it answers the name only (section 14). Anything else made public would fail here.
  const PUBLIC_FUNCTIONS = ['unsubscribe', 'coachName'];
  expect('policy: the only public functions are unsubscribe and coachName', JSON.stringify(Object.entries(policy.functions).filter(([, r]) => r.call === 'public').map(([n]) => n).sort()) === JSON.stringify([...PUBLIC_FUNCTIONS].sort()));
  for (const name of Object.keys(policy.functions).filter((n) => !PUBLIC_FUNCTIONS.includes(n))) {
    const r = await fn(null, name, {});
    expect(`signed out: ${name} refused`, r.status === 401 || r.status === 403, show(r));
  }
  const providers = await as(null, 'GET', '/auth/providers');
  expect('signed out: the sign-in door is open and offers magic links', providers.ok && providers.json.magicLink && providers.json.magicLink.enabled === true, show(providers));
  const signup = await as(null, 'POST', '/users', { username: 'walk-in@example.com', email: 'walk-in@example.com', password: 'walk-in-123456' });
  expect('signed out: public sign-up refused', refused(signup) && !(await api.all('_User')).some((u) => u.email === 'walk-in@example.com'), show(signup));

  // ── 9. Sign-in links: one answer for every address ────────────────────────
  const redirect = `${new URL(APP_ORIGIN).origin}/`;
  const before = await inbox();
  const known = await as(null, 'POST', '/auth/magic-link', { email: 'jonas.weber@example.com', redirect });
  const unknown = await as(null, 'POST', '/auth/magic-link', { email: 'nobody.here@example.com', redirect });
  if (known.status === 429 || unknown.status === 429) {
    expect('magic link: not rate-limited. The backend allows 5 link requests per 15 minutes per IP and this gate spends 2; run node tools/reset-demo.mjs and try again', false);
  }
  expect('magic link: an unknown address gets the same answer as a known one', known.status === unknown.status && known.text === unknown.text, `${show(known)} vs ${show(unknown)}`);
  const linkMail = await waitForMail(before, (m) => m.to.includes('jonas.weber@example.com'));
  expect('magic link: the known address gets one mail, with a link', linkMail.length === 1 && /magic-link\/callback\?token=/.test(linkMail[0].text || ''));
  const after = await inbox();
  expect('magic link: no mail at all for the unknown address', !after.some((m) => m.to.includes('nobody.here@example.com')));
  expect('magic link: an unknown address made no account', !(await api.all('_User')).some((u) => u.email === 'nobody.here@example.com'));

  // ── 10. The coach adds a learner ───────────────────────────────────────────
  const NEW = 'nadia.haddad@example.com';
  const beforeAdd = await inbox();
  const add = await fn('coach', 'addLearner', { name: 'Nadia Haddad', email: '  Nadia.Haddad@Example.com ', organisation: 'Atelier Mots', templateId: 'tpl-language-trainers' });
  const nadia = (await api.all('_User')).find((u) => u.email === NEW);
  try {
    expect('coach: addLearner creates the account (address trimmed, lower-cased)', add.ok && add.json.result.created === true && nadia && nadia.username === NEW && nadia.name === 'Nadia Haddad', show(add));
    if (nadia) {
      const roles = (await api.call('GET', '/admin/roles')).roles;
      const inRole = (name) => (roles.find((r) => r.name === name)?.users || []).includes(nadia.objectId);
      expect('the new account is a learner, not staff', inRole('learner') && !inRole('staff'));
      const plans = await api.all('Plan', { learner: nadia.objectId });
      const newSteps = await api.all('Step', { learner: nadia.objectId });
      expect('the new learner has one active plan, from the chosen template', plans.length === 1 && plans[0].status === 'active' && plans[0].fromTemplate === 'tpl-language-trainers');
      expect('every step of it is a draft (not shared)', newSteps.length > 0 && newSteps.every((x) => x.shared === false));
      const welcome = await waitForMail(beforeAdd, (m) => m.to.includes(NEW));
      expect('one welcome email, with the way to sign in', welcome.length === 1 && welcome[0].subject === 'Welcome to Digital Bricks University' && (welcome[0].text || '').includes(`/sign-in?email=${encodeURIComponent(NEW)}`));
      const again = await fn('coach', 'addLearner', { name: 'Nadia H.', email: NEW });
      await new Promise((r) => setTimeout(r, 800));
      const sentBefore = new Set(beforeAdd.map((m) => m.id));
      const welcomes = (await inbox()).filter((m) => !sentBefore.has(m.id) && m.to.includes(NEW) && m.subject.startsWith('Welcome'));
      expect('a second press changes nothing and mails nothing', again.ok && again.json.result.created === false && welcomes.length === 1 &&
        (await api.all('Plan', { learner: nadia.objectId })).length === 1 && (await api.all('_User', { objectId: nadia.objectId }))[0].name === 'Nadia Haddad', show(again));
      const r = await fn('coach', 'roster');
      expect('the roster lists her, with her plan', r.ok && (r.json.result.learners || []).some((l) => l.id === nadia.objectId && l.planTitle === plans[0].title), show(r));
      const ns = await api.sessionFor(nadia.objectId, 'sec-nadia');
      try {
        const np = await api.as(ns.token, 'POST', '/functions/myPlan', {});
        const res = np.json.result || {};
        expect('Nadia: myPlan answers with her name and no step (all drafts)', np.ok && res.me && res.me.name === 'Nadia Haddad' && (res.steps || []).length === 0, show(np));
        const nh = await api.as(ns.token, 'POST', '/functions/learnerHome', {});
        const nhr = nh.json.result || {};
        expect('Nadia: learnerHome answers with her plan, no step and nothing up next (Home says Richard is preparing it)', nh.ok && nhr.plan && nhr.steps.length === 0 &&
          !nhr.upNext.homework && !nhr.upNext.live && nhr.progress.total === 0, show(nh));
        const nr = await api.as(ns.token, 'POST', '/functions/roster', {});
        expect('Nadia: roster (role:staff) refused', nr.status === 403, show(nr));
      } finally {
        await api.endSession(ns).catch(() => {});
      }
    }
    const asCoach = await fn('coach', 'addLearner', { name: 'Richard again', email: 'coach@example.com' });
    expect('coach: a coach\'s address cannot be added as a learner', refused(asCoach) && /coach/.test(asCoach.json.error || ''), show(asCoach));
    const badMail = await fn('coach', 'addLearner', { name: 'Typo', email: 'not-an-address' });
    expect('coach: a malformed address is refused in a sentence, nothing made', refused(badMail) && !(await api.all('_User')).some((u) => u.email === 'not-an-address'), show(badMail));
  } finally {
    // Put the seed back: no Nadia, no plan, no steps, no role membership.
    if (nadia) {
      for (const t of ['Step', 'Plan']) for (const row of await api.all(t, { learner: nadia.objectId })) await api.data('DELETE', `/classes/${t}/${row.objectId}`);
      await api.call('DELETE', `/admin/roles/learner/users/${nadia.objectId}`).catch(() => {});
      await api.data('DELETE', `/classes/_User/${nadia.objectId}`);
    }
    await clearMail(beforeAdd.concat(before));
  }
  // ── 11. The homework library ──────────────────────────────────────────────
  const libBefore = await api.all('LibraryItem');
  const libFile = libBefore.flatMap((l) => l.resources || []).find((r) => r.file)?.file;
  expect('the seed has a library resource file, uploaded by the coach', libFile && [files.find((f) => f.storedName === libFile)?.owner].map((o) => (o && typeof o === 'object' ? o.objectId : o))[0] === ids.coach);
  const homeworkWith = (k) => steps.filter((x) => x.learner === ids[k] && x.kind === 'homework' && (x.resources || []).some((r) => r.file === libFile));
  const camStep = homeworkWith('camille').find((x) => x.shared);
  const jonasStep = steps.find((x) => x.learner === ids.jonas && x.kind === 'homework' && x.shared);
  expect('Camille has a shared homework step listing it; Jonas has none', camStep && jonasStep && homeworkWith('jonas').length === 0);
  if (camStep && jonasStep) {
    const ok = await fn('camille', 'resourceLink', { stepId: camStep.objectId, file: libFile });
    const okGot = ok.ok ? await fetch(BACKEND + ok.json.result.url) : null;
    const okBytes = okGot && okGot.ok ? new TextDecoder().decode((await okGot.arrayBuffer()).slice(0, 5)) : '';
    expect('Camille: resourceLink opens the coach\'s file from her shared step', okBytes === '%PDF-', show(ok));
    for (const [what, r] of [
      ['resourceLink through Camille\'s step', await fn('jonas', 'resourceLink', { stepId: camStep.objectId, file: libFile })],
      ['resourceLink through his own step', await fn('jonas', 'resourceLink', { stepId: jonasStep.objectId, file: libFile })],
      ['fileLink', await fn('jonas', 'fileLink', { name: libFile })],
      ['the file by URL', await as('jonas', 'GET', `/files/${libFile}`)],
      ['signing the file', await as('jonas', 'GET', `/files/${libFile}/sign`)]
    ]) expect(`Jonas (unrelated learner): ${what} refused`, refused(r), show(r));
    expect('Camille: resourceLink for a file her step does not list refused', refused(await fn('camille', 'resourceLink', { stepId: camStep.objectId, file: sarahFile })));
    // A draft (unshared) step that lists the file does not count: learners never see a draft.
    const draft = steps.find((x) => x.learner === ids.camille && x.kind === 'homework' && !x.shared);
    if (draft) {
      await api.data('PUT', `/classes/Step/${draft.objectId}`, { resources: [{ label: 'x', file: libFile, fileName: 'x.pdf' }] });
      try {
        expect('Camille: resourceLink through a draft step refused', refused(await fn('camille', 'resourceLink', { stepId: draft.objectId, file: libFile })));
      } finally {
        await api.data('PUT', `/classes/Step/${draft.objectId}`, { resources: draft.resources || [] });
      }
    } else expect('the seed has a draft homework step for Camille', false);
  }

  const lib = await fn('coach', 'library');
  const items = lib.json.result?.items || [];
  expect('coach: library lists every item, in the editor\'s shapes', lib.ok && items.length === libBefore.length &&
    items.every((i) => Array.isArray(i.handInChecklist) && i.handInChecklist.every((c) => typeof c.text === 'string' && typeof c.required === 'boolean') && typeof i.archived === 'boolean'), show(lib));
  const made = [];
  const coachUpload = await as('coach', 'POST', '/files/check-security-resource.txt', new TextEncoder().encode('a resource'), { 'X-NodeGX-File-Private': 'true' });
  const vocab = libBefore.find((l) => l.objectId === 'lib-vocab-activity');
  const vocabStepsBefore = (await api.all('Step', { fromLibraryItem: 'lib-vocab-activity' })).map((x) => [x.objectId, x.brief, JSON.stringify(x.resources)]);
  try {
    const good = {
      title: '  Record a  two-minute lesson intro ', brief: 'Say **hello**.\n\n- one\n- two', estimatedMinutes: '45', tags: ['Speaking', 'speaking', 'video '],
      handInChecklist: [{ text: 'The recording', required: true }, { text: 'What you would change', required: false }, { text: '  ', required: true }],
      resources: [{ label: 'Example', url: 'https://resources.example.com/intro' }, { label: 'Script', file: coachUpload.json.name, fileName: 'script.txt' }]
    };
    const created = await fn('coach', 'saveLibraryItem', good);
    const newId = created.json.result?.id;
    if (newId) made.push(newId);
    const row = newId ? (await api.all('LibraryItem', { objectId: newId }))[0] : null;
    expect('coach: saveLibraryItem creates an item, tidied (title, tags, empty checklist row, minutes)', created.ok && row && row.title === 'Record a two-minute lesson intro' &&
      JSON.stringify(row.tags) === '["Speaking","video"]' && row.handInChecklist.length === 2 && row.handInChecklist[1].required === false &&
      row.estimatedMinutes === 45 && row.archived === false && row.resources.length === 2 && row.resources[1].file === coachUpload.json.name, show(created));
    const edited = await fn('coach', 'saveLibraryItem', { ...good, id: newId, title: 'Record a lesson intro', resources: [row.resources[1], row.resources[0]] });
    const row2 = newId ? (await api.all('LibraryItem', { objectId: newId }))[0] : null;
    expect('coach: saveLibraryItem edits it (title, resources reordered)', edited.ok && edited.json.result.created === false && row2.title === 'Record a lesson intro' && row2.resources[0].fileName === 'script.txt', show(edited));
    for (const [what, body] of [
      ['a javascript: link', { ...good, id: newId, resources: [{ label: 'x', url: 'javascript:alert(1)' }] }],
      ['a learner\'s private file', { ...good, id: newId, resources: [{ label: 'x', file: camilleFile, fileName: 'x.pdf' }] }],
      ['minutes that are not a whole number', { ...good, id: newId, estimatedMinutes: '1.5' }],
      ['an empty title', { ...good, id: newId, title: '   ' }],
      ['an id that is not in the library', { ...good, id: 'no-such-item' }]
    ]) {
      const r = await fn('coach', 'saveLibraryItem', body);
      expect(`coach: saveLibraryItem refuses ${what}, in a sentence`, refused(r) && /[a-z] /.test(r.json.error || ''), show(r));
    }
    const row3 = (await api.all('LibraryItem', { objectId: newId }))[0];
    expect('coach: the refused saves changed nothing', row3.updatedAt === row2.updatedAt);

    const dup = await fn('coach', 'duplicateLibraryItem', { id: 'lib-vocab-activity', title: 'Copy of the vocabulary activity' });
    const dupId = dup.json.result?.id;
    if (dupId) made.push(dupId);
    const dupRow = dupId ? (await api.all('LibraryItem', { objectId: dupId }))[0] : null;
    expect('coach: duplicateLibraryItem copies brief, checklist, resources, tags and time under the new title', dup.ok && dupRow && dupRow.title === 'Copy of the vocabulary activity' &&
      dupRow.brief === vocab.brief && JSON.stringify(dupRow.handInChecklist) === JSON.stringify(vocab.handInChecklist) && JSON.stringify(dupRow.resources) === JSON.stringify(vocab.resources) &&
      JSON.stringify(dupRow.tags) === JSON.stringify(vocab.tags) && dupRow.estimatedMinutes === vocab.estimatedMinutes, show(dup));

    const arch = await fn('coach', 'archiveLibraryItem', { id: 'lib-vocab-activity', archived: true });
    const listed = ((await fn('coach', 'library')).json.result?.items || []).find((i) => i.id === 'lib-vocab-activity');
    expect('coach: archiveLibraryItem archives, and the library says so', arch.ok && listed && listed.archived === true, show(arch));
    const ed = await fn('coach', 'saveLibraryItem', { id: 'lib-vocab-activity', title: vocab.title, brief: 'A NEW BRIEF', handInChecklist: vocab.handInChecklist, resources: vocab.resources, tags: vocab.tags, estimatedMinutes: vocab.estimatedMinutes });
    expect('coach: an item keeps the coach\'s files it already had when edited', ed.ok, show(ed));
    const vocabStepsAfter = (await api.all('Step', { fromLibraryItem: 'lib-vocab-activity' })).map((x) => [x.objectId, x.brief, JSON.stringify(x.resources)]);
    expect('editing and archiving a library item changes no step already copied from it (R4)', vocabStepsBefore.length > 0 && JSON.stringify(vocabStepsAfter) === JSON.stringify(vocabStepsBefore));
  } finally {
    // Put the seed back: the vocabulary item as it was, no new items, no new file.
    await api.data('PUT', '/classes/LibraryItem/lib-vocab-activity', {
      title: vocab.title, brief: vocab.brief, handInChecklist: vocab.handInChecklist, resources: vocab.resources, tags: vocab.tags, estimatedMinutes: vocab.estimatedMinutes, archived: vocab.archived
    });
    for (const id of made) await api.data('DELETE', `/classes/LibraryItem/${id}`);
    if (coachUpload.ok) await api.raw('DELETE', `/files/${coachUpload.json.name}`, { headers: { 'X-Parse-Master-Key': token() } });
  }
  const libAfter = await api.all('LibraryItem');
  expect('afterwards: the library is as seeded', libAfter.length === libBefore.length &&
    JSON.stringify(libAfter.find((l) => l.objectId === 'lib-vocab-activity').brief) === JSON.stringify(vocab.brief) && libAfter.every((l) => l.archived === false));

  // ── 12. The plan builder and templates (DBU-04) ───────────────────────────
  const tplBefore = await api.all('PlanTemplate');
  const OMAR = 'omar.benali@example.com';
  const madeTemplates = [];
  const mailBeforeOmar = await inbox();
  let omar = null;
  try {
    const addOmar = await fn('coach', 'addLearner', { name: 'Omar Benali', email: OMAR });
    omar = (await api.all('_User')).find((u) => u.email === OMAR);
    const omarPlan = omar ? (await api.all('Plan', { learner: omar.objectId }))[0] : null;
    expect('plan: a learner added with no template has an empty plan, and is welcomed by email', addOmar.ok && addOmar.json.result.mailed === true && omarPlan && (await api.all('Step', { plan: omarPlan.objectId })).length === 0, show(addOmar));
    if (omar && omarPlan) {
      const planId = omarPlan.objectId;
      const stepsNow = async () => (await api.all('Step', { plan: planId })).sort((a, b) => a.position - b.position);
      const contiguous = (rows) => rows.every((s, i) => s.position === i + 1);

      // Start from a template: its items as drafts, the plan named after it.
      const ap = await fn('coach', 'applyTemplate', { planId, templateId: 'tpl-events' });
      let rows = await stepsNow();
      const tplEvents = tplBefore.find((t) => t.objectId === 'tpl-events');
      const planAfter = (await api.all('Plan', { objectId: planId }))[0];
      expect('plan: applyTemplate adds the template\'s items as drafts, in order, 1..n', ap.ok && ap.json.result.added === tplEvents.items.length && rows.length === tplEvents.items.length &&
        rows.every((s, i) => s.title === tplEvents.items[i].title && s.kind === tplEvents.items[i].kind && s.shared === false) && contiguous(rows), show(ap));
      expect('plan: an empty plan started from a template takes its title and remembers it', planAfter.fromTemplate === 'tpl-events' && planAfter.title === tplEvents.title);
      expect('plan: homework from a template gets a due date from its day offset', rows.filter((s) => s.kind === 'homework').every((s) => !Number.isNaN(Date.parse(s.dueAt))));
      const lac = await fn('coach', 'learnerAsCoach', { learnerId: omar.objectId });
      expect('plan: learnerAsCoach says which template the plan started from, and offers the templates', lac.ok && lac.json.result.plan.templateTitle === tplEvents.title &&
        (lac.json.result.templates || []).length === tplBefore.filter((t) => t.archived !== true).length, show(lac));

      // Add steps: live, homework from the library (a copy), check-in; an archived item is refused.
      const live = await fn('coach', 'addStep', { planId, kind: 'live', title: 'Extra session' });
      const hw = await fn('coach', 'addStep', { planId, kind: 'homework', title: 'x', libraryItemId: 'lib-vocab-activity' });
      const ci = await fn('coach', 'addStep', { planId, kind: 'checkin', title: 'Mid-point check-in' });
      rows = await stepsNow();
      const liveRow = rows.find((s) => s.objectId === live.json.result?.stepId);
      const hwRow = rows.find((s) => s.objectId === hw.json.result?.stepId);
      const ciRow = rows.find((s) => s.objectId === ci.json.result?.stepId);
      const vocabNow = (await api.all('LibraryItem', { objectId: 'lib-vocab-activity' }))[0];
      expect('plan: + Live session adds a draft at the end, to book, 60 minutes', liveRow && liveRow.position === tplEvents.items.length + 1 && liveRow.shared === false && liveRow.status === 'to_book' && liveRow.durationMin === 60, show(live));
      expect('plan: picking from the library COPIES the item (brief, list, resources, fromLibraryItem)', hwRow && hwRow.fromLibraryItem === 'lib-vocab-activity' && hwRow.title === vocabNow.title &&
        hwRow.brief === vocabNow.brief && JSON.stringify(hwRow.resources) === JSON.stringify(vocabNow.resources) && JSON.stringify(hwRow.handInChecklist) === JSON.stringify(vocabNow.handInChecklist), show(hw));
      expect('plan: + Check-in adds a draft with a placeholder form', ciRow && ciRow.status === 'scheduled' && Array.isArray(ciRow.form?.questions) && ciRow.form.questions.length > 0, show(ci));
      expect('plan: positions are still 1..n', contiguous(rows));
      await api.data('PUT', '/classes/LibraryItem/lib-interactive-page', { archived: true });
      const fromArchived = await fn('coach', 'addStep', { planId, kind: 'homework', title: 'x', libraryItemId: 'lib-interactive-page' });
      await api.data('PUT', '/classes/LibraryItem/lib-interactive-page', { archived: false });
      expect('plan: an archived library item cannot be added', refused(fromArchived), show(fromArchived));
      expect('plan: a step of an unknown kind is refused', refused(await fn('coach', 'addStep', { planId, kind: 'party', title: 'x' })));

      // Reorder: one move, then two at once; positions stay 1..n with no duplicates.
      const mv = await fn('coach', 'moveStep', { stepId: liveRow.objectId, index: 1 });
      rows = await stepsNow();
      expect('plan: moveStep puts the step where it was dropped and renumbers 1..n', mv.ok && rows[1].objectId === liveRow.objectId && contiguous(rows), show(mv));
      const pair = await Promise.all([fn('coach', 'moveStep', { stepId: rows[0].objectId, index: 5 }), fn('coach', 'moveStep', { stepId: rows[3].objectId, index: 0 })]);
      rows = await stepsNow();
      expect('plan: two moves at once both land, with no duplicate or missing position', pair.every((r) => r.ok) && contiguous(rows) && new Set(rows.map((s) => s.position)).size === rows.length,
        `${pair.map(show).join(' / ')} → ${rows.map((s) => s.position).join(',')}`);

      // Edit inline: live and homework fields, each checked.
      const booked = await fn('coach', 'saveStep', { id: liveRow.objectId, title: 'Extra session: your questions', startsAt: '2026-12-01T14:00', durationMin: '90', recordingUrl: '', summary: 'We **cleared** the backlog.' });
      let lr = (await api.all('Step', { objectId: liveRow.objectId }))[0];
      expect('plan: saveStep books a live session at the coach\'s Paris time', booked.ok && lr.startsAt === '2026-12-01T13:00:00.000Z' && lr.status === 'booked' && lr.durationMin === 90 && lr.title === 'Extra session: your questions', show(booked));
      for (const [what, body] of [
        ['a duration that is not a whole number', { durationMin: '1.5' }],
        ['a javascript: recording link', { recordingUrl: 'javascript:alert(1)' }],
        ['an unreadable time', { startsAt: 'next tuesday' }],
        ['an empty title', { title: '  ' }]
      ]) {
        const r = await fn('coach', 'saveStep', Object.assign({ id: liveRow.objectId, title: lr.title }, body));
        expect(`plan: saveStep refuses ${what} in a sentence`, refused(r) && (r.json.error || '').length > 10, show(r));
      }
      const unbooked = await fn('coach', 'saveStep', { id: liveRow.objectId, title: lr.title, startsAt: '' });
      lr = (await api.all('Step', { objectId: liveRow.objectId }))[0];
      expect('plan: clearing the time puts a session back to "to book"', unbooked.ok && !lr.startsAt && lr.status === 'to_book', show(unbooked));
      const stealRes = await fn('coach', 'saveStep', { id: hwRow.objectId, title: hwRow.title, resources: [{ label: 'x', file: sarahFile, fileName: 'x.pdf' }] });
      expect('plan: a learner\'s private file cannot be attached to a step', refused(stealRes), show(stealRes));
      const hwSave = await fn('coach', 'saveStep', { id: hwRow.objectId, title: 'Vocabulary activity, Omar\'s version', dueAt: '2026-12-05', brief: 'Make it about **events**.',
        handInChecklist: [{ text: 'The link', required: true }], resources: hwRow.resources.concat([{ label: 'Guide', url: 'https://guide.example.com/vocab' }]) });
      const hr = (await api.all('Step', { objectId: hwRow.objectId }))[0];
      const vocabAfterEdit = (await api.all('LibraryItem', { objectId: 'lib-vocab-activity' }))[0];
      expect('plan: saveStep edits homework (due 18:00 Paris, brief, list, resources) and keeps its library file', hwSave.ok && hr.dueAt === '2026-12-05T17:00:00.000Z' && hr.brief === 'Make it about **events**.' &&
        hr.handInChecklist.length === 1 && hr.resources.length === hwRow.resources.length + 1, show(hwSave));
      expect('plan: editing a step never changes the library item (R4)', vocabAfterEdit.brief === vocabNow.brief && JSON.stringify(vocabAfterEdit.resources) === JSON.stringify(vocabNow.resources));

      // Share: a homework with no brief is refused; "share everything that's ready" leaves it; the learner sees exactly what is shared.
      const blankHw = rows.find((s) => s.kind === 'homework' && !s.brief);
      const notReady = blankHw ? await fn('coach', 'shareSteps', { planId, stepIds: [blankHw.objectId], shared: true }) : null;
      expect('plan: sharing a homework with no brief is refused in a sentence', blankHw && refused(notReady) && /brief/.test(notReady.json.error || ''), notReady && show(notReady));
      await fn('coach', 'saveStep', { id: ciRow.objectId, title: ciRow.title, sendsAt: '2026-12-10' });
      const all = await fn('coach', 'shareSteps', { planId, shared: true, allReady: true });
      rows = await stepsNow();
      const sharedIds = rows.filter((s) => s.shared).map((s) => s.objectId).sort();
      expect('plan: share everything that\'s ready shares the ready drafts and counts the rest', all.ok && all.json.result.changed === sharedIds.length && all.json.result.left === rows.length - sharedIds.length &&
        rows.filter((s) => !s.shared).every((s) => s.kind === 'homework' && (!s.brief || !s.dueAt)), show(all));
      const os = await api.sessionFor(omar.objectId, 'sec-omar');
      try {
        const seen = async () => ((await api.as(os.token, 'POST', '/functions/myPlan', {})).json.result?.steps || []).map((s) => s.id).sort();
        expect('Omar: myPlan shows exactly the shared steps', JSON.stringify(await seen()) === JSON.stringify(sharedIds));
        const homeSeen = ((await api.as(os.token, 'POST', '/functions/learnerHome', {})).json.result?.steps || []).map((s) => s.id).sort();
        expect('Omar: learnerHome shows exactly the shared steps', JSON.stringify(homeSeen) === JSON.stringify(sharedIds));
        const un = await fn('coach', 'shareSteps', { planId, stepIds: [liveRow.objectId], shared: false });
        expect('Omar: an unshared step disappears from their plan', un.ok && !(await seen()).includes(liveRow.objectId), show(un));
        const own = await api.as(os.token, 'POST', '/functions/moveStep', { stepId: liveRow.objectId, index: 0 });
        expect('Omar: cannot reorder their own plan', own.status === 403, show(own));
        const bells = await api.as(os.token, 'GET', '/classes/Doorbell');
        expect('Omar: sharing rang their doorbell', (bells.json.results || []).some((b) => b.learner === omar.objectId && b.topic === 'plan'), show(bells));
      } finally {
        await api.endSession(os).catch(() => {});
      }

      // Remove: a draft goes and the rest renumber; a step with a hand-in stays.
      const rm = await fn('coach', 'removeStep', { stepId: liveRow.objectId });
      rows = await stepsNow();
      expect('plan: removeStep removes it and renumbers 1..n', rm.ok && !rows.some((s) => s.objectId === liveRow.objectId) && contiguous(rows), show(rm));
      const handedIn = subs.find((s) => s.learner === ids.camille);
      const keep = await fn('coach', 'removeStep', { stepId: handedIn.step });
      expect('plan: a step the learner handed work in for cannot be removed', refused(keep) && (await api.all('Step', { objectId: handedIn.step })).length === 1, show(keep));

      // Plan settings.
      const ps = await fn('coach', 'savePlan', { planId, title: 'Events, Omar', meetingLink: 'https://meet.example.com/omar', bookingLink: '', status: 'paused' });
      const pr = (await api.all('Plan', { objectId: planId }))[0];
      expect('plan: savePlan saves title, meeting link, booking link and status', ps.ok && pr.title === 'Events, Omar' && pr.meetingLink === 'https://meet.example.com/omar' && pr.status === 'paused', show(ps));
      expect('plan: savePlan refuses an unknown status', refused(await fn('coach', 'savePlan', { planId, title: 'x', status: 'deleted' })));
      expect('plan: savePlan refuses a link that is not a web address', refused(await fn('coach', 'savePlan', { planId, title: 'x', meetingLink: 'javascript:alert(1)' })));

      // Save as a template: the shape only.
      const tf = await fn('coach', 'templateFromPlan', { planId, title: 'Events, from Omar\'s plan', description: 'Test' });
      const made = tf.ok ? (await api.all('PlanTemplate', { objectId: tf.json.result.id }))[0] : null;
      if (made) madeTemplates.push(made.objectId);
      const allowedKeys = new Set(['kind', 'title', 'durationMin', 'libraryItem', 'dayOffset']);
      const madeText = JSON.stringify(made || {});
      expect('templates: a plan saved as a template keeps order, kinds, titles and library items', made && made.items.length === rows.length && made.items.every((it, i) => it.kind === rows[i].kind && it.title === rows[i].title) &&
        made.items.some((it) => it.libraryItem === 'lib-vocab-activity'), show(tf));
      expect('templates: it holds no learner data (only kind, title, duration, library item, day)', made && made.items.every((it) => Object.keys(it).every((k) => allowedKeys.has(k)) && Number.isInteger(it.dayOffset) && it.dayOffset >= 0) &&
        !madeText.includes('events**') && !madeText.includes(omar.objectId) && !madeText.includes('meet.example.com'));

      // Edit, then archive and restore.
      const ed = made && await fn('coach', 'savePlanTemplate', { id: made.objectId, title: 'Events, short', description: 'Edited',
        items: [{ kind: 'live', title: 'Kick-off', durationMin: '45', dayOffset: '0', learner: omar.objectId, brief: 'secret' }, { kind: 'homework', title: 'Map it', libraryItem: 'lib-profile-prompt', dayOffset: 7 }] });
      const edRow = made && (await api.all('PlanTemplate', { objectId: made.objectId }))[0];
      expect('templates: savePlanTemplate edits title and items, and drops anything that is not shape', ed && ed.ok && edRow.title === 'Events, short' && edRow.items.length === 2 &&
        edRow.items[0].durationMin === 45 && !('learner' in edRow.items[0]) && !('brief' in edRow.items[0]), ed && show(ed));
      for (const [what, items] of [['an unknown kind', [{ kind: 'party', title: 'x' }]], ['a negative day', [{ kind: 'live', title: 'x', dayOffset: -3 }]], ['a library item that does not exist', [{ kind: 'homework', title: 'x', libraryItem: 'lib-nope' }]]]) {
        const r = await fn('coach', 'savePlanTemplate', { title: 'Bad', items });
        expect(`templates: savePlanTemplate refuses ${what}`, refused(r), show(r));
      }
      if (made) {
        await fn('coach', 'archivePlanTemplate', { id: made.objectId, archived: true });
        const ro = await fn('coach', 'roster');
        const lac2 = await fn('coach', 'learnerAsCoach', { learnerId: omar.objectId });
        const pt = await fn('coach', 'planTemplates');
        const apArchived = await fn('coach', 'applyTemplate', { planId, templateId: made.objectId });
        expect('templates: an archived template is not offered (roster, plan builder) but is still listed, flagged', ro.ok && !(ro.json.result.templates || []).some((t) => t.id === made.objectId) &&
          !(lac2.json.result.templates || []).some((t) => t.id === made.objectId) && (pt.json.result?.templates || []).some((t) => t.id === made.objectId && t.archived === true));
        expect('templates: an archived template cannot be applied', refused(apArchived), show(apArchived));
        await fn('coach', 'archivePlanTemplate', { id: made.objectId, archived: false });
        const pt2 = await fn('coach', 'planTemplates');
        expect('templates: restoring brings it back', (pt2.json.result?.templates || []).some((t) => t.id === made.objectId && t.archived === false) && (pt2.json.result?.library || []).length === libBefore.length);
      }
    }
  } finally {
    // Put the seed back: no Omar, no plan, no steps, no new templates.
    if (omar) {
      for (const t of ['Step', 'Plan', 'Doorbell']) for (const row of await api.all(t, { learner: omar.objectId })) await api.data('DELETE', `/classes/${t}/${row.objectId}`);
      await api.call('DELETE', `/admin/roles/learner/users/${omar.objectId}`).catch(() => {});
      await api.data('DELETE', `/classes/_User/${omar.objectId}`);
    }
    for (const id of madeTemplates) await api.data('DELETE', `/classes/PlanTemplate/${id}`);
    for (const t of (await api.all('PlanTemplate')).filter((x) => x.title === 'Bad')) await api.data('DELETE', `/classes/PlanTemplate/${t.objectId}`);
    await clearMail(mailBeforeOmar);
  }
  expect('afterwards: the templates are as seeded, and Omar is gone', JSON.stringify((await api.all('PlanTemplate')).map((t) => [t.objectId, t.title, t.items.length]).sort()) ===
    JSON.stringify(tplBefore.map((t) => [t.objectId, t.title, t.items.length]).sort()) && !(await api.all('_User')).some((u) => u.email === OMAR));

  expect('afterwards: Nadia is gone (seed unchanged)', !(await api.all('_User')).some((u) => u.email === NEW) && (await api.countOf('Plan')) === 6);

  // ── 13. Homework and hand-ins (DBU-06) ────────────────────────────────────
  // myHomework reads one learner's own shared homework; handIn is the only way a Submission is
  // made, and it checks the step, the file (owner, private, size, kind from the sniffed bytes) and
  // the link or text. Everything made here is deleted afterwards and the step put back.
  const hwSteps = (k) => steps.filter((s) => s.learner === ids[k] && s.shared && s.kind === 'homework').sort((a, b) => a.position - b.position);
  const camOpen = hwSteps('camille').find((s) => s.status === 'not_started');
  const camApproved = hwSteps('camille').find((s) => s.status === 'approved');
  const camDraftHw = steps.find((s) => s.learner === ids.camille && !s.shared && s.kind === 'homework');
  const jonasHw = hwSteps('jonas')[0];
  expect('hand-ins: the seed has the steps this section needs', !!(camOpen && camApproved && camDraftHw && jonasHw));
  const subsBefore = (await api.all('Submission')).map((s) => s.objectId);
  const bellsBeforeHw = (await api.all('Doorbell')).map((b) => b.objectId);
  const filesBeforeHw = (await api.all('_Files')).map((f) => f.storedName);
  const openStatus = camOpen.status;
  const upload = async (who, name, bytes, priv = true) => as(who, 'POST', `/files/${encodeURIComponent(name)}`, bytes, priv ? { 'X-NodeGX-File-Private': 'true' } : {});
  const enc = (t) => new TextEncoder().encode(t);
  try {
    // myHomework: the list, one homework, and what it refuses.
    const list = await fn('camille', 'myHomework');
    expect('myHomework: Camille\'s list is exactly her shared homework, in plan order', list.ok &&
      JSON.stringify((list.json.result.list || []).map((h) => h.id)) === JSON.stringify(hwSteps('camille').map((s) => s.objectId)), show(list));
    const one = await fn('camille', 'myHomework', { stepId: camApproved.objectId });
    const oneRes = one.json.result || {};
    const camSubIds = new Set(subs.filter((s) => s.learner === ids.camille && s.step === camApproved.objectId).map((s) => s.objectId));
    expect('myHomework: one homework carries its brief, list and resources, and only her own versions', one.ok && oneRes.step && oneRes.step.id === camApproved.objectId &&
      'brief' in oneRes.step && Array.isArray(oneRes.step.handInChecklist) && Array.isArray(oneRes.step.resources) &&
      oneRes.versions.length === camSubIds.size && oneRes.versions.every((v) => camSubIds.has(v.id)) && oneRes.step.canHandIn === false, show(one));
    for (const [what, id] of [['Jonas\'s homework', jonasHw.objectId], ['her own unshared draft', camDraftHw.objectId], ['a live session', steps.find((s) => s.learner === ids.camille && s.kind === 'live').objectId]]) {
      const r = await fn('camille', 'myHomework', { stepId: id });
      expect(`myHomework: Camille opening ${what} is refused`, refused(r) && !r.text.includes('brief'), show(r));
    }
    const hwText = JSON.stringify(list.json.result || {});
    expect('myHomework: carries no coach note', notes.every((n) => !hwText.includes(n.body)));

    // handIn refusals: whose step, what state, which file.
    const refusedHandIn = async (label, who, body, why) => {
      const r = await fn(who, 'handIn', body);
      expect(`handIn: ${label} refused${why ? ' in a sentence' : ''}`, refused(r) && (!why || r.text.includes(why)), show(r));
    };
    await refusedHandIn('on Jonas\'s homework, by Camille', 'camille', { stepId: jonasHw.objectId, kind: 'text', text: 'mine now' }, 'not one of yours');
    await refusedHandIn('on her own unshared draft', 'camille', { stepId: camDraftHw.objectId, kind: 'text', text: 'early' }, 'not one of yours');
    await refusedHandIn('on an approved homework', 'camille', { stepId: camApproved.objectId, kind: 'text', text: 'again' }, 'already approved');
    await refusedHandIn('with no kind', 'camille', { stepId: camOpen.objectId, kind: 'zip' }, 'Choose a file, a link or some text');
    await refusedHandIn('a javascript: link', 'camille', { stepId: camOpen.objectId, kind: 'link', url: 'javascript:alert(1)' }, 'not a web address');
    await refusedHandIn('empty text', 'camille', { stepId: camOpen.objectId, kind: 'text', text: '   ' }, 'Write or paste');
    const jonasUp = await upload('jonas', 'jonas-page.html', enc('<p>Jonas</p>'));
    await refusedHandIn('of a file Jonas uploaded', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [jonasUp.json.name] }, 'not one you uploaded');
    const plainUp = await upload('camille', 'open.html', enc('<p>open</p>'), false);
    await refusedHandIn('of a file uploaded without the private flag', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [plainUp.json.name] }, 'not uploaded privately');
    const txtUp = await upload('camille', 'notes.txt', enc('just notes'));
    await refusedHandIn('of a .txt file (not a kind she can hand in)', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [txtUp.json.name] }, 'can\'t be handed in');
    const fakePdf = await upload('camille', 'report.pdf', enc('<!doctype html><p>not a pdf</p>'));
    await refusedHandIn('of a page renamed .pdf (judged from the bytes)', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [fakePdf.json.name] }, 'not a real .pdf');
    const fakeDocx = await upload('camille', 'script.docx', enc('plain text, not Word'));
    await refusedHandIn('of text renamed .docx', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [fakeDocx.json.name] }, 'not a real .docx');
    const svgUp = await upload('camille', 'drawing.svg', enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
    expect('upload: an SVG is refused at the door (it would run as a page, D2)', svgUp.status === 400, show(svgUp));
    const big = await upload('camille', 'lesson.mp4', new Uint8Array(50 * 1024 * 1024 + 1));
    expect('upload: a file over 50 MB is refused (413)', big.status === 413, show(big));
    // Several files in one version (DECISIONS 2026-11-12): 1 to 5, each checked, a refusal naming only her own file.
    const keyA = await upload('camille', 'key-a.html', enc('<p>A</p>'));
    await refusedHandIn('with no files', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [] }, 'Choose a file');
    await refusedHandIn('with six files', 'camille', { stepId: camOpen.objectId, kind: 'file', files: Array.from({ length: 6 }, (_, i) => `not-a-file-${i}`) }, 'up to 5 files');
    await refusedHandIn('with the same file twice', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [keyA.json.name, keyA.json.name] }, 'twice');
    const mixJonas = await fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'file', files: [keyA.json.name, jonasUp.json.name] });
    expect('handIn: one of two files being Jonas\'s is refused, without his file\'s name', refused(mixJonas) && mixJonas.text.includes('One of these files') && !mixJonas.text.includes('jonas-page'), show(mixJonas));
    await refusedHandIn('of a good file and a .txt, naming the .txt', 'camille', { stepId: camOpen.objectId, kind: 'file', files: [keyA.json.name, txtUp.json.name] }, 'notes.txt:');
    expect('hand-ins: no refusal made a Submission or moved the step', (await api.countOf('Submission')) === subsBefore.length &&
      (await api.all('Step', { objectId: camOpen.objectId }))[0].status === openStatus);

    // handIn that works: a page, a link and text, each the next version.
    const page = await upload('camille', 'hotel-activity.html', enc('<!doctype html><p>Match the words</p>'));
    const v1 = await fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'file', files: [page.json.name, keyA.json.name], note: 'First go', userId: ids.jonas, learner: ids.jonas });
    const v2 = await fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'link', url: 'https://docs.example.com/hotel-activity' });
    const v3 = await fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'text', text: '**Answer key** on page 2' });
    const made = (await api.all('Submission', { step: camOpen.objectId })).sort((a, b) => a.version - b.version);
    expect('handIn: two files, a link and text are versions 1, 2 and 3', v1.ok && v2.ok && v3.ok && JSON.stringify(made.map((s) => [s.version, s.kind])) === JSON.stringify([[1, 'file'], [2, 'link'], [3, 'text']]), show(v1));
    expect('handIn: each is Camille\'s, pending, with both files in order under their own names (an id sent in the body is ignored)', made.every((s) => s.learner === ids.camille && s.review === 'pending') &&
      JSON.stringify(made[0].files) === JSON.stringify([{ file: page.json.name, fileName: 'hotel-activity.html' }, { file: keyA.json.name, fileName: 'key-a.html' }]) && made[0].note === 'First go', JSON.stringify(made[0]).slice(0, 300));
    expect('handIn: the step is handed in', (await api.all('Step', { objectId: camOpen.objectId }))[0].status === 'handed_in');
    const hwBells = (await api.all('Doorbell')).filter((b) => !bellsBeforeHw.includes(b.objectId));
    expect('handIn: rings Camille\'s doorbell, nobody else\'s', hwBells.length === 3 && hwBells.every((b) => b.learner === ids.camille));
    const both = await Promise.all([1, 2].map((i) => fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'text', text: `at once ${i}` })));
    const afterBoth = (await api.all('Submission', { step: camOpen.objectId })).map((s) => s.version).sort();
    expect('handIn: two at once get versions 4 and 5, never the same number', both.every((r) => r.ok) && JSON.stringify(afterBoth) === JSON.stringify([1, 2, 3, 4, 5]), JSON.stringify(afterBoth));
    const read = await fn('camille', 'myHomework', { stepId: camOpen.objectId });
    expect('myHomework: her versions, newest first', read.ok && JSON.stringify(read.json.result.versions.map((v) => v.version)) === '[5,4,3,2,1]');
    expect('myHomework: version 1 carries its two files by name', read.ok && JSON.stringify(read.json.result.versions.find((v) => v.version === 1).files.map((f) => f.fileName)) === '["hotel-activity.html","key-a.html"]', show(read));
    const camAsCoach = await fn('coach', 'learnerAsCoach', { learnerId: ids.camille });
    const coachV1 = camAsCoach.ok && camAsCoach.json.result.submissions.find((x) => x.step === camOpen.objectId && x.version === 1);
    expect('learnerAsCoach: the coach sees both files of version 1', !!coachV1 && Array.isArray(coachV1.files) && coachV1.files.length === 2, show(camAsCoach));

    // The hand-in file is private: Jonas is refused by every door; Camille and the coach get a link.
    const pageName = page.json.name;
    expect('hand-in file: Jonas by URL refused', refused(await as('jonas', 'GET', `/files/${pageName}`)));
    expect('hand-in file: Jonas signing it refused', refused(await as('jonas', 'GET', `/files/${pageName}/sign`)));
    expect('hand-in file: Jonas through fileLink refused', refused(await fn('jonas', 'fileLink', { name: pageName })));
    expect('hand-in file: Jonas through resourceLink refused', refused(await fn('jonas', 'resourceLink', { stepId: camOpen.objectId, file: pageName })));
    expect('hand-in file: Camille through resourceLink refused (not a resource)', refused(await fn('camille', 'resourceLink', { stepId: camOpen.objectId, file: pageName })));
    const own = await fn('camille', 'fileLink', { name: pageName });
    const ownGot = own.ok ? await fetch(BACKEND + own.json.result.url) : null;
    expect('hand-in file: Camille opens her own through fileLink', ownGot && ownGot.ok && (await ownGot.text()).includes('Match the words'), show(own));
    const asCoach = await fn('coach', 'fileLinkAsCoach', { name: pageName });
    expect('hand-in file: the coach opens it through fileLinkAsCoach', asCoach.ok && (await fetch(BACKEND + asCoach.json.result.url)).ok, show(asCoach));
    const lac = await fn('coach', 'learnerAsCoach', { learnerId: ids.camille });
    expect('learnerAsCoach: the coach sees all five versions', (lac.json.result?.submissions || []).filter((s) => s.step === camOpen.objectId).length === 5);

    // Review: only the newest, changes need a note, approval closes the homework.
    const newest = (await api.all('Submission', { step: camOpen.objectId })).sort((a, b) => b.version - a.version)[0];
    const older = made[0];
    const noNote = await fn('coach', 'reviewSubmission', { submissionId: newest.objectId, verdict: 'changes' });
    expect('reviewSubmission: asking for changes with no note is refused', refused(noNote), show(noNote));
    const olderReview = await fn('coach', 'reviewSubmission', { submissionId: older.objectId, verdict: 'approved' });
    expect('reviewSubmission: an older version cannot be reviewed', refused(olderReview), show(olderReview));
    const changes = await fn('coach', 'reviewSubmission', { submissionId: newest.objectId, verdict: 'changes', note: 'Put the key on its own page.' });
    const stepAfter = (await api.all('Step', { objectId: camOpen.objectId }))[0];
    expect('reviewSubmission: changes with a note moves the step to changes asked', changes.ok && stepAfter.status === 'changes_asked', show(changes));
    const v6 = await fn('camille', 'handIn', { stepId: camOpen.objectId, kind: 'text', text: 'Key on page 2 now.' });
    const v6row = (await api.all('Submission', { step: camOpen.objectId })).find((s) => s.version === 6);
    expect('handIn: after changes asked, version 6 is handed in', v6.ok && v6row && (await api.all('Step', { objectId: camOpen.objectId }))[0].status === 'handed_in', show(v6));
    const ok = await fn('coach', 'reviewSubmission', { submissionId: v6row.objectId, verdict: 'approved' });
    expect('reviewSubmission: approving the newest approves the homework', ok.ok && (await api.all('Step', { objectId: camOpen.objectId }))[0].status === 'approved', show(ok));
    await refusedHandIn('once the homework is approved', 'camille', { stepId: camOpen.objectId, kind: 'text', text: 'one more' }, 'already approved');
    const closed = await fn('camille', 'myHomework', { stepId: camOpen.objectId });
    expect('myHomework: an approved homework takes no new version', closed.ok && closed.json.result.step.canHandIn === false);
  } finally {
    // Put the seed back: no new Submission, file or bell; the step as it was.
    for (const s of await api.all('Submission')) if (!subsBefore.includes(s.objectId)) await api.data('DELETE', `/classes/Submission/${s.objectId}`);
    for (const b of await api.all('Doorbell')) if (!bellsBeforeHw.includes(b.objectId)) await api.data('DELETE', `/classes/Doorbell/${b.objectId}`);
    for (const f of await api.all('_Files')) if (!filesBeforeHw.includes(f.storedName)) await api.raw('DELETE', `/files/${f.storedName}`, { headers: { 'X-Parse-Master-Key': token() } });
    await api.data('PUT', `/classes/Step/${camOpen.objectId}`, { status: openStatus });
  }
  expect('afterwards: no hand-in, file or bell is left, and the step is as seeded', (await api.countOf('Submission')) === subsBefore.length &&
    (await api.all('_Files')).length === filesBeforeHw.length && (await api.all('Step', { objectId: camOpen.objectId }))[0].status === openStatus);

  // ── 14. Messages and email (DBU-07) ───────────────────────────────────────
  // A conversation is one learner's and the coach's. Every read and write is a function: myMessages
  // and sendMessage for the learner (her own, whatever id she sends), messagesAsCoach and replyAsCoach
  // for staff. The mail flush is nobody's to call. Email preferences change only the caller, and the
  // public unsubscribe changes nothing without the right signature. All put back afterwards.
  const msgRows = await api.all('Message');
  const msgsBefore = msgRows.map((m) => m.objectId);
  const msgState = new Map(msgRows.map((m) => [m.objectId, { readAt: m.readAt ?? null, mailPending: m.mailPending ?? false, mailedAt: m.mailedAt ?? null }]));
  const bellsBeforeMsg = (await api.all('Doorbell')).map((b) => b.objectId);
  const filesBeforeMsg = (await api.all('_Files')).map((f) => f.storedName);
  const settingsBefore = await api.all('Setting');
  const userRows = await api.all('_User');
  const optOutBefore = new Map(userRows.map((u) => [u.objectId, u.emailOptOutAt ?? null]));
  // myUnread stamps lastSeenAt (DBU-08: the inbox's "gone quiet" reads it), so it is put back too.
  const seenBefore = new Map(userRows.map((u) => [u.objectId, u.lastSeenAt ?? null]));
  const mailBeforeMsg = await inbox();
  const camConv = msgRows.filter((m) => m.learner === ids.camille);
  const jonasConv = msgRows.filter((m) => m.learner === ids.jonas);
  const msgCamStep = steps.find((s) => s.learner === ids.camille && s.shared && s.kind === 'homework');
  const msgJonasStep = steps.find((s) => s.learner === ids.jonas && s.shared && s.kind === 'homework');
  const sameIds = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  expect('messages: the seed has a conversation for Camille and for Jonas', camConv.length > 0 && jonasConv.length > 0 && !!msgCamStep && !!msgJonasStep);
  try {
    // Reading: her own conversation only.
    const mine = await fn('camille', 'myMessages', { learnerId: ids.jonas, learner: ids.jonas, userId: ids.jonas });
    const mineIds = (mine.json?.result?.messages || []).map((m) => m.id);
    expect('myMessages: Camille gets exactly her own conversation (an id sent in the body is ignored)', mine.ok && sameIds(mineIds, camConv.map((m) => m.objectId)), show(mine));
    expect('myMessages: nothing of Jonas\'s conversation reaches Camille', !jonasConv.some((m) => mine.text.includes(m.body.slice(0, 40))));
    const scoped = await fn('camille', 'myMessages', { stepId: msgJonasStep.objectId });
    expect('myMessages: Camille asking for Jonas\'s homework thread is refused', refused(scoped) && !jonasConv.some((m) => scoped.text.includes(m.body.slice(0, 40))), show(scoped));
    const msgDraftHw = steps.find((s) => s.learner === ids.camille && !s.shared);
    if (msgDraftHw) expect('myMessages: a thread on her own unshared step is refused', refused(await fn('camille', 'myMessages', { stepId: msgDraftHw.objectId })));
    const unread = await fn('camille', 'myUnread', { learnerId: ids.sarah });
    expect('myUnread: counts only her own (an id sent is ignored)', unread.ok && unread.json.result.unread === 0, show(unread));
    for (const name of ['messagesAsCoach', 'replyAsCoach', 'coachUnread', 'coachSettings', 'saveCoachSettings']) {
      const r = await fn('jonas', name, { learnerId: ids.camille, body: 'hello', coachEmail: 'jonas@example.com' });
      expect(`Jonas: ${name} (role:staff) refused`, r.status === 403, show(r));
    }
    for (const who of [null, 'camille', 'coach']) {
      const r = await fn(who, 'mailMessages', { all: true });
      expect(`mailMessages (nobody): refused to ${who || 'the signed-out'}`, refused(r), show(r));
    }
    expect('Setting: no learner reads the table directly', refused(await as('camille', 'GET', '/classes/Setting')));
    // DBU-11: coachName is public, because the words on every page name the coach. It answers the name, and nothing else.
    for (const who of [null, 'camille']) {
      const pub = await fn(who, 'coachName', { key: 'coachEmail' });
      const keys = Object.keys(pub.json?.result || {});
      expect(`coachName (public): answers ${who || 'the signed-out'} with the name only`, pub.ok && keys.length === 1 && keys[0] === 'name' && typeof pub.json.result.name === 'string' && !pub.text.includes('@'), show(pub));
    }

    // Writing: her own conversation, her own steps, her own files.
    const msgCountBefore = await api.countOf('Message');
    const sendRefused = async (label, body, why) => {
      const r = await fn('camille', 'sendMessage', body);
      expect(`sendMessage: ${label} refused${why ? ' in a sentence' : ''}`, refused(r) && (!why || r.text.includes(why)), show(r));
    };
    await sendRefused('with nothing in it', { body: '   ' });
    await sendRefused('on Jonas\'s homework', { body: 'about yours', stepId: msgJonasStep.objectId });
    await sendRefused('over 5,000 characters', { body: 'x'.repeat(5001) });
    const msgJonasUp = await as('jonas', 'POST', '/files/jonas-notes.pdf', new TextEncoder().encode('%PDF-1.4 jonas'), { 'X-NodeGX-File-Private': 'true' });
    await sendRefused('attaching a file Jonas uploaded', { body: 'look', files: [msgJonasUp.json?.name] });
    await sendRefused('with six files', { body: 'many', files: Array.from({ length: 6 }, (_, i) => `nope-${i}`) });
    expect('sendMessage: no refusal saved a message', (await api.countOf('Message')) === msgCountBefore);

    const sent = await fn('camille', 'sendMessage', { body: 'Gate check: a question about the homework.', stepId: msgCamStep.objectId, learner: ids.jonas, learnerId: ids.jonas, author: ids.coach });
    const row = sent.ok ? (await api.all('Message', { objectId: sent.json.result.messageId }))[0] : null;
    expect('sendMessage: saved as Camille\'s, by Camille, on her step, waiting for mail (ids in the body ignored)', !!row && row.learner === ids.camille && row.author === ids.camille && row.step === msgCamStep.objectId, show(sent));
    const msgBells = (await api.all('Doorbell')).filter((b) => !bellsBeforeMsg.includes(b.objectId));
    expect('sendMessage: rings Camille\'s doorbell, nobody else\'s', msgBells.length >= 1 && msgBells.every((b) => b.learner === ids.camille));
    const jonasNow = await fn('jonas', 'myMessages');
    expect('sendMessage: Jonas does not see Camille\'s message', jonasNow.ok && !jonasNow.text.includes('Gate check'), show(jonasNow));
    const coachSees = await fn('coach', 'messagesAsCoach', { learnerId: ids.camille });
    expect('messagesAsCoach: the coach sees it in Camille\'s conversation, and only hers', coachSees.ok && coachSees.text.includes('Gate check') &&
      (coachSees.json.result.messages || []).length === camConv.length + 1, show(coachSees));
    const camNow = (await api.all('Message')).filter((m) => m.learner === ids.camille && m.author === ids.camille);
    const jonasUnread = (await api.all('Message')).filter((m) => m.learner === ids.jonas && m.author === ids.jonas && !m.readAt).map((m) => m.objectId);
    expect('messagesAsCoach: marks Camille\'s messages read, and no one else\'s', camNow.every((m) => m.readAt) &&
      sameIds(jonasUnread, jonasConv.filter((m) => m.author === ids.jonas && !m.readAt).map((m) => m.objectId)));

    // The coach replies: to a learner with a plan, on her own homework only.
    const toSelf = await fn('coach', 'replyAsCoach', { learnerId: ids.coach, body: 'me' });
    expect('replyAsCoach: to the coach himself refused', refused(toSelf), show(toSelf));
    const wrongStep = await fn('coach', 'replyAsCoach', { learnerId: ids.camille, body: 'wrong', stepId: msgJonasStep.objectId });
    expect('replyAsCoach: on another learner\'s homework refused', refused(wrongStep), show(wrongStep));
    const reply = await fn('coach', 'replyAsCoach', { learnerId: ids.camille, body: 'Gate reply: yes, go ahead.', stepId: msgCamStep.objectId });
    expect('replyAsCoach: works', reply.ok, show(reply));
    const camRead = await fn('camille', 'myMessages');
    expect('replyAsCoach: Camille sees the reply; Jonas does not', camRead.ok && camRead.text.includes('Gate reply') && !(await fn('jonas', 'myMessages')).text.includes('Gate reply'));

    // Email preferences: the caller's own, and the signed link only.
    const off = await fn('camille', 'setEmailPreference', { state: 'off', learnerId: ids.jonas, userId: ids.jonas });
    const usersNow = await api.all('_User');
    const optOut = (id) => usersNow.find((u) => u.objectId === id).emailOptOutAt ?? null;
    expect('setEmailPreference: turns off Camille\'s emails, and nobody else\'s', off.ok && !!optOut(ids.camille) && JSON.stringify(optOut(ids.jonas)) === JSON.stringify(optOutBefore.get(ids.jonas)), show(off));
    const badSig = await fn(null, 'unsubscribe', { u: ids.jonas, s: '0'.repeat(64) });
    const sameAnswer = await fn(null, 'unsubscribe', { u: 'no-such-user', s: 'x' });
    const jonasAfter = (await api.all('_User')).find((u) => u.objectId === ids.jonas).emailOptOutAt ?? null;
    expect('unsubscribe: a wrong signature changes nothing', JSON.stringify(jonasAfter) === JSON.stringify(optOutBefore.get(ids.jonas)));
    expect('unsubscribe: answers a wrong signature exactly as any other call', badSig.status === sameAnswer.status && badSig.text === sameAnswer.text, `${show(badSig)} / ${show(sameAnswer)}`);
  } finally {
    // Put the seed back: no new message, bell, file or setting; reads, mail state and preferences as they were.
    for (const m of await api.all('Message')) {
      if (!msgsBefore.includes(m.objectId)) await api.data('DELETE', `/classes/Message/${m.objectId}`);
      else await api.data('PUT', `/classes/Message/${m.objectId}`, msgState.get(m.objectId));
    }
    for (const b of await api.all('Doorbell')) if (!bellsBeforeMsg.includes(b.objectId)) await api.data('DELETE', `/classes/Doorbell/${b.objectId}`);
    for (const f of await api.all('_Files')) if (!filesBeforeMsg.includes(f.storedName)) await api.raw('DELETE', `/files/${f.storedName}`, { headers: { 'X-Parse-Master-Key': token() } });
    const keepSettings = settingsBefore.map((x) => x.objectId);
    for (const x of await api.all('Setting')) if (!keepSettings.includes(x.objectId)) await api.data('DELETE', `/classes/Setting/${x.objectId}`);
    for (const u of await api.all('_User')) {
      if (JSON.stringify(u.emailOptOutAt ?? null) !== JSON.stringify(optOutBefore.get(u.objectId))) await api.data('PUT', `/classes/_User/${u.objectId}`, { emailOptOutAt: optOutBefore.get(u.objectId) });
      if ((u.lastSeenAt ?? null) !== seenBefore.get(u.objectId)) await api.data('PUT', `/classes/_User/${u.objectId}`, { lastSeenAt: seenBefore.get(u.objectId) });
    }
    await clearMail(mailBeforeMsg);
  }
  expect('afterwards: no message, bell or file is left, and reads and preferences are as they were', (await api.countOf('Message')) === msgsBefore.length &&
    (await api.all('_Files')).length === filesBeforeMsg.length &&
    (await api.all('Message')).every((m) => JSON.stringify(m.readAt ?? null) === JSON.stringify(msgState.get(m.objectId).readAt)) &&
    (await api.all('_User')).every((u) => JSON.stringify(u.emailOptOutAt ?? null) === JSON.stringify(optOutBefore.get(u.objectId)) &&
      (u.lastSeenAt ?? null) === seenBefore.get(u.objectId)));

  // ── 15. The coach inbox (DBU-08) ──────────────────────────────────────────
  // coachInbox, snoozeQuiet and settleQuestion are staff functions (section 6 refuses them to a learner);
  // the daily round is nobody's to call. The inbox's bell is the staff's: no learner reads it.
  // The one flag touched here is put back.
  const inboxNow = await fn('coach', 'coachInbox');
  const inboxItems = inboxNow.json?.result?.items || [];
  expect('coachInbox: answers the coach, its count matching its list', inboxNow.ok && inboxNow.json.result.count === inboxItems.length, show(inboxNow));
  for (const name of ['coachInbox', 'snoozeQuiet', 'settleQuestion']) {
    const r = await fn('camille', name, { countOnly: true, flagId: 'x', messageId: 'x' });
    expect(`Camille: ${name} (role:staff) refused`, r.status === 403, show(r));
  }
  for (const who of [null, 'camille', 'coach']) {
    const r = await fn(who, 'morningRound', {});
    expect(`morningRound (nobody): refused to ${who || 'the signed-out'}`, refused(r), show(r));
  }
  expect('QuietFlag: no learner reads the table directly', refused(await as('camille', 'GET', '/classes/QuietFlag')));
  const flag = (await api.all('QuietFlag')).find((f) => !f.closedAt);
  if (flag) {
    const bellsBeforeInbox = (await api.all('Doorbell')).map((b) => b.objectId);
    try {
      const snz = await fn('coach', 'snoozeQuiet', { flagId: flag.objectId });
      const rung = (await api.all('Doorbell')).filter((b) => !bellsBeforeInbox.includes(b.objectId));
      expect('snoozeQuiet: rings the inbox bell', snz.ok && rung.some((b) => b.topic === 'inbox'), show(snz));
      const camBells = await as('camille', 'GET', '/classes/Doorbell');
      expect('Doorbell: a learner never sees the inbox bell', camBells.ok && !(camBells.json.results || []).some((b) => b.topic === 'inbox'), show(camBells));
    } finally {
      await api.data('PUT', `/classes/QuietFlag/${flag.objectId}`, { snoozedUntil: flag.snoozedUntil ?? null, nudgedAt: flag.nudgedAt ?? null });
      for (const b of await api.all('Doorbell')) if (!bellsBeforeInbox.includes(b.objectId)) await api.data('DELETE', `/classes/Doorbell/${b.objectId}`);
    }
  } else expect('inbox: the seed has an open quiet flag (reset-demo fires the round)', false);

  // ── 16. My creations (DBU-09) ─────────────────────────────────────────────
  // A learner's creations are hers and the coach's: myCreations reads the caller's only (ids sent are
  // ignored), creationsAsCoach is staff-only, saveCreation and deleteCreation touch only her own rows,
  // and a file is judged as a hand-in is. A creation from a hand-in points at it (never a copy); deleting
  // the creation leaves the hand-in. Everything made here is deleted and every row put back.
  const crBefore = await api.all('Creation');
  const crIdsBefore = crBefore.map((c) => c.objectId);
  const subsBeforeCr = (await api.all('Submission')).map((s) => s.objectId);
  const bellsBeforeCr = (await api.all('Doorbell')).map((b) => b.objectId);
  const filesBeforeCr = (await api.all('_Files')).map((f) => f.storedName);
  const crStep = (await api.all('Step')).find((s) => s.learner === ids.camille && s.shared && s.kind === 'homework' && s.status === 'changes_asked');
  const crStepStatus = crStep?.status;
  const camCr = crBefore.filter((c) => c.learner === ids.camille);
  const fromHandIn = camCr.find((c) => c.submission);
  const encCr = (t) => new TextEncoder().encode(t);
  const uploadCr = async (who, name, bytes, priv = true) => as(who, 'POST', `/files/${encodeURIComponent(name)}`, bytes, priv ? { 'X-NodeGX-File-Private': 'true' } : {});
  expect('creations: the seed has what this section needs', !!(crStep && fromHandIn && camCr.length >= 3 && crBefore.some((c) => c.learner === ids.jonas || c.learner !== ids.camille)));
  try {
    const mine = await fn('camille', 'myCreations', { learner: ids.jonas, learnerId: ids.jonas });
    const items = mine.json?.result?.items || [];
    expect('myCreations: exactly Camille\'s creations, whatever id is sent', mine.ok && sameIds(items.map((i) => i.id), camCr.map((c) => c.objectId)), show(mine));
    const prompt = items.find((i) => i.id === fromHandIn.objectId);
    const sub = (await api.all('Submission', { objectId: fromHandIn.submission }))[0];
    expect('myCreations: a creation from a hand-in shows what that version holds, and where it came from', !!prompt && prompt.fromHandIn === true &&
      prompt.form === (sub.kind === 'file' ? 'file' : sub.kind) && (prompt.text || prompt.url || prompt.files.length) && !!prompt.stepTitle, JSON.stringify(prompt).slice(0, 160));
    const jonasMine = await fn('jonas', 'myCreations');
    expect('myCreations: Jonas sees none of Camille\'s', jonasMine.ok && !(jonasMine.json.result.items || []).some((i) => camCr.some((c) => c.objectId === i.id)), show(jonasMine));
    expect('creationsAsCoach: refused to a learner', (await fn('camille', 'creationsAsCoach', { learnerId: ids.camille })).status === 403);
    const asCoach = await fn('coach', 'creationsAsCoach', { learnerId: ids.camille });
    expect('creationsAsCoach: the coach sees Camille\'s, and only hers', asCoach.ok && sameIds((asCoach.json.result.items || []).map((i) => i.id), camCr.map((c) => c.objectId)), show(asCoach));
    const ro = await fn('coach', 'roster');
    expect('roster: each learner\'s creation count', ro.ok && (ro.json.result.learners || []).every((l) => l.creations === crBefore.filter((c) => c.learner === l.id).length), show(ro));

    // Someone else's creation: no change, no delete.
    const target = camCr.find((c) => !c.submission) || camCr[0];
    const steal = await fn('jonas', 'saveCreation', { id: target.objectId, title: 'Mine now', kind: 'other', usedInClass: true });
    const del = await fn('jonas', 'deleteCreation', { id: target.objectId });
    const after = (await api.all('Creation', { objectId: target.objectId }))[0];
    expect('saveCreation: Jonas changing Camille\'s creation refused, nothing changed', refused(steal) && steal.text.includes('not one of your creations') && after?.title === target.title, show(steal));
    expect('deleteCreation: Jonas deleting Camille\'s creation refused, it is still there', refused(del) && !!after, show(del));

    // Adding: what is refused.
    const refusedSave = async (label, body, why) => {
      const r = await fn('camille', 'saveCreation', Object.assign({ title: 'Gate check', kind: 'other' }, body));
      expect(`saveCreation: ${label} refused in a sentence`, refused(r) && r.text.includes(why), show(r));
    };
    await refusedSave('no title', { title: '  ', form: 'text', text: 'x' }, 'Give it a title');
    await refusedSave('a kind not on the list', { kind: 'zip', form: 'text', text: 'x' }, 'what kind');
    await refusedSave('a javascript: link', { form: 'link', url: 'javascript:alert(1)' }, 'not a web address');
    await refusedSave('empty text', { form: 'text', text: '  ' }, 'Write or paste');
    await refusedSave('nothing to keep', { form: 'zip' }, 'Choose a file, a link or some text');
    const jonasUpCr = await uploadCr('jonas', 'jonas-gap.html', encCr('<p>Jonas</p>'));
    await refusedSave('a file Jonas uploaded', { form: 'file', file: jonasUpCr.json?.name }, 'not one you uploaded');
    const openUp = await uploadCr('camille', 'open-gap.html', encCr('<p>open</p>'), false);
    await refusedSave('a file uploaded without the private flag', { form: 'file', file: openUp.json?.name }, 'not uploaded privately');
    const txtUp = await uploadCr('camille', 'notes.txt', encCr('notes'));
    await refusedSave('a kind of file not on the list', { form: 'file', file: txtUp.json?.name }, 'can\'t be kept here');
    const fake = await uploadCr('camille', 'fake.pdf', encCr('<!doctype html><p>not a pdf</p>'));
    await refusedSave('a file whose bytes are not what its name says', { form: 'file', file: fake.json?.name }, 'not a real .pdf');
    expect('saveCreation: no refusal made a row', (await api.countOf('Creation')) === crBefore.length);

    // Adding and editing her own.
    const textCr = await fn('camille', 'saveCreation', { title: 'Gate prompt', kind: 'prompt', form: 'text', text: 'A prompt.', learner: ids.jonas, madeWith: 'Claude', usedInClass: false });
    const textRow = textCr.ok ? (await api.all('Creation', { objectId: textCr.json.result.creationId }))[0] : null;
    expect('saveCreation: text kept as Camille\'s (a learner id sent is ignored)', !!textRow && textRow.learner === ids.camille && textRow.text === 'A prompt.' && !textRow.submission, show(textCr));
    const goodUp = await uploadCr('camille', 'gate-gap.html', encCr('<!doctype html><p>gap</p>'));
    const fileCr = await fn('camille', 'saveCreation', { title: 'Gate page', kind: 'interactive', form: 'file', file: goodUp.json?.name });
    const fileRow = fileCr.ok ? (await api.all('Creation', { objectId: fileCr.json.result.creationId }))[0] : null;
    expect('saveCreation: her own HTML file kept, under its own name', !!fileRow && fileRow.file === goodUp.json.name && fileRow.fileName === 'gate-gap.html', show(fileCr));
    const edit = await fn('camille', 'saveCreation', { id: textRow?.objectId, title: 'Gate prompt, edited', kind: 'prompt', text: 'Changed.', usedInClass: true, description: 'Used on Monday.' });
    const edited = (await api.all('Creation', { objectId: textRow?.objectId }))[0];
    expect('saveCreation: she edits her own: title, text, used in class, description', edit.ok && edited.title === 'Gate prompt, edited' && edited.text === 'Changed.' && edited.usedInClass === true && edited.description === 'Used on Monday.', show(edit));
    const handEdit = await fn('camille', 'saveCreation', { id: fromHandIn.objectId, title: fromHandIn.title, kind: fromHandIn.kind, text: 'Overwritten?', url: 'https://example.com/x', usedInClass: true });
    const handRow = (await api.all('Creation', { objectId: fromHandIn.objectId }))[0];
    const subAfter = (await api.all('Submission', { objectId: fromHandIn.submission }))[0];
    expect('saveCreation: editing a creation from a hand-in changes its words only, never what it holds or the hand-in', handEdit.ok && handRow.usedInClass === true &&
      !handRow.text && !handRow.url && handRow.submission === fromHandIn.submission && JSON.stringify(subAfter) === JSON.stringify(sub), show(handEdit));

    // Deleting one from a hand-in leaves the hand-in.
    const gone = await fn('camille', 'deleteCreation', { id: fromHandIn.objectId });
    expect('deleteCreation: her creation from a hand-in is deleted, the hand-in and its step are not', gone.ok &&
      !(await api.all('Creation', { objectId: fromHandIn.objectId })).length && (await api.all('Submission', { objectId: fromHandIn.submission })).length === 1, show(gone));

    // handIn's "Also add it to My creations": one creation per homework, pointing at the newest version.
    const before = (await api.all('Creation')).length;
    const plain = await fn('camille', 'handIn', { stepId: crStep.objectId, kind: 'text', text: 'Gate: without the box.' });
    expect('handIn: without the box, no creation', plain.ok && (await api.all('Creation')).length === before && !plain.json.result.creationId, show(plain));
    const boxed = await fn('camille', 'handIn', { stepId: crStep.objectId, kind: 'link', url: 'https://example.com/gate-v1', addToCreations: true });
    const made = boxed.ok ? (await api.all('Creation', { objectId: boxed.json.result.creationId }))[0] : null;
    expect('handIn: with the box, a creation of hers pointing at that version (no copy of what it holds)', !!made && made.learner === ids.camille &&
      made.submission === boxed.json.result.submissionId && made.fromStep === crStep.objectId && made.title === crStep.title && made.kind === 'link' && !made.url, show(boxed));
    const again = await fn('camille', 'handIn', { stepId: crStep.objectId, kind: 'text', text: 'Gate: again.', addToCreations: true });
    const moved = (await api.all('Creation', { objectId: made?.objectId }))[0];
    expect('handIn: a later version with the box moves the same creation to it; none made twice', again.ok && again.json.result.creationId === made?.objectId &&
      moved?.submission === again.json.result.submissionId && (await api.all('Creation')).length === before + 1, show(again));
    const coachNow = await fn('coach', 'creationsAsCoach', { learnerId: ids.camille });
    expect('creationsAsCoach: the coach sees the new one; Jonas does not', (coachNow.json?.result?.items || []).some((i) => i.id === made?.objectId) &&
      !((await fn('jonas', 'myCreations')).json?.result?.items || []).some((i) => i.id === made?.objectId));
    expect('Creation: a learner cannot read the table directly', refused(await as('camille', 'GET', '/classes/Creation')));
  } finally {
    for (const c of await api.all('Creation')) if (!crIdsBefore.includes(c.objectId)) await api.data('DELETE', `/classes/Creation/${c.objectId}`);
    for (const c of crBefore) {
      const { objectId, createdAt, updatedAt, ACL, ...fields } = c;
      const now = (await api.all('Creation', { objectId }))[0];
      if (!now) await api.call('POST', '/admin/import/Creation', { format: 'json', content: JSON.stringify([{ objectId, createdAt, updatedAt, ...fields }]), dryRun: false });
      else await api.data('PUT', `/classes/Creation/${objectId}`, Object.fromEntries(Object.keys({ ...fields, ...now }).filter((k) => !['objectId', 'createdAt', 'updatedAt', 'ACL'].includes(k)).map((k) => [k, fields[k] ?? null])));
    }
    for (const s of await api.all('Submission')) if (!subsBeforeCr.includes(s.objectId)) await api.data('DELETE', `/classes/Submission/${s.objectId}`);
    if (crStep) await api.data('PUT', `/classes/Step/${crStep.objectId}`, { status: crStepStatus });
    for (const b of await api.all('Doorbell')) if (!bellsBeforeCr.includes(b.objectId)) await api.data('DELETE', `/classes/Doorbell/${b.objectId}`);
    for (const f of await api.all('_Files')) if (!filesBeforeCr.includes(f.storedName)) await api.raw('DELETE', `/files/${f.storedName}`, { headers: { 'X-Parse-Master-Key': token() } });
  }
  const crAfter = await api.all('Creation');
  expect('afterwards: creations, hand-ins, the step and files are as they were', sameIds(crAfter.map((c) => c.objectId), crIdsBefore) &&
    crAfter.every((c) => { const b = crBefore.find((x) => x.objectId === c.objectId); return b && b.title === c.title && b.usedInClass === c.usedInClass && (b.submission ?? null) === (c.submission ?? null) && b.createdAt === c.createdAt; }) &&
    (await api.countOf('Submission')) === subsBeforeCr.length && (await api.all('_Files')).length === filesBeforeCr.length &&
    (await api.all('Step', { objectId: crStep?.objectId }))[0]?.status === crStepStatus);

  // ── 17. Check-ins (DBU-10) ────────────────────────────────────────────────
  // Who may, only: the behaviour (sending, answering, Done) is tools/check-checkins.mjs, on its own backend.
  const ciSteps = (await api.all('Step')).filter((s) => s.kind === 'checkin');
  const anaSent = ciSteps.find((s) => s.learner === ids.ana && s.status === 'sent' && s.shared);
  const camWaiting = ciSteps.find((s) => s.learner === ids.camille && s.status === 'scheduled' && s.shared);
  const responsesBefore = await api.countOf('CheckinResponse');
  expect('check-ins: the seed has Ana\'s sent check-in and Camille\'s still to send', !!(anaSent && camWaiting));
  const ownCi = await fn('ana', 'myCheckin', { stepId: anaSent?.objectId });
  expect('myCheckin: Ana opens her own sent check-in', ownCi.ok && ownCi.json.result.checkin.state === 'open', show(ownCi));
  for (const who of ['jonas', 'camille', 'coach']) {
    const r = await fn(who, 'myCheckin', { stepId: anaSent?.objectId });
    expect(`myCheckin: ${who} can't open Ana's`, refused(r) && r.text.includes('could not be found'), show(r));
  }
  expect('myCheckin: signed out, refused', refused(await fn(null, 'myCheckin', { stepId: anaSent?.objectId })));
  const stealCi = await fn('jonas', 'answerCheckin', { stepId: anaSent?.objectId, answers: { useful: 1 } });
  expect('answerCheckin: Jonas answering Ana\'s refused', refused(stealCi) && stealCi.text.includes('could not be found'), show(stealCi));
  const earlyCi = await fn('camille', 'answerCheckin', { stepId: camWaiting?.objectId, answers: { still_using: 'weekly', hours_per_week: 2 } });
  expect('answerCheckin: Camille answering hers before it is sent refused', refused(earlyCi) && earlyCi.text.includes('not open yet'), show(earlyCi));
  expect('answerCheckin: signed out, refused', refused(await fn(null, 'answerCheckin', { stepId: anaSent?.objectId, answers: { useful: 1 } })));
  expect('answerCheckin: no refusal saved an answer or moved a step', (await api.countOf('CheckinResponse')) === responsesBefore &&
    (await api.all('Step', { objectId: anaSent?.objectId }))[0]?.status === 'sent' && (await api.all('Step', { objectId: camWaiting?.objectId }))[0]?.status === 'scheduled');
  const someResponse = (await api.all('CheckinResponse'))[0];
  expect('settleCheckin: refused to a learner', (await fn('ana', 'settleCheckin', { responseId: someResponse?.objectId })).status === 403);
  expect('settleCheckin: ... and nothing stamped', !(await api.all('CheckinResponse', { objectId: someResponse?.objectId }))[0]?.seenAt || !!someResponse?.seenAt);
  for (const who of ['coach', 'ana', null]) expect(`sendCheckins: refused to ${who || 'nobody signed in'}`, refused(await fn(who, 'sendCheckins')));
  expect('CheckinResponse: a learner cannot read the table directly', refused(await as('ana', 'GET', '/classes/CheckinResponse')));
} finally {
  for (const s of Object.values(sessions)) await api.endSession(s).catch(() => {});
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`check-security: ${failed.length} of ${results.length} checks FAILED:\n  ✗ ${failed.map((f) => `${f.name}${f.detail ? `  (${f.detail})` : ''}`).join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(`check-security: ok — ${results.length} checks as Camille, Jonas, Ana, the coach and nobody signed in.`);
