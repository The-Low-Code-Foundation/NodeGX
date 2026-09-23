import fs from 'fs';
import path from 'path';

import { stripComments } from '../support/renderElements';

/**
 * P100 R6 — "close the source, then convert". 0.3.0 converts a project's text
 * styles to Looks on load (UPG-003), and that conversion only finishes if
 * nothing can mint a new text style afterwards. Before R6 a Text node's style
 * picker drew "Create new text style", which wrote one straight into the
 * project through `StylesModel.setStyle('text', …)`.
 *
 * Graded on source: the picker uses hooks and imports `Icon`, and this
 * node-env runner can load neither. Every absence below has a known-present
 * line read by the same reader beside it, so an empty or misread file fails
 * instead of passing.
 */

const EDITOR_SRC = path.join(__dirname, '..', '..', 'src', 'editor', 'src');
const read = (...segments: string[]) => stripComments(fs.readFileSync(path.join(EDITOR_SRC, ...segments), 'utf8'));

const PICKER = ['views', 'TextStylePicker', 'TextStylePicker.jsx'];
const PORT_TYPE = ['views', 'panels', 'propertyeditor', 'DataTypes', 'TextStyleType.ts'];

describe('P100 R6 — a text style cannot be created from a Text node', () => {
  it('the picker draws no Create row', () => {
    const src = read(...PICKER);

    // control: the same reader sees the rows it still draws
    expect(src).toMatch(/deleteStyle\('text'/);
    expect(src).toMatch(/<TextStyleItem\b/);

    expect(src).not.toMatch(/Create new text style/);
    expect(src).not.toMatch(/\bCreateNewStyle\b/);
    expect(src).not.toMatch(/\bcreateNewStyle\b/);
  });

  it('the port type hands the picker no create callback', () => {
    const src = read(...PORT_TYPE);

    // control
    expect(src).toMatch(/props\.onItemSelected\s*=/);

    expect(src).not.toMatch(/createNewStyle/);
    expect(src).not.toMatch(/setStyle\(\s*'text'/);
  });

  it("the only editor code that writes a text style is the existing-style editor", () => {
    const writers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          if (/setStyle\(\s*['"]text['"]/.test(stripComments(fs.readFileSync(full, 'utf8')))) {
            writers.push(path.relative(EDITOR_SRC, full).split(path.sep).join('/'));
          }
        }
      }
    };
    walk(EDITOR_SRC);

    // TextStylePopup edits a style that already exists (the sliders button on a row); it cannot add a name
    expect(writers).toEqual(['views/TextStylePicker/TextStylePopup.jsx']);
  });
});
