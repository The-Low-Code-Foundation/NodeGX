/**
 * TVW-001 (e) — a retired sheet reads as an ordinary folder, and nothing on disk moves.
 *
 * The split this grades is the whole of slice 4's compatibility story: the `#` comes off the
 * **label** and stays on the **path**. The panel's actions (`useComponentActions`) resolve what the
 * tree hands them straight onto real component names — the `sheetPrefix` that used to put a
 * stripped prefix back is deleted — so a label leaking into a path position is a silent rename of a
 * legacy project's folders, which `reference/COMPATIBILITY-POLICY.md` forbids.
 *
 * These are the label's rules only. That the *path* survives is graded where paths are built
 * (`useComponentsPanel.addComponentToFolderStructure`, which keys its folder lookup on the path for
 * exactly this reason) and driven at AC5.
 */

import { SECTION_LABEL } from '../../src/editor/src/views/panels/ComponentsPanelNew/componentSections';
import {
  folderPathLabel,
  folderSegmentLabel,
  PROJECT_ROOT_LABEL
} from '../../src/editor/src/views/panels/ComponentsPanelNew/folderDisplay';

describe('TVW-001 (e) — one folder segment', () => {
  it('takes the # off a top-level sheet folder', () => {
    expect(folderSegmentLabel('#Design', 0)).toBe('Design');
  });

  it('leaves an ordinary folder alone', () => {
    expect(folderSegmentLabel('Design', 0)).toBe('Design');
    expect(folderSegmentLabel('Sections', 1)).toBe('Sections');
  });

  it('keeps a # that is not a sheet', () => {
    // Sheets could only ever be top-level. A nested `#thing` is a folder somebody deliberately
    // named with a `#`, and renaming it in the label would be inventing a migration.
    expect(folderSegmentLabel('#Design', 1)).toBe('#Design');
    expect(folderSegmentLabel('#notes', 2)).toBe('#notes');
  });

  it('defaults to the top level, because that is the only place a sheet could be', () => {
    expect(folderSegmentLabel('#Design')).toBe('Design');
  });

  it('calls the cloud boundary what its section heading calls it, at any depth', () => {
    // 🔴 Not `Cloud Functions`. `CLOUD_SHEET.displayName` used to carry a second spelling of this
    // name and the two had already drifted by a capital letter; the section label is the one copy.
    expect(folderSegmentLabel('#__cloud__', 0)).toBe(SECTION_LABEL.cloud);
    expect(folderSegmentLabel('#__cloud__', 3)).toBe(SECTION_LABEL.cloud);
  });

  it('does not mistake a folder that merely starts like the cloud one', () => {
    expect(folderSegmentLabel('#__cloud__backup', 0)).toBe('__cloud__backup');
  });

  it('survives an empty segment rather than dropping a character', () => {
    expect(folderSegmentLabel('', 0)).toBe('');
    expect(folderSegmentLabel('#', 0)).toBe('');
  });
});

describe('TVW-001 (e) — a whole folder path', () => {
  it('joins in the trail’s separator', () => {
    expect(folderPathLabel('/Screens/Admin')).toBe('Screens / Admin');
  });

  it('strips the # from the first segment only', () => {
    // The assertion that matters: `#Design` is the sheet, `#notes` under it is not.
    expect(folderPathLabel('/#Design/#notes')).toBe('Design / #notes');
  });

  it('reads a legacy sheet path as the folder tree now draws it', () => {
    expect(folderPathLabel('/#Design/Cards')).toBe('Design / Cards');
  });

  it('names the root rather than returning an empty label', () => {
    // `destinationLabel` turns this into `PROJECT_ROOT_LABEL`; a create menu reading "New in " is
    // the failure this guards.
    expect(folderPathLabel('/')).toBeNull();
    expect(folderPathLabel('')).toBeNull();
    expect(folderPathLabel(undefined)).toBeNull();
    expect(folderPathLabel(null)).toBeNull();
    expect(PROJECT_ROOT_LABEL.length).toBeGreaterThan(0);
  });

  it('ignores a trailing slash and doubled separators', () => {
    expect(folderPathLabel('/Screens/Admin/')).toBe('Screens / Admin');
    expect(folderPathLabel('//Screens//Admin')).toBe('Screens / Admin');
  });

  it('writes the cloud folder as its section heading', () => {
    expect(folderPathLabel('/#__cloud__')).toBe(SECTION_LABEL.cloud);
  });
});
