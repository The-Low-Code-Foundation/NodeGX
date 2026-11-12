/**
 * P128 S2 (CCN-010) — what NodeGX Studio edits, and the note a write carries when it places something Studio does not.
 *
 * The audit (`dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md` §1.3) measured the cost of the agent not knowing:
 * Muddy Paws Shelter's language switch became a `States` node in `/Components/Wording` and a `/Components/T` logic
 * component per text, and Studio drew the headline's value as a chip that opened nothing. S1 put the canon in
 * `get_project_info` (`surfaces`) and no agent fetched it (`s1/RESULTS.md`, AC3 0 of 2). This is the push at the moment
 * of the write: while Studio is open for the project, a write that places a node Studio does not edit says so in its
 * result, `notDrawnInStudio`, with the canon's rule 4 and its offer sentence. **Never a refusal** (canon rule 4: "Never
 * refuse to build it"; ruled by Richard, audit §10.3).
 *
 * **The lists are Studio's own** (P128 S6, STU-084): `nodegx-studio/editor/vocabulary.json`, which studio.html reads,
 * pinned here as `studioVocabulary.ts` by `scripts/pin-studio-vocabulary.mjs`; `tests/p128StudioVocabulary.test.ts`
 * fails when the pin drifts from Studio's file. What they say, as S2 first read it from `studio.html` at `668212a`:
 * - **elements**: `isVisualType` (1468) — a Visual-category type, `Group`/`Text`/`Page`/`For Each`/`Component
 *   Children`, any `net.noodl.controls.*` / `net.noodl.visual.*`, and a component instance that draws;
 * - **steps**: `ACTIONS` (4468), minus `JavaScriptFunction`, whose script Studio shows one line of and never edits
 *   (3821); three of its rows are display names (`Send Event`, `Navigate To Path`, `Show Popup`), so the types they
 *   mean are listed beside them;
 * - **value sources and helpers**: `isHelperNode` (3488) and `valueSources` (2984) — a custom state
 *   (`metadata.customState`), an Expression its composer or a rule made (`metadata.composedFor` / `metadata.rule`),
 *   page data (`metadata.pageData*`), and an option set instance (`/Option sets/…`);
 * - **an option set's insides**: its `Static Data` and `Component Outputs` (5433–5441);
 * - **a component's interface**: `Component Inputs` / `Component Outputs`, which Studio reads as the instance's ports.
 *
 * Everything else a browser component holds is a part Studio does not edit: Studio shows the value it produces as a
 * chip naming it (`sourceChip`, 2975–2982) or not at all. That is the list `surfaces.ts`'s lead names (a `States`
 * node, a Function or Script, an Expression Studio's composer did not make, a logic component placed on a page) and
 * the rest of the logic catalogue with it — a `Variable` or a Query Records the agent wrote carries none of the
 * metadata Studio's own make, so Studio lists it under "Logic on this page" and edits nothing of it.
 *
 * Two deliberate limits:
 * - **Only the nodes this write introduces** (a new id, or an id whose type changed). The note is a push at the moment
 *   of the write, and one that repeats every node on every later write of the same component is one the agent learns
 *   to skip.
 * - **Cloud components are not judged.** A cloud function is drawn whole, read only, on Workflow → On the backend
 *   (BKO-004); its nodes are not on a page the person edits, and every function write would carry the note.
 */

import type { ComponentFiles } from '../graph';
import { CANON_OFFER, canonRule } from '../surfaces';
import type { VisualTypePredicate } from '../visualRoots';
import { STUDIO_VOCABULARY as V } from './studioVocabulary';

/** Types Studio draws as elements whatever the catalog says (`vocabulary.json` `elements`). */
const ELEMENT_TYPES: ReadonlySet<string> = new Set<string>(V.elements.types);
const ELEMENT_PREFIXES: readonly string[] = V.elements.prefixes;

/**
 * Studio's workflow steps (its action menu, `vocabulary.json` `steps.menu`), as type names: each row's type and, for the
 * three rows Studio names by display name (`Send Event`…), the type it places (`steps.aliases`). `@refresh` is Studio's
 * own, not a node; `JavaScriptFunction` (`steps.notEdited`) is in the menu ("Run JavaScript") and left out here: Studio
 * places it and never edits its script.
 */
const ALIASES: Record<string, string> = Object.fromEntries(Object.entries(V.steps.aliases).filter(([k]) => !k.startsWith('$')));
const NOT_EDITED: readonly string[] = V.steps.notEdited;
export const STUDIO_STEP_TYPES: readonly string[] = V.steps.menu
  .map(([type]) => type as string)
  .filter((type) => !type.startsWith('@') && !NOT_EDITED.includes(type))
  .flatMap((type) => (ALIASES[type] ? [type, ALIASES[type]] : [type]));
const STEP_TYPES: ReadonlySet<string> = new Set(STUDIO_STEP_TYPES);

/** A component's interface: Studio reads these as the instance's ports. */
const INTERFACE_TYPES: ReadonlySet<string> = new Set<string>(V.interface.types);

const OPTION_SETS = `/${V.optionSet.prefix}`;
const OPTION_SET_INSIDES: ReadonlySet<string> = new Set<string>(V.optionSet.insides);

/** One node a write placed that Studio does not edit. */
export interface NotDrawnInStudio {
  /** On `apply_plan`'s result only, where one result covers several components. */
  component?: string;
  node: string;
  type: string;
  label?: string;
}

type AnyNode = { id: string; type: string; label?: string; metadata?: Record<string, unknown> };

/** Does Studio edit this node where it sits (`inComponent`, a legacy name)? */
export function studioEdits(node: AnyNode, inComponent: string, isVisual: VisualTypePredicate): boolean {
  const { type } = node;
  if (type.startsWith(OPTION_SETS)) return true;
  if (ELEMENT_TYPES.has(type) || ELEMENT_PREFIXES.some((p) => type.startsWith(p))) return true;
  // a component instance that draws, or a Visual-category type (kit types included: the catalog carries the overlay)
  if (isVisual(type)) return true;
  if (STEP_TYPES.has(type) || INTERFACE_TYPES.has(type)) return true;
  if (inComponent.startsWith(OPTION_SETS) && OPTION_SET_INSIDES.has(type)) return true;
  // the value sources Studio chips (`sources.kinds`): by a type prefix, or by a metadata key (with a type when named)
  const m = node.metadata ?? {};
  for (const k of V.sources.kinds as readonly { typePrefix?: string; type?: string; metadata?: readonly string[] }[]) {
    if (k.typePrefix && type.startsWith(k.typePrefix)) return true;
    if (k.type && type !== k.type) continue;
    if ((k.metadata ?? []).some((key) => m[key])) return true;
  }
  return false;
}

/**
 * The nodes of `candidate` (the component `legacyName` as this write leaves it) that Studio does not edit and that
 * `baseline` (the component before the write, absent on a create) did not already hold with the same type.
 * `resolves` says whether a `/…` type names a component the project has (or the same write makes): an instance of one
 * it does not is the validator's to report, not a part Studio fails to draw.
 */
export function notDrawnInStudio(
  legacyName: string,
  candidate: ComponentFiles,
  baseline: ComponentFiles | undefined,
  isVisual: VisualTypePredicate,
  resolves: (legacyName: string) => boolean
): NotDrawnInStudio[] {
  if (legacyName.startsWith('/#__cloud__/')) return [];
  const before = new Map((baseline?.nodes.nodes ?? []).map((n) => [n.id, n.type]));
  const out: NotDrawnInStudio[] = [];
  for (const node of (candidate.nodes.nodes ?? []) as AnyNode[]) {
    if (before.get(node.id) === node.type) continue;
    if (node.type.startsWith('/') && !resolves(node.type)) continue;
    if (studioEdits(node, legacyName, isVisual)) continue;
    out.push({ node: node.id, type: node.type, ...(node.label ? { label: node.label } : {}) });
  }
  return out;
}

/**
 * The note beside `notDrawnInStudio`. The lead is this server's; the rule and the offer are `docs/CANON.md`, quoted
 * through the pinned copy (`surfaces.ts`), never reworded here.
 */
export function studioNote(count: number): string {
  const them = count === 1 ? 'this node' : `these ${count} nodes`;
  return (
    `The person is watching this app in NodeGX Studio, and Studio does not edit ${them}: it shows the value such a ` +
    'part produces and names the part. Nothing was refused and nothing is wrong with the build. When you tell the ' +
    `person what you made, the canon's rule 4 applies: "${canonRule(4)}" The sentence: "${CANON_OFFER}"`
  );
}

/** `notDrawnInStudio` and its note for a result, or nothing. Only call it while Studio is open for the project. */
export function notDrawnPayload(rows: readonly NotDrawnInStudio[]): { notDrawnInStudio?: NotDrawnInStudio[]; studioNote?: string } {
  return rows.length > 0 ? { notDrawnInStudio: [...rows], studioNote: studioNote(rows.length) } : {};
}
