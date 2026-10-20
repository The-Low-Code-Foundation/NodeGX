/**
 * P111 SEE-001 — the honesty number stays out of releases (Richard, 2026-10-20, for 0.4.3) and shows in a source build.
 *
 * The gate is `honestyShown()`: true only when `main.js` was started with `--dev`. What this grades: the gate's answer
 * for a packaged app's environment and a source build's, and that each of the number's three surfaces asks it. The
 * call sites are a hook and a canvas painter, which this runner can't mount, so they are read as text beside the
 * surface they gate (known-firing: the surface is still there to gate).
 */
import * as fs from 'fs';
import * as path from 'path';

import { honestyShown } from '../../src/editor/src/views/panels/ComponentsPanelNew/honestyShown';

const SRC = path.join(__dirname, '../../src/editor/src/views');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('P111 SEE-001 — the honesty number in a source build only', () => {
  it('a packaged app (no devMode) shows none of it; `npm run dev` (devMode=yes) does', () => {
    expect(honestyShown({})).toBe(false);
    expect(honestyShown({ devMode: 'no' })).toBe(false);
    expect(honestyShown({ devMode: 'yes' })).toBe(true);
  });

  it('the panel walks the project for its number only when the gate is open', () => {
    const hook = read('panels/ComponentsPanelNew/hooks/useComponentsPanel.ts');
    expect(hook).toContain('readProjectHonesty(');
    expect(hook).toMatch(/honestyShown\(\) && ProjectModel\.instance\s*\?\s*readProjectHonesty\(/);
  });

  it('the canvas draws the script mark only when the gate is open', () => {
    const painter = read('nodegrapheditor/NodeGraphEditorNodePainter.ts');
    expect(painter).toContain('isScriptNodeType(node.model.typename)');
    expect(painter).toContain('if (honestyShown() && isScriptNodeType(node.model.typename))');
  });
});
