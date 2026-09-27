/**
 * The Backend Services panel's registered id, on its own.
 *
 * It used to live at the bottom of the card's surface registry, which
 * imported all eight surface panels — so anything that merely wanted to *link*
 * to Backend Services had to import the whole surface registry. A leaf module
 * with no imports of its own was the fix (AAQ-011/F11). BMG-012 removed the
 * surfaces and the registry; the id stays here because the rail, the lesson
 * layer and the tutorials still address the panel by it.
 *
 * @module BackendServicesPanel/backendServicesPanelId
 */

/** The Backend Services panel, as the rail registers it. */
export const BACKEND_SERVICES_PANEL_ID = 'backend-services';
