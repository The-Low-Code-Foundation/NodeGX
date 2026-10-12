/*
 * THE RULES THE TRAINER'S TOOLS SHARE (TASK-L189). The ONE source of them.
 *
 * tools/build-trainer-door.mjs copies this file, byte for byte, between the
 * TRAINER_DOOR_LIB markers of every function the trainer's Claude reaches, and
 * tools/check-trainer-door.mjs fails when any copy differs. Seven functions
 * would otherwise spell "their live path", "a field another lesson asks for"
 * and "still about the other learner's project" seven times, and two spellings
 * of one rule is how they start to disagree.
 *
 * It is a plain script, not a module: a cloud Function's script is one string,
 * evaluated with `Noodl` in scope, and cannot import. Everything it defines
 * hangs off one constant, `DOOR`.
 *
 * Every read is `{ plain: true }` (NodeGX HLT-022). Nothing here writes.
 */
const DOOR = (() => {
  const R = Noodl.Records;
  const q = (c, where, limit) => R.query(c, where, { limit: limit || 1000, plain: true });
  const blank = (x) => x === undefined || x === null || x === '';
  const newestFirst = (rows) => [...rows].sort((a, b) => (String(a.createdAt || '') < String(b.createdAt || '') ? 1 : -1));

  /** The caller's address, for `updatedByEmail`. From the session's account, never an argument. */
  async function callerEmail(callerId) {
    if (blank(callerId)) return null;
    const u = await q('_User', { objectId: { equalTo: String(callerId) } }, 2);
    return u.length === 1 ? String(u[0].username || u[0].email || '').trim().toLowerCase() || null : null;
  }

  /** A learner: their profile, their project, and the name their coach knows them by. Null when there is none. */
  async function learner(learnerId) {
    const id = String(learnerId || '').trim();
    if (!id) return null;
    const profiles = await q('LearnerProfile', { learnerId: { equalTo: id } }, 2);
    if (profiles.length !== 1) return null;
    const [contexts, invites] = await Promise.all([
      q('ProjectContext', { learnerId: { equalTo: id } }, 2),
      q('LearnerInvite', { claimedByLearnerId: { equalTo: id } })
    ]);
    const ctx = contexts[0] || null;
    const label = newestFirst(invites).map((i) => i.label).find((l) => typeof l === 'string' && l.trim());
    return {
      learnerId: id,
      // The coach's own shorthand, then the project's name, then the id. Never the
      // email address: the trainer's Claude is a model run by Anthropic, and the
      // address is not something a lesson needs (sprint 55 §5).
      name: (label && label.trim()) || (ctx && ctx.projectName) || id,
      ctx
    };
  }

  /** Their live path — the newest — and its live steps in order. The `lesson` read's rule. */
  async function livePath(learnerId) {
    const paths = await q('LearningPath', { learnerId: { equalTo: String(learnerId) } });
    const live = newestFirst(paths)[0];
    if (!live) return { path: null, steps: [] };
    const steps = (await q('PathStep', { pathId: { equalTo: live.pathId } }))
      .filter((s) => blank(s.removedAt))
      .sort((a, b) => a.position - b.position);
    return { path: live, steps };
  }

  /** The step for a concept, or a sentence saying where it could go instead. */
  function stepFor(steps, conceptId, who) {
    const step = steps.find((s) => s.conceptId === conceptId);
    if (step) return { step };
    const on = steps.map((s) => s.conceptId).join(', ');
    return {
      why: '"' + conceptId + '" is not on ' + who + "'s path. A lesson is written for a step they have. " +
        (on ? 'Their path is: ' + on + '. ' : 'They have no path yet. ') +
        'To add it, set their path first with setLearnerPath.'
    };
  }

  /** The capture fields a lesson asks for: capture sections, and activities that capture a fact. */
  function fieldsOf(lesson) {
    const out = [];
    for (const s of (lesson && lesson.sections) || []) {
      if (s && s.kind === 'capture' && s.field) out.push(String(s.field));
      if (s && s.kind === 'activity' && s.capturesProjectFact && s.capturesProjectFact.field) out.push(String(s.capturesProjectFact.field));
    }
    return out;
  }

  /** Newest published lesson per concept for one learner. */
  async function published(learnerId) {
    const rows = await q('Lesson', { learnerId: { equalTo: String(learnerId) } });
    const best = {};
    for (const r of rows) if (!best[r.conceptId] || (r.generationVersion || 0) > (best[r.conceptId].generationVersion || 0)) best[r.conceptId] = r;
    return best;
  }

  async function drafts(learnerId) {
    const rows = await q('LessonDraft', { learnerId: { equalTo: String(learnerId) } });
    const by = {};
    for (const r of rows) by[r.conceptId] = r;
    return by;
  }

  /**
   * Every capture field their OTHER lessons (published or drafted) ask for, by
   * field. Two lessons writing one fact means the second answer silently replaces
   * the first on their project (check-lessons' rule, enforced at the write).
   */
  async function fieldsElsewhere(learnerId, conceptId) {
    const [pub, dr] = await Promise.all([published(learnerId), drafts(learnerId)]);
    const map = {};
    for (const src of [pub, dr]) {
      for (const [c, lesson] of Object.entries(src)) {
        if (c === conceptId) continue;
        for (const f of fieldsOf(lesson)) if (!map[f]) map[f] = c;
      }
    }
    return map;
  }

  function fieldClash(lesson, elsewhere) {
    const clash = fieldsOf(lesson).filter((f) => elsewhere[f]);
    if (!clash.length) return null;
    return 'Their lesson on ' + clash.map((f) => '"' + elsewhere[f] + '" already asks for "' + f + '"').join('; ') +
      '. Two lessons saving one answer would overwrite it. Give this capture a different field name.';
  }

  /**
   * THE PRODUCT'S GATE (validateLessonOutput, compiled from its source into
   * LESSON_GATE). Answers the lesson as the gate returned it, or every problem
   * as `path: message` — never a raw ZodError, which a model reads as noise.
   */
  function gate(lesson) {
    if (typeof LessonGate === 'undefined') throw new Error('this function carries no LESSON_GATE block');
    try {
      const v = LessonGate.validateLessonOutput(lesson);
      return { lesson: { title: v.title, hook: v.hook, landing: v.landing, steps: v.steps, sections: v.sections } };
    } catch (e) {
      const issues = e && Array.isArray(e.issues)
        ? e.issues.map((i) => (i.path && i.path.length ? i.path.join('.') : '(the lesson)') + ': ' + i.message)
        : [String((e && e.message) || e)];
      return { problems: issues };
    }
  }

  function refusalFor(problems) {
    return 'The lesson does not pass the course\'s lesson check, so nothing was saved. Fix these and send it again:\n- ' +
      problems.slice(0, 25).join('\n- ') + (problems.length > 25 ? '\n- …and ' + (problems.length - 25) + ' more.' : '');
  }

  /**
   * STILL ABOUT THE OTHER LEARNER'S PROJECT (sprint 55 §4).
   *
   * The terms are the source learner's project name, problem statement and every
   * saved answer at least 12 characters long, trimmed, case-insensitive — minus any
   * that also appear in the target's own project, because a phrase both projects
   * share is not a leak. A place "mentions" a term when any string in it contains it.
   */
  function leakTerms(sourceCtx, targetCtx) {
    const texts = (ctx) => {
      if (!ctx) return [];
      const facts = ctx.facts && typeof ctx.facts === 'object' ? Object.values(ctx.facts) : [];
      return [ctx.projectName, ctx.problemStatement, ...facts].filter((x) => x !== undefined && x !== null).map((x) => String(x).trim());
    };
    const theirs = texts(targetCtx).join('\n').toLowerCase();
    const terms = [];
    for (const t of texts(sourceCtx)) {
      const isName = sourceCtx && t === String(sourceCtx.projectName || '').trim();
      if (!t || (!isName && t.length < 12)) continue;
      if (theirs.includes(t.toLowerCase())) continue;
      if (!terms.some((x) => x.toLowerCase() === t.toLowerCase())) terms.push(t);
    }
    return terms;
  }

  function strings(x, out) {
    if (typeof x === 'string') out.push(x);
    else if (Array.isArray(x)) x.forEach((y) => strings(y, out));
    else if (x && typeof x === 'object') Object.values(x).forEach((y) => strings(y, out));
    return out;
  }

  function mentions(lesson, terms) {
    if (!terms.length || !lesson) return [];
    const places = [['title', lesson.title], ['hook', lesson.hook], ['landing', lesson.landing]];
    for (const s of lesson.steps || []) places.push(['step ' + s.id, s]);
    for (const s of lesson.sections || []) places.push(['section ' + s.id, s]);
    const found = [];
    for (const [where, value] of places) {
      const hay = strings(value, []).join('\n').toLowerCase();
      for (const term of terms) if (hay.includes(term.toLowerCase())) found.push({ term, where });
    }
    return found;
  }

  function previewPath(learnerId, conceptId, which) {
    return '/preview?learner=' + encodeURIComponent(learnerId) + '&concept=' + encodeURIComponent(conceptId) + (which ? '&which=' + which : '');
  }

  return { q, blank, newestFirst, callerEmail, learner, livePath, stepFor, fieldsOf, published, drafts, fieldsElsewhere, fieldClash, gate, refusalFor, leakTerms, mentions, previewPath };
})();
