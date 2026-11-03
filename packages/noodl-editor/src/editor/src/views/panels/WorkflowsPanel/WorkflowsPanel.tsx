import { useBackendStatusChanged } from '@noodl-hooks/useBackendStatusChanged';
import { ipcInvoke } from '@noodl-utils/ipc';
import { useEventListener } from '@noodl-hooks/useEventListener';
import React, { useCallback, useEffect, useState } from 'react';

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { IconButton, IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { Tooltip } from '@noodl-core-ui/components/popups/Tooltip';
import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { ProjectModel } from '@noodl-models/projectmodel';
import { SidebarModel, SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';
import {
  listWorkflows,
  readProjectAutomations,
  runWorkflow,
  deleteWorkflow,
  savedSentence,
  type ProjectAutomationsFile,
  type ProjectFileNote,
  type WorkflowBackend,
  type WorkflowListResult
} from '@noodl-models/workflow/WorkflowBackendClient';
import { WorkflowDocument } from '@noodl-models/workflow/WorkflowDocument';
import { WorkflowEditorEvent, WorkflowEditorService } from '@noodl-models/workflow/WorkflowEditorService';
import {
  discardWorkflowProposal,
  listWorkflowProposals,
  type BackendProposals,
  type WorkflowProposal
} from '@noodl-models/workflow/WorkflowProposalClient';
import { openWorkflowProposal, ProposalRefused } from '@noodl-models/workflow/workflowProposalReview';

import { EventDispatcher } from '../../../../../shared/utils/EventDispatcher';
import styles from './WorkflowsPanel.module.scss';

import type { WorkflowRef } from '@noodl-models/workflow/types';

export const WorkflowsPanel_ID = 'workflows';

/** What starts a workflow, in words, for a row read from the file. */
const TRIGGER_WORDS: Record<string, string> = {
  schedule: 'a schedule',
  webhook: 'a webhook',
  'db-change': 'a table change'
};

/**
 * The Workflows panel (WFA-004) — where a workflow is found and opened.
 *
 * Workflows are NOT in the Components panel: a workflow is not a component, it
 * is a step list the backend runs (P132 R1: functions stay node graphs,
 * workflows stay step lists). But since P127 BKO-001 a workflow IS the
 * project's: it lives in `nodegx.automations.json` at the project root, travels
 * with a `git clone`, and a backend is a copy loaded from that file (R1,
 * 2026-10-26). WFA-004's first version said the opposite ("survives no git
 * clone"), true when it was written and wrong since.
 *
 * So (P132 BWF-008): a save goes to the backend first (it validates), then the
 * file, in the main process (`project-automations.js`), as Studio and the agent
 * write it; the status says where it landed. A backend whose workflows differ
 * from its project's file says how. With the project's backend not running,
 * the panel still lists the project's workflows from the file and says why
 * they cannot be opened yet: the canvas draws from the backend's step-kind
 * catalog, which only a running backend serves.
 *
 * Running backends are still listed by name, every row saying which backend it
 * is on: two can run at once, and a run happens on one of them.
 */
export function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState<WorkflowRef[]>([]);
  const [proposals, setProposals] = useState<BackendProposals[]>([]);
  const [unreachable, setUnreachable] = useState<string[]>([]);
  const [backendCount, setBackendCount] = useState(0);
  /** POL-015: the running backends, from the backends — not from their workflows. */
  const [backends, setBackends] = useState<WorkflowBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBackendId, setNewBackendId] = useState('');
  /** P132 BWF-008: the open project's own file, read whether or not a backend runs. */
  const [projectFile, setProjectFile] = useState<ProjectAutomationsFile | null>(null);
  const [drift, setDrift] = useState<WorkflowListResult['drift']>([]);
  const projectDir = ProjectModel.instance?._retainedProjectDirectory;

  const service = WorkflowEditorService.instance;
  const [document, setDocument] = useState<WorkflowDocument | null>(service.document);
  const [dirty, setDirty] = useState(service.document?.isDirty ?? false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listWorkflows();
    setWorkflows(result.workflows);
    setUnreachable(result.unreachable);
    setBackendCount(result.backendCount);
    setBackends(result.backends);
    setDrift(result.drift);
    setProjectFile(projectDir ? await readProjectAutomations(projectDir) : null);
    // POL-015 slice 3: a failure banner used to survive a successful Refresh and
    // even the workflow it complained about appearing in the list. A refresh that
    // worked is evidence the last failure is over. `status` is left alone — the
    // save handler sets it and then calls refresh.
    setError(null);
    // WFA-007: a proposal is staged by another PROCESS, so there is no event to
    // listen for — this panel's existing refresh points (open, become active,
    // backend status change, the Refresh button) are the moments it can learn
    // about one. Same staleness F61 records for a trigger written out of
    // process, and it will close the same way: a backend-side change bus.
    setProposals(await listWorkflowProposals());
    setLoading(false);
    // WFA-005: a workflow's triggers are drawn on its canvas as entry nodes, and
    // they are edited from a different surface (the Triggers panel, MCP, the
    // admin API). Refresh is the moment to re-read them, so the canvas is not
    // left showing an entry node that has been deleted somewhere else.
    await WorkflowEditorService.instance.document?.refreshTriggers().catch(() => undefined);
  }, [projectDir]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // WFA-002's F34: an inactive panel stays mounted and hidden, so becoming
  // active is a moment worth re-reading another process's state at.
  useEventListener(SidebarModel.instance, SidebarModelEvent.activeChanged, () => {
    if (SidebarModel.instance.ActiveId !== WorkflowsPanel_ID) return;
    refresh();
  });

  // F47, closed in WFA-005. `activeChanged` could not help the case that
  // actually bites: this panel already open and in front of you when a backend
  // starts, still reading "Start a backend to author workflows" until Refresh.
  // There is now an event for it.
  useBackendStatusChanged(refresh);

  useEventListener(service, WorkflowEditorEvent.documentChanged, () => {
    setDocument(service.document);
    setDirty(service.document?.isDirty ?? false);
  });
  useEventListener(service, WorkflowEditorEvent.dirtyChanged, () => setDirty(service.document?.isDirty ?? false));
  useEventListener(service, WorkflowEditorEvent.saved, (args: { project?: ProjectFileNote | null }) => {
    setStatus(savedSentence(args?.project ?? null));
    refresh();
  });

  const guard = useCallback(async (what: string, fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await fn();
    } catch (e) {
      // The backend validator's own message names the step and the problem.
      // Shown verbatim: it is the same text that would appear if this
      // definition ever stopped a backend from booting.
      setError(`${what} failed.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const open = useCallback(
    (ref: WorkflowRef) => guard(`Opening ${ref.name}`, async () => void (await service.open(ref))),
    [guard, service]
  );

  const save = useCallback(
    () => guard('Saving', async () => void (await service.document?.save())),
    [guard, service]
  );

  /**
   * §7: run it, and pin the execution to this canvas in one gesture.
   *
   * The pin rides `execution:pinToCanvas`, the event `ExecutionDetail` already
   * emits and the overlay already listens for (F17) — so authoring and watching
   * are the same surface, which is the point of the phase.
   */
  const run = useCallback(
    () =>
      guard('Running', async () => {
        const doc = service.document;
        if (!doc) return;
        if (doc.isDirty) await doc.save();

        const executionId = await runWorkflow(doc.ref.backendId, doc.definition.id, {});
        if (!executionId) {
          // F33: the run route answers only on completion, behind a hard
          // 30-second request ceiling. A `wait` step legitimately outlives it,
          // and calling that a failure was the lie WFA-002 removed.
          setStatus('Still running — it outlived the request ceiling. Watch it in Execution History.');
          return;
        }

        const execution = await ipcInvoke<{ error?: string } | null>('execution-history:get', executionId);
        if (!execution || execution.error) {
          setStatus(`Ran as ${executionId}, but its record could not be read back.`);
          return;
        }

        setStatus(`Ran as ${executionId} — pinned to the canvas.`);
        EventDispatcher.instance.emit('execution:pinToCanvas', { execution });
      }),
    [guard, service]
  );

  const remove = useCallback(
    (ref: WorkflowRef) =>
      guard(`Deleting ${ref.name}`, async () => {
        const project = await deleteWorkflow(ref.backendId, ref.id);
        if (service.isOpen(ref.backendId, ref.id)) service.close();
        await refresh();
        setStatus(
          project?.written
            ? `Deleted from the backend and from ${project.file}.`
            : `Deleted from the backend only${project?.reason ? `: ${project.reason}` : ''}.`
        );
      }),
    [guard, refresh, service]
  );

  /**
   * Open a proposal as a diff on the canvas.
   *
   * A candidate the backend would refuse never opens: the message is the
   * BACKEND's, shown as the proposal's failure, because being asked to accept
   * something that cannot be saved is worse than being told the AI got it wrong.
   */
  const review = useCallback(
    (backend: BackendProposals, proposal: WorkflowProposal) =>
      guard(`Reviewing ${proposal.workflow.name || proposal.workflowId}`, async () => {
        try {
          await openWorkflowProposal(proposal, { backendName: backend.backendName, onDone: refresh });
        } catch (e) {
          if (e instanceof ProposalRefused) {
            setError(e.message);
            return;
          }
          throw e;
        }
      }),
    [guard, refresh]
  );

  const discard = useCallback(
    (backend: BackendProposals, proposal: WorkflowProposal) =>
      guard('Discarding the proposal', async () => {
        await discardWorkflowProposal(backend.backendId, proposal.proposalId);
        await refresh();
      }),
    [guard, refresh]
  );

  /**
   * The backends a workflow can actually be created on, in offer order.
   *
   * POL-015: running and answering. A backend that is running but unreachable
   * cannot serve its step-kind catalog, so offering it only moves the failure
   * to after the Create click.
   */
  const creatable = backends.filter((b) => b.reachable);
  /** P132 BWF-008: is this project's own backend up and answering? Without it the file's workflows are read-only. */
  const ownBackendUp = !!projectDir && creatable.some((b) => b.projectDir === projectDir);
  const fileWorkflows = projectFile?.workflows ?? [];
  const startedBy = (id: string) =>
    (projectFile?.triggers ?? [])
      .filter((t) => t.target?.kind === 'workflow' && t.target?.name === id)
      .map((t) => TRIGGER_WORDS[t.type ?? ''] ?? 'a trigger');
  const defaultBackendId = creatable[0]?.id ?? '';

  const create = useCallback(
    () =>
      guard('Creating', async () => {
        // Was `newBackendId || workflows[0]?.backendId || ''` — three sources that
        // are all empty on a backend with no workflows yet, which passed `''` to
        // `WorkflowDocument.create` and failed with "Backend must be running".
        const backendId = newBackendId || defaultBackendId;
        const backend = backends.find((b) => b.id === backendId);
        if (!backendId || !backend) {
          throw new Error(
            'No running backend to create this workflow on. Start one from the Backend Services panel, then Refresh.'
          );
        }
        if (!backend.reachable) {
          throw new Error(`${backend.name} is running but not answering, so it cannot say which steps it supports.`);
        }
        const backendName = backend.name;
        const name = newName.trim() || 'New workflow';
        const id = `wf_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'new'}`;

        const doc = await WorkflowDocument.create({ backendId, backendName, id, name }, 'call-function');
        service.adopt(doc);
        setCreating(false);
        setNewName('');
        setStatus('Created on the canvas. It is not on the backend until you save it.');
      }),
    [guard, newBackendId, newName, service, backends, defaultBackendId]
  );

  // Grouping the LIST is still a question about the workflows — a backend with
  // none of them needs no heading. Only the create form asks the other question,
  // "which backends exist", and that is what POL-015 stopped answering from here.
  const grouped = [...new Map(workflows.map((w) => [w.backendId, w.backendName])).entries()].map(([id, name]) => ({
    id,
    name,
    items: workflows.filter((w) => w.backendId === id)
  }));

  return (
    <BasePanel
      title="Workflows"
      isFill
      UNSAFE_content_style={{ paddingInline: 0, paddingTop: 0 }}
      headerSlot={
        <>
          <Tooltip
            content={creatable.length === 0 ? 'No running backend to create a workflow on' : 'New workflow'}
            showAfterMs={300}
          >
            {/* POL-015 slice 2: gated on a backend that can ANSWER, not merely on
                one being up. A running-but-unreachable backend cannot serve a
                step-kind catalog, and offering the create only defers the error. */}
            <IconButton
              ariaLabel="New workflow"
              icon={IconName.Plus}
              variant={IconButtonVariant.Transparent}
              onClick={() => setCreating((c) => !c)}
              isDisabled={creatable.length === 0}
              testId="workflows-new"
            />
          </Tooltip>
          <Tooltip content="Refresh" showAfterMs={300}>
            <IconButton
              ariaLabel="Refresh"
              icon={IconName.Refresh}
              variant={IconButtonVariant.Transparent}
              onClick={refresh}
              testId="workflows-refresh"
            />
          </Tooltip>
        </>
      }
    >
      <div className={styles.Body}>
        {document && (
          <div className={styles.OpenBar}>
            <div className={styles.OpenTitle}>
              {document.component.displayName}
              {dirty && <span className={styles.Dirty}> — unsaved</span>}
            </div>
            <div className={styles.OpenMeta}>
              On {document.ref.backendName}. Entry step: {document.entry}.
            </div>
            <div className={styles.Actions}>
              <button className={`${styles.Button} ${styles.Primary}`} onClick={save} disabled={busy || !dirty}>
                Save
              </button>
              <button className={styles.Button} onClick={run} disabled={busy}>
                Run &amp; pin
              </button>
              <button className={styles.Button} onClick={() => service.close()} disabled={busy}>
                Close
              </button>
              <button
                className={`${styles.Button} ${styles.Danger}`}
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
            {confirmDelete && (
              <div className={styles.Actions}>
                <span className={styles.Status}>Delete it from {document.ref.backendName}?</span>
                <button
                  className={`${styles.Button} ${styles.Danger}`}
                  onClick={() => {
                    setConfirmDelete(false);
                    remove({
                      backendId: document.ref.backendId,
                      backendName: document.ref.backendName,
                      id: document.definition.id,
                      name: document.component.displayName,
                      stepCount: 0
                    });
                  }}
                >
                  Yes, delete
                </button>
                <button className={styles.Button} onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </div>
            )}
          </div>
        )}

        {/*
          WFA-007: status and error moved OUT of the open-workflow bar.
          They lived inside `{document && …}`, so anything that failed while no
          workflow was open reported itself to nobody — which is exactly what
          WFA-004's notes describe as "a click that appears to do nothing is
          what a thrown-and-caught open looks like". Opening a workflow, and now
          reviewing a proposal, are both things you do with nothing open.
        */}
        {status && <div className={`${styles.Notice} ${styles.Status}`}>{status}</div>}
        {error && <div className={`${styles.Notice} ${styles.Error}`}>{error}</div>}

        {creating && (
          <div className={styles.Form}>
            <input
              className={styles.Input}
              placeholder="Workflow name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Workflow name"
            />
            {creatable.length > 1 && (
              <select
                className={styles.Select}
                value={newBackendId || defaultBackendId}
                onChange={(e) => setNewBackendId(e.target.value)}
                aria-label="Backend"
              >
                {creatable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {creatable.length === 1 && <div className={styles.OpenMeta}>On {creatable[0].name}.</div>}
            <div className={styles.Actions}>
              <button className={`${styles.Button} ${styles.Primary}`} onClick={create} disabled={busy}>
                Create
              </button>
              <button className={styles.Button} onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* P132 BWF-008: the project's own workflows, from its file, while its backend is not running. */}
        {!loading && !ownBackendUp && projectFile?.error && (
          <div className={`${styles.Notice} ${styles.Error}`}>{projectFile.error}</div>
        )}
        {!loading && !ownBackendUp && fileWorkflows.length > 0 && (
          <div data-testid="workflows-from-file">
            <div className={styles.Notice}>
              <strong className={styles.NoticeTitle}>This project&rsquo;s workflows, from nodegx.automations.json.</strong>
              They can&rsquo;t be opened, changed or run until this project&rsquo;s backend is running: the canvas
              draws each step from what the backend says it can do. Start it from the Backend Services panel.
            </div>
            {fileWorkflows.map((w) => {
              const starts = startedBy(w.id);
              return (
                <div key={`file::${w.id}`} className={`${styles.Item} ${styles.ItemReadOnly}`} title="Start the backend to open it">
                  <span className={styles.ItemName}>{w.name || w.id}</span>
                  <span className={styles.ItemMeta}>
                    {w.steps?.length ?? 0} {(w.steps?.length ?? 0) === 1 ? 'step' : 'steps'}
                    {starts.length > 0 ? ` · starts on ${starts.join(', ')}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!loading && !ownBackendUp && fileWorkflows.length === 0 && !projectFile?.error && backendCount === 0 && (
          <div className={styles.Notice}>
            <strong className={styles.NoticeTitle}>No workflows in this project yet.</strong>
            A workflow is made and run on the project&rsquo;s backend, and kept in the project&rsquo;s
            nodegx.automations.json. Start the backend from the Backend Services panel, then use + above.
          </div>
        )}

        {drift.map((d) => (
          <div key={`drift-${d.backendName}`} className={styles.Notice} data-testid="workflows-drift">
            <strong className={styles.NoticeTitle}>{d.backendName} is not what the project&rsquo;s file says.</strong>
            {d.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            The file is the project&rsquo;s truth: a backend started fresh from it loads the file&rsquo;s version.
          </div>
        ))}

        {!loading && backendCount > 0 && workflows.length === 0 && (
          <div className={styles.Notice}>
            <strong className={styles.NoticeTitle}>No workflows on this backend yet.</strong>
            Use + above to make one. It stays on the canvas until you save it.
          </div>
        )}

        {unreachable.length > 0 && (
          <div className={styles.Notice}>Could not read workflows from {unreachable.join(', ')}.</div>
        )}

        {/* WFA-007: proposals first — an unreviewed suggestion is the thing
            that needs a decision, and burying it under the workflow list is how
            "review your AI's work" becomes a feature nobody finds. */}
        {proposals
          .filter((backend) => backend.proposals.length > 0)
          .map((backend) => (
            <div key={`proposals-${backend.backendId}`}>
              <div className={styles.ProposalGroup}>
                Proposed for {backend.backendName} — {backend.proposals.length} awaiting review
              </div>
              {backend.proposals.map((proposal) => (
                <div key={proposal.proposalId} className={styles.Proposal}>
                  <div className={styles.ProposalTitle}>
                    {proposal.workflow.name || proposal.workflowId}
                    <span className={styles.ProposalMeta}>
                      {' '}
                      — {proposal.mode === 'create' ? 'new workflow' : 'changes to an existing workflow'}
                    </span>
                  </div>
                  <div className={styles.ProposalMeta}>
                    From {proposal.origin}. Nothing is written until you accept.
                  </div>
                  {proposal.note && <div className={styles.ProposalNote}>“{proposal.note}”</div>}
                  <div className={styles.Actions}>
                    <button
                      className={`${styles.Button} ${styles.Primary}`}
                      onClick={() => review(backend, proposal)}
                      disabled={busy}
                    >
                      Review on the canvas
                    </button>
                    <button className={styles.Button} onClick={() => discard(backend, proposal)} disabled={busy}>
                      Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {grouped.map((group) => (
          <div key={group.id}>
            <div className={styles.BackendGroup}>{group.name}</div>
            {group.items.map((w) => (
              <button
                key={`${w.backendId}::${w.id}`}
                className={`${styles.Item} ${service.isOpen(w.backendId, w.id) ? styles.ItemOpen : ''}`}
                onClick={() => open(w)}
                title="Open on the canvas"
              >
                <span className={styles.ItemName}>{w.name}</span>
                <span className={styles.ItemMeta}>
                  {w.stepCount} {w.stepCount === 1 ? 'step' : 'steps'}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </BasePanel>
  );
}
