/**
 * P100 UPG-002 — where a 0.2.x project is upgraded when it opens, and where it says so.
 *
 * **R2**, ruled 2026-09-22: *"Visible report at load, migrate where recoverable."* Every break
 * 0.3.0 ships owes both halves, so they live in one place: each upgrade below rewrites the loaded
 * content and returns the sentences a person reads, and `projectFromDirectory` shows them on screen.
 * 🔴 A `console.warn` does not meet R2 — a person opening their project never sees the console.
 *
 * Runs beside `applyPatches`, before `ProjectModel.fromJSON`, and not inside it: `applyPatches` is
 * also the git merge driver's normaliser, and an upgrade that mints tokens has no business running
 * on three sides of a merge.
 *
 * To add the next upgrade: write it pure over the loaded content, idempotent, returning no lines
 * when it changed nothing, and add it to {@link UPGRADES}.
 */

import {
  convertTextStylesToTokens,
  describeTextStyleConversion,
  FONT_MODULE_DIR,
  fontFaceStylesheet,
  fontModuleManifest,
  TextStyleProjectLike
} from './textStylesToTokens';

export interface UpgradeReportSection {
  /** A heading a person can act on, e.g. "Text styles are now typography tokens". */
  title: string;
  lines: string[];
}

/**
 * A file an upgrade needs beside the project, project-relative. `merge` receives what is there
 * already (undefined when nothing is) so a second upgrade adds to a file instead of replacing it.
 */
export interface UpgradeFile {
  path: string;
  merge: (existing: string | undefined) => string;
}

export interface UpgradeResult {
  sections: UpgradeReportSection[];
  files: UpgradeFile[];
}

const UPGRADES: { title: string; run: (content: TextStyleProjectLike) => { lines: string[]; files: UpgradeFile[] } }[] =
  [
    {
      title: 'Text styles are now typography tokens',
      run: (content) => {
        const report = convertTextStylesToTokens(content);
        const faces = report.fontFaces;
        return {
          lines: describeTextStyleConversion(report),
          files:
            faces.length === 0
              ? []
              : [
                  { path: `${FONT_MODULE_DIR}/styles.css`, merge: (existing) => fontFaceStylesheet(existing, faces) },
                  { path: `${FONT_MODULE_DIR}/manifest.json`, merge: (existing) => existing ?? fontModuleManifest() }
                ]
        };
      }
    }
  ];

/** Upgrade `content` in place. Returns one section per upgrade that changed something, and its files. */
export function upgradeOnLoad(content: TextStyleProjectLike): UpgradeResult {
  const result: UpgradeResult = { sections: [], files: [] };
  for (const upgrade of UPGRADES) {
    const { lines, files } = upgrade.run(content);
    if (lines.length > 0) result.sections.push({ title: upgrade.title, lines });
    result.files.push(...files);
  }
  return result;
}

/** The toast's body: every section, as sentences. One toast, however many upgrades ran. */
export function describeUpgradeReport(
  sections: UpgradeReportSection[],
  backupPath?: string
): { title: string; message: string } {
  const body = sections.map((s) => `${s.title}. ${s.lines.join(' ')}`);
  if (backupPath) body.push(`A copy of the project as it was is at ${backupPath}.`);
  return { title: 'This project was upgraded for NodeGX 0.3', message: body.join(' ') };
}
