/**
 * POL-006 — what every new project starts with.
 *
 * A project created from the launcher used to contain five JSON files and nothing else: no font,
 * no icon set, no assets of any kind. So the Icon node's picker opened empty, and the `--font-sans`
 * every shipped Text/Button default names resolved to the platform UI stack rather than to anything
 * the project owned. Both creation paths — the manual wizard and the AI scoping wizard — go through
 * `LocalProjectsModel.newProject`, so this is one hook rather than two.
 *
 * ## Why these are `noodl_modules/` and not loose files
 *
 * A module manifest's `browser.stylesheets` is injected as a `<link>` into **both** the editor
 * preview and a deployed build, by the one scanner (`shared/utils/projectmodules.ts`), and
 * `noodl_modules/` ships verbatim in a deploy — it is absent from `build/ignore.ts`'s defaults.
 * That is the only mechanism in the product that gets a stylesheet in front of the app on both
 * surfaces without either surface knowing about it, and it is what makes an `@font-face` and an
 * icon set work offline in a deploy. Loose font files under `fonts/` would list themselves in the
 * property panel's font picker and render nowhere.
 *
 * ## Never overwriting
 *
 * `install` refuses to replace a file that is already there. A downloaded template ships its own
 * assets and may well have opinions about both; merged-but-never-overwriting is the rule POL-006
 * slice 4 settled on, and it is enforced here rather than trusted to callers.
 *
 * ## Loud, never silent
 *
 * A failure to copy the starter assets must not fail project creation — the user asked for a
 * project, and a project without Inter is still a project. But it must not be invisible either, so
 * every skip and every failure is named in the returned report and logged. A picker that is empty
 * because a copy failed looks exactly like a picker that is empty by design, which is the bug this
 * task exists to fix.
 *
 * @module noodl-editor/models/template/starterAssets
 */

import { filesystem, platform } from '@noodl/platform';

import { PRESET_FONT_SOURCE_ROOT, PRESET_FONTS, planPresetFonts, type PresetFontPlan } from '../StylePresets/presetFonts';
import { peekPendingPresetId } from '../StylePresets/StylePresetsModel';
import { STARTER_ASSETS, type StarterAsset } from './starterAssetList';

/**
 * ⚠️ **The list moved and this re-export is why nothing else had to.** VIB-003 needed to read it
 * from outside Electron — the phase-81 Judge photographs a template directory, and a template
 * directory is a real project minus exactly these files — and this module cannot be imported
 * there, because line one reaches `@noodl/platform`. The data now lives in `starterAssetList.ts`,
 * which imports nothing; this file keeps the copying, which is the part that needs a platform.
 *
 * The re-export is not politeness: `shareAsTemplate.ts` derives `SHARED_BY_INSTALLER` from
 * `STARTER_ASSETS` imported *from here*, and `tests-unit/fb-005` asserts that derivation in both
 * directions. Pointing them at a new path would have been a second edit with no meaning.
 */
export { STARTER_ASSETS, type StarterAsset };

export interface StarterAssetsReport {
  /** Project-relative paths written. */
  written: string[];
  /** Project-relative paths left alone because the template already had one. */
  skipped: string[];
  /** `path: reason` for each asset that could not be placed. */
  failed: string[];
}

/**
 * Copy the starter assets into a freshly created project.
 *
 * Resolves nothing and throws nothing: the report is the result. Call it after the template has
 * landed on disk and before the project is loaded, so the scanner sees the modules on the first
 * scan rather than on a later one nobody triggers.
 */
export async function installStarterAssets(projectDirectory: string): Promise<StarterAssetsReport> {
  const report: StarterAssetsReport = { written: [], skipped: [], failed: [] };
  const appPath = platform.getAppPath();

  for (const asset of STARTER_ASSETS) {
    const target = filesystem.join(projectDirectory, asset.to);
    try {
      if (filesystem.exists(target)) {
        report.skipped.push(asset.to);
        continue;
      }
      const source = filesystem.join(appPath, asset.from);
      if (!filesystem.exists(source)) {
        report.failed.push(`${asset.to}: no such source ${asset.from}`);
        continue;
      }
      await filesystem.makeDirectory(filesystem.dirname(target));
      await filesystem.copyFile(source, target);
      report.written.push(asset.to);
    } catch (error) {
      report.failed.push(`${asset.to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (report.failed.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[starter-assets] ${report.failed.length} of ${STARTER_ASSETS.length} could not be placed in ` +
        `${projectDirectory}:\n  ${report.failed.join('\n  ')}`
    );
  }

  return report;
}

/**
 * P88 GAM-016 — copy the chosen preset's typeface into a freshly created project.
 *
 * Beside {@link installStarterAssets} and for the same reasons: before the project loads, so the
 * scanner links the stylesheet on its first scan; never overwriting; and a failure is reported, never
 * thrown. The plan is `planPresetFonts`, shared with the MCP server's `set_style_preset`. The planner
 * is synchronous, so the bytes it compares are read first.
 *
 * `presetId` defaults to the pending preset, **peeked, not consumed**: `StyleTokensModel` consumes it when
 * the project opens, to write the tokens.
 */
export async function installPresetFonts(
  projectDirectory: string,
  presetId: string | null = peekPendingPresetId()
): Promise<StarterAssetsReport> {
  const report: StarterAssetsReport = { written: [], skipped: [], failed: [] };
  if (!presetId) return report;
  const appPath = platform.getAppPath();

  const projectFiles = new Map<string, Uint8Array>();
  const projectDirs = new Map<string, string[]>();
  const shippedFiles = new Map<string, Uint8Array>();
  const readInto = async (map: Map<string, Uint8Array>, key: string, absolute: string) => {
    if (filesystem.exists(absolute)) map.set(key, await filesystem.readBinaryFile(absolute));
  };

  let plan: PresetFontPlan;
  try {
    for (const module of Object.values(PRESET_FONTS)) {
      const dir = `noodl_modules/${module.dir}`;
      const absoluteDir = filesystem.join(projectDirectory, dir);
      if (filesystem.exists(absoluteDir)) {
        projectDirs.set(dir, (await filesystem.listDirectory(absoluteDir)).map((entry) => entry.name));
      }
      for (const file of module.files) {
        await readInto(projectFiles, `${dir}/${file}`, filesystem.join(projectDirectory, dir, file));
        const from = `${PRESET_FONT_SOURCE_ROOT}${module.source}/${file}`;
        await readInto(shippedFiles, from, filesystem.join(appPath, from));
      }
    }
    plan = planPresetFonts(presetId, {
      project: (path) => projectFiles.get(path) ?? null,
      shipped: (path) => shippedFiles.get(path) ?? null,
      listProject: (dir) => projectDirs.get(dir) ?? null
    });
  } catch (error) {
    report.failed.push(`preset fonts: ${error instanceof Error ? error.message : String(error)}`);
    return report;
  }

  report.skipped.push(...plan.present);
  for (const { from, to } of plan.copy) {
    try {
      const source = filesystem.join(appPath, from);
      if (!filesystem.exists(source)) {
        report.failed.push(`${to}: no such source ${from}`);
        continue;
      }
      const target = filesystem.join(projectDirectory, to);
      await filesystem.makeDirectory(filesystem.dirname(target));
      await filesystem.copyFile(source, target);
      report.written.push(to);
    } catch (error) {
      report.failed.push(`${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (report.failed.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[preset-fonts] ${presetId}: could not place\n  ${report.failed.join('\n  ')}`);
  }
  return report;
}
