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
  | { type: 'words' };

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

export interface MutantSeed {
  id: string;
  /** The mistake, as it was made. */
  mistake: string;
  /** Why it is a mistake of THIS kind. */
  why: string;
  from: 'census' | 'note' | 'oral';
}

/** One field a relation becomes, in the eleven kinds. `on` says which record carries it. */
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
}

export interface Projection {
  /** A record of its own the relation becomes (`is-on`, `happened-to`), named after the relation. */
  ownRecord?: boolean;
  fields: ProjectedField[];
  /** Rules that are not a field: "nobody may delete", "one pair once". In words. */
  rules: string[];
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
 * It refuses, at load, the two things a declaration can get wrong that no type catches:
 * a question id used twice (an answer would mean two things) and a `changesKind` whose
 * answer is not one the question can be given.
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
  return Object.freeze({ ...decl, questions: Object.freeze([...decl.questions]), mutants: Object.freeze([...decl.mutants]) });
}
