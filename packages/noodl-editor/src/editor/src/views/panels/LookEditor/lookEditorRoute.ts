// The leaf module, not the `@noodl-models/sidebar` barrel: the plain-Node runner grades this file.
import { SidebarModel } from '@noodl-models/sidebar/sidebarmodel';

/**
 * P103 CMG-006 — open a Look's fields in the inspector, from anywhere, with or without a node
 * wearing it.
 *
 * Richard, driving P102: *"When I save a 'Look', it appears in the style tab, but I can do fuck
 * all with it."* Until this, the only way into a Look's fields was a node wearing it: select the
 * wearer, press *Edit* on its Look row, and the property panel switched to variant mode. A Look
 * nothing wears — the state right after saving one and deselecting — had no door at all.
 *
 * The panel (`LookEditorPanel`) is registered as a transient sidebar panel like `PropertyEditor`,
 * and `SidebarModel.showInInspector` puts it in the inspector column, which is where a node's
 * fields are edited too (P101 INS-001). Selecting a node afterwards replaces it; `hidePanels`
 * (deselect, Done) clears it.
 */
export const LOOK_EDITOR_PANEL_ID = 'LookEditor';

export interface LookRef {
  /** The Look's node type: two Looks may share a name across types. */
  typename: string;
  name: string;
}

export function openLookEditor(look: LookRef): void {
  SidebarModel.instance.showInInspector(LOOK_EDITOR_PANEL_ID, { typename: look.typename, name: look.name });
}
