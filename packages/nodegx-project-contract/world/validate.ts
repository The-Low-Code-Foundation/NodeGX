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
  return 'the person\'s words';
}

/**
 * Validates the three files, already parsed. A file that is missing is passed as `undefined`
 * and refused by name. `vocabulary` defaults to the one this package defines; a reader that
 * knows other versions passes its own.
 */
export function validateWorld(
  files: Partial<Record<WorldFileName, unknown>>,
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
  const checkProperties = (name: WorldFileName, at: string, props: unknown) => {
    if (props === undefined) return;
    if (!Array.isArray(props)) return say(name, at, 'a list of properties', props, `${at} must be a list.`);
    const seen = new Set<string>();
    props.forEach((p, i) => {
      const pat = `${at}[${i}]`;
      if (!isObj(p)) return say(name, pat, 'a property: a name and a kind', p, `${pat} is not a property.`);
      strayKeys(name, pat, p, ['name', 'kind', 'sentence', 'values']);
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
    });
  };

  const nf = files.nouns;
  if (!isObj(nf) || !Array.isArray(nf.nouns)) {
    say('nouns', 'nouns', 'an object with a list of nouns', isObj(nf) ? nf.nouns : nf, `${WORLD_FILES.nouns} is missing or has no list of nouns.`);
  } else {
    strayKeys('nouns', 'nouns', nf, ['$schema', 'nouns']);
    nf.nouns.forEach((n: unknown, i: number) => {
      const at = `nouns[${i}]`;
      if (!isObj(n)) return say('nouns', at, 'a noun', n, `${at} is not a noun.`);
      strayKeys('nouns', at, n, ['id', 'name', 'sentence', 'properties']);
      if (typeof n.id !== 'string' || !ID.test(n.id)) say('nouns', `${at}.id`, 'an id: a letter, then letters, digits, - or _', n.id, `${at} has no usable id.`);
      else if (nounIds.has(n.id)) say('nouns', `${at}.id`, 'an id used once', n.id, `${at}: the id "${n.id}" is used twice.`);
      else nounIds.set(n.id, n);
      if (!nonEmpty(n.name)) say('nouns', `${at}.name`, "the person's word for it", n.name, `${at} has no name.`);
      if (!nonEmpty(n.sentence)) {
        say('nouns', `${at}.sentence`, 'the sentence the person said about it', n.sentence, `${at} ("${String(n.name ?? n.id)}") has no sentence: a noun is saved with what the person said it is.`);
      }
      checkProperties('nouns', `${at}.properties`, n.properties);
    });
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
      strayKeys('relations', at, r, ['id', 'from', 'to', 'property', 'kind', 'sentence', 'answers', 'properties']);
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
  }

  return { ok: problems.length === 0, problems };
}
