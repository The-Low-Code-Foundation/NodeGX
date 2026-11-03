/**
 * P132 BWF-008 — what the Workflows panel is given to say: which project a running backend keeps, how its
 * workflows differ from that project's file, and where a save landed. The panel used to say "Saved to the
 * backend." whatever happened to the file (it never wrote one).
 */
import {
  reduceWorkflowDefs,
  savedSentence,
  type BackendWorkflowDefs
} from '../../src/editor/src/models/workflow/WorkflowBackendClient';

const KEPT: BackendWorkflowDefs = {
  backendId: 'be_1',
  backendName: 'Greenhouse',
  workflows: [],
  project: { dir: '/p/greenhouse', drift: ['"TriggerTest" on the backend is not what the project\'s file says.'] }
};
const LONE: BackendWorkflowDefs = { backendId: 'be_2', backendName: 'Scratch', workflows: [] };

describe('P132 BWF-008 the list knows each backend’s project', () => {
  it('carries the project directory of a backend started for one, and none for one that was not', () => {
    const { backends } = reduceWorkflowDefs([KEPT, LONE]);
    expect(backends).toEqual([
      { id: 'be_1', name: 'Greenhouse', reachable: true, projectDir: '/p/greenhouse' },
      { id: 'be_2', name: 'Scratch', reachable: true }
    ]);
  });

  it('names each backend that differs from its file, with the lines', () => {
    expect(reduceWorkflowDefs([KEPT, LONE]).drift).toEqual([
      { backendName: 'Greenhouse', lines: ['"TriggerTest" on the backend is not what the project\'s file says.'] }
    ]);
  });
});

describe('P132 BWF-008 a save says where it landed', () => {
  it('both', () => {
    expect(savedSentence({ file: 'nodegx.automations.json', written: true })).toBe(
      'Saved to the backend and to nodegx.automations.json.'
    );
  });
  it('the backend alone, and why', () => {
    expect(
      savedSentence({ file: 'nodegx.automations.json', written: false, reason: 'this backend was started without a project' })
    ).toBe('Saved to the backend only: this backend was started without a project.');
  });
});

describe('P132 BWF-008 a workflow on the canvas is not a component the app forgot to place', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { previewStrip } = require('../../src/editor/src/views/VisualCanvas/previewStripWords');
  const unplaced = (canvasComponent: string) =>
    previewStrip({ canvasLabel: 'triggertest', canvasComponent, screenLabel: 'Sign in', screenPage: '/Pages/Sign in', onScreen: false, isLogic: false, showingPages: [] });

  it('says nothing about pages over a workflow, while a component named the same still gets the sentence', () => {
    // The known-firing arm beside the absence: the same input, a component's name, says "isn't on any page yet".
    expect(unplaced('/triggertest').lead).toBe("triggertest isn't on any page yet");
    expect(unplaced('/#__workflow__/triggertest').lead ?? '').toBe('');
    expect(unplaced('/#__workflow__/triggertest').doors ?? []).toEqual([]);
  });
});

describe('P132 BWF-008 retry help speaks of the step, not "the function"', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { backoffSummary } = require('../../src/editor/src/models/workflow/retryBackoff');
  it('one attempt', () => {
    expect(backoffSummary({ maxAttempts: 1 })).toBe('No retry: the step runs once, and a failure fails it.');
  });
});
