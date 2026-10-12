/**
 * NSP-019 §3 — where a node's spec and its runtime ever disagreed, with the ruling.
 *
 * The rows are P107's §6 rows as the bug ledger holds them (`dev-docs/bugs/p107-*.md`, one file
 * per bug), keyed by catalog typeName. The editor cannot read `dev-docs/` at run time, so the
 * table is a committed snapshot, `spec-disagreements.json` (hyphenated: webpack's resolve order puts .json before .ts, so a JSON sharing the module's basename would shadow it), written by
 * `packages/noodl-editor/scripts/spec-disagreements.js` and checked by its `--check`: a snapshot
 * nobody re-checks drifts, so the check is in `tests-unit/nsp-019/`.
 *
 * Import-free but for the JSON, so the plain-Node runner reads it as the panel does.
 */
import table from './spec-disagreements.json';

export interface DisagreementRow {
  /** The ledger id — `P107-C10`. */
  id: string;
  title: string;
  /** `open`, `fixed`, `wontfix`, `needs-ruling`, `scheduled` or `duplicate` (scripts/bugs.js). */
  status: string;
  /** The fixing commit, for a fixed row. */
  commit?: string;
  /** The ruling paragraph's head, markdown stripped — a pointer, not the record. */
  ruling?: string;
}

const ROWS = table as Readonly<Record<string, readonly DisagreementRow[]>>;

/** The rows for a node type; `[]` for one whose spec and runtime never disagreed on the ledger. */
export function disagreementsFor(typeName: string): readonly DisagreementRow[] {
  return ROWS[typeName] ?? [];
}

/** Every type with at least one row — for a test's known-firing control. */
export function typesWithDisagreements(): string[] {
  return Object.keys(ROWS);
}

/** One line for the panel's header: "3 times, 2 fixed, 1 open". */
export function summariseDisagreements(rows: readonly DisagreementRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const parts = [...counts.entries()].map(([status, n]) => `${n} ${status}`);
  return `${rows.length === 1 ? 'once' : `${rows.length} times`} (${parts.join(', ')})`;
}
