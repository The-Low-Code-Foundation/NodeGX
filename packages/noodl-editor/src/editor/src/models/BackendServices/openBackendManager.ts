/**
 * The editor's one door into a backend: the backend manager, opened in the
 * default browser, signed in (BMG-012, README R2).
 *
 * The editor used to carry eight panels over the backend's admin routes
 * (schema, data, permissions, triggers, email, sign-in, search, secrets). They
 * are gone: the backend's own served page does all of it, does it for a
 * deployed backend too, and is where the composers live. What the editor
 * keeps is *which backend runs* (the card) and the places a person is standing
 * when they need the manager — the property panel's *Add a field* and the
 * workflow canvas's *Add a trigger* — which land on the right page instead of
 * the front door.
 *
 * The main process resolves the admin credential and opens the URL
 * (`BackendManager.openDashboard`), so the token never reaches this renderer.
 * The route rides in the same fragment as the hand-off
 * (`#token=…&route=%2Fschema%2FPet%2Fnew-field`) and the page consumes both at
 * boot (`admin/app/api.ts bootSession`).
 *
 * @module models/BackendServices/openBackendManager
 */

import { ipcInvoke } from '@noodl-utils/ipc';

const seg = (s: string) => encodeURIComponent(s);

/** The manager's deep links the editor sends people to. One place, so a renamed page is renamed here. */
export const managerRoutes = {
  /** The Schema page with that collection's *Add a field* picker open. */
  newField: (table: string) => `/schema/${seg(table)}/new-field`,
  /** The Triggers page with the new-trigger drawer open. */
  newTrigger: () => '/triggers/new',
  /** The Triggers page with that trigger's drawer open. */
  trigger: (triggerId: string) => `/triggers/${seg(triggerId)}`
} as const;

/**
 * Open the manager for a running backend. `route` is a manager hash path
 * (`/schema/Pet/new-field`); absent, the page opens on its home.
 *
 * Throws the main process's sentence when the backend is not running, so the
 * caller can toast it.
 */
export async function openBackendManager(backendId: string, route?: string): Promise<void> {
  await ipcInvoke('backend:open-dashboard', backendId, route);
}
