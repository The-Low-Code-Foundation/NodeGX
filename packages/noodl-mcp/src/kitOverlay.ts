/**
 * CN-003 slice 2b — installing the project overlay into *this server's* catalog.
 *
 * The reading is `kitExtract/extract.ts`, which knows nothing about any catalog
 * because two pipelines consume it (see its header). This module is the MCP
 * server's half: it holds the session's overlay and hands the node list to
 * `catalog.ts`, so `catalogIndex()` — and therefore validation, `visualRoots`,
 * `get_node_type`, `list_node_types` and the write gate — knows the bound
 * project's own node types.
 *
 * @module noodl-mcp/kitOverlay
 */

import * as fs from 'fs';
import * as path from 'path';

import { setCatalogOverlay } from './catalog';
import { extractProjectOverlay } from './kitExtract/extract';
import type { ProjectKitOverlay } from './kitExtract/extract';

// Re-exported so callers have one import for "the kit overlay" and the split
// between reading and installing stays an implementation detail.
export { extractProjectOverlay, resolveKitExtractEntry } from './kitExtract/extract';
export type { KitFailure, KitSummary, ProjectKitOverlay } from './kitExtract/extract';

/**
 * The overlay this server session is serving, or null before one is installed.
 *
 * Held here rather than in `catalog.ts` because everything but the node list is
 * provenance — which kits loaded, which failed, whether extraction ran at all —
 * and the catalog has no business carrying it. `get_project_info` reads this.
 */
let installed: ProjectKitOverlay | null = null;
/** What `noodl_modules/` held when {@link installed} was extracted: see {@link kitFilesSignature}. */
let installedFrom: string | null = null;

export function currentKitOverlay(): ProjectKitOverlay | null {
  return installed;
}

/**
 * Extract for `projectDir` and make the result the catalog's overlay.
 *
 * Called once when a project is bound — at server construction, and again from
 * `create_project` when that binds a fresh one (BST-002). Idempotent for the
 * same directory: re-installing would re-run the child for an answer we already
 * have, and D3's "only one process ever executes project kit code" is easier to
 * keep true by not doing it twice.
 */
export function installProjectOverlay(projectDir: string): ProjectKitOverlay {
  if (installed && installed.projectDir === projectDir) return installed;
  return refreshProjectOverlay(projectDir);
}

/**
 * CN-006 — re-extract, because this session just changed what kits exist.
 *
 * 🔴 **Found by building the caller.** `installProjectOverlay` is idempotent per
 * directory and runs once at bind, which is right for every reader — but
 * `create_node_kit` writes a kit *into the bound project mid-session*, and the
 * catalog it wrote into had already been computed. The scaffold reported four
 * files written and the agent's very next `get_node_type` answered **"Unknown
 * node type"**. Nothing was broken, nothing logged, and the tool's own success
 * payload was accurate — the kit really was on disk. AC6 is written against
 * exactly this gap: *"generating files is not the feature; the feature is that
 * the node arrives."*
 *
 * A write door knows precisely when the kit set changed, so it calls this at
 * once. ⚠️ It is no longer the only moment (P109 ISL-015, s12): a kit written
 * by anything else is read by {@link ensureProjectOverlayFresh}, keyed on the
 * kit files' mtimes, which is the cache ✅ **D3** itself sanctions. This note
 * used to read D3 as forbidding exactly that.
 *
 * ⚠️ Still one process executing project kit code, as D3 requires — this is the
 * same process, doing it again.
 */
export function refreshProjectOverlay(projectDir: string): ProjectKitOverlay {
  // Read BEFORE extracting: a file written during the extraction then reads as a change next time, never as
  // one the overlay already holds.
  installedFrom = kitFilesSignature(projectDir);
  installed = extractProjectOverlay(projectDir);
  setCatalogOverlay(installed.nodes);
  return installed;
}

/**
 * P109 ISL-015 AC5 (s12) — re-extract when the kit files on disk are not the ones the overlay was read from.
 *
 * 🔴 **The write doors are not the only way a kit arrives.** The docs page's first instruction is "save it as
 * `noodl_modules/my-kit/index.js`", and the stranger round's agent did exactly that with its own file tools. The
 * overlay had been read at bind, so its next `get_node_type` answered "Unknown node type"; it passed
 * `allow_unknown_types`, the door left the kit node out of `visualRoots` (it could not know it was visual), and
 * the deployed page drew nothing while `validate_project` said 0 errors. A person editing a kit in their editor
 * beside a running agent meets the same thing.
 *
 * This is D3's own sanctioned shape ("an in-memory, per-server-session cache keyed on module mtime — never a
 * file"), which the comment above read as forbidding it. It runs on request, not on a schedule: a `readdir` and
 * a `stat` per kit file per tool call, and the extractor only when something changed. Called by `guarded()`
 * before every tool's handler: the catalog tools (`get_node_type`, `list_node_types`) never ask for the project,
 * so a hook on the binding would miss exactly the call that answered "Unknown node type".
 *
 * ⚠️ Top-level files of each `noodl_modules/<kit>/` folder only. A kit whose `index.js` requires a file in a
 * subfolder, edited there alone, is not seen until a top-level file changes too.
 */
export function ensureProjectOverlayFresh(): void {
  // Only an overlay this session installed: the suite clears it, and a cleared server must not grow one behind a
  // test's back. Its own directory is the project, so the caller needs no binding.
  if (!installed) return;
  if (kitFilesSignature(installed.projectDir) === installedFrom) return;
  refreshProjectOverlay(installed.projectDir);
}

/** Every kit folder and the name, size and mtime of each file directly inside it, as one string. */
function kitFilesSignature(projectDir: string): string {
  const modules = path.join(projectDir, 'noodl_modules');
  let kits: fs.Dirent[];
  try {
    kits = fs.readdirSync(modules, { withFileTypes: true });
  } catch {
    return '';
  }
  const parts: string[] = [];
  for (const kit of kits.filter((k) => k.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = path.join(modules, kit.name);
    parts.push(`${kit.name}/`);
    for (const name of fs.readdirSync(dir).sort()) {
      try {
        const st = fs.statSync(path.join(dir, name));
        if (st.isFile()) parts.push(`${kit.name}/${name}:${st.size}:${st.mtimeMs}`);
      } catch {
        // Removed between the listing and the stat: the next call reads the settled folder.
      }
    }
  }
  return parts.join('\n');
}

/** For the suite: forget the session's overlay and put the catalog back to built-ins only. */
export function clearProjectOverlay(): void {
  installed = null;
  installedFrom = null;
  setCatalogOverlay([]);
}
