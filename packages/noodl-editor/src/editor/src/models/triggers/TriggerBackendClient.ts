/**
 * The renderer's door to a backend's trigger registry (WFA-005).
 *
 * §5 of the spec said the panel and the canvas agree by going through THIS
 * module. Since BMG-012 the editor has no trigger panel: a trigger is authored
 * on the backend manager's Triggers page (the browser), and the canvas is the
 * one editor surface that reads triggers — it lists them, draws them as entry
 * nodes, and can enable, disable or delete one. Adding or editing one is a
 * door into the manager (`openTriggerInManager`).
 *
 * Two properties worth stating, both mirrors of `WorkflowBackendClient`:
 *
 *  - **Every call names a backend.** A trigger belongs to the backend whose
 *    `triggers.json` holds it. There is no "the" backend.
 *  - **Triggers are backend objects, not part of a workflow.** Drawing one on a
 *    workflow's canvas is a VIEW of a backend object; deleting that node deletes
 *    the trigger from the backend, and a trigger targeting a function rather
 *    than a workflow never appears on a canvas at all.
 *
 * @module models/triggers/TriggerBackendClient
 */

import { ipcInvoke } from '@noodl-utils/ipc';

import { managerRoutes, openBackendManager } from '../BackendServices/openBackendManager';

import { EventDispatcher } from '../../../../shared/utils/EventDispatcher';

export type TriggerType = 'schedule' | 'webhook' | 'db-change';
export type MissedFirePolicy = 'skip' | 'run-once-on-start';
export type WebhookScheme = 'hmac-sha256' | 'token';
export type ChangeAction = 'create' | 'update' | 'delete';

/**
 * What a fire answers its caller with (CWF-002).
 *
 * `async` is the default and is what every trigger created before this existed
 * does: `{executionId, status}`. `sync` answers with the workflow's own output —
 * a `return` step's value, or the last step's output — and only applies to a
 * workflow target, because a function target already relays its own response.
 */
export type ResponseMode = 'sync' | 'async';

/** What a trigger invokes. `name` is the function name, or the workflow **id**. */
export interface TriggerTarget {
  kind: 'function' | 'workflow';
  name: string;
}

export interface TriggerStatus {
  lastFiredAt: string | null;
  nextFireAt: string | null;
  lastResult: { ok: boolean; at: string; statusCode?: number; error?: string } | null;
  fireCount: number;
}

export interface TriggerDef {
  id: string;
  type: TriggerType;
  name?: string;
  enabled: boolean;
  target: TriggerTarget;
  responseMode?: ResponseMode;
  responseTimeoutMs?: number;
  schedule?: { cron: string; missedFirePolicy: MissedFirePolicy; payload?: Record<string, unknown> };
  /**
   * The schedule in a person's words, decorated by `GET /admin/triggers` (BMG-008,
   * `cronWords` in the backend). The one gloss: the editor used to keep a second,
   * partial copy for the canvas card, and two glosses of one cron drift. `null`
   * when the backend has no reading of the expression.
   */
  scheduleWords?: string | null;
  webhook?: { slug: string; scheme: WebhookScheme; maxBodyBytes: number };
  dbChange?: { collection: string; actions: ChangeAction[] };
  createdAt?: string;
  updatedAt?: string;
  status: TriggerStatus;
}

/**
 * A trigger on a backend was created, edited, toggled, rotated or deleted
 * (WFA-008 §4).
 *
 * Emitted by the write functions below rather than by their callers, which is
 * the same rule WFA-006 used to close F48: a caller that must remember to
 * announce a change is a caller that will forget. Since §5 of WFA-005 every
 * surface writes through this module, so this is the one place a change is
 * known to have happened.
 *
 * The listener that matters is the open workflow canvas, whose entry nodes are a
 * VIEW of these objects — and a re-targeted trigger changes which workflow it
 * belongs to at all, so redrawing is not optional.
 */
export const TRIGGERS_CHANGED = 'backend:triggersChanged';

export interface TriggersChangedDetail {
  backendId: string;
}

function announceChanged(backendId: string): void {
  EventDispatcher.instance.emit(TRIGGERS_CHANGED, { backendId } satisfies TriggersChangedDetail);
}

export async function listTriggers(backendId: string): Promise<TriggerDef[]> {
  const result = await ipcInvoke<{ triggers?: TriggerDef[] }>('backend:listTriggers', backendId);
  return result?.triggers || [];
}

export async function setTriggerEnabled(backendId: string, triggerId: string, enabled: boolean): Promise<void> {
  await ipcInvoke('backend:setTriggerEnabled', backendId, triggerId, enabled);
  announceChanged(backendId);
}

export async function deleteTrigger(backendId: string, triggerId: string): Promise<void> {
  await ipcInvoke('backend:deleteTrigger', backendId, triggerId);
  announceChanged(backendId);
}

/**
 * Adding or editing a trigger is done on the backend manager's Triggers page
 * (BMG-012): `#/triggers/new`, or `#/triggers/<id>` with that trigger's drawer
 * open. The main process resolves the credential and opens the browser.
 */
export async function openTriggerInManager(backendId: string, triggerId?: string): Promise<void> {
  await openBackendManager(backendId, triggerId ? managerRoutes.trigger(triggerId) : managerRoutes.newTrigger());
}

/**
 * Where this backend is listening, or `null` when it is not running.
 *
 * Built from the port the service actually bound (`status.port`) rather than the
 * configured one, because a backend started on port 0 binds something else and
 * the URL is the thing a user pastes into a third-party service.
 */
export async function fetchBackendEndpoint(backendId: string): Promise<string | null> {
  try {
    const status = await ipcInvoke<{ running?: boolean; port?: number; endpoint?: string }>(
      'backend:status',
      backendId
    );
    if (!status?.running) return null;
    return status.port ? `http://127.0.0.1:${status.port}` : status.endpoint || null;
  } catch {
    return null;
  }
}

/** `POST /hooks/<backendId>/<slug>` — the single most-wanted string in this feature. */
export function webhookUrl(endpoint: string, backendId: string, slug: string): string {
  return `${endpoint.replace(/\/+$/, '')}/hooks/${backendId}/${slug}`;
}
