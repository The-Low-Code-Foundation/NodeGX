/**
 * P116 ONT-001 — the validator for `docs/world/`.
 *
 * Hand-written and dependency-free, so a page can run it as well as the MCP and the editor;
 * `schemas/world.schema.json` says the same structure for any other tool, and a test runs both
 * over every fixture so they cannot disagree. What only this validator can say is what needs
 * the pinned vocabulary: a kind it does not define, an answer a kind does not ask for, a target
 * of the wrong shape, an answer that means the relation was another kind all along.
 *
 * Every refusal says what was expected, in words, and where.
 */
import type { AnswerShape } from './kind';
import { PROPERTY_KINDS, WORLD_FILES, type WorldFileName } from './files';
import { NOUN_QUESTIONS, NUMBER_QUESTIONS, numberLookProblem } from './noun';
import { validateRules } from './rules';
import { validateVerbs } from './verbs';
import { WORLD_VOCABULARY_REF, type VocabularyRef } from './vocabulary';

export interface WorldProblem {
  /** Project-relative path of the file. */
  file: string;
  /** Where in it, as `relations[2].answers.several`. */
  at: string;
  expected: string;
  found?: string;
  /** The whole refusal in one sentence. */
  message: string;
}

export interface WorldVerdict {
  ok: boolean;
  problems: WorldProblem[];
}

const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const show = (v: unknown): string => (v === undefined ? 'nothing' : JSON.stringify(v));

function answerFits(shape: AnswerShape, value: unknown): boolean {
  if (shape.type === 'yes-no') return typeof value === 'boolean';
  if (shape.type === 'one-of') return typeof value === 'string' && shape.values.includes(value);
  return nonEmpty(value);
}
function answerWords(shape: AnswerShape): string {
  if (shape.type === 'yes-no') return 'true or false';
  if (shape.type === 'one-of') return `one of ${shape.values.map((v) => JSON.stringify(v)).join(', ')}`;
  if (shape.type === 'fields') return 'the names of its own details, comma-separated, or "nothing"';
  if (shape.type === 'field') return 'the name of one of its own details, or "nothing"';
  return 'the person\'s words';
}
/** P116 ONT-011 step 2: a `fields` answer, as names: `"note, paid on"` → `['note', 'paid on']`; `"nothing"` → `[]`. */
export function fieldsAnswered(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const words = value.trim();
  if (!words || /^nothing$/i.test(words)) return [];
  return words
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Validates the three files, already parsed. A file that is missing is passed as `undefined`
 * and refused by name. `vocabulary` defaults to the one this package defines; a reader that
 * knows other versions passes its own.
 */
export function validateWorld(
  files: Partial<Record<WorldFileName, unknown>> & { verbs?: unknown; rules?: unknown },
  vocabulary: VocabularyRef = WORLD_VOCABULARY_REF
): WorldVerdict {
  const problems: WorldProblem[] = [];
  const say = (name: WorldFileName, at: string, expected: string, found: unknown, message: string) =>
    problems.push({ file: WORLD_FILES[name], at, expected, ...(found === undefined ? {} : { found: show(found) }), message });

  const strayKeys = (name: WorldFileName, at: string, obj: Record<string, unknown>, allowed: string[]) => {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) {
        say(name, `${at}.${key}`, `only ${allowed.join(', ')}`, key, `${WORLD_FILES[name]}: ${at} has "${key}", which this format does not have (it has ${allowed.join(', ')}).`);
      }
    }
  };

  // ── vocabulary.json ────────────────────────────────────────────────────────
  const vocab = files.vocabulary;
  if (!isObj(vocab)) {
    say('vocabulary', '', `an object naming the vocabulary and its version`, vocab, `${WORLD_FILES.vocabulary} is missing or not an object; it pins the kinds this world is described in (${vocabulary.id} v${vocabulary.version}).`);
  } else {
    strayKeys('vocabulary', 'vocabulary', vocab, ['$schema', 'vocabulary', 'version']);
    if (vocab.vocabulary !== vocabulary.id || vocab.version !== vocabulary.version) {
      say(
        'vocabulary',
        'vocabulary',
        `${vocabulary.id} v${vocabulary.version}`,
        `${vocab.vocabulary} v${vocab.version}`,
        `This world is pinned to ${show(vocab.vocabulary)} v${show(vocab.version)}; this reader knows ${vocabulary.id} v${vocabulary.version} and will not guess at another.`
      );
    }
  }

  // ── nouns.json ─────────────────────────────────────────────────────────────
  const nounIds = new Map<string, Record<string, unknown>>();
  let signsIn: string | undefined;
  const wasIds: Array<{ at: string; was: string; id: string }> = [];
  /** `owner`: the noun these are details of — a relation's own details pass none (a secret is a noun's). */
  const checkProperties = (name: WorldFileName, at: string, props: unknown, owner?: Record<string, unknown>) => {
    if (props === undefined) return;
    if (!Array.isArray(props)) return say(name, at, 'a list of properties', props, `${at} must be a list.`);
    const seen = new Set<string>();
    const siblings = new Map<string, Record<string, unknown>>();
    for (const p of props) if (isObj(p) && nonEmpty(p.name)) siblings.set(p.name, p);
    props.forEach((p, i) => {
      const pat = `${at}[${i}]`;
      if (!isObj(p)) return say(name, pat, 'a property: a name and a kind', p, `${pat} is not a property.`);
      strayKeys(name, pat, p, ['name', 'kind', 'sentence', 'values', 'freeWords', 'secret', 'onlyWhen']);
      if (!nonEmpty(p.name)) say(name, `${pat}.name`, 'a name', p.name, `${pat} has no name.`);
      else if (seen.has(p.name)) say(name, `${pat}.name`, 'a name used once', p.name, `${pat}: "${p.name}" is named twice.`);
      else seen.add(p.name);
      if (p.kind === 'link' || p.kind === 'links') {
        say(name, `${pat}.kind`, `one of ${PROPERTY_KINDS.join(', ')}`, p.kind, `${pat} ("${String(p.name)}") is a ${p.kind}: a link between two things is a relation in ${WORLD_FILES.relations}, with a kind and the person's sentence, not a property.`);
      } else if (!PROPERTY_KINDS.includes(p.kind as never)) {
        say(name, `${pat}.kind`, `one of ${PROPERTY_KINDS.join(', ')}`, p.kind, `${pat} ("${String(p.name)}") has kind ${show(p.kind)}; a property is one of ${PROPERTY_KINDS.join(', ')}.`);
      }
      if (p.kind === 'choice' && !(Array.isArray(p.values) && p.values.length > 0 && p.values.every(nonEmpty))) {
        say(name, `${pat}.values`, 'the list a choice is one of', p.values, `${pat} ("${String(p.name)}") is a choice with no list of values.`);
      }
      if (p.kind !== 'choice' && p.values !== undefined) {
        say(name, `${pat}.values`, 'no values: only a choice has a list', p.values, `${pat} ("${String(p.name)}") is not a choice but has values.`);
      }
      if (p.sentence !== undefined && !nonEmpty(p.sentence)) say(name, `${pat}.sentence`, 'words, or no sentence at all', p.sentence, `${pat} has an empty sentence.`);
      if (p.freeWords !== undefined && p.freeWords !== true) {
        say(name, `${pat}.freeWords`, 'true, or nothing', p.freeWords, `${pat} ("${String(p.name)}"): freeWords is the answer "free words" to whether it is one of a fixed list; it is true or absent.`);
      } else if (p.freeWords === true && p.kind !== 'text') {
        say(name, `${pat}.freeWords`, 'nothing: only a text can be free words', p.kind, `${pat} ("${String(p.name)}") is a ${String(p.kind)}, and only a text is asked whether it is free words or one of a fixed list.`);
      }
      // ONT-011 step 2: a secret detail — the which; the noun's `answers.secret` is the yes.
      if (p.secret !== undefined && p.secret !== true) {
        say(name, `${pat}.secret`, 'true, or nothing', p.secret, `${pat} ("${String(p.name)}"): secret says this detail is not for everyone who can see the record; it is true or absent.`);
      } else if (p.secret === true) {
        if (!owner) say(name, `${pat}.secret`, "nothing: a secret is a noun's detail", p.secret, `${pat} ("${String(p.name)}") is a detail on a link, and only a noun's detail can be secret.`);
        else if (!isObj(owner.answers) || owner.answers.secret !== true)
          say(name, `${pat}.secret`, `answers.secret: true on "${String(owner.id)}" first`, isObj(owner.answers) ? owner.answers.secret : undefined, `${pat} ("${String(p.name)}") is secret, and "${String(owner.id)}" does not answer that any detail on it is: say "answers": { "secret": true } on the noun, then mark which.`);
      }
      // ONT-011 step 2: a detail that matters only in some cases — the case is another detail of the same record.
      if (p.onlyWhen !== undefined) {
        const ow = p.onlyWhen;
        if (!isObj(ow)) return say(name, `${pat}.onlyWhen`, 'an object: { "field": …, "is"?: …, "required"?: true }', ow, `${pat} ("${String(p.name)}"): onlyWhen names the detail this one depends on, as { "field": "closed on" }.`);
        strayKeys(name, `${pat}.onlyWhen`, ow, ['field', 'is', 'required']);
        const other = nonEmpty(ow.field) ? siblings.get(ow.field) : undefined;
        if (!other) say(name, `${pat}.onlyWhen.field`, 'another detail of the same record', ow.field, `${pat} ("${String(p.name)}") matters only when ${show(ow.field)} is set, which is not a detail of the same record.`);
        else if (ow.field === p.name) say(name, `${pat}.onlyWhen.field`, 'another detail, not itself', ow.field, `${pat} ("${String(p.name)}") cannot matter only when it is itself set.`);
        else if (ow.is !== undefined) {
          if (!['string', 'number', 'boolean'].includes(typeof ow.is)) say(name, `${pat}.onlyWhen.is`, 'a word, a number or true/false', ow.is, `${pat} ("${String(p.name)}"): "is" is the value "${String(ow.field)}" holds when this detail matters.`);
          else if (other.kind === 'choice' && !(Array.isArray(other.values) && other.values.includes(ow.is)))
            say(name, `${pat}.onlyWhen.is`, `one of ${(Array.isArray(other.values) ? other.values : []).map((v) => JSON.stringify(v)).join(', ')}`, ow.is, `${pat} ("${String(p.name)}") matters only when "${String(ow.field)}" is ${show(ow.is)}, which is not one of its values.`);
          else if (other.kind === 'yesno' && typeof ow.is !== 'boolean') say(name, `${pat}.onlyWhen.is`, 'true or false', ow.is, `${pat} ("${String(p.name)}"): "${String(ow.field)}" is a yes/no, so "is" is true or false.`);
        }
        if (ow.required !== undefined && ow.required !== true) say(name, `${pat}.onlyWhen.required`, 'true, or nothing', ow.required, `${pat} ("${String(p.name)}"): required says it is never left empty when it matters; it is true or absent.`);
      }
    });
  };

  /** ONT-011 step 2: a noun's answers to its own questions (`NOUN_QUESTIONS`), in the shape each asks for. */
  const checkNounAnswers = (at: string, n: Record<string, unknown>) => {
    if (n.answers === undefined) return;
    const label = `${at} ("${String(n.name ?? n.id)}")`;
    if (!isObj(n.answers)) return say('nouns', `${at}.answers`, 'answers by question id', n.answers, `${label}: answers must be an object of question id to answer.`);
    const names = new Set(((Array.isArray(n.properties) ? n.properties : []) as unknown[]).map((p) => (isObj(p) ? String(p.name) : '')));
    const ids = NOUN_QUESTIONS.map((q) => q.id);
    for (const [qid, value] of Object.entries(n.answers)) {
      const q = NOUN_QUESTIONS.find((x) => x.id === qid);
      if (!q) {
        say('nouns', `${at}.answers.${qid}`, `one of ${ids.join(', ')}`, qid, `${label} answers "${qid}", which a noun is not asked; a noun is asked ${ids.join(', ')}.`);
        continue;
      }
      if (!answerFits(q.answer, value)) {
        say('nouns', `${at}.answers.${qid}`, answerWords(q.answer), value, `${label}: the answer to "${q.ask}" must be ${answerWords(q.answer)}; it is ${show(value)}.`);
        continue;
      }
      if (q.answer.type === 'field') {
        const [name, ...more] = fieldsAnswered(value);
        if (more.length) say('nouns', `${at}.answers.${qid}`, 'one detail', value, `${label} answers "${q.ask}" with ${more.length + 1} details; it takes one.`);
        else if (name === undefined) say('nouns', `${at}.answers.${qid}`, `a detail of "${String(n.id)}"`, value, `${label} answers "${q.ask}" with "nothing": a ${String(n.id)} in a list is called by one of its details.`);
        else if (!names.has(name)) say('nouns', `${at}.answers.${qid}`, `a detail of "${String(n.id)}"`, name, `${label} answers "${q.ask}" with "${name}", which is not a detail of "${String(n.id)}".`);
      }
      if (NUMBER_QUESTIONS.includes(qid) && n.answers.readAloud !== true)
        say('nouns', `${at}.answers.${qid}`, 'nothing: asked only of a noun whose number is read aloud', value, `${label} answers "${q.ask}", and does not say people read its number aloud (answers.readAloud is not true).`);
    }
    // ONT-015: the look is what the store hands out, so one it cannot is refused here, in words.
    if (n.answers.readAloud === true && typeof n.answers.looksLike === 'string') {
      const problem = numberLookProblem(n.answers.looksLike, n.answers.restarts);
      if (problem) say('nouns', `${at}.answers.looksLike`, 'a number the backend can hand out, such as INV-{YYYY}-{####}', n.answers.looksLike, `${label}: ${problem}.`);
    }
    if (n.answers.secret === true && !((Array.isArray(n.properties) ? n.properties : []) as unknown[]).some((p) => isObj(p) && p.secret === true))
      say('nouns', `${at}.answers.secret`, 'a detail marked "secret": true', true, `${label} says a detail on it is not for everyone who can see it, and no detail says which: mark it "secret": true.`);
  };

  const nf = files.nouns;
  if (!isObj(nf) || !Array.isArray(nf.nouns)) {
    say('nouns', 'nouns', 'an object with a list of nouns', isObj(nf) ? nf.nouns : nf, `${WORLD_FILES.nouns} is missing or has no list of nouns.`);
  } else {
    strayKeys('nouns', 'nouns', nf, ['$schema', 'nouns']);
    nf.nouns.forEach((n: unknown, i: number) => {
      const at = `nouns[${i}]`;
      if (!isObj(n)) return say('nouns', at, 'a noun', n, `${at} is not a noun.`);
      strayKeys('nouns', at, n, ['id', 'name', 'sentence', 'properties', 'signsIn', 'answers', 'was']);
      if (typeof n.id !== 'string' || !ID.test(n.id)) say('nouns', `${at}.id`, 'an id: a letter, then letters, digits, - or _', n.id, `${at} has no usable id.`);
      else if (nounIds.has(n.id)) say('nouns', `${at}.id`, 'an id used once', n.id, `${at}: the id "${n.id}" is used twice.`);
      else nounIds.set(n.id, n);
      if (!nonEmpty(n.name)) say('nouns', `${at}.name`, "the person's word for it", n.name, `${at} has no name.`);
      if (!nonEmpty(n.sentence)) {
        say('nouns', `${at}.sentence`, 'the sentence the person said about it', n.sentence, `${at} ("${String(n.name ?? n.id)}") has no sentence: a noun is saved with what the person said it is.`);
      }
      checkProperties('nouns', `${at}.properties`, n.properties, n);
      checkNounAnswers(at, n);
      if (n.signsIn !== undefined && n.signsIn !== true) {
        say('nouns', `${at}.signsIn`, 'true, or nothing', n.signsIn, `${at} ("${String(n.name ?? n.id)}"): signsIn says this noun is who signs in; it is true or absent.`);
      } else if (n.signsIn === true) {
        if (signsIn) say('nouns', `${at}.signsIn`, `nothing: "${signsIn}" already signs in`, n.id, `${at} ("${String(n.name ?? n.id)}") signs in, and so does "${signsIn}": one noun is who signs in. If both can, they are one noun, or one extends the other.`);
        else signsIn = String(n.id);
      }
      if (n.was !== undefined) {
        if (typeof n.was !== 'string' || !ID.test(n.was)) say('nouns', `${at}.was`, 'the id it had: a letter, then letters, digits, - or _', n.was, `${at} ("${String(n.name ?? n.id)}"): was is the id this noun had before it was renamed.`);
        else if (n.was === n.id) say('nouns', `${at}.was`, 'an id other than its own', n.was, `${at} ("${String(n.name ?? n.id)}") says it was "${n.was}", which is what it is: a noun renamed has a new id.`);
        else wasIds.push({ at, was: n.was, id: String(n.id) });
      }
    });
    const seenWas = new Map<string, string>();
    for (const w of wasIds) {
      if (nounIds.has(w.was)) say('nouns', `${w.at}.was`, 'an id no noun has now', w.was, `${w.at} ("${w.id}") says it was "${w.was}", and "${w.was}" is still a noun: a renamed noun is one noun, not two.`);
      else if (seenWas.has(w.was)) say('nouns', `${w.at}.was`, 'an id only one noun was', w.was, `${w.at} ("${w.id}") and "${seenWas.get(w.was)}" both say they were "${w.was}": one noun becomes one noun.`);
      else seenWas.set(w.was, w.id);
    }
  }

  // ── relations.json ─────────────────────────────────────────────────────────
  const rf = files.relations;
  const kindIds = vocabulary.kinds.map((k) => k.id);
  if (!isObj(rf) || !Array.isArray(rf.relations)) {
    say('relations', 'relations', 'an object with a list of relations', isObj(rf) ? rf.relations : rf, `${WORLD_FILES.relations} is missing or has no list of relations.`);
  } else {
    strayKeys('relations', 'relations', rf, ['$schema', 'relations']);
    const relIds = new Set<string>();
    rf.relations.forEach((r: unknown, i: number) => {
      const at = `relations[${i}]`;
      if (!isObj(r)) return say('relations', at, 'a relation', r, `${at} is not a relation.`);
      strayKeys('relations', at, r, ['id', 'from', 'to', 'property', 'kind', 'sentence', 'answers', 'properties', 'through']);
      if (typeof r.id !== 'string' || !ID.test(r.id)) say('relations', `${at}.id`, 'an id: a letter, then letters, digits, - or _', r.id, `${at} has no usable id.`);
      else if (relIds.has(r.id)) say('relations', `${at}.id`, 'an id used once', r.id, `${at}: the id "${r.id}" is used twice.`);
      else relIds.add(r.id);
      if (!nonEmpty(r.sentence)) say('relations', `${at}.sentence`, 'the sentence the person said', r.sentence, `${at} ("${String(r.id)}") has no sentence: a relation is saved with what the person said.`);

      const isNoun = (v: unknown) => typeof v === 'string' && nounIds.has(v);
      if (!isNoun(r.from)) {
        say('relations', `${at}.from`, `a noun in ${WORLD_FILES.nouns}`, r.from, `${at} starts from ${show(r.from)}, which is not a noun in ${WORLD_FILES.nouns}.`);
      }

      const kind = vocabulary.kinds.find((k) => k.id === r.kind);
      if (!kind) {
        say('relations', `${at}.kind`, `one of ${kindIds.join(', ')}`, r.kind, `${at} ("${String(r.id)}") has kind ${show(r.kind)}, which is not in ${vocabulary.id} v${vocabulary.version}; the kinds are ${kindIds.join(', ')}.`);
        return;
      }

      // The target, by the kind's shape.
      const wantTo = (expected: string, ok: boolean) => {
        if (!ok) say('relations', `${at}.to`, expected, r.to, `${at} ("${String(r.id)}") is a ${kind.id}, which points at ${expected}; it has ${show(r.to)}.`);
      };
      switch (kind.target) {
        case 'noun':
          wantTo(`a noun in ${WORLD_FILES.nouns}`, isNoun(r.to));
          break;
        case 'self':
          wantTo(`the noun it starts from ("${String(r.from)}"), or nothing`, r.to === undefined || r.to === r.from);
          break;
        case 'nouns':
          wantTo(`a list of two or more nouns`, Array.isArray(r.to) && r.to.length >= 2 && r.to.every(isNoun));
          break;
        case 'system':
          wantTo('the other system, named in words', nonEmpty(r.to));
          break;
        case 'none':
        case 'property':
          wantTo('nothing', r.to === undefined);
          break;
        case 'noun-or-none':
          wantTo(`a noun in ${WORLD_FILES.nouns}, or nothing`, r.to === undefined || isNoun(r.to));
          break;
      }
      if (kind.target === 'property') {
        const owner = typeof r.from === 'string' ? nounIds.get(r.from) : undefined;
        const prop = owner && Array.isArray(owner.properties) ? (owner.properties as unknown[]).find((p) => isObj(p) && p.name === r.property) : undefined;
        if (!isObj(prop)) {
          say('relations', `${at}.property`, `a property of "${String(r.from)}"`, r.property, `${at} ("${String(r.id)}") is a ${kind.id}, which is about one property of "${String(r.from)}"; ${show(r.property)} is not one.`);
        } else if (prop.kind !== 'choice') {
          say('relations', `${at}.property`, 'a choice property', prop.kind, `${at} ("${String(r.id)}"): "${String(r.property)}" is a ${String(prop.kind)}, and a ${kind.id} is a choice — free text where a list belongs is the mistake this kind exists to prevent.`);
        }
      } else if (r.property !== undefined) {
        say('relations', `${at}.property`, 'no property', r.property, `${at} ("${String(r.id)}") is a ${kind.id}, which is not about a single property.`);
      }

      // The answers: only what the kind asks, in the shape it asks for.
      if (r.answers !== undefined) {
        if (!isObj(r.answers)) {
          say('relations', `${at}.answers`, 'answers by question id', r.answers, `${at} ("${String(r.id)}"): answers must be an object of question id to answer.`);
        } else {
          for (const [qid, value] of Object.entries(r.answers)) {
            const q = kind.questions.find((x) => x.id === qid);
            if (!q) {
              say('relations', `${at}.answers.${qid}`, `one of ${kind.questions.map((x) => x.id).join(', ')}`, qid, `${at} ("${String(r.id)}") answers "${qid}", which a ${kind.id} does not ask; it asks ${kind.questions.map((x) => x.id).join(', ')}.`);
              continue;
            }
            if (!answerFits(q.answer, value)) {
              say('relations', `${at}.answers.${qid}`, answerWords(q.answer), value, `${at} ("${String(r.id)}"): the answer to "${q.ask}" must be ${answerWords(q.answer)}; it is ${show(value)}.`);
              continue;
            }
            if (q.answer.type === 'fields' || q.answer.type === 'field') {
              // Each name is a detail of the noun the relation starts from: a projection reads them back as fields.
              const owner = typeof r.from === 'string' ? nounIds.get(r.from) : undefined;
              const names = new Set(((owner && Array.isArray(owner.properties) ? owner.properties : []) as unknown[]).map((p) => (isObj(p) ? String(p.name) : '')));
              const named = fieldsAnswered(value);
              if (q.answer.type === 'field' && named.length > 1) say('relations', `${at}.answers.${qid}`, 'one detail, or "nothing"', value, `${at} ("${String(r.id)}") answers "${q.ask}" with ${named.length} details; it takes one.`);
              for (const name of named) {
                if (!names.has(name)) say('relations', `${at}.answers.${qid}`, `details of "${String(r.from)}"`, name, `${at} ("${String(r.id)}") answers "${q.ask}" with "${name}", which is not a detail of "${String(r.from)}".`);
              }
            }
            if (q.changesKind && value === q.changesKind.when) {
              say('relations', `${at}.kind`, q.changesKind.to, kind.id, `${at} ("${String(r.id)}") answers ${show(value)} to "${q.ask}" — then it is a ${q.changesKind.to}, not a ${kind.id}.`);
            }
          }
        }
      }

      if (r.properties !== undefined && !kind.carriesDetails) {
        say('relations', `${at}.properties`, 'no details: this kind carries none', r.properties, `${at} ("${String(r.id)}") is a ${kind.id}, which carries no details on the link; a link with details of its own is an is-on.`);
      } else {
        checkProperties('relations', `${at}.properties`, r.properties);
      }
    });

    // "Through what?" (ONT-002): a walk over the nouns, from whoever signs in to the owner.
    const relById = new Map<string, Record<string, unknown>>();
    for (const r of rf.relations as unknown[]) if (isObj(r) && typeof r.id === 'string' && !relById.has(r.id)) relById.set(r.id, r);
    const ends = (r: Record<string, unknown>): { from: string; to: string } | undefined => {
      const kind = vocabulary.kinds.find((k) => k.id === r.kind);
      if (!kind || typeof r.from !== 'string') return undefined;
      if (kind.target === 'self') return { from: r.from, to: r.from };
      if ((kind.target === 'noun' || kind.target === 'noun-or-none') && typeof r.to === 'string' && nounIds.has(r.to)) return { from: r.from, to: r.to };
      return undefined;
    };
    (rf.relations as unknown[]).forEach((r: unknown, i: number) => {
      if (!isObj(r) || r.through === undefined) return;
      const at = `relations[${i}].through`;
      const named = `relations[${i}] ("${String(r.id)}")`;
      if (r.kind !== 'owned-by') return say('relations', at, 'nothing: only an owned-by is asked through what', r.kind, `${named} is a ${String(r.kind)}; "through" answers "through what?", which only an owned-by is asked.`);
      if (!isObj(r.answers) || r.answers.path !== true) return say('relations', at, 'nothing, or answers.path: true', isObj(r.answers) ? r.answers.path : undefined, `${named} has a chain, and does not say it belongs to someone through one (answers.path is not true).`);
      if (!Array.isArray(r.through)) return say('relations', at, 'a list of steps', r.through, `${named}: "through" is a list of steps, each { "relation": … }.`);
      if (!signsIn) return say('relations', at, 'a noun that signsIn first', undefined, `${named}: a chain starts from whoever signs in, and no noun says signsIn.`);
      let noun = signsIn;
      for (let j = 0; j < r.through.length; j++) {
        const step: unknown = r.through[j];
        const sat = `${at}[${j}]`;
        if (!isObj(step)) return say('relations', sat, 'a step { "relation": … }', step, `${named}, step ${j + 1} is not a step.`);
        strayKeys('relations', sat, step, ['relation', 'back', 'where']);
        if (step.back !== undefined && typeof step.back !== 'boolean') return say('relations', `${sat}.back`, 'true, false or nothing', step.back, `${named}, step ${j + 1}: "back" is true or false.`);
        if (step.where !== undefined && (!isObj(step.where) || !Object.keys(step.where).length || !Object.values(step.where).every((v) => ['string', 'number', 'boolean'].includes(typeof v))))
          return say('relations', `${sat}.where`, 'an object of field to a word, number or yes/no', step.where, `${named}, step ${j + 1}: "where" names fields and the value each must have, as { "role": "holder" }.`);
        const via = typeof step.relation === 'string' ? relById.get(step.relation) : undefined;
        if (!via) return say('relations', `${sat}.relation`, 'a relation of this world', step.relation, `${named}, step ${j + 1}: ${show(step.relation)} is not a relation of this world.`);
        if (via === r) return say('relations', `${sat}.relation`, 'another relation', step.relation, `${named}, step ${j + 1}: the chain ends on the ${String(r.to)}, and the last hop, back to the ${String(r.from)}, is this relation itself; it is not said.`);
        const e = ends(via);
        if (!e) return say('relations', `${sat}.relation`, 'a relation between two nouns', step.relation, `${named}, step ${j + 1}: "${String(via.id)}" (${String(via.kind)}) does not join two nouns, so a chain cannot go along it.`);
        if (e.from === e.to) {
          if (noun !== e.from) return say('relations', `${sat}.relation`, `a relation about the ${noun}`, step.relation, `${named}, step ${j + 1}: "${String(via.id)}" joins ${e.from}s to ${e.from}s, and the chain is on the ${noun}.`);
          if (step.back === undefined) return say('relations', `${sat}.back`, 'true or false', undefined, `${named}, step ${j + 1}: "${String(via.id)}" joins ${e.from}s to ${e.from}s; say "back": false (along it) or true (against it).`);
        } else if (noun === e.from && step.back !== true) noun = e.to;
        else if (noun === e.to && step.back !== false) noun = e.from;
        else return say('relations', `${sat}.relation`, `a relation the ${noun} is on, read ${step.back === true ? 'back' : step.back === false ? 'forwards' : 'either way'}`, step.relation, `${named}, step ${j + 1}: "${String(via.id)}" joins the ${e.from} to the ${e.to}, and the chain is on the ${noun}.`);
      }
      if (noun !== r.to)
        say('relations', at, `a chain that ends on the ${String(r.to)}`, noun, `${named}: the chain from the ${signsIn} ends on the ${noun}, and a ${String(r.from)} belongs to the ${String(r.to)} — it must end there.`);
    });
  }

  // ── verbs.json (ONT-006), when there is one — read only over a world the three files describe ──
  if (files.verbs !== undefined && problems.length === 0) {
    problems.push(...validateVerbs(files.verbs, files as never, vocabulary).problems);
  }
  // ── rules.json (ONT-013), when there is one — the same: a rule names the nouns' details by name.
  if (files.rules !== undefined && problems.length === 0) {
    problems.push(...validateRules(files.rules, files as never).problems);
  }

  return { ok: problems.length === 0, problems };
}
