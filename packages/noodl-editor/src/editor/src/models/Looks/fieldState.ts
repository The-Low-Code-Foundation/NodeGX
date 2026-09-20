/**
 * P94 STY-003 — where a style field's value came from, and what the Look menu offers.
 *
 * The design's four rules (`STY-DESIGN-THE-LOOK-MODEL.md` §2) are all statements about one question
 * a person asks of one row: *where did this value come from?* This module answers it, and nothing
 * else — no React, no editor singletons — so the answer can be graded without a renderer and the
 * surface is left with only drawing to do.
 *
 * 🔴 **It must not answer by comparing values, and that is the whole difficulty.** A linked field and
 * an own field can hold the same resolved value, so a treatment that appears only when values differ
 * is invisible in exactly the case a person most needs it
 * ([[a-css-property-whose-default-equals-the-test-value]]). The question is *ownership*, which is
 * what the runtime itself resolves on: `NodeGraphNode.getParameter` reads the node's own
 * `parameters[name]`, then `this.variant.getParameter()`, then the port default
 * (`NodeGraphNode.ts:799-824`), and the viewer merges in the same order
 * (`react-component-node.ts:1811-1838`).
 *
 * 🔴 **The changed-dot is not an answer to rule 2 and is not reused here.** The dot means
 * `parameters[name] !== undefined` — "this node owns this value" — which is a different statement
 * from "this came from a Look" (`ColorPicker/ColorType.ts:57`).
 *
 * @module noodl-editor/models/Looks/fieldState
 */

/** The parts of a node this module reads. */
export interface NodeStyleFacts {
  /** What the node itself holds. A key present here is owned by the node, whatever its value. */
  parameters: Record<string, unknown>;
}

/** The parts of a Look this module reads. */
export interface LookFacts {
  name: string;
  parameters: Record<string, unknown>;
}

/**
 * Where one field's value comes from.
 *
 * ⚠️ **Four facts, three treatments, and the difference is deliberate.** The design names three
 * visual states (§3.3) because it is describing what a person sees; `own` and `default` are drawn
 * the same way — plainly — but they are not the same fact, and a surface that cannot tell them apart
 * cannot say "nothing is set here" when that is the truth. Use {@link treatmentOf} to collapse them
 * for drawing, and keep the fact for anything that reasons.
 */
export type FieldSource =
  /** Comes from the Look the node wears. Change it there and everything wearing it follows. */
  | 'linked'
  /** The Look offers a value and this node holds its own instead. */
  | 'overridden'
  /** The node's own value, with no Look offering one. */
  | 'own'
  /** Nothing is set here at all — the port's own default is what renders. */
  | 'default';

/** The three treatments the panel draws (design §3.3). */
export type FieldTreatment = 'linked' | 'overridden' | 'plain';

export interface FieldReading {
  source: FieldSource;
  /** The Look's name, when one is offering a value for this field — linked *or* overridden. */
  lookName?: string;
  /** What the Look wanted, so an overridden field can say so and offer a revert (rule 3). */
  lookValue?: unknown;
  /** The node's own value, when it holds one. */
  ownValue?: unknown;
  /**
   * Whether an override happens to hold the same value the Look offers.
   *
   * 🔴 **Reported, never used to hide the override.** A node that owns a parameter is not wearing
   * the Look's value for it: edit the Look and this field will not follow. That is exactly the
   * situation a person cannot see today, and suppressing the treatment because the two values agree
   * right now would rebuild it.
   */
  matchesLook?: boolean;
}

/**
 * Read one style field.
 *
 * @param node - the node's own parameters.
 * @param look - the Look the node wears, or `undefined` when it wears none.
 * @param name - the parameter name.
 */
export function readField(node: NodeStyleFacts, look: LookFacts | undefined, name: string): FieldReading {
  const owns = Object.prototype.hasOwnProperty.call(node.parameters ?? {}, name) && node.parameters[name] !== undefined;
  const lookHas =
    look !== undefined &&
    Object.prototype.hasOwnProperty.call(look.parameters ?? {}, name) &&
    look.parameters[name] !== undefined;

  if (lookHas && owns) {
    return {
      source: 'overridden',
      lookName: look!.name,
      lookValue: look!.parameters[name],
      ownValue: node.parameters[name],
      matchesLook: sameValue(look!.parameters[name], node.parameters[name])
    };
  }
  if (lookHas) return { source: 'linked', lookName: look!.name, lookValue: look!.parameters[name] };
  if (owns) return { source: 'own', ownValue: node.parameters[name] };
  return { source: 'default' };
}

/**
 * What a Look's value reads as in the override line — *"Primary Button says **8px**"* — or
 * `undefined` when there is no short, true way to say it.
 *
 * 🔴 **Refuses rather than approximates.** A colour parameter is an object as often as a string
 * (`{r,g,b,a}`), and putting `[object Object]` or a wall of JSON into a sentence about what the
 * Look wanted is worse than the shorter sentence the caller falls back to (*"Overrides Primary
 * Button"*). The override treatment and the revert do not depend on this — only the wording does,
 * so the field can decline to be quoted without the row losing rule 3.
 *
 * ⚠️ `false` and `0` are values, not absences: the guard is on `null`/`undefined` alone.
 */
export function displayableValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.length > 0 ? value : undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** What the panel draws for a reading — `own` and `default` are both plain (design §3.2). */
export function treatmentOf(source: FieldSource): FieldTreatment {
  return source === 'linked' ? 'linked' : source === 'overridden' ? 'overridden' : 'plain';
}

/**
 * Every field a person should see as styled by the Look, whether or not this node overrides it.
 *
 * The union, deliberately: a Look that offers `borderRadius` still has something to say about a node
 * that overrides it — "Primary Button says 8px" — and a section that listed only linked fields would
 * drop exactly the rows rule 3 is about.
 */
export function styledFieldNames(node: NodeStyleFacts, look: LookFacts | undefined): string[] {
  const names = new Set<string>();
  for (const name of Object.keys(look?.parameters ?? {})) names.add(name);
  for (const [name, value] of Object.entries(node.parameters ?? {})) {
    if (value !== undefined) names.add(name);
  }
  return [...names].sort();
}

/** How many fields of a node wearing a Look are overridden — what the header can say at a glance. */
export function overrideCount(node: NodeStyleFacts, look: LookFacts | undefined): number {
  if (look === undefined) return 0;
  return Object.keys(look.parameters ?? {}).filter((name) => readField(node, look, name).source === 'overridden')
    .length;
}

/**
 * Structural comparison, because a colour parameter is an object as often as a string and
 * `{r:1,g:0,b:0} !== {r:1,g:0,b:0}`. Only ever used for {@link FieldReading.matchesLook}, which is
 * a report and never a decision.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// ── The Look menu (design §4) ────────────────────────────────────────────────

export interface LookMenuEntry {
  /** The Look's name, and what a person reads. */
  name: string;
  /** How many nodes in the project wear it. Absent for a library Look nothing can wear yet. */
  wearers?: number;
  /** Whether this is the Look the selected node is wearing now. */
  current?: boolean;
  /** For a library row, the shipped id it would be copied from. */
  shippedFrom?: string;
}

export interface LookMenu {
  /** Looks this project already holds for this node type, in name order. */
  inThisProject: LookMenuEntry[];
  /**
   * Shipped Looks for this node type that the project has not taken a copy of yet.
   *
   * 🔴 **A shipped Look whose name the project already holds is NOT offered again**, because after
   * the first use they are the same thing (rule 4: "shipped and homemade behave identically"). The
   * project's own row is the one to pick, and offering both would be the first re-appearance of the
   * two-systems problem this design exists to remove.
   */
  fromLibrary: LookMenuEntry[];
  /** The row that matters: "Save this button's styles as a new Look…" (design §4). */
  saveAsNewLabel: string;
  /** Whether the node currently wears nothing — the menu's "None" state (design §3.2). */
  none: boolean;
}

export interface LookMenuInput {
  /** Every Look in the project, any type. */
  projectLooks: readonly { name: string; typename: string }[];
  /** The shipped library for this node type. */
  shippedLooks: readonly { name: string; shippedFrom: string }[];
  /** The selected node's type. A Look is identified by name **and** type, everywhere. */
  typename: string;
  /** The Look the node wears, if any. */
  currentLookName?: string;
  /** name → how many nodes wear it. The delete-confirm modal already computes this. */
  wearerCounts?: Readonly<Record<string, number>>;
  /** A human word for the node type, for the save row: "button", "text". */
  typeLabel?: string;
}

export function buildLookMenu(input: LookMenuInput): LookMenu {
  const mine = input.projectLooks
    .filter((look) => look.typename === input.typename)
    .map((look) => ({
      name: look.name,
      wearers: input.wearerCounts?.[look.name] ?? 0,
      ...(look.name === input.currentLookName ? { current: true } : {})
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const taken = new Set(mine.map((look) => look.name));
  const fromLibrary = input.shippedLooks
    .filter((look) => !taken.has(look.name))
    .map((look) => ({ name: look.name, shippedFrom: look.shippedFrom }));

  return {
    inThisProject: mine,
    fromLibrary,
    saveAsNewLabel: `Save this ${input.typeLabel ?? 'node'}'s styles as a new Look…`,
    none: input.currentLookName === undefined
  };
}

/**
 * Should the Look menu open straight into "name your new Look", skipping the list?
 *
 * 🔴 **Only when the list would be empty.** The property panel's own caller has always asked for
 * the shortcut when the PROJECT holds no Look for this node type, and that was right while a
 * project's own Looks were the only thing the menu could offer. The shipped library changed the
 * answer without changing the question: a project with none of its own still has twelve to pick
 * from, and *every* project has none of its own until someone makes one — so the shortcut fired on
 * exactly the projects the library exists for, and `START FROM A NODEGX LOOK` could not be reached
 * from the property panel at all.
 *
 * `callerWantsCreate` is that caller's ask; this function is the veto. It deliberately reads the
 * SAME `LookMenu` the popup renders, so the decision cannot disagree with the list it is about.
 *
 * Found by STY-007's drive, 2026-09-19, on a copy of `Todo list`.
 */
export function shouldOpenInCreateMode(menu: LookMenu, callerWantsCreate: boolean): boolean {
  if (!callerWantsCreate) return false;
  return menu.inThisProject.length === 0 && menu.fromLibrary.length === 0;
}
