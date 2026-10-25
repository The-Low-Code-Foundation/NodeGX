/**
 * BST-006 — everything this server says before any tool is called.
 *
 * There are two briefings and they are for two different readers, so they live
 * side by side here rather than inline at the one place that happens to send
 * them. The standing rule from phase 60 (SIG-001/002/004, `portCopy.ts`): copy a
 * measurement depends on goes in one module, where it can be diffed, quoted and
 * asserted against.
 *
 * ## ⚠️ One string, sent once, and it cannot be revised
 *
 * `instructions` is a constructor argument on `McpServer` and part of the
 * `initialize` result. **MCP has no "instructions changed" notification.**
 * Whatever an unbound server says is what that session has for its whole life —
 * including after a later bind. That single fact is why {@link
 * BOOTSTRAP_INSTRUCTIONS} does not attempt {@link projectInstructions}' subject
 * matter: those paragraphs are long, specific and about authoring components
 * into a project, and sent to an agent holding four tools they are noise. They
 * travel in a tool result when a project actually exists.
 *
 * ## Three consumers, one source
 *
 * | Consumer | Takes |
 * |---|---|
 * | `createServer`, unbound | {@link BOOTSTRAP_INSTRUCTIONS} |
 * | `createServer`, bound | {@link projectInstructions} |
 * | a later bind result (BST-002) | {@link projectInstructions} |
 *
 * That third row is why this module exists at all before BST-002 does: "the bind
 * result must not duplicate the briefing" is only assertable when there is one
 * exported string to compare against.
 *
 * @module noodl-mcp/instructions
 */

import { clientProfile, staticToolListRule } from './clientProfile';
import { BOOTSTRAP_ADVERTISED, spellCount, TOOL_GROUPS } from './toolGroups';

/** OWN-019 census #14: this said 60 while `find_tools` counted 65 — counted from the group now. */
const BACKEND_TOOL_COUNT = TOOL_GROUPS.find((g) => g.id === 'backend')?.tools.length ?? 0;

export interface ProjectInstructionOptions {
  /** Absolute path of the served project. Interpolated into the first clause. */
  projectDir: string;
  allowWrites: boolean;
  /** AWP-006 — whether the backend group is held behind `find_tools`. */
  deferTools: boolean;
}

/**
 * The bound briefing, for a server pointed at a project.
 *
 * ⚠️ **Every paragraph below answers a measured failure and the comment above it
 * is the only record of which one.** They were moved here verbatim from
 * `server.ts` by BST-006; `tests/instructions.test.ts` pins the result character
 * for character against a fixture captured before the move, because measured
 * behaviour depends on this text and a "harmless" rewording is how that gets
 * lost. A paragraph whose reason is lost is a paragraph somebody trims.
 */
export function projectInstructions(options: ProjectInstructionOptions): string {
  const { projectDir, allowWrites, deferTools } = options;
  const { staticToolList, imagesCostly } = clientProfile();
  return (
    staticToolListRule() +
    `NodeGX (OpenNoodl) project server for ${projectDir} — mode: ` +
    (allowWrites ? 'read-write' : 'read-only (writes require restarting with --allow-writes)') +
    // TVW-009 §2.5 — 🔴 the identifier clause that stood here was the SAME FACT this
    // briefing already sends a model to fetch. `get_project_info`'s `note` carries it
    // near-verbatim (`tools/read.ts`), and the sentence immediately before this one tells
    // the agent to call that tool FIRST. One fact, stated twice, in a surface that is
    // billed once per session for the resident copy and nothing at all for the result one.
    //
    // Filed as P77 D48 with a measured estimate of ~39 tokens, owner NONE, since
    // 2026-09-02. TVW-009's lane sentence below costs 23 and the surface had 6 free, so
    // this is the funding rather than a third renegotiation of SURFACE_TOKEN_BUDGET —
    // which `toolDisclosure.test.ts`'s own header says there must not be. The division
    // that works, from SBR-013: `instructions` carries the ORDER, and the free channel
    // (a tool's RESULT) carries the detail.
    '. Start with get_project_info. ' +
    // LAS-006 §4. The order was the finding: both measured models planned
    // correctly and then built something the plan never described, because
    // nothing in the tool shape asked for the tree first. This paragraph now
    // states the order as the workflow, and names the two primitives nobody
    // finds — haiku found neither `Static Data` nor `Component Inputs` in 42
    // turns; sonnet needed 75 exploration calls to find both.
    //
    // 🔴 SBR-013. LAS-006's order started at the component tree, and phase 77 is
    // what that costs: eighteen honest tasks produced a template nobody would
    // ship, because the look and the screen list were decided AFTER the graphs
    // that had to carry them, one component at a time. `get_style_vocabulary`
    // used to be named only in the per-component sentence below — a step inside
    // authoring rather than a step before it — so a model met the design system
    // for the first time while writing its first leaf. It now leads the order,
    // and the sentence below no longer names it, which is why this paragraph is
    // SIX CHARACTERS SHORTER than the one it replaces rather than longer: the
    // resident surface had **6 tokens of headroom** (measured 8,274/8,280) and
    // an ordering change must not be the thing that spends them. The rule's
    // reasons, and the deferred `theme` tools that actually SET the identity,
    // ride in `get_project_info`'s `designDoctrine` — a result field, outside
    // this budget entirely. See `dev-docs/.../SBR-013-THE-DOCTRINE-RULE.md`.
    'THE ORDER, FOR ANYTHING BIGGER THAN A TWO-NODE FIX: the LOOK FIRST (get_style_vocabulary), then the ' +
    'SCREEN LIST, then the component tree with create_plan — ' +
    'one operation per component, and on every component another one will place, fill its `inputs` with the ' +
    'port names the instances will set (and `repeats` where it draws a row per item). Then author leaves, ' +
    'then the sections that place them, then the page. A component\'s interface is a `Component Inputs` node ' +
    'whose ports are plugged "output" — that is the ONLY thing that makes an instance parameter arrive, and ' +
    'a component without one renders identically however many times you place it. Inline row data is a ' +
    '`Static Data` node (a JSON array), fed to a `For Each`. Both are easy to miss and there is no ' +
    'substitute for either. ' +
    'When authoring one component: read the parent/pattern component, fetch the node types you need with ' +
    // 🔴 SBR-013 — `get_style_vocabulary` moved OUT of this sentence and into
    // THE ORDER above. It was the only mention, and reading the design system
    // as a per-component step is component-first doctrine stated as a workflow:
    // whichever leaf happened to be authored first chose the look for the app.
    // The rule it carried — token, never a literal — stays here, because it is
    // a rule about the parameter you are about to write.
    'get_node_type, set colour/spacing params as "var(--token)" and never raw hex/px, then ' +
    'create_component / update_component — every write is ' +
    'validated and rejections return diagnostics with suggested fixes. ' +
    // FIX-014. The only placement guidance anywhere in the product was one
    // editor prompt line specifying, in effect, a single column — this server
    // said nothing at all, and models piled visual and logic nodes together.
    // One sentence, the same two-family rule the shared layout pass enforces.
    'LAYOUT: the visual tree flows down a left column, logic nodes in a right column beside the visual ' +
    'node they feed; nodes sent without x/y are auto-placed; x/y you set are kept verbatim. ' +
    // TVW-009 §2.5. FIX-014's sentence reads as a rule about where the visual stack must
    // GO, and TVW-006 built a lane that finds the stack wherever it already is. An agent
    // that believes the column is mandatory will move a graph to satisfy it — so the
    // sentence says which of the two is the default and which is the mechanism.
    'The editor draws a structure lane around the visual stack wherever it is; the column is a default, ' +
    'not a rule. ' +
    // AAQ-005. The word "Router" appeared nowhere in any guidance a model
    // saw, which is why pages were built that nothing could reach and
    // navigation was aimed at invented URL paths. Both halves are stated:
    // what makes a page a page, and what this server does about it, so an
    // agent neither omits the registration nor writes a competing one.
    'PAGES: a page is only reachable if a Router node lists it in its `pages` parameter, and it ' +
    'renders blank without a `Page` node at its root — so build pages around a `Page` node, and ' +
    'aim RouterNavigate.target at a component legacyName ("/Pages/Home"), never at an invented URL path. ' +
    'Writing a page registers it in the project router for you (reported as `registeredPages`); you do not ' +
    'need to edit the router yourself, and re-registering an already-listed page is a no-op. ' +
    'For a multi-component build use create_plan / stage_plan_operation / apply_plan — nothing touches ' +
    'disk until the one apply — and pass its `scroll` argument ("page" or "app"), because the underlying ' +
    'default clips every page at the viewport with no scrollbar. ' +
    // AAQ-011/F13. Stated because it is the step an agent otherwise skips:
    // a graph with Record nodes and no backend validates, builds, and then
    // does nothing at run time, and the agent has no panel to notice in.
    'BACKENDS: an app with Record, User or Cloud Function nodes needs one. ' +
    // AWP-006. The backend tools are 60 of the 89 and 59% of the schema
    // bytes, and a storefront brief touches none of them — so they are held
    // back by default. This sentence is where an agent building a data app
    // learns that, and it is stated before provision_backend is named so the
    // instruction never points at a tool the reader cannot currently see.
    (staticToolList
      ? `Its ${BACKEND_TOOL_COUNT} tools are called through call_tool like the rest (find_tools({group:"backend"}) ` +
        'lists them). Call provision_backend FIRST '
      : deferTools
        ? `Its ${BACKEND_TOOL_COUNT} tools are not advertised yet — call find_tools({group:"backend"}) and they ` +
          'arrive in your next tool list (authoring a Record node reveals them too). Then provision_backend FIRST '
        : 'Call provision_backend FIRST ') +
    '(it creates, starts and binds a local backend and pre-seeds the collections you name — declare their ' +
    'columns, or the Record nodes get no prop-* ports), then plan the components against it. It is ' +
    'deliberately not a plan operation: it starts a process and creates a database, which a plan cannot ' +
    'roll back. ' +
    // LAS-005. Push, not pull: the audit measured a mid-tier model that
    // never once retrieved a recipe it was told existed, and a strong one
    // that improvised a verification loop through Bash and still shipped the
    // wrong photograph. Retrieval advice does nothing; naming the tool here,
    // where every session reads it, is the only thing that has worked.
    (imagesCostly
      ? // OWN-019 census #15. Each image a Mistral model opens turns its prompt cache off for the rest of the
        // session (P112-OWN018-IMAGECACHE): the same evidence, asked for without the picture.
        'VERIFY: when you have written anything visual, call render_report (headless, ~2s a page) and read its ' +
        'verdict and numbers; then prove what the person asked for with drive_page — tap, wait, and read the ' +
        'text, a variable, or an element\'s computed style. Screenshots are files: open one only at the end, on ' +
        'the one page still in doubt, because every image you open makes each later request of this session ' +
        'full price.'
      : // OWN-019 census #15: "(~8s)" disagreed with render_report's own "~2s a page"; the timing is the tool's to
        // state, so the briefing drops it (and stays inside AWP-006's budget).
        'VERIFY BY LOOKING: when you have written anything visual, call render_report. It renders the project ' +
        'headless and returns the numbers AND screenshots — a graph is a claim, a render is evidence, and an ' +
        'image URL that returns 200 can still be a picture of the wrong thing.')
  );
}

/**
 * The unbound briefing: the whole of what an agent knows before its first call.
 *
 * ## Four jobs, and the order is the point
 *
 * This is read top-down by something deciding its next call, so it goes: what
 * NodeGX is → what state this server is in → the two exits and which to take →
 * what happens after.
 *
 * ⚠️ **`list_projects` is named before `create_project`, deliberately.** An agent
 * that reaches for creation by default makes a second project beside the one its
 * user meant, and "it built my app somewhere else" is a *destructive-feeling*
 * outcome even though nothing was deleted. The ordering is the mitigation and it
 * is testable: `tests/instructions.test.ts` asserts the position, and BST-006's
 * acceptance asks for a live model to be checked against it too.
 *
 * ⚠️ **No authoring guidance.** No Router paragraph, no `Static Data`, no
 * plan-first order. Those belong to a project and they arrive with one — see the
 * module header on why they cannot simply be sent here as well.
 *
 * ⚠️ **The last sentence describes what happens today.** It used to say a created
 * project needs a second server pointed at it, and BST-002 made that false: the
 * live server binds itself and the authoring tools arrive in the same session.
 * Rewritten here when that landed, as BST-006 required — the rule in both
 * directions is that this paragraph must never promise a bind the build does not
 * perform, because an agent told to expect tools that never arrive stops and
 * waits rather than falling back.
 */
export const BOOTSTRAP_INSTRUCTIONS: string =
  'NodeGX (OpenNoodl) is a visual app builder: an app is a graph of nodes stored as plain files on disk, ' +
  'and this server reads and writes those files. ' +
  // P112-S14-NOTNODEGX (Richard: "or else what's the point?"). A fresh agent in a folder `npm create nodegx` made,
  // asked for an app without the word "NodeGX", wrote an Express server and HTML and never called a tool here.
  'WHEN THE PERSON ASKS FOR AN APP, BUILD IT WITH THIS SERVER: a NodeGX app is the graph these tools write, so ' +
  'do not write a separate web server or hand-made HTML and JavaScript instead — that is a different app, and ' +
  'they connected this server to get a NodeGX one. ' +
  // P125 CCN-001 s2 (2026-10-23). A Claude Desktop Cowork session connected this server, listed its tools, then
  // wrote a script that spawned a second copy over stdio and drove it from a shell: zero tools/call ever reached
  // the host's client, and nothing a scripted server does can put Studio on the person's screen.
  'CALL THESE TOOLS THROUGH YOUR MCP CLIENT, never by starting noodl-mcp yourself from a shell or a script: a ' +
  'tool run that way has no host behind it, so it cannot put the app on the person\'s screen (open_studio), and ' +
  'the person cannot stop it. ' +
  // P125 CCN-008 (2026-10-25, Richard's first run): asked "Can you give me some options for the buttons?" in a NodeGX
  // conversation, the model drew four HTML mock-ups with Claude Desktop's own visualizer and called no tool here. In
  // Desktop this server always starts unbound, so this briefing is the only NodeGX text the model holds all
  // conversation: the door to the real part is said here, or nowhere the model reads before it chooses.
  'WHEN THE PERSON SHOULD CHOOSE HOW A PART LOOKS (options for the buttons, the hero, a 3D model), show them the ' +
  'real part with show_mini_editor, its variants being the options they pick from live, never a mock-up drawn as ' +
  'HTML, a widget or an artifact: a mock-up is not their app, and nothing they pick in it reaches the project. ' +
  // 🔴 F87 — this said "four" and `tools/list` returned five: the four capability
  // tools plus `find_tools`, which stays advertised in this mode. Counted from
  // the manifest now, because the sentence a cold agent reads first is the worst
  // possible place for the server to be wrong about itself.
  `RIGHT NOW NO PROJECT IS BOUND, so only ${spellCount(BOOTSTRAP_ADVERTISED.length)} tools are advertised — ` +
  'the rest of the server (reading ' +
  'components, authoring, validation, rendering, the backend) arrives once there is a project to point it at. ' +
  // 🔴 FIX-008 D — this said "TWO WAYS ON" and described one and a half. The
  // `list_projects` half ended at a list: an agent could name the user's real
  // project and had nothing that would open it, so the only *completable* path
  // in the paragraph was `create_project` — which builds a second app beside the
  // one they meant. The ordering above was the mitigation for that and it is
  // now the smaller half of it; `open_project` is what makes the first way an
  // actual way on.
  'TWO WAYS ON: if the user has built with NodeGX before, call list_projects — it reports the projects on ' +
  'this machine, and editing the one they mean is almost always what they want. Then call open_project with ' +
  'that row\'s directory: this server binds to it and the reading and authoring tools arrive in this same ' +
  'conversation. Only when there is nothing ' +
  'there, or they have asked for something new, call create_project: scope the app with them first (what it ' +
  'is, who uses it, what it stores, the pages, what it deliberately will not do), because that conversation ' +
  'is written into the project as its brief and its build plan. ' +
  'You can also call list_examples and get_example without a project — that is what a NodeGX graph actually ' +
  'looks like, and it is worth reading one before scoping anything. ' +
  // BST-002. This said the server stayed unbound and the user had to start a
  // second one — a configuration errand at the end of the first thing they ever
  // built. It now binds itself, so the sentence says what actually happens and
  // names the one field that carries what `initialize` could not.
  'AFTER OPENING OR CREATING: this server binds itself to the project and the authoring tools arrive in the ' +
  'same conversation — no second registration, no restart. The result carries a `guidance` field ' +
  '(`bound.guidance` from create_project): read it before authoring anything. It is the briefing a server ' +
  'started with a project sends at the beginning of a ' +
  'session, and this one could not send it because there was no project to describe. A server binds ONCE: ' +
  'opening or creating a second project later does NOT repoint this server; it stays bound to the first, ' +
  'and says so.';

/**
 * P112 OWN-019 — the unbound briefing for the client this server was started for. The default is
 * {@link BOOTSTRAP_INSTRUCTIONS} byte for byte; a static-list client (Mistral Vibe) gets the three sentences that
 * promise tools "arriving" said the way they reach it: through `call_tool` (census #11–13). Each swap names the
 * sentence it replaces and throws if it is gone, so an edit above cannot silently stop the variant applying.
 */
export function bootstrapInstructions(): string {
  if (!clientProfile().staticToolList) return BOOTSTRAP_INSTRUCTIONS;
  return swapAll(BOOTSTRAP_INSTRUCTIONS, [
    [
      'arrives once there is a project to point it at. ',
      'is reached through call_tool once there is a project to point it at — your tool list will not change in ' +
        'this session. '
    ],
    [
      "this server binds to it and the reading and authoring tools arrive in this same conversation.",
      'this server binds to it, and its reading and authoring tools are then called through call_tool({ name, ' +
        'arguments }).'
    ],
    [
      'this server binds itself to the project and the authoring tools arrive in the same conversation — no ' +
        'second registration, no restart.',
      'this server binds itself to the project — no second registration, no restart — and every tool you were ' +
        'not shown at the start is called through call_tool({ name, arguments }); call_tool({ name, describe: ' +
        'true }) shows its arguments first.'
    ]
  ]);
}

/** Replace each `[from, to]` exactly once; a `from` that is missing or repeated is a bug in the caller. */
export function swapAll(text: string, swaps: ReadonlyArray<readonly [string, string]>): string {
  let out = text;
  for (const [from, to] of swaps) {
    const at = out.indexOf(from);
    if (at < 0 || out.indexOf(from, at + 1) >= 0) {
      throw new Error(`clientProfile swap: ${JSON.stringify(from.slice(0, 60))} must occur exactly once`);
    }
    out = out.slice(0, at) + to + out.slice(at + from.length);
  }
  return out;
}
