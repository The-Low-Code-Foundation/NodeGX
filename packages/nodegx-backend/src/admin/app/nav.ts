/**
 * The nav, in a person's words (BMG-001 §3.2). Groups are a person's jobs,
 * not the backend's subsystems. Each entry names the `DashboardFeatures` flag
 * that must be on for it to show; a section whose subsystem is absent is not
 * rendered at all.
 *
 * Renames from the phase-23 page, for the glossary (BMG-001 §6):
 *   Executions → Runs · "Access" group split into People (Users, Roles,
 *   Sign-in) and Access (Permissions, API keys) · "Config" → Storage (Files)
 *   and Settings (Email, Backups) · "Ops" → Activity (Audit).
 */
export interface NavEntry {
  id: string;
  label: string;
  feature: string;
}

export interface NavGroup {
  label: string;
  entries: NavEntry[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Data',
    entries: [
      { id: 'collections', label: 'Collections', feature: 'collections' },
      { id: 'schema', label: 'Schema', feature: 'schema' }
    ]
  },
  {
    label: 'People',
    entries: [
      { id: 'users', label: 'Users', feature: 'users' },
      { id: 'roles', label: 'Roles', feature: 'roles' },
      { id: 'signin', label: 'Sign-in', feature: 'auth' }
    ]
  },
  {
    label: 'Access',
    entries: [
      { id: 'permissions', label: 'Permissions', feature: 'permissions' },
      { id: 'keys', label: 'API keys', feature: 'apiKeys' }
    ]
  },
  {
    label: 'Automation',
    entries: [
      { id: 'triggers', label: 'Triggers', feature: 'triggers' },
      { id: 'workflows', label: 'Workflows', feature: 'workflows' },
      { id: 'runs', label: 'Runs', feature: 'executions' }
    ]
  },
  {
    label: 'Storage',
    entries: [{ id: 'files', label: 'Files', feature: 'files' }]
  },
  {
    label: 'Settings',
    entries: [
      { id: 'email', label: 'Email', feature: 'email' },
      { id: 'backups', label: 'Backups', feature: 'backups' }
    ]
  },
  {
    label: 'Activity',
    entries: [{ id: 'audit', label: 'Audit', feature: 'ops' }]
  }
];

export function navEntry(id: string): NavEntry | undefined {
  for (const g of NAV) for (const e of g.entries) if (e.id === id) return e;
  return undefined;
}

/** The groups a given backend shows, with the entries its features allow. */
export function visibleNav(features: Record<string, boolean | undefined>): NavGroup[] {
  return NAV.map((g) => ({ label: g.label, entries: g.entries.filter((e) => !!features[e.feature]) })).filter(
    (g) => g.entries.length > 0
  );
}
