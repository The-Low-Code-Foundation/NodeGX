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
