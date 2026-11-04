/**
 * P132-STALESTEPPANEL — opening another workflow (from the list, or a Run a workflow step's *Open the piece*) left the
 * last workflow's step on the Properties panel, editing a disposed graph. The canvas clears its selection only when a
 * switch names a node, so the workflow service clears it whenever it replaces or closes the open document.
 */
const calls: string[] = [];
jest.mock('../../src/editor/src/contexts/NodeGraphContext/NodeGraphContext', () => ({
  NodeGraphContextTmp: {
    nodeGraph: { clearSelection: () => calls.push('clearSelection') },
    switchToComponent: () => calls.push('switchToComponent')
  }
}));
jest.mock('../../src/editor/src/models/workflow/WorkflowDocument', () => ({ WorkflowDocument: {} }));
jest.mock('../../src/editor/src/models/workflow/workflowDescent', () => ({ clearDescent: () => undefined }));

import { WorkflowEditorService } from '../../src/editor/src/models/workflow/WorkflowEditorService';

const doc = (name: string) =>
  ({
    component: { name },
    on: () => undefined,
    off: () => undefined,
    dispose: () => calls.push(`dispose ${name}`)
  }) as never;

describe('P132-STALESTEPPANEL a workflow replaced or closed takes its step out of the Properties panel', () => {
  beforeEach(() => (calls.length = 0));

  it('the first workflow opened clears nothing (there is no step of another graph to clear)', () => {
    const service = new WorkflowEditorService();
    service.adopt(doc('a'));
    expect(calls).toEqual(['switchToComponent']);
  });

  it('replacing one clears the selection before the old document goes', () => {
    const service = new WorkflowEditorService();
    service.adopt(doc('a'));
    calls.length = 0;
    service.adopt(doc('b'));
    expect(calls).toEqual(['clearSelection', 'dispose a', 'switchToComponent']);
  });

  it('closing one clears it too', () => {
    const service = new WorkflowEditorService();
    service.adopt(doc('a'));
    calls.length = 0;
    service.close();
    expect(calls).toEqual(['clearSelection', 'dispose a']);
  });
});
