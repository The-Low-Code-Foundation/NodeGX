/**
 * P121-TWO003-NESTEDBUTTON — a visual node whose Click is wired, holding a Button, a field or another wired Click.
 *
 * GROUPKEYBOARD made every element with a wired Click a button to the keyboard. Measured in Chrome on 2026-10-27, that
 * read a card holding an "Add to basket" Button as ONE button named by every word in it, and turned the backdrop behind
 * a settings sheet (Click = close) into a focus ring around the whole sheet that closed it on Enter. Richard ruled
 * "inner controls win": the viewer (`noodl-viewer-react/src/keyboard-click.ts`) does not make such an element a button,
 * and Tab reaches what it holds instead. So the element's own Click answers a pointer only, and this note says so to
 * the person and the agent who built it. When the Click does what an inner control already does (a backdrop's close
 * beside the sheet's Close button), nothing is lost. When it does something of its own (a card that opens its product),
 * that needs a Button too.
 *
 * What counts as "holds", read from the graph as the viewer reads the page: in the node's own visual tree, one of the
 * controls the browser makes pressable (`CONTROL_TYPES`), or a node whose Click is wired, or a component placed there
 * whose tree holds one of those. A conditional child counts as held: the viewer gives the button back while it is
 * mounted, and a graph cannot say when that is. A Click wired only into the component's own Component Outputs counts
 * only where the placement takes that output further, as the viewer reads it (`keyboard-click.ts` `reachesSomething`):
 * rocket-school's Header holds "The face", whose picture's Click goes to a `Tapped` output the Header never uses.
 *
 * An **info**, as ruled ("a note"). Calibrated 2026-10-27 before it was written: 299 places in 66 local projects,
 * among them the planning template's four sheet backdrops (correct as built: each sheet has its own Close) and the
 * marketplace's ProductCard (its Button over the name is the keyboard's way in).
 *
 * @module noodl-editor/validation/rules/clickAreaHoldsAControl
 */

import { DiagnosticCode, type Diagnostic } from '../diagnostics';
import { isComponentRef, refToPath, type NormComponent, type NormNode } from '../model';
import type { Rule, RuleContext } from './types';

/** The controls the viewer draws as a native button, field or list: Tab stops on each by itself. */
const CONTROL_TYPES = new Map<string, string>([
  ['net.noodl.controls.button', 'Button'],
  ['net.noodl.controls.textinput', 'Text Input'],
  ['net.noodl.controls.checkbox', 'Checkbox'],
  ['net.noodl.controls.radiobutton', 'Radio Button'],
  ['net.noodl.controls.options', 'Dropdown'],
  ['net.noodl.controls.range', 'Slider']
]);

const CLICK = 'onClick';
const COMPONENT_OUTPUTS = 'Component Outputs';

const clickWired = (component: NormComponent, node: NormNode) =>
  component.connections.some((c) => c.fromId === node.id && c.fromProperty === CLICK);

/**
 * The Component Outputs ports of a component that its placement takes further, or `'all'` where the placement is not
 * known (the component being examined: every placement counts).
 */
type Used = ReadonlySet<string> | 'all';

/** Whether a wire from `node`'s `port` reaches something that acts, given which of the component's outputs are used. */
function reaches(component: NormComponent, nodeById: Map<string, NormNode>, node: NormNode, port: string, used: Used) {
  return component.connections.some((c) => {
    if (c.fromId !== node.id || c.fromProperty !== port) return false;
    if (nodeById.get(c.toId)?.type !== COMPONENT_OUTPUTS) return true;
    return used === 'all' || used.has(c.toProperty);
  });
}

const quoted = (node: NormNode) => (node.label ? ` ("${node.label}")` : '');

export const clickAreaHoldsAControl: Rule = {
  code: DiagnosticCode.ClickAreaHoldsAControl,
  description: 'An element whose Click is wired holds a control, so the keyboard reaches the control and not the element.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    const byPath = new Map(ctx.components.map((c) => [refToPath(c.component.name), c]));

    // What a component placed somewhere holds that Tab stops on, given which of its outputs that placement uses: the
    // first such node in its tree, or null.
    const memo = new Map<string, string | null>();
    const componentHolds = (ref: string, used: ReadonlySet<string>): string | null => {
      const path = refToPath(ref);
      const key = `${path}|${[...used].sort().join(',')}`;
      if (memo.has(key)) return memo.get(key) ?? null;
      memo.set(key, null); // a component placed inside itself holds nothing more
      const entry = byPath.get(path);
      let found: string | null = null;
      if (entry) {
        for (const node of entry.component.nodes) {
          found = held(node, entry.component, entry.nodeById, used);
          if (found) break;
        }
      }
      memo.set(key, found);
      return found;
    };

    // How the message names `node` when it is something Tab stops on, or null.
    function held(node: NormNode, component: NormComponent, nodeById: Map<string, NormNode>, used: Used): string | null {
      const control = CONTROL_TYPES.get(node.type);
      if (control) return `a ${control}${quoted(node)}`;
      if (reaches(component, nodeById, node, CLICK, used)) {
        return `${node.label ? `"${node.label}"` : 'an element'}, which answers a click of its own`;
      }
      if (isComponentRef(node.type)) {
        // The outputs of this placement that go somewhere.
        const ports = new Set(component.connections.filter((c) => c.fromId === node.id).map((c) => c.fromProperty));
        const usedHere = new Set([...ports].filter((port) => reaches(component, nodeById, node, port, used)));
        const inside = componentHolds(node.type, usedHere);
        if (inside) return `the component ${node.label ? `"${node.label}"` : `"${refToPath(node.type)}"`}, which holds ${inside}`;
      }
      return null;
    }

    for (const { component, nodeById } of ctx.components) {
      for (const area of component.nodes) {
        if (CONTROL_TYPES.has(area.type) || !clickWired(component, area)) continue;
        if (!ctx.catalog.getNode(area.type)?.isVisual) continue;

        let inner: string | null = null;
        const stack = [...(area.children ?? [])];
        while (stack.length && !inner) {
          const node = nodeById.get(stack.shift() as string);
          if (!node) continue;
          inner = held(node, component, nodeById, 'all');
          stack.push(...(node.children ?? []));
        }
        if (!inner) continue;

        const name = area.label ? `"${area.label}"` : `This ${ctx.catalog.getNode(area.type)?.displayName ?? area.type}`;
        out.push({
          code: DiagnosticCode.ClickAreaHoldsAControl,
          severity: 'info',
          message:
            `${name} answers a click. It holds ${inner}. The Tab key stops on what it holds instead. A person using a ` +
            `keyboard or a screen reader cannot press ${area.label ? name : 'it'} itself. If its click does something ` +
            'nothing inside it does, give that its own Button.',
          location: {
            component: component.name,
            nodeId: area.id,
            nodeType: area.type,
            ...(area.label ? { nodeLabel: area.label } : {}),
            port: CLICK,
            plug: 'output' as const
          }
        });
      }
    }
    return out;
  }
};
