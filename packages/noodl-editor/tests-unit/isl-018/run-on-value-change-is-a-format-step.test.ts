/**
 * P109 ISL-018 — the run-on-value-change migration is a one-time format step, 4 → 5 (Richard's ruling, 2026-10-02).
 *
 * Measured before the ruling (ISL-018 §8): a person wires `Run` on a Function in the editor, the autosave writes no
 * `runOnChange-*` key, and the next open's `applyPatches` wrote `runOnChange-in-<input>: false` — the migration's only
 * evidence of a pre-§2 author is an absent key, which is exactly what the editor's own save leaves. Ruled: run it only
 * for a project that predates format 5; `ProjectModel.Upgraders[4]` records that it ran; `create_project` starts at 5.
 *
 * This spec grades the seam (`applyPatches`, the one place the editor runs it) and the version test both readers share.
 * The upgrader itself is graded by the editor drive in ISL-018 §8 (ProjectModel does not load under plain Node).
 */

import {
  projectPredatesRunOnValueChange,
  RUN_ON_VALUE_CHANGE_FORMAT_VERSION
} from '../../src/editor/src/models/ProjectPatches/runOnValueChangeMigration';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applyPatches } = require('../../src/editor/src/models/ProjectPatches/applypatches');

/** A Function whose `flag` input is fed and whose `Run` is wired — the shape the editor saved with no key. */
function project(version: string | undefined) {
  return {
    name: 'isl018',
    ...(version === undefined ? {} : { version }),
    components: [
      {
        name: '/Pages/Home',
        graph: {
          roots: [
            { id: 'btn', type: 'net.noodl.controls.button', parameters: {}, ports: [] },
            { id: 'states', type: 'States', parameters: {}, ports: [] },
            {
              id: 'readFlag',
              type: 'JavaScriptFunction',
              parameters: { functionScript: "Outputs.shown = String(Inputs.flag);" },
              ports: [{ name: 'in-flag', plug: 'input', type: '*' }]
            }
          ],
          connections: [
            { fromId: 'states', fromProperty: 'flag', toId: 'readFlag', toProperty: 'in-flag' },
            { fromId: 'btn', fromProperty: 'onClick', toId: 'readFlag', toProperty: 'run' }
          ]
        }
      }
    ]
  };
}

const params = (p: ReturnType<typeof project>) => p.components[0].graph.roots[2].parameters as Record<string, unknown>;

describe('ISL-018 — the run-on-value-change migration is the format step 4 → 5', () => {
  test('the format version is 5, and a missing, older or unreadable version predates it', () => {
    expect(RUN_ON_VALUE_CHANGE_FORMAT_VERSION).toBe('5');
    for (const v of [undefined, null, '', '0', '3', '4', '2.0', 'four']) expect(projectPredatesRunOnValueChange(v)).toBe(true);
    for (const v of ['5', '6', '10', 5]) expect(projectPredatesRunOnValueChange(v)).toBe(false);
  });

  test('KNOWN-FIRING: a project at format 4 is migrated on load — the Run-wired Function\'s box is written false', () => {
    const p = project('4');
    applyPatches(p);
    expect(params(p)['runOnChange-in-flag']).toBe(false);
  });

  test('a project with no version (every project before formats were numbered) is migrated the same way', () => {
    const p = project(undefined);
    applyPatches(p);
    expect(params(p)['runOnChange-in-flag']).toBe(false);
  });

  test('a project at format 5 — what the editor saves after the step, and what create_project writes — is left as written', () => {
    const p = project('5');
    applyPatches(p);
    expect(params(p)).toEqual({ functionScript: 'Outputs.shown = String(Inputs.flag);' });
    expect('runOnChange-in-flag' in params(p)).toBe(false);
  });
});
