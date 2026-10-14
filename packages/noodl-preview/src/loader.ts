/**
 * Project → renderable preview build.
 *
 * One pass over the project on disk produces everything the browser needs:
 * the export JSON `renderDeployed` consumes, the lazily-fetched component
 * bundles, and the processed `index.html`. Nothing here re-implements export —
 * it composes the same engines the editor's deploy path uses:
 *
 *   v2 dir ──ProjectImporter──┐
 *                             ├── legacy project JSON ──┬── SUB-006 validation
 *   legacy project.json ──────┘                         │
 *                                                       └── ProjectModel
 *                                                             └── Exporter
 *                                                             └── HtmlProcessor
 *
 * The validation gate runs on the legacy object *before* a ProjectModel is
 * built, so a mid-edit invalid snapshot never reaches the exporter — the
 * caller keeps showing the last good build and overlays the diagnostics.
 *
 * @module noodl-preview/loader
 */

import * as fs from 'fs';
import * as path from 'path';

import type { LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { ProjectModel } from '@noodl-models/projectmodel';
import * as Exporter from '@noodl-utils/exporter';
import { HtmlProcessor } from '@noodl-utils/compilation/build/processors/html-processor';

import { previewExportOptions, projectModelFromLegacy } from './projectExport';
import { readLegacyProject, type ProjectFormat } from './readProject';
import { validateLegacyProject, type PreviewReport } from './validate';

/** Everything the preview server serves for one snapshot of the project. */
export interface PreviewBuild {
  /** Display name, for the CLI banner and the browser tab fallback. */
  projectName: string;
  /**
   * The `window.projectData` object `renderDeployed` consumes.
   *
   * Stays `TSFixme` deliberately (PLAT-004): the editor's `Exporter.exportToJSON`
   * builds this object untyped and returns `TSFixme` itself, so a type here would
   * be an assertion about someone else's return value rather than a real type.
   * It becomes knowable when the exporter is typed.
   */
  exportJson: TSFixme;
  /** Lazily-fetched component bundles, keyed by the id in `componentIndex`. */
  bundles: Record<string, string>;
  /** Processed index.html (modules injected, title/head code/baseUrl resolved). */
  html: string;
  /** Non-fatal notes — dropped components, a guessed root node, etc. */
  warnings: string[];
}

export type PreviewLoad =
  /** Valid project, ready to render. */
  | { status: 'ok'; build: PreviewBuild; report: PreviewReport }
  /** Parsed fine but failed semantic validation — render the overlay instead. */
  | { status: 'invalid'; report: PreviewReport }
  /** Could not be read at all (torn write, bad JSON, no root node). */
  | { status: 'error'; message: string };

export { readLegacyProject, readScriptFiles, resolveTarget, type ProjectFormat } from './readProject';

/**
 * Builds the `ProjectModel` the exporter needs, with a root node resolved.
 *
 * Throws when there is no renderable root at all — which is the one project-content failure that
 * cannot be rendered *around*, because there is nothing to render.
 */
export function buildProjectModel(
  legacy: LegacyProject,
  dir: string
): { project: ProjectModel; warnings: string[] } {
  const built = projectModelFromLegacy(legacy);
  // The HtmlProcessor reads noodl_modules from here, and asset URLs resolve
  // against it — the deploy path sets the same field.
  built.project._retainedProjectDirectory = dir;
  return built;
}

/**
 * HLS-015 — read a project for `nodegx deploy`: the same read, the same validation gate and the
 * same root resolution the preview performs, with every failure raised as one sentence.
 *
 * 🔴 **The validation gate is not decoration here.** The preview shows diagnostics and keeps the
 * last good render, because there is a person watching a browser. A deploy has nobody watching, so
 * the same verdict has to be a refusal: an invalid graph reaching the exporter is how a folder
 * gets written that nothing will tell you about.
 */
export function readProjectForDeploy(
  dir: string,
  format: ProjectFormat
): { project: ProjectModel; warnings: string[] } {
  const { legacy, warnings } = readLegacyProject(dir, format);

  const report = validateLegacyProject(legacy);
  if (report.summary.errors > 0) {
    const named = report.diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .slice(0, 5)
      .map((d) => `  ${d.component}${d.nodeId ? ` › ${d.nodeId}` : ''}: ${d.message}`);
    throw new Error(
      `${dir} has ${report.summary.errors} validation error(s) and was not deployed:\n` +
        named.join('\n') +
        (report.summary.errors > named.length ? `\n  … and ${report.summary.errors - named.length} more` : '')
    );
  }

  const built = buildProjectModel(legacy, dir);
  return { project: built.project, warnings: [...warnings, ...built.warnings] };
}

/**
 * Loads, validates and builds one snapshot of the project.
 *
 * Never throws for project-content reasons: a torn or invalid project comes
 * back as `error`/`invalid` so the watcher loop can show it and keep going.
 */
export async function loadPreview(dir: string, format: ProjectFormat): Promise<PreviewLoad> {
  let legacy: LegacyProject;
  const warnings: string[] = [];

  try {
    const read = readLegacyProject(dir, format);
    legacy = read.legacy;
    warnings.push(...read.warnings);
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }

  // ── SUB-006 gate: never hand an invalid graph to the exporter ──────────────
  const report = validateLegacyProject(legacy);
  if (report.summary.errors > 0) {
    return { status: 'invalid', report };
  }

  // P112-S3-DISPOSE. Released when the build is made: a `ProjectModel` registers listeners on the one `NodeLibrary`
  // (and its components with it) that only `dispose()` removes, so every rebuild made the next one slower —
  // measured on the todo template, 256 → 1,668 ms over eight saves. The build keeps no reference to it.
  let project: ProjectModel | undefined;
  try {
    const built = buildProjectModel(legacy, dir);
    project = built.project;
    warnings.push(...built.warnings);

    const exportJson = Exporter.exportToJSON(project, {
      ...previewExportOptions(legacy.metadata),
      useBundles: true,
      useBundleHashes: true
    });
    if (!exportJson) {
      return { status: 'error', message: 'Export produced nothing — the root component may have been deleted.' };
    }

    // Bundles the runtime will fetch from /noodl_bundles/<id>.json, exactly as
    // deployToFolder writes them — held in memory instead of on disk.
    const bundles: Record<string, string> = {};
    for (const bundleId of Object.keys(exportJson.componentIndex ?? {})) {
      bundles[bundleId] = JSON.stringify(Exporter.exportComponentBundle(project, bundleId, exportJson.componentIndex));
    }

    const template = fs.readFileSync(deployAssetPath('index.html'), 'utf8');
    let html = await new HtmlProcessor(project).process(template, {
      baseUrl: '/',
      indexJsPath: 'index.js'
    });

    // RUN-001: projects on the React 19 runtime load the react19/ pair instead of the
    // vendored 18.3.1 default. Distinct URLs, same filenames on disk.
    if (project.runtimeVersion === 'react19') {
      html = html
        .replace('src="/react.production.min.js"', 'src="/react19/react.production.min.js"')
        .replace('src="/react-dom.production.min.js"', 'src="/react19/react-dom.production.min.js"');
    }

    return {
      status: 'ok',
      report,
      build: {
        projectName: legacy.name ?? path.basename(dir),
        exportJson,
        bundles,
        html,
        warnings
      }
    };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  } finally {
    project?.dispose();
  }
}

// ─── Deploy assets ────────────────────────────────────────────────────────────

/**
 * P112 OWN-011 — the viewer runtime's folder (`deploy/` inside it), for this preview and for `nodegx-deploy`.
 *
 * Two places, the first that holds `deploy/index.json` wins:
 *   1. the editor's build output in a checkout (`npm run build:editor:_viewer`, or `npm run dev`'s watcher), so a
 *      contributor's preview keeps reading the runtime their own build just rewrote;
 *   2. `external/` beside this bundle — the production runtime `npm pack` builds into `dist/external/`
 *      (`scripts/pack-runtime.mjs`). This is the one an installed package has. Before OWN-011 there was no second
 *      place, and `@nodegx/preview` from npm refused every project (P112-S9-NORUNTIME).
 *
 * ⚠️ `../..` from `dist/` and from `src/` both land on `packages/` in a checkout. Installed, it lands inside
 * `node_modules/@noodl/`, where nothing is, and the second place answers. With neither, the first is returned so the
 * refusal names the folder a contributor has to build.
 */
const CHECKOUT_EXTERNAL_DIR = path.resolve(__dirname, '../../noodl-editor/src/external');
export const EXTERNAL_DIR =
  [CHECKOUT_EXTERNAL_DIR, path.join(__dirname, 'external')].find((dir) =>
    fs.existsSync(path.join(dir, 'deploy', 'index.json'))
  ) ?? CHECKOUT_EXTERNAL_DIR;

/** The deployed runtime template + bundle, shared with the real deploy path. Its absence is a first-class error. */
export const DEPLOY_DIR = path.join(EXTERNAL_DIR, 'deploy');

export function deployAssetPath(file: string): string {
  return path.join(DEPLOY_DIR, file);
}

/** Files the deploy index.html references, served verbatim. */
export const DEPLOY_ASSETS = [
  'noodl.deploy.js',
  'react.production.min.js',
  'react-dom.production.min.js',
  'react19/react.production.min.js',
  'react19/react-dom.production.min.js',
  'load_terminator.js',
  'noodl-app.png'
];

export function assertDeployAssets(): void {
  const missing = ['index.html', ...DEPLOY_ASSETS].filter((f) => !fs.existsSync(deployAssetPath(f)));
  if (missing.length) {
    throw new Error(
      `The deployed viewer runtime is missing from ${DEPLOY_DIR} (${missing.join(', ')}).\n` +
        'It is a build artifact, not committed. Build it with:\n' +
        '  npm run build:editor:_viewer'
    );
  }
}
