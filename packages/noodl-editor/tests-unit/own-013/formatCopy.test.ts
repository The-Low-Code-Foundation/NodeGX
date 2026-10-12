/**
 * P112 OWN-013 (R17, Richard 2026-10-11: "Make a copy") — a project an older editor saved is copied
 * to `<project>.before-0.4` before this editor moves its format forward, because once saved 0.3.0
 * refuses it. `projectFromDirectory` makes the copy; this grades the decision and the words.
 */
import { RUN_ON_VALUE_CHANGE_FORMAT_VERSION } from '../../src/editor/src/models/ProjectPatches/runOnValueChangeMigration';
import {
  describeFormatCopy,
  describeFormatCopyFailure,
  FORMAT_COPY_SUFFIX,
  owesFormatCopy
} from '../../src/editor/src/models/ProjectPatches/formatCopy';

// The ceiling `projectmodel.editor.ts` uses, from the same constant.
const supported = Number(RUN_ON_VALUE_CHANGE_FORMAT_VERSION);

describe('OWN-013 R17 — the copy before a format update', () => {
  it('this editor writes format 5, so a 0.3.0 project (format 4) is the case', () => {
    expect(supported).toBe(5);
  });

  it('is owed for every format the editor converts, as the file stores it', () => {
    expect(owesFormatCopy('4', supported)).toBe(true);
    expect(owesFormatCopy('3', supported)).toBe(true);
    expect(owesFormatCopy(4, supported)).toBe(true);
    // No version is the oldest format: the upgrader chain starts at 0.
    expect(owesFormatCopy(undefined, supported)).toBe(true);
  });

  it('is not owed for a project already at the format, such as one the npm kit makes', () => {
    expect(owesFormatCopy('5', supported)).toBe(false);
    expect(owesFormatCopy(5, supported)).toBe(false);
  });

  it('is not owed for a newer project (refused, never converted) or a version it cannot read', () => {
    expect(owesFormatCopy('6', supported)).toBe(false);
    expect(owesFormatCopy('not a version', supported)).toBe(false);
  });

  it('names the copy after the release that made it', () => {
    expect(FORMAT_COPY_SUFFIX).toBe('.before-0.4');
  });

  it('tells the person where the copy is and why it matters', () => {
    const { title, message } = describeFormatCopy('/Users/me/My App.before-0.4');
    expect(title).toBe('This project was updated for NodeGX 0.4');
    expect(message).toContain('/Users/me/My App.before-0.4');
    expect(message).toContain("NodeGX 0.3 can't open");
  });

  it('says the project was not opened and nothing changed when the copy fails', () => {
    const text = describeFormatCopyFailure('ENOSPC: no space left on device');
    expect(text).toContain("wasn't opened");
    expect(text).toContain('nothing in it was changed');
    expect(text).toContain('ENOSPC');
  });
});
