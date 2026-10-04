/**
 * P109 ISL-016 — `set_project_settings`: the door writes the project's name, its settings and its home.
 *
 * Before this tool the only door that wrote `rootNodeId` or `settings` was `create_project`, and only
 * for a brand-new folder. Eight template generators reached into `nodegx.project.json` by hand after
 * the door closed (`pinRootNode`), and one that did not (`tpl011`, Nightbook) shipped with no home at
 * all — `P109-S13-NIGHTBOOKHOME`.
 *
 * ## The rulings it is built on (README §8, round 3, 2026-10-04)
 *
 * - **"Replace, say what changed."** An explicit call overwrites, and answers `was` → `now` for every
 *   field it changed. The plan door's never-overwrite rule (AAQ-005, GAM-021) is untouched: a plan
 *   states what a new app needs; a call naming `htmlTitle` is a request for that title.
 * - **"Home" is the editor's "Make home", not a page.** Richard, correcting the question: *"the
 *   project's 'No home set' warning is when the 'App' component hasn't been set … in the editor we
 *   can right click any component and click 'Set as home'"*. So `home` names a COMPONENT and resolves
 *   it exactly as `makeComponentHome` does (`noodl-editor/…/useComponentActions.ts`): the first
 *   top-level node whose type may be an export root. That is every visual type except `Page`
 *   (`allowAsExportRoot: false`, `noodl-viewer-react/src/nodes/navigation/page.ts`), and a component
 *   instance whose own root is visual — {@link projectVisualPredicate} answers both, kits included.
 *
 * ⚠️ **No registry re-type.** ISL-016 §5.3 proposed marking the home component's registry row `root`.
 * The editor never does that for a component a person makes home — `inferComponentType` gives `root`
 * only to a legacy `%rootcomponent` name — so a door that did would write what the editor does not
 * save (ISL-018's sentence, broken on purpose). `get_project_info` reads the home from `rootNodeId`
 * instead, which is where the editor reads it (`projectmodel.ts`, `json.rootNodeId`).
 *
 * Budget: deferred, appended to the `project` group, **0** resident tokens (the arithmetic every
 * entry in that group records). Its keywords are matched server-side and never sent.
 *
 * @module noodl-mcp/tools/projectSettingsTools
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { projectVisualPredicate } from './author';
import { guarded, jsonResult } from './util';

/**
 * The project settings a person can set in the editor, by the runtime's own declaration
 * (`noodl-viewer-react/src/project-settings.ts`, the ports the editor's Project Settings panel draws).
 * `tests/isl016ProjectSettings.test.ts` compares this table to that file, so a setting added there
 * without a row here fails by name rather than being refused as "unknown" to the first agent that
 * asks for it.
 */
export const PROJECT_SETTING_KINDS: Readonly<Record<string, 'string' | 'boolean' | readonly string[]>> =
  Object.freeze({
    htmlTitle: 'string',
    headCode: 'string',
    navigationPathType: ['hash', 'path'],
    bodyScroll: 'boolean',
    repeaterDisabledWhenUnmounted: 'boolean',
    repeaterCreateComponentsAsync: 'boolean'
  });

/** Node types that are visual but may not be a project's home — the runtime's `allowAsExportRoot: false`. */
const NOT_AN_EXPORT_ROOT = new Set(['Page']);

export interface SetProjectSettingsResponse {
  /** One row per field that changed. Empty when the request matched what was already there. */
  changed: Array<{ field: string; was: unknown; now: unknown }>;
  /** Set when `home` was given: the component and the node the project's home now points at. */
  home?: { component: string; nodeId: string; nodeType: string; candidates: number };
  unchanged?: true;
}

/** Refuse, by name, anything that is not a known setting of the right kind. Writes nothing. */
function checkSettings(settings: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(settings)) {
    const kind = PROJECT_SETTING_KINDS[key];
    if (kind === undefined) {
      throw new ToolError(
        'invalid-argument',
        `"${key}" is not a project setting. Nothing was written. The settings are: ` +
          `${Object.keys(PROJECT_SETTING_KINDS).join(', ')}. The app's name is the separate \`name\` argument, ` +
          'and its home is `home`.'
      );
    }
    const ok = Array.isArray(kind) ? kind.includes(value as string) : typeof value === kind;
    if (!ok) {
      const expected = Array.isArray(kind) ? `one of ${kind.map((k) => `"${k}"`).join(', ')}` : `a ${kind}`;
      throw new ToolError(
        'invalid-argument',
        `Setting "${key}" must be ${expected}; got ${JSON.stringify(value)}. Nothing was written.`
      );
    }
  }
}

/**
 * The node "Make home" would point the project's root at, resolved as the editor resolves it: the
 * first top-level node (no `parent`) whose type may be an export root.
 */
export function resolveHome(
  store: ProjectStore,
  input: string
): { component: string; nodeId: string; nodeType: string; candidates: number } {
  const hit = store.resolve(input);
  if (!hit) {
    const known = Object.keys(store.readRegistry().components).sort();
    throw new ToolError('not-found', `No component "${input}" in this project. Nothing was written.`, {
      knownComponents: known
    });
  }
  const nodes = store.readComponent(hit.key).files.nodes.nodes ?? [];
  const isVisual = projectVisualPredicate(store);
  const roots = nodes.filter((n) => !n.parent && !NOT_AN_EXPORT_ROOT.has(n.type) && isVisual(n.type));
  if (roots.length === 0) {
    throw new ToolError(
      'invalid-argument',
      `"${hit.key}" has no visual node at the top level of its graph, so it can't be the home component ` +
        '(the editor\'s "Make home" refuses it too). The home is normally App, with the Router at its root. ' +
        'Nothing was written.'
    );
  }
  return { component: hit.key, nodeId: roots[0].id, nodeType: roots[0].type, candidates: roots.length };
}

export function registerProjectSettingsTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'set_project_settings',
    {
      title: 'Set project settings',
      description:
        "Set the app's name, its project settings (the browser-tab title `htmlTitle`, `navigationPathType`, " +
        '`bodyScroll`, `headCode`, …) and its home — the component the project starts from, as the ' +
        'editor\'s right-click "Make home" sets it (normally App, which holds the Router). Overwrites what is ' +
        'there and answers what changed, was → now; an unknown setting is refused by name and nothing is ' +
        'written. Without a home the editor shows "No HOME component selected".',
      inputSchema: {
        name: z.string().min(1).optional().describe("The app's name (the project file's `name`)."),
        settings: z
          .record(z.unknown())
          .optional()
          .describe('Project settings by name, e.g. { "htmlTitle": "Olive\'s Island", "navigationPathType": "path" }.'),
        home: z
          .string()
          .optional()
          .describe('The component to make home, by path or legacy name, e.g. "App".')
      }
    },
    guarded((args: { name?: string; settings?: Record<string, unknown>; home?: string }) => {
      const store = binding.require();
      if (args.name === undefined && args.settings === undefined && args.home === undefined) {
        throw new ToolError('invalid-argument', 'Nothing to set: pass `name`, `settings` or `home`.');
      }
      // Every check before the one write, so a refusal writes nothing.
      if (args.settings) checkSettings(args.settings);
      const home = args.home !== undefined ? resolveHome(store, args.home) : undefined;

      const changed = store.writeProjectFields({
        name: args.name,
        settings: args.settings,
        rootNodeId: home?.nodeId
      });
      const payload: SetProjectSettingsResponse = {
        changed,
        ...(home ? { home } : {}),
        ...(changed.length === 0 ? { unchanged: true as const } : {})
      };
      return jsonResult(payload);
    })
  );
}
