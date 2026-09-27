/**
 * P88 GAM-016 (P78 D69) — a preset that names a typeface ships the typeface.
 *
 * Playful said Nunito, Enterprise Source Sans, Soft DM Sans, and applying a preset wrote tokens and
 * nothing else, so every visitor read the platform's fallback font. Measured on deployed pages: no
 * face of the three was ever loaded, while a Modern project with the starter's Inter module loaded
 * Inter. R16 (Richard, 2026-09-17): the preset brings its font files (licence beside them, offline,
 * never fetched), and `validate_project` warns when a family token names a face nothing declares.
 *
 * Deliberately **import-free**, like `starterAssetList.ts`: the editor copies with `@noodl/platform`,
 * the MCP server with Node's `fs`, and both must plan the same copy. The plan is data; each caller
 * performs it.
 *
 * ## Switching presets (R16 addendum, Richard, 2026-09-17)
 *
 * Applying a preset removes another preset's font folder **only when every file in it is exactly
 * as shipped** and it holds nothing else. An edited or added-to folder is kept, and the plan says
 * so. A preset's own folder is completed file by file and never overwritten.
 *
 * @module noodl-editor/models/StylePresets/presetFonts
 */

/** One preset's typeface, as a project module. */
export interface PresetFontModule {
  /** The family the preset's `--font-sans` names first, and the `@font-face` family the stylesheet declares. */
  family: string;
  /** Folder under `src/assets/preset-fonts/` in the app. */
  source: string;
  /** Folder under `noodl_modules/` in the project. */
  dir: string;
  /** Every file the folder ships, relative to it. */
  files: readonly string[];
}

/** Where the preset font folders live inside the app (`src/assets` is inside electron-builder's allow-list). */
export const PRESET_FONT_SOURCE_ROOT = 'src/assets/preset-fonts/';

function fontModule(source: string, family: string): PresetFontModule {
  return {
    family,
    source,
    dir: `preset-font-${source}`,
    files: [
      'manifest.json',
      'styles.css',
      'OFL.txt',
      `${source}-latin-wght-normal.woff2`,
      `${source}-latin-ext-wght-normal.woff2`
    ]
  };
}

/**
 * Preset id → its typeface. Modern names Inter, which the starter assets already ship; Minimal names
 * the system stack. `tests-unit/gam-016` checks this table against every preset's `--font-sans`.
 */
export const PRESET_FONTS: Readonly<Record<string, PresetFontModule>> = {
  playful: fontModule('nunito', 'Nunito'),
  enterprise: fontModule('source-sans-3', 'Source Sans 3'),
  soft: fontModule('dm-sans', 'DM Sans')
};

/** What applying a preset does to the project's font folders. Paths are project-relative. */
export interface PresetFontPlan {
  /** Files to copy: `from` is app-relative, `to` project-relative. */
  copy: Array<{ from: string; to: string }>;
  /** This preset's files already in the project, left as they are. */
  present: string[];
  /** Other presets' font folders, exactly as shipped: remove the whole folder. */
  remove: string[];
  /** Other presets' font folders that differ from what shipped: kept, with the reason. */
  kept: Array<{ dir: string; reason: string }>;
}

/**
 * Reads the two sides of the comparison. Every path is relative to its root; `null` means absent.
 * `listProject` lists a project folder's entries (files and directories alike).
 */
export interface PresetFontReader {
  project(path: string): Uint8Array | null;
  shipped(path: string): Uint8Array | null;
  listProject(dir: string): string[] | null;
}

function sameBytes(a: Uint8Array | null, b: Uint8Array | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Why an installed preset font folder is not exactly as shipped, or `null` when it is. */
function differsFromShipped(module: PresetFontModule, reader: PresetFontReader): string | null {
  const projectDir = `noodl_modules/${module.dir}`;
  const entries = reader.listProject(projectDir) ?? [];
  const extra = entries.filter((name) => !module.files.includes(name));
  if (extra.length > 0) return `it holds ${extra.map((n) => `"${n}"`).join(', ')}, which the preset did not ship`;
  for (const file of module.files) {
    const installed = reader.project(`${projectDir}/${file}`);
    if (installed === null) continue; // a deleted file is not an edit anyone could lose
    if (!sameBytes(installed, reader.shipped(`${PRESET_FONT_SOURCE_ROOT}${module.source}/${file}`))) {
      return `"${file}" has been changed`;
    }
  }
  return null;
}

/**
 * Plan the font side of applying `presetId` (any id, including one with no typeface of its own).
 */
export function planPresetFonts(presetId: string, reader: PresetFontReader): PresetFontPlan {
  const plan: PresetFontPlan = { copy: [], present: [], remove: [], kept: [] };
  const wanted = PRESET_FONTS[presetId];

  for (const [id, module] of Object.entries(PRESET_FONTS)) {
    if (id === presetId) continue;
    const projectDir = `noodl_modules/${module.dir}`;
    if (reader.listProject(projectDir) === null) continue;
    const reason = differsFromShipped(module, reader);
    if (reason === null) plan.remove.push(projectDir);
    else plan.kept.push({ dir: projectDir, reason });
  }

  if (wanted) {
    for (const file of wanted.files) {
      const to = `noodl_modules/${wanted.dir}/${file}`;
      if (reader.project(to) !== null) plan.present.push(to);
      else plan.copy.push({ from: `${PRESET_FONT_SOURCE_ROOT}${wanted.source}/${file}`, to });
    }
  }

  return plan;
}
