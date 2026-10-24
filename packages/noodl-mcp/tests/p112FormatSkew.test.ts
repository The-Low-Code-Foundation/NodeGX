/**
 * P112-S11-FORMATSKEW — a project the kit makes is one the released editor opens.
 *
 * Measured 2026-10-11: `@nodegx/mcp@0.1.0` wrote project format 5 and the only released editor (0.3.0) opened at most
 * 4, so it refused every project the kit made. Closed by the release: since b2ba0320a the editor's ceiling IS the
 * shared contract's format constant, and v0.4.0–v0.4.3 carry it. This pins both halves to the one constant, so the
 * kit cannot move ahead of the editor again without this file saying so.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { RUN_ON_VALUE_CHANGE_FORMAT_VERSION } from '@nodegx/project-contract/run-on-value-change-migration';

import { writeProjectSkeleton } from '../src/tools/createProject';

const EDITOR_MODEL = path.resolve(__dirname, '..', '..', 'noodl-editor', 'src', 'editor', 'src', 'models', 'projectmodel.editor.ts');

describe('P112-S11-FORMATSKEW — the kit and the editor read one format number', () => {
  it('create_project writes the contract format', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatskew-'));
    writeProjectSkeleton(dir, 'Format Skew');
    const written = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf8'));
    expect(String(written.version)).toBe(RUN_ON_VALUE_CHANGE_FORMAT_VERSION);
  });

  it("the editor's ceiling is that same constant, not a number of its own", () => {
    const source = fs.readFileSync(EDITOR_MODEL, 'utf8');
    expect(source).toMatch(/const supportedProjectVersion = Number\(RUN_ON_VALUE_CHANGE_FORMAT_VERSION\);/);
    // …and it is the ceiling the refusal reads.
    expect(source).toMatch(/content\.version > supportedProjectVersion/);
  });
});
