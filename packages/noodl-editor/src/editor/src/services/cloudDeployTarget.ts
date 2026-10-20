/**
 * P112-OWN021-PUSHTOALL — which backend a project's cloud functions are pushed to.
 *
 * WFA-001 pushed on every save to **every running local backend**, because a backend was never asked which project it
 * serves. On 0.4.2 that mixed two apps: a builder ran the marketplace's backend, opened the community app (no backend
 * of its own yet), and its first save pushed its 15 functions into the marketplace's backend. It failed only because
 * both had a `whoAmI` ("Duplicate component name /#__cloud__/whoAmI"); two apps with no shared name would have mixed
 * without a word.
 *
 * The project does know its backend: the one its endpoint (`cloudservices`) points at, which is where its Cloud
 * Function nodes send their calls. `matchEndpointToManaged` is the rule the panel's "This project uses this backend"
 * card (tier 1 of `partitionBackends`) and `ProjectBackendLifecycle`'s start-on-open already use. So the push goes
 * there, if it is running, and nowhere else. A project bound to no local backend pushes nothing.
 *
 * Pure apart from what it is handed, so `tests-unit` can grade the decision without a renderer.
 *
 * @module noodl-editor/services/cloudDeployTarget
 */

import { matchEndpointToManaged } from '@noodl-models/BackendServices/backendList';

export interface CloudDeployTargetDeps {
  /** The project's `cloudservices` metadata (`getCloudServices`), or undefined with no project. */
  endpoint: { endpoint?: string; id?: string } | undefined;
  invoke<T>(channel: string, ...args: unknown[]): Promise<T>;
  /** Push the project's functions to one backend; WFA-001's `pushToBackend`. */
  push(backendId: string): Promise<boolean>;
}

/** The backend the project's endpoint points at, if it is one of this machine's and it is running. */
async function findProjectBackend(
  endpoint: CloudDeployTargetDeps['endpoint'],
  invoke: CloudDeployTargetDeps['invoke']
): Promise<string | undefined> {
  let backends: { id: string; port: number }[];
  try {
    backends = (await invoke<{ id: string; port: number }[]>('backend:list')) || [];
  } catch {
    // No backend subsystem (or none configured) is not an error worth a toast on every save.
    return undefined;
  }

  const bound = matchEndpointToManaged(endpoint, backends);
  if (!bound) return undefined;

  try {
    const status = await invoke<{ running?: boolean }>('backend:status', bound.id);
    return status && status.running ? bound.id : undefined;
  } catch {
    return undefined;
  }
}

/** Push to the project's own running backend. @returns which, and whether the push took; undefined when there is none. */
export async function pushToProjectBackend(
  deps: CloudDeployTargetDeps
): Promise<{ backendId: string; ok: boolean } | undefined> {
  const backendId = await findProjectBackend(deps.endpoint, deps.invoke);
  if (!backendId) return undefined;
  return { backendId, ok: await deps.push(backendId) };
}
