/**
 * FB-018 AC2 — every property row class either chips or has a recorded reason.
 *
 * 🔴 THE POPULATION COMES FROM `Ports.ts`, NOT FROM THE TABLE UNDER TEST. `Ports.WIDGET_CLASSES`
 * is what actually decides which row class a port gets, so it is parsed out of the real file
 * here. A sweep that took its list of classes from `connectedRowPolicy.ts` would be checking
 * that file against itself and would pass forever — including on the exact failure this task
 * exists to prevent, which is a row class nobody thought about.
 *
 * CHR-007 turned the old `if (isOf…()) return X;` chain into a registry, and retargeting this
 * parse found a hole the old one had: its regex never matched the two early `editorType`
 * returns, so `LogicBuilderWorkspaceType` and `LogicBuilderHiddenType` were dispatched and never
 * in the population. The map is also checked against `WIDGET_RULES` in both directions — a widget
 * the dispatch can return with no class, or a class no rule can reach, is a red here.
 *
 * `Ports.ts` itself cannot load in this runner (it reaches the project model), which is why the
 * map is read as text. `WIDGET_RULES` imports nothing, so it is read for real.
 *
 * ⚠️ WHAT THIS FILE DOES NOT DO. It grades the RECORD, not the RENDERING. A `chip` entry
 * here passing proves somebody wrote `chip`; `bindingChipRows.test.tsx` is what renders
 * the components and proves a chip appears. Both are needed and neither substitutes: this
 * one catches the row nobody decided about, that one catches the decision that was never
 * implemented.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  CONNECTED_ROW_POLICY,
  DEFERRED_ROW_CLASSES
} from '../../src/editor/src/views/panels/propertyeditor/DataTypes/connectedRowPolicy';
import { WIDGET_RULES } from '../../src/editor/src/views/panels/propertyeditor/model/widgets';

const PORTS_TS = path.join(
  __dirname,
  '../../src/editor/src/views/panels/propertyeditor/DataTypes/Ports.ts'
);

/** `Ports.WIDGET_CLASSES`, read out of the real file: widget id → row class name. */
function widgetClassMap(): Record<string, string> {
  const source = fs.readFileSync(PORTS_TS, 'utf8');
  const block = /WIDGET_CLASSES:\s*Record<WidgetId,\s*TSFixme>\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(source);
  const map: Record<string, string> = {};
  if (!block) return map;
  for (const m of block[1].matchAll(/^\s*(\w+):\s*(\w+),?\s*$/gm)) map[m[1]] = m[2];
  return map;
}

/**
 * The class names the dispatch can return.
 *
 * ⚠️ Deduplicated: two widgets may share a row class, which this codebase does on purpose, and
 * asserting on the raw length would break the day it happens again.
 */
function dispatchedRowClasses(): string[] {
  return Array.from(new Set(Object.values(widgetClassMap()))).sort();
}

describe('FB-018 — the connected-row policy covers every row class', () => {
  // The population is only as good as the map it is read from. A widget the registry can return
  // with no class would be a port with no row; a class no rule reaches is dead weight that would
  // still demand a policy entry. Both directions, against the registry itself.
  it('maps exactly the widgets the registry can return', () => {
    const mapped = Object.keys(widgetClassMap()).sort();
    const ruled = Array.from(new Set(WIDGET_RULES.map((rule) => rule.widget))).sort();
    expect(ruled.length).toBeGreaterThan(25);
    expect(mapped).toEqual(ruled);
  });

  // A parser that silently matched nothing would make every "no missing rows" assertion
  // below pass on an empty set. So the population is checked for plausibility first, and
  // for a landmark that must be in it: `Dimension` is the row the task was filed about.
  it('parses a plausible dispatch chain out of Ports.ts', () => {
    const classes = dispatchedRowClasses();
    expect(classes.length).toBeGreaterThan(25);
    expect(classes).toContain('Dimension');
    expect(classes).toContain('BasicType');
  });

  it('records a decision for every class the dispatch chain returns', () => {
    const undecided = dispatchedRowClasses().filter((name) => !CONNECTED_ROW_POLICY[name]);
    expect(undecided).toEqual([]);
  });

  // The other direction. An entry for a class the chain can no longer return is a
  // decision about nothing — it reads as coverage while covering a deleted row.
  it('has no entry for a class the dispatch chain cannot return', () => {
    const dispatched = new Set(dispatchedRowClasses());
    const stale = Object.keys(CONNECTED_ROW_POLICY).filter((name) => !dispatched.has(name));
    expect(stale).toEqual([]);
  });

  it('gives every non-chip row a non-empty reason', () => {
    const unreasoned = Object.entries(CONNECTED_ROW_POLICY)
      .filter(([, policy]) => policy.kind !== 'chip')
      .filter(([, policy]) => !(policy as { reason?: string }).reason?.trim())
      .map(([name]) => name);
    expect(unreasoned).toEqual([]);
  });

  // AC2's cardinality: chip + exception + deferred accounts for all of them, with nothing
  // counted twice and nothing falling through a fourth kind added later.
  it('partitions the dispatch chain exactly — chip + exception + deferred = all', () => {
    const dispatched = dispatchedRowClasses();
    const byKind = { chip: 0, exception: 0, deferred: 0 };
    for (const name of dispatched) {
      const kind = CONNECTED_ROW_POLICY[name].kind;
      byKind[kind] += 1;
    }
    expect(byKind.chip + byKind.exception + byKind.deferred).toBe(dispatched.length);
    // The rollout that stalled at five is the reason this task exists; it must not be
    // able to quietly return to five.
    expect(byKind.chip).toBeGreaterThanOrEqual(16);
  });

  // The pinned list is a literal in the source file precisely so that it cannot agree
  // with the table by construction. This asserts the two match in BOTH directions, so a
  // row that becomes deferred without being named here fails.
  it('pins the deferred list against the table, both ways', () => {
    const derived = Object.entries(CONNECTED_ROW_POLICY)
      .filter(([, policy]) => policy.kind === 'deferred')
      .map(([name]) => name)
      .sort();
    expect(derived).toEqual([...DEFERRED_ROW_CLASSES].sort());
  });

  it('does not defer the row the task was filed about', () => {
    expect(CONNECTED_ROW_POLICY.Dimension.kind).toBe('chip');
    expect(DEFERRED_ROW_CLASSES).not.toContain('Dimension');
  });
});
