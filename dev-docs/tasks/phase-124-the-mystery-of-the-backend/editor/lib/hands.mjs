// P127 BKO-007 — the hands: what a drag on the map changes. Grant by dragging a who onto a table, cut the wire to
// take it back, drop a function on a table for a row-change trigger, a clock on a function for a schedule.
//
// Every gesture changes the running backend AND the project's file (R1: the files are the truth), or neither: a
// refusal when either changed since the map last looked, the backend put back when the file can't be written. Every
// gesture can be undone, and an undo puts both places back as they were, byte for byte, unless something else wrote
// to them since (then it says so and changes nothing).

import crypto from 'node:crypto';
import { serializeV2File } from '@nodegx/project-contract/format.js';
import { setTableRule, verify, Refusal, SECURITY_FILE } from './rules.mjs';
import { AUTOMATIONS_FILE } from './triggers.mjs';
import { handEntry, tableWords } from '../public/words.js';

const ACTIONS = ['create', 'update', 'delete'];
const ACTION_WORDS = { create: 'made', update: 'changed', delete: 'deleted' };

/** Keep only the keys that are set (nodegx-backend `automations/shape.ts` `defined`). */
function defined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * A trigger in the form the project keeps it: nodegx-backend `automations/shape.ts` `projectTrigger`, key for key,
 * so the file this map writes is the file the agent's `create_backend_trigger` and the backend's drift check expect.
 */
export function projectTrigger(t) {
  const base = defined({
    id: t.id,
    type: t.type,
    name: t.name,
    enabled: t.enabled !== undefined ? t.enabled : true,
    target: t.target ? defined({ kind: t.target.kind, name: t.target.name }) : t.target,
    responseMode: t.responseMode,
    responseTimeoutMs: t.responseTimeoutMs
  });
  if (t.type === 'schedule' && t.schedule) {
    base.schedule = defined({ cron: t.schedule.cron, missedFirePolicy: t.schedule.missedFirePolicy || 'skip', overlapPolicy: t.schedule.overlapPolicy, payload: t.schedule.payload });
  } else if (t.type === 'webhook' && t.webhook) {
    base.webhook = { slug: t.webhook.slug, scheme: t.webhook.scheme || 'hmac-sha256', maxBodyBytes: t.webhook.maxBodyBytes || 1024 * 1024 };
  } else if (t.type === 'db-change' && t.dbChange) {
    base.dbChange = { collection: t.dbChange.collection, actions: [...t.dbChange.actions] };
  }
  return base;
}

function readAutomations(files) {
  const text = files.read(AUTOMATIONS_FILE);
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Refusal(`The app’s ${AUTOMATIONS_FILE} isn’t readable JSON, so a trigger couldn’t be kept in it. Nothing was changed.`);
  }
  return { text, stamp: files.stamp(AUTOMATIONS_FILE), config: { version: 1, workflows: [], triggers: [], ...(parsed ?? {}) } };
}

/** One trigger set (stored) or taken out (null) in the file's text, sorted by id as `patchAutomations` does. */
function patchedAutomations(file, id, stored) {
  const rest = file.config.triggers.filter((t) => t.id !== id);
  const triggers = stored ? [...rest, projectTrigger(stored)].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) : rest;
  return serializeV2File({ version: 1, workflows: file.config.workflows, triggers }, file.text);
}

const slug = (s) => String(s).split('/').pop().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'it';

export function makeHands({ be, files, functions }) {
  const ctx = { be, files };
  const undos = new Map(); // id → what puts both places back

  function remember(record) {
    const id = crypto.randomBytes(6).toString('hex');
    undos.set(id, record);
    if (undos.size > 50) undos.delete(undos.keys().next().value);
    return id;
  }

  /** Grant (cut false) or cut a who on a table, as the drag or the scissors send it. */
  async function rule({ table, who, what = 'both', cut = false, confirmPublic = false, etag, fileStamp }) {
    if (!table || typeof table !== 'string') throw new Refusal('Which table?');
    if (!who || typeof who !== 'string') throw new Refusal('Who?');
    if (!['see', 'change', 'both'].includes(what)) throw new Refusal('See, change, or both?');
    const live = await be.getWithHeaders('/admin/permissions');
    const config = live.json.config ?? {};
    // a page that saw an older version is refused first, even when the change would turn out to be none
    if (etag && etag !== live.json.etag) throw new Refusal('Someone changed the backend’s rules since this map was opened. Nothing was changed. Look again (the map has reloaded) and choose again.');
    if (fileStamp && fileStamp !== files.stamp(SECURITY_FILE)) throw new Refusal('The app’s rules file was changed by something else since this map was opened. Nothing was changed. Look again and choose again.');
    const hand = handEntry(config, table, { who, what, cut });
    if (hand.same) return { unchanged: true, words: `Nothing to change: ${hand.words.charAt(0).toLowerCase() + hand.words.slice(1)}`.replace(/\.$/, ' already.') };
    // Opening a table to anyone at all is asked once, in words, before it's made (the page shows the sentence).
    if (!cut && who === 'public' && !confirmPublic) {
      throw new Refusal(`Anyone on the internet could ${what === 'change' ? 'change' : 'see'} every row of ${tableWords(table)}. Say so again to do it.`);
    }
    const fileBefore = files.read(SECURITY_FILE);
    const backendBefore = config.collections?.[table] ?? null;
    const result = await setTableRule(ctx, table, hand.entry, { etag, fileStamp });
    // what an undo must still find: this table's entry on the backend, and the file's text, as this gesture left them
    const undo = remember({ kind: 'rule', table, backendBefore, backendAfter: hand.entry, fileBefore, fileAfter: files.read(SECURITY_FILE), words: hand.words });
    return { ...result, words: hand.words, standard: hand.standard, undo };
  }

  function functionNamedHere(fn) {
    if (!functions().includes(fn)) throw new Refusal(`The app has no function “${fn}”.`);
    return fn;
  }

  async function freeId(base) {
    const { triggers } = await be.get('/admin/triggers');
    const taken = new Set([...(triggers ?? []).map((t) => t.id), ...readAutomations(files).config.triggers.map((t) => t.id)]);
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    return id;
  }

  /** What one trigger looks like in both places now. */
  async function triggerNow(id) {
    const onBackend = await be.get(`/admin/triggers/${encodeURIComponent(id)}`).then((r) => r.trigger, () => null);
    const inFile = readAutomations(files).config.triggers.find((t) => t.id === id) ?? null;
    return { onBackend, inFile, stamp: files.stamp(AUTOMATIONS_FILE) };
  }

  /**
   * A function dropped on a table (actions: which row changes start it) or a clock on a function (cron). The trigger
   * is made on the backend, then kept in the file; if the file can't take it, the backend's copy goes again.
   */
  async function addTrigger({ fn, table, actions, cron, automationsStamp }) {
    functionNamedHere(fn);
    let def;
    if (cron !== undefined) {
      if (typeof cron !== 'string' || !cron.trim()) throw new Refusal('When should it run?');
      const preview = await be.post('/admin/triggers/preview', { cron: cron.trim(), count: 1 });
      if (!preview.valid) throw new Refusal(`The backend can’t read that schedule: ${preview.error}`);
      def = { id: await freeId(`schedule-${slug(fn)}`), type: 'schedule', enabled: true, target: { kind: 'function', name: fn }, schedule: { cron: cron.trim() } };
    } else {
      if (!table || typeof table !== 'string') throw new Refusal('Which table?');
      const acts = ACTIONS.filter((a) => (actions ?? []).includes(a));
      if (!acts.length) throw new Refusal('Which change to a row starts it: made, changed or deleted?');
      def = { id: await freeId(`${slug(table)}-${acts.join('-')}-runs-${slug(fn)}`), type: 'db-change', enabled: true, target: { kind: 'function', name: fn }, dbChange: { collection: table, actions: acts } };
    }
    const file = readAutomations(files);
    if (automationsStamp !== undefined && automationsStamp !== file.stamp) {
      throw new Refusal(`The app’s ${AUTOMATIONS_FILE} was changed by something else since this map was opened. Nothing was changed. Look again and choose again.`);
    }

    // 1. The backend, armed at once.
    const { trigger: stored } = await be.post('/admin/triggers', def);
    // 2. The file, so it holds. If that fails, the backend's copy goes again.
    try {
      if (files.stamp(AUTOMATIONS_FILE) !== file.stamp) throw new Error(`${AUTOMATIONS_FILE} changed while saving`);
      files.write(AUTOMATIONS_FILE, patchedAutomations(file, stored.id, stored));
    } catch (e) {
      await be.del(`/admin/triggers/${encodeURIComponent(stored.id)}`).catch(() => {});
      throw new Refusal(`The backend took the trigger but the app’s ${AUTOMATIONS_FILE} couldn’t be written (${e.message}), so the backend’s copy was taken away again.`);
    }
    const now = await triggerNow(stored.id);
    const words =
      def.type === 'schedule'
        ? `${fn.split('/').pop()} now runs by itself: ${stored.scheduleWords ?? cron}.`
        : `${fn.split('/').pop()} now runs whenever a row of ${tableWords(table)} is ${def.dbChange.actions.map((a) => ACTION_WORDS[a]).join(' or ')}.`;
    const undo = remember({ kind: 'trigger-added', id: stored.id, fileBefore: file.text, fileAfter: files.read(AUTOMATIONS_FILE), words });
    return { trigger: stored, inBackend: !!now.onBackend, inFile: !!now.inFile, automationsStamp: now.stamp, words, undo };
  }

  /** Take a trigger away from both places. A webhook is refused: its secret can't be given back by an undo. */
  async function removeTrigger({ id, automationsStamp }) {
    const before = await triggerNow(id);
    const def = before.onBackend ?? before.inFile;
    if (!def) throw new Refusal('There’s no such trigger, on the backend or in the app’s files.');
    if (def.type === 'webhook') throw new Refusal('A webhook’s secret can’t be given back once the webhook is removed, so the map doesn’t remove webhooks. Your agent can.');
    const file = readAutomations(files);
    if (automationsStamp !== undefined && automationsStamp !== file.stamp) {
      throw new Refusal(`The app’s ${AUTOMATIONS_FILE} was changed by something else since this map was opened. Nothing was changed. Look again and choose again.`);
    }
    if (before.onBackend) await be.del(`/admin/triggers/${encodeURIComponent(id)}`);
    try {
      if (before.inFile) files.write(AUTOMATIONS_FILE, patchedAutomations(file, id, null));
    } catch (e) {
      if (before.onBackend) await be.post('/admin/triggers', projectTrigger(before.onBackend)).catch(() => {});
      throw new Refusal(`The app’s ${AUTOMATIONS_FILE} couldn’t be written (${e.message}), so the trigger was put back on the backend.`);
    }
    const now = await triggerNow(id);
    const words = `“${def.name ?? id}” won’t run by itself any more.`;
    const undo = remember({ kind: 'trigger-removed', id, def: projectTrigger(def), wasOnBackend: !!before.onBackend, fileBefore: file.text, fileAfter: files.read(AUTOMATIONS_FILE), words });
    return { removed: true, inBackend: !!now.onBackend, inFile: !!now.inFile, automationsStamp: now.stamp, words, undo };
  }

  /** The schedule's words and next runs, from the backend's own reader. Nothing is stored. */
  const schedulePreview = (cron) => be.post('/admin/triggers/preview', { cron: String(cron ?? '').trim(), count: 3 });

  /**
   * Whether a file is still what the gesture left. By its text, not its stamp: an undo of a later gesture writes the
   * same text back and moves the stamp, and this gesture's undo must still work after it.
   */
  const unchangedSince = (name, after) => files.read(name) === after;
  const changedSince = (name) => new Refusal(`The app’s ${name} was changed by something else since, so it can’t be put back exactly. Nothing was changed.`);
  function restore(name, before) {
    if (before === null) files.remove(name);
    else files.write(name, before);
  }

  async function undo(id) {
    const u = undos.get(id);
    if (!u) throw new Refusal('That can’t be undone any more (the map was restarted, or it was undone already).');
    if (u.kind === 'rule') {
      const live = await be.getWithHeaders('/admin/permissions');
      const after = live.json.config.collections?.[u.table] ?? null;
      if (JSON.stringify(after) !== JSON.stringify(u.backendAfter)) throw new Refusal(`Someone changed the backend’s rule for ${tableWords(u.table)} since, so this can’t be undone exactly. Nothing was changed.`);
      if (!unchangedSince(SECURITY_FILE, u.fileAfter)) throw changedSince(SECURITY_FILE);
      const path = `/admin/permissions/collections/${encodeURIComponent(u.table)}`;
      if (u.backendBefore) await be.put(path, u.backendBefore);
      else if (after) await be.del(path);
      try {
        restore(SECURITY_FILE, u.fileBefore);
      } catch (e) {
        if (after) await be.put(path, after).catch(() => {});
        else await be.del(path).catch(() => {});
        throw e;
      }
      undos.delete(id);
      return { undone: true, words: `Undone: ${u.words.charAt(0).toLowerCase()}${u.words.slice(1)}`, ...(await verify(ctx, u.table, u.backendBefore)) };
    }
    if (u.kind === 'trigger-added') {
      if (!unchangedSince(AUTOMATIONS_FILE, u.fileAfter)) throw changedSince(AUTOMATIONS_FILE);
      const was = await be.get(`/admin/triggers/${encodeURIComponent(u.id)}`).then((r) => r.trigger, () => null);
      if (was) await be.del(`/admin/triggers/${encodeURIComponent(u.id)}`);
      try {
        restore(AUTOMATIONS_FILE, u.fileBefore);
      } catch (e) {
        if (was) await be.post('/admin/triggers', projectTrigger(was)).catch(() => {});
        throw e;
      }
      undos.delete(id);
      const now = await triggerNow(u.id);
      return { undone: true, words: `Undone: it won’t run by itself.`, inBackend: !!now.onBackend, inFile: !!now.inFile, automationsStamp: now.stamp };
    }
    if (u.kind === 'trigger-removed') {
      if (!unchangedSince(AUTOMATIONS_FILE, u.fileAfter)) throw changedSince(AUTOMATIONS_FILE);
      if (u.wasOnBackend) await be.post('/admin/triggers', u.def);
      try {
        restore(AUTOMATIONS_FILE, u.fileBefore);
      } catch (e) {
        if (u.wasOnBackend) await be.del(`/admin/triggers/${encodeURIComponent(u.id)}`).catch(() => {});
        throw e;
      }
      undos.delete(id);
      const now = await triggerNow(u.id);
      return { undone: true, words: `Undone: “${u.def.name ?? u.id}” runs by itself again.`, inBackend: !!now.onBackend, inFile: !!now.inFile, automationsStamp: now.stamp };
    }
    throw new Refusal('That can’t be undone.');
  }

  return { rule, addTrigger, removeTrigger, schedulePreview, undo };
}
