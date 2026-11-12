// Plain words for the backend's rules, its triggers and its runs: the kit's one text (BKO-008). The page loads this file
// (the server serves it at /words.js), the kit's writers say their sentences from it, and a stranger's editor imports it
// as `@nodegx/backend-kit/words.js`. Nothing in it touches Node or the DOM.

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
  // the same words once: find and get both "Anyone signed in" read as one
  if (Array.isArray(rule)) return rule.length ? [...new Set(rule.map(ruleWords))].join(' or ') : 'Nobody';
  if (rule === 'public') return 'Anyone at all';
  if (rule === 'authenticated') return 'Anyone signed in';
  if (rule === 'nobody' || rule == null) return 'Nobody';
  if (rule === CREATOR_CHANGE) return 'Only the person who made it';
  if (typeof rule === 'string' && rule.startsWith('role:')) return `The ${rule.slice(5)} group`;
  if (isPath(rule)) return 'Only people the row is linked to';
  return 'A rule the map doesn’t know';
}

/** How open a rule is, 0 (closed) to 3 (anyone at all). */
export function openness(rule) {
  if (Array.isArray(rule)) return Math.max(0, ...rule.map(openness));
  if (rule === 'public') return 3;
  if (rule === 'authenticated') return 2;
  if (rule === CREATOR_CHANGE) return 1;
  if (typeof rule === 'string' && rule.startsWith('role:')) return 1;
  if (isPath(rule)) return 1;
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
  // some rows only, the ones linked to them, but a signed-in person gets past it
  if (isPath(rule)) return person.signedIn;
  return false;
}

/** A rule that lets a signed-in person in to the rows a chain of links leads to from them (the backend's path rule). */
const isPath = (rule) => !!rule && typeof rule === 'object' && !Array.isArray(rule) && 'path' in rule;

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
/**
 * Adding, changing and deleting in words: one rule when the three agree, else who does which
 * ("Anyone signed in adds and changes; nobody deletes"), never the same words twice.
 */
export function changeWords(perms) {
  const one = changeRule(perms);
  if (one !== null) return ruleWords(one);
  const groups = [];
  for (const [op, verb] of [['create', 'adds'], ['update', 'changes'], ['delete', 'deletes']]) {
    const who = ruleWords(perms[op]);
    const g = groups.find((x) => x.who === who);
    if (g) g.verbs.push(verb);
    else groups.push({ who, verbs: [verb] });
  }
  const line = groups.map((g) => `${g.who.charAt(0).toLowerCase()}${g.who.slice(1)} ${g.verbs.join(' and ')}`).join('; ');
  return line.charAt(0).toUpperCase() + line.slice(1);
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

// ───────────── P127 BKO-007: the hands — granting by a drag, cutting a wire ─────────────
//
// A "who" is an audience the backend's rules know: 'public', 'authenticated', 'role:<name>', or MAKER (whoever made
// the row, the table's `creatorOwns`). There is no rule for one named person: dragging Marie means her group.

export const MAKER = 'maker';
export const SEE_OPS = ['find', 'get'];
export const CHANGE_OPS = ['create', 'update', 'delete'];

export function whoWords(who) {
  if (who === MAKER) return 'Whoever made the row';
  return ruleWords(who);
}

/** Whether `a` already lets in everyone `b` does: anyone at all ⊇ anyone signed in ⊇ a group, a row's maker, a link. */
function covers(a, b) {
  if (JSON.stringify(a) === JSON.stringify(b)) return true;
  if (a === 'public') return true;
  if (a === 'authenticated') return b !== 'public';
  return false;
}

const asList = (rule) => (rule == null || rule === 'nobody' ? [] : Array.isArray(rule) ? rule : [rule]);
const fromList = (list) => (list.length === 0 ? 'nobody' : list.length === 1 ? list[0] : list);

/** One op's rule with `who` added. A who already covered changes nothing; one the new who covers goes. */
export function grantRule(rule, who) {
  const list = asList(rule);
  if (list.some((r) => covers(r, who))) return fromList(list);
  return fromList([...list.filter((r) => !covers(who, r)), who]);
}

/** One op's rule with `who` taken out. Only the who the rule names goes: cutting a group leaves "anyone signed in". */
export function cutRule(rule, who) {
  return fromList(asList(rule).filter((r) => JSON.stringify(r) !== JSON.stringify(who)));
}

/** The whos a table's rule names, each with what it may do directly: { who, see, change } (a maker: creatorOwns). */
export function namedWhos(rule) {
  const out = new Map();
  const add = (who, op) => {
    if (typeof who !== 'string' || who === 'nobody' || who === CREATOR_CHANGE) return;
    const w = out.get(who) ?? { who, see: false, change: false };
    if (SEE_OPS.includes(op)) w.see = true;
    else w.change = true;
    out.set(who, w);
  };
  for (const op of OPS) for (const r of asList(rule.permissions[op])) add(r, op);
  if (rule.creatorOwns || OPS.some((op) => asList(rule.permissions[op]).includes(CREATOR_CHANGE))) out.set(MAKER, { who: MAKER, see: !!rule.creatorOwns, change: true });
  return [...out.values()];
}

/**
 * The table's entry after a grant or a cut, from its rule as the backend applies it (`tableRule`). `what` is 'see',
 * 'change' or 'both'; a maker is always both (`creatorOwns`). Returns { entry, words } where entry is null when the
 * result is the app's standard rule again, and `same` when nothing would change.
 */
export function handEntry(config, table, { who, what = 'both', cut = false }) {
  const rule = tableRule(config, table);
  const permissions = { ...rule.permissions };
  let creatorOwns = rule.creatorOwns;
  if (who === MAKER) {
    creatorOwns = !cut;
    if (cut) for (const op of OPS) permissions[op] = cutRule(permissions[op], CREATOR_CHANGE);
  } else {
    const ops = cut || what === 'both' ? OPS : what === 'see' ? SEE_OPS : CHANGE_OPS;
    for (const op of ops) permissions[op] = cut ? cutRule(permissions[op], who) : grantRule(permissions[op], who);
  }
  const next = { permissions: Object.fromEntries(OPS.map((op) => [op, permissions[op]])), creatorOwns: !!creatorOwns };
  const same = JSON.stringify(next) === JSON.stringify({ permissions: Object.fromEntries(OPS.map((op) => [op, rule.permissions[op]])), creatorOwns: !!rule.creatorOwns });
  const def = config.defaults ?? { permissions: {}, creatorOwns: false };
  const standard = JSON.stringify(next) === JSON.stringify({ permissions: Object.fromEntries(OPS.map((op) => [op, def.permissions?.[op]])), creatorOwns: !!def.creatorOwns });
  return { entry: standard ? null : next, same, standard, rule: next, words: handWords(table, { who, what, cut }) };
}

/** The sentence a gesture says before it is made, and the one its toast says after. */
export function handWords(table, { who, what = 'both', cut = false }) {
  const t = tableWords(table);
  const w = whoWords(who);
  if (who === MAKER) return cut ? `Whoever made a row of ${t} no longer always sees and changes it.` : `Whoever made a row of ${t} may always see and change that row.`;
  if (cut) return `${w} may no longer open ${t} directly.`;
  const verb = what === 'see' ? 'see the rows of' : what === 'change' ? 'add, change and delete rows in' : 'see, add, change and delete rows in';
  return `${w} may ${verb} ${t}${who === 'public' ? ': anyone on the internet, with no function checking' : ''}.`;
}
