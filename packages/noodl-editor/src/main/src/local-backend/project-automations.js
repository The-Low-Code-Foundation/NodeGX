/**
 * P132 BWF-008 (P132-EDITORREADSBACKEND) — the editor keeps a project's workflows and triggers in its
 * `nodegx.automations.json`, as Studio and the agent already do.
 *
 * Since P127 BKO-001 the project's file is the truth and a backend is a copy loaded from it (Richard's R1,
 * 2026-10-26). The editor's Workflows panel saved to the backend alone, so a change made there was gone on
 * the next machine, the next backend and the VM, and nothing said so. Measured in the editor 2026-11-03:
 * "Saved to the backend.", the file byte-identical.
 *
 * The rule every writer follows (Studio `serve.mjs` `saveWorkflow`, the MCP's `writeBoth`): **the backend
 * first** (it validates, and answers with what it stored), **then the file**, the one entry patched by id
 * and nothing else in it touched. If the file cannot be written the backend is put back: both, or neither.
 *
 * Entries keep their place in the file (Studio's way), so a save from here does not reorder what another
 * writer left. The project's shape is the backend's write shape (`nodegx-backend/src/automations/shape.ts`
 * `projectWorkflow` / `projectTrigger`): no timestamps, no version, no run status, never a secret.
 *
 * @module local-backend/project-automations
 */

const fsSync = require('fs');
const path = require('path');

const AUTOMATIONS_FILE = 'nodegx.automations.json';
/** `shape.ts` writes a webhook's body limit out, so a file that leaves it implicit compares equal. */
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

/** Drop undefined fields, so an absent setting is absent in the file rather than `null`. */
function defined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** A stored workflow in the project's shape (`shape.ts` `projectWorkflow`). */
function projectWorkflow(w) {
  return defined({
    id: w.id,
    name: w.name,
    entry: w.entry,
    concurrency: w.concurrency && w.concurrency >= 1 ? w.concurrency : 1,
    timeoutMs: w.timeoutMs,
    stepTimeoutMs: w.stepTimeoutMs,
    ignorePrivacyRules: w.ignorePrivacyRules,
    steps: w.steps
  });
}

/** A stored trigger in the project's shape (`shape.ts` `projectTrigger`): what decides what runs and when, never its secret. */
function projectTrigger(t) {
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
    base.schedule = defined({
      cron: t.schedule.cron,
      missedFirePolicy: t.schedule.missedFirePolicy || 'skip',
      overlapPolicy: t.schedule.overlapPolicy,
      payload: t.schedule.payload
    });
  } else if (t.type === 'webhook' && t.webhook) {
    base.webhook = {
      slug: t.webhook.slug,
      scheme: t.webhook.scheme || 'hmac-sha256',
      maxBodyBytes: t.webhook.maxBodyBytes || DEFAULT_MAX_BODY_BYTES
    };
  } else if (t.type === 'db-change' && t.dbChange) {
    base.dbChange = { collection: t.dbChange.collection, actions: [...t.dbChange.actions] };
  }
  return base;
}

function automationsPath(projectDir) {
  return path.join(projectDir, AUTOMATIONS_FILE);
}

function readText(file) {
  return fsSync.existsSync(file) ? fsSync.readFileSync(file, 'utf8') : null;
}

function writeAtomic(file, text) {
  const tmp = `${file}.editor-tmp-${process.pid}`;
  fsSync.writeFileSync(tmp, text);
  fsSync.renameSync(tmp, file);
}

/**
 * The project's workflows and triggers as the file holds them.
 *
 * `exists: false` is a project with no file (nothing to list, not an error); `error` is a file that is
 * there and cannot be read as automations, said in words, because a panel that lists nothing for a broken
 * file reads as "you have none".
 *
 * @param {string} projectDir
 * @returns {{ file: string, exists: boolean, workflows: object[], triggers: object[], error?: string }}
 */
function readProjectAutomations(projectDir) {
  const file = automationsPath(projectDir);
  let text;
  try {
    text = readText(file);
  } catch (e) {
    return { file, exists: true, workflows: [], triggers: [], error: `${AUTOMATIONS_FILE} could not be read (${e.message}).` };
  }
  if (text === null) return { file, exists: false, workflows: [], triggers: [] };
  try {
    const json = JSON.parse(text);
    return {
      file,
      exists: true,
      workflows: Array.isArray(json.workflows) ? json.workflows : [],
      triggers: Array.isArray(json.triggers) ? json.triggers : []
    };
  } catch (e) {
    return { file, exists: true, workflows: [], triggers: [], error: `${AUTOMATIONS_FILE} is not valid JSON (${e.message}).` };
  }
}

/**
 * Set (an entry the backend stored) or remove (`null`) one workflow or trigger in the project's file.
 * Creates the file when the project has none. Returns the text it replaced, for `restoreFile`.
 *
 * @param {string} projectDir
 * @param {'workflow'|'trigger'} kind
 * @param {string} id
 * @param {object|null} stored - the backend's answer, or null to remove
 * @returns {{ file: string, before: string|null }}
 */
function patchProjectAutomations(projectDir, kind, id, stored) {
  const file = automationsPath(projectDir);
  const before = readText(file);
  const json = before === null ? { version: 1, workflows: [], triggers: [] } : JSON.parse(before);
  const key = kind === 'workflow' ? 'workflows' : 'triggers';
  json.workflows = Array.isArray(json.workflows) ? json.workflows : [];
  json.triggers = Array.isArray(json.triggers) ? json.triggers : [];
  const list = json[key];
  const at = list.findIndex((e) => e && e.id === id);
  if (stored === null) {
    if (at >= 0) list.splice(at, 1);
  } else {
    const entry = kind === 'workflow' ? projectWorkflow(stored) : projectTrigger(stored);
    if (at >= 0) list[at] = entry;
    else list.push(entry);
  }
  const text = JSON.stringify(json, null, 2) + (before === null || before.endsWith('\n') ? '\n' : '');
  writeAtomic(file, text);
  return { file, before };
}

/** Put the file back as it was before a patch (removed when there was none). */
function restoreFile(file, before) {
  if (before === null) fsSync.rmSync(file, { force: true });
  else writeAtomic(file, before);
}

/** JSON with every object's keys sorted, so two entries that differ only in key order compare equal. */
function canonical(value) {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

/**
 * How the backend's workflows differ from the project's, in words (BKO-001 AC6's drift).
 *
 * Only workflows: the panel lists workflows, and a trigger's difference is the Triggers surface's to say.
 * Each line names the workflow and which side has what, so a person can tell "the file is newer" (someone
 * edited it, or pulled it) from "the backend is newer" (a change made before this fix, or by a tool that
 * does not keep the file).
 *
 * @param {object[]} fileWorkflows - entries as the file holds them
 * @param {object[]} backendWorkflows - definitions as the backend serves them
 * @returns {string[]}
 */
function workflowDrift(fileWorkflows, backendWorkflows) {
  const lines = [];
  const onBackend = new Map(backendWorkflows.map((w) => [w.id, w]));
  const inFile = new Map(fileWorkflows.map((w) => [w.id, w]));
  for (const [id, w] of inFile) {
    const b = onBackend.get(id);
    if (!b) lines.push(`"${w.name || id}" is in the project's file but not on the backend.`);
    else if (canonical(projectWorkflow(w)) !== canonical(projectWorkflow(b))) {
      lines.push(`"${w.name || id}" on the backend is not what the project's file says.`);
    }
  }
  for (const [id, b] of onBackend) {
    if (!inFile.has(id)) lines.push(`"${b.name || id}" is on the backend but not in the project's file.`);
  }
  return lines;
}

module.exports = {
  AUTOMATIONS_FILE,
  projectWorkflow,
  projectTrigger,
  readProjectAutomations,
  patchProjectAutomations,
  restoreFile,
  workflowDrift
};
