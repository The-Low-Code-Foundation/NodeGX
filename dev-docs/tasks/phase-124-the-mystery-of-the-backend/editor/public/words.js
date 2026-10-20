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

/** One rule value in words. A list means any one of them is enough. */
export function ruleWords(rule) {
  if (Array.isArray(rule)) return rule.length ? rule.map(ruleWords).join(' or ') : 'Nobody';
  if (rule === 'public') return 'Anyone at all';
  if (rule === 'authenticated') return 'Anyone signed in';
  if (rule === 'nobody' || rule == null) return 'Nobody';
  if (typeof rule === 'string' && rule.startsWith('role:')) return `The ${rule.slice(5)} group`;
  return 'A rule the map doesn’t know';
}

/** How open a rule is, 0 (closed) to 3 (anyone at all). */
export function openness(rule) {
  if (Array.isArray(rule)) return Math.max(0, ...rule.map(openness));
  if (rule === 'public') return 3;
  if (rule === 'authenticated') return 2;
  if (typeof rule === 'string' && rule.startsWith('role:')) return 1;
  return 0;
}

/** Whether a kind of person passes a rule. person: { signedIn, roles: [] } */
export function passes(rule, person) {
  if (Array.isArray(rule)) return rule.some((r) => passes(r, person));
  if (rule === 'public') return true;
  if (rule === 'authenticated') return person.signedIn;
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
  const msg = String(run.errorMessage || '');
  if (/Unauthenticated/i.test(msg)) return 'was turned away: nobody was signed in';
  if (/permission|not allowed|forbidden|role/i.test(msg)) return 'was turned away: not allowed';
  if (run.status === 'cancelled') return 'was stopped';
  return msg ? `went wrong: “${msg.slice(0, 120)}”` : 'went wrong';
}
