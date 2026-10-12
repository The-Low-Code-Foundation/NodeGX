/**
 * P109 ISL-051 / P107-C145 (ruled "Block the three names") — the editor's half, which the Expression spec cannot see.
 *
 * A text that reads `run`, `expression` or `evaluateAtLoad` used to get a port drawn for it (a wire into it landed on the node's
 * own Run), and threw "run is not defined" at every run. Now no port is drawn, and the node says why where the text is typed.
 * The runtime half — the evaluation failing as `expression/reserved-name` — is graded by the Expression spec (v3).
 */

import { driveSetup } from './setup-harness';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExpressionModule = require('../../src/nodes/std-library/expression');

function drive(expression: string) {
  return driveSetup({
    module: ExpressionModule,
    type: 'Expression',
    nodes: [{ id: 'e1', parameters: { expression }, component: { name: '/C' } }]
  });
}

const reserved = (setup: ReturnType<typeof drive>) =>
  setup.warnings.filter((w) => w.nodeId === 'e1' && w.key === 'expression-compile-error').map((w) => w.message);

describe('ISL-051 C145 — a reserved name in the editor', () => {
  test('known-firing: a text over two variables draws both ports and warns nothing', () => {
    const setup = drive('a + b');
    expect(setup.portNames('e1')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(reserved(setup)).toEqual([]);
  });

  test('run draws no port; the other variable still does; the warning names run and how to fix it', () => {
    const setup = drive('run * 2 + a');
    const names = setup.portNames('e1');
    expect(names).toContain('a');
    expect(names).not.toContain('run');
    expect(names).not.toContain('runOnChange-run');
    expect(reserved(setup)).toEqual([expect.stringContaining('run is the name of one of this Expression')]);
    expect(reserved(setup)[0]).toContain('rename it');
  });

  test('all three are reserved, and named together', () => {
    const setup = drive('expression + evaluateAtLoad + run');
    expect(setup.portNames('e1')).toEqual([]);
    expect(reserved(setup)).toEqual([expect.stringContaining('expression, evaluateAtLoad and run are names')]);
  });

  test('renaming the variable clears the warning and draws its port', () => {
    const setup = drive('run + 1');
    expect(reserved(setup)).toHaveLength(1);
    setup.setParameter('e1', 'expression', 'runCount + 1');
    expect(reserved(setup)).toEqual([]);
    expect(setup.portNames('e1')).toContain('runCount');
  });

  test('a member named run is not a variable — `item.run` draws `item` and warns nothing', () => {
    const setup = drive('item.run + 1');
    expect(setup.portNames('e1')).toContain('item');
    expect(reserved(setup)).toEqual([]);
  });
});
