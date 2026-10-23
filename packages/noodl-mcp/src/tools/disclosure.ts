/**
 * AWP-006 — progressive tool disclosure: the registry, and `find_tools`.
 *
 * The manifest in `../toolGroups` decides *what* is deferred and says why. This
 * file is the mechanism: it holds the SDK's handle for every registered tool,
 * disables the deferred ones at startup, and re-enables them when somebody asks
 * or when the graph says they are needed.
 *
 * ## How a tool comes back
 *
 * `RegisteredTool.enable()` flips the flag and the SDK emits
 * `notifications/tools/list_changed` — the protocol's own mechanism for exactly
 * this, and the reason nothing here has to invent a side channel. A client that
 * acts on the notification re-lists and sees the revealed tools on its next
 * turn.
 *
 * ⚠️ **A client that ignores the notification never sees them.** That is the one
 * way this trades a cost problem for a capability problem, so it is answered
 * twice: `find_tools`' response says it in the payload, and `--all-tools`
 * restores the whole surface up front in one flag. Neither is a substitute for
 * the other — the payload is for the model, the flag is for whoever configured
 * the client.
 *
 * ## Why the recording proxy
 *
 * The sixteen `register*Tools` functions call `server.registerTool` 89 times and
 * discard every return value. Threading a registry through all of them would
 * touch every file and every call site for no behavioural gain, so
 * {@link recordTools} wraps the server in an object that forwards
 * `registerTool` and keeps the handle. It forwards exactly one method because
 * exactly one is used — asserted by `tests/toolDisclosure.test.ts`, so a
 * registration that starts calling `server.resource()` fails rather than
 * silently escaping the registry.
 *
 * @module noodl-mcp/tools/disclosure
 */

import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getParseErrorMessage, normalizeObjectSchema, safeParseAsync } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { z } from 'zod';

import { clientRendersApps, markOpenStudioProxied } from '../clientApps';
import { callHint, clientProfile } from '../clientProfile';
import { ToolError } from '../errors';

import { backendRequirementFor } from '../editor-deps';
import {
  BOOTSTRAP_ADVERTISED,
  BOOTSTRAP_TOOLS,
  TOOL_GROUPS,
  deferredGroups,
  type DeferredGroupId,
  type ToolGroupId
} from '../toolGroups';
import type { FindToolsResponse } from './responses';
import { normalizeArguments } from './argumentAliases';
import { refusalHintFor, unknownArgumentKeys, unknownArgumentsRefusal } from './unknownArguments';
import { errorResult, guarded, jsonResult } from './util';

/** A node as it arrives at a write door: only its `type` matters here. */
export interface TypedNodeLike {
  type?: string;
}

/**
 * The registry, one per server.
 *
 * Deliberately per-server rather than module-level: the jest suite stands up
 * dozens of servers in one process, and a shared registry would let one spec's
 * `find_tools` call decide another spec's advertised surface.
 */
export class ToolDisclosure {
  private readonly handles = new Map<string, RegisteredTool>();
  private readonly revealed = new Set<ToolGroupId>(['core']);
  /** When false nothing is ever hidden — the `--all-tools` posture. */
  private deferring = true;

  /**
   * BST-001 — whether a project is bound.
   *
   * Read by both {@link applyPolicy} and {@link registerFindTools}: those two
   * have to agree about the mode, and a boolean passed to each separately is a
   * boolean that eventually disagrees with itself. Defaults to bound, so every
   * existing call site and every spec that constructs one keeps today's
   * behaviour.
   *
   * ⚠️ **BST-002 made it mutable**, and it is the only mutable thing about the
   * mode: `bindProject` flips it and re-derives everything that was decided
   * from it, rather than letting a second source of truth appear.
   */
  private bound: boolean;

  /**
   * What `--all-tools` asked for, which is **not** the same as what bootstrap
   * mode did with it.
   *
   * F72 — the flag is refused in bootstrap mode, because advertising 89 project
   * tools on a server with no project is that mode's whole failure in one flag.
   * But it must not be *forgotten*: at bind there is finally something to
   * change into, and a user who passed the flag for a client that ignores
   * `list_changed` still means it. So the request is remembered here and
   * honoured by {@link bindProject}.
   */
  private requestedDeferTools = true;

  /** Set by {@link registerFindTools} so a later bind can revise its description. */
  private describeForBoundMode: (() => string) | null = null;

  constructor(bound = true) {
    this.bound = bound;
  }

  /** No project: the surface is {@link BOOTSTRAP_TOOLS} and nothing can be revealed. */
  get isBootstrap(): boolean {
    return !this.bound;
  }

  /** Called by {@link recordTools} for every `registerTool`. */
  record(name: string, handle: RegisteredTool): void {
    this.handles.set(name, handle);
  }

  /**
   * BST-002 — how to describe `find_tools` once a project exists.
   *
   * Handed over by {@link registerFindTools} rather than duplicated here: the
   * paragraph is that module's, and the registry only needs to be able to ask
   * for it again at bind time.
   */
  useBoundDescription(describe: () => string): void {
    this.describeForBoundMode = describe;
  }

  /** P112-OWN018-LISTCHANGED — the SDK handle for a registered tool, advertised or not, for `call_tool`. */
  handleFor(name: string): RegisteredTool | undefined {
    return this.handles.get(name);
  }

  /** Every tool name this server registered, revealed or not. */
  registeredNames(): string[] {
    return [...this.handles.keys()];
  }

  /**
   * Hide the deferred groups. Called once, after every registration — the
   * handles do not all exist before then.
   */
  applyPolicy(options: { deferTools: boolean }): void {
    this.requestedDeferTools = options.deferTools;
    // BST-001 — the bootstrap surface is a policy applied here, at the one place
    // that already decides what is advertised, rather than sixteen conditional
    // registrations. `--all-tools` does NOT override it: that flag exists for a
    // client that ignores `list_changed`, and there is nothing to change into.
    // Advertising 89 project tools on a server with no project would be the
    // exact failure this mode exists to prevent, in one flag.
    if (this.isBootstrap) {
      this.deferring = true;
      this.revealed.clear();
      for (const [name, handle] of this.handles) {
        // 🔴 F87 — one list rather than a list plus a special case. The
        // `&& name !== 'find_tools'` this replaces was the whole reason the
        // served count and the advertised count could disagree.
        if (!BOOTSTRAP_ADVERTISED.includes(name)) handle.disable();
      }
      return;
    }
    this.deferring = options.deferTools;
    if (!options.deferTools) {
      for (const group of TOOL_GROUPS) this.revealed.add(group.id);
      return;
    }
    for (const group of deferredGroups()) {
      for (const name of group.tools) this.handles.get(name)?.disable();
    }
  }

  /**
   * BST-002 — leave bootstrap mode, and advertise what a bound server advertises.
   *
   * ⚠️ **The `find_tools` description is revised here, and this is the half that
   * gets missed.** That description is chosen from the mode *at registration*
   * ({@link registerFindTools}), so a server that binds mid-session would keep
   * advertising the bootstrap copy — which states, in the one place a model
   * looks to find out what else exists, that *"this tool cannot reveal them
   * here"*. Every other part of the bind would work and the door out of the
   * deferred set would be advertised as bolted shut. `RegisteredTool.update()`
   * is the mechanism, and it emits `list_changed` like everything else.
   *
   * ✅ That notification is acted on: measured 2026-08-11, Claude Code re-issues
   * `tools/list` 3ms after it. See `MEASUREMENTS-CLIENT-CONTRACT.md` §1.
   *
   * @returns the tool names that became advertised, so the caller can say what
   *   arrived rather than claiming a reveal it did not make.
   */
  bindProject(): string[] {
    if (this.bound) return [];
    this.bound = true;

    // Re-derive from the one flag, rather than adding a second policy path:
    // this is exactly what `applyPolicy` would have decided had the server
    // started bound, which is the property that keeps the two modes converging
    // instead of drifting.
    this.deferring = this.requestedDeferTools;
    const revealed: string[] = [];
    for (const group of TOOL_GROUPS) {
      if (!this.deferring || group.resident) {
        this.revealed.add(group.id);
        revealed.push(...this.enableAll(group.tools));
      }
    }

    // ⚠️ Last, and after the reveals: the description names the groups that are
    // still held back, so it must be built from the surface as it now is.
    const findTools = this.handles.get('find_tools');
    if (findTools && this.describeForBoundMode) {
      findTools.update({ description: this.describeForBoundMode() });
    }

    return revealed;
  }

  /** Enable named handles that are currently disabled, reporting only what changed. */
  /**
   * P125 CCN-001 s4 — every tool, from the first `tools/list`, bootstrap included.
   *
   * For a client that indexes a server's tools once, when the conversation starts, and loads them into the
   * model on demand (`clientLoadsToolsItself`): Claude Desktop. On such a host a later reveal is in the list and
   * not in the index — measured 2026-10-23, run 3: `open_studio` revealed, re-listed, and unreachable by name.
   * The bootstrap surface's reason (BST-001: do not offer 89 project tools on a server with no project) still
   * holds for a client that sees reveals; here it would hide, for the whole conversation, every tool the project
   * gets when it is created. An unbound project tool answers `no-project` with the way out, which that client
   * can read; a tool it cannot see, it cannot read. The deferral is turned off for the binding too, so
   * {@link bindProject} has nothing left to hide.
   */
  advertiseEverything(): string[] {
    this.requestedDeferTools = false;
    this.deferring = false;
    for (const group of TOOL_GROUPS) this.revealed.add(group.id);
    return this.enableAll([...this.handles.keys()]);
  }

  private enableAll(names: readonly string[]): string[] {
    const newly: string[] = [];
    for (const name of names) {
      const handle = this.handles.get(name);
      if (!handle || handle.enabled) continue;
      handle.enable();
      newly.push(name);
    }
    return newly;
  }

  isRevealed(group: ToolGroupId): boolean {
    return this.revealed.has(group);
  }

  /**
   * Reveal a whole group. Returns the names that were actually hidden, so a
   * caller can say "nothing changed" rather than claiming a reveal it did not
   * make — and so a repeat call is visibly a no-op instead of a second
   * `list_changed` storm.
   */
  revealGroup(id: ToolGroupId): string[] {
    const group = TOOL_GROUPS.find((g) => g.id === id);
    if (!group || this.isBootstrap || this.revealed.has(id)) return [];
    this.revealed.add(id);
    return this.revealNames(group.tools);
  }

  /** Reveal named tools without their whole group — what a `query` match gets. */
  revealNames(names: readonly string[]): string[] {
    // BST-001 — the bootstrap surface has no door out of it, and this is the
    // second half of saying so. Guarded here as well as in `revealGroup`
    // because this is the primitive: a future caller that reveals by name would
    // otherwise re-enable a project tool on a server with no project.
    if (this.isBootstrap) return [];
    return this.enableAll(names);
  }

  /**
   * AWP-006's answer to its own warning: the backend tools arrive because the
   * graph needs them, not because the model went looking.
   *
   * A `Record`, `User` or `Cloud Function` node in an authored graph is a
   * stronger statement of intent than any search query — and it is the exact
   * moment the phase-40 finding bites, where a graph with `Record` nodes and no
   * backend validates, builds, and then does nothing at run time. Keyed off
   * `backendRequirementFor`, the editor's reviewed table, so one classification
   * decides both the diagnostic and the disclosure.
   *
   * Returns the revealed names (empty when already revealed, or when the graph
   * needs nothing), which the write door reports back in its success payload.
   */
  revealForNodes(nodes: readonly TypedNodeLike[]): string[] {
    if (this.isRevealed('backend')) return [];
    const needs = nodes.some((n) => typeof n.type === 'string' && backendRequirementFor(n.type) !== undefined);
    return needs ? this.revealGroup('backend') : [];
  }

  /** For the payload: what is advertised, what is not, and how big each is. */
  groupStates(): FindToolsResponse['groups'] {
    return TOOL_GROUPS.map((group) => {
      const present = group.tools.filter((name) => this.handles.has(name));
      return {
        group: group.id,
        title: group.title,
        purpose: group.purpose,
        tools: present.length,
        advertised: !this.deferring || this.revealed.has(group.id)
      };
    }).filter((row) => row.tools > 0);
  }
}

/**
 * The recording wrapper. Structurally an `McpServer` as far as the registration
 * functions are concerned; the cast is narrow and the test pins the assumption.
 */
export function recordTools(server: McpServer, disclosure: ToolDisclosure): McpServer {
  const proxy = Object.create(server) as McpServer;
  proxy.registerTool = ((name: string, ...rest: unknown[]) => {
    const handle = (server.registerTool as (...a: unknown[]) => RegisteredTool)(name, ...rest);
    disclosure.record(name, handle);
    return handle;
  }) as McpServer['registerTool'];
  return proxy;
}

/**
 * The one line a revealed tool's caller needs and cannot work out for itself.
 *
 * Named rather than inlined because it is the same sentence in three payloads
 * and it is the sentence that saves a session: a model whose client did not
 * refresh will otherwise conclude the tool does not exist.
 */
function refreshNote(): string {
  // OWN-019 census #34: on a client whose list never changes (Vibe) "your next tool list" never comes, and the
  // restart exit was measured to change nothing (6 → 6) — so it says the one way that works.
  if (clientProfile().staticToolList) {
    return 'Your tool list will not change: call them through call_tool({ name, arguments }); call_tool({ name, describe: true }) shows a tool\'s arguments.';
  }
  return (
    'Revealed tools are advertised from your next tool list. If your client does not refresh tool lists on ' +
    'notifications/tools/list_changed, call them through call_tool (or restart the server with --all-tools).'
  );
}

/**
 * BST-001 — what `find_tools` says on a server with no project.
 *
 * ⚠️ **It must not offer what it cannot deliver.** The bound description ends
 * with "one call away", which is true there and a lie here: nothing this tool
 * can do brings the project surface back, because there is no project. So the
 * unbound copy states the surface, states the reason, and hands over the same
 * two exits the bootstrap briefing gives — which is the only useful thing it
 * has, and the reason it stays advertised at all rather than answering "unknown
 * tool".
 */
function bootstrapFindToolsDescription(): string {
  const surface =
    'This server has no project bound, so it advertises everything it currently has: ' +
    BOOTSTRAP_TOOLS.join(', ') +
    '. The rest of the server — reading and authoring components, validation, rendering, the backend — needs a ' +
    'project';
  const exits = 'Call list_projects to find a project that already exists, or create_project to make one.';
  // OWN-019 census #16. A client that lists tools once (Vibe) keeps THIS description all session — the bound one
  // swapped in at bind is never re-read — so it must stay true after the bind and name the door that works.
  if (clientProfile().staticToolList) {
    return (
      surface +
      '. ' +
      exits +
      ' Once one is open, call any of its tools through call_tool({ name, arguments }) — your tool list will not ' +
      'change — and find_tools({ query }) names them.'
    );
  }
  // "arrives when a server is started with a project directory" predates open_project (BST-002); census #16.
  return surface + ', and arrives once one is open. This tool cannot reveal them here. ' + exits;
}

/**
 * The bound-mode description.
 *
 * ⚠️ A function rather than a constant because BST-002 needs it **twice**: once
 * at registration on a server that started bound, and once at
 * {@link ToolDisclosure.bindProject} on a server that did not. Two spellings of
 * this paragraph would mean a mid-session bind advertising a subtly different
 * contract from a server started the ordinary way, and nothing would report it.
 */
export function boundFindToolsDescription(): string {
  // The description is the whole disclosure contract for a model that reads
  // nothing else, so it names each deferred group, its size and its subject.
  // Built from the manifest rather than written out, because a hand-written list
  // is exactly the thing that goes stale the first time a group changes.
  const catalogue = deferredGroups()
    .map((g) => `"${g.id}" (${g.tools.length} tools) — ${g.purpose}`)
    .join(' ');

  // P112-OWN018-LISTCHANGED — the fixed prose shortened (same contract) for `call_tool`'s resident slot.
  return (
    'Reveal tools held back from your tool list so they are not re-sent every turn: ' +
    catalogue +
    ' `group` reveals a whole group; `query` searches tool names and group subjects and reveals matches. ' +
    'Neither: the inventory.'
  );
}

export function registerFindTools(server: McpServer, disclosure: ToolDisclosure): void {
  const bootstrap = disclosure.isBootstrap;
  // 🔴 BST-002 — the description is chosen from the mode HERE, at registration,
  // which is why a server that binds mid-session has to revise it. Handing the
  // builder to the registry is what makes that possible without the registry
  // owning a second copy of the text.
  disclosure.useBoundDescription(boundFindToolsDescription);

  server.registerTool(
    'find_tools',
    {
      title: 'Find tools',
      description: bootstrap ? bootstrapFindToolsDescription() : boundFindToolsDescription(),
      inputSchema: {
        // 🔴 Derived from the manifest, not written out. Hand-listed, this enum
        // is a second statement of which groups exist — and it was already one
        // group stale the moment UNI-010 added `lesson`: `find_tools` advertised
        // the group in its own description and then rejected the argument that
        // reveals it, which is AWP-006's own failure mode ("a tool the model
        // cannot see is a capability the product does not have") reached from the
        // inside. The manifest is the one place the set is decided.
        group: z
          .enum(deferredGroups().map((g) => g.id) as [DeferredGroupId, ...DeferredGroupId[]])
          .optional()
          .describe('Reveal every tool in this group'),
        query: z.string().optional().describe('Free-text over tool names and group subjects, e.g. "roles" or "theme"')
      }
    },
    guarded((args: { group?: DeferredGroupId; query?: string }) => {
      // Unbound, both arguments are answered the same way, and the answer is not
      // an error: the call was reasonable, there is simply nothing behind it.
      // `groups` is empty rather than a list of groups reported `advertised:
      // false` — that shape reads as "ask again for one of these", which is the
      // turn this whole mode exists to save.
      if (disclosure.isBootstrap) {
        const payload: FindToolsResponse = { revealed: [], groups: [], note: bootstrapFindToolsDescription() };
        return jsonResult(payload);
      }
      const revealed: string[] = [];
      if (args.group) revealed.push(...disclosure.revealGroup(args.group));
      if (args.query) {
        const needle = args.query.toLowerCase().trim();
        if (needle.length > 0) {
          /**
           * DEF-006 (b) — a group is found by what it is *for*, not only by the
           * spelling of a tool inside it.
           *
           * This searched tool names alone, and the sentence two lines up in
           * this very tool's own description — "search names and descriptions
           * across everything" — and its `query` parameter's — "free-text over
           * tool names and titles" — were both already promising otherwise. The
           * code was the half that had drifted.
           *
           * What that cost, measured: the group titled **"Design tokens"**,
           * whose purpose is *"change the design system"*, holds the only two
           * tools that change how an app looks — and `theme`, `design`,
           * `colour`, `style guide` and `palette` all revealed **nothing**,
           * while `group: "theme"` revealed both. An agent instructed to style
           * on-system searches in the words it is thinking in and is told the
           * capability does not exist. That is a named contributing cause of
           * phase 78's D10, *the template generators bypass the design system*.
           *
           * 🔴 **Matched against the id, the title and the keywords — and
           * deliberately NOT the `purpose`.** A purpose is a sentence, and its
           * incidental nouns are the same words the tool names already carry:
           * `backend`'s says "collections, schema, roles, permissions", so
           * searching it would turn `query: "role"` — which reveals four tools
           * today — into all sixty, and `groupStates` would then report the
           * group advertised. That is the deferral undone by a synonym, and the
           * contract it breaks is a written one: *a partial reveal must not
           * claim the group is advertised, or a model has no reason to ever ask
           * for the rest of it* (`toolDisclosure.test.ts`). Ids, titles and
           * {@link ToolGroup.keywords} are short and chosen; the purpose is
           * prose, and prose matches everything eventually.
           *
           * A group match reveals the whole group rather than tools by name,
           * because matching a group's own title IS asking for the group — the
           * same request `group:` makes, arrived at in the words somebody
           * happened to have.
           */
          const before = revealed.length;
          for (const group of TOOL_GROUPS) {
            const haystack = [group.id, group.title, ...(group.keywords ?? [])].join(' ').toLowerCase();
            if (haystack.includes(needle)) revealed.push(...disclosure.revealGroup(group.id));
          }
          const matches = TOOL_GROUPS.flatMap((g) => g.tools).filter((name) => name.toLowerCase().includes(needle));
          revealed.push(...disclosure.revealNames(matches));
          if (revealed.length === before) revealed.push(...revealByWords(disclosure, needle));
        }
      }
      const payload: FindToolsResponse = {
        revealed,
        groups: disclosure.groupStates(),
        ...(revealed.length > 0 ? { note: refreshNote() } : {})
      };
      return jsonResult(payload);
    })
  );
}

/**
 * P109 S13-FINDTOOLSPHRASE — a query that found nothing as one phrase, tried word by word.
 *
 * A model searches in a sentence's worth of words ("project settings home title", "interact click type fill
 * test"): the phrase match above finds a query only when it is a substring of ONE haystack, so those revealed
 * nothing while each of their words names a group. Measured s13–s14 over the stdio door: two agents, two empty
 * searches, one recovered by browsing and one did not.
 *
 * 🔴 The DEF-006 (b) rule still holds — a widening must not reveal everything — so the words are held to three
 * limits: only after the phrase found nothing; only words of four letters or more, matched WHOLE against the
 * group's id, title and keywords and against the parts of its tool names (`set_project_settings` → set, project,
 * settings), never a substring and never the purpose; and a word found in three or more groups says nothing about
 * which one is meant, so it reveals none (measured s14 over the seven groups: `project`, `list`, `create`,
 * `export` — every other word of four letters is in one or two).
 */
function revealByWords(disclosure: ToolDisclosure, needle: string): string[] {
  const words = [...new Set(needle.split(/[^a-z0-9]+/).filter((w) => w.length >= 4))];
  if (words.length < 2) return [];
  const wordsOf = (text: string) => new Set(text.toLowerCase().split(/[^a-z0-9]+/));
  const groupWords = TOOL_GROUPS.map((g) => ({
    group: g,
    words: wordsOf([g.id, g.title, ...(g.keywords ?? [])].join(' ')),
    tools: g.tools.map((name) => ({ name, parts: wordsOf(name.replace(/_/g, ' ')) }))
  }));
  const revealed: string[] = [];
  for (const word of words) {
    const inGroups = groupWords.filter((g) => g.words.has(word) || g.tools.some((t) => t.parts.has(word)));
    if (inGroups.length === 0 || inGroups.length >= 3) continue;
    for (const g of inGroups) {
      if (g.words.has(word)) revealed.push(...disclosure.revealGroup(g.group.id));
      else revealed.push(...disclosure.revealNames(g.tools.filter((t) => t.parts.has(word)).map((t) => t.name)));
    }
  }
  return revealed;
}

/** The note a write door attaches when it revealed the backend group by itself. */
export function backendRevealPayload(revealed: readonly string[]): { backendToolsRevealed?: string } {
  if (revealed.length === 0) return {};
  return {
    backendToolsRevealed:
      (clientProfile().staticToolList
        ? `This graph has nodes that need a backend — call ${callHint('provision_backend')} before expecting ` +
          `those nodes to do anything at run time (the ${revealed.length} backend tools are all called that way). `
        : `This graph has nodes that need a backend, so the ${revealed.length} backend tools are now advertised — ` +
          'call provision_backend before expecting those nodes to do anything at run time. ') + refreshNote()
  };
}

/**
 * P112-OWN018-LISTCHANGED — `call_tool`, the door for a client that never re-reads the tool list.
 *
 * Measured 2026-10-12: Mistral Vibe 2.26.1 lists tools once per session, in both its harnesses. Started on a
 * bootstrap server it keeps the six bootstrap tools after `create_project` binds, and `--all-tools` changes nothing
 * there (6 → 6 before the bind, either way). Mistral Large 4 scoped and created the app, then spent ten turns looking
 * for tools it could not see. Every tool is registered at startup and only disabled ({@link ToolDisclosure}), so
 * the handle is here to call whether or not it is advertised.
 *
 * It runs the tool exactly as `tools/call` would — the tool's own input schema, then its own handler with the same
 * `extra` — so a result, a refusal and its diagnostics are the tool's, byte for byte. `describe: true` hands back
 * what `tools/list` would have said about it, because a client that never re-lists has never seen the schema.
 * Unbound, a project tool answers with `ProjectBinding`'s own no-project refusal, as a direct call would.
 *
 * 🔴 **A refusal comes back as an ANSWER, `{ ok: false, tool, error }`, never as `isError`.** P112-OWN018-OPAQUEERRORS:
 * Vibe's default harness replaces every `isError` result with "The MCP tool returned an error", so the diagnostics
 * that tell an agent what to fix never reach it. `call_tool` is the door those clients use, so its answer carries the
 * refusal in the one shape every client passes through. `ok: false` says it plainly; the tool's own payload follows.
 */
const CALL_TOOL_DESCRIPTION =
  "Run any of this server's tools by name, even one your list never showed. describe: true returns its " +
  'description and arguments instead; comma-separate names for several.';

export function registerCallTool(server: McpServer, disclosure: ToolDisclosure): void {
  server.registerTool(
    'call_tool',
    {
      title: 'Call a tool by name',
      description: CALL_TOOL_DESCRIPTION,
      inputSchema: {
        name: z.string(),
        arguments: z.record(z.unknown()).optional(),
        describe: z.boolean().optional()
      }
    },
    async (outer: { name: string; arguments?: Record<string, unknown>; describe?: boolean }, extra: unknown) => {
      // P112-OWN019-NESTEDCALLTOOL — Large 4 asks call_tool to call call_tool (o2: `{ name: "call_tool", arguments:
      // { name: "drive_page", describe: true } }`, six times, every one "no tool named call_tool"). That is the inner
      // call, one level deep.
      const inner = outer.name === 'call_tool' ? outer.arguments : undefined;
      const args =
        inner && typeof inner.name === 'string'
          ? {
              name: inner.name,
              arguments: inner.arguments as Record<string, unknown> | undefined,
              describe: inner.describe === true || outer.describe === true
            }
          : outer;
      try {
        // P112-OWN018-READWASTE — round 3's Mistral spent 26 calls describing one tool at a time; several at once.
        if (args.describe && args.name.includes(',')) {
          const names = [...new Set(args.name.split(',').map((n) => n.trim()).filter(Boolean))];
          const described = names.map((name) => {
            const h = name === 'call_tool' ? undefined : disclosure.handleFor(name);
            if (!h) return { name, error: 'no such tool' };
            const sch = h.inputSchema ? normalizeObjectSchema(h.inputSchema) ?? h.inputSchema : undefined;
            return {
              name,
              description: h.description ?? '',
              inputSchema: sch
                ? toJsonSchemaCompat(sch as Parameters<typeof toJsonSchemaCompat>[0], { strictUnions: true, pipeStrategy: 'input' })
                : { type: 'object', properties: {} }
            };
          });
          return jsonResult({ tools: described });
        }
        const handle = args.name === 'call_tool' ? undefined : disclosure.handleFor(args.name);
        if (!handle) {
          throw new ToolError(
            'not-found',
            `This server has no tool named "${args.name}". Its tools: ${disclosure
              .registeredNames()
              .filter((n) => n !== 'call_tool')
              .join(', ')}.`
          );
        }
        // Unbound, a project tool is NOT refused here: its own handler asks `ProjectBinding`, which owns the one
        // no-project refusal (BST-001, `projectBinding.test.ts`), so the answer is the one a direct call would get.
        //
        // P125 CCN-001 s3 — the ONE tool this door does not proxy, and only in a host that renders MCP Apps: a
        // panel is drawn for the tool the host sees being called, and through here the host sees `call_tool`.
        // Richard's second run (2026-10-23): 18 tools/call, 7 tools/list, 0 resources/read — Studio started, the
        // panel never fetched. So reveal it by name (the host re-lists on `list_changed`) and send the model to it.
        // s4: not refused — refused, the person got nothing (run 3: the model stopped and asked). The call goes
        // through, `open_studio` opens the browser instead of counting on a panel, and its note says to call it by
        // name next time.
        if (args.name === 'open_studio' && !args.describe && clientRendersApps(server)) {
          disclosure.revealNames(['open_studio']);
          markOpenStudioProxied();
        }
        const schema = handle.inputSchema ? normalizeObjectSchema(handle.inputSchema) ?? handle.inputSchema : undefined;
        const jsonSchema = (): { properties?: Record<string, unknown> } =>
          schema
            ? (toJsonSchemaCompat(schema as Parameters<typeof toJsonSchemaCompat>[0], {
                strictUnions: true,
                pipeStrategy: 'input'
              }) as { properties?: Record<string, unknown> })
            : { type: 'object', properties: {} } as { properties?: Record<string, unknown> };
        // P112-OWN019-DESCRIBEINSIDE — Q1 (s4) sent `{ name: "drive_page", arguments: { describe: true } }`: the
        // schema stripped the flag, it ran a dummy drive instead, then went looking for the step shapes outside its
        // folder and Vibe's approval prompt ended the sitting. A tool with no `describe` of its own means the flag.
        if (args.describe || (args.arguments?.describe === true && !('describe' in (jsonSchema().properties ?? {})))) {
          return jsonResult({ name: args.name, description: handle.description ?? '', inputSchema: jsonSchema() });
        }
        let parsed: unknown = undefined;
        if (schema) {
          // P112-OWN020-CALLTOOLSTRIP — the parse below strips a key the tool does not have, so the guard a direct
          // `tools/call` gets (P109-S12, `refuseUnknownArguments`) runs here too, in the same words. DeepSeek sent
          // `update_component` its wires as a top-level `connections` beside `set`: `updated`, 0 errors, no wires.
          // FIX-04 C — the same spellings a direct call is forgiven (`argumentAliases.ts`), before the same check.
          const sent = normalizeArguments(args.name, args.arguments ?? {}) as Record<string, unknown>;
          const unknown = unknownArgumentKeys(schema, sent);
          if (unknown.length > 0) {
            const hint = refusalHintFor(server, args.name, sent, unknown);
            const { error } = unknownArgumentsRefusal(args.name, schema, unknown, hint);
            throw new ToolError(error.code, error.message, error.details);
          }
          const result = await safeParseAsync(schema as Parameters<typeof safeParseAsync>[0], sent);
          if (!result.success) {
            throw new ToolError(
              'invalid-argument',
              `Arguments for ${args.name} don't match its schema: ${getParseErrorMessage(
                (result as { error: unknown }).error as Parameters<typeof getParseErrorMessage>[0]
              )}. call_tool with describe: true returns the schema.`
            );
          }
          parsed = (result as { data: unknown }).data;
        }
        const handler = handle.handler as unknown as (...a: unknown[]) => unknown;
        const result = (await (schema ? handler(parsed, extra) : handler(extra))) as ReturnType<typeof jsonResult>;
        return result.isError ? asAnswer(args.name, result) : result;
      } catch (err) {
        const refusal = err instanceof ToolError ? err : new ToolError('io-error', `Unexpected failure: ${(err as Error).message}`);
        return asAnswer(args.name, errorResult(refusal));
      }
    }
  );
}

/** A refused call as an answer: `{ ok: false, tool, ...the refusal's own payload }` (see {@link registerCallTool}). */
function asAnswer(tool: string, refused: ReturnType<typeof jsonResult>): ReturnType<typeof jsonResult> {
  const text = (refused.content ?? [])
    .map((c) => ('text' in c && typeof c.text === 'string' ? c.text : ''))
    .join('\n');
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    payload = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { message: text };
  } catch {
    payload = { message: text };
  }
  return jsonResult({ ok: false, tool, ...payload });
}

