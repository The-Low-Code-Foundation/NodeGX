/**
 * P101 INS-003 row 6 — a number never shrinks below its digits.
 *
 * At the 301px inspector Richard chose, Width read `1(`: the value input was 18px for `100`
 * (needs 28) beside a 46px `Fixed`, because the number was the only part of the row allowed to
 * shrink. The fix is CSS plus one prop, so this pins the source. ⚠️ It grades the MECHANISM only:
 * `NumberUnitInput` calls hooks and cannot render in this runner, and jsdom has no layout. The
 * consequence (no clipping at 260/301/328/400, label on the field's line) is graded by the drive
 * in INS-003 §5 (row 6).
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(__dirname, '../../src/editor/src/views/panels/propertyeditor/components');
const scss = fs.readFileSync(path.join(DIR, 'NumberUnitInput.module.scss'), 'utf8');
const tsx = fs.readFileSync(path.join(DIR, 'NumberUnitInput.tsx'), 'utf8');
const sizeScss = fs.readFileSync(path.join(DIR, 'SizeModeInput.module.scss'), 'utf8');
const sizeTsx = fs.readFileSync(path.join(DIR, 'SizeModeInput.tsx'), 'utf8');

/** The declarations of the first rule whose selector starts with `selector`. */
function ruleBody(selector: string): string {
  const at = scss.indexOf(`${selector}`);
  if (at < 0) return '';
  const open = scss.indexOf('{', at);
  const close = scss.indexOf('}', open);
  return scss.slice(open + 1, close);
}

describe('INS-003 row 6 — the number field keeps its digits on a narrow panel', () => {
  it('the value has a floor of three digits and no intrinsic width', () => {
    const value = ruleBody('.Field .Value.Value,');
    // control: the rule this reads is the one that sizes the value
    expect(value).toMatch(/height:\s*100%/);

    expect(value).toMatch(/min-width:\s*calc\(3ch \+ 8px\)/);
    expect(value).toMatch(/width:\s*0;/);
    expect(value).toMatch(/flex:\s*1 1 0;/);
  });

  it('`Fixed` wraps under the field instead of taking the number’s width', () => {
    const line = ruleBody('.Line {');
    // control
    expect(line).toMatch(/display:\s*flex/);

    expect(line).toMatch(/flex-wrap:\s*wrap/);
  });

  it('a row that draws `Fixed` pins its label to the first line; a connected one does not', () => {
    // control: Fixed is still gated on a % value
    expect(tsx).toMatch(/const drawsFixed = Boolean\(showFixed && isPercent\)/);

    expect(tsx).toMatch(/alignTop=\{drawsFixed && !isConnected\}/);
    expect(tsx).toMatch(/classNames\(css\['Line'\], drawsFixed && css\['has-fixed'\]\)/);
  });

  // The same defect one row up: Size Mode's two axes need a 135px track, and below ~323px of
  // inspector the H segment was cut by the row's `overflow: hidden` (22 of 26px at 301).
  it('Size Mode wraps its H axis under W and pins its label to the first line', () => {
    const root = sizeScss.slice(sizeScss.indexOf('.Root {'), sizeScss.indexOf('}', sizeScss.indexOf('.Root {')));
    // control
    expect(root).toMatch(/display:\s*flex/);

    expect(root).toMatch(/flex-wrap:\s*wrap/);
    expect(sizeTsx).toMatch(/<PropertyPanelRow label=\{label\} isChanged=\{!isDefault\} onReset=\{onReset\} alignTop>/);
  });
});
