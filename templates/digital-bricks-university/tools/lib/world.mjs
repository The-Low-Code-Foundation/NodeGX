/**
 * THE DEMO WORLD, AS A PURE FUNCTION OF THE FIXTURES AND A DAY (DBU-01, split out in DBU-11).
 *
 * No imports and no file access, on purpose: the same source builds the world for the local backend
 * (tools/lib/seed.mjs reads the fixtures and calls buildWorld) and, inlined by tools/build-demo.mjs, for the
 * browser-only demo, which builds it on the visitor's first visit so its dates are always around today.
 *
 * Two things cannot be known until the backend answers, and stay as markers:
 *   { $user: 'camille' }        → the objectId minted for that user
 *   { $file: '@name.pdf' }      → the stored name the private upload answers with
 * resolveRows() swaps them in.
 *
 * Times are the coach's wall clock (Europe/Paris), so "10:00" is a 10:00 session in Paris whatever the
 * machine's zone.
 */
export const COACH_TZ = 'Europe/Paris';

export function zoneOffsetMs(utcMs, tz = COACH_TZ) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}

/** "-24d 10:00" → ISO instant; "-24d" → "YYYY-MM-DD"; null stays null. Relative to `now` in the coach's zone. */
export function makeClock(now = new Date()) {
  const local = new Date(now.getTime() + zoneOffsetMs(now.getTime()));
  const [y, m, d] = [local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()];
  return function when(spec) {
    if (spec === null || spec === undefined) return null;
    const match = /^([+-])(\d+)d(?: (\d{2}):(\d{2}))?$/.exec(String(spec));
    if (!match) throw new Error(`fixtures: "${spec}" is not a time like "-24d 10:00" or "+3d"`);
    const off = (match[1] === '-' ? -1 : 1) * Number(match[2]);
    if (match[3] === undefined) return new Date(Date.UTC(y, m, d + off)).toISOString().slice(0, 10);
    const nominal = Date.UTC(y, m, d + off, Number(match[3]), Number(match[4]));
    const first = nominal - zoneOffsetMs(nominal);
    return new Date(nominal - zoneOffsetMs(first)).toISOString();
  };
}

const user = (key) => ({ $user: key });
/** A hand-in checklist as {text, required}. A plain string (older fixtures) is a required item. */
const checklistOf = (list) => (list || []).map((c) => (typeof c === 'string' ? { text: c, required: true } : { text: c.text, required: c.required !== false }));
const fileRef = (name) => ({ $file: name });
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * The world for `now`, from the fixtures (`library`, `people`) and the check-in `forms`: users (with roles), files to upload (with their owner),
 * and rows per collection, in an order where nothing names a row before it.
 */
export function buildWorld(now, { library, people, forms }) {
  const when = makeClock(now);
  const libById = new Map(library.libraryItems.map((l) => [l.key, l]));
  const formOf = (f, where) => {
    if (f === undefined || f === null || typeof f === 'object') return f;
    const found = forms.find((x) => x.id === f);
    if (!found) throw new Error(`fixtures: ${where} names check-in form "${f}", which shared/Checkin forms does not have`);
    return found;
  };

  const users = [];
  const files = [];
  const rows = { LibraryItem: [], PlanTemplate: [], Plan: [], Step: [], Submission: [], CheckinResponse: [], Message: [], Creation: [], CoachNote: [] };
  const stamp = (at) => ({ createdAt: at, updatedAt: at });
  const longAgo = when('-60d 09:00');

  // A library resource that is a file is the COACH's private upload (DBU-03): learners reach it
  // only through resourceLink, from a shared step that lists it.
  const coachFile = (name) => {
    if (!String(name).startsWith('@')) throw new Error(`fixtures: a file is written "@name" (got "${name}")`);
    files.push({ fixture: name.slice(1), owner: people.coach.key });
    return fileRef(name);
  };
  const libResources = (list) =>
    (list || []).map((r) => (r.file ? { label: r.label || r.file.slice(1), file: coachFile(r.file), fileName: r.file.slice(1) } : { label: r.label, url: r.url }));
  for (const l of library.libraryItems) {
    const { key, resources, handInChecklist, ...fields } = l;
    rows.LibraryItem.push({
      objectId: key, ...fields, handInChecklist: checklistOf(handInChecklist), resources: libResources(resources), archived: l.archived === true, ...stamp(longAgo)
    });
  }
  const libRows = new Map(rows.LibraryItem.map((r) => [r.objectId, r]));
  for (const t of library.planTemplates) {
    const { key, ...fields } = t;
    rows.PlanTemplate.push({ objectId: key, ...fields, ...stamp(longAgo) });
  }

  const person = (p, roles) => {
    const { key, email, name, organisation, jobTitle, timezone, lastSeenAt } = p;
    users.push({ key, roles, fields: compact({ username: email, email, name, organisation, jobTitle, timezone, lastSeenAt: when(lastSeenAt) }) });
  };
  person(people.coach, ['staff']);
  const coachKey = people.coach.key;

  for (const L of people.learners) {
    person(L, ['learner']);
    const me = user(L.key);
    const planId = `plan-${L.key}`;
    const planAt = when(`${L.plan.startedOn} 09:00`);
    rows.Plan.push({
      objectId: planId, learner: me, title: L.plan.title, status: L.plan.status,
      meetingLink: L.plan.meetingLink || null, bookingLink: L.plan.bookingLink || null,
      startedOn: when(L.plan.startedOn), fromTemplate: L.plan.fromTemplate || null, ...stamp(planAt)
    });

    const stepId = (pos) => `step-${L.key}-${pos}`;
    const subId = (pos, v) => `sub-${L.key}-${pos}-v${v}`;
    const upload = (name) => {
      if (!String(name).startsWith('@')) throw new Error(`fixtures: a file is written "@name" (got "${name}")`);
      files.push({ fixture: name.slice(1), owner: L.key });
      return fileRef(name);
    };

    L.steps.forEach((s, i) => {
      const pos = i + 1;
      const form = s.kind === 'checkin' ? formOf(s.form, `${L.key} step ${pos}`) : undefined;
      const lib = s.fromLibraryItem ? libById.get(s.fromLibraryItem) : null;
      if (s.fromLibraryItem && !lib) throw new Error(`fixtures: ${L.key} step ${pos} names library item "${s.fromLibraryItem}", which library.json does not have`);
      const homework = s.kind === 'homework';
      rows.Step.push(compact({
        objectId: stepId(pos), plan: planId, learner: me, position: pos, kind: s.kind, title: s.title,
        shared: s.shared !== false, status: s.status,
        startsAt: when(s.startsAt), durationMin: s.durationMin, meetingLink: s.meetingLink, prepNote: s.prepNote,
        attended: s.attended, recordingUrl: s.recordingUrl, summary: s.summary,
        dueAt: when(s.dueAt),
        brief: homework ? s.brief || (lib && lib.brief) || null : undefined,
        handInChecklist: homework ? checklistOf(s.handInChecklist || (lib && lib.handInChecklist)) : undefined,
        resources: homework ? s.resources || (lib && libRows.get(lib.key).resources) || [] : undefined,
        fromLibraryItem: s.fromLibraryItem,
        form, sendsAt: when(s.sendsAt), sentAt: when(s.sentAt),
        sendAfter: s.sendAfter ? { step: stepId(s.sendAfter.step), days: s.sendAfter.days } : undefined,
        ...stamp(planAt)
      }));
      (s.submissions || []).forEach((sub, j) => {
        const v = j + 1;
        rows.Submission.push(compact({
          objectId: subId(pos, v), step: stepId(pos), learner: me, version: v, kind: sub.kind,
          // a file version: "file": "@a.pdf" or "files": ["@a.mp3", "@b.docx"] → files: [{file, fileName}]
          files: sub.kind === 'file' ? [].concat(sub.files || sub.file || []).map((f) => ({ file: upload(f), fileName: f.slice(1) })) : undefined,
          url: sub.url, text: sub.text, note: sub.note,
          review: sub.review, reviewNote: sub.reviewNote, reviewedAt: when(sub.reviewedAt),
          ...stamp(when(sub.at))
        }));
      });
      if (s.response) {
        rows.CheckinResponse.push(compact({
          objectId: `checkin-${L.key}-${pos}`, step: stepId(pos), learner: me, answers: s.response.answers,
          form, seenAt: when(s.response.seenAt) || undefined, ...stamp(when(s.response.at))
        }));
      }
    });

    (L.messages || []).forEach((m, i) => {
      rows.Message.push({
        objectId: `msg-${L.key}-${i + 1}`, learner: me, step: m.step ? stepId(m.step) : null,
        author: user(m.from === 'coach' ? coachKey : L.key), body: m.body,
        attachments: (m.attachments || []).map((a) => ({ file: upload(a), name: a.slice(1) })),
        // Seeded messages were mailed when they were sent (DBU-07): the flush must not mail the past.
        readAt: when(m.readAt), mailPending: false, mailedAt: when(m.at), ...stamp(when(m.at)),
        // DBU-08: the coach marked it "No reply needed", so it is not a question in his inbox.
        settledAt: when(m.settledAt) || null
      });
    });

    (L.creations || []).forEach((c, i) => {
      const fromSub = c.fromStep && c.fromSubmission ? subId(c.fromStep, c.fromSubmission) : null;
      const madeAt = fromSub ? rows.Submission.find((s) => s.objectId === fromSub).createdAt : planAt;
      rows.Creation.push(compact({
        objectId: `creation-${L.key}-${i + 1}`, learner: me, title: c.title, kind: c.kind,
        file: c.file ? upload(c.file) : undefined, fileName: c.file ? c.file.slice(1) : undefined,
        url: c.url, text: c.text, madeWith: c.madeWith, description: c.description,
        fromStep: c.fromStep ? stepId(c.fromStep) : null, submission: fromSub, usedInClass: c.usedInClass === true,
        ...stamp(madeAt)
      }));
    });

    (L.notes || []).forEach((body, i) => {
      rows.CoachNote.push({ objectId: `note-${L.key}-${i + 1}`, learner: me, body, ...stamp(when('-2d 09:00')) });
    });
  }

  // DBU-11: the name learners see, set in Settings (Setting coachName); the words say "your coach" without it.
  rows.Setting = [{ objectId: 'setting-coachName', key: 'coachName', value: String(people.coach.name || '').split(' ')[0], ...stamp(longAgo) }];

  return { users, files, rows, coachKey, learnerKeys: people.learners.map((l) => l.key), stories: Object.fromEntries(people.learners.map((l) => [l.key, l.story])) };
}

/** Swap the markers for what the backend answered. Throws on a marker it cannot resolve. */
export function resolveRows(list, { userId, storedName }) {
  const walk = (x) => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      if ('$user' in x) {
        const id = userId(x.$user);
        if (!id) throw new Error(`seed names a user "${x.$user}" that was not created`);
        return id;
      }
      if ('$file' in x) {
        const name = storedName(x.$file);
        if (!name) throw new Error(`seed names a file "${x.$file}" that was not uploaded`);
        return name;
      }
      return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]));
    }
    return x;
  };
  return list.map(walk);
}
