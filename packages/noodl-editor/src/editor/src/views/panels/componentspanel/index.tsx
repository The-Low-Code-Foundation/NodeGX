/**
 * ComponentsPanel Wrapper
 *
 * Temporary wrapper that will be replaced with direct import
 * from the new ComponentsPanel React component.
 *
 * TVW-001 (e): it used to declare its own `options` shape (`showSheetList`, `hideSheets`) and hand
 * it through. Sheets are retired (R-C), the panel takes no props, and `router.setup.ts` — its only
 * caller — passes none.
 */

export { ComponentsPanel } from '../ComponentsPanelNew/ComponentsPanelReact';
export type { ComponentsPanelProps } from '../ComponentsPanelNew/types';
