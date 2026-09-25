/**
 * The Activity page's pure model (BMG-011 §3.6): what an audit entry says in
 * words, where its target lives on this page, and the flat query
 * `GET /admin/audit` answers (action · who · outcome · when — and only *and*).
 */
import type { Cond, FilterField, Group } from './filters';
import { addDays, midnight, windowRange } from './filters';
import { href } from './router';

/** An entry as `GET /admin/audit` answers it (`ops/audit.ts` `AuditEntry`). */
export interface ActivityEntry {
  objectId?: string;
  at?: number;
  action?: string;
  actorKind?: string;
  actor?: string;
  target?: Record<string, unknown>;
  detail?: Record<string, unknown>;
  outcome?: string;
  status?: number;
  ip?: string;
  requestId?: string;
  method?: string;
  route?: string;
  [key: string]: unknown;
}

/** The actor kinds the dispatcher stamps (`ops/audit.ts`), in a person's words. */
export const ACTOR_KINDS: Array<{ value: string; label: string }> = [
  { value: 'admin', label: 'an admin' },
  { value: 'admin:readonly', label: 'a read-only admin' },
  { value: 'user', label: 'a signed-in user' },
  { value: 'apiKey', label: 'an API key' },
  { value: 'anonymous', label: 'nobody signed in' },
  { value: 'cli', label: 'the command line' }
];

export function activityFields(actions: string[]): FilterField[] {
  return [
    { name: 'action', kind: 'choice', ops: ['is'], options: actions.map((a) => ({ value: a, label: actionWords(a) })) },
    { name: 'who', kind: 'choice', ops: ['is'], options: ACTOR_KINDS },
    {
      name: 'outcome',
      kind: 'choice',
      ops: ['is'],
      options: [
        { value: 'success', label: 'succeeded' },
        { value: 'failure', label: 'failed' }
      ]
    },
    { name: 'when', kind: 'date', ops: ['within', 'on', 'before', 'after', 'between'] }
  ];
}

/** The query string for a flat group; a group or an *or* is refused in words (the route answers *and* only). */
export function activityQuery(group: Group, now: Date = new Date()): Record<string, string> {
  if (group.conj === 'or' && group.items.length > 1) throw new Error('Activity can be filtered with "and" only.');
  const q: Record<string, string> = {};
  const once = (key: string, value: string) => {
    if (q[key] !== undefined) throw new Error(key + ' is asked twice.');
    q[key] = value;
  };
  for (const item of group.items) {
    if (item.kind === 'group') throw new Error('Activity can be filtered with "and" only.');
    const c: Cond = item;
    const v = (c.value || '').trim();
    switch (c.field) {
      case 'action':
        if (v) once('action', v);
        break;
      case 'who':
        if (v) once('actorKind', v);
        break;
      case 'outcome':
        if (v) once('outcome', v);
        break;
      case 'when': {
        if (c.op === 'within') {
          const [a, b] = windowRange(v || 'today', now);
          once('since', String(a.getTime()));
          once('until', String(b.getTime() - 1));
        } else if (c.op === 'on' && v) {
          const day = midnight(v);
          once('since', String(day.getTime()));
          once('until', String(addDays(day, 1).getTime() - 1));
        } else if (c.op === 'before' && v) {
          once('until', String(midnight(v).getTime() - 1));
        } else if (c.op === 'after' && v) {
          once('since', String(addDays(midnight(v), 1).getTime()));
        } else if (c.op === 'between' && v && (c.value2 || '').trim()) {
          const a = midnight(v);
          const b = midnight((c.value2 || '').trim());
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          once('since', String(lo.getTime()));
          once('until', String(addDays(hi, 1).getTime() - 1));
        }
        break;
      }
      default:
        throw new Error('There is no field called "' + c.field + '".');
    }
  }
  return q;
}

/** `permissions.collection.update` → *permissions · collection · update*. */
export function actionWords(action: string): string {
  return action.split('.').join(' · ');
}

/** Who did it, in words: the credential, the person, the key. */
export function actorWords(entry: ActivityEntry, personName?: (id: string) => string | null): string {
  const kind = entry.actorKind || '';
  const who = entry.actor || '';
  switch (kind) {
    case 'admin':
      if (!who) return 'the admin credential';
      return (personName && personName(who)) || 'admin ' + who;
    case 'admin:readonly':
      if (!who) return 'the read-only credential';
      return ((personName && personName(who)) || 'admin ' + who) + ' (read-only)';
    case 'apiKey':
      return 'API key: ' + (who || '?');
    case 'user':
      return (personName && personName(who)) || 'user ' + who;
    case 'anonymous':
      return 'nobody signed in';
    case 'cli':
      return 'the command line';
    default:
      return who ? kind + ' ' + who : kind || '—';
  }
}

export interface TargetWords {
  text: string;
  /** Where the thing lives on this page, when it has a page. */
  href?: string;
}

/**
 * The target as a link to the thing: the route pattern says WHAT kind of
 * thing, the params say WHICH. *Pets · schema*, *Ann · user*, *editors · role*.
 */
export function targetWords(entry: ActivityEntry): TargetWords {
  const route = entry.route || '';
  const t = entry.target || {};
  const str = (k: string) => (typeof t[k] === 'string' ? (t[k] as string) : '');
  if (/^admin\/permissions\/collections\/:name/.test(route)) return { text: str('name') + ' · permissions', href: href('permissions') };
  if (/^admin\/permissions\/functions\/:name/.test(route)) return { text: str('name') + ' · function permissions', href: href('permissions') };
  if (/^admin\/permissions/.test(route)) return { text: 'permissions', href: href('permissions') };
  if (/^admin\/roles\/:name\/users\/:userId/.test(route)) return { text: str('name') + ' · role member', href: href('roles', str('name')) };
  if (/^admin\/roles\/:name/.test(route)) return { text: str('name') + ' · role', href: href('roles', str('name')) };
  if (/^admin\/roles$/.test(route)) return { text: 'a role', href: href('roles') };
  if (/^admin\/users\/:id/.test(route)) return { text: str('id') + ' · user', href: href('users', str('id')) };
  if (/^admin\/users$/.test(route)) return { text: 'a user', href: href('users') };
  if (/^_admin\/setup$/.test(route)) return { text: 'the first admin account', href: href('users') };
  if (/^admin\/views\/:collection\/:name/.test(route)) return { text: str('collection') + ' · view ' + str('name'), href: href('collections', str('collection')) };
  if (/^admin\/keys\/:id/.test(route)) return { text: str('id') + ' · API key', href: href('keys', str('id')) };
  if (/^admin\/keys$/.test(route)) return { text: 'an API key', href: href('keys') };
  if (/^admin\/secrets\/:name/.test(route)) return { text: str('name') + ' · secret', href: href('secrets') };
  if (/^admin\/schema\/:table/.test(route)) return { text: str('table') + ' · schema', href: href('schema', str('table')) };
  if (/^(admin\/schema|api\/_schema)/.test(route)) return { text: 'schema', href: href('schema') };
  if (/^admin\/backups\/restore$/.test(route)) return { text: 'a restore', href: href('backups') };
  if (/^admin\/backups/.test(route)) return { text: 'backups', href: href('backups') };
  if (/^admin\/import\/:collection/.test(route)) return { text: str('collection') + ' · import', href: href('collections', str('collection')) };
  if (/^admin\/triggers\/:id/.test(route)) return { text: str('id') + ' · trigger', href: href('triggers', str('id')) };
  if (/^admin\/triggers$/.test(route)) return { text: 'a trigger', href: href('triggers') };
  if (/^admin\/workflow-defs\/:id/.test(route)) return { text: str('id') + ' · workflow', href: href('workflows', str('id')) };
  if (/^admin\/workflow-defs$/.test(route)) return { text: 'a workflow', href: href('workflows') };
  if (/^admin\/workflow-runs\/:executionId/.test(route)) return { text: str('executionId') + ' · run', href: href('runs', str('executionId')) };
  if (/^admin\/workflows\/:name/.test(route)) return { text: str('name') + ' · function file', href: href('workflows') };
  if (/^admin\/workflows/.test(route)) return { text: 'function files', href: href('workflows') };
  if (/^admin\/email\/templates\/:id/.test(route)) return { text: str('id') + ' · email template', href: href('email', str('id')) };
  if (/^admin\/email/.test(route)) return { text: 'email', href: href('email') };
  if (/^admin\/files\/:name/.test(route)) return { text: str('name') + ' · file', href: href('files') };
  if (/^admin\/files/.test(route)) return { text: 'storage', href: href('files') };
  if (/^admin\/search\/collections\/:name/.test(route)) return { text: str('name') + ' · search', href: href('search') };
  if (/^admin\/ops$/.test(route)) return { text: 'server settings', href: href('server') };
  if (/^admin\/executions\/compact$/.test(route)) return { text: 'run history', href: href('server') };
  if (/^admin\/auth\/providers\/:id/.test(route)) return { text: str('id') + ' · sign-in provider', href: href('signin', str('id')) };
  if (/^admin\/auth/.test(route)) return { text: 'sign-in', href: href('signin') };
  // Entries the dispatcher raises itself (a login) carry no route.
  const keys = Object.keys(t);
  if (keys.length) return { text: keys.map((k) => str(k) || String(t[k])).join(' · ') };
  return { text: '—' };
}
