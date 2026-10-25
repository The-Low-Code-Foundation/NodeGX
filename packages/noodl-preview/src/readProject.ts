/**
 * The project on disk → the legacy project object, whichever format it is in.
 *
 * Out of `loader.ts` (P112-OWN019-TWOLOADERS) so the agent server's `validate_project` can read a project through
 * the same code the preview and `nodegx deploy` read it with, without importing the exporter: this module needs only
 * the io engine. Two readers of one directory drift, and the first thing they disagree about is which one is right.
 *
 * @module noodl-preview/readProject
 */

import * as fs from 'fs';
import * as path from 'path';

import { ProjectImporter, type ImportInput } from '../../noodl-editor/src/editor/src/io/ProjectImporter';
import { normalizeScriptPath } from '../../noodl-runtime/src/scriptfiles';
import type { LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import type {
  ComponentV2File,
  ConnectionsV2File,
  NodesV2File,
  ProjectV2File,
  RegistryV2File,
  RoutesV2File,
  StylesV2File
} from '../../noodl-editor/src/editor/src/schemas';

export type ProjectFormat = 'v2' | 'legacy';

/**
 * P112-S13-DEPLOYBADJSON — a project file that is not JSON is the PROJECT's problem, and the error names the file.
 * A bare `JSON.parse` threw "Unexpected token 'b' … is not valid JSON" with no file in it, and `nodegx deploy` filed it
 * under `write` (a disk problem). Marked by a property, not an Error subclass: `instanceof` on a subclass fails where
 * this is compiled to ES5, and the deploy engine classifies by {@link isProjectFileError}.
 */
const readJson = <T>(file: string): T => {
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // The parser's own sentence already ends "is not valid JSON"; it gains the file it was about.
    const why = text.trim() === '' ? 'the file is empty, so it is not valid JSON' : e instanceof Error ? e.message : String(e);
    throw Object.assign(new Error(`${file.split(path.sep).join('/')}: ${why}`), { projectFile: file });
  }
};

/** Did reading the project fail on one of its files (not valid JSON)? */
export function isProjectFileError(error: unknown): boolean {
  return !!error && typeof (error as { projectFile?: unknown }).projectFile === 'string';
}

/**
 * Classifies the target and returns the project directory.
 * Accepts a v2 directory, a directory containing a legacy `project.json`, or
 * the `project.json` file itself — the same inputs the validator's
 * `loadProject` takes, so a folder that validates can always be previewed.
 */
export function resolveTarget(target: string): { dir: string; format: ProjectFormat } {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new Error(`No such file or directory: ${abs}`);

  const dir = fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);

  if (fs.existsSync(path.join(dir, 'components', '_registry.json')) || fs.existsSync(path.join(dir, 'nodegx.project.json'))) {
    return { dir, format: 'v2' };
  }
  if (fs.existsSync(path.join(dir, 'project.json'))) {
    return { dir, format: 'legacy' };
  }
  throw new Error(
    `${dir} is not a Noodl project — expected components/_registry.json (v2) or project.json (legacy).`
  );
}

/** P109 ISL-005 — `scripts/**.js` as `{ 'engine/world.js': source }`, as the editor's `ScriptFileStore` reads it. */
export function readScriptFiles(dir: string): Record<string, string> {
  const root = path.join(dir, 'scripts');
  const scripts: Record<string, string> = {};
  if (!fs.existsSync(root)) return scripts;
  const walk = (folder: string) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const p = normalizeScriptPath(path.relative(root, full).split(path.sep).join('/'));
        if (p !== undefined) scripts[p] = fs.readFileSync(full, 'utf8');
      }
    }
  };
  walk(root);
  return scripts;
}

/** Reads a v2 directory into the legacy project object, via the io engine. */
function readV2(dir: string): { project: LegacyProject; warnings: string[] } {
  const registry = readJson<RegistryV2File>(path.join(dir, 'components', '_registry.json'));
  const componentsDir = path.join(dir, 'components');

  const components: ImportInput['components'] = {};
  for (const [key, entry] of Object.entries(registry.components ?? {})) {
    const compDir = path.join(componentsDir, entry.path);
    const maybe = <T>(name: string, fallback: T): T =>
      fs.existsSync(path.join(compDir, name)) ? readJson<T>(path.join(compDir, name)) : fallback;
    components[key] = {
      component: maybe('component.json', {} as ComponentV2File),
      nodes: maybe('nodes.json', { nodes: [] } as unknown as NodesV2File),
      connections: maybe('connections.json', { connections: [] } as unknown as ConnectionsV2File)
    };
  }

  const optional = <T>(name: string): T | undefined =>
    fs.existsSync(path.join(dir, name)) ? readJson<T>(path.join(dir, name)) : undefined;

  const result = new ProjectImporter().import({
    project: readJson<ProjectV2File>(path.join(dir, 'nodegx.project.json')),
    registry,
    routes: optional<RoutesV2File>('nodegx.routes.json'),
    styles: optional<StylesV2File>('nodegx.styles.json'),
    scripts: readScriptFiles(dir),
    components
  });

  return { project: result.project, warnings: result.warnings };
}

/**
 * Reads the project on disk into the legacy project object, whichever format it is in.
 *
 * Split out of {@link loadPreview} by HLS-015 so the deploy reads a project through the same code
 * the preview does. Two readers of the same directory drift, and the first thing they disagree
 * about is which of them is right.
 */
export function readLegacyProject(
  dir: string,
  format: ProjectFormat
): { legacy: LegacyProject; warnings: string[] } {
  if (format === 'v2') {
    const read = readV2(dir);
    return { legacy: read.project, warnings: read.warnings };
  }
  return { legacy: readJson<LegacyProject>(path.join(dir, 'project.json')), warnings: [] };
}
