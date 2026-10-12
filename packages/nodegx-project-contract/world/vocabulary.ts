/**
 * P116 ONT-001 — the vocabulary a project pins, and `describe()` for a kind.
 */
import type { AnswerShape, Kind, KindTarget, KindTile } from './kind';
import { WORLD_KINDS } from './kinds';

export const WORLD_VOCABULARY = Object.freeze({ id: 'nodegx-world-kinds', version: 1 });

/** What a validator needs to know about the kinds: their ids, targets and the answers they ask for. */
export interface VocabularyRef {
  id: string;
  version: number;
  kinds: readonly Pick<Kind, 'id' | 'target' | 'carriesDetails' | 'questions'>[];
}

export const WORLD_VOCABULARY_REF: VocabularyRef = Object.freeze({ ...WORLD_VOCABULARY, kinds: WORLD_KINDS });

export function kindById(id: string): Kind | undefined {
  return WORLD_KINDS.find((k) => k.id === id);
}

export interface KindDescription extends KindTile {
  id: string;
  sentence: string;
  /** What it becomes, in words. */
  projectsTo: string;
  distinguishes: string;
  target: KindTarget;
  /** Ranked. */
  questions: { id: string; ask: string; prevents: string; answer: AnswerShape }[];
  /** How much real use it was read from, said plainly when thin. */
  evidence: string;
}

/**
 * A kind as a picker shows it — the counterpart of a node's `describe()`. `label`, `line` and
 * `icon` are the backend manager's tile fields; `sentence` and the questions are its long text.
 */
export function describe(kind: Kind | string): KindDescription {
  const k = typeof kind === 'string' ? kindById(kind) : kind;
  if (!k) throw new Error(`No kind "${kind}" in ${WORLD_VOCABULARY.id} v${WORLD_VOCABULARY.version}.`);
  const sources = k.evidence.sources.length;
  return {
    id: k.id,
    label: k.tile.label,
    line: k.tile.line,
    icon: k.tile.icon,
    sentence: k.sentence,
    projectsTo: k.projectsTo,
    distinguishes: k.distinguishes,
    target: k.target,
    questions: k.questions.map(({ id, ask, prevents, answer }) => ({ id, ask, prevents, answer })),
    evidence:
      `${k.evidence.rows} ${k.evidence.rows === 1 ? 'field' : 'fields'} in ${sources} ${sources === 1 ? 'app' : 'apps'}` +
      (k.evidence.thin ? ` — ${k.evidence.thin}` : '')
  };
}
