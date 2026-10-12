/**
 * Legacy project → the `window.projectData` a deployed page renders, with no file system.
 *
 * Split out of `loader.ts` by P112 OWN-004 so the same steps run in two places: the CLI, which
 * reads a folder, and a page, which holds the project's files in memory (`./inPage`). Nothing
 * here imports `fs` or `path`; the loader adds the folder-only parts (assets, the HTML template,
 * bundles served from disk).
 *
 * @module noodl-preview/projectExport
 */

import type { LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { ProjectModel } from '@noodl-models/projectmodel';
import type { ExportToJSONOptions } from '@noodl-utils/exporter/json';

/**
 * What every preview export passes, whatever reads the result.
 *
 * `environment: null` blanks the cloud-services metadata: a local preview must never inherit a
 * deployed backend by accident. Cloud components are the backend's, not the page's.
 */
export const PREVIEW_EXPORT_OPTIONS: ExportToJSONOptions = {
  environment: null,
  ignoreComponentFilter: (c) => !c.name.startsWith('/#__cloud__/')
};

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i;

/**
 * The export options for one project: {@link PREVIEW_EXPORT_OPTIONS}, except that a backend on THIS machine is kept.
 *
 * P112-S14-NOBACKEND. `provision_backend` binds a project to a local backend (`http://127.0.0.1:<port>`), and on the
 * npm path that backend is the only one the app has. Blanked, every Record, Query and Cloud Function in the preview
 * said "This project has no backend configured" while the backend was up. A loopback endpoint can't be someone's
 * deployed backend reached by accident, which is what the blanking is for; anything else is still blanked.
 */
export function previewExportOptions(metadata: Record<string, unknown> | undefined): ExportToJSONOptions {
  const cs = metadata?.cloudservices as { instanceId?: string; endpoint?: string; appId?: string; type?: string } | undefined;
  if (!cs || typeof cs.endpoint !== 'string' || !LOOPBACK.test(cs.endpoint)) return PREVIEW_EXPORT_OPTIONS;
  return {
    ...PREVIEW_EXPORT_OPTIONS,
    environment: {
      id: cs.instanceId,
      appId: cs.appId ?? cs.instanceId ?? '',
      url: cs.endpoint,
      type: cs.type === 'external' ? 'external' : 'nodegx'
    }
  };
}

/**
 * Picks a root node when the project file does not name one.
 *
 * `ProjectModel.fromJSON` resolves `rootNodeId` and `rootComponent`; projects
 * written by the editor always carry one. Projects authored from outside (an
 * agent writing v2 files, the MCP server) frequently do not, and the exporter
 * returns `undefined` without a root — a blank page with no explanation. So we
 * guess, using the editor's own predicate (`allowAsExportRoot`, via
 * `setRootComponent`), and tell the user we guessed.
 */
function resolveRootNode(project: ProjectModel): string | null {
  const components = project.getComponents();
  const byName = (name: string) => components.find((c) => c.name === name);

  const candidates = [byName('/%rootcomponent'), byName('/App'), byName('/#App'), ...components].filter(
    Boolean
  ) as ReturnType<typeof byName>[];

  for (const component of candidates) {
    project.setRootComponent(component);
    if (project.getRootNode()) {
      return `No root node declared — previewing "${component.name}". ` +
        `Set "rootNodeId" in the project file to pin it.`;
    }
  }
  return null;
}

/**
 * Builds the `ProjectModel` the exporter needs, with a root node resolved.
 *
 * Throws when there is no renderable root at all — which is the one project-content failure that
 * cannot be rendered *around*, because there is nothing to render.
 */
export function projectModelFromLegacy(legacy: LegacyProject): { project: ProjectModel; warnings: string[] } {
  const warnings: string[] = [];
  const project = ProjectModel.fromJSON(legacy);

  if (!project.getRootNode()) {
    const note = resolveRootNode(project);
    if (!note) {
      throw new Error(
        'No renderable root node found. The project has no "rootNodeId" and no component ' +
          'with a node that can be an export root (a Group, Page Router, …).'
      );
    }
    warnings.push(note);
  }
  return { project, warnings };
}
