/**
 * `visual/icon-source-not-an-icon/<port>` — what an `icon` port tells the editor when it is handed something it cannot draw
 * (NSP-019 R35). The port's setter (react-component-node.ts :689-693, every `icon`-typed input of a visual node) replaces the
 * sentence on every value that arrives: `iconSourceProblem` (components/visual/Icon/iconSourceProblem.ts :61-75) names what
 * arrived, or says nothing for a value it can draw or for no value at all. Six nodes have one, `iconIconSource` (Icon Source,
 * node-shared-port-definitions.ts `addIconInputs`): Icon, Button, Checkbox, Dropdown, Radio Button and Text Input.
 *
 * The key's namespace, `visual/`, is the base visual class's, shared by every visual node (as `node/` is the base node's); the
 * runtime target records only the keys a spec names there (node-spec-target.ts `recordDiagnostics`).
 */

import { describeValue } from './describe-value';

/** iconSourceProblem.ts :45 — every one of the three `Noodl.Icon` shapes carries one of these */
const ICON_KEYS = ['class', 'code', 'kind'] as const;

/** iconSourceProblem.ts :61-75 */
export function iconSourceProblem(value: unknown, displayName = 'This icon input'): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (ICON_KEYS.some((k) => k in (value as Record<string, unknown>))) return null;
  }
  return (
    `${displayName} expects an icon, received ${describeValue(value)}. ` +
    'Nothing will be drawn — pick the glyph with the icon picker, or wire an object of the ' +
    'shape {class, code} (for example {"class":"material-icons","code":"search"}); the class ' +
    'comes from the installed icon set, so a bare name cannot be turned into one.'
  );
}

/** The key for the shared Icon Source port (react-component-node.ts :672, :693). */
export const ICON_SOURCE_KEY = 'visual/icon-source-not-an-icon/iconIconSource';

/** The spec's `diagnostics` entry for Icon Source: the sentence for the last value that arrived. */
export function iconSourceDiagnostics() {
  return {
    [ICON_SOURCE_KEY]: {
      says: 'Icon Source holds something that is not an icon',
      message: (i: { readonly iconIconSource?: unknown }) => iconSourceProblem(i.iconIconSource, 'Icon Source')
    }
  };
}

/** The version note each of the six carries for this change (NSP-010). */
export function iconSourceChange(version: number) {
  return {
    version,
    says: 'An Icon Source that is not an icon now shows as the node\'s warning in this spec, until an icon or nothing arrives. The runtime has always shown it',
    row: 'NSP-019 R35 (P107 s103)',
    migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
  };
}

/** The version note of a control that tells the editor both (NSP-010): a missed Focus (focus-not-mounted.ts) and its Icon Source. */
export function focusAndIconSourceChange(version: number) {
  return {
    version,
    says: 'Two warnings the runtime has always shown are now in this spec: a Focus that arrives while the node is not on the page (until a Focus reaches it), and an Icon Source that is not an icon (until an icon or nothing arrives)',
    row: 'NSP-019 R35 (P107 s103)',
    migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
  };
}
