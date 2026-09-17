/**
 * P88 GAM-016 — perform a preset's font plan on disk, from the MCP server.
 *
 * The plan is the editor's (`planPresetFonts`); this file only finds the shipped files and copies or
 * removes. The editor does the same with `@noodl/platform` in `installPresetFonts`.
 *
 * ## Where the shipped fonts are
 *
 * In a checkout, `packages/noodl-editor/src/assets/preset-fonts`, found by walking up from this file
 * (`src/` under ts-jest, `dist/` in the bundle), the way `libraryShelf.ts` finds `library/`. In the
 * installed app the server runs from `resources/noodl-mcp/`, outside the app archive, so
 * electron-builder copies the folder beside it (`extraResources` → `noodl-mcp/preset-fonts`).
 * `NODEGX_PRESET_FONTS_DIR` overrides both.
 */

import * as fs from 'fs';
import * as path from 'path';

import { planPresetFonts, PRESET_FONT_SOURCE_ROOT, type PresetFontPlan } from './editor-deps';

export type PresetFontRoot = { ok: true; root: string } | { ok: false; reason: string };

function looksLikeFontRoot(dir: string): boolean {
  try {
    return fs.statSync(path.join(dir, 'nunito', 'styles.css')).isFile();
  } catch {
    return false;
  }
}

export function resolvePresetFontRoot(fromDir: string = __dirname): PresetFontRoot {
  const env = process.env.NODEGX_PRESET_FONTS_DIR;
  if (env) {
    return looksLikeFontRoot(env)
      ? { ok: true, root: env }
      : { ok: false, reason: `NODEGX_PRESET_FONTS_DIR points at "${env}", which holds no preset font folders.` };
  }
  const beside = path.join(fromDir, 'preset-fonts');
  if (looksLikeFontRoot(beside)) return { ok: true, root: beside };
  let dir = fromDir;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'packages', 'noodl-editor', PRESET_FONT_SOURCE_ROOT);
    if (looksLikeFontRoot(candidate)) return { ok: true, root: candidate };
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    ok: false,
    reason: 'The preset font files were not found beside this server or in a checkout above it. Set NODEGX_PRESET_FONTS_DIR.'
  };
}

function readOrNull(file: string): Uint8Array | null {
  try {
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

export interface PresetFontOutcome {
  /** Project-relative files written. */
  added: string[];
  /** Project-relative folders removed: another preset's typeface, exactly as shipped. */
  removed: string[];
  /** Another preset's typeface folder kept because it was changed, with the reason. */
  kept: Array<{ dir: string; reason: string }>;
  /** Set when the files could not be placed; the tokens are still written. */
  failed?: string;
}

/** Apply `presetId`'s font plan to `projectDir`. Never throws: a failure is reported in the outcome. */
export function applyPresetFonts(projectDir: string, presetId: string, fromDir?: string): PresetFontOutcome {
  const located = resolvePresetFontRoot(fromDir);
  const shippedPath = (p: string) => (located.ok ? path.join(located.root, p.slice(PRESET_FONT_SOURCE_ROOT.length)) : '');

  let plan: PresetFontPlan;
  try {
    plan = planPresetFonts(presetId, {
      project: (p) => readOrNull(path.join(projectDir, p)),
      shipped: (p) => (located.ok ? readOrNull(shippedPath(p)) : null),
      listProject: (p) => {
        try {
          return fs.readdirSync(path.join(projectDir, p));
        } catch {
          return null;
        }
      }
    });
  } catch (error) {
    return { added: [], removed: [], kept: [], failed: error instanceof Error ? error.message : String(error) };
  }

  const outcome: PresetFontOutcome = { added: [], removed: [], kept: plan.kept };
  // Unlocated, every shipped read is null, so no installed folder compares equal and `remove` is
  // already empty: nothing a person may have edited can be deleted on a guess.
  if (!located.ok) return plan.copy.length > 0 ? { ...outcome, failed: located.reason } : outcome;

  try {
    for (const dir of plan.remove) {
      fs.rmSync(path.join(projectDir, dir), { recursive: true, force: true });
      outcome.removed.push(dir);
    }
    for (const { from, to } of plan.copy) {
      const target = path.join(projectDir, to);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(shippedPath(from), target, fs.constants.COPYFILE_EXCL);
      outcome.added.push(to);
    }
  } catch (error) {
    outcome.failed = error instanceof Error ? error.message : String(error);
  }
  return outcome;
}
