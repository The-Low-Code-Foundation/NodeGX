/**
 * P132 BWF-008 (P132-EDITORREADSBACKEND) — the editor's workflow writes keep the project's
 * `nodegx.automations.json`, as Studio and the agent do.
 *
 * Measured in the editor 2026-11-03: a step changed on the Workflows canvas, *Save* → "Saved to the backend.",
 * the project's file byte-identical. The file is the truth (P127 BKO-001 R1), so the change was gone on any
 * other backend made from the project.
 *
 * The backend is a fake running supervisor holding workflows and triggers in memory: what is graded is the
 * order (backend first), the file afterwards, the undo when the file cannot be written, and the words.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  shell: {}
}));

const { BackendManager } = require('../../src/main/src/local-backend/BackendManager');
const projectAutomations = require('../../src/main/src/local-backend/project-automations');

/** A backend that answers the workflow and trigger admin routes from memory, decorating what it stores. */
function fakeBackend(projectDir, { workflows = [], triggers = [] } = {}) {
  const defs = new Map(workflows.map((w) => [w.id, { ...w, version: 1, createdAt: 'then', updatedAt: 'then' }]));
  const trigs = new Map(triggers.map((t) => [t.id, { ...t, createdAt: 'then', updatedAt: 'then', status: { lastRun: null } }]));
  const requests = [];
  return {
    config: { projectDir },
    requests,
    defs,
    trigs,
    isRunning: () => true,
    async request(method, p, body) {
      requests.push([method, p]);
      let m;
      if ((m = p.match(/^\/admin\/workflow-defs\/([^/]+)$/))) {
        const id = decodeURIComponent(m[1]);
        if (method === 'GET') {
          if (!defs.has(id)) throw new Error('GET failed with HTTP 404');
          return { workflow: defs.get(id) };
        }
        if (method === 'PUT') {
          if (!body.steps || !body.steps.length) throw new Error('Workflow "x" has no steps');
          const stored = { ...body, version: 2, createdAt: 'then', updatedAt: 'now' };
          defs.set(id, stored);
          return { workflow: stored, warnings: [] };
        }
        if (method === 'DELETE') {
          defs.delete(id);
          return { deleted: true };
        }
      }
      if (method === 'GET' && p === '/admin/workflow-defs') return { workflows: [...defs.values()] };
      if ((m = p.match(/^\/admin\/triggers\/([^/]+)\/enabled$/)) && method === 'POST') {
        const t = { ...trigs.get(decodeURIComponent(m[1])), enabled: body.enabled };
        trigs.set(t.id, t);
        return { trigger: t };
      }
      if ((m = p.match(/^\/admin\/triggers\/([^/]+)$/))) {
        const id = decodeURIComponent(m[1]);
        if (method === 'GET') return { trigger: trigs.get(id) };
        if (method === 'DELETE') {
          trigs.delete(id);
          return { deleted: true };
        }
      }
      if (method === 'POST' && p === '/admin/triggers') {
        trigs.set(body.id, body);
        return { trigger: body };
      }
      throw new Error('unexpected ' + method + ' ' + p);
    }
  };
}

const MORNING = {
  id: 'morning-check',
  name: 'The morning check',
  entry: 'check',
  concurrency: 1,
  steps: [{ id: 'check', kind: 'call-function', ref: 'Cloud Functions/Check thirst', next: ['done'] }, { id: 'done', kind: 'return' }]
};
const WATERED = {
  id: 'when-watered',
  name: 'When a plant is watered',
  entry: 'mark',
  concurrency: 1,
  ignorePrivacyRules: false,
  steps: [{ id: 'mark', kind: 'return', params: { value: 'was' } }]
};
const STARTER = {
  id: 'trg_watered',
  type: 'db-change',
  name: 'A watering',
  enabled: true,
  target: { kind: 'workflow', name: 'when-watered' },
  dbChange: { collection: 'Watering', actions: ['create'] }
};

describe('P132 BWF-008 — a workflow written from the editor is kept in the project’s file', () => {
  let root;
  let projectDir;
  let file;
  let manager;

  function giveFile(json, trailingNewline = true) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + (trailingNewline ? '\n' : ''));
  }
  function readFile() {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  function run(backend) {
    manager.runningBackends.set('be_1', backend);
    return backend;
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'p132-bwf008-'));
    projectDir = path.join(root, 'project');
    fs.mkdirSync(projectDir);
    file = path.join(projectDir, 'nodegx.automations.json');
    manager = new BackendManager({ backendsPath: path.join(root, 'backends') });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('saves to the backend first, then patches only that workflow in the file, in its place', async () => {
    giveFile({ version: 1, workflows: [WATERED, MORNING], triggers: [STARTER] });
    const backend = run(fakeBackend(projectDir, { workflows: [WATERED, MORNING], triggers: [STARTER] }));
    const changed = { ...WATERED, steps: [{ id: 'mark', kind: 'return', params: { value: 'edited in the editor' } }] };

    const answer = await manager.saveWorkflowDef('be_1', changed);

    expect(backend.requests.filter(([m]) => m === 'PUT')).toEqual([['PUT', '/admin/workflow-defs/when-watered']]);
    expect(answer.project).toEqual({ file: 'nodegx.automations.json', written: true });
    const json = readFile();
    expect(json.workflows.map((w) => w.id)).toEqual(['when-watered', 'morning-check']);
    expect(json.workflows[0].steps[0].params.value).toBe('edited in the editor');
    // the project's shape: no backend decorations, and the R5 switch kept (Studio's own writer drops it)
    expect(json.workflows[0]).not.toHaveProperty('updatedAt');
    expect(json.workflows[0]).not.toHaveProperty('version');
    expect(json.workflows[0].ignorePrivacyRules).toBe(false);
    expect(json.workflows[1]).toEqual(MORNING);
    expect(json.triggers).toEqual([STARTER]);
    expect(fs.readFileSync(file, 'utf8').endsWith('\n')).toBe(true);
  });

  it('makes the file when the project has none, for a new workflow', async () => {
    run(fakeBackend(projectDir));
    await manager.saveWorkflowDef('be_1', MORNING);
    expect(readFile()).toEqual({ version: 1, workflows: [MORNING], triggers: [] });
  });

  it('puts the backend back, and says so, when the file cannot be written', async () => {
    fs.mkdirSync(file); // a directory where the file should be: every write fails
    const backend = run(fakeBackend(projectDir, { workflows: [MORNING] }));
    const changed = { ...MORNING, name: 'Renamed' };

    await expect(manager.saveWorkflowDef('be_1', changed)).rejects.toThrow(
      /could not be written .*so the backend was put back as it was\. Nothing changed\./
    );
    expect(backend.defs.get('morning-check').name).toBe('The morning check');
  });

  it('a refused definition writes neither', async () => {
    giveFile({ version: 1, workflows: [MORNING], triggers: [] });
    const before = fs.readFileSync(file, 'utf8');
    run(fakeBackend(projectDir, { workflows: [MORNING] }));
    await expect(manager.saveWorkflowDef('be_1', { ...MORNING, steps: [] })).rejects.toThrow(/has no steps/);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  it('a backend started with no project saves alone, and the answer says why the file was not kept', async () => {
    const answer = await (async () => {
      run(fakeBackend(undefined, { workflows: [MORNING] }));
      return manager.saveWorkflowDef('be_1', { ...MORNING, name: 'Renamed' });
    })();
    expect(answer.project).toEqual({
      file: 'nodegx.automations.json',
      written: false,
      reason: 'this backend was started without a project'
    });
    expect(fs.existsSync(file)).toBe(false);
  });

  it('refuses to delete a workflow a trigger in the file still starts, and deletes from both otherwise', async () => {
    giveFile({ version: 1, workflows: [WATERED, MORNING], triggers: [STARTER] });
    const backend = run(fakeBackend(projectDir, { workflows: [WATERED, MORNING], triggers: [STARTER] }));

    await expect(manager.deleteWorkflowDef('be_1', 'when-watered')).rejects.toThrow(
      'A trigger still starts it ("A watering"): delete the trigger first, or it would start nothing.'
    );
    expect(backend.defs.has('when-watered')).toBe(true);

    const answer = await manager.deleteWorkflowDef('be_1', 'morning-check');
    expect(answer.project.written).toBe(true);
    expect(backend.defs.has('morning-check')).toBe(false);
    expect(readFile().workflows.map((w) => w.id)).toEqual(['when-watered']);
  });

  it('turns a trigger off with the POST the backend serves, and the file says off too', async () => {
    giveFile({ version: 1, workflows: [WATERED], triggers: [STARTER] });
    const backend = run(fakeBackend(projectDir, { workflows: [WATERED], triggers: [STARTER] }));

    await manager.setTriggerEnabled('be_1', 'trg_watered', false);

    // the editor sent PUT, which the backend does not serve (`admin-triggers.ts`: POST /admin/triggers/:id/enabled)
    expect(backend.requests).toContainEqual(['POST', '/admin/triggers/trg_watered/enabled']);
    expect(backend.trigs.get('trg_watered').enabled).toBe(false);
    expect(readFile().triggers).toEqual([{ ...STARTER, enabled: false }]);
  });

  it('deletes a trigger from both', async () => {
    giveFile({ version: 1, workflows: [WATERED], triggers: [STARTER] });
    run(fakeBackend(projectDir, { workflows: [WATERED], triggers: [STARTER] }));
    await manager.deleteTrigger('be_1', 'trg_watered');
    expect(readFile().triggers).toEqual([]);
  });

  it('lists each backend with its project and how its workflows differ from the file, in words', async () => {
    giveFile({ version: 1, workflows: [MORNING, { ...WATERED, name: 'When a plant is watered' }], triggers: [] });
    const edited = { ...WATERED, steps: [{ id: 'mark', kind: 'return', params: { value: 'only on the backend' } }] };
    const extra = { id: 'extra', name: 'Made before the fix', entry: 'a', steps: [{ id: 'a', kind: 'return' }] };
    manager.runningBackends.set('be_1', fakeBackend(projectDir, { workflows: [edited, extra] }));
    manager.getRunningEndpoints = () => [{ id: 'be_1', name: 'bwf008 drive' }];

    const [listed] = await manager.listAllWorkflowDefs();

    expect(listed.project.dir).toBe(projectDir);
    expect(listed.project.drift).toEqual([
      '"The morning check" is in the project\'s file but not on the backend.',
      '"When a plant is watered" on the backend is not what the project\'s file says.',
      '"Made before the fix" is on the backend but not in the project\'s file.'
    ]);
  });

  it('a backend and a file that agree (decorations aside) have no drift', () => {
    const stored = { ...MORNING, version: 3, createdAt: 'then', updatedAt: 'now' };
    expect(projectAutomations.workflowDrift([MORNING], [stored])).toEqual([]);
  });
});

describe('P132 BWF-008 — the project’s workflows read from its file, backend or none', () => {
  let dir;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p132-bwf008-read-'))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('no file is nothing to list, not an error', () => {
    expect(projectAutomations.readProjectAutomations(dir)).toMatchObject({ exists: false, workflows: [], triggers: [] });
    expect(projectAutomations.readProjectAutomations(dir).error).toBeUndefined();
  });

  it('a broken file is said in words, so an empty list never reads as "you have none"', () => {
    fs.writeFileSync(path.join(dir, 'nodegx.automations.json'), '{ "workflows": [');
    expect(projectAutomations.readProjectAutomations(dir).error).toMatch(/^nodegx\.automations\.json is not valid JSON/);
  });

  it('reads the workflows and triggers the file holds', () => {
    fs.writeFileSync(path.join(dir, 'nodegx.automations.json'), JSON.stringify({ version: 1, workflows: [MORNING], triggers: [STARTER] }));
    const read = projectAutomations.readProjectAutomations(dir);
    expect(read.workflows.map((w) => w.name)).toEqual(['The morning check']);
    expect(read.triggers.map((t) => t.id)).toEqual(['trg_watered']);
  });
});
