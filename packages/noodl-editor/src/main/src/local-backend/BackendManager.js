/**
 * BackendManager
 *
 * Manages the lifecycle of local backends — creation, starting, stopping,
 * deletion — and provides the IPC surface the renderer's Backend Services
 * panel / Data Browser call.
 *
 * WF-004: backends no longer run inside the editor's main process. Each
 * running backend is a supervised `nodegx-backend` child process
 * (ServiceSupervisor), and every data/schema/workflow IPC handler proxies over
 * HTTP to it. The IPC channel names and payload shapes are unchanged — the
 * renderer UI does not know the process boundary moved.
 *
 * Config/metadata persistence stays here (it is editor state, not service
 * state): `~/.noodl/backends/<id>/{config.json,data/,workflows/}`.
 *
 * @module local-backend/BackendManager
 */

const { ipcMain, BrowserWindow, shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const { ServiceSupervisor } = require('./ServiceSupervisor');
const { BackendProcessRegistry } = require('./BackendProcessRegistry');
const workflowProposals = require('./workflow-proposals');

/**
 * Safe console.log wrapper
 */
function safeLog(...args) {
  try {
    console.log('[BackendManager]', ...args);
  } catch (e) {
    // Ignore EPIPE errors
  }
}

/**
 * Generate a unique backend ID
 */
function generateBackendId() {
  return 'backend_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Backend metadata stored in config.json
 * @typedef {Object} BackendMetadata
 * @property {string} id - Unique backend ID
 * @property {string} name - Display name
 * @property {string} createdAt - ISO8601 timestamp
 * @property {number} port - HTTP port
 * @property {string[]} projectIds - Projects that own this backend. Stamped at
 *   creation (AAQ-002/F4) and read by `findReusableBackend` — a backend one
 *   project owns is never reused by another. Empty for backends made by hand in
 *   Backend Services, and for every backend created before that task.
 */

/**
 * BackendManager singleton class
 */
class BackendManager {
  /**
   * @param {Object} [options]
   * @param {string} [options.backendsPath] - Override the metadata root. The
   *   singleton never passes it; a test does, so the process-registry wiring can
   *   be asserted without writing into the developer's real `~/.noodl`.
   * @param {Object} [options.registryDeps] - Injectable probes for the orphan
   *   reaper (see BackendProcessRegistry).
   */
  constructor(options = {}) {
    this.backendsPath = options.backendsPath || path.join(os.homedir(), '.noodl', 'backends');
    this.runningBackends = new Map(); // id -> ServiceSupervisor
    // id -> { code, message } — remembers why the last start attempt failed so
    // the UI can show "persistence unavailable" for a backend that isn't running.
    this.startErrors = new Map();
    this.ipcHandlersSetup = false;

    // AAQ-011/F10. The durable half of the lifecycle: a record per spawned child
    // that outlives this process, so the next launch — of THIS editor or of
    // `noodl-mcp`, which spawns backends too since F13 — can reap what a crash
    // left behind. One `runtime.json` per backend directory, in the shape
    // `noodl-mcp/src/backend/runtimeRecord.ts` defines. See
    // BackendProcessRegistry for the whole design and for why it is that file
    // rather than a format of the editor's own.
    this.registry = new BackendProcessRegistry({
      rootDir: this.backendsPath,
      kind: 'editor',
      deps: options.registryDeps
    });
    /** Resolves once the startup sweep has finished; `startBackend` waits on it. */
    this.sweepPromise = null;
  }

  /**
   * Settle whatever a previous session — or a dead `noodl-mcp` — left behind
   * (AAQ-011/F10).
   *
   * Called once from `app.on('ready')`. `startBackend` awaits it before spawning
   * anything, so a backend about to be started can never race the reaper that is
   * deciding whether its predecessor is an orphan.
   *
   * There is no separate "claim": ownership is written into each spawn record and
   * kept alive by that record's heartbeat, so a session with no backends has
   * nothing to claim and nothing to release.
   *
   * @returns {Promise<object[]>} the sweep report, one row per record
   */
  claimAndSweep() {
    if (this.sweepPromise) return this.sweepPromise;
    this.sweepPromise = this.registry
      .sweep()
      .then((rows) => {
        if (rows.length) {
          const counts = rows.reduce((acc, row) => ({ ...acc, [row.outcome]: (acc[row.outcome] || 0) + 1 }), {});
          safeLog(
            'Orphan sweep: ' +
              Object.entries(counts)
                .map(([outcome, n]) => `${n} ${outcome}`)
                .join(', ')
          );
          for (const row of rows) {
            if (row.detail) safeLog(`  ${row.backendId}: ${row.outcome} — ${row.detail}`);
          }
        }
        return rows;
      })
      .catch((e) => {
        // A sweep that throws must not stop the editor starting: the worst case
        // is the orphan the backend's own `--parent-pid` guard is still watching.
        safeLog(`Orphan sweep failed: ${e.message}`);
        return [];
      });
    return this.sweepPromise;
  }

  /**
   * Stop heartbeating the records this session owns.
   *
   * Called on an orderly exit AFTER the backends are actually stopped. Order
   * matters and it is the opposite of what it looks like: a record whose
   * heartbeat is fresh is protected from every reaper, so stopping the beats
   * before the processes are down would open a window in which a crash here
   * leaves live children that the next sweep reaps *sooner* — which is the
   * direction we want, but it would also mean a slow-but-successful `stopAll`
   * could have its own live backends judged unowned by a concurrent `noodl-mcp`
   * sweep. After the stops, every record has already been deleted anyway, and
   * this is the tidy-up for the ones that could not be.
   */
  releaseOwnership() {
    try {
      this.registry.stopAllHeartbeats();
    } catch (e) {
      safeLog(`Could not stop backend heartbeats: ${e.message}`);
    }
  }

  /**
   * Setup IPC handlers for renderer process
   */
  setupIPC() {
    if (this.ipcHandlersSetup) return;

    safeLog('Setting up IPC handlers');

    ipcMain.handle('backend:list', async () => this.listBackends());
    ipcMain.handle('backend:create', async (_, name, options) => this.createBackend(name, options));
    ipcMain.handle('backend:rename', async (_, id, name) => this.renameBackend(id, name));
    ipcMain.handle('backend:delete', async (_, id) => this.deleteBackend(id));
    // Start a backend. options.ephemeral opts in to non-persisting in-memory mode.
    ipcMain.handle('backend:start', async (_, id, options) => this.startBackend(id, options));
    ipcMain.handle('backend:stop', async (_, id) => this.stopBackend(id));
    ipcMain.handle('backend:status', async (_, id) => this.getStatus(id));
    ipcMain.handle('backend:open-dashboard', async (_, id, route) => this.openDashboard(id, route));
    ipcMain.handle('backend:export-schema', async (_, id, format) => this.exportSchema(id, format));
    ipcMain.handle('backend:getSchema', async (_, id) => this.getSchema(id));
    ipcMain.handle('backend:getTableSchema', async (_, id, tableName) => this.getTableSchema(id, tableName));
    ipcMain.handle('backend:createTable', async (_, id, tableSchema) => this.createTable(id, tableSchema));
    ipcMain.handle('backend:addColumn', async (_, id, tableName, column) => this.addColumn(id, tableName, column));
    ipcMain.handle('backend:changeColumnType', async (_, id, tableName, columnName, newType) =>
      this.changeColumnType(id, tableName, columnName, newType)
    );

    // ==========================================================================
    // DATA — what the editor still reads. BMG-012 removed the Data Browser and
    // with it the create / save / delete record proxies and the realtime
    // subscription proxies; the lesson grader and the backend list count rows.
    // ==========================================================================

    ipcMain.handle('backend:queryRecords', async (_, id, options) => this.queryRecords(id, options));

    // Workflow management
    ipcMain.handle('backend:update-workflow', async (_, args) =>
      this.updateWorkflow(args.backendId, args.name, args.workflow)
    );
    ipcMain.handle('backend:workflow-status', async (_, id) => this.getWorkflowStatus(id));

    // WF-001 workflow definitions (WFA-002): the Execution History panel runs
    // and cancels them, so a change can be tested without leaving the editor.
    ipcMain.handle('backend:list-workflow-defs', async () => this.listAllWorkflowDefs());
    ipcMain.handle('backend:run-workflow-def', async (_, id, workflowId, payload) =>
      this.runWorkflowDef(id, workflowId, payload)
    );
    ipcMain.handle('backend:cancel-workflow-run', async (_, id, executionId) =>
      this.cancelWorkflowRun(id, executionId)
    );

    // WFA-004: the workflow canvas. The step-kind catalog is the canvas's node
    // registry and comes from the backend the workflow will actually run on —
    // never a bundled copy, which could offer a kind that backend cannot
    // execute. The CRUD half is the canvas's save path.
    ipcMain.handle('backend:workflow-step-kinds', async (_, id) => this.getWorkflowStepKinds(id));
    ipcMain.handle('backend:get-workflow-def', async (_, id, workflowId) => this.getWorkflowDef(id, workflowId));
    ipcMain.handle('backend:save-workflow-def', async (_, id, workflow) => this.saveWorkflowDef(id, workflow));
    ipcMain.handle('backend:delete-workflow-def', async (_, id, workflowId) =>
      this.deleteWorkflowDef(id, workflowId)
    );

    // WFA-007: the review queue. An agent that staged a workflow instead of
    // writing it left a file in this backend's own directory; these three
    // channels are how the Workflows panel finds it, reads it, and drops it.
    //
    // Deliberately NOT proxied to the backend: a proposal is not backend state,
    // the engine never reads it, and it must be reviewable whether or not the
    // backend is running. (The candidate is still validated against the backend
    // before it is offered — that part does need it running.)
    ipcMain.handle('backend:list-workflow-proposals', async () => this.listAllWorkflowProposals());
    ipcMain.handle('backend:get-workflow-proposal', async (_, id, proposalId) =>
      workflowProposals.getProposal(id, proposalId, this.backendsPath)
    );
    ipcMain.handle('backend:discard-workflow-proposal', async (_, id, proposalId) =>
      workflowProposals.discardProposal(id, proposalId, this.backendsPath)
    );
    ipcMain.handle('backend:validate-workflow-def', async (_, id, workflow) =>
      this.validateWorkflowDef(id, workflow)
    );

    // ==========================================================================
    // TRIGGERS (WF-005) — what the workflow canvas still does from the editor.
    //
    // BMG-012: the proxies for permissions, roles, API keys, function rules,
    // secrets, search, sign-in providers, email, and the trigger create / edit /
    // rotate / fire verbs are gone with the editor panels that called them. The
    // backend manager (`/_admin`, opened by `openDashboard`) speaks those
    // routes directly. What stays is what the canvas draws and toggles.
    // ==========================================================================

    ipcMain.handle('backend:listTriggers', async (_, id) =>
      this.requireRunning(id, 'list triggers').request('GET', '/admin/triggers')
    );
    ipcMain.handle('backend:setTriggerEnabled', async (_, id, triggerId, enabled) =>
      this.requireRunning(id, 'enable/disable trigger').request(
        'PUT',
        `/admin/triggers/${encodeURIComponent(triggerId)}/enabled`,
        { enabled }
      )
    );
    ipcMain.handle('backend:deleteTrigger', async (_, id, triggerId) =>
      this.requireRunning(id, 'delete trigger').request('DELETE', `/admin/triggers/${encodeURIComponent(triggerId)}`)
    );

    this.ipcHandlersSetup = true;
  }

  /**
   * Tell every renderer that the set of backends, or one backend's running
   * state, changed (WFA-005, closing F47/F34).
   *
   * Three panels — Workflows, Execution History, Triggers — describe another
   * process's state, and the sidebar keeps an inactive panel MOUNTED AND HIDDEN,
   * so switching away and back neither remounts nor refetches. Each of them
   * worked around that with an `activeChanged` listener, which cannot help the
   * case that actually bites: the panel is already open and in front of you when
   * the backend starts, and it keeps saying "no backend is running" until you
   * press Refresh. There was no event to listen to. This is it — one event, so
   * the workaround does not have to be written a fourth time.
   *
   * Broadcast rather than sender-targeted: a lifecycle change is true of the
   * whole application, not of whoever asked for it, and the panel that needs to
   * know is usually not the one that pressed Start.
   *
   * @param {string} backendId
   * @param {'created'|'started'|'stopped'|'deleted'|'exited'} reason
   * @private
   */
  broadcastStatusChanged(backendId, reason) {
    const detail = {
      backendId,
      reason,
      running: reason === 'started',
      at: new Date().toISOString()
    };
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue;
      const wc = win.webContents;
      // A renderer that is gone or still loading cannot receive this, and
      // neither case is an error — it will read the state on mount anyway.
      if (!wc || wc.isDestroyed()) continue;
      try {
        wc.send('backend:statusChanged', detail);
      } catch (e) {
        safeLog(`Could not deliver backend:statusChanged to a window: ${e.message}`);
      }
    }
  }

  /**
   * The supervisor for a running backend, or throw the message every proxied
   * handler used to throw when the server wasn't running.
   * @private
   */
  requireRunning(id, action) {
    const supervisor = this.runningBackends.get(id);
    if (!supervisor || !supervisor.isRunning()) {
      throw new Error(`Backend must be running to ${action}`);
    }
    return supervisor;
  }

  /**
   * Ensure backends directory exists
   */
  async ensureBackendsDir() {
    await fs.mkdir(this.backendsPath, { recursive: true });
  }

  /**
   * List all backends
   * @returns {Promise<BackendMetadata[]>}
   */
  async listBackends() {
    await this.ensureBackendsDir();

    const entries = await fs.readdir(this.backendsPath, { withFileTypes: true });
    const backends = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      try {
        const configPath = path.join(this.backendsPath, entry.name, 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        backends.push(config);
      } catch (e) {
        // Invalid backend directory, skip
        safeLog(`Skipping invalid backend: ${entry.name}`, e.message);
      }
    }

    // Most-recently-created first. `readdir`'s order is filesystem-dependent —
    // on some platforms it is incidentally alphabetical-by-id, which loosely
    // tracks creation time since ids embed `Date.now().toString(36)`, but that
    // is an accident nothing here should keep relying on.
    backends.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return backends;
  }

  /**
   * Get a single backend by ID
   * @param {string} id
   * @returns {Promise<BackendMetadata|null>}
   */
  async getBackend(id) {
    const backendPath = path.join(this.backendsPath, id);

    try {
      const configPath = path.join(backendPath, 'config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (e) {
      return null;
    }
  }

  /**
   * Create a new backend
   * @param {string} name - Display name
   * @returns {Promise<BackendMetadata>}
   */
  async createBackend(name, options) {
    await this.ensureBackendsDir();

    const id = generateBackendId();
    const backendPath = path.join(this.backendsPath, id);

    // Create directory structure
    await fs.mkdir(backendPath, { recursive: true });
    await fs.mkdir(path.join(backendPath, 'data'));
    await fs.mkdir(path.join(backendPath, 'workflows'));

    // Find available port
    const port = await this.findAvailablePort();

    // Create config.
    //
    // AAQ-002/F4: `projectIds` was written empty here and read by nobody — three
    // separate modules say "projectIds is dead" in a comment. It is now the
    // *ownership* record a provision matches on, and it is stamped at creation
    // rather than added afterwards on purpose: a backend that exists for a
    // moment with no owner is a backend the next provision would adopt, which is
    // the machine-wide reuse this field exists to end.
    const config = {
      id,
      name,
      createdAt: new Date().toISOString(),
      port,
      projectIds: options && options.projectId ? [options.projectId] : []
    };

    await fs.writeFile(path.join(backendPath, 'config.json'), JSON.stringify(config, null, 2));

    // Create empty schema
    await fs.writeFile(path.join(backendPath, 'schema.json'), JSON.stringify({ tables: [] }, null, 2));

    safeLog(`Created backend: ${id} (${name}) on port ${port}`);
    this.broadcastStatusChanged(id, 'created');
    return config;
  }

  /**
   * Rename a backend. The only field this ever changes on `config.json` — id,
   * port and `projectIds` are load-bearing elsewhere and stay untouched.
   * @param {string} id
   * @param {string} name
   * @returns {Promise<BackendMetadata>}
   */
  async renameBackend(id, name) {
    const config = await this.getBackend(id);
    if (!config) {
      throw new Error(`Backend not found: ${id}`);
    }

    const trimmed = String(name || '').trim();
    if (!trimmed) {
      throw new Error('A backend needs a name.');
    }

    config.name = trimmed;
    await fs.writeFile(path.join(this.backendsPath, id, 'config.json'), JSON.stringify(config, null, 2));

    safeLog(`Renamed backend ${id} to "${trimmed}"`);
    this.broadcastStatusChanged(id, 'renamed');
    return config;
  }

  /**
   * Delete a backend
   * @param {string} id
   */
  async deleteBackend(id) {
    // Stop if running
    if (this.runningBackends.has(id)) {
      await this.stopBackend(id);
    }

    const backendPath = path.join(this.backendsPath, id);

    // Remove directory recursively
    await fs.rm(backendPath, { recursive: true, force: true });

    this.startErrors.delete(id);

    safeLog(`Deleted backend: ${id}`);
    this.broadcastStatusChanged(id, 'deleted');
    return { deleted: true, id };
  }

  /**
   * Start a backend as a supervised child process.
   * @param {string} id
   * @param {Object} [options]
   * @param {boolean} [options.ephemeral] - Opt in to non-persisting in-memory mode
   *   when the native SQLite engine is unavailable. Data will NOT persist.
   * @param {string} [options.projectDir] - SB-015: the **project** directory this
   *   backend is being started for, which is not the data directory. The service
   *   reads `nodegx.security.json` from it at startup step 1.4 and installs it as
   *   its own `security.json`, but only when it has none yet — so passing it on
   *   every start, including a restart, is idempotent, and it is inert for a
   *   project that ships no policy. Every renderer call site sends it through
   *   `BackendServices/startLocalBackend`; see that module for why.
   */
  async startBackend(id, options = {}) {
    // Already running?
    const existing = this.runningBackends.get(id);
    if (existing && existing.isRunning()) {
      safeLog(`Backend ${id} already running`);
      return this.getStatus(id);
    }

    // AAQ-011/F10: never spawn while the startup sweep is still deciding whether
    // a process from a previous session is an orphan. Without this, an auto-start
    // on project open could bind the port a moment before the reaper kills the
    // predecessor that was holding it — or, worse, the reaper could settle a
    // record we had just overwritten.
    if (this.sweepPromise) await this.sweepPromise;

    // Load config
    const config = await this.getBackend(id);
    if (!config) {
      throw new Error(`Backend not found: ${id}`);
    }

    const backendPath = path.join(this.backendsPath, id);
    const supervisor = new ServiceSupervisor({
      id: config.id,
      name: config.name,
      // The service owns the whole data dir: SQLite files, uploads, workflows.
      dataDir: backendPath,
      port: config.port,
      ephemeral: options.ephemeral === true,
      // SB-015 — the project, not the data dir. See the jsdoc above.
      projectDir: typeof options.projectDir === 'string' && options.projectDir.trim() ? options.projectDir : undefined,
      // A backend that dies on its own is exactly as interesting to a panel as
      // one that is stopped deliberately, and it is the case that used to be
      // invisible: the panel kept showing a running backend that was gone.
      onUnexpectedExit: ({ code, signal }) => {
        this.runningBackends.delete(id);
        // The process is gone, so its spawn record describes nothing. Dropping
        // it here is what stops a crashed backend's pid being carried into the
        // next session's sweep, where a recycled pid would have to be refused
        // on identity rather than never considered.
        this.registry.forgetSpawn(id);
        this.startErrors.set(id, {
          code: 'BACKEND_EXITED',
          message: `The backend service exited unexpectedly (code=${code}, signal=${signal}).`
        });
        this.broadcastStatusChanged(id, 'exited');
      }
    });

    try {
      // AAQ-011/F10 — the record is written from the child's pid, which exists
      // the moment `start()` is CALLED (the `spawn()` happens synchronously in
      // the promise executor), not when it resolves. Recording here rather than
      // after the await is deliberate: the READY handshake has a 15-second
      // ceiling, and a crash inside that window would otherwise leave a live
      // child with no record of it anywhere.
      const started = supervisor.start();
      const entry = (supervisor.child && supervisor.child.spawnargs && supervisor.child.spawnargs[1]) || '';
      try {
        if (supervisor.child && supervisor.child.pid) {
          this.registry.recordSpawn({
            backendId: id,
            backendName: config.name,
            pid: supervisor.child.pid,
            port: config.port,
            entry,
            projectDir: backendPath
          });
        }
      } catch (e) {
        // A registry that cannot write is a reaping problem, not a start
        // problem. The backend's own `--parent-pid` guard still applies.
        safeLog(`Could not record the spawn of ${id}: ${e.message}`);
      }
      await started;
      // The service may bind a different port than the config asked for; the
      // record has to describe where it actually is, because the health probe
      // that corroborates identity uses it.
      const boundPort = (supervisor.ready && supervisor.ready.port) || config.port;
      if (boundPort !== config.port && supervisor.child && supervisor.child.pid) {
        try {
          this.registry.recordSpawn({
            backendId: id,
            backendName: config.name,
            pid: supervisor.child.pid,
            port: boundPort,
            entry,
            projectDir: backendPath
          });
        } catch (e) {
          safeLog(`Could not update the spawn record of ${id}: ${e.message}`);
        }
      }
    } catch (e) {
      // The child either never existed or is on its way out; either way the
      // record must not survive this call.
      this.registry.forgetSpawn(id);
      // Remember the failure so getStatus() can report "persistence unavailable"
      // for this stopped backend, and rethrow so backend:start rejects loudly.
      this.startErrors.set(id, {
        code: e.code || 'BACKEND_START_FAILED',
        message: e.message
      });
      safeLog(`Failed to start backend ${id}: ${e.message}`);
      throw e;
    }

    this.startErrors.delete(id);
    this.runningBackends.set(id, supervisor);

    safeLog(`Started backend: ${id} on ${supervisor.endpoint}`);
    this.broadcastStatusChanged(id, 'started');
    return this.getStatus(id);
  }

  /**
   * Stop a backend
   * @param {string} id
   */
  async stopBackend(id) {
    const supervisor = this.runningBackends.get(id);
    if (!supervisor) {
      safeLog(`Backend ${id} not running`);
      return { running: false };
    }

    await supervisor.stop();
    this.runningBackends.delete(id);
    // Orderly stop: the record has nothing left to describe. This is the happy
    // path the reaper exists because we cannot rely on (AAQ-011/F10).
    this.registry.forgetSpawn(id);

    safeLog(`Stopped backend: ${id}`);
    this.broadcastStatusChanged(id, 'stopped');
    return { running: false };
  }

  /**
   * Get backend status, including how it is persisting data — live from the
   * service's /health endpoint when running.
   * @param {string} id
   * @returns {Promise<{ running: boolean, port?: number, endpoint?: string, persistence: object }>}
   */
  async getStatus(id) {
    const supervisor = this.runningBackends.get(id);
    if (!supervisor || !supervisor.isRunning()) {
      // Not running. If the last start attempt failed, surface why so the UI
      // can distinguish "stopped" from "could not persist". A child that died
      // after starting shows its exit + log tail.
      const lastError = this.startErrors.get(id);
      const died = supervisor && supervisor.lastExit;
      const error = lastError
        ? lastError
        : died
        ? {
            code: 'BACKEND_EXITED',
            message:
              `Backend process exited (code=${died.code}, signal=${died.signal}).\n` +
              `Last output:\n${supervisor.logTail()}`
          }
        : null;
      if (died) this.runningBackends.delete(id);
      return {
        running: false,
        persistence: error
          ? { mode: 'failed', persistent: false, ephemeral: false, error }
          : { mode: 'unknown', persistent: false, ephemeral: false, error: null }
      };
    }

    const health = await supervisor.fetchHealth();
    const port = (supervisor.ready && supervisor.ready.port) || supervisor.config.port;
    return {
      running: true,
      port,
      endpoint: supervisor.endpoint,
      pid: supervisor.child ? supervisor.child.pid : undefined,
      persistence: health
        ? health.persistence
        : { mode: 'unknown', persistent: false, ephemeral: false, error: { message: 'health check unreachable' } },
      workflows: health ? health.workflows : undefined
    };
  }

  /**
   * Endpoints of all currently-running backends (used by the execution-history
   * IPC merge — the services own their execution stores now).
   *
   * ⚠️ The admin credential rides along because `GET /executions` is an admin
   * route (it simply does not start with `admin/`), and since FH-024 (b)
   * dev-open no longer relaxes the admin gate. `ExecutionHistoryManager` fetches
   * those two paths itself rather than through `ServiceSupervisor.request`, so
   * this is the only place it can be handed the token.
   * @returns {{ id: string, name: string, endpoint: string, adminToken: string|null }[]}
   */
  getRunningEndpoints() {
    const result = [];
    for (const [id, supervisor] of this.runningBackends) {
      if (supervisor.isRunning()) {
        result.push({
          id,
          name: supervisor.config.name,
          endpoint: supervisor.endpoint,
          adminToken: supervisor.adminToken()
        });
      }
    }
    return result;
  }

  /**
   * Open the backend's own web dashboard (`/_admin`) in the default browser,
   * on its home, or on a page (BMG-012).
   *
   * Until an admin ACCOUNT exists, the credential goes in the URL fragment,
   * which the dashboard reads once and scrubs from the address bar — the first
   * open is where it asks for the account (BMG-014). It is resolved here in the
   * main process and handed straight to the OS, so the renderer never holds it.
   * Once an account exists (`whoami.adminAccount`) the fragment carries only
   * the route: the person signs in once per browser and the manager knows who
   * they are (Richard, 2026-09-26). If the backend cannot say, the credential
   * goes as before, so the button always opens something that works.
   *
   * `route` is a manager hash path (`/schema/Pet/new-field`, `/triggers/new`),
   * carried in the same fragment as `route=` so the page can land on it after
   * consuming the token (`admin/app/api.ts bootSession`). Only a path is
   * accepted: it must start with one `/` (never `//`, which a browser reads as
   * a host) and carry no `#`, so a caller cannot smuggle a second fragment or
   * an origin through the editor's signed-in open.
   * @param {string} id
   * @param {string} [route]
   */
  async openDashboard(id, route) {
    const supervisor = this.requireRunning(id, 'open the backend manager');
    const token = supervisor.adminToken();
    let account = false;
    try {
      const who = await supervisor.request('GET', '/_admin/whoami');
      account = !!(who && who.adminAccount);
    } catch (e) {
      account = false;
    }
    const parts = [];
    if (token && !account) parts.push(`token=${encodeURIComponent(token)}`);
    if (typeof route === 'string' && /^\/(?!\/)[^#\s]*$/.test(route)) parts.push(`route=${encodeURIComponent(route)}`);
    const url = `${supervisor.endpoint}/_admin` + (parts.length ? `#${parts.join('&')}` : '');
    await shell.openExternal(url);
    return true;
  }

  /**
   * Export backend schema
   * @param {string} id
   * @param {'postgres'|'supabase'|'json'} format
   */
  async exportSchema(id, format = 'json') {
    const supervisor = this.requireRunning(id, 'export schema');
    const result = await supervisor.request('GET', `/admin/schema-export?format=${encodeURIComponent(format)}`);
    return result.content;
  }

  // ==========================================================================
  // SCHEMA MANAGEMENT
  // ==========================================================================

  /**
   * Get full schema for a backend
   * @param {string} id - Backend ID
   * @returns {Promise<Object>} Schema with tables array
   */
  async getSchema(id) {
    const supervisor = this.requireRunning(id, 'get schema');
    return supervisor.request('GET', '/admin/schema');
  }

  /**
   * Get schema for a single table
   * @param {string} id - Backend ID
   * @param {string} tableName - Table name
   * @returns {Promise<Object|null>} Table schema
   */
  async getTableSchema(id, tableName) {
    const supervisor = this.requireRunning(id, 'get table schema');
    try {
      return await supervisor.request('GET', `/admin/schema/${encodeURIComponent(tableName)}`);
    } catch (e) {
      return null;
    }
  }

  /**
   * Create a new table
   * @param {string} id - Backend ID
   * @param {Object} tableSchema - Table schema { name, columns }
   * @returns {Promise<Object>} Result with success status
   */
  async createTable(id, tableSchema) {
    const supervisor = this.requireRunning(id, 'create table');
    const result = await supervisor.request('POST', '/admin/schema', {
      action: 'createTable',
      table: tableSchema.name,
      columns: tableSchema.columns
    });
    safeLog(`Created table: ${tableSchema.name} (created: ${result.created})`);
    return { success: true, created: result.created, tableName: tableSchema.name };
  }

  /**
   * Add a column to an existing table
   * @param {string} id - Backend ID
   * @param {string} tableName - Table name
   * @param {Object} column - Column definition { name, type, required, default }
   * @returns {Promise<Object>} Result with success status
   */
  async addColumn(id, tableName, column) {
    const supervisor = this.requireRunning(id, 'add column');
    await supervisor.request('POST', '/admin/schema', { action: 'addColumn', table: tableName, column });
    safeLog(`Added column: ${column.name} to table ${tableName}`);
    return { success: true, tableName, columnName: column.name };
  }

  /**
   * Change a column's type, converting the values already stored in it (AAQ-002).
   *
   * ⚠️ Lossy by nature when the storage class moves — `CAST('sold out' AS REAL)`
   * is `0.0` — so `convertedValues` comes back and callers are expected to say
   * so. See `SchemaManager.changeColumnType` for what is and is not refused.
   *
   * @param {string} id - Backend ID
   * @param {string} tableName
   * @param {string} columnName
   * @param {string} newType - A Noodl column type (String, Number, Boolean, …)
   * @returns {Promise<Object>} `{ success, changed, from, rebuilt, convertedValues }`
   */
  async changeColumnType(id, tableName, columnName, newType) {
    const supervisor = this.requireRunning(id, 'change column type');
    const result = await supervisor.request('POST', '/admin/schema', {
      action: 'changeColumnType',
      table: tableName,
      column: columnName,
      type: newType
    });
    safeLog(`Changed column type: ${tableName}.${columnName} → ${newType} (changed: ${result.changed})`);
    return {
      success: true,
      tableName,
      columnName,
      changed: result.changed,
      from: result.from,
      rebuilt: result.rebuilt,
      convertedValues: result.convertedValues
    };
  }

  /**
   * Find an available port starting from 8578.
   * (8577 was reserved for the now-deleted cloud-function-server, WF-007;
   * kept as the starting point so existing configs don't shift.)
   */
  async findAvailablePort() {
    const backends = await this.listBackends();
    const usedPorts = new Set(backends.map((b) => b.port));

    // Also check running backends in case config ports changed
    for (const supervisor of this.runningBackends.values()) {
      usedPorts.add(supervisor.config.port);
    }

    let port = 8578;
    while (usedPorts.has(port)) {
      port++;
    }

    return port;
  }

  // ==========================================================================
  // DATA OPERATIONS (for Data Browser)
  // ==========================================================================

  /**
   * Query records with pagination, search, and filters
   * @param {string} id - Backend ID
   * @param {Object} options - Query options
   * @param {string} options.collection - Table/collection name
   * @param {number} [options.limit=50] - Max records to return
   * @param {number} [options.skip=0] - Records to skip (for pagination)
   * @param {Object} [options.where] - Filter conditions
   * @param {Array} [options.sort] - Sort order (e.g., ['-createdAt'])
   * @param {boolean} [options.count] - Include total count
   * @returns {Promise<{results: Object[], count?: number}>}
   */
  async queryRecords(id, options) {
    const supervisor = this.requireRunning(id, 'query records');

    const params = new URLSearchParams();
    params.set('limit', String(options.limit || 50));
    params.set('skip', String(options.skip || 0));
    if (options.where) params.set('where', JSON.stringify(options.where));
    if (options.sort) params.set('sort', JSON.stringify(options.sort));
    if (options.count) params.set('count', '1');

    const result = await supervisor.request('GET', `/api/${encodeURIComponent(options.collection)}?${params}`);
    return {
      results: result.results,
      count: options.count ? result.count : undefined
    };
  }

  /**
   * Stop all running backends (for cleanup on app exit)
   */
  async stopAll() {
    safeLog(`Stopping ${this.runningBackends.size} backends`);

    for (const [id, supervisor] of this.runningBackends) {
      try {
        await supervisor.stop();
        this.registry.forgetSpawn(id);
        safeLog(`Stopped backend: ${id}`);
      } catch (e) {
        // Deliberately NOT forgetting the record here: a stop that threw may
        // have left the child alive, and the record is the only thing that will
        // ever find it again.
        safeLog(`Error stopping backend ${id}:`, e);
      }
    }

    this.runningBackends.clear();
  }

  // ==========================================================================
  // WORKFLOW MANAGEMENT
  // ==========================================================================

  /**
   * Update/deploy a workflow to a backend
   * @param {string} backendId - Backend ID
   * @param {string} name - Workflow name
   * @param {Object} workflow - Workflow export data
   */
  async updateWorkflow(backendId, name, workflow) {
    const supervisor = this.requireRunning(backendId, 'update workflows');
    return supervisor.request('PUT', `/admin/workflows/${encodeURIComponent(name)}`, workflow);
  }

  /**
   * Get workflow status for a backend
   * @param {string} backendId - Backend ID
   */
  async getWorkflowStatus(backendId) {
    const supervisor = this.runningBackends.get(backendId);
    if (!supervisor || !supervisor.isRunning()) {
      return { initialized: false, workflowCount: 0, functions: [] };
    }
    return supervisor.request('GET', '/admin/workflows');
  }

  // ==========================================================================
  // WF-001 WORKFLOW DEFINITIONS (WFA-002) — run / cancel from the editor
  //
  // These proxy `/admin/workflow-defs*`, which shipped with WF-001 and, like
  // `backend:update-workflow` before WFA-001, had no editor caller: testing a
  // change meant round-tripping through `curl`. Read-and-run only — authoring
  // a definition is WFA-004's canvas.
  // ==========================================================================

  /**
   * Every running backend's workflow definitions, one entry per backend so the
   * caller can tell an empty backend from an unreachable one.
   * @returns {Promise<{backendId: string, backendName: string, workflows: unknown[], error?: string}[]>}
   */
  async listAllWorkflowDefs() {
    const running = this.getRunningEndpoints();
    return Promise.all(
      running.map(async ({ id, name }) => {
        try {
          const result = await this.runningBackends.get(id).request('GET', '/admin/workflow-defs');
          return { backendId: id, backendName: name, workflows: (result && result.workflows) || [] };
        } catch (e) {
          return { backendId: id, backendName: name, workflows: [], error: e.message };
        }
      })
    );
  }

  /**
   * Run a workflow definition now. The backend records it as a `manual`
   * execution, so the resulting run appears in execution history like any other.
   *
   * WFA-002: the route answers only when the run FINISHES, and every supervisor
   * request has a 30-second ceiling. A workflow with a `wait` step legitimately
   * outlives that — found live on a 5-minute wait, which surfaced as
   * `TimeoutError` and read as "the run failed" when the run was fine and still
   * going. A timeout here is therefore reported as `stillRunning`, not thrown:
   * the run is on the backend, its record is in history, and it can be
   * cancelled. Raising the ceiling would only move the lie further out.
   *
   * @param {string} backendId
   * @param {string} workflowId
   * @param {Object} [payload] - The run payload; `{}` when omitted.
   */
  async runWorkflowDef(backendId, workflowId, payload) {
    const supervisor = this.requireRunning(backendId, 'run a workflow');
    try {
      return await supervisor.request('POST', `/admin/workflow-defs/${encodeURIComponent(workflowId)}/run`, {
        payload: payload || {}
      });
    } catch (e) {
      if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        return { stillRunning: true };
      }
      throw e;
    }
  }

  /**
   * Cancel an in-flight run by its execution id.
   * @param {string} backendId
   * @param {string} executionId
   */
  async cancelWorkflowRun(backendId, executionId) {
    const supervisor = this.requireRunning(backendId, 'cancel a workflow run');
    return supervisor.request('POST', `/admin/workflow-runs/${encodeURIComponent(executionId)}/cancel`);
  }

  // ==========================================================================
  // WF-001 WORKFLOW DEFINITIONS (WFA-004) — the canvas's registry and save path
  // ==========================================================================

  /**
   * The step-kind catalog of ONE backend — the workflow canvas's node registry.
   *
   * Deliberately per-backend and never cached across backends: the whole reason
   * the registry is served rather than generated is that it cannot describe a
   * kind the backend you are targeting is unable to execute. A backend that is
   * not running has no catalog, and the canvas says so rather than falling back
   * to a bundled copy.
   *
   * @param {string} backendId
   */
  async getWorkflowStepKinds(backendId) {
    const supervisor = this.requireRunning(backendId, 'read the step-kind catalog');
    return supervisor.request('GET', '/admin/workflow-step-kinds');
  }

  /**
   * One workflow definition, in full. The list endpoint already returns whole
   * definitions, but the canvas re-reads the one it is opening so it renders
   * what the backend has right now rather than what a list fetched earlier said.
   *
   * @param {string} backendId
   * @param {string} workflowId
   */
  async getWorkflowDef(backendId, workflowId) {
    const supervisor = this.requireRunning(backendId, 'read a workflow');
    return supervisor.request('GET', `/admin/workflow-defs/${encodeURIComponent(workflowId)}`);
  }

  /**
   * Create or replace a workflow definition.
   *
   * `PUT` covers both: the registry's `upsert` creates when the id is unknown.
   * A definition the registry rejects comes back as a 400 whose body is the
   * validator's own error list, and `ServiceSupervisor.request` rethrows that
   * message — which is what the canvas shows. That matters more here than
   * elsewhere: an invalid definition on disk stops the backend booting, so the
   * only safe place for a bad definition to be refused is before it is written.
   *
   * @param {string} backendId
   * @param {Object} workflow - A WorkflowInput (id, name, entry, steps, ...)
   */
  async saveWorkflowDef(backendId, workflow) {
    const supervisor = this.requireRunning(backendId, 'save a workflow');
    if (workflow && workflow.id) {
      return supervisor.request('PUT', `/admin/workflow-defs/${encodeURIComponent(workflow.id)}`, workflow);
    }
    return supervisor.request('POST', '/admin/workflow-defs', workflow);
  }

  /**
   * @param {string} backendId
   * @param {string} workflowId
   */
  async deleteWorkflowDef(backendId, workflowId) {
    const supervisor = this.requireRunning(backendId, 'delete a workflow');
    return supervisor.request('DELETE', `/admin/workflow-defs/${encodeURIComponent(workflowId)}`);
  }

  /**
   * WFA-007 — would this backend accept this definition? (No write either way.)
   *
   * Used twice by the review surface, and the second use is the one that
   * matters: a PARTIAL accept produces a definition neither the agent nor the
   * user ever saw whole, and the authoritative validator sees it before disk
   * does. `{valid, errors}` — a rejection is a 200 with reasons, not a throw.
   *
   * @param {string} backendId
   * @param {Object} workflow - A WorkflowInput
   */
  async validateWorkflowDef(backendId, workflow) {
    const supervisor = this.requireRunning(backendId, 'validate a workflow');
    return supervisor.request('POST', '/admin/workflow-defs/validate', workflow);
  }

  /**
   * Every running backend's pending proposals, each stamped with the backend
   * that owns it.
   *
   * Scoped to RUNNING backends on purpose, even though the files are readable
   * whatever the backend is doing: reviewing a proposal needs the step-kind
   * catalog (to draw the cards) and the dry run (to know it would save), and
   * both come from a running backend. Listing a proposal that cannot be opened
   * would be the half-wired UI this phase keeps refusing to build.
   */
  async listAllWorkflowProposals() {
    const running = this.getRunningEndpoints();
    return Promise.all(
      running.map(async ({ id, name }) => {
        try {
          const proposals = await workflowProposals.listProposals(id, this.backendsPath);
          return { backendId: id, backendName: name, proposals };
        } catch (e) {
          return { backendId: id, backendName: name, proposals: [], error: e.message };
        }
      })
    );
  }
}

// Singleton instance
const backendManager = new BackendManager();

module.exports = {
  BackendManager,
  backendManager,
  setupBackendIPC: () => backendManager.setupIPC()
};
