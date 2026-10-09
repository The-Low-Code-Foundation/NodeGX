/**
 * P116 ONT-001 — the three files that hold what a person said about their world.
 *
 * They live under the project's `docs/` folder (R1, ruled 2026-10-08: beside the backend
 * schema and the data design, where the MCP already reads and writes), in `docs/world/`.
 * Plain words are first-class: every noun and every relation carries the sentence the person
 * said. The format is a property graph in the plain sense (things, typed links between them,
 * details on the links) and names no engine and no graph framework (R2).
 */
import type { FieldKind } from './kind';

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

export interface WorldFiles {
  nouns: NounsFile;
  relations: RelationsFile;
  vocabulary: VocabularyFile;
}
