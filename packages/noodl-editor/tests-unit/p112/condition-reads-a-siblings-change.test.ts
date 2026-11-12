/**
 * Bug P112-OWN018-FANOUT, ruled by Richard 2026-10-27 "Teach it and warn": two Conditions evaluated by one signal, where
 * one's On True changes what the other reads. Mistral's quiz: the reveal's end evaluated "was the answer right?" and
 * "not the last question?"; the second moved the question index the first compares against, so every answer was scored
 * against the next question. The runtime half (`noodl-runtime/test/corpus/p112-own018-fanout.test.ts`) measured that
 * wire order is no remedy and the chain is.
 *
 * Driven through the whole `SemanticValidator` with only this rule on, against the shipped catalog.
 *
 * @module noodl-editor/tests-unit/p112/condition-reads-a-siblings-change
 */
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import { SemanticValidator } from '@noodl-models/../validation/SemanticValidator';
import { ALL_RULES } from '@noodl-models/../validation/rules';
import type { NormConnection, NormNode, NormProject } from '@noodl-models/../validation/model';

const catalog = loadDefaultCatalog();
const CODE = DiagnosticCode.ConditionReadsASiblingsChange;

function node(id: string, type: string, label?: string, parameters?: Record<string, unknown>): NormNode {
  return { id, type, label, children: [], instancePorts: [], ...(parameters ? { parameters } : {}) } as unknown as NormNode;
}
const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): NormConnection => ({ fromId, fromProperty, toId, toProperty });

function run(nodes: NormNode[], connections: NormConnection[]) {
  const project = { components: [{ name: '/#Pages/Home', nodes, connections }] } as NormProject;
  return new SemanticValidator(catalog).validate(project, { only: new Set([CODE]) }).diagnostics;
}

/** The quiz: a Next press evaluates both gates; the move-on gate's On True increases the index the scoring gate reads. */
const QUIZ = [
  node('next', 'net.noodl.controls.button', 'Next'),
  node('index', 'Counter', 'Question index'),
  node('right', 'Expression', 'Answer is right?', { expression: 'index == 0' }),
  node('more', 'Expression', 'Not the last question?', { expression: 'index < 4' }),
  node('score', 'Condition', 'Score if right', { 'runOnChange-condition': false }),
  node('advance', 'Condition', 'Move on if not last', { 'runOnChange-condition': false }),
  node('points', 'Counter', 'Score')
];
const QUIZ_VALUES = [
  wire('index', 'currentCount', 'right', 'index'),
  wire('index', 'currentCount', 'more', 'index'),
  wire('right', 'result', 'score', 'condition'),
  wire('more', 'result', 'advance', 'condition'),
  wire('score', 'ontrue', 'points', 'increase'),
  wire('advance', 'ontrue', 'index', 'increase')
];

describe('P112-OWN018-FANOUT — a gate that reads what a sibling gate changes', () => {
  it('the premises, from the shipped catalog: Evaluate is a signal, Increase is a signal, the rule is live', () => {
    expect(catalog.getPort('Condition', 'input', 'eval')?.isSignal).toBe(true);
    expect(catalog.getPort('Counter', 'input', 'increase')?.isSignal).toBe(true);
    expect(ALL_RULES.some((r) => r.code === CODE)).toBe(true);
  });

  it('the quiz, both gates off one press: the scoring gate is warned, by name, with the chain to make', () => {
    const found = run(QUIZ, [...QUIZ_VALUES, wire('next', 'onClick', 'score', 'eval'), wire('next', 'onClick', 'advance', 'eval')]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ code: CODE, severity: 'warning', location: { nodeId: 'score', port: 'eval' } });
    expect(found[0].message).toContain('"Score if right" and "Move on if not last" are both evaluated by "Next"');
    expect(found[0].message).toContain('whichever order the two are wired in');
    expect(found[0].message).toContain(`chain them: "Score if right"'s Done into "Move on if not last"'s Evaluate`);
  });

  it('the same quiz wired the other way round: the same one warning', () => {
    const found = run(QUIZ, [...QUIZ_VALUES, wire('next', 'onClick', 'advance', 'eval'), wire('next', 'onClick', 'score', 'eval')]);
    expect(found.map((d) => d.location.nodeId)).toEqual(['score']);
  });

  it("Mistral's own hop: the index feeds a Function that publishes the right answer, which the check compares: still warned", () => {
    const nodes = [
      ...QUIZ.filter((n) => n.id !== 'right'),
      node('answers', 'JavaScriptFunction', 'Question data', { functionScript: "Outputs.correct = [1, 0, 2, 1, 0][Inputs.index];" }),
      node('right', 'Expression', 'Answer is right?', { expression: 'selected == correct' })
    ];
    const values = [
      ...QUIZ_VALUES.filter((c) => !(c.toId === 'right')),
      wire('index', 'currentCount', 'answers', 'in-index'),
      wire('answers', 'out-correct', 'right', 'correct')
    ];
    const found = run(nodes, [...values, wire('next', 'onClick', 'score', 'eval'), wire('next', 'onClick', 'advance', 'eval')]);
    expect(found.map((d) => d.location.nodeId)).toEqual(['score']);
  });

  it('chained (the reader decides first): nothing to say', () => {
    expect(run(QUIZ, [...QUIZ_VALUES, wire('next', 'onClick', 'score', 'eval'), wire('score', 'done', 'advance', 'eval')])).toEqual([]);
  });

  it('a dispatcher (the todo template\'s Dialog flow): gates on two states of one States node, each sending it to none, say nothing', () => {
    const nodes = [
      node('confirm', 'net.noodl.controls.button', 'Confirm'),
      node('asking', 'States', 'What the dialog is asking', { states: 'none,close,reopen' }),
      node('closing', 'Condition', 'Was it closing?', { 'runOnChange-condition': false }),
      node('reopening', 'Condition', 'Was it reopening?', { 'runOnChange-condition': false })
    ];
    const connections = [
      wire('asking', 'at-close', 'closing', 'condition'),
      wire('asking', 'at-reopen', 'reopening', 'condition'),
      wire('confirm', 'onClick', 'closing', 'eval'),
      wire('confirm', 'onClick', 'reopening', 'eval'),
      wire('closing', 'ontrue', 'asking', 'to-none'),
      wire('reopening', 'ontrue', 'asking', 'to-none')
    ];
    expect(run(nodes, connections)).toEqual([]);
  });

  it('a walk stops at a component instance: a link through its outputs (a later Play again) is not this pulse', () => {
    const nodes = [...QUIZ, node('results', '/Results', 'How it ended')];
    const values = QUIZ_VALUES.filter((c) => !(c.fromId === 'advance' && c.fromProperty === 'ontrue'));
    const connections = [
      ...values,
      wire('advance', 'ontrue', 'results', 'show'),
      wire('results', 'again', 'index', 'reset'),
      wire('next', 'onClick', 'score', 'eval'),
      wire('next', 'onClick', 'advance', 'eval')
    ];
    expect(run(nodes, connections)).toEqual([]);
  });

  it('control: two gates off one press that do not touch what the other reads say nothing', () => {
    const nodes = [...QUIZ, node('other', 'Counter', 'Taps')];
    const values = QUIZ_VALUES.filter((c) => !(c.fromId === 'advance' && c.fromProperty === 'ontrue'));
    const found = run(nodes, [...values, wire('advance', 'ontrue', 'other', 'increase'), wire('next', 'onClick', 'score', 'eval'), wire('next', 'onClick', 'advance', 'eval')]);
    expect(found).toEqual([]);
  });
});
