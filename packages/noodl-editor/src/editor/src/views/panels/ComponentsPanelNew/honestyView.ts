/**
 * P111 SEE-001 §4 item 3 — what the components panel says about the honesty number.
 *
 * 🔴 **The rule is not here.** It is `@nodegx/node-spec`'s `honesty.ts`, the one definition the MCP server
 * (`get_project_info`, `get_component`, the write results, `render_report`) and the templates' ratchet
 * (`scripts/see/honesty-ledger.js`) import too. This module only walks the editor's live graphs into the plain data
 * that definition reads, and words the result for three places: the panel header (the project's number), a row (that
 * component's number) and the two popovers behind them (the script parts, by name). The kit test reads the editor's
 * bundled catalog (`validation/catalog`'s `defaultCatalog`, built-ins only), which is the same 180 type names the MCP's
 * `shippedTypeNames()` and the ledger's `node-catalog.json` hold.
 *
 * Quiet by design: the header says `67% known` and nothing else until hovered or clicked; a row carries its number only
 * when the component holds script, because a column of `100%` is a dashboard, and the absence of a number already says
 * "every node here is known". The mark that says which nodes are script is the same on a row and on the canvas
 * ({@link SCRIPT_MARK_TOKEN}).
 *
 * Free of React, the DOM and every editor singleton, so it grades in plain Node (`tests-unit/see-001`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/honestyView
 */

import {
  HONESTY_SENTENCE,
  honestyLine,
  projectHonesty,
  scriptPartName,
  type ComponentHonesty,
  type HonestyComponent,
  type HonestyNode,
  type ProjectHonesty
} from '@nodegx/node-spec';

/**
 * The colour of the script mark: a bar on a component row's number, and the same bar down the right edge of a script
 * node's card on the canvas (`NodeGraphEditorNodePainter`, through `CanvasTheme`'s `categoryJavascript`, which resolves
 * this token). The function category's ink, because a script node is one whose behaviour is written as code; not amber,
 * which is warning, because the number is not a quality score.
 */
export const SCRIPT_MARK_TOKEN = '--theme-color-node-category-function';

/** How many script parts a row's popover names, the most lines first (the MCP's `get_component` names 12 too). */
export const ROW_PARTS_SHOWN = 12;
/** How many components the header's popover names as holding the most script (the MCP's `mostScript` names 5). */
export const HEADER_COMPONENTS_SHOWN = 5;

/** The fields of a live graph node this walk reads (`NodeGraphNode`). */
export interface HonestyWalkNode {
  id: string;
  typename?: string;
  /** Usually a string; an expression-valued label is an object and is not a name. */
  label?: unknown;
  parameters?: Record<string, unknown>;
}

/** The fields of a live component this walk reads (`ComponentModel`). */
export interface HonestyWalkComponent {
  name: string;
  /** ⚠️ Stops on a truthy return (`NodeGraphNode.forEach`): the callback below returns nothing. */
  forEachNode(callback: (node: HonestyWalkNode) => unknown): unknown;
}

/** Every node of every component, at any depth, as the honesty rule reads a project's files. */
export function honestyComponentsOf(components: readonly HonestyWalkComponent[]): HonestyComponent[] {
  return components.map((component) => {
    const nodes: HonestyNode[] = [];
    component.forEachNode((node) => {
      nodes.push({
        id: node.id,
        type: node.typename ?? '',
        ...(typeof node.label === 'string' && node.label ? { label: node.label } : {}),
        ...(node.parameters ? { parameters: node.parameters } : {})
      });
    });
    return { name: component.name, nodes };
  });
}

/** The project's number and each component's, from the live graphs. */
export function readProjectHonesty(components: readonly HonestyWalkComponent[], coreTypes: Iterable<string>): ProjectHonesty {
  return projectHonesty(honestyComponentsOf(components), { coreTypes });
}

const percentText = (percent: number) => `${percent}%`;

// ─── The header ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface HeaderHonesty {
  /** `67% known`: the number and one word. */
  text: string;
  /** The hover: the three counts, the line-weighted figure beside it, and what the number is and is not. */
  title: string;
  /** The popover's title: the same line `get_project_info` returns. */
  menuTitle: string;
  /** The popover's first line: the line-weighted figure and the mark's meaning. */
  note: string;
  /** The components holding the most script, the most first. */
  components: HeaderComponentRow[];
}

export interface HeaderComponentRow {
  component: string;
  /** The component's name without its leading `/`. */
  label: string;
  /** `34 script · 55%`. */
  detail: string;
}

/** `null` for a project with neither known nor script nodes: there is no number to show. */
export function headerHonesty(h: ProjectHonesty): HeaderHonesty | null {
  if (h.percent === null) return null;
  const line = honestyLine(h, 0);
  const byLines =
    h.script > 0 && h.percentByLines !== null
      ? `${percentText(h.percentByLines)} weighed by script lines (${h.scriptLines} lines).`
      : 'No script nodes.';
  const components = h.components
    .filter((c) => c.script > 0)
    .sort((a, b) => b.script - a.script || a.component.localeCompare(b.component))
    .slice(0, HEADER_COMPONENTS_SHOWN)
    .map((c) => ({
      component: c.component,
      label: c.component.replace(/^\//, ''),
      detail: `${c.script} script · ${c.percent === null ? '—' : percentText(c.percent)}`
    }));
  return {
    text: `${percentText(h.percent)} known`,
    title: `Honesty: ${line}. ${byLines}\n\n${HONESTY_SENTENCE}`,
    menuTitle: `Honesty: ${line}`,
    note: `${byLines} A component's number is on its row; a script node is marked on the canvas by the same bar.`,
    components
  };
}

// ─── A row ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RowHonestyPart {
  id: string;
  /** Its label, else its type and id — `scriptPartName`, the MCP's wording. */
  label: string;
  /** `611 lines`, `1 line`, or `kit node, no spec`. */
  detail: string;
}

export interface RowHonesty {
  /** `50%`. */
  text: string;
  /** The hover: the line `update_component` returns for this component, five parts named. */
  title: string;
  /** The popover's title. */
  menuTitle: string;
  /** The script parts, the most lines first, at most {@link ROW_PARTS_SHOWN}. */
  parts: RowHonestyPart[];
  /** Script parts left out of `parts`. */
  more: number;
}

/**
 * `null` when the component holds no script: a row at 100% (or with no known node either) carries no number, so the
 * rows that do are the ones to read.
 */
export function rowHonesty(c: ComponentHonesty): RowHonesty | null {
  if (c.script === 0 || c.percent === null) return null;
  const sorted = [...c.scriptParts].sort((a, b) => b.lines - a.lines);
  const parts = sorted.slice(0, ROW_PARTS_SHOWN).map((p) => ({
    id: p.id,
    label: scriptPartName(p),
    detail: p.kit ? 'kit node, no spec' : `${p.lines} ${p.lines === 1 ? 'line' : 'lines'}`
  }));
  return {
    text: percentText(c.percent),
    title: `${honestyLine(c)} — click to list the script parts`,
    menuTitle: `${c.component.replace(/^\//, '')}: ${honestyLine(c, 0)}`,
    parts,
    more: sorted.length - parts.length
  };
}

/** Each component's row, by its legacy name; components with no script are absent. */
export function rowHonestyIndex(h: ProjectHonesty): Map<string, RowHonesty> {
  const index = new Map<string, RowHonesty>();
  for (const c of h.components) {
    const row = rowHonesty(c);
    if (row) index.set(c.component, row);
  }
  return index;
}
