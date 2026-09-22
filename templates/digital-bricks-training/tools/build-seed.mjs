#!/usr/bin/env node
/**
 * THE FIXTURES, DECOMPOSED INTO THE ROWS THE PRODUCT WOULD HOLD (TASK-L169 §3).
 *
 * Reads the three `Data/Fixture *` components' Static Data and writes
 * `backend/seed.json`: `{ users, rows: { <Collection>: [...] } }`. The fixtures
 * stay the single source until L171 takes them off the pages, so this file is
 * GENERATED — never hand-edit seed.json.
 *
 * What it refuses to do, on purpose:
 *   - store anything DERIVED. No timeline `state`, no entry `position`, no
 *     counts, no `lastActivity`, no `awaitingReplySince`, no `answered`, no
 *     `evaluated`, no `unread`. Those are the read functions' job (L170), and
 *     storing them would make the seed agree with the fixture by construction.
 *   - drop a field it cannot place. Every fixture key is either mapped or named
 *     in IGNORED with the reason; anything else fails the build by name.
 *
 * Ids are deterministic (the fixtures' own, or derived from them), so running
 * this twice writes a byte-identical file — criterion 1.
 *
 * Run: node tools/build-seed.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const COMPONENTS = join(TEMPLATE, 'components');

const staticJson = (component) => {
  const { nodes } = JSON.parse(readFileSync(join(COMPONENTS, component, 'nodes.json'), 'utf8'));
  const data = nodes.find((n) => n.type === 'Static Data');
  if (!data) throw new Error(`${component}: no Static Data node`);
  return JSON.parse(data.parameters.json);
};

const failures = [];
const fail = (msg) => failures.push(msg);

/**
 * Every key a fixture object carries must be either consumed by the mapping or
 * listed here with its reason. `take` records consumption; `leftover` reports
 * the rest by name.
 */
function tracker(label, obj, ignored = {}) {
  const used = new Set(Object.keys(ignored));
  return {
    take(key) {
      used.add(key);
      return obj[key];
    },
    done() {
      for (const k of Object.keys(obj)) if (!used.has(k)) fail(`${label}: field '${k}' has no place in the seed`);
    }
  };
}

// Derived on every entry, stored nowhere (L116, L170).
const DERIVED_ENTRY = { state: 'derived from now (L116)', position: 'derived (L170)', kind: 'the collection names it', id: 'rebuilt from the row id' };

// ── The people ────────────────────────────────────────────────────────────────
/** The coach. `createdByName`/`authorName` in the fixtures resolve to this user's name (L106). */
const STAFF = { username: 'trainer@example.test', email: 'trainer@example.test', firstName: 'Richard', lastName: 'Osborne', createdAt: '2026-01-05T09:00:00.000Z' };
const STAFF_NAME = `${STAFF.firstName} ${STAFF.lastName}`;

const users = [{ ...STAFF, roles: ['staff'] }];
const rows = {};
const add = (collection, row) => (rows[collection] ||= []).push(row);

const splitName = (label) => {
  if (!label) return { firstName: null, lastName: null };
  const parts = label.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || null };
};

// The product's corpus, in its own order — the concepts a roster learner's path
// is made of when the fixture gives only a count (TASK-L169 §3). Real ids, never
// invented ones (L85: a hand-made fixture is not evidence the ids in it exist).
const CORPUS = [
  'what-the-web-is', 'html-the-structure', 'css-making-it-look-right', 'javascript-making-it-do-things',
  'frontend-and-backend', 'what-is-a-backend', 'what-an-api-is', 'endpoints-and-requests', 'what-json-is',
  'what-a-database-is', 'tables-and-the-join', 'where-your-data-lives', 'scoping-what-to-build',
  'plan-then-act', 'the-prototype-is-a-sketch', 'reading-what-the-ai-did', 'how-do-you-know-it-works'
];

// ── The roster ────────────────────────────────────────────────────────────────
const roster = staticJson('Data/Fixture roster');
// WHOSE programme this template carries is the programme fixture's business,
// not a name written here. Pinning it cost three silent wrong answers the
// first time the fixture was re-authored around a different learner.
const PROGRAMME_LEARNER = staticJson('Data/Fixture programme')[0].learnerId;
const rosterIgnored = {
  stepsTotal: 'derived: count of live steps on the most recent path',
  stepsComplete: 'derived: count of complete ones',
  lastActivity: 'derived: GREATEST(context.updatedAt, max progress.updatedAt, max artifact.submittedAt)',
  awaitingReplySince: 'derived: earliest unread learner turn',
  coachLabel: 'stored as LearnerInvite.label',
  cohorts: 'stored as CohortMember + Cohort rows',
  programmes: 'stored as Programme rows'
};
const cohortsSeen = new Map();

for (const p of roster) {
  const t = tracker(`roster ${p.learnerId}`, p, rosterIgnored);
  const learnerId = t.take('learnerId');
  const email = t.take('email');
  const username = email || learnerId; // an account with no address still has a login name
  const { firstName, lastName } = splitName(p.coachLabel);
  users.push({ username, email, firstName, lastName, createdAt: t.take('createdAt') });
  add('LearnerProfile', { learnerId, username, coachEmail: t.take('coachEmail') });

  if (p.coachLabel) {
    add('LearnerInvite', {
      inviteId: `inv-${learnerId}`,
      label: p.coachLabel,
      claimedByLearnerId: learnerId,
      claimedAt: p.createdAt,
      status: 'claimed',
      createdByEmail: STAFF.email
    });
  }

  const projectName = t.take('projectName');
  const contextVersion = t.take('contextVersion');
  if (projectName !== null && learnerId !== PROGRAMME_LEARNER) {
    // Their context is written from the programme fixture below; everybody
    // else's carries what the roster knows. `updatedAt` is when they last
    // touched it, which is what lastActivity reads (TASK-L169 §3b).
    add('ProjectContext', {
      learnerId,
      projectName,
      problemStatement: null,
      facts: {},
      version: contextVersion,
      createdAt: p.createdAt,
      updatedAt: p.lastActivity || p.createdAt
    });
  }

  for (const c of t.take('cohorts') || []) {
    if (!cohortsSeen.has(c.id)) {
      cohortsSeen.set(c.id, c.name);
      add('Cohort', { cohortId: c.id, name: c.name, isDefault: false });
    }
    const members = (rows.CohortMember || []).filter((m) => m.cohortId === c.id).length;
    add('CohortMember', { cohortId: c.id, learnerId, displayName: `Builder ${members + 1}`, removedAt: null });
  }

  for (const prog of t.take('programmes') || []) {
    if (learnerId === PROGRAMME_LEARNER) continue; // their programmes come from the programme fixture's history
    add('Programme', {
      programmeId: prog.id,
      learnerId,
      title: prog.title,
      status: prog.status,
      startsOn: prog.startsOn ?? null,
      endsOn: prog.endsOn,
      archivedAt: prog.archivedAt,
      createdAt: prog.createdAt ?? p.createdAt,
      createdByEmail: STAFF.email
    });
  }

  // A path of `stepsTotal` real concepts, the first `stepsComplete` complete.
  if (learnerId !== PROGRAMME_LEARNER && p.stepsTotal > 0) {
    const pathId = `path-${learnerId}`;
    add('LearningPath', { pathId, learnerId, programmeId: null, replanBlockedAt: t.take('replanBlockedAt'), createdAt: p.createdAt });
    for (let i = 0; i < p.stepsTotal; i++) {
      const conceptId = CORPUS[i % CORPUS.length];
      const complete = i < p.stepsComplete;
      add('PathStep', { pathId, position: i, conceptId, status: complete ? 'complete' : i === p.stepsComplete ? 'available' : 'locked', rationale: null, removedAt: null });
      if (complete) {
        add('Progress', {
          learnerId,
          conceptId,
          confidence: null,
          reachedWowMoment: false,
          // No step here is later than their last activity, so GREATEST reads the context.
          completedAt: p.lastActivity || p.createdAt,
          updatedAt: p.lastActivity || p.createdAt
        });
      }
    }
  } else {
    t.take('replanBlockedAt');
  }

  // Somebody asked their coach something and nobody has opened it (L119 §5).
  if (p.awaitingReplySince) {
    const conversationId = `conv-${learnerId}`;
    add('Conversation', { conversationId, learnerId, anchorKind: null, anchorId: null, subject: 'A question for my coach' });
    add('ConversationMessage', {
      messageId: `msg-${learnerId}-1`,
      conversationId,
      authorRole: 'learner',
      authorUsername: username,
      body: 'Can we look at this on Thursday?',
      createdAt: p.awaitingReplySince,
      readAt: null
    });
  }

  t.done();
}

// ── The learner's programme ─────────────────────────────────────────────────────────
const [programme] = staticJson('Data/Fixture programme');
const learnerId = programme.learnerId;
const pt = tracker('programme', programme, {
  entries: 'decomposed below',
  history: 'decomposed below',
  onboardingFacts: 'the pack\'s onboarding fact labels: pack data, served by the function, never a row',
  endsOn: 'stored on the Programme row (prog-autumn)'
});
pt.take('learnerId');
const rosterPriya = roster.find((p) => p.learnerId === learnerId);

add('ProjectContext', {
  learnerId,
  projectName: pt.take('projectName'),
  problemStatement: pt.take('problemStatement'),
  facts: pt.take('facts'),
  version: rosterPriya.contextVersion,
  createdAt: rosterPriya.createdAt,
  updatedAt: rosterPriya.lastActivity
});

for (const prog of rosterPriya.programmes) {
  add('Programme', {
    programmeId: prog.id,
    learnerId,
    title: prog.title,
    status: prog.status,
    startsOn: prog.startsOn ?? null,
    endsOn: prog.endsOn,
    archivedAt: prog.archivedAt,
    createdAt: prog.createdAt,
    createdByEmail: STAFF.email
  });
}

for (const d of pt.take('dimensions')) {
  const dt = tracker(`dimension ${d.id}`, d);
  add('ProgrammeDimension', {
    dimensionId: dt.take('id'),
    programmeId: dt.take('programmeId'),
    label: dt.take('label'),
    target: dt.take('target'),
    deliverableId: dt.take('deliverableId'),
    position: dt.take('position'),
    archivedAt: dt.take('archivedAt')
  });
  dt.done();
}

for (const d of pt.take('deliverables')) {
  const dt = tracker(`deliverable ${d.id}`, d, {
    code: 'derived: an authored deliverable\'s code is its slug (deliverables/resolve.ts)',
    labelKey: 'derived: likewise'
  });
  const deliverableId = dt.take('id');
  add('LearnerDeliverable', {
    deliverableId,
    learnerId,
    slug: dt.take('slug'),
    title: dt.take('title'),
    description: dt.take('description'),
    expectedCoreFields: dt.take('expectedCoreFields'),
    position: dt.take('position'),
    archivedAt: dt.take('archivedAt')
  });
  for (const conceptId of dt.take('conceptIds')) add('DeliverableConcept', { deliverableId, conceptId });
  dt.done();
}

// The content-free submissions list is a PROJECTION of the artifact rows, not a
// second source: every one of them must be an artifact submission below.
const submissionsList = pt.take('submissions');

// ── Timeline entries → rows ───────────────────────────────────────────────────
const paths = new Map(); // programmeId -> pathId
const pathFor = (programmeId, createdAt) => {
  if (!paths.has(programmeId)) {
    const pathId = `path-${learnerId}-${programmeId}`;
    paths.set(programmeId, pathId);
    add('LearningPath', { pathId, learnerId, programmeId, replanBlockedAt: null, createdAt });
  }
  return paths.get(programmeId);
};
const positions = new Map();
const concepts = new Map();
const noteConcept = (id, title) => { if (id && title && !concepts.has(id)) concepts.set(id, title); };

const PROGRAMME_CREATED = Object.fromEntries(rosterPriya.programmes.map((p) => [p.id, p.createdAt]));

function ratingsFor(list, ref) {
  for (const r of list || []) {
    add('DimensionRating', { ratingId: `rt-${ref.sessionId || ref.evaluationId}-${r.dimensionId}`, dimensionId: r.dimensionId, sessionId: ref.sessionId ?? null, evaluationId: ref.evaluationId ?? null, score: r.score });
  }
}

const ENTRY = {
  lesson(e, t) {
    const programmeId = t.take('programmeId');
    const pathId = pathFor(programmeId, PROGRAMME_CREATED[programmeId]);
    const position = positions.get(pathId) || 0;
    positions.set(pathId, position + 1);
    const conceptId = t.take('conceptId');
    t.take('anchor'); // == conceptId: the anchor of a lesson IS its concept (L116)
    const status = t.take('status');
    noteConcept(conceptId, t.take('title'));
    add('PathStep', { pathId, position, conceptId, status, rationale: t.take('rationale'), removedAt: null });
    const at = t.take('at');
    const confidence = t.take('confidence');
    const reachedWowMoment = t.take('reachedWowMoment');
    if (status !== 'locked') {
      add('Progress', {
        learnerId,
        conceptId,
        confidence: confidence ?? null,
        reachedWowMoment: !!reachedWowMoment,
        // L116: only a COMPLETE step has a moment; in progress, `updatedAt` means "last touched".
        completedAt: status === 'complete' ? at : null,
        updatedAt: at || PROGRAMME_CREATED[programmeId]
      });
    }
  },
  session(e, t) {
    const s = t.take('session');
    const st = tracker(`session ${s.id}`, s, {
      createdByName: `resolved from createdByEmail (L106): '${STAFF_NAME}'`,
      cohort: 'the cohort a group session is scoped to — null on every fixture session, stored as cohortId'
    });
    if (st.take('createdByName') !== STAFF_NAME) fail(`session ${s.id}: createdByName is not the staff user's name`);
    const sessionId = st.take('id');
    add('CoachingSession', {
      sessionId,
      learnerId: s.cohort ? null : learnerId,
      cohortId: s.cohort ? s.cohort.id : null,
      programmeId: st.take('programmeId'),
      title: st.take('title'),
      startsAt: st.take('startsAt'),
      durationMinutes: st.take('durationMinutes'),
      meetingLink: st.take('meetingUrl'),
      summary: st.take('summary'),
      cancelledAt: st.take('cancelledAt'),
      createdByEmail: STAFF.email
    });
    st.take('prep').forEach((item, position) => {
      const it = tracker(`prep ${sessionId}#${position}`, item, { state: 'derived from the learner\'s path and submissions (L105, L121)', kind: 'implied by which target is set' });
      const id = it.take('id');
      const title = it.take('title');
      const row = { prepId: `prep-${sessionId}-${position}`, sessionId, position, conceptId: null, assignmentId: null, resourceLabel: null, resourceUrl: null, resourceStorageKey: null };
      if (item.kind === 'concept') { row.conceptId = id; noteConcept(id, title); }
      else if (item.kind === 'assignment') row.assignmentId = id;
      else if (item.kind === 'resource') { row.prepId = id; row.resourceLabel = title; row.resourceUrl = it.take('url') ?? null; }
      else fail(`prep ${sessionId}#${position}: unknown kind '${item.kind}'`);
      add('SessionPrep', row);
      it.done();
    });
    st.done();
    t.take('programmeId');
    t.take('anchor');
    t.take('at');
    ratingsFor(t.take('ratings'), { sessionId });
  },
  evaluation(e, t) {
    const evaluationId = t.take('evaluationId');
    add('ProgrammeEvaluation', {
      evaluationId,
      programmeId: t.take('programmeId'),
      kind: t.take('evaluationKind'),
      dueOn: t.take('dueOn'),
      completedAt: t.take('completedAt'),
      summary: t.take('summary'),
      criteria: t.take('criteria'),
      nextStep: t.take('nextStep')
    });
    t.take('anchor');
    t.take('at');
    ratingsFor(t.take('ratings'), { evaluationId });
  },
  submission(e, t) {
    const source = t.take('source');
    const submissionId = e.id.slice('submission:'.length);
    const common = { submissionId, learnerId, attempt: t.take('attempt'), submittedAt: t.take('at'), evaluation: t.take('evaluated') ? { summary: '(seeded)' } : null };
    t.take('programmeId');
    t.take('anchor');
    if (source === 'artifact') {
      add('ArtifactSubmission', { ...common, conceptId: t.take('conceptId'), sectionId: 'artifact', deliverableId: t.take('deliverableId') });
      t.take('assignmentId');
    } else {
      add('AssignmentSubmission', { ...common, assignmentId: t.take('assignmentId') });
      t.take('conceptId');
      t.take('deliverableId');
    }
  },
  note(e, t) {
    const n = t.take('note');
    const nt = tracker(`note ${n.id}`, n, { authorName: `resolved from authorEmail (L106)` });
    add('CoachNote', {
      noteId: nt.take('id'),
      learnerId,
      authorEmail: STAFF.email,
      body: nt.take('body'),
      sessionId: nt.take('sessionId'),
      anchorKind: n.anchor ? n.anchor.kind : null,
      anchorId: n.anchor ? n.anchor.id : null,
      visibility: 'shared',
      createdAt: nt.take('createdAt'),
      editedAt: nt.take('editedAt')
    });
    nt.take('anchor');
    nt.done();
    t.take('programmeId');
    t.take('anchor');
    t.take('at');
  },
  assignment(e, t) {
    add('Assignment', {
      assignmentId: t.take('assignmentId'),
      learnerId: t.take('cohortId') ? null : learnerId,
      cohortId: e.cohortId,
      programmeId: t.take('programmeId'),
      title: t.take('title'),
      brief: t.take('brief'),
      dueAt: t.take('dueAt'),
      submissionModes: t.take('submissionModes'),
      criteria: t.take('criteria'),
      deliverableId: t.take('deliverableId'),
      status: t.take('withdrawn') ? 'withdrawn' : 'issued'
    });
    t.take('answered'); // derived: a submission exists (L121)
    t.take('anchor');
    t.take('at');
  },
  message(e, t) {
    const conversationId = t.take('conversationId');
    if (!(rows.Conversation || []).some((c) => c.conversationId === conversationId)) {
      const a = t.take('threadAnchor');
      add('Conversation', { conversationId, learnerId, anchorKind: a ? a.kind : null, anchorId: a ? a.id : null, subject: t.take('subject') });
    }
    const role = t.take('authorRole');
    add('ConversationMessage', {
      messageId: e.id.slice('message:'.length),
      conversationId,
      authorRole: role,
      authorUsername: role === 'coach' ? STAFF.username : (rosterPriya.email || learnerId),
      body: t.take('body'),
      createdAt: t.take('at'),
      // Read by its reader: `read` is the fixture's word for "the other party opened it".
      readAt: t.take('read') ? t.take('at') : null
    });
    t.take('unread'); // derived per reader (L118)
    t.take('programmeId');
    t.take('anchor');
    t.take('threadAnchor');
    t.take('subject');
  },
  signal(e, t) {
    add('Signal', {
      signalId: e.id.slice('signal:'.length),
      learnerId,
      conceptId: t.take('anchor'),
      sectionId: t.take('sectionId'),
      kind: t.take('signalKind'),
      utterance: t.take('utterance'),
      createdAt: t.take('at')
    });
    t.take('programmeId');
  }
};

// History first: the spring path is older than the autumn one, and path
// positions are assigned in the order entries arrive.
for (const e of [...pt.take('history'), ...pt.take('entries')]) {
  const handler = ENTRY[e.kind];
  if (!handler) { fail(`entry ${e.id}: no decomposition for kind '${e.kind}'`); continue; }
  const t = tracker(`entry ${e.id}`, e, DERIVED_ENTRY);
  handler(e, t);
  t.done();
}

// The submissions list must be exactly the artifact rows' projection.
for (const s of submissionsList) {
  const art = (rows.ArtifactSubmission || []).find((a) => a.conceptId === s.conceptId && a.attempt === s.attempt);
  if (!art) { fail(`submissions: '${s.conceptId}' attempt ${s.attempt} has no artifact submission on the timeline (TASK-L169 §3b)`); continue; }
  // The whole projection, not only its key: a list that files a submission under
  // one objective while its timeline entry files it under another is two answers.
  for (const k of ['submittedAt', 'deliverableId']) {
    if (art[k] !== s[k]) fail(`submissions: '${s.conceptId}' ${k} is ${JSON.stringify(s[k])} in the list and ${JSON.stringify(art[k])} on the timeline`);
  }
  if ((art.evaluation !== null) !== s.evaluated) fail(`submissions: '${s.conceptId}' evaluated disagrees with the timeline`);
}
pt.done();

for (const [conceptId, title] of concepts) add('Concept', { conceptId, title });

// ── The lesson ────────────────────────────────────────────────────────────────
const [lesson] = staticJson('Data/Fixture lesson');
{
  const lt = tracker('lesson', lesson);
  add('Lesson', {
    learnerId: 'l-csv',
    conceptId: lt.take('conceptId'),
    title: lt.take('title'),
    hook: lt.take('hook'),
    landing: lt.take('landing'),
    conceptVersion: lt.take('conceptVersion'),
    projectContextVersion: lt.take('projectContextVersion'),
    generationVersion: lt.take('generationVersion'),
    generatedByTier: lt.take('generatedByTier'),
    steps: lt.take('steps'),
    sections: lt.take('sections')
  });
  lt.done();
}

if (failures.length) {
  console.error(`build-seed: ${failures.length} field(s) could not be placed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}

// Stable order: collections alphabetically, rows as produced.
const sortedRows = Object.fromEntries(Object.keys(rows).sort().map((k) => [k, rows[k]]));
mkdirSync(join(TEMPLATE, 'backend'), { recursive: true });
writeFileSync(join(TEMPLATE, 'backend', 'seed.json'), JSON.stringify({ users, rows: sortedRows }, null, 2));
const counts = Object.entries(sortedRows).map(([k, v]) => `${k} ${v.length}`).join(', ');
console.log(`build-seed: ${users.length} users; ${counts}`);
