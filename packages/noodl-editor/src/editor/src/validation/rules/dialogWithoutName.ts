/**
 * Rule: a popup that a screen reader announces as "dialog" and nothing else.
 *
 * P99 **HLT-014 §3.1** — the one slice left of "the popup is not a dialog". HLT-014 made every
 * open popup a real modal dialog: `role="dialog"`, `aria-modal="true"`, the page behind it
 * `inert`, focus returned to the opener. A dialog with no accessible **name** still passes every
 * one of those checks and is still announced as the bare word *"dialog"*, which tells a person
 * using a screen reader that something opened and nothing about what.
 *
 * ## The predicate, taken from the runtime rather than from the idea of it
 *
 * `PopupDialogLayer` names a popup one of two ways (`popup-dialog.ts:109-114`, `:254-257`):
 *
 *  1. Show Popup's **`Accessible Name`** → `aria-label`; or failing that,
 *  2. the popup's **first `h1`–`h3`** → `aria-labelledby`, found with
 *     `el.querySelector('h1, h2, h3')` on the rendered subtree.
 *
 * So this rule fires when **neither** is available, and two things follow that a rule written
 * from the description rather than the code would get wrong:
 *
 * 🔴 **A `Text` is a heading only when its `as` parameter says so.** `nodes/visual/text.ts:47-68`
 * declares `as` as an enum over `div|h1…h6|p|span` with a default of **`div`**. "There is a Text
 * at the top of the popup" is not a heading, and a rule that accepted any Text would pass 728 of
 * the 756 popups in the corpus while every one of them is still announced as "dialog".
 *
 * 🔴 **`querySelector` searches the whole rendered subtree, including nested component
 * instances.** A heading one component down names the dialog perfectly at runtime. So the walk
 * here **recurses into component instances**. Measured 2026-09-22 across 238 projects: **0**
 * popups rely on that today — but that is a fact about this corpus and not about the rule
 * ([[a-reading-that-fits-is-not-one-that-excludes]]), and the day it stops being true a
 * non-recursive version emits a warning that is simply false. A warning nobody trusts is a
 * warning nobody reads.
 *
 * ## What it deliberately does not say
 *
 * ⚠️ A Show Popup with **no `target`**, or one whose target does not resolve, gets nothing from
 * this rule. Those are different defects with their own codes, and a node cannot be told two
 * things about one parameter without the second one being noise.
 *
 * ⚠️ `h4`–`h6` do **not** count, because `querySelector('h1, h2, h3')` does not match them. This
 * rule reports what the runtime will do, not what would be reasonable.
 *
 * ## Severity
 *
 * A **warning**, never an error: the graph is correct, it renders, and the popup works for
 * everyone not using a screen reader. Measured on the shipped corpus before it was written: the
 * ten templates contain **exactly one** Show Popup and its target already carries a heading, so
 * this rule is **0 hits on everything NodeGX ships** and cannot turn `validate:project` red on
 * the product's own output ([[templates-exist-to-surface-product-defects]] — the templates were
 * asked first).
 *
 * @module noodl-editor/validation/rules/dialogWithoutName
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { NormComponent, NormNode } from '../model';
import { Rule, RuleContext } from './types';

/** The node that opens a popup. `NavigationShowPopup` is the serialized type (`showpopup.ts:48`). */
const SHOW_POPUP_TYPE = 'NavigationShowPopup';

/** The `Text` node type, as authored. */
const TEXT_TYPE = 'Text';

/**
 * The tags `PopupDialogLayer` actually looks for.
 *
 * 🔴 Exactly `querySelector('h1, h2, h3')`, no more: `h4`–`h6` are offered by the `as` port and
 * match nothing there, so a popup titled with an `h4` really is unnamed at runtime. Widening this
 * set would make the rule disagree with the code it describes.
 */
const HEADING_TAGS: ReadonlySet<string> = new Set(['h1', 'h2', 'h3']);

/** The `as` value of a node, when it is a string. */
function tagOf(node: NormNode): string | undefined {
  const as = node.parameters?.as;
  return typeof as === 'string' ? as : undefined;
}

/** Does this component's own node list contain a heading? */
function hasOwnHeading(component: NormComponent): boolean {
  return component.nodes.some((node) => node.type === TEXT_TYPE && HEADING_TAGS.has(tagOf(node) ?? ''));
}

/**
 * Does the subtree rooted at `name` render an `h1`–`h3` anywhere?
 *
 * Recurses through component instances, because the runtime's `querySelector` does. `seen` guards
 * a component that (directly or otherwise) contains itself: a cycle is a different defect and
 * this rule must not hang on one.
 */
function subtreeHasHeading(
  name: string,
  byName: ReadonlyMap<string, NormComponent>,
  seen: Set<string>
): boolean {
  if (seen.has(name)) return false;
  seen.add(name);
  const component = byName.get(name);
  if (!component) return false;
  if (hasOwnHeading(component)) return true;
  for (const node of component.nodes) {
    if (byName.has(node.type) && subtreeHasHeading(node.type, byName, seen)) return true;
  }
  return false;
}

export const dialogWithoutName: Rule = {
  code: DiagnosticCode.DialogWithoutName,
  description: 'A popup with no accessible name is announced as "dialog" and nothing else',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Every component, under every name a node could legitimately use to instantiate it.
    const byName = new Map<string, NormComponent>();
    for (const component of ctx.project.components) byName.set(component.name, component);

    for (const { component } of ctx.components) {
      for (const node of component.nodes) {
        if (node.type !== SHOW_POPUP_TYPE) continue;

        const accessibleName = node.parameters?.accessibleName;
        if (typeof accessibleName === 'string' && accessibleName.trim() !== '') continue;

        const target = node.parameters?.target;
        // No target, or one that does not resolve: owned by other codes, silent here.
        if (typeof target !== 'string' || target.trim() === '') continue;
        const resolved = byName.has(target) ? target : undefined;
        if (resolved === undefined) continue;

        if (subtreeHasHeading(resolved, byName, new Set())) continue;

        diagnostics.push({
          code: DiagnosticCode.DialogWithoutName,
          severity: 'warning',
          message:
            `This Show Popup opens "${target}" as a modal dialog, but nothing gives that dialog ` +
            'a name: "Accessible Name" is empty and the popup contains no <h1>, <h2> or <h3>. A ' +
            'screen reader announces it as "dialog" and says nothing about what opened.',
          location: {
            component: component.name,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.label,
            port: 'accessibleName'
          },
          suggestion:
            'Either type a name into this node\'s "Accessible Name" — the words you would use to ' +
            `describe the popup out loud — or give "${target}" a heading by setting a Text node's ` +
            '"Tag" (under Advanced HTML) to <h1>, <h2> or <h3>. The heading route is usually ' +
            'better: the popup then says the same thing to everyone. Note that <h4>–<h6> do not ' +
            'count, because the runtime looks only for the first three.'
        });
      }
    }

    return diagnostics;
  }
};
