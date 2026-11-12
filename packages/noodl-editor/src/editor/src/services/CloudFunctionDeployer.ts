/**
 * WFA-001 — pushes the project's cloud functions to its running local backend.
 *
 * This is the fourth cut the phase-27 scoping found: `backend:update-workflow`
 * has existed and worked since WF-004 and **had no caller**, so a backend
 * started from the Backend Services panel reported `functions: []` no matter
 * what the project contained (finding F6). Everything phases 19 and 22 built
 * was reachable only by hand-writing a bundle into a data directory.
 *
 * ## When it pushes
 *
 * - **On save** (`ProjectModel.projectSavedToDisk`), if the cloud export's hash
 *   changed. Autosave fires ~1s after any model change, so the hash is what
 *   keeps editing a browser component from redeploying every function.
 * - **On backend start**, so a backend started after the project was opened
 *   ends up with the project's functions rather than an empty list.
 * - **On demand**, from the Backend Services card.
 *
 * On-save was chosen over an explicit deploy button for feel; the spec's
 * objection to it — that a broken function silently replaces a working one — is
 * answered by making the result visible (`deployStateChanged` drives the card,
 * and a failure raises a toast) rather than by making the push manual. Silence
 * was the problem, not the automation.
 *
 * **Where it pushes: the project's own backend** — the local one its endpoint
 * points at, if it is running (`cloudDeployTarget.ts`). Until 0.4.3 a save
 * pushed to every running local backend, and a second app's functions landed in
 * the first app's backend (P112-OWN021-PUSHTOALL). A backend started from the
 * panel still gets a push at start (`onBackendStarted`), whichever it is.
 *
 * @module noodl-editor/services/CloudFunctionDeployer
 */

import { ipcInvoke } from '@noodl-utils/ipc';
import { ProjectModel } from '@noodl-models/projectmodel';
import { getCloudServices } from '@noodl-models/projectmodel.editor';

import { EventDispatcher } from '../../../shared/utils/EventDispatcher';

import { deployCloudFunctions, namedFailure, type CloudDeployTransport } from '../utils/exporter/cloudDeploy';
import {
  CloudComponentClassification,
  classifyCloudComponents,
  getCloudFunctionNames
} from '../utils/exporter/cloudFunctions';
import { pushToProjectBackend } from './cloudDeployTarget';
import { ToastLayer } from '../views/ToastLayer/ToastLayer';

/** Emitted whenever {@link CloudFunctionDeployer.getState} changes. */
export const CLOUD_FUNCTIONS_DEPLOY_STATE_CHANGED = 'CloudFunctionDeployer.stateChanged';

export interface CloudDeployState {
  /** Function names in the project right now, whether or not they are pushed. */
  functionNames: string[];
  /**
   * DEF-015 — the same components, each with the role that decides whether the
   * backend not serving it is news. `functionNames` is what the bundle carries;
   * this is what the backend can be *asked* about, and the card must diff on
   * the endpoints alone or it warns about every helper in every project.
   */
  cloudComponents: CloudComponentClassification[];
  /** `Date.now()` of the last successful push, per backend id. */
  lastPushedAt: Record<string, number>;
  /** Last push error, per backend id. Cleared by a success. */
  lastError: Record<string, string>;
  /** True while a push is in flight. */
  isPushing: boolean;
}

async function invokeIPC<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcInvoke<T>(channel, ...args);
}

class CloudFunctionDeployerImpl {
  /** Hash of the bundle last pushed successfully, per backend id. */
  private pushedHashes = new Map<string, string>();
  private lastPushedAt: Record<string, number> = {};
  private lastError: Record<string, string> = {};
  private isPushing = false;
  private started = false;

  public start(): void {
    if (this.started) return;
    this.started = true;

    EventDispatcher.instance.on(
      'ProjectModel.projectSavedToDisk',
      () => {
        // Fire-and-forget: a save must not wait on a backend, and a push
        // failure is reported through the state rather than thrown at the save.
        this.pushToProjectBackend({ reason: 'save' }).catch(() => undefined);
      },
      this
    );

    // A different project means different functions, and hashes from the old
    // one would suppress the first push of the new one.
    EventDispatcher.instance.on(
      'ProjectModel.instanceHasChanged',
      () => {
        this.pushedHashes.clear();
        this.lastPushedAt = {};
        this.lastError = {};
        this.notify();
      },
      this
    );
  }

  public getState(): CloudDeployState {
    return {
      functionNames: ProjectModel.instance ? getCloudFunctionNames(ProjectModel.instance) : [],
      cloudComponents: ProjectModel.instance ? classifyCloudComponents(ProjectModel.instance) : [],
      lastPushedAt: { ...this.lastPushedAt },
      lastError: { ...this.lastError },
      isPushing: this.isPushing
    };
  }

  /**
   * Push to one backend.
   *
   * 🔴 **HLS-013 — the decision lives in `cloudDeploy.ts` now, not here.** This
   * method is the editor's *transport* plus its toasts and card state; the
   * build, the fingerprint, the skip and the verdict are the same code a
   * headless caller runs, so a mutant in any of them reddens both doors. What
   * used to be inline here is what the two paths would have drifted apart on —
   * and SB-017 is this repo's record of what that drift costs.
   *
   * @param force ignore the change hash — used by the manual action and by
   *   backend start, where the backend's state is unknown rather than known to
   *   match.
   */
  public async pushToBackend(backendId: string, options: { force?: boolean; quiet?: boolean } = {}): Promise<boolean> {
    const project = ProjectModel.instance;
    if (!project) return false;

    const transport: CloudDeployTransport = {
      putBundle: async (name, workflow) => {
        const result = await invokeIPC<{ success?: boolean; error?: string; replaced?: string[] }>('backend:update-workflow', {
          backendId,
          name,
          workflow
        });
        if (result && result.success === false) {
          throw new Error(result.error || 'The backend rejected the function bundle.');
        }
        return { replaced: result?.replaced };
      },
      // The editor's own memory of what it last pushed to THIS backend. It is a
      // legitimate answer to "what is it serving" only because the editor is the
      // thing that put it there; a headless caller, which is a new process every
      // run, has to ask the backend instead.
      readServingHash: async () => this.pushedHashes.get(backendId) ?? null
    };

    this.isPushing = true;
    this.notify();

    let result;
    try {
      result = await deployCloudFunctions(project, transport, {
        force: options.force,
        // Only once this backend has seen the project: pushing an empty bundle
        // to one that never has would advertise nothing on a backend that was
        // fine. Same condition the inline version used, kept verbatim.
        deleteWhenEmpty: this.pushedHashes.has(backendId)
      });
    } finally {
      this.isPushing = false;
    }

    if (result.ok) {
      this.pushedHashes.set(backendId, result.hash);
      if (result.changed) this.lastPushedAt[backendId] = Date.now();
      delete this.lastError[backendId];
      this.notify();
      return true;
    }

    // The hash is deliberately NOT recorded: the next save must retry.
    const message = result.error || namedFailure(result);
    this.lastError[backendId] = message;
    if (!options.quiet) ToastLayer.showError(`Could not deploy cloud functions: ${message}`);
    // eslint-disable-next-line no-console
    console.error('[CloudFunctionDeployer] push failed', backendId, message);
    this.notify();
    return false;
  }

  /**
   * Push to the project's own running backend (P112-OWN021-PUSHTOALL), never to another project's.
   * @returns the backend pushed to and whether it took, or undefined when the project has none running.
   */
  public async pushToProjectBackend(
    options: { force?: boolean; reason?: string } = {}
  ): Promise<{ backendId: string; ok: boolean } | undefined> {
    const project = ProjectModel.instance;
    if (!project) return undefined;

    return pushToProjectBackend({
      endpoint: getCloudServices(project),
      invoke: invokeIPC,
      // An autosave-driven push is quiet on failure only for a backend that was
      // already failing; the first failure still tells the user.
      push: (backendId) =>
        this.pushToBackend(backendId, {
          force: options.force,
          quiet: options.reason === 'save' && Boolean(this.lastError[backendId])
        })
    });
  }

  /**
   * Called right after a backend starts. Always forced: a freshly started
   * backend has loaded whatever was on disk, which may be nothing (F6) or a
   * bundle from a previous session.
   */
  public async onBackendStarted(backendId: string): Promise<void> {
    this.pushedHashes.delete(backendId);
    await this.pushToBackend(backendId, { force: true });
  }

  private notify(): void {
    EventDispatcher.instance.notifyListeners(CLOUD_FUNCTIONS_DEPLOY_STATE_CHANGED, this.getState());
  }
}

export const CloudFunctionDeployer = new CloudFunctionDeployerImpl();
