/**
 * The one place that knows which workflow is open on the canvas (WFA-004).
 *
 * A workflow is not a project component, so `ProjectModel` cannot answer "what
 * is this canvas showing?" for one. This singleton can — which is what lets the
 * Workflows panel, the canvas HUD and the navigation history all agree without
 * any of them holding a reference to the others.
 *
 * Only one workflow is open at a time. That is not a limitation working around
 * something: a workflow belongs to one backend, and the canvas shows one graph.
 *
 * @module models/workflow/WorkflowEditorService
 */

import { NodeGraphContextTmp } from '../../contexts/NodeGraphContext/NodeGraphContext';
import Model from '../../../../shared/model';
import { ToastLayer } from '../../views/ToastLayer/ToastLayer';
import { listWorkflowDefinitions } from './WorkflowBackendClient';
import { clearDescent } from './workflowDescent';
import { WorkflowDocument } from './WorkflowDocument';
import { decideOutsideChange, type OutsideChange } from './workflowOutsideChange';

import type { WorkflowRef } from './types';

/** Empty the canvas's selection, and with it the Properties panel. */
function clearStepSelection() {
  (NodeGraphContextTmp.nodeGraph as { clearSelection?: () => void } | undefined)?.clearSelection?.();
}

export enum WorkflowEditorEvent {
  /** The open workflow changed (including to none). */
  documentChanged = 'documentChanged',
  /** The open workflow gained or lost unsaved edits. */
  dirtyChanged = 'dirtyChanged',
  /** It was written back to the backend. */
  saved = 'saved',
  /** P132 BWF-008 AC2: `nodegx.automations.json` changed on disk, by anyone (the Workflows panel re-reads). */
  automationsChanged = 'automationsChanged'
}

export class WorkflowEditorService extends Model {
  public static instance = new WorkflowEditorService();

  private _document: WorkflowDocument | null = null;

  get document(): WorkflowDocument | null {
    return this._document;
  }

  /** Is the canvas currently showing this workflow? */
  isOpen(backendId: string, workflowId: string): boolean {
    return this._document?.ref.backendId === backendId && this._document?.definition.id === workflowId;
  }

  /**
   * Open a workflow on the canvas.
   *
   * `switchToComponent` is the canvas's only door, and the adapter is what goes
   * through it. `pushHistory` is deliberately false: `NavigationHistory`
   * resolves its entries through `ProjectModel.getComponentWithName`, which
   * cannot find a workflow — an entry pushed there would be silently discarded
   * on the next back/forward, which is worse than not offering it.
   */
  async open(ref: WorkflowRef): Promise<WorkflowDocument> {
    const document = await WorkflowDocument.open(ref);
    this.adopt(document);
    return document;
  }

  adopt(document: WorkflowDocument) {
    // P132-STALESTEPPANEL: the step on the Properties panel belongs to the graph being replaced. Left there, a change
    // typed into it edits a disposed document and is lost; `switchToComponent` clears it only when given a node.
    if (this._document) clearStepSelection();
    this._document?.dispose();
    // WFA-006: a descent points back at the workflow it came from, and that
    // workflow is about to be replaced. The pointer is cleared here rather than
    // left to expire, because `descentFor` matches on the FUNCTION component —
    // a stale pointer would offer a crumb back to a disposed document.
    clearDescent();
    this._document = document;

    document.on(
      'dirtyChanged',
      ({ dirty }: { dirty: boolean }) => this.notifyListeners(WorkflowEditorEvent.dirtyChanged, { dirty }),
      this
    );
    document.on('saved', (args: unknown) => this.notifyListeners(WorkflowEditorEvent.saved, args), this);

    NodeGraphContextTmp.switchToComponent?.(document.component, { pushHistory: false });
    this.notifyListeners(WorkflowEditorEvent.documentChanged, { document });
  }

  /**
   * P132 BWF-008 AC2 — the project's `nodegx.automations.json` changed (the file watcher): Studio saved, the agent
   * wrote, a git pull. The Workflows panel re-reads, and the open workflow is redrawn from the backend when the
   * backend's copy is not the one on the canvas and nothing is unsaved here. With unsaved edits nothing is replaced:
   * the person is told and offered theirs (a Save keeps mine). Studio and the editor share one backend per project
   * (`~/.noodl/backends`, adopted when running), so the backend holds what the other surface saved.
   * Resolves with what it did, for the spec and the drive.
   */
  async automationsFileChanged(): Promise<OutsideChange | 'closed' | 'unreadable'> {
    this.notifyListeners(WorkflowEditorEvent.automationsChanged);
    const document = this._document;
    if (!document) return 'closed';
    await document.settled();
    if (this._document !== document) return 'closed';
    const backend = (await listWorkflowDefinitions()).find((b) => b.backendId === document.ref.backendId);
    // a backend that is not running or did not answer says nothing about whether it changed
    if (!backend || backend.error) return 'unreadable';
    if (this._document !== document) return 'closed';
    const theirs = (backend.workflows || []).find((w) => w.id === document.definition.id);
    const decision = decideOutsideChange({
      theirs: theirs ? theirs.updatedAt || '' : null,
      mine: document.definition.updatedAt,
      dirty: document.isDirty
    });
    const name = document.component.displayName;
    const id = 'bwf008-outside-change';
    if (decision === 'reload') {
      await this.open({ ...document.ref, name: theirs?.name || document.ref.name, stepCount: theirs?.steps?.length ?? 0 });
      ToastLayer.showInfo(`"${name}" was changed outside the editor (Studio or the agent), and is drawn as it is now.`, {
        title: 'Redrawn from the backend',
        id
      });
    } else if (decision === 'ask') {
      ToastLayer.showWarning(
        `"${name}" was changed outside the editor while you have unsaved changes to it. Save keeps yours (theirs is replaced); Take theirs drops yours.`,
        {
          title: 'Changed in two places',
          id,
          duration: 20000,
          actions: [
            {
              label: 'Take theirs',
              onClick: () => {
                ToastLayer.hideActivity(id); // the choice is made: the warning offering it goes
                if (this._document === document) void this.open({ ...document.ref, name: theirs?.name || document.ref.name });
              }
            }
          ]
        }
      );
    } else if (decision === 'gone') {
      ToastLayer.showWarning(`"${name}" is no longer on the backend: it was deleted outside the editor. Save puts it back.`, {
        title: 'Deleted elsewhere',
        id
      });
    }
    return decision;
  }

  /** Leave the workflow canvas. Does not save — that is always deliberate. */
  close() {
    if (!this._document) return;
    clearStepSelection(); // P132-STALESTEPPANEL, as in `adopt`
    this._document.off(this);
    this._document.dispose();
    this._document = null;
    clearDescent();
    this.notifyListeners(WorkflowEditorEvent.documentChanged, { document: null });
  }
}

// P132 BWF-013: a Run a workflow step's *Open the piece* opens it through this service, the canvas's one owner.
WorkflowDocument.openWorkflow = (ref) => WorkflowEditorService.instance.open(ref);
