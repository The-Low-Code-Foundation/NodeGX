/**
 * P116 ONT-001 — the three files that hold what a person said about their world.
 *
 * They live under the project's `docs/` folder (R1, ruled 2026-10-08: beside the backend
 * schema and the data design, where the MCP already reads and writes), in `docs/world/`.
 * Plain words are first-class: every noun and every relation carries the sentence the person
 * said. The format is a property graph in the plain sense (things, typed links between them,
 * details on the links) and names no engine and no graph framework (R2).
 */
import type { FieldKind, RuleHold } from './kind';

/** Project-relative, forward-slashed. */
export const WORLD_DIR = 'docs/world';
export const WORLD_FILES = {
  nouns: `${WORLD_DIR}/nouns.json`,
  relations: `${WORLD_DIR}/relations.json`,
  vocabulary: `${WORLD_DIR}/vocabulary.json`
} as const;
export type WorldFileName = keyof typeof WORLD_FILES;

export const WORLD_SCHEMA_ID = 'https://opennoodl.dev/schemas/world-v1.json';

/**
 * The kinds a noun's property may be: P104's eleven less `link` and `links`. A link between
 * two things is a relation in `relations.json`, with a kind and the person's sentence — that is
 * what makes the missing junction table impossible by construction (R2). The validator says so
 * in words when a property tries to be one.
 */
export const PROPERTY_KINDS: readonly FieldKind[] = ['text', 'number', 'yesno', 'date', 'choice', 'file', 'location', 'list', 'anything'];

export interface WorldProperty {
  name: string;
  kind: FieldKind;
  /** What the person said about it. Optional on a property; required on a noun and a relation. */
  sentence?: string;
  /** For a `choice`: the list. */
  values?: string[];
  /**
   * For a `text` only: the person was asked whether it is one of a fixed list, and said it is
   * free words (ONT-002's kind-picker question; the answer's home, so it is asked once).
   */
  freeWords?: true;
  /**
   * P116 ONT-011 step 2, *secret details*: this detail is not for everyone who can see the
   * record (a verifier on a profile anyone may read; a token every admin can list). The noun's
   * `answers.secret` is the yes; this is the which — as `path: true` and `through` are. Step 4
   * projects it to a per-field read rule (R-a); until then the projection says it is not kept.
   */
  secret?: true;
  /**
   * P116 ONT-011 step 2, *only sometimes*: this detail matters only when another detail of the
   * same record is set (`field`), or holds one value (`is`) — a closing note beside the day a
   * task closed; four details of a project's next move beside the move. `required`: it is never
   * left empty when it matters. With `required` and no `is`, the store keeps it (the two are
   * both set or both empty); otherwise the projection says it in words.
   */
  onlyWhen?: OnlyWhen;
}

/** P116 ONT-011 step 2 — the case a detail matters in: another detail of the same record set, or holding `is`. */
export interface OnlyWhen {
  /** A property of the same noun or relation record. */
  field: string;
  /** The value `field` holds when this one matters; absent: whenever `field` is set. */
  is?: string | number | boolean;
  /** Never empty when it matters. */
  required?: true;
}

export interface Noun {
  /** Stable id, used by relations. */
  id: string;
  /** The person's word for it. */
  name: string;
  /** What the person said it is. */
  sentence: string;
  properties?: WorldProperty[];
  /**
   * This noun is who signs in: a person with a login. At most one noun says so. It projects to a
   * link to the app's users on the noun's collection, which a permission rule starts from
   * (ONT-004 `worldRule`); the runner asks which noun it is when a rule needs it (ONT-002).
   */
  signsIn?: true;
  /**
   * P116 ONT-011 step 2, *facts about a thing*: the person's answers to the noun's own questions
   * (`NOUN_QUESTIONS` in `noun.ts`), by question id — is there only one, what one is called in a
   * list, whether to keep who changed what, whether people read its number aloud (and then what
   * it looks like, whether it may skip, when it starts again), and whether any detail on it is
   * secret. Facts, not relations: the kinds in `relations.json` join two things; these are about
   * one. The runner asks each once, for every noun at a time, and each has a projection.
   */
  answers?: Record<string, string | boolean>;
  /**
   * The id this noun had before the person called it something else (P116 ONT-007). A rename is
   * a diff the migration carries the records through, never a noun removed and another added;
   * without this key the two cannot be told apart. Read only by `diffWorld`/`planMigration`
   * against the world before; a `was` that world does not have is history, and changes nothing.
   */
  was?: string;
}

export interface Relation {
  id: string;
  /** A noun id. */
  from: string;
  /**
   * What it points at, by the kind's `target`: a noun id (`noun`, `self`, optionally
   * `noun-or-none`), a list of noun ids (`nouns`), the other system in words (`system`);
   * absent for `none` and `property`.
   */
  to?: string | string[];
  /** For a `property` kind (`one-of`): the property of `from` it is about. */
  property?: string;
  /** A kind id from the pinned vocabulary. */
  kind: string;
  /** What the person said. */
  sentence: string;
  /** The person's answers to the kind's questions, by question id. */
  answers?: Record<string, string | boolean>;
  /** Details on the link itself; only a kind that `carriesDetails` may have them. */
  properties?: WorldProperty[];
  /**
   * The answer to "through what?" (ONT-002, ONT-004's second question), asked of an `owned-by`
   * answered `path: true` once a noun `signsIn`: the relations from the noun that signs in to the
   * owner (`to`), in order. The last hop, from the owner back to `from`, is this relation, so it is
   * not said. Validated as a walk over the nouns (it must start at whoever signs in and end on the
   * owner); `ownerRule()` compiles it with the login into the permission rule, so the chain is a
   * guard, not a sentence a developer reads. A list of steps where `answers` holds one value, so
   * it has its own key, as `signsIn` has.
   */
  through?: ThroughStep[];
}

/** One step of a `through` chain: along a relation, forwards (from → to) unless `back`. */
export interface ThroughStep {
  /** A relation id of this world. */
  relation: string;
  /** Read it from its `to` end to its `from` end. Inferred when the two ends differ; required when they are the same noun. */
  back?: boolean;
  /** Which of the records it lands on, in the storage wire's spelling — for a record of its own, the record: "as holder" is `{ "role": "holder" }`. */
  where?: Record<string, string | number | boolean>;
}

export interface NounsFile {
  $schema?: string;
  nouns: Noun[];
}
export interface RelationsFile {
  $schema?: string;
  relations: Relation[];
}
export interface VocabularyFile {
  $schema?: string;
  /** The vocabulary the kinds come from. */
  vocabulary: string;
  /** Its version: a project pinned to a version this reader does not know is refused, not guessed at. */
  version: number;
}

/**
 * P116 ONT-006 — the fourth file, optional: the things the person does over their world, each a
 * sentence with its steps and its failure arms named. A world without it is a world nobody has
 * said a verb about yet.
 */
export const VERBS_FILE = `${WORLD_DIR}/verbs.json`;

/** What a step does: here (`make`, `update`, `end`, `remove`, `keep`) or in another system (`ask`). */
export type VerbDoes = 'make' | 'update' | 'end' | 'remove' | 'keep' | 'ask';

/** What happens when a step cannot be done, in the two shapes the corpus has: record it and go on, or stop. */
export type VerbArmThen = 'record-and-go-on' | 'stop';

export interface VerbArm {
  id: string;
  /** When this arm is taken, in the person's words: "they have no account there yet". */
  when: string;
  then: VerbArmThen;
  /** What the person sees when it is taken. */
  sees: string;
  /** `record-and-go-on`: the steps not done because of it — the ones right after this step. */
  skips?: string[];
  /** The question of a relation's kind this arm answers (the enrolment note answers `exists-elsewhere`'s `hereFirst`). */
  answers?: { relation: string; question: string };
}

export interface VerbStep {
  id: string;
  /** The step in the person's words: "create or update the person here". */
  says: string;
  does: VerbDoes;
  /** The noun, or the relation that is a record of its own, the step is about. Required but for an `ask`. */
  on?: string;
  /** `update`: the properties it writes. */
  fields?: string[];
  /** `end`: the date that marks the end, when the kind does not say (an `ends` noun has `endedAt`; an `is-on` with dates has `until`). */
  by?: string;
  /** `ask`: the other system, in the words an `exists-elsewhere` relation names it. */
  system?: string;
  /** The specced node that does it, when not the one `does` implies. */
  node?: string;
  /** The engine step kind it projects to, when not the one `does` implies. */
  kind?: string;
  /** Its failure arm: one per step; a second kind of failure is a second step. */
  fails?: VerbArm[];
}

export interface Verb {
  id: string;
  /** The person's name for it: "Enrol a member". */
  name: string;
  /** The whole sentence, failures included. */
  sentence: string;
  /** What sets it off, in words. */
  when?: string;
  /** Where it runs: in the backend's engine, or in the app. */
  runs: 'server' | 'app';
  /** What it touches, by id; the validator checks the names. */
  about?: { nouns?: string[]; relations?: string[] };
  steps: VerbStep[];
}

export interface VerbsFile {
  $schema?: string;
  verbs: Verb[];
}

/**
 * P116 ONT-013 — the fifth file, optional: a rule the person said that no kind's question
 * produced ("once an invoice is issued, its amount never changes"). The kinds are the templates;
 * this is the freedom to invent (R-d), gated by honesty, not by the catalogue: a rule's `holds` is
 * one of the shapes the store keeps or says plainly it cannot (`RuleHold`, the whole atom set), it
 * carries the mistake it prevents as its mutant, and it is held on every engine or shown as *not
 * kept*, in that word, never as a law (R-e). A sentence that fits no shape is not written: the
 * validator says which shapes exist, and the agent asks the person a narrower question.
 */
export const RULES_FILE = `${WORLD_DIR}/rules.json`;

/** Where a rule came from, as a question's (ONT-000's rule): "Claude" is not a source. */
export const RULE_FROM = Object.freeze(['oral', 'note', 'census'] as const);
export type RuleFrom = (typeof RULE_FROM)[number];

export interface WorldRule {
  id: string;
  /** The noun, or the relation that is a record of its own, whose records the rule is about. */
  on: string;
  /** The person's sentence: read back to them, shown in the view, carried by the refusal (R-f). */
  says: string;
  /** What the store is asked to keep, in one of the shapes of `kind.ts` `RuleHold`; fields by the person's names. */
  holds: RuleHold;
  /** The mistake, in words: what happens without the rule. ONT-005 grades it like a kind's. */
  mutant: string;
  from: RuleFrom;
}

export interface RulesFile {
  $schema?: string;
  rules: WorldRule[];
}

export interface WorldFiles {
  nouns: NounsFile;
  relations: RelationsFile;
  vocabulary: VocabularyFile;
  /** ONT-006; absent when nobody has said a verb. */
  verbs?: VerbsFile;
  /** ONT-013; absent when every rule came from a kind's question. */
  rules?: RulesFile;
}
