/**
 * P109 ISL-007 AC6 — a word typed straight onto a page in an app that translates.
 *
 * ## The row
 *
 * The translation add-on (`library/modules/i18next-translation`) swaps words by key: a `Translation` node reads a key
 * from a Language Bundle and its output is wired into a Text, a Button label, a placeholder. A word TYPED into one of
 * those ports instead has no key, so it stays the same when the app switches language, and nothing says so: the
 * add-on's own runtime warning names a key with no translation, never a word that has no key at all.
 *
 * 🔒 **"Warn if app translates" (Richard, 2026-10-03).** Measured before the ruling, on every project on this machine
 * that carries the add-on (ISL-007 §8 s11): Richard's Tailr places 16 Translation nodes and types 162 words with no
 * wire into them; the two hsseq copies CARRY the add-on and place no Translation node at all. So the opt-in is a
 * PLACED `Translation` node anywhere in the project, not the add-on being installed: those two apps never translate,
 * and warning there would be 59 findings about a choice nobody made.
 *
 * ## What counts
 *
 * - **A word**: a typed string with at least one letter. `→`, `—`, `+`, `7–9` are not words. A name, a code or a
 *   format string (`Ada`, `V1.13`, `MMM DD, YYYY`) IS one by this test; there is no telling it apart from a word by
 *   its characters, and the ruling did not add an escape. A warning, advisory, never blocking.
 * - **A port that shows a word**: the visual built-ins' text, label, placeholder and title inputs, read from the
 *   shipped catalog on 2026-10-03 ({@link WORD_PORTS}). Data and cloud `text` ports (Parse CSV, Send Email) are text
 *   to process, not words on screen. A kit's ports abstain: a kit's `label` may be an accessible name, an id or a
 *   caption, and only its author knows which.
 * - **Not wired**: a port with a connection into it shows the wire's value, whatever is typed there.
 *
 * ## Where it reports
 *
 * At the node, in the component being validated. The project-wide fact (does anything place a Translation node?) is
 * read from the views; **omitted views means "do not check"**, the convention every project-wide option in
 * `authoredCandidate.ts` follows.
 *
 * Pure. The caller supplies the views.
 *
 * @module noodl-editor/validation/typedWordNotTranslated
 */

import { DiagnosticCode, type Diagnostic, type Severity } from './diagnostics';

/** The translation add-on's per-word node. Kit types are namespaced (`kit.Node`), so the bare name is the add-on's. */
export const TRANSLATION_NODE_TYPE = 'Translation';

/**
 * Node type → the input ports on it that put a typed word in front of a person, with the name a person reads.
 * From `noodl-types/src/node-catalog.json` (every built-in input named text, label, placeholder or title), 2026-10-03.
 */
export const WORD_PORTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Text: { text: 'Text' },
  Page: { title: 'Title' },
  'net.noodl.controls.button': { label: 'Label' },
  'net.noodl.controls.checkbox': { label: 'Label' },
  'net.noodl.controls.options': { label: 'Label', placeholder: 'Placeholder' },
  'net.noodl.controls.radiobutton': { label: 'Label' },
  'net.noodl.controls.textinput': { label: 'Label', placeholder: 'Placeholder' },
  // The deprecated originals, still in old projects.
  Label: { text: 'Text' },
  Button: { label: 'Label' },
  'Text Input': { placeholder: 'Placeholder' }
};

/** A word has a letter in it, in any script. */
const HAS_LETTER = /\p{L}/u;

/** How much of a long typed text the message quotes. */
const QUOTE_MAX = 60;

export interface TypedWordNode {
  id?: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown> | null;
}

export interface TypedWordOptions {
  /** Legacy name of the component being validated. */
  component: string;
  /** Every component's nodes, the candidate's included. Omitted: do not check. */
  views?: readonly { nodes: readonly { type: string }[] }[];
  /** `${nodeId}::${port}` for every input with a wire into it (`connectedInputs`). */
  connectedInputs?: ReadonlySet<string>;
}

/** Does anything in the project, or the candidate, place a Translation node? */
export function appTranslates(
  views: readonly { nodes: readonly { type: string }[] }[],
  candidate: readonly { type: string }[] = []
): boolean {
  if (candidate.some((n) => n.type === TRANSLATION_NODE_TYPE)) return true;
  return views.some((v) => v.nodes.some((n) => n.type === TRANSLATION_NODE_TYPE));
}

export function checkTypedWordNotTranslated(nodes: readonly TypedWordNode[], options: TypedWordOptions): Diagnostic[] {
  const { component, views, connectedInputs } = options;
  if (!views || !appTranslates(views, nodes)) return [];
  const severity: Severity = 'warning';
  const out: Diagnostic[] = [];
  for (const node of nodes) {
    const ports = WORD_PORTS[node.type];
    if (!ports || !node.id) continue;
    for (const [port, portName] of Object.entries(ports)) {
      const value = node.parameters?.[port];
      if (typeof value !== 'string' || !HAS_LETTER.test(value)) continue;
      if (connectedInputs?.has(`${node.id}::${port}`)) continue;
      const shown = value.trim().replace(/\s+/g, ' ');
      const quote = shown.length > QUOTE_MAX ? `${shown.slice(0, QUOTE_MAX - 1)}…` : shown;
      out.push({
        code: DiagnosticCode.TypedWordNotTranslated,
        severity,
        message:
          `"${quote}" is typed into this node's ${portName}, so it stays the same in every language — and this app ` +
          'switches language (it places Translation nodes). Put the word in each Language Bundle under a key and wire ' +
          `a Translation node's Translation output into ${portName}. Leave it typed only if it reads the same in ` +
          'every language (a name, a code).',
        location: {
          component,
          nodeId: node.id,
          nodeType: node.type,
          ...(node.label ? { nodeLabel: node.label } : {}),
          port,
          plug: 'input'
        },
        suggestion: TRANSLATION_NODE_TYPE
      });
    }
  }
  return out;
}
