/**
 * P132 BWF-013 Build 4 — the NodeGX editor draws a `run-workflow` step.
 *
 * Measured in s18: the catalog serves `workflow` with `control: 'workflow'` and `send` with `control: 'key-values'`,
 * and the editor knew neither, so `workflow` was a text box holding the piece's id and `send` the JSON editor. Graded
 * here: the rules ported from Studio (pieces first, a ring shown and not offered, the names a piece reads), the port
 * types the library gives the two params, the panel rows they reach, and what those rows draw. The canvas title, the
 * open and the save are the drive (`editor-drive-bwf013.cjs` in the phase folder).
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  Icon: () => null,
  IconName: {},
  IconSize: { Tiny: 'tiny' },
  IconVariant: {}
}));

// The value picker asks the open document for reads; the service imports the canvas context (webpack-only). None open.
// …and walks the graph for what came before (which loads the project model); no graph here.
jest.mock('@noodl-models/workflow/workflowScope', () => ({ danglingReference: () => null, upstreamSteps: () => [] }));
jest.mock('@noodl-models/workflow/WorkflowEditorService', () => ({ WorkflowEditorService: { instance: { document: null } } }));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  bodyNames,
  isNamedValues,
  namedValuesWords,
  pieceChoices,
  pieceIds,
  pieceOf,
  runTitle,
  wouldRing
} from '../../src/editor/src/models/workflow/workflowPieces';
import { WorkflowParamsEditor } from '../../src/editor/src/views/panels/propertyeditor/components/WorkflowCondition/WorkflowParamsEditor';
import { WorkflowPieceRow } from '../../src/editor/src/views/panels/propertyeditor/components/WorkflowCondition/WorkflowPieceRow';
import { widgetForPort } from '../../src/editor/src/views/panels/propertyeditor/model/widgets';

const run = (id: string, piece: string, send?: Record<string, unknown>) => ({
  id,
  kind: 'run-workflow' as const,
  params: { workflow: piece, ...(send ? { send } : {}) }
});

// Greenhouse after s18: TriggerTest runs "Check twice"; The morning check runs "Find thirsty plants".
const WORKFLOWS = [
  { id: 'triggertest', name: 'TriggerTest', steps: [run('r1', 'check-twice')] },
  {
    id: 'check-twice',
    name: 'Check twice',
    steps: [
      { id: 'a', kind: 'call-function' as const, params: { plant: { $path: 'body.plant' } } },
      { id: 'b', kind: 'return' as const, params: { value: { $path: 'upstream.a.result' }, note: { $literal: { $path: 'body.not' } } } }
    ]
  },
  { id: 'find-thirsty', name: 'Find thirsty plants', steps: [{ id: 'f', kind: 'filter' as const, params: { when: { $path: 'body.limit' } } }] },
  { id: 'morning', name: 'The morning check', steps: [run('m1', 'find-thirsty')] }
];
const TRIGGERS = [
  { target: { kind: 'workflow', name: 'morning' } },
  { target: { kind: 'workflow', name: 'triggertest' } },
  { target: { kind: 'function', name: 'check-twice' } } // a trigger starting a FUNCTION of that name starts no workflow
];

describe('P132 BWF-013 Build 4: the rules, ported from Studio', () => {
  it('names the piece a step runs, by a plain id only', () => {
    expect(pieceOf(run('x', 'check-twice'))).toBe('check-twice');
    expect(pieceOf({ kind: 'run-workflow', params: { workflow: { $path: 'body.which' } } })).toBeNull();
    expect(pieceOf({ kind: 'call-function', params: { workflow: 'check-twice' } } as never)).toBeNull();
  });

  it('a piece is a workflow no trigger starts', () => {
    expect([...pieceIds(WORKFLOWS, TRIGGERS)].sort()).toEqual(['check-twice', 'find-thirsty']);
  });

  it('a ring: the workflow itself, or one that runs it, directly or through others', () => {
    expect(wouldRing(WORKFLOWS, 'check-twice', 'check-twice')).toBe(true);
    expect(wouldRing(WORKFLOWS, 'check-twice', 'triggertest')).toBe(true); // TriggerTest runs Check twice
    expect(wouldRing(WORKFLOWS, 'find-thirsty', 'morning')).toBe(true);
    expect(wouldRing(WORKFLOWS, 'triggertest', 'find-thirsty')).toBe(false);
  });

  it('what a piece reads from what it is given: body.<name>, not inside a $literal', () => {
    expect(bodyNames(WORKFLOWS[1])).toEqual(['plant']);
    expect(bodyNames(WORKFLOWS[2])).toEqual(['limit']);
    expect(bodyNames(null)).toEqual([]);
  });

  it('the card says "Run <piece>" by its name, the id while the name is unknown, nothing with no piece', () => {
    const nameOf = (id: string) => WORKFLOWS.find((w) => w.id === id)?.name;
    expect(runTitle('check-twice', nameOf)).toBe('Run Check twice');
    expect(runTitle('not-written-yet', nameOf)).toBe('Run not-written-yet');
    expect(runTitle(null, nameOf)).toBeNull();
  });

  it('the Workflow row offers pieces first, then the workflows something starts, never the one being edited', () => {
    const c = pieceChoices(WORKFLOWS, TRIGGERS, 'triggertest', 'check-twice');
    expect(c.value).toBe('check-twice');
    expect(c.there).toBe(true);
    expect(c.groups.map((g) => [g.label, g.options.map((o) => o.name)])).toEqual([
      ['Reusable pieces', ['Check twice', 'Find thirsty plants']],
      ['Workflows something starts', ['The morning check']]
    ]);
  });

  it('a workflow that runs this one is shown as a ring, and one that does not is not', () => {
    const c = pieceChoices(WORKFLOWS, TRIGGERS, 'check-twice', undefined);
    const tt = c.groups.flatMap((g) => g.options).find((o) => o.id === 'triggertest');
    const ft = c.groups.flatMap((g) => g.options).find((o) => o.id === 'find-thirsty');
    expect(tt?.ring).toBe(true);
    expect(ft?.ring).toBe(false);
    expect(c.there).toBe(false);
    expect(c.value).toBe('');
  });

  it('send is drawn as named values only when it is named values', () => {
    expect(isNamedValues(undefined)).toBe(true);
    expect(isNamedValues({ plant: { $path: 'body.id' } })).toBe(true);
    expect(isNamedValues({ $path: 'body' })).toBe(false);
    expect(isNamedValues({ $fn: 'pick', args: [] })).toBe(false);
    expect(isNamedValues('text')).toBe(false);
    expect(isNamedValues([1])).toBe(false);
  });
});

describe('P132 BWF-013 Build 4: the served controls reach their rows', () => {
  // The library builder imports the canvas theme; its port-type choice is what matters, and it is read here through
  // the same table the property panel dispatches on.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildWorkflowNodeLibrary } = require('../../src/editor/src/models/workflow/workflowNodeLibrary');
  const KINDS = {
    kinds: [
      {
        kind: 'run-workflow',
        displayName: 'Run a workflow',
        category: 'Workflow',
        summary: 'Runs another workflow.',
        invokesFunction: false,
        params: [
          { name: 'workflow', type: 'string', required: true, displayName: 'Workflow', control: 'workflow', description: 'the id' },
          { name: 'send', type: 'object', displayName: 'Send', control: 'key-values', description: 'named values' }
        ],
        routes: []
      },
      {
        kind: 'http-request',
        displayName: 'Call an API',
        category: 'Workflow Integrations',
        summary: 'Calls an address.',
        invokesFunction: false,
        params: [
          { name: 'headers', type: 'object', displayName: 'Headers', control: 'key-values', description: '' },
          // the same control on a param that may be any JSON: NOT named values
          { name: 'body', type: 'any', displayName: 'Body', control: 'key-values', description: '' }
        ],
        routes: []
      }
    ],
    valueLanguage: { scope: [{ name: 'body', description: 'what it was given' }] }
  };
  const lib = buildWorkflowNodeLibrary(KINDS);
  const port = (type: string, name: string) =>
    lib.nodetypes.find((t: { name: string }) => t.name === type).ports.find((p: { name: string }) => p.name === name);

  it('Workflow is the piece row, not a text box', () => {
    expect(widgetForPort(port('workflow.run-workflow', 'workflow'))).toBe('workflowPiece');
  });

  it('Send is named values, carrying the scope its value pickers read', () => {
    const send = port('workflow.run-workflow', 'send');
    expect(widgetForPort(send)).toBe('workflowKeyValues');
    expect(send.type.scope.map((s: { name: string }) => s.name)).toEqual(['body']);
  });

  it("Call an API's headers too; its body (any JSON) keeps the value control", () => {
    expect(widgetForPort(port('workflow.http-request', 'headers'))).toBe('workflowKeyValues');
    expect(widgetForPort(port('workflow.http-request', 'body'))).toBe('workflowValue');
  });
});

describe('P132 BWF-013 Build 4: what the rows draw', () => {
  const noop = () => undefined;

  it('the piece row: groups by name, a ring disabled with its reason, Open the piece', () => {
    const choices = pieceChoices(WORKFLOWS, TRIGGERS, 'check-twice', 'find-thirsty');
    const html = renderToStaticMarkup(
      <WorkflowPieceRow choices={choices} onChange={noop} onOpen={noop} workflowName="Check twice" />
    );
    expect(html).toContain('<optgroup label="Reusable pieces">');
    expect(html).toContain('>Find thirsty plants<');
    expect(html).toContain('disabled="">TriggerTest (it runs Check twice)<');
    expect(html).toContain('Open the piece ↗');
    expect(html).not.toContain('Choose a piece');
  });

  it('the piece row: an id not on this backend is shown and said, with no Open', () => {
    const choices = pieceChoices(WORKFLOWS, TRIGGERS, 'triggertest', 'later');
    const html = renderToStaticMarkup(<WorkflowPieceRow choices={choices} onChange={noop} workflowName="TriggerTest" />);
    expect(html).toContain('later (not on this backend)');
    expect(html).toContain('data-state="missing"');
    expect(html).not.toContain('Open the piece');
  });

  it('the piece row before the read lands says so', () => {
    expect(renderToStaticMarkup(<WorkflowPieceRow choices={null} onChange={noop} workflowName="x" />)).toContain(
      'Reading this backend’s workflows'
    );
  });

  it('send: the names the piece reads are one press away; the words are about the piece, not a function', () => {
    const words = {
      noun: 'value',
      add: '+ a value',
      empty: 'Check twice reads nothing it is given yet.',
      filled: (first: string) => `Check twice reads each value as body.<name>: this one as body.${first}.`,
      needsName: 'A value needs a name.'
    };
    const empty = renderToStaticMarkup(<WorkflowParamsEditor value={[]} onChange={noop} words={words} asks={['plant']} />);
    expect(empty).toContain('>+ plant<');
    expect(empty).toContain('>+ a value<');
    expect(empty).not.toContain('function');

    const filled = renderToStaticMarkup(
      <WorkflowParamsEditor value={[['plant', { $path: 'body.id' }]]} onChange={noop} words={words} asks={['plant']} />
    );
    expect(filled).not.toContain('>+ plant<'); // already a row
    expect(filled).toContain('aria-label="Value 1 name"');
    expect(filled).toContain('this one as body.plant.');
  });

  it("a Call Function step's params keep CWF-001's words (the known-firing arm)", () => {
    const html = renderToStaticMarkup(<WorkflowParamsEditor value={[]} onChange={noop} />);
    expect(html).toContain('>+ param<');
    expect(html).toContain('The function already receives the run payload');
  });
});

describe('P132 BWF-013 Build 4: the words of named values', () => {
  it("a piece's send names what the piece reads (s19: it said \"reads nothing\" beside + plant)", () => {
    expect(namedValuesWords('run-workflow', 'send', 'Find thirsty plants', ['plant']).empty).toBe(
      'Find thirsty plants reads plant from what it is given: press + plant to send it.'
    );
    expect(namedValuesWords('run-workflow', 'send', 'Find thirsty plants', []).empty).toContain('reads nothing it is given yet');
  });

  it("a call's headers and query speak of the call, not a piece", () => {
    expect(namedValuesWords('http-request', 'headers', 'x').empty).toContain('use Authentication');
    expect(namedValuesWords('http-request', 'query', 'x').filled('city')).toBe('Added to the address as ?city=….');
  });
});

