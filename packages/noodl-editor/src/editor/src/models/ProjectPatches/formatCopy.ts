/**
 * P112 OWN-013 — the copy made before a project's format moves forward.
 *
 * Richard, 2026-10-11 (R17, "Make a copy"): a project an older editor saved is copied to
 * `<project>.before-0.4` before this editor converts it. The conversion is the format step 4 → 5
 * (P109 ISL-018, the run-on-value-change migration): the app behaves as before, but once saved,
 * 0.3.0 refuses the project (P112-S11-FORMATSKEW). On a Mac the update arrives on its own, so the
 * person may never have chosen it. 0.3.0's own upgrade made `<project>.before-0.3` for the same
 * reason (P100 R10); this is that mechanism, triggered by the format instead of the text styles.
 *
 * Pure, so the decision is graded in `tests-unit/own-013`. `projectFromDirectory` does the copy.
 */

export const FORMAT_COPY_SUFFIX = '.before-0.4';

/**
 * Is a copy owed before opening a project whose file says `version`?
 *
 * A file with no version is the oldest format (the upgrader chain starts at 0), so it is owed one.
 * Anything at or above `supported` is not converted. Above it is refused, not converted.
 */
export function owesFormatCopy(version: unknown, supported: number): boolean {
  const v = Number(version ?? 0);
  return Number.isFinite(v) && v < supported;
}

/** The note shown once the copy is made. */
export function describeFormatCopy(backupPath: string): { title: string; message: string } {
  return {
    title: 'This project was updated for NodeGX 0.4',
    message:
      `NodeGX 0.4 saves it in a newer format, which NodeGX 0.3 can't open. ` +
      `A copy of the project as it was is at ${backupPath}.`
  };
}

/** The error shown when the copy can't be made. The project is not opened. */
export function describeFormatCopyFailure(reason: string): string {
  return (
    `NodeGX 0.4 updates this project to a newer format, and copies it first. ` +
    `The copy couldn't be made, so the project wasn't opened and nothing in it was changed. (${reason})`
  );
}
