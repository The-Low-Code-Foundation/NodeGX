// Plain words for the backend's rules. Shared by the page and the editor's server.

export const OPS = ['find', 'get', 'create', 'update', 'delete'];

/** The choices a person picks from, most closed first. `role:<name>` choices are added per role. */
export function audienceChoices(roles) {
  return [
    { value: 'nobody', words: 'Nobody', long: 'Nobody directly. Only the app’s functions reach it.' },
    ...roles.map((r) => ({ value: `role:${r}`, words: `The ${r} group`, long: `Only people in the “${r}” group.` })),
    { value: 'authenticated', words: 'Anyone signed in', long: 'Anyone with an account who is signed in.' },
    { value: 'public', words: 'Anyone at all', long: 'Anyone on the internet, signed in or not.' }
  ];
}

/**
 * P123-S6-CREATOREDITS — the choices for adding, changing and deleting rows: the audiences, plus
 * "only the person who made it". That one is not an audience for adding (a row being added has
 * nobody who made it yet): it means anyone signed in adds rows, and only a row's maker changes or
 * deletes it. {@link entryForChange} spells it out; {@link changeRule} reads it back.
 */
export const CREATOR_CHANGE = 'creator';
export function changeChoices(roles) {
  const all = audienceChoices(roles);
  const at = all.findIndex((c) => c.value === 'authenticated');
  const mine = { value: CREATOR_CHANGE, words: 'Only the person who made it', long: 'Anyone signed in adds rows; only the person who made a row changes or deletes it.' };
  return [...all.slice(0, at), mine, ...all.slice(at)];
}

/** The create, update and delete a "changing" choice stands for. */
export function entryForChange(change) {
  return change === CREATOR_CHANGE
    ? { create: 'authenticated', update: CREATOR_CHANGE, delete: CREATOR_CHANGE }
    : { create: change, update: change, delete: change };
}

/** One rule value in words. A list means any one of them is enough. */
export function ruleWords(rule) {
  if (Array.isArray(rule)) return rule.length ? rule.map(ruleWords).join(' or ') : 'Nobody';
  if (rule === 'public') return 'Anyone at all';
  if (rule === 'authenticated') return 'Anyone signed in';
  if (rule === 'nobody' || rule == null) return 'Nobody';
  if (rule === CREATOR_CHANGE) return 'Only the person who made it';
  if (typeof rule === 'string' && rule.startsWith('role:')) return `The ${rule.slice(5)} group`;
  return 'A rule the map doesn’t know';
}

/** How open a rule is, 0 (closed) to 3 (anyone at all). */
export function openness(rule) {
  if (Array.isArray(rule)) return Math.max(0, ...rule.map(openness));
  if (rule === 'public') return 3;
  if (rule === 'authenticated') return 2;
  if (rule === CREATOR_CHANGE) return 1;
  if (typeof rule === 'string' && rule.startsWith('role:')) return 1;
  return 0;
}

/** Whether a kind of person passes a rule. person: { signedIn, roles: [] } */
export function passes(rule, person) {
  if (Array.isArray(rule)) return rule.some((r) => passes(r, person));
  if (rule === 'public') return true;
  if (rule === 'authenticated') return person.signedIn;
  // Their own rows only, but a person who is signed in does get past it.
  if (rule === CREATOR_CHANGE) return person.signedIn;
  if (typeof rule === 'string' && rule.startsWith('role:')) return person.signedIn && person.roles.includes(rule.slice(5));
  return false;
}

/** A table's rule as the backend applies it: its own entry, or the defaults. */
export function tableRule(config, table) {
  const own = config.collections?.[table];
  const def = config.defaults ?? { permissions: {}, creatorOwns: false };
  return {
    own: !!own,
    permissions: { ...def.permissions, ...(own?.permissions ?? {}) },
    creatorOwns: own ? !!own.creatorOwns : !!def.creatorOwns
  };
}

/** Reading is find + get; changing is create + update + delete. Same words when they agree. */
export function readRule(perms) {
  return same(perms.find, perms.get) ? perms.find : [perms.find, perms.get];
}
export function changeRule(perms) {
  if (same(perms, { ...perms, ...entryForChange(CREATOR_CHANGE) })) return CREATOR_CHANGE;
  return same(perms.create, perms.update) && same(perms.update, perms.delete) ? perms.create : null;
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const HOW_WORDS = {
  reads: 'reads',
  creates: 'adds rows to',
  changes: 'changes rows in',
  deletes: 'deletes rows from',
  mentions: 'names (how it uses it isn’t written plainly)'
};

export function tableWords(name) {
  if (name === '_User') return 'People (accounts)';
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function ago(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** A run's error, without stack or code, in words. */
export function runWords(run) {
  if (run.status === 'success') return 'worked';
  if (run.status === 'running' || run.status === 'pending' || run.status === 'queued') return 'is running';
  const msg = String(run.errorMessage || '');
  if (/Unauthenticated/i.test(msg)) return 'was turned away: nobody was signed in';
  if (/permission|not allowed|forbidden|role/i.test(msg)) return 'was turned away: not allowed';
  if (run.status === 'cancelled') return 'was stopped';
  return msg ? `went wrong: “${msg.slice(0, 120)}”` : 'went wrong';
}
