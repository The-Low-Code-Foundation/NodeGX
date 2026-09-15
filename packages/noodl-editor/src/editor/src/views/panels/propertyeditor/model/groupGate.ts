/**
 * CHR-008 §3.3, R8 — a switched-off group says so once.
 *
 * Before this, every row a `dynamicports` condition switched off carried its own sentence and its own
 * `Show …` link (FB-021). On a Group with Shadow Enabled off that is six copies of *"… applies when
 * Shadow Enabled is on. Show Shadow Enabled"* under one switch — CHR-001 counted them. R8 (Richard,
 * 2026-09-15): **one line per switched-off group + `Turn on`; rows dimmed, not hidden.**
 *
 * 🔴 **Richard's condition on R8, the same day:** *"as long as we don't have another 'same error repeated on 5
 * lines successively' problem."* The first build merged only rows with an IDENTICAL condition and left the rest
 * per-row — and a census over the shipped catalog (`tests-unit/chr-008/repeatedSentences.test.ts`) found 13
 * groups still printing sentences on adjacent rows: `Icon` ×7, `Scroll` ×5, `Border Style` ×10. So the rule
 * is now **a group with two or more switched-off rows prints exactly one line, whatever their conditions.**
 *
 * This module decides *what that line says*, from CHR-007's descriptors and the clauses `reasonsForGatedPorts`
 * already worded. It does not evaluate a condition: `applyPortConditionsFilterForNode` decided what is off.
 *
 * ## The line, in order of preference
 *
 * 1. **Every row has the same condition** — the row sentence, once: *"Offset X, … and Color apply once Shadow
 *    Enabled is on."*
 * 2. **All AND (or single-clause), and some clauses are in every row** — those clauses are NECESSARY for every
 *    row, so the line says *"… apply only when Enable Icon is on."* True of every row; the rows that need more
 *    stay dimmed after the press, and the next render words what is left.
 * 3. **All OR, and some clauses are in every row** — any one of those is SUFFICIENT for every row, so the line
 *    says *"… apply when Border Style is Solid, Dashed or Dotted."* True of every row, not the whole story for a
 *    side whose own style also switches it on; that row's exact sentence is its tooltip.
 * 4. **Nothing shared** — *"… are switched off by Border Style and Layout."*, naming the controls.
 *
 * Row labels and control labels are de-duplicated: five sides' `Border Color` rows are one `Border Color`.
 *
 * ## `Turn on`
 *
 * Only when the line's condition is one clause `<boolean port> = true` — the case where one press has exactly
 * one meaning. Everything else keeps FB-021's `Show <control>` travel.
 *
 * Only rows `renderParams` decorates count: a row inside a `TabGroup` (`tab`), a child row (`parent`) or a
 * popout (`popout`) is drawn by its host and carries no gate decoration.
 */
import type { LabelledClause, PortGateReason } from '@noodl-models/nodelibrary/portGateReason';
import { phraseCondition } from '@noodl-models/nodelibrary/portGateReason';

import type { RowDescriptor } from './describeRows';

export interface GroupGate {
  /** The English group label the rows share. */
  group: string;
  /** The control `Show …` travels to, and `Turn on` sets. */
  gatePortName: string;
  gateLabel: string;
  /** The rows the line stands in for, in row order. Their own sentences are not drawn. */
  portNames: string[];
  /** `Offset X, Offset Y and Color apply once Shadow Enabled is on.` */
  sentence: string;
  /** One press of a button switches the line's condition on: set `gatePortName` to `true`. */
  turnOn: boolean;
}

/** `a`, `a and b`, `a, b and c`. */
function listOf(labels: readonly string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function unique(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

const clauseKey = (clause: LabelledClause) => `${clause.param}|${clause.op}|${clause.value ?? ''}`;

/** Whether `renderParams` draws this row's gate decoration itself. */
function isDecoratedByRenderParams(row: RowDescriptor): boolean {
  return !row.tab && !row.parent && !row.popout;
}

/** The clauses present in every reason, in the first reason's order — or none when any reason lacks clauses. */
function sharedClauses(reasons: readonly PortGateReason[]): LabelledClause[] {
  if (reasons.some((reason) => !reason.clauses || !reason.clauses.length)) return [];
  const [first, ...rest] = reasons;
  return first.clauses.filter((clause) =>
    rest.every((reason) => reason.clauses.some((other) => clauseKey(other) === clauseKey(clause)))
  );
}

function isOneBooleanPress(clauses: readonly LabelledClause[]): boolean {
  return clauses.length === 1 && Boolean(clauses[0].isBoolean) && clauses[0].op === '=' && clauses[0].value === 'true';
}

/**
 * The line for one group's switched-off rows (two or more), or `undefined` when there is nothing honest to say.
 */
function lineFor(group: string, gated: readonly RowDescriptor[]): GroupGate | undefined {
  const reasons = gated.map((row) => row.switchedOff);
  const labels = unique(gated.map((row) => row.displayName));
  const plural = labels.length !== 1;
  const rows = listOf(labels);
  const base = { group, portNames: gated.map((row) => row.name) };

  // 1. One condition for every row.
  const first = reasons[0];
  if (typeof first.condition === 'string' && first.condition !== '' && reasons.every((r) => r.condition === first.condition)) {
    const turnOn = Boolean(first.turnOn);
    return {
      ...base,
      gatePortName: first.gatePortName,
      gateLabel: first.gateLabel,
      sentence: `${rows} ${plural ? 'apply' : 'applies'} ${turnOn ? 'once' : 'when'} ${first.condition}.`,
      turnOn
    };
  }

  // 2 and 3. What every row shares, worded by the connective that makes it true of each.
  // A one-clause condition reads the same under either connective, so it joins whichever the others use.
  const connectives = unique(reasons.filter((r) => !(r.clauses && r.clauses.length === 1)).map((r) => r.connective || ''));
  const found = connectives.length === 0 ? 'and' : connectives.length === 1 ? connectives[0] : '';
  const connective: 'and' | 'or' | undefined = found === 'and' || found === 'or' ? found : undefined;
  const shared = connective ? sharedClauses(reasons) : [];
  if (connective && shared.length) {
    const turnOn = connective === 'and' && isOneBooleanPress(shared);
    const words = phraseCondition(shared, connective);
    // `Show …` goes to a shared on/off switch when there is one: on a Group, Scroll's rows share
    // `Layout is not None` (already true on any laid-out Group) and `Enable Scroll is on` (the one a person needs).
    const target = shared.find((clause) => isOneBooleanPress([clause])) || shared[0];
    return {
      ...base,
      gatePortName: target.param,
      gateLabel: target.label,
      sentence:
        connective === 'and'
          ? `${rows} ${plural ? 'apply' : 'applies'} only when ${words}.`
          : `${rows} ${plural ? 'apply' : 'applies'} when ${words}.`,
      turnOn
    };
  }

  // 4. Nothing shared — name the controls.
  const controls = unique(reasons.map((r) => r.gateLabel).filter(Boolean));
  if (!controls.length) return undefined;
  return {
    ...base,
    gatePortName: first.gatePortName,
    gateLabel: first.gateLabel,
    sentence: `${rows} ${plural ? 'are' : 'is'} switched off by ${listOf(controls)}.`,
    turnOn: false
  };
}

/**
 * The groups that draw one line instead of per-row sentences, keyed by group label.
 *
 * A group absent from the map has fewer than two switched-off rows and draws what it drew before CHR-008.
 */
export function groupGatesFor(rows: readonly RowDescriptor[]): Map<string, GroupGate> {
  const byGroup = new Map<string, RowDescriptor[]>();
  for (const row of rows) {
    if (!row.switchedOff || !isDecoratedByRenderParams(row)) continue;
    const list = byGroup.get(row.group);
    if (list) list.push(row);
    else byGroup.set(row.group, [row]);
  }

  const gates = new Map<string, GroupGate>();
  for (const [group, gated] of byGroup) {
    if (gated.length < 2) continue;
    const line = lineFor(group, gated);
    if (line) gates.set(group, line);
  }
  return gates;
}
