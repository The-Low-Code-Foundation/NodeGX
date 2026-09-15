/**
 * CHR-008 §3.3, R8 — a switched-off group says so once.
 *
 * Before this, every row a `dynamicports` condition switched off carried its own sentence and its own
 * `Show …` link (FB-021). On a Group with Shadow Enabled off that is six copies of *"… applies when
 * Shadow Enabled is on. Show Shadow Enabled"* under one switch — CHR-001 counted them. R8 (Richard,
 * 2026-09-15): **one line per switched-off group + `Turn on`; rows dimmed, not hidden.**
 *
 * This module decides *which* groups get the one line, from CHR-007's descriptors and nothing else. It
 * does not evaluate a condition: `applyPortConditionsFilterForNode` decided what is off, and
 * `reasonsForGatedPorts` put words to it. Import-free apart from types, so `tests-unit` grades it
 * against the shipped catalog.
 *
 * ## When a group gets one line, and when it keeps per-row sentences
 *
 * - **Every** switched-off row the group draws is switched off by the **same** control under the
 *   **same** condition. A group whose rows answer to two different switches cannot be summarised by a
 *   sentence naming one of them, so it falls back to per-row — CHR-008 §3.3's rule.
 * - **At least two** such rows. One gated row already says so once.
 * - Only rows `renderParams` decorates count: a row inside a `TabGroup` (`tab`), a child row
 *   (`parent`) or a popout (`popout`) is drawn by its host and carries no gate decoration today, so
 *   letting it into the count would summarise a row whose own sentence was never on screen.
 *
 * ## `Turn on`
 *
 * Offered only when the condition is one clause `<boolean port> = true` (`PortGateReason.turnOn`) —
 * the case where pressing a button has exactly one meaning. An enum gate (`Size Mode is Explicit or
 * Content Height`) has several values that would switch the rows on, and choosing one for the author
 * would be a decision the panel has no business making; those keep FB-021's `Show <control>` travel.
 */
import type { RowDescriptor } from './describeRows';

export interface GroupGate {
  /** The English group label the rows share. */
  group: string;
  /** The control whose value switched the rows off. */
  gatePortName: string;
  gateLabel: string;
  /** The rows the line stands in for, in row order. Their own sentences are not drawn. */
  portNames: string[];
  /** `Offset X, Offset Y and Color apply once Shadow Enabled is on.` */
  sentence: string;
  /** Present when one press of a button switches the rows back on: set `gatePortName` to `true`. */
  turnOn: boolean;
}

/** `a`, `a and b`, `a, b and c`. */
function listOf(labels: readonly string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** Whether `renderParams` draws this row's gate decoration itself. */
function isDecoratedByRenderParams(row: RowDescriptor): boolean {
  return !row.tab && !row.parent && !row.popout;
}

/**
 * The groups that draw one line instead of per-row sentences, keyed by group label.
 *
 * A group absent from the map draws exactly what it drew before CHR-008.
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

    const first = gated[0].switchedOff;
    // A reason written before CHR-008 has no `condition`; it cannot be summarised, so it keeps its row.
    if (typeof first.condition !== 'string' || first.condition === '') continue;

    const shared = gated.every(
      (row) =>
        row.switchedOff.gatePortName === first.gatePortName &&
        row.switchedOff.condition === first.condition &&
        Boolean(row.switchedOff.turnOn) === Boolean(first.turnOn)
    );
    if (!shared) continue;

    const turnOn = Boolean(first.turnOn);
    const labels = gated.map((row) => row.displayName);
    const verb = labels.length === 1 ? 'applies' : 'apply';

    gates.set(group, {
      group,
      gatePortName: first.gatePortName,
      gateLabel: first.gateLabel,
      portNames: gated.map((row) => row.name),
      sentence: `${listOf(labels)} ${verb} ${turnOn ? 'once' : 'when'} ${first.condition}.`,
      turnOn
    });
  }

  return gates;
}
