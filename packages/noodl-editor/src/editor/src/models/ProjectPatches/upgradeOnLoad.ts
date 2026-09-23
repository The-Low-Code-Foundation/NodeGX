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

import { convertTextStylesToTokens, describeTextStyleConversion, TextStyleProjectLike } from './textStylesToTokens';

export interface UpgradeReportSection {
  /** A heading a person can act on, e.g. "Text styles are now typography tokens". */
  title: string;
  lines: string[];
}

const UPGRADES: { title: string; run: (content: TextStyleProjectLike) => string[] }[] = [
  {
    title: 'Text styles are now typography tokens',
    run: (content) => describeTextStyleConversion(convertTextStylesToTokens(content))
  }
];

/** Upgrade `content` in place. Returns one section per upgrade that changed something. */
export function upgradeOnLoad(content: TextStyleProjectLike): UpgradeReportSection[] {
  const sections: UpgradeReportSection[] = [];
  for (const upgrade of UPGRADES) {
    const lines = upgrade.run(content);
    if (lines.length > 0) sections.push({ title: upgrade.title, lines });
  }
  return sections;
}

/** The toast's body: every section, as sentences. One toast, however many upgrades ran. */
export function describeUpgradeReport(sections: UpgradeReportSection[]): { title: string; message: string } {
  return {
    title: 'This project was upgraded for NodeGX 0.3',
    message: sections.map((s) => `${s.title}. ${s.lines.join(' ')}`).join(' ')
  };
}
