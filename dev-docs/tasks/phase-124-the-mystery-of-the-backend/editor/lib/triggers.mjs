// P127 BKO-005, the map's half: what the backend starts by itself (a schedule, a row change, a webhook), drawn as the
// head of a flow into the functions it runs. A trigger runs a function, or a workflow whose steps run functions; the
// map has no block for a workflow, so a workflow's trigger is wired to each function its steps name.
//
// Both sources are read, as the tables are (BKO-003): the backend's own list (it has the schedule's words and the last
// run) and the project's `nodegx.automations.json` (R1: the files are the truth). One only in the file is drawn and
// said to be not on the backend yet; one only on the backend is said to be missing from the file.

export const AUTOMATIONS_FILE = 'nodegx.automations.json';

export function readAutomationsFile(files) {
  const text = files.read(AUTOMATIONS_FILE);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The function a trigger or a step names, as the backend finds it (P127-BKO006-TRIGGERNAME): the full name, or a
 * short name only one function ends with. Null when none or two match.
 */
export function functionNamed(name, functionNames) {
  if (!name) return null;
  if (functionNames.includes(name)) return name;
  const ends = functionNames.filter((f) => f.split('/').pop() === name || f.endsWith('/' + name));
  return ends.length === 1 ? ends[0] : null;
}

/**
 * @param {object} o
 * @param {object[]} o.backend    `GET /admin/triggers`'s triggers
 * @param {object[]} o.workflows  `GET /admin/workflow-defs`'s workflows
 * @param {object|null} o.file    the parsed `nodegx.automations.json`, or null when the app has none
 * @param {string[]} o.functions  the app's function names, as the map draws them
 */
export function triggerFlows({ backend = [], workflows = [], file = null, functions = [] }) {
  const fileTriggers = file?.triggers ?? [];
  const byId = new Map();
  for (const t of backend) byId.set(t.id, { def: t, onBackend: true, inFile: false });
  for (const t of fileTriggers) {
    const seen = byId.get(t.id);
    if (seen) seen.inFile = true;
    else byId.set(t.id, { def: t, onBackend: false, inFile: true });
  }
  // The backend's definition of a workflow first (it is what runs), the file's for one the backend lacks.
  const wfs = new Map();
  for (const w of file?.workflows ?? []) wfs.set(w.id, w);
  for (const w of workflows) wfs.set(w.id, w);

  return [...byId.values()].map(({ def, onBackend, inFile }) => {
    const target = def.target ?? {};
    const workflow = target.kind === 'workflow' ? wfs.get(target.name) ?? null : null;
    // [name, must it be a function]: a call-function step must; another kind's ref (a for-each's) may be one
    const asked = target.kind === 'workflow' ? (workflow?.steps ?? []).filter((s) => s.ref).map((s) => [s.ref, s.kind === 'call-function']) : [[target.name, true]];
    const fns = [];
    const unresolved = [];
    for (const [name, must] of asked) {
      const fn = functionNamed(name, functions);
      if (fn) !fns.includes(fn) && fns.push(fn);
      else if (must) unresolved.push(name);
    }
    return {
      id: def.id,
      name: def.name ?? null,
      type: def.type,
      enabled: def.enabled !== false,
      cron: def.schedule?.cron ?? null,
      scheduleWords: def.scheduleWords ?? null,
      hook: def.webhook?.slug ?? null,
      table: def.dbChange?.collection ?? null,
      actions: def.dbChange?.actions ?? [],
      target: { kind: target.kind ?? null, name: target.name ?? null },
      workflow: workflow ? { id: workflow.id, name: workflow.name ?? workflow.id, steps: (workflow.steps ?? []).length } : null,
      workflowMissing: target.kind === 'workflow' && !workflow,
      fns,
      unresolved,
      lastFiredAt: def.status?.lastFiredAt ?? null,
      lastResult: def.status?.lastResult ?? null,
      notOnBackend: !onBackend,
      notInFile: !!file && onBackend && !inFile
    };
  });
}
