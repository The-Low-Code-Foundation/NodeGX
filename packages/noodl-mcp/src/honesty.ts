/**
 * P111 SEE-001 — the honesty number on this server's surfaces: `get_project_info`, `get_component`, the
 * `create_component` / `update_component` results and a `render_report` section.
 *
 * 🔴 The RULE is not here. It is `@nodegx/node-spec`'s `honesty.ts`, the one definition the editor and the templates'
 * ratchet read too; this module only reads the bound project and shapes the result fields. Every field is a RESULT field,
 * so the resident tool surface (`toolDisclosure.test.ts`, 8,280) does not pay for it; its cost per call is measured on the
 * training template in `tests/see001Honesty.test.ts`.
 *
 * The project is read from disk with `portProjectFromStore` — the same read `get_component`'s drawn ports make — and the
 * kit test is the SHIPPED catalog (`shippedTypeNames`), never the catalog merged with the project's kits.
 *
 * @module noodl-mcp/honesty
 */
import {
  HONESTY_SENTENCE,
  componentHonesty,
  honestyLine,
  projectHonesty,
  scriptPartName,
  type ComponentHonesty,
  type HonestyComponent,
  type ProjectHonesty
} from '@nodegx/node-spec';
import { portProjectFromStore } from '@nodegx/project-contract/port-context';

import { shippedTypeNames } from './catalog';
import type { ProjectStore } from './project/ProjectStore';

/** How many script parts a component result names, largest first. */
export const COMPONENT_SCRIPT_NODES_SHOWN = 12;
/** How many components `get_project_info` names as holding the most script. */
export const PROJECT_COMPONENTS_SHOWN = 5;
/** How many script node types `get_project_info` counts by name. */
export const PROJECT_SCRIPT_TYPES_SHOWN = 8;

/** The bound project's components as the honesty rule reads them. */
export function honestyComponents(store: ProjectStore): HonestyComponent[] {
  return portProjectFromStore(store.format).components.map((c) => ({ name: c.name, nodes: c.nodes }));
}

/** The project's honesty number, read from disk now. */
export function projectHonestyOf(store: ProjectStore): ProjectHonesty {
  return projectHonesty(honestyComponents(store), { coreTypes: shippedTypeNames() });
}

/** One component's honesty number (its legacy name, its nodes). */
export function componentHonestyOf(name: string, nodes: HonestyComponent['nodes']): ComponentHonesty {
  return componentHonesty({ name, nodes }, { coreTypes: shippedTypeNames() });
}

export interface ProjectHonestyPayload {
  /** One line: the number and its three counts. */
  line: string;
  percent: number | null;
  known: number;
  script: number;
  unspecced: number;
  /** R-SEE-001-a: the same number with each script node weighed by its lines (a kit node by 1). Beside the headline, never instead of it. */
  percentByLines: number | null;
  scriptLines: number;
  /** Script nodes by type, the largest counts first. */
  scriptByType: Record<string, number>;
  /** The components holding the most script nodes, with their own number. */
  mostScript: Array<{ component: string; percent: number | null; script: number }>;
  /** What the number is and is not. */
  about: string;
}

export function projectHonestyPayload(h: ProjectHonesty): ProjectHonestyPayload {
  const byType: Record<string, number> = {};
  for (const p of h.scriptParts) byType[p.type] = (byType[p.type] ?? 0) + 1;
  return {
    line: honestyLine(h, 0),
    percent: h.percent,
    known: h.known,
    script: h.script,
    unspecced: h.unspecced,
    percentByLines: h.percentByLines,
    scriptLines: h.scriptLines,
    scriptByType: Object.fromEntries(
      Object.entries(byType)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, PROJECT_SCRIPT_TYPES_SHOWN)
    ),
    mostScript: h.components
      .filter((c) => c.script > 0)
      .sort((a, b) => b.script - a.script || a.component.localeCompare(b.component))
      .slice(0, PROJECT_COMPONENTS_SHOWN)
      .map((c) => ({ component: c.component, percent: c.percent, script: c.script })),
    about: HONESTY_SENTENCE
  };
}

export interface ComponentHonestyPayload {
  line: string;
  percent: number | null;
  known: number;
  script: number;
  unspecced: number;
  /** The script nodes by id, the most lines first. */
  scriptNodes: Array<{ id: string; type: string; label?: string; lines: number }>;
  /** Script nodes left out of `scriptNodes`. */
  moreScriptNodes?: number;
}

export function componentHonestyPayload(h: ComponentHonesty): ComponentHonestyPayload {
  const parts = [...h.scriptParts].sort((a, b) => b.lines - a.lines);
  return {
    line: honestyLine(h),
    percent: h.percent,
    known: h.known,
    script: h.script,
    unspecced: h.unspecced,
    scriptNodes: parts.slice(0, COMPONENT_SCRIPT_NODES_SHOWN).map((p) => ({ id: p.id, type: p.type, ...(p.label ? { label: p.label } : {}), lines: p.lines })),
    ...(parts.length > COMPONENT_SCRIPT_NODES_SHOWN ? { moreScriptNodes: parts.length - COMPONENT_SCRIPT_NODES_SHOWN } : {})
  };
}

/** A write's result field: the written component's line, with its script parts named, and the project's number after the write. */
export function writeHonestyPayload(store: ProjectStore, legacyName: string): { honesty: { component: string; project: string } } {
  const project = projectHonestyOf(store);
  const mine = project.components.find((c) => c.component === legacyName);
  return {
    honesty: {
      component: mine ? `this component: ${honestyLine(mine)}` : 'this component: not found after the write',
      project: `the project: ${honestyLine(project, 0)}`
    }
  };
}

/** `render_report`'s section, in words. */
export function honestySection(h: ProjectHonesty): string {
  const most = projectHonestyPayload(h).mostScript;
  const named = h.scriptParts.length ? [...h.scriptParts].sort((a, b) => b.lines - a.lines).slice(0, 3).map((p) => '`' + scriptPartName(p) + '`') : [];
  return [
    `HONESTY — ${honestyLine(h, 0)}` + (h.percentByLines !== null && h.script ? `; ${h.percentByLines}% weighed by script lines (${h.scriptLines} lines).` : '.'),
    most.length ? `Most script: ${most.map((c) => `${c.component} ${c.script} (${c.percent === null ? '—' : c.percent + '%'})`).join(', ')}.` : 'No script nodes.',
    named.length ? `Largest script parts: ${named.join(', ')}.` : '',
    HONESTY_SENTENCE
  ]
    .filter(Boolean)
    .join('\n');
}
