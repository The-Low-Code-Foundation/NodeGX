/**
 * P94 STY-005 AC2 — what a row PRINTS.
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
import { describeUsage, displayTypeName, summariseTextStyle } from '../../src/editor/src/views/panels/StylesPanel/format';

describe('STY-005 — summariseTextStyle reads both shapes a text style has in the wild', () => {
  it('🔴 the `{ value, unit }` shape — as `nodegx.styles.json` stores it', () => {
    // Copied from `cn027-drive/nodegx.styles.json`, the fixture this task drives.
    const stored = {
      letterSpacing: 'Auto',
      lineHeight: { value: '150', unit: '%' },
      textTransform: 'none',
      fontFamily: 'fonts/Roboto/Roboto-Regular.ttf',
      fontSize: { value: '14', unit: 'px' },
      color: '#000000'
    };

    expect(summariseTextStyle(stored)).toBe('14px · Roboto-Regular');
  });

  it('🔴 the plain-string shape — as node parameters store it', () => {
    expect(summariseTextStyle({ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)' })).toBe(
      'var(--text-sm) · var(--font-bold)'
    );
  });

  it('prints a token reference AS STORED, never resolved to pixels', () => {
    // The whole phase argues that every field names its source. A panel that quietly printed
    // `16px` next to `var(--text-base)` would teach the opposite habit on every row it drew.
    const summary = summariseTextStyle({ fontSize: 'var(--text-base)' });
    expect(summary).toContain('var(--text-base)');
    expect(summary).not.toContain('px');
  });

  it('drops the font path and keeps the face', () => {
    expect(summariseTextStyle({ fontFamily: 'fonts/Roboto/Roboto-Medium.ttf' })).toBe('Roboto-Medium');
    expect(summariseTextStyle({ fontFamily: 'Inter' })).toBe('Inter');
  });

  it('says nothing rather than something wrong for a style with none of these fields', () => {
    expect(summariseTextStyle({ color: '#000000' })).toBe('');
    expect(summariseTextStyle(null)).toBe('');
    expect(summariseTextStyle('not an object')).toBe('');
  });

  it('a numeric size is still a size', () => {
    expect(summariseTextStyle({ fontSize: 16 })).toBe('16');
  });
});

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
