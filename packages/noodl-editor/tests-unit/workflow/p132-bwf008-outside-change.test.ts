/**
 * P132 BWF-008 AC2 — a workflow changed in Studio (or by the agent, or a git pull) shows in the editor. Both write the
 * project's `nodegx.automations.json` and share one backend; the editor's file watcher dropped that file (it mapped
 * components, the three project-level files and scripts only), so the Workflows panel learned of Studio's change only
 * on Refresh and an open workflow's canvas never did — and its next Save put the old steps back over Studio's.
 *
 * Graded here: the watcher reports the file, the decision (own save / reload / ask / gone), and the service acting on
 * it. The crossing itself (two apps on one copy) is the drive in BWF-008's record.
 */
const toasts: { kind: string; title?: string; actions?: { label: string; onClick: () => void }[] }[] = [];
const opened: string[] = [];
let backendDefs: unknown[] = [];

jest.mock('../../src/editor/src/contexts/NodeGraphContext/NodeGraphContext', () => ({
  NodeGraphContextTmp: { nodeGraph: { clearSelection: () => undefined }, switchToComponent: () => undefined }
}));
jest.mock('../../src/editor/src/views/ToastLayer/ToastLayer', () => ({
  ToastLayer: {
    showInfo: (_m: string, o: { title?: string }) => toasts.push({ kind: 'info', ...o }),
    showWarning: (_m: string, o: { title?: string }) => toasts.push({ kind: 'warning', ...o }),
    hideActivity: (id: string) => toasts.push({ kind: `hidden ${id}` })
  }
}));
jest.mock('../../src/editor/src/models/workflow/WorkflowBackendClient', () => ({
  listWorkflowDefinitions: async () => backendDefs
}));
jest.mock('../../src/editor/src/models/workflow/workflowDescent', () => ({ clearDescent: () => undefined }));
jest.mock('../../src/editor/src/models/workflow/WorkflowDocument', () => ({
  WorkflowDocument: {
    open: async (ref: { id: string }) => {
      opened.push(ref.id);
      return fakeDoc({ updatedAt: 'theirs' });
    }
  }
}));

import { ProjectFileWatcher, isAutomationsFile, type WatchHandle } from '../../src/editor/src/services/ProjectFileWatcher';
import { decideOutsideChange } from '../../src/editor/src/models/workflow/workflowOutsideChange';
import { WorkflowEditorService } from '../../src/editor/src/models/workflow/WorkflowEditorService';

function fakeDoc(opts: { updatedAt: string; dirty?: boolean; saving?: Promise<void>; onSaved?: () => void }) {
  const doc = {
    ref: { backendId: 'be1', backendName: 'Greenhouse backend', id: 'morning', name: 'The morning check', stepCount: 3 },
    definition: { id: 'morning', updatedAt: opts.updatedAt },
    isDirty: !!opts.dirty,
    component: { displayName: 'The morning check' },
    on: () => undefined,
    off: () => undefined,
    dispose: () => undefined,
    settled: async () => {
      if (opts.saving) await opts.saving;
    }
  };
  return doc as never;
}
const onBackend = (updatedAt: string | null) => {
  backendDefs = [
    {
      backendId: 'be1',
      backendName: 'Greenhouse backend',
      workflows: updatedAt === null ? [] : [{ id: 'morning', name: 'The morning check', updatedAt, steps: [{}, {}, {}, {}] }]
    }
  ];
};

describe('P132 BWF-008 AC2 — the watcher reports nodegx.automations.json', () => {
  it('names the file at the project root only, never a staging copy or a nested one', () => {
    expect(isAutomationsFile('nodegx.automations.json')).toBe(true);
    expect(isAutomationsFile('nodegx.automations.json.tmp')).toBe(false);
    expect(isAutomationsFile('sub/nodegx.automations.json')).toBe(false);
    expect(isAutomationsFile('nodegx.project.json')).toBe(false);
  });

  it('a write to it calls onAutomationsChanged once per settled change, and not for a component write', () => {
    let emit: (p: string) => void = () => undefined;
    const timers: (() => void)[] = [];
    const watcher = new ProjectFileWatcher({
      watchFactory: (_d, onEvent) => {
        emit = onEvent;
        return { close: () => undefined } as WatchHandle;
      },
      setTimeoutFn: (fn) => timers.push(fn),
      clearTimeoutFn: () => undefined
    });
    const seen: string[] = [];
    watcher.start('/p', (c) => seen.push(`components ${c.join()}`), undefined, undefined, () => seen.push('automations'));

    emit('nodegx.automations.json.tmp');
    emit('nodegx.automations.json');
    emit('nodegx.automations.json');
    timers[timers.length - 1]();
    expect(seen).toEqual(['automations']);

    seen.length = 0;
    emit('components/Home/nodes.json');
    timers[timers.length - 1]();
    expect(seen).toEqual(['components Home']);
  });
});

describe('P132 BWF-008 AC2 — what the open workflow does', () => {
  it('decides by the backend stamp: same is ours, newer redraws, unsaved edits ask, missing is gone', () => {
    expect(decideOutsideChange({ theirs: 'a', mine: 'a', dirty: false })).toBe('unchanged');
    expect(decideOutsideChange({ theirs: 'a', mine: 'a', dirty: true })).toBe('unchanged');
    expect(decideOutsideChange({ theirs: 'b', mine: 'a', dirty: false })).toBe('reload');
    expect(decideOutsideChange({ theirs: 'b', mine: 'a', dirty: true })).toBe('ask');
    expect(decideOutsideChange({ theirs: null, mine: 'a', dirty: false })).toBe('gone');
  });

  beforeEach(() => {
    toasts.length = 0;
    opened.length = 0;
  });

  it('Studio saved it, nothing unsaved here: the canvas is redrawn from the backend and says so', async () => {
    const service = new WorkflowEditorService();
    service.adopt(fakeDoc({ updatedAt: 'mine' }));
    onBackend('theirs');
    const events: string[] = [];
    service.on('automationsChanged', () => events.push('panel re-reads'), {});
    expect(await service.automationsFileChanged()).toBe('reload');
    expect(opened).toEqual(['morning']);
    expect(events).toEqual(['panel re-reads']);
    expect(toasts.map((t) => t.title)).toEqual(['Redrawn from the backend']);
  });

  it("the editor's own save coming back through the file redraws nothing", async () => {
    const service = new WorkflowEditorService();
    service.adopt(fakeDoc({ updatedAt: 'mine' }));
    onBackend('mine');
    expect(await service.automationsFileChanged()).toBe('unchanged');
    expect(opened).toEqual([]);
    expect(toasts).toEqual([]);
  });

  it('a save still in flight is waited for, so its own echo is never read as a change elsewhere', async () => {
    const service = new WorkflowEditorService();
    // the save's answer lands well after the watcher fired (the backend wrote the file before it answered)
    let doc: { definition: { updatedAt: string }; isDirty: boolean } | null = null;
    const saving = new Promise<void>((r) =>
      setTimeout(() => {
        doc!.definition.updatedAt = 'after-my-save';
        doc!.isDirty = false;
        r();
      }, 20)
    );
    doc = fakeDoc({ updatedAt: 'before', dirty: true, saving }) as unknown as typeof doc;
    service.adopt(doc as never);
    onBackend('after-my-save');
    expect(await service.automationsFileChanged()).toBe('unchanged');
    expect(toasts).toEqual([]);
  });

  it('unsaved edits here: nothing replaced, the person is told and offered theirs', async () => {
    const service = new WorkflowEditorService();
    service.adopt(fakeDoc({ updatedAt: 'mine', dirty: true }));
    onBackend('theirs');
    expect(await service.automationsFileChanged()).toBe('ask');
    expect(opened).toEqual([]);
    expect(toasts[0].title).toBe('Changed in two places');
    expect(toasts[0].actions?.map((a) => a.label)).toEqual(['Take theirs']);
    toasts[0].actions?.[0].onClick();
    await new Promise((r) => setTimeout(r, 0));
    expect(opened).toEqual(['morning']);
    // the warning goes with the choice (in the app it stayed up, still offering Take theirs, after the press)
    expect(toasts[1].kind).toBe('hidden bwf008-outside-change');
  });

  it('deleted elsewhere: said, left open (a Save puts it back)', async () => {
    const service = new WorkflowEditorService();
    service.adopt(fakeDoc({ updatedAt: 'mine' }));
    onBackend(null);
    expect(await service.automationsFileChanged()).toBe('gone');
    expect(opened).toEqual([]);
    expect(toasts[0].title).toBe('Deleted elsewhere');
  });

  it('no workflow open, or the backend not answering: the panel still re-reads, nothing else happens', async () => {
    const service = new WorkflowEditorService();
    const events: string[] = [];
    service.on('automationsChanged', () => events.push('panel re-reads'), {});
    expect(await service.automationsFileChanged()).toBe('closed');
    service.adopt(fakeDoc({ updatedAt: 'mine' }));
    backendDefs = [{ backendId: 'be1', backendName: 'Greenhouse backend', workflows: [], error: 'not running' }];
    expect(await service.automationsFileChanged()).toBe('unreadable');
    expect(events).toEqual(['panel re-reads', 'panel re-reads']);
    expect(opened).toEqual([]);
  });
});
