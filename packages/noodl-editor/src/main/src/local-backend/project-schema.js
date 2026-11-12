/**
 * P121 R12 (P121-TWO007-SCHEMANOWAY) — a project's `backend/schema.json` reaches
 * the backend the editor starts for it.
 *
 * A template ships its collections as `backend/schema.json`, the projection of
 * its world, held byte for byte by a spec. Starting a backend for the project
 * installed its policy (SB-015) and the editor pushed its cloud functions
 * (WFA-001), but nothing read the schema: a person who opened the marketplace
 * got none of its unique indexes, links or columns, so the rule that a
 * payment's reference is one payment (R11) never existed.
 *
 * Richard, 2026-10-15: **the editor adds them** — every collection the file
 * declares that the backend does not have yet, and **never changes or deletes
 * one that exists**. So a collection is created whole (columns, indexes,
 * checks, description) or left alone; there is no column-by-column merge. A
 * table that already exists is skipped even when the file declares more for
 * it, because `createTable` reconciles indexes and checks on an existing table
 * and that would be a change.
 *
 * Over HTTP, through the supervisor: the backend's `projectDir` is deliberately
 * not a general channel (`nodegx-backend/src/config.ts`), so the backend never
 * reads this file itself.
 *
 * Two shapes are in the templates today, both accepted:
 *   - a list of `POST /admin/schema` bodies (`{ action: 'createTable', table, … }`)
 *     — the marketplace, the gram, Learn with Simple Rick;
 *   - a snapshot `{ tables: [{ name, columns, indexes?, checks?, description? }] }`
 *     — the Training template, which its own tool applies with `/admin/schema/apply`.
 *
 * @module local-backend/project-schema
 */

const fs = require('fs').promises;
const path = require('path');

const SCHEMA_FILE = path.join('backend', 'schema.json');

/**
 * The `createTable` bodies a parsed `backend/schema.json` declares, in its
 * order (a link's target is declared before the table that links to it).
 * Throws in words on a shape it does not know.
 */
function createBodiesOf(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.map((entry, i) => {
      if (!entry || entry.action !== 'createTable' || typeof entry.table !== 'string' || !entry.table) {
        throw new Error(`entry ${i + 1} is not a createTable with a table name`);
      }
      return entry;
    });
  }
  if (parsed && Array.isArray(parsed.tables)) {
    return parsed.tables.map((t, i) => {
      if (!t || typeof t.name !== 'string' || !t.name) throw new Error(`table ${i + 1} has no name`);
      const body = { action: 'createTable', table: t.name, columns: t.columns || [] };
      if (t.indexes !== undefined) body.indexes = t.indexes;
      if (t.checks !== undefined) body.checks = t.checks;
      if (t.description !== undefined) body.description = t.description;
      return body;
    });
  }
  throw new Error('it is neither a list of createTable entries nor { tables: [...] }');
}

/**
 * Read `<projectDir>/backend/schema.json`. `null` when the project has none,
 * which is every project but a few templates.
 */
async function readProjectSchema(projectDir) {
  if (typeof projectDir !== 'string' || !projectDir.trim()) return null;
  const file = path.join(projectDir, SCHEMA_FILE);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    throw e;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`${SCHEMA_FILE} is not JSON: ${e.message}`);
  }
  try {
    return createBodiesOf(parsed);
  } catch (e) {
    throw new Error(`${SCHEMA_FILE}: ${e.message}`);
  }
}

/**
 * Create each declared collection the backend lacks. `request` is the
 * supervisor's (`(method, path, body) => Promise<json>`).
 *
 * Never throws for one table: a refusal is recorded against it and the rest go
 * on, because a backend with most of its collections is more use than one with
 * none. The report says what happened to every declared table.
 *
 * @returns {Promise<{ status: 'none' } | { status: 'applied', created: string[], existing: string[], failed: Array<{ table: string, error: string }> } | { status: 'failed', error: string }>}
 */
async function applyProjectSchema(request, projectDir, retryDelaysMs = RETRY_DELAYS_MS) {
  let bodies;
  try {
    bodies = await readProjectSchema(projectDir);
  } catch (e) {
    return { status: 'failed', error: e.message };
  }
  if (!bodies) return { status: 'none' };

  let have;
  try {
    const live = await request('GET', '/admin/schema');
    have = new Set(((live && live.tables) || []).map((t) => t && t.name).filter(Boolean));
  } catch (e) {
    return { status: 'failed', error: `could not read the backend's collections: ${e.message}` };
  }

  const created = [];
  const existing = [];
  const failed = [];
  for (const body of bodies) {
    if (have.has(body.table)) {
      existing.push(body.table);
      continue;
    }
    const error = await pushTable(request, body, retryDelaysMs);
    if (error === null) {
      created.push(body.table);
      have.add(body.table);
    } else failed.push({ table: body.table, error });
  }
  return { status: 'applied', created, existing, failed };
}

/**
 * P112-OWN024-SCHEMAFIRSTSTART — the waits before a push is tried again. On the 0.4.3 Intel build under Rosetta one of
 * the marketplace's 21 pushes failed with undici's `fetch failed` while the new backend was busy, and the collection was
 * missing until the next start.
 */
const RETRY_DELAYS_MS = [250, 1000];

/** The request never got an answer: undici's generic network error, a timeout, an abort. A refusal in words is not. */
function isNetworkFailure(e) {
  if (!e) return false;
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return true;
  return e.name === 'TypeError' && /fetch failed/i.test(String(e.message));
}

/**
 * Push one table, trying again after a network failure. A push whose answer was lost may have landed, so before each
 * new try the backend is asked whether the table is there: a table it has is never pushed again (R12: never change one
 * that exists). Resolves to null when the table is there, or the last error's words.
 */
async function pushTable(request, body, delays) {
  for (let attempt = 0; ; attempt++) {
    try {
      await request('POST', '/admin/schema', body);
      return null;
    } catch (e) {
      const words = e && e.message ? e.message : String(e);
      if (!isNetworkFailure(e) || attempt >= delays.length) return words;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      try {
        const live = await request('GET', '/admin/schema');
        if (((live && live.tables) || []).some((t) => t && t.name === body.table)) return null;
      } catch (_) {
        /* the backend is still busy: the next push says so, or lands */
      }
    }
  }
}

/**
 * P112-OWN024-SCHEMAFIRSTSTART — what the backend card says when a start left the project's collections short, or
 * null when nothing is missing. Only the app log said so before, and the card read Running.
 */
function schemaProblemSentence(result) {
  if (!result) return null;
  if (result.status === 'failed') return `The collections in backend/schema.json were not added: ${result.error}.`;
  if (result.status !== 'applied' || !result.failed.length) return null;
  const names = result.failed.map((f) => f.table);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const why = Array.from(new Set(result.failed.map((f) => f.error))).join('; ');
  const one = names.length === 1;
  return `${list} from backend/schema.json ${one ? 'was' : 'were'} not added (${why}). Start the backend again to add ${one ? 'it' : 'them'}.`;
}

module.exports = { SCHEMA_FILE, RETRY_DELAYS_MS, createBodiesOf, readProjectSchema, applyProjectSchema, schemaProblemSentence };
