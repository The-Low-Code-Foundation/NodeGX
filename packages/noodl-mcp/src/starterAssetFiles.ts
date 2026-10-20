/**
 * P112-OWN018-NOSTARTERASSETS — the starter set a new project gets, from the MCP server.
 *
 * The editor copies `STARTER_ASSETS` (Inter, Lucide and the starter imagery) into every project it creates
 * (`installStarterAssets`). `create_project` did not, so every app the npm kit made had no `noodl_modules/` at all,
 * while the guidance told the agent every project has a typeface, icons and pictures; and its first
 * `validate_project` warned that `--font-sans` names Inter, which nothing shipped (P112-S9-FRESHFONT).
 *
 * ## Where the files are
 *
 * From npm: `starter-assets/` beside the server (`dist/starter-assets`, copied by `build-starter-assets-copy.mjs` at
 * prepack), laid out by each asset's project-relative `to` path. In a checkout: the editor package found by walking
 * up, read by each asset's `from` path. `NODEGX_STARTER_ASSETS_DIR` overrides both, in the `to` layout. The editor
 * app's own bundled server has neither yet (its `extraResources` carry the preset fonts only); there the outcome says
 * so, and the project is still made.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STARTER_ASSETS, type StarterAsset } from './editor-deps';

type StarterRoot =
  | { ok: true; source: (asset: StarterAsset) => string; where: 'shipped' | 'checkout' }
  | { ok: false; reason: string };

const MARKER: StarterAsset = STARTER_ASSETS.find((a) => a.to === 'noodl_modules/inter/styles.css')!;

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

export function resolveStarterAssetRoot(fromDir: string = __dirname): StarterRoot {
  const shipped = (root: string): StarterRoot => ({ ok: true, where: 'shipped', source: (a) => path.join(root, a.to) });

  const env = process.env.NODEGX_STARTER_ASSETS_DIR;
  if (env) {
    return isFile(path.join(env, MARKER.to))
      ? shipped(env)
      : { ok: false, reason: `NODEGX_STARTER_ASSETS_DIR points at "${env}", which holds no starter set.` };
  }
  const beside = path.join(fromDir, 'starter-assets');
  if (isFile(path.join(beside, MARKER.to))) return shipped(beside);

  let dir = fromDir;
  for (let i = 0; i < 10; i++) {
    const editor = path.join(dir, 'packages', 'noodl-editor');
    if (isFile(path.join(editor, MARKER.from))) {
      return { ok: true, where: 'checkout', source: (a) => path.join(editor, a.from) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    ok: false,
    reason: 'The starter set (Inter, Lucide icons, starter imagery) was not found beside this server or in a checkout above it.'
  };
}

export interface StarterAssetsOutcome {
  /** Project-relative files written. */
  written: string[];
  /** Project-relative files left alone because the project already had one. */
  skipped: string[];
  /** Set when the set could not be placed, in whole or in part. The project is still made. */
  failed?: string;
}

/** Copy the starter set into `projectDir`. Never throws: the outcome is the result. */
export function installStarterAssets(projectDir: string, fromDir?: string): StarterAssetsOutcome {
  const outcome: StarterAssetsOutcome = { written: [], skipped: [] };
  const root = resolveStarterAssetRoot(fromDir);
  if (!root.ok) return { ...outcome, failed: root.reason };

  const missing: string[] = [];
  for (const asset of STARTER_ASSETS) {
    const target = path.join(projectDir, ...asset.to.split('/'));
    if (fs.existsSync(target)) {
      outcome.skipped.push(asset.to);
      continue;
    }
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(root.source(asset), target);
      outcome.written.push(asset.to);
    } catch (error) {
      missing.push(`${asset.to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (missing.length > 0) outcome.failed = `${missing.length} of ${STARTER_ASSETS.length} not placed: ${missing.join('; ')}`;
  return outcome;
}
