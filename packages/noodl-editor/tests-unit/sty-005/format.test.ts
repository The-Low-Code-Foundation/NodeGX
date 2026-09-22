/**
 * P94 STY-005 AC2 — what a row PRINTS.
 *
 * ⚠️ P99 HLT-007 (a), 2026-09-22: the Text styles section was removed by Richard's ruling, and
 * `summariseTextStyle` with it. The finding below is kept because it is still true of the data.
 *
 * 🔴 **This file exists because of a defect found by opening a real project, not by thinking.**
 * The first `summariseTextStyle` filtered its fields to `typeof === 'string'`, which is the shape
 * node parameters use across the corpus (`"fontSize": "var(--text-sm)"` — counted in every
 * template). The `nodegx.styles.json` sidecar of the project this task drives stores the same
 * field as `{ "value": "14", "unit": "px" }`, the shape the size port hands back. Against that
 * project every text style row would have rendered with a blank value line, which a person reads
 * as *"this style sets nothing"* — a wrong statement, drawn confidently, that no assertion written
 * from the intent would have caught. [[measure-the-artefact-before-believing-the-task-file]].
 */
import { describeUsage, displayTypeName } from '../../src/editor/src/views/panels/StylesPanel/format';

describe('STY-005 — displayTypeName', () => {
  it('turns a node type id into something a person reads', () => {
    expect(displayTypeName('net.noodl.controls.button')).toBe('Button');
    expect(displayTypeName('Text')).toBe('Text');
  });

  it('survives a Look whose typename is missing', () => {
    expect(displayTypeName(undefined)).toBe('');
    expect(displayTypeName('')).toBe('');
  });
});

describe('STY-005 AC4 — a delete says what it would break', () => {
  it('names nodes and Looks separately', () => {
    // Different things to a person: a node is somewhere they can go and look at; a Look is a rule
    // that would take the style off everything wearing it.
    expect(describeUsage(3, 2)).toBe('3 nodes and 2 Looks');
    expect(describeUsage(1, 1)).toBe('1 node and 1 Look');
  });

  it('mentions only the half that exists', () => {
    expect(describeUsage(4, 0)).toBe('4 nodes');
    expect(describeUsage(0, 1)).toBe('1 Look');
  });
});
