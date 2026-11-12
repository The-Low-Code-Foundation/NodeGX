/**
 * BETA-S7-DROPDOWNFOCUSDIVERGE (the Beta sweep s14, 2026-10-27) — Visible reaches the element at once.
 *
 * node-shared-port-definitions.ts :374-388 writes Visible through `setStyle({ visibility: 'hidden' })` / `removeStyle(['visibility'])`
 * (react-component-node.ts), and `visibility` is in none of their render-forcing lists: it is written onto the element on the spot
 * whenever the element exists. A browser's `focus()` reads the style as it stands (Chrome 156, measured: a `<select>` under
 * `visibility: hidden` takes no focus; hidden and shown again in the same task, it does). So a Focus sent in the same frame as a
 * Visible meets what that Visible said. The six focusable controls' specs said "at the next paint" until this version: the first
 * Focus lost, the second taken. Enabled and Opacity 0 still reach the element at the paint (both go through a render).
 */
export function visibleAtOnceChange(version: number) {
  return {
    version,
    says:
      'No app does anything differently. Visible shows or hides the control at once: a Focus sent in the same moment as Visible ' +
      'going on reaches it (Focused fires), and one sent as Visible goes off does nothing. The version before said Visible waited ' +
      'for the next paint, so it lost the first Focus and kept the second; the runtime never did either',
    row: 'BETA-S7-DROPDOWNFOCUSDIVERGE',
    migration: {
      none: 'The runtime did not change; only the spec stopped saying Visible waits for the next paint. No stored project changes'
    }
  };
}
