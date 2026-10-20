// Changing who may touch a table: on the running backend (live at once) AND in the project's
// nodegx.security.json (the backend re-applies that file every time it starts, so a change only
// in the backend is undone at the next start). Both, or neither.

import { serializeV2File } from '@nodegx/project-contract/format.js';
import { OPS, ruleWords, tableRule } from '../public/words.js';

export const SECURITY_FILE = 'nodegx.security.json';

export class Refusal extends Error {}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The project's policy file as it stands, with the stamp a later write must still find. */
export function readSecurityFile(files) {
  const text = files.read(SECURITY_FILE);
  return { text, stamp: files.stamp(SECURITY_FILE), config: text ? JSON.parse(text) : null };
}

/** The entry a person's choice makes. `read` sets find + get; `change` sets create + update + delete. */
export function entryFor({ read, change, creatorOwns }) {
  const permissions = { find: read, get: read, create: change, update: change, delete: change };
  return { permissions, creatorOwns: !!creatorOwns };
}

/**
 * Sets (entry) or clears (entry === null: back to the standard rule) one table's rule.
 * `seen` is what the page was showing: { etag, fileStamp }. A change made by someone else since
 * is refused rather than overwritten.
 */
export async function setTableRule({ be, files }, table, entry, seen = {}) {
  const live = await be.getWithHeaders('/admin/permissions');
  const etag = live.json.etag;
  if (seen.etag && seen.etag !== etag) {
    throw new Refusal('Someone changed the backend’s rules since this map was opened. Nothing was changed. Look again (the map has reloaded) and choose again.');
  }
  const file = readSecurityFile(files);
  if (!file.config) throw new Refusal(`The app’s folder has no ${SECURITY_FILE}, so a change couldn’t be kept. Nothing was changed.`);
  if (seen.fileStamp && seen.fileStamp !== file.stamp) {
    throw new Refusal(`The app’s rules file was changed by something else since this map was opened. Nothing was changed. Look again and choose again.`);
  }

  for (const op of OPS) if (entry && entry.permissions[op] === undefined) throw new Refusal(`The rule for “${op}” is missing.`);

  const before = live.json.config.collections?.[table] ?? null;
  const fileBefore = file.config.collections?.[table] ?? null;
  if (sameJson(before, entry) && sameJson(fileBefore, entry)) {
    return { unchanged: true, ...(await verify({ be, files }, table, entry)) };
  }

  // 1. The backend, live at once.
  if (entry) await be.put(`/admin/permissions/collections/${encodeURIComponent(table)}`, entry);
  else if (before) await be.del(`/admin/permissions/collections/${encodeURIComponent(table)}`);

  // 2. The file, so it holds. If that fails, put the backend back as it was.
  try {
    const now = readSecurityFile(files);
    if (now.stamp !== file.stamp) throw new Refusal('The app’s rules file changed while saving.');
    const next = { ...now.config, collections: { ...(now.config.collections ?? {}) } };
    if (entry) next.collections[table] = entry;
    else delete next.collections[table];
    files.write(SECURITY_FILE, serializeV2File(next, now.text));
  } catch (e) {
    try {
      if (before) await be.put(`/admin/permissions/collections/${encodeURIComponent(table)}`, before);
      else await be.del(`/admin/permissions/collections/${encodeURIComponent(table)}`);
    } catch {
      /* reported below */
    }
    throw new Refusal(`The backend took the change but the app’s rules file couldn’t be written (${e.message}), so the backend was put back as it was.`);
  }
  return verify({ be, files }, table, entry);
}

/** Reads both places back, and asks the backend itself who it would now let in. */
export async function verify({ be, files }, table, entry) {
  const live = await be.getWithHeaders('/admin/permissions');
  const cfg = live.json.config;
  const file = readSecurityFile(files);
  const inBackend = sameJson(cfg.collections?.[table] ?? null, entry);
  const inFile = sameJson(file.config?.collections?.[table] ?? null, entry);
  const checks = await dryRuns(be, table);
  const rule = tableRule(cfg, table);
  return {
    inBackend,
    inFile,
    etag: live.json.etag,
    fileStamp: file.stamp,
    rule,
    checks,
    words: [
      inBackend ? 'The backend is obeying it now.' : 'The backend is NOT showing this rule.',
      inFile ? `It is saved in the app’s folder (${SECURITY_FILE}), so it holds when the backend restarts.` : `It is NOT in the app’s folder, so a restart would undo it.`,
      `Reading: ${ruleWords(rule.permissions.find)}. Changing: ${ruleWords(rule.permissions.create)}.`
    ]
  };
}

/** The backend's own dry run, for three kinds of person, reading and adding. Nothing runs. */
export async function dryRuns(be, table) {
  const people = await samplePeople(be);
  const out = [];
  for (const p of people) {
    for (const op of ['find', 'create']) {
      try {
        const r = await be.post('/admin/permissions/check', { principal: p.principal, collection: table, op });
        out.push({ who: p.words, op, allowed: !!r.allowed, reason: r.reason ?? '' });
      } catch (e) {
        out.push({ who: p.words, op, allowed: null, reason: e.message });
      }
    }
  }
  return out;
}

let peopleCache = null;
export async function samplePeople(be) {
  if (peopleCache && Date.now() - peopleCache.at < 60_000) return peopleCache.list;
  const list = [{ words: 'Someone not signed in', principal: { kind: 'anonymous' } }];
  try {
    const { users } = await be.get('/admin/users?limit=200');
    const plain = users.find((u) => !u.roles?.length && !u.disabled);
    if (plain) list.push({ words: 'A signed-in learner', principal: { kind: 'user', userId: plain.objectId } });
    const { roles } = await be.get('/admin/roles');
    for (const r of roles) {
      if (r.users?.[0]) list.push({ words: `Someone in the ${r.name} group`, principal: { kind: 'user', userId: r.users[0] } });
    }
  } catch {
    /* the anonymous check still runs */
  }
  peopleCache = { at: Date.now(), list };
  return list;
}
