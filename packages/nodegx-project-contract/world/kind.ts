/**
 * P116 ONT-001 — what a relation KIND is, declared the way P107 declares a node.
 *
 * A kind is a shape that keeps recurring when a person says how two things in their world
 * relate: "a member is on an account", "a booking belongs to one slot". ONT-000 read the
 * fourteen kinds off eight real apps (`dev-docs/tasks/phase-116-…/KINDS.md`); nothing here
 * was invented ahead of a row.
 *
 * A declaration carries three things a stranger who read `defineNode` will recognise:
 *
 * - **`questions`** — DATA, ranked, each with the incident it prevents and the shape of its
 *   answer. ONT-002's runner reads them by field; a question written only in a docblock is
 *   a hazard nobody is guarded against.
 * - **`projection`** — a pure function from the answers to the fields the kind becomes, in
 *   the backend manager's eleven field kinds. It names no engine: ONT-003 maps it onto the
 *   backend contract and grades it on two adapters.
 * - **`mutants`** — the mistakes this kind gets made as, seeded from Richard's list and the
 *   census. ONT-005 makes each one executable.
 *
 * Nothing in this folder may name a database engine or a graph framework (ONT-001 AC2, R2):
 * the format is plain JSON with its own schema, and every engine is a projection target.
 */

/** P104 BMG-003's eleven field kinds, by id — the words a person picks a field by. */
export type FieldKind =
  | 'text'
  | 'number'
  | 'yesno'
  | 'date'
  | 'choice'
  | 'link'
  | 'links'
  | 'file'
  | 'location'
  | 'list'
  | 'anything';

/** What a relation of this kind points at. */
export type KindTarget =
  /** another noun, by id */
  | 'noun'
  /** the same noun it starts from (a tree, a duplicate) */
  | 'self'
  /** any of several nouns, named in a list */
  | 'nouns'
  /** a property of the noun itself (a fixed list on one field) */
  | 'property'
  /** another system, named in words */
  | 'system'
  /** nothing: a thing that can end */
  | 'none'
  /** optionally another noun: what happened to a person may also be about a session */
  | 'noun-or-none';

/** The shape of one answer. */
export type AnswerShape =
  | { type: 'yes-no' }
  | { type: 'one-of'; values: readonly string[] }
  | { type: 'words' }
  /** P116 ONT-011 step 2: names of the {from}'s own details, comma-separated, or "nothing" — what a projection can read back as fields. */
  | { type: 'fields' }
  /** P116 ONT-011 step 2: one of the {from}'s own details by name, or "nothing" where the question allows it. */
  | { type: 'field' };

export interface Question {
  /** The answer's key in `relations.json` → `answers`. */
  id: string;
  /** The question, asked of the person, with `{from}` and `{to}` standing for their nouns. */
  ask: string;
  /** The incident it prevents, in the words of whoever lived it. */
  prevents: string;
  answer: AnswerShape;
  /**
   * When this answer means the relation was another kind all along: the answer that says so
   * and the kind it is. ("Could it ever be several at once?" → yes → `is-on`.)
   */
  changesKind?: { when: string | boolean; to: string };
  /** Where the question came from: the census line, a note, or one of Richard's rows. */
  from: 'census' | 'note' | 'oral';
}

/**
 * How a mistake is made, so ONT-005 can make it and grade it. A world-level shape re-says the
 * relation wrongly and projects that (the validator still gates it); a schema-level shape
 * re-types the projected schema and keeps everything else, the way `applyMutant` does.
 */
export type MutantShape =
  /** World: the same relation with this question left unanswered — the kind's default is the mistake. */
  | { unanswered: string }
  /** World: the relation made as a neighbouring kind (the wrong tile), with these answers and no details on the link. */
  | { asKind: string; answers?: Readonly<Record<string, string | boolean>> }
  /** World: the relation never said. */
  | { unsaid: true }
  /** World, `extends` only: the far record folded into the near one — its fields put on the {to}; the {from} and the relation gone. */
  | { foldedIn: true }
  /** Schema: every link the relation made kept as a text field holding the other record's id; required, rules, all else kept. */
  | { asText: true }
  /** Schema: the property the relation is about, typed as this tile instead (free text where a list belongs). */
  | { property: FieldKind }
  /** Schema: one of the kind's fields, or one of its rules (by its hold's key), taken out; everything else kept. */
  | { without: { field: string } | { rule: string } }
  /** The mistake is the kind itself: the answer that changes the kind was never asked. Killed by the question, before any projection. */
  | { changesKind: true };

export interface MutantSeed {
  id: string;
  /** The mistake, as it was made. */
  mistake: string;
  /** Why it is a mistake of THIS kind. */
  why: string;
  /** `task`: ONT-005 §3.1's list, read from the corpus and Richard's rows at scoping. */
  from: 'census' | 'note' | 'oral' | 'task';
  /** The question whose answer kills it (an id of this kind's), or `the kind` when only picking the kind would. */
  kills: string;
  shape: MutantShape;
}

/**
 * One field a relation becomes, in the eleven kinds. `on` says which record carries it. A
 * `link` with no `points` names whoever was signed in (the app's users), not a noun.
 */
export interface ProjectedField {
  on: 'from' | 'to' | 'own';
  name: string;
  kind: FieldKind;
  /** For `link` and `links`: the noun it points at. */
  points?: string;
  required?: boolean;
  unique?: boolean;
  /** For a `link`: what happens when the record it points at goes. */
  whenTargetGoes?: 'goes-too' | 'stays-unlinked' | 'blocks';
  /** For a `choice` the kind makes itself (not a property the person listed): its list. */
  values?: readonly string[];
}

/**
 * What a rule asks of the records, in a shape ONT-003 can hand to a store or say plainly that
 * it cannot. Field names are the projected fields' `name`s, on the record the rule is `on`.
 */
/**
 * For a hold with an `unless`: the values of a row the rule binds (`heldOn`, outside `unless`) and
 * of one it frees (`freeOn`, inside it), so the claim that grades it can make each without
 * evaluating the condition itself. Field names as projected.
 */
export type RowHint = Readonly<Record<string, string | number | boolean>>;

export type RuleHold =
  /** No two records share these values; with `whileEmpty`, only among those where that field is empty (still running). */
  | { unique: readonly string[]; whileEmpty?: string }
  /** A `links` field holds a pair once, however often it is made. */
  | { pairOnce: string }
  /** A pair the person said can be made twice, on a `links` field. */
  | { pairTwice: string }
  /** Written when the record is made, never changed after. */
  | { setOnce: string }
  /** A record of it is never changed once made. */
  | { neverEdited: true }
  /** A record of it is never deleted; with `unless`, only while the old record matches (a draft may go). */
  | { neverDeleted: true; unless?: Readonly<Record<string, unknown>>; heldOn?: RowHint; freeOn?: RowHint }
  /**
   * P116 ONT-011 step 2 / ONT-014 §3.3: these fields (`'*'` = every field but `except`) do not
   * change, `unless` a condition on the OLD record holds. `security.json` `onlyWhile.update.frozen`.
   */
  | { frozen: readonly string[] | '*'; unless?: Readonly<Record<string, unknown>>; except?: readonly string[]; heldOn?: RowHint; freeOn?: RowHint }
  /**
   * P116 ONT-011 step 2 / ONT-014 §3.3: a value's allowed moves, per old value (`to: []` = none;
   * an old value not named moves freely). `security.json` `onlyWhile.update.moves`, with no `by`:
   * a world cannot name a role.
   */
  | { moves: string; from: Readonly<Record<string, { to: readonly string[] }>> }
  /**
   * P116 ONT-011 step 2, *only sometimes*: `onlyWhen` matters only when `when` is set (or holds
   * `is`); `required`: never empty then. Held as an all-or-none check when `required` and no
   * `is` (both set or both empty); otherwise said in words.
   */
  | { onlyWhen: string; when: string; is?: string | number | boolean; required?: boolean }
  /**
   * P116 ONT-011 step 2, *read aloud*: a number the store hands out in a format, going up by one,
   * never reused — ONT-015's series. Until it is built: a text field, unique and set once (held),
   * and the rest said in words.
   */
  | { series: string; looksLike?: string; maySkip?: boolean; restarts?: 'never' | 'each year' | 'each month' }
  /** P116 ONT-011 step 2, *only one*: at most one record of it. Across records: no engine behind the contract keeps it yet (ONT-013 step 4). */
  | { onlyOne: true }
  /** P116 ONT-011 step 2, *secret details*: this field is not for everyone who can see the record. Step 4 projects it to a per-field read rule (R-a). */
  | { secret: string }
  /** P116 ONT-011 step 2, *who changed what*: a history record per change, written on every save — a verb's or a trigger's, not the store's. */
  | { history: true }
  /** Following this link never leads back to the record it starts from. */
  | { notUnderItself: string }
  /** Only the record this link names may see and change it; `path` when that is through a chain. */
  | { onlyThrough: string; path?: boolean }
  /** Every exchange with the other system is kept, and a skipped one says why. */
  | { logged: string }
  /** A retired value of this choice stays on the records holding it and is no longer offered. */
  | { retiredStays: string }
  /** A fact about the shape, not something a store is asked to keep. */
  | { shape: true };

export interface ProjectedRule {
  /** `from`: the record the relation starts from (a noun's own rule: the noun); `own`: the relation's own record. */
  on: 'from' | 'own';
  /** The rule in words, as the person would read it back. */
  says: string;
  holds: RuleHold;
}

export interface Projection {
  /** A record of its own the relation becomes (`is-on`, `happened-to`), named after the relation. */
  ownRecord?: boolean;
  fields: ProjectedField[];
  /** Rules that are not a field: "nobody may delete", "one pair once". */
  rules: ProjectedRule[];
}

/** What the projection is handed: the relation's ends and the person's answers. */
export interface ProjectionInput {
  id: string;
  from: string;
  to?: string | readonly string[];
  property?: string;
  answers: Readonly<Record<string, string | boolean>>;
}

export interface Evidence {
  /** Rows of real apps classified as this kind (ONT-000). */
  rows: number;
  /** The sources they came from, by census id. */
  sources: readonly string[];
  /** Said plainly when the kind rests on one source or one row. */
  thin?: string;
}

export interface KindTile {
  /** The tile's name in a picker. */
  label: string;
  /** One line under it. */
  line: string;
  /** A text glyph, so it paints from the tokens like the backend manager's tiles. */
  icon: string;
}

export interface KindDecl {
  id: string;
  version: number;
  /** Where the kind was read from: the census file. */
  source: string;
  /** The person's sentence, with `{from}`, `{to}` and `{field}` standing for their words. */
  sentence: string;
  /** What tells it from its neighbours. */
  distinguishes: string;
  /** What it becomes, in words. */
  projectsTo: string;
  target: KindTarget;
  /** Whether the link itself may carry details (a role, a start date). */
  carriesDetails: boolean;
  tile: KindTile;
  /** Ranked: the first is asked first. */
  questions: readonly Question[];
  projection: (input: ProjectionInput) => Projection;
  mutants: readonly MutantSeed[];
  evidence: Evidence;
}

export type Kind = Readonly<KindDecl>;

/**
 * Declares a relation kind. One literal, unlike `defineNode`'s two calls: a kind has no
 * reducers whose parameters need the declaration's types fixed first.
 *
 * It refuses, at load, the things a declaration can get wrong that no type catches:
 * a question id used twice (an answer would mean two things), a `changesKind` whose
 * answer is not one the question can be given, and a mutant killed by, or shaped on, a
 * question the kind does not ask (ONT-005).
 */
export function defineKind(decl: KindDecl): Kind {
  const seen = new Set<string>();
  for (const q of decl.questions) {
    if (seen.has(q.id)) throw new Error(`Kind "${decl.id}" asks "${q.id}" twice.`);
    seen.add(q.id);
    if (q.changesKind) {
      const when = q.changesKind.when;
      const fits =
        q.answer.type === 'yes-no' ? typeof when === 'boolean' : q.answer.type === 'one-of' ? q.answer.values.includes(String(when)) : false;
      if (!fits) throw new Error(`Kind "${decl.id}", question "${q.id}": changesKind.when ${JSON.stringify(when)} is not an answer it can be given.`);
    }
  }
  const ids = new Set(decl.questions.map((q) => q.id));
  for (const m of decl.mutants) {
    if (m.kills !== 'the kind' && !ids.has(m.kills)) throw new Error(`Kind "${decl.id}", mutant "${m.id}": killed by "${m.kills}", which the kind does not ask.`);
    const s = m.shape;
    if ('unanswered' in s && !ids.has(s.unanswered)) throw new Error(`Kind "${decl.id}", mutant "${m.id}": leaves "${s.unanswered}" unanswered, which the kind does not ask.`);
    if ('changesKind' in s && !decl.questions.some((q) => q.id === m.kills && q.changesKind))
      throw new Error(`Kind "${decl.id}", mutant "${m.id}": is a change of kind, but "${m.kills}" changes no kind.`);
  }
  return Object.freeze({ ...decl, questions: Object.freeze([...decl.questions]), mutants: Object.freeze([...decl.mutants]) });
}
