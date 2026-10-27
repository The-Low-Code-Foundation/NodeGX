/**
 * Server assembly: wires the tool groups onto an McpServer over a ProjectStore.
 * Write tools are registered only when writes were explicitly opted into —
 * read-only is the default posture (SUB-008 requirement).
 *
 * ## BST-001 — the project is optional
 *
 * `options.projectDir` may be absent, and then the server starts anyway with the
 * bootstrap surface: the handful of tools that need no project, and a briefing written for
 * an agent that has not got one. The store is held behind a {@link
 * ProjectBinding} rather than constructed here, and **every registration below
 * runs in both modes** — see that module for why sixteen conditionals would have
 * been the wrong shape.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { setClientProfile, type ClientProfileName } from './clientProfile';
import { bootstrapInstructions, projectInstructions } from './instructions';
import { ToolError } from './errors';
import { installProjectOverlay } from './kitOverlay';
import { ProjectBinding } from './project/ProjectBinding';
import { createExampleBudget } from './tools/attachments';
import { RenderLedger } from './renderVerdict';
import { registerAuthorTools } from './tools/author';
import { createPlanRegistry, registerPlanTools } from './tools/planTools';
import { registerBackendReadTools, registerBackendWriteTools } from './tools/backendTools';
import { registerWorldReadTools, registerWorldWriteTools } from './tools/worldTools';
import { registerCatalogTools } from './tools/catalogTools';
import { registerDocsReadTools, registerDocsWriteTools } from './tools/docsTools';
import { registerScriptReadTools, registerScriptWriteTools } from './tools/scriptTools';
import { registerImportReportTool } from './tools/importReportTool';
import { registerReadTools } from './tools/read';
import { registerRenderTools } from './tools/renderTools';
import { registerStyleReadTools, registerStyleWriteTools } from './tools/styleTools';
import { registerElementStyleTools } from './tools/elementStyles';
import { registerValidateTools } from './tools/validateTools';
import { registerCreateProjectTools } from './tools/createProject';
import { registerOpenProjectTools } from './tools/openProject';
import { registerProvisionTools } from './tools/provisionTools';
import { registerDeployToVmTools } from './tools/deployToVm';
import { registerReviewTools } from './tools/review';
import { registerListProjectsTools, scanFolderProjects } from './tools/listProjects';
import { registerExportReactTools } from './tools/exportReact';
import { registerOpenInEditorTools } from './tools/openInEditor';
import { registerMiniEditorTools } from './tools/miniEditor';
import { registerOpenStudioTools } from './tools/openStudio';
import { holdGate } from './hold';
import { clientLoadsToolsItself, clientRendersApps } from './clientApps';
import type { StudioProxy } from './studio/studioProxy';
import { registerSessionStatusTools } from './tools/sessionStatus';
import { registerWhatChangedTools } from './tools/whatChanged';
import { registerKitTools } from './tools/kitTools';
import { registerProjectSettingsTools } from './tools/projectSettingsTools';
import { registerLibraryTools } from './tools/libraryTools';
import { registerLessonTools } from './tools/lessonTools';
import { ToolDisclosure, recordTools, registerCallTool, registerFindTools } from './tools/disclosure';
import { refuseUnknownArguments } from './tools/unknownArguments';
import type { ReproducibleOutput } from './project/writeClock';

/**
 * The version this server reports in its MCP handshake.
 *
 * 🔴 **It used to be `@nodegx/mcp`'s own `package.json` version, which has read `0.1.0` in every
 * release ever cut.** So the handshake said `noodl-mcp 0.1.0` whether the bundle came from 0.1.0
 * or 0.2.4, and "my MCP server is stuck on an old version" was a report nobody — user or
 * maintainer — could confirm or refute. The bundle carries no other version marker either: the
 * packaged directory holds the `.cjs` and a catalog, and no `package.json` at all.
 *
 * `build.mjs` now defines `__NODEGX_APP_VERSION__` from `noodl-editor`'s version at bundle time,
 * so the server reports the release it shipped inside. That cannot drift, because nobody has to
 * remember to bump it. A build for npm (`prepack`) reports `@nodegx/mcp`'s own version instead, the one
 * `--version` prints (NPMAUDIT-SERVERINFO, `build-common.mjs` `reportedVersion`).
 *
 * ⚠️ `typeof` rather than a bare reference on purpose: under ts-jest and `npx tsx` the identifier
 * is genuinely undeclared, and `typeof` on an undeclared name is the one form that does not throw.
 * The `package.json` fallback is what a source run reports, and is why this is not a build-only
 * constant.
 */
declare const __NODEGX_APP_VERSION__: string | undefined;

const PKG_VERSION: string =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  typeof __NODEGX_APP_VERSION__ === 'string' ? __NODEGX_APP_VERSION__ : require('../package.json').version;

export interface ServerOptions {
  /**
   * BST-001 — absent means **unbound**: the server starts with the bootstrap
   * surface and no store, which is the only way `create_project` was ever
   * reachable from a machine that has no projects yet.
   */
  projectDir?: string;
  /**
   * P125 CCN-001 s7 — the loopback origin Studio's panel is served through, started by the CLI before this server
   * is built so the MCP App resource can name it from the first read (`studio/studioProxy.ts`). Absent (every
   * test, a library caller), the resource is served from the running Studio as before.
   */
  studioProxy?: StudioProxy;
  allowWrites: boolean;
  /**
   * AWP-006 — advertise the authoring set and hold the rest behind `find_tools`.
   * Defaults to true; `--all-tools` turns it off, which is the pre-AWP-006
   * surface exactly.
   */
  deferTools?: boolean;
  /**
   * P109 ISL-019 — reproducible output, chosen by whoever starts the server (a template
   * generator, CI): component ids from this namespace and every stamp the epoch. Absent, ids are
   * still derived (from the project's own id) and stamps are the wall clock. Never a tool
   * parameter: the model does not choose it.
   */
  reproducible?: ReproducibleOutput;
  /**
   * P112 OWN-018 s2 — screenshots go to files unless the caller asks otherwise: `render_report` with no `out_dir`
   * writes into `<project>/.previews/render` and returns the manifest instead of inline images, and `drive_page`
   * screenshot steps default to `<project>/.previews/drive`. Chosen by whoever starts the server (create-nodegx sets
   * it for OpenCode and Mistral Vibe), never by the model. Measured on Mistral Large 4 (P112-OWN018-IMAGECACHE):
   * one image part anywhere in a request turns its prompt cache off, so an inline screenshot made every later step
   * of a session full price until a compaction dropped it. Claude caches across images, so `.mcp.json` leaves it off.
   */
  screenshotsToFiles?: boolean;
  /**
   * P112 OWN-019 — which client the agent-facing text is worded for (`clientProfile.ts`). Set by whoever starts the
   * server (`--profile vibe` from the Vibe kit), never by the model; `undefined` is the default (Claude Code's).
   */
  profile?: ClientProfileName;
  /**
   * P112-OWN023-RESUMEUNBOUND — the folder the client started this server in (the CLI passes its cwd). Unbound, the
   * projects in it (`scanFolderProjects`) are named in the briefing, so a resumed session finds the app its last
   * conversation built. Absent (every test, a library caller), nothing is scanned.
   */
  startFolder?: string;
}

export interface CreatedServer {
  server: McpServer;
  /**
   * BST-001 — the store, or the reason there isn't one. Replaces the `store`
   * this used to return: a `ProjectStore | null` would have pushed the same
   * check into every caller, which is the shape this class exists to avoid.
   */
  binding: ProjectBinding;
  /** AWP-006 — exposed so a caller (and the suite) can see the served surface. */
  disclosure: ToolDisclosure;
}

export function createServer(options: ServerOptions): CreatedServer {
  setClientProfile(options.profile);
  // ⚠️ BST-001 §4 — `create_project` is registered inside the write gate below,
  // so an unbound read-only server has nothing in it at all: it would start,
  // appear connected in the client's MCP panel, advertise three listing tools
  // and be unable to do the one thing this mode exists for. Refused at startup
  // instead, naming the flag, because a refusal in the client's status line is
  // somewhere a person can see it.
  if (options.projectDir === undefined && !options.allowWrites) {
    throw new ToolError(
      'invalid-argument',
      'Starting with no project directory needs --allow-writes: with no project there is nothing to read, and ' +
        'creating one is a write. Add --allow-writes, or pass a project directory.'
    );
  }

  const binding = new ProjectBinding(options.projectDir, { reproducible: options.reproducible }); // throws early on non-v2 targets
  const deferTools = options.deferTools !== false;
  const store = binding.peek();

  // ✅ CN-003 — the project catalog overlay, installed once, here, before any
  // tool can be called.
  //
  // It is done eagerly rather than on first catalog access for two reasons. A
  // lazy build would run inside whichever tool happened to ask first and charge
  // that call ~135 ms for a reason its caller cannot see; and a kit that fails
  // to load would surface as an oddity inside an unrelated tool result instead
  // of at the one moment a person is looking at the server starting.
  //
  // 🔴 It never throws. `extractProjectOverlay` converts every failure into an
  // `unavailable` reason on an empty overlay, and `get_project_info` reports it
  // — because a server that answers "this project has no custom node types"
  // when it simply could not read them is the CN-002 defect one layer down.
  if (store !== null) installProjectOverlay(store.projectDir);

  const server = new McpServer(
    { name: 'noodl-mcp', version: PKG_VERSION },
    {
      // BST-006 — both briefings live in `./instructions`, because this string
      // is sent exactly once per session and can never be revised afterwards:
      // MCP has no "instructions changed" notification. See that module.
      instructions:
        store === null
          ? bootstrapInstructions(options.startFolder === undefined ? [] : scanFolderProjects(options.startFolder))
          : projectInstructions({ projectDir: store.projectDir, allowWrites: options.allowWrites, deferTools })
    }
  );

  // P109-S12 — a key no tool declares is refused by name before any handler runs (zod would strip it without a word).
  refuseUnknownArguments(server);


  // AWP-006 — every registration below goes through the recorder, which keeps
  // the SDK's handle so a group can be hidden at startup and revealed later.
  // The recorder forwards `registerTool` and nothing else, because that is the
  // only method these functions use; `tests/toolDisclosure.test.ts` asserts the
  // manifest and the recorded set are the same, so a tool that escapes it fails
  // the suite rather than becoming permanently unhideable.
  //
  // BST-001 — the recorder is also what makes the bootstrap surface possible:
  // registration is unconditional in both modes and the *policy* decides what is
  // advertised, so binding a project later (BST-002) never has to re-register
  // anything.
  // VIB-007 M1 — one ledger per server, beside the plan registry and for the
  // same reason: two servers in one process (which is every test file in this
  // suite) must not be able to certify each other's projects.
  const renderLedger = new RenderLedger();

  const disclosure = new ToolDisclosure(binding.isBound);
  // P125 CCN-001 s6 — every tool registered below is held while the person's `.nodegx-hold.json` is in the
  // project, reads included: HOLD means stop (`hold.ts`, `HOLD_EXEMPT` for the four that let the agent see it).
  const rec = holdGate(recordTools(server, disclosure), binding);

  // P125 CCN-001 s3/s4 — at `initialize`: one stderr line naming the client and what it can render (Claude Desktop
  // keeps a server's stderr in ~/Library/Logs/Claude/mcp-server-<name>.log and logs no request params, so this is
  // the only record on disk of whether the host declared MCP Apps), and for a client that indexes tools once
  // (Claude Desktop), everything advertised before its first `tools/list` — see `clientApps.ts`. It fires before
  // that list (measured: the line precedes `tools/list id=1`), and again if a second client initialises on the
  // same transport (Desktop's `local-agent-mode-*` does); the reveal is idempotent.
  server.server.oninitialized = () => {
    const who = server.server.getClientVersion();
    const loadsItself = clientLoadsToolsItself(server);
    const advertised = loadsItself ? disclosure.advertiseEverything() : [];
    process.stderr.write(
      `noodl-mcp: client ${who ? `${who.name} ${who.version}` : 'unknown'}; renders MCP Apps: ` +
        `${clientRendersApps(server) ? 'yes' : 'no'}; loads tools itself: ${loadsItself ? 'yes' : 'no'}` +
        (advertised.length > 0 ? ` (${advertised.length} more tools advertised from the first list)` : '') +
        `; capabilities ${JSON.stringify(server.server.getClientCapabilities() ?? {})}\n`
    );
  };

  // ⚠️ BST-001 — every call below passes the **binding**, not a store. The
  // handlers dereference it per request; a registration function that resolved
  // it here would capture the unbound state for the life of the process.
  registerReadTools(rec, binding, { allowWrites: options.allowWrites });
  // LIB-006. Read-only and always registered: knowing what an import could not
  // convert is useful long before anyone is allowed to change anything.
  registerImportReportTool(rec, binding);
  registerCatalogTools(rec);
  registerValidateTools(rec, binding, renderLedger);
  registerStyleReadTools(rec, binding);
  registerDocsReadTools(rec, binding);
  // P109 ISL-005 — the project's script files. Deferred (the `project` group): 0 resident tokens.
  registerScriptReadTools(rec, binding);
  registerBackendReadTools(rec);
  registerWorldReadTools(rec, binding);
  // AIX-010 — read-only: assembles the docs-retrofit context. The caller drafts
  // and writes back through write_project_doc.
  registerReviewTools(rec, binding);
  // LAS-005 — read-only and unconditional, the same posture as the rest of the
  // read surface: rendering a project changes nothing about it, and a read-only
  // server is exactly where "is this page actually right?" gets asked.
  registerRenderTools(rec, binding, renderLedger, { screenshotsToFiles: options.screenshotsToFiles === true });
  // BST-006. Takes no store, like `create_project`: it reads the launcher's own
  // recent-projects file, which is machine state rather than project state. That
  // is what makes it answerable on a server with nothing bound — and it is the
  // call that stops an agent building a second copy of an app that exists.
  //
  // FIX-008 D — it takes the binding now, and only to decide what to say next.
  // Its note used to end "start a server with its directory as the argument",
  // which is true on a bound server and obsolete on an unbound one, where
  // `open_project` does it in a call. Passing the binding is what stops the
  // sentence being right for one of the two servers it ships in.
  registerListProjectsTools(rec, binding);
  // HLS-009. Takes neither a store nor the binding, for the same reason `list_projects` takes no
  // store: its subject is the editor process, not this server's project. Registered in both modes
  // — a read-only server is exactly the one an agent is using to *look* at a project, which is
  // when "put it on screen for me" is asked. It is deferred (the `project` group), so it costs
  // nothing resident; see the manifest note for why that placement and not a resident one.
  registerOpenInEditorTools(rec);
  // P125 CCN-001 — Studio beside the conversation. Both modes, like `open_in_editor` and for the same reason: a
  // person watching is a read-only server's whole point. The resource goes on `server` itself (the recorder
  // forwards `registerTool` only); the tool goes through `rec` like every other.
  registerOpenStudioTools(rec, server, binding, options.studioProxy);
  // P125 CCN-008 — the mini editor: one part of the app for the person to decide about, the other tool that draws a
  // panel. Both modes, like `open_studio`: the person's changes go through the proxy, never this server's write gate.
  registerMiniEditorTools(rec, server, binding, options.studioProxy);
  // FLD-010. Beside HLS-009 because it is the same transport and the same subject — the editor
  // process, not this server's project — and registered in both modes for a stronger reason than
  // `open_in_editor`'s: on a read-only server this is pure observation, and on a read-write one it
  // is the call that stops an agent writing over somebody. Appended to the same deferred `project`
  // group, so it costs **0** resident tokens; see the manifest note. Resident was not available at
  // any price — the surface had 8 tokens of headroom and a resident tool costs its whole schema.
  // P125 CCN-002 — it takes the binding now, for one fact: the person's hold on the bound project (`hold`).
  registerSessionStatusTools(rec, binding);
  // P125 CCN-002 — the read that follows a hold or a drift refusal: what the person changed since this agent last
  // read each component. Both modes (it is a read), in the deferred `explore` group: 0 resident tokens.
  registerWhatChangedTools(rec, binding);
  // HLS-008. Registered in BOTH modes, deliberately, and it is worth saying why on a server
  // started `--read-only`: an export writes to a folder the caller names, outside the project, and
  // reads the project without touching it. The flag protects the *project* from an agent, and
  // refusing to export one would protect nothing. `checkTarget` is what keeps that true — a target
  // inside the project is refused whatever mode this server is in.
  registerExportReactTools(rec, binding);
  // LBR-008 — the shelf. The reads are registered in both modes (browsing what
  // could be installed changes nothing); `install_prefab` registers itself only
  // when `allowWrites` says so, which is what keeps WRITE_ONLY_TOOLS honest.
  registerLibraryTools(rec, binding, { allowWrites: options.allowWrites });
  // AWP-006 — resident in both modes. A read-only server defers the docs and
  // backend *read* tools too, so the door out of the deferred set cannot be
  // behind the write flag.
  registerFindTools(rec, disclosure);
  // P112-OWN018-LISTCHANGED — resident in every mode: the door for a client that never re-reads the tool list.
  registerCallTool(rec, disclosure);
  if (options.allowWrites) {
    // LAS-006 §4 — one plan registry, shared by the two write groups that both
    // have an opinion about it: the plan tools own the plans, and
    // `create_component` needs only to know whether any exist.
    const planRegistry = createPlanRegistry();
    // LAS-007 §1 — one example budget per server process, so the first
    // rejection of a code carries the recipe and the fifth carries its id. A
    // repair loop must not be re-sent the same fragment every turn.
    const exampleBudget = createExampleBudget();
    registerAuthorTools(rec, binding, planRegistry, exampleBudget, renderLedger, disclosure);
    registerPlanTools(rec, binding, planRegistry, exampleBudget, renderLedger, disclosure);
    registerStyleWriteTools(rec, binding);
    registerElementStyleTools(rec, binding);
    registerDocsWriteTools(rec, binding);
    registerScriptWriteTools(rec, binding);
    registerBackendWriteTools(rec, binding);
    registerWorldWriteTools(rec, binding);
    // AAQ-011/F13. Write-gated, and it is the strongest write in the server: it
    // starts a process and creates a database. Read-only callers get the
    // diagnosis (checkBackendRequirements says a graph needs a backend) without
    // the ability to act on it, which is the same posture as everything else.
    registerProvisionTools(rec, binding);
    // P26 DEP-002 s4 — the app on a server the person owns. Write-gated for the reason `provision_backend` is, and
    // more so: it installs and restarts a service on another machine. In the deferred `project` group beside
    // `export_react` (0 resident tokens); the door is the keywords 'deploy', 'ship', 'host', 'server', 'vm'.
    registerDeployToVmTools(rec, binding);
    // AIX-012. Takes no store: it creates a project at a directory the caller
    // names, which is by definition not the one this server is pointed at.
    //
    // BST-001 — that property is what this whole mode stands on, and it was
    // already true and already commented here before anyone could reach it: the
    // capability was store-independent, and unreachable, because the store was
    // built two lines before the first registration and threw.
    //
    // BST-002 — and it is the one registration that also takes the binding and
    // the disclosure registry, which is the shape `registerAuthorTools` and
    // `registerPlanTools` above already use. `create_project` is the only tool
    // that can turn an unbound server into a bound one, so it is the only one
    // that needs to be able to write to either.
    registerCreateProjectTools(rec, { binding, disclosure, deferTools });
    // FIX-008 D — the other door into a bound server, and the one BST-002 left
    // unbuilt: `create_project` binds a project it wrote, this binds one that
    // was already there. Same `CreateProjectBinding`, deliberately — they share
    // `completeBind`, so a bind through either door has the same side effects.
    registerOpenProjectTools(rec, { binding, disclosure, deferTools });
    // UNI-010. Takes no store, for the same reason `create_project` does not: a
    // lesson bundle is assembled out of two project directories the caller names,
    // and neither of them is the one this server is pointed at. It writes a
    // folder on disk and never the editor's launcher state (D5).
    registerLessonTools(rec);
    // CN-006. Takes the binding: unlike `create_lesson`, a kit is written INTO
    // the project this server is pointed at, which is also why it is refused
    // outright on an unbound server rather than asking for a directory.
    registerKitTools(rec, binding);
    // P109 ISL-016 — the project file's name, settings and home. Takes the binding: it writes
    // into the project this server is pointed at.
    registerProjectSettingsTools(rec, binding);
  }
  // AWP-006 — last, and it has to be: the handles do not all exist until every
  // registration has run, and disabling a group before its tools are registered
  // would silently hide nothing.
  disclosure.applyPolicy({ deferTools });
  return { server, binding, disclosure };
}
