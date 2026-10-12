/**
 * P112 OWN-004 — a v2 project held in memory → the `window.projectData` a deployed page renders.
 *
 * The same steps as the CLI (`../loader.ts`), with the folder taken away: the files arrive as a
 * map of path → text, are read through `@nodegx/project-contract/format`'s store (the rules
 * every writer uses), imported by the editor's `ProjectImporter`, gated by the SUB-006 validator,
 * and exported by the editor's own `Exporter`. **Nothing about the export is re-implemented**:
 * the bundle carries the editor's code, and `tests/in-page-export.test.ts` holds it to the
 * deploy CLI's output on every template.
 *
 * The node library is an argument because the page already has one: the runtime that will
 * render the result registers every node type (kits included) and says what they are through
 * `getNodeLibrary()`, the same JSON the editor receives over its socket.
 *
 * @module noodl-preview/inPage/exportInPage
 */

import './platform';

import { V2ProjectStore, memoryFiles } from '@nodegx/project-contract/format';
import { ProjectImporter, type ImportInput } from '../../../noodl-editor/src/editor/src/io/ProjectImporter';
import { NodeLibrary } from '@noodl-models/nodelibrary/nodelibrary';
import type { ProjectModel } from '@noodl-models/projectmodel';
import * as Exporter from '@noodl-utils/exporter';
import { HtmlProcessor } from '@noodl-utils/compilation/build/processors/html-processor';

import { injectIntoTemplate } from '@nodegx/module-inject';

import { previewExportOptions, projectModelFromLegacy } from '../projectExport';
import { kitTags } from './kits';
import { validateLegacyProject, type PreviewReport } from '../validate';

/**
 * The deployed runtime's own page, as a deploy folder holds it: `index.html` (the template the deploy's
 * `HtmlProcessor` fills) and `index.js` (where `{{#export#}}` becomes `window.projectData`), and the
 * URL the runtime's files are served from, ending in `/`.
 */
export interface DeployTemplate {
  html: string;
  indexJs: string;
  baseUrl: string;
}

export type InPageLoad =
  /** Valid project: `projectData` is ready for `renderDeployed`. */
  | { status: 'ok'; projectData: TSFixme; report: PreviewReport; warnings: string[] }
  /** Parsed fine but failed semantic validation — keep the last render, show the diagnostics. */
  | { status: 'invalid'; report: PreviewReport }
  /** Could not be read at all (no project file, bad JSON, no root). */
  | { status: 'error'; message: string };

/** The files as `ProjectImporter` takes them, read through the format's store. */
export function importInputFromFiles(files: Record<string, string>): ImportInput {
  const store = new V2ProjectStore(memoryFiles(files));
  const project = store.readProjectFile();
  if (!project) throw new Error('No nodegx.project.json — this is not a v2 project.');

  const components: ImportInput['components'] = {};
  for (const key of store.componentKeys()) components[key] = store.readComponent(key).files;

  // P109 ISL-005: `scripts/**.js` as `{ 'engine/world.js': source }`.
  const scripts: Record<string, string> = {};
  for (const [path, text] of Object.entries(files)) {
    if (path.startsWith('scripts/') && path.endsWith('.js')) scripts[path.slice('scripts/'.length)] = text;
  }

  return {
    project,
    registry: store.readRegistry(),
    routes: store.readRoutes(),
    styles: store.readStyles(),
    scripts,
    components
  };
}

let loadedLibrary: unknown;

/** Hands the runtime's node library to the editor's `NodeLibrary`, once per library. */
function useNodeLibrary(nodeLibraryData: unknown): void {
  if (loadedLibrary === nodeLibraryData) return;
  // `NodeLibrary.loadLibrary()` reads `window.NodeLibraryData` — the shape `sendNodeLibrary()` sends.
  (globalThis as unknown as { NodeLibraryData: unknown }).NodeLibraryData = nodeLibraryData;
  NodeLibrary.instance.loadLibrary();
  loadedLibrary = nodeLibraryData;
}

/** A valid snapshot, with the model `HtmlProcessor` reads (title, head code, design tokens). */
type Loaded = Extract<InPageLoad, { status: 'ok' }> & { project: ProjectModel };

/**
 * Exports one snapshot of the project. Never throws for project-content reasons, like the CLI's
 * `loadPreview`: a page mid-edit must be able to say "not finished" and keep what it showed.
 */
export function exportInPage(files: Record<string, string>, nodeLibraryData: unknown): InPageLoad {
  const loaded = load(files, nodeLibraryData);
  if (loaded.status !== 'ok') return loaded;
  const { project, projectData, report, warnings } = loaded;
  project.dispose();
  return { status: 'ok', projectData, report, warnings };
}

function load(files: Record<string, string>, nodeLibraryData: unknown): Loaded | Exclude<InPageLoad, { status: 'ok' }> {
  let legacy;
  try {
    legacy = new ProjectImporter().import(importInputFromFiles(files)).project;
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }

  const report = validateLegacyProject(legacy);
  if (report.summary.errors > 0) return { status: 'invalid', report };

  try {
    useNodeLibrary(nodeLibraryData);
    const { project, warnings } = projectModelFromLegacy(legacy);
    // No bundles: there is no server to fetch them from, and the whole project is already here.
    const projectData = Exporter.exportToJSON(project, { ...previewExportOptions(legacy.metadata), useBundles: false });
    if (!projectData) return { status: 'error', message: 'Export produced nothing — the root component may have been deleted.' };
    return { status: 'ok', projectData, report, warnings, project };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

export type InPagePage =
  | { status: 'ok'; html: string; projectData: TSFixme; report: PreviewReport; warnings: string[] }
  | Exclude<InPageLoad, { status: 'ok' }>;

/** `</script` inside an inline script ends it early; `<\/script` is the same string to the JS parser. */
const inlineScript = (source: string) => `<script>${source.replace(/<\/(script)/gi, '<\\/$1')}</script>`;

/**
 * One snapshot of the project as a complete deployed page: the CLI's `loadPreview` plus its server's
 * `index.js`, with the export inlined instead of served. A page that loads it in a frame is a deploy
 * of the project, and nothing else.
 */
export async function pageFromFiles(
  files: Record<string, string>,
  nodeLibraryData: unknown,
  template: DeployTemplate
): Promise<InPagePage> {
  const loaded = load(files, nodeLibraryData);
  if (loaded.status !== 'ok') return loaded;
  const { project, projectData, report, warnings } = loaded;

  // 🔴 Disposed when the page is made, whatever happens: a `ProjectModel` registers listeners on the one
  // `NodeLibrary` and its components with it, and nothing else ever removes them. Measured without this on the todo
  // template: each export took ~280 ms longer than the last (737 → 3,257 ms over ten).
  try {
    const base = template.baseUrl;
    // The kits first, from the files: `HtmlProcessor` would scan a project folder for them, and a page has none
    // (its scan then finds no placeholders left to fill).
    const withKits = injectIntoTemplate(template.html, kitTags(files, base));
    let html = await new HtmlProcessor(project).process(withKits, { baseUrl: base, indexJsPath: 'index.js' });
    // RUN-001, as the CLI does: a React 19 project loads the react19/ pair.
    if (project.runtimeVersion === 'react19') {
      html = html
        .replace(`src="${base}react.production.min.js"`, `src="${base}react19/react.production.min.js"`)
        .replace(`src="${base}react-dom.production.min.js"`, `src="${base}react19/react-dom.production.min.js"`);
    }
    const indexJs = template.indexJs.replace(/{{#export#}}/g, () => JSON.stringify(projectData));
    const tag = `<script src="${base}index.js"></script>`;
    if (!html.includes(tag)) return { status: 'error', message: `The deploy template no longer loads ${tag}; the page cannot inline the export.` };
    html = html.replace(tag, () => inlineScript(indexJs));
    return { status: 'ok', html, projectData, report, warnings };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  } finally {
    project.dispose();
  }
}
