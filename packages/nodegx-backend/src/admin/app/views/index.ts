/**
 * The view registry: one entry per page, in nav order. The nav (nav.ts) says
 * where each lives and which `DashboardFeatures` flag must be on; this says
 * what renders. A page component receives the route's parameters
 * (`#/collections/Pet/<id>` → `['Pet', '<id>']`).
 */
import type { FunctionComponent } from 'preact';

import { CollectionsView } from './collections';
import { SchemaView } from './schema';
import { UsersView } from './users';
import { RolesView } from './roles';
import { SignInView } from './signin';
import { PermissionsView } from './permissions';
import { KeysView } from './keys';
import { TriggersView } from './triggers';
import { WorkflowsView } from './workflows';
import { RunsView } from './runs';
import { FilesView } from './files';
import { EmailView } from './email';
import { BackupsView } from './backups';
import { AuditView } from './audit';

export interface ViewProps {
  params: string[];
}

export interface ViewDef {
  id: string;
  feature: string;
  component: FunctionComponent<ViewProps>;
}

export const VIEWS: ViewDef[] = [
  { id: 'collections', feature: 'collections', component: CollectionsView },
  { id: 'schema', feature: 'schema', component: SchemaView },
  { id: 'users', feature: 'users', component: UsersView },
  { id: 'roles', feature: 'roles', component: RolesView },
  { id: 'signin', feature: 'auth', component: SignInView },
  { id: 'permissions', feature: 'permissions', component: PermissionsView },
  { id: 'keys', feature: 'apiKeys', component: KeysView },
  { id: 'triggers', feature: 'triggers', component: TriggersView },
  { id: 'workflows', feature: 'workflows', component: WorkflowsView },
  { id: 'runs', feature: 'executions', component: RunsView },
  { id: 'files', feature: 'files', component: FilesView },
  { id: 'email', feature: 'email', component: EmailView },
  { id: 'backups', feature: 'backups', component: BackupsView },
  { id: 'audit', feature: 'ops', component: AuditView }
];

export function findView(id: string): ViewDef | undefined {
  return VIEWS.find((v) => v.id === id);
}
