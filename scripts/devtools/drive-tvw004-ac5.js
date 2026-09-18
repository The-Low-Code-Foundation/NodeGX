#!/usr/bin/env node
/**
 * P93 TVW-004 AC5 — which tab opens, and ⌘⇧L.
 *
 * AC5: *"The tab default and the ⌘⇧L flip behave as specified from a cold start on each of: a page,
 * a placed visual, an unplaced visual, a logic component."*
 *
 * 🔴 **THE WORD THAT MAKES THIS A DRIVE OF ITS OWN IS "COLD".** `ComponentsPanelReact` holds
 * `chosenTab` in `useState`, and `tab = chosenTab ?? defaultTabFor(tabSubject)`. So the moment
 * anything in a run **clicks a tab or presses the shortcut**, every later reading is the memory
 * answering — working exactly as §2 specifies, and grading nothing. s15's attempt rode the AC1
 * drive, which clicks `Layers` to ask AC1's own question, and read `Components` at 300px and
 * `Layers` at 240px *from one unchanged build* (§8.2).
 *
 * ✅ **The cold start used here is the one a person has: leave the project and come back.**
 * `route({to:'projects'})` then `route({to:'editor', project})` unmounts and remounts the whole
 * `EditorPage`, so `chosenTab` is `null` again — measured, not assumed (§the `forgets` arm below
 * reads it back). A renderer reload would also work and costs a webpack race and ~40s more; this
 * route is a door the product already has.
 *
 * ⚠️ **The four subjects are chosen from the project FILE, not from the panel's own index.**
 * `buildKindIndex` is the pipeline the tab decision reads; picking the fixture with it would make
 * the subject and the answer one measurement. `scratchpad/pick-ac5-subjects.js` classified them off
 * `project.json`'s node types (a `Page` node at a root; a visual root type; how many nodes anywhere
 * carry the component's name as their `type`). The runtime's kind is read here too — as a
 * **precondition**: an arm about "an unplaced *visual*" whose subject the runtime calls a logic
 * component expects `Components` for the wrong reason, so it is refused rather than passed.
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9222 node scripts/devtools/drive-tvw004-ac5.js \
 *     --dir "<project directory>" [--json <file>]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when the renderer is not ready.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

// 🔴 `cdp.js` reads NOODL_REMOTE_DEBUG_PORT at REQUIRE time.
const { appTarget, connect, evaluate } = require('./cdp.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-004 s15 Drive');

/**
 * The four kinds AC5 names, with the expectation written from §2's rule rather than from the code:
 * **Layers when the canvas opens a page or a placed visual component; Components otherwise.**
 *
 * `roots` is what `project.json` has at the top of the component's graph and `placements` is how
 * many nodes anywhere in the project carry its name as a `type` — the independent reading that
 * says these really are the four cases.
 */
const SUBJECTS = [
  {
    label: 'a page',
    name: '/Pages/Main/Creator',
    expect: 'layers',
    runtimeKind: 'page',
    placed: false,
    why: 'a `Page` node at the root of its graph; routed at /creator'
  },
  {
    label: 'a placed visual',
    name: '/#Noodl Component System/Atoms/Layout/Limiter',
    expect: 'layers',
    runtimeKind: 'visual',
    placed: true,
    why: 'Group root, 12 nodes in the project have it as their type'
  },
  {
    label: 'an unplaced visual',
    name: '/#Noodl Component System/File Dropzone/Samples/Image File Dropzone',
    expect: 'components',
    runtimeKind: 'visual',
    placed: false,
    why: 'Group root and nothing anywhere places it'
  },
  {
    label: 'a logic component',
    name: '/#Noodl Component System/Utils/Media Queries/Match Media Query',
    expect: 'components',
    runtimeKind: 'component',
    placed: true,
    why: 'no visual root at all (Component Outputs, JavaScriptFunction, Variable2, Or, Or) — and it IS placed 6 times, so this arm also says placement alone does not open Layers'
  }
];

async function main() {
  const editor = await connect(await appTarget('editor'));

  /** Every evaluation re-establishes `__wreq`: this drive remounts the page's React tree. */
  const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
  const ev = (expr) => evaluate(editor, `${BOOT}${expr}`);

  const result = { project: null, arms: [], readings: [] };
  const arm = (name, held, detail) => {
    result.arms.push({ name, held, detail });
    console.log(`${held === null ? 'UNGRADED' : held ? 'HELD    ' : 'FAILED  '}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  /** Poll until `check` is true, or refuse by name. */
  async function until(check, timeoutMs, what) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await check()) return;
      } catch {
        /* the renderer is mid-remount; that is what we are waiting for */
      }
      await wait(800);
    }
    throw new Error(`gave up after ${Math.round(timeoutMs / 1000)}s waiting for ${what}`);
  }

  /** Which tab is showing, read off the rendered tab bar rather than off React state. */
  const readTab = async () =>
    ev(`(() => {
      const a = document.querySelector('[data-test="panel-tabs"] [data-active="true"]');
      if (!a) return 'ABSENT';
      return a.dataset.test.replace('panel-tab-', '');
    })()`);

  const canvasComponent = async () =>
    ev(`(() => {
      const { NodeGraphContextTmp } = window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx');
      const g = NodeGraphContextTmp.nodeGraph;
      return g && g.activeComponent ? g.activeComponent.name : 'ABSENT';
    })()`);

  const switchCanvas = async (component) => {
    const said = await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(component)});
      if (!c) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);
    if (said === 'MISSING') throw new Error(`no component named ${component} in this project`);
    await until(async () => (await canvasComponent()) === component, 15000, `the canvas to open ${component}`);
    // The panel reads `activeComponentChanged` (TVW-001) and re-renders; one frame is not enough.
    await wait(700);
  };

  /** Make sure the Project panel is on screen. Opening a PANEL is not choosing a TAB. */
  const openPanel = async () => {
    await ev(`(() => { window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.switch('components'); return 'ok'; })()`);
    await until(async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`), 10000, 'the tab bar');
    await wait(300);
  };

  const activePanel = async () =>
    ev(`(() => window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.ActiveId)()`);

  /**
   * 🔴 **The cold start.** Out to the launcher and back in: `EditorPage` unmounts, so the panel is
   * built again with `chosenTab === null` and §2's rule — not a remembered click — decides.
   *
   * The router handle is not a module export; it is three fibers down from `#root`
   * ([[open-a-copy-of-a-real-project-in-the-editor]]).
   */
  const coldStart = async () => {
    await ev(`(() => {
      const root = document.getElementById('root');
      let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
      let depth = 0;
      while (f && depth < 40) {
        const pr = f.memoizedProps;
        if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__ac5router = pr.route.router; break; }
        f = f.child; depth++;
      }
      if (!window.__ac5router) return 'NO ROUTER';
      window.__ac5router.route({ to: 'projects' });
      return 'ok';
    })()`);
    await until(
      async () => ev(`(() => !document.querySelector('[data-test="panel-tabs"]'))()`),
      20000,
      'the editor to leave the project'
    );
    await ev(`(async () => {
      const { LocalProjectsModel } = window.__wreq('./src/editor/src/utils/LocalProjectsModel.ts');
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__ac5router.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await until(
      async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`),
      45000,
      'the project to come back'
    );
    // ⚠️ `allowAsChild` — which is what makes a component `visual` — is stale until the node
    // library has loaded ([[allowaschild-is-stale-until-the-node-library-loads]]). Reading a kind
    // before that filed 22 visual components under Logic once already.
    await until(
      async () =>
        ev(`(() => {
          const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
          const p = ProjectModel.instance;
          if (!p || p.getComponents().length === 0) return false;
          const { buildKindIndex } = window.__wreq('./src/editor/src/views/panels/ComponentsPanelNew/componentKind.ts');
          let visual = 0;
          for (const info of buildKindIndex(p).values()) if (info.kind === 'visual') visual++;
          return visual > 10;
        })()`),
      45000,
      'the node library to load (kinds are stale until it does)'
    );
    await wait(600);
  };

  /**
   * What the runtime says the subject is — the precondition, not the oracle.
   * `buildKindIndex` and `buildUsageIndex` are the panel's own two walks; they are read here so an
   * arm that expects `Components` because a component is an *unplaced visual* refuses to pass when
   * the runtime thinks it is a logic component and would answer `Components` anyway.
   */
  const describeSubject = async (name) =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { buildKindIndex } = window.__wreq('./src/editor/src/views/panels/ComponentsPanelNew/componentKind.ts');
      const { buildUsageIndex } = window.__wreq('./src/editor/src/views/panels/ComponentsPanelNew/componentUsage.ts');
      const p = ProjectModel.instance;
      const kind = buildKindIndex(p).get(${JSON.stringify(name)});
      // buildUsageIndex takes the COMPONENT LIST, not the project — the panel hands it
      // project.getComponents(). Passing the project read as "components is not iterable".
      const usage = buildUsageIndex(p.getComponents()).get(${JSON.stringify(name)});
      return {
        kind: kind ? kind.kind : 'ABSENT',
        instances: usage && usage.instances ? usage.instances.length : 0
      };
    })()`);

  /**
   * ⌘⇧L through the real keyboard, not through the event the handler emits.
   *
   * `EditorPage` registers the command with `KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L` and
   * `KeyboardHandler` listens on `document`. Emitting `componentsPanel.flipTab` directly would
   * prove the panel listens and say nothing about whether the shortcut reaches it
   * ([[verify-the-consequence-not-just-the-mechanism]]).
   *
   * Focus emulation goes on the SAME connection as the keys, or the window is considered blurred
   * and the keystroke lands nowhere ([[cdp-keys-need-focus-emulation-on-the-same-connection]]).
   */
  const pressFlip = async () => {
    await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const modifiers = 4 | 8; // Meta | Shift
    await editor.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers,
      key: 'L',
      code: 'KeyL',
      windowsVirtualKeyCode: 76,
      nativeVirtualKeyCode: 76
    });
    await editor.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers,
      key: 'L',
      code: 'KeyL',
      windowsVirtualKeyCode: 76,
      nativeVirtualKeyCode: 76
    });
    await wait(600);
  };

  // --------------------------------------------------------------- the box
  const ready = await ev(`(() => ({ panel: !!document.querySelector('[data-test="panel-tabs"]'), root: !!document.getElementById('root') }))()`);
  if (!ready.root) {
    console.error('refusing: no React root in this renderer.');
    process.exit(2);
  }

  await coldStart();
  await openPanel();

  result.project = await ev(`(() => {
    const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
    return { name: p.name, dir: p._retainedProjectDirectory, components: p.getComponents().length };
  })()`);
  console.log(`project: ${result.project.name} — ${result.project.dir} (${result.project.components} components)\n`);
  if (result.project.dir !== PROJECT_DIR) {
    // 🔴 A `cp -R` copy carries the original's `name`, so the name proves nothing about which
    // directory is open ([[open-a-copy-of-a-real-project-in-the-editor]]).
    console.error(`refusing: the editor has ${result.project.dir} open, not ${PROJECT_DIR}.`);
    process.exit(2);
  }

  // ------------------------------------------------- 1. the four cold starts
  //
  // Each subject gets its own trip out to the launcher and back, so no reading can inherit a tab
  // another reading chose. The canvas is moved after the remount, which is the same condition:
  // while `chosenTab` is null the default is recomputed from whatever the canvas has open.
  for (const subject of SUBJECTS) {
    await coldStart();
    await openPanel();

    const atMount = await readTab();
    const seen = await describeSubject(subject.name);

    /**
     * 🔴 **The tab has to be seen ARRIVING, not sitting.** A remount leaves the canvas wherever the
     * project was last left, so three of the first four readings happened to start on the tab they
     * expected — and an arm that reads `components` on a surface already showing `components`
     * grades nothing ([[a-rule-reading-zero-in-both-arms-grades-nothing]]). So the canvas is first
     * put on a component whose default is the OTHER tab, and the reading is the move.
     *
     * ⚠️ Still a cold start: priming moves the CANVAS, and only a tab click or ⌘⇧L writes
     * `chosenTab`. The refusal below says so out loud — if priming ever did set a choice, the
     * primed tab would not be the opposite one and the subject would go ungraded.
     */
    const primer = SUBJECTS.find((s) => s.expect !== subject.expect);
    await switchCanvas(primer.name);
    const primed = await readTab();

    await switchCanvas(subject.name);
    const tab = await readTab();
    result.readings.push({ subject: subject.name, label: subject.label, atMount, primed, tab, seen });

    if (primed !== primer.expect) {
      arm(
        `cold start · ${subject.label} · ${subject.name.split('/').pop()}`,
        null,
        `UNGRADED: priming on ${primer.label} should have shown ${primer.expect} and showed ${primed} — the panel is not cold`
      );
      continue;
    }

    const preconditionHeld = seen.kind === subject.runtimeKind && (seen.instances > 0) === subject.placed;
    if (!preconditionHeld) {
      arm(
        `cold start · ${subject.label} · ${subject.name.split('/').pop()}`,
        null,
        `UNGRADED: the runtime calls it ${seen.kind} placed ${seen.instances}×; the project file says ${subject.runtimeKind}, ${subject.why}`
      );
      continue;
    }
    arm(
      `cold start · ${subject.label} · the panel opens on ${subject.expect === 'layers' ? 'Layers' : 'Components'}`,
      tab === subject.expect,
      `${subject.name.split('/').pop()} (${seen.kind}, ${seen.instances} instances): mounted on ${atMount}, primed to ${primed} on ${primer.label}, then ${tab} with the canvas on it`
    );
  }

  // The pair that discriminates: same kind, different placement, different tab. Without it, four
  // readings that all said `components` could be a build that never opens Layers at all.
  const placedVisual = result.readings.find((r) => r.label === 'a placed visual');
  const unplacedVisual = result.readings.find((r) => r.label === 'an unplaced visual');
  arm(
    'placement alone decides between two components of the SAME kind',
    Boolean(
      placedVisual &&
        unplacedVisual &&
        placedVisual.seen.kind === 'visual' &&
        unplacedVisual.seen.kind === 'visual' &&
        placedVisual.tab === 'layers' &&
        unplacedVisual.tab === 'components'
    ),
    placedVisual && unplacedVisual
      ? `placed visual → ${placedVisual.tab}, unplaced visual → ${unplacedVisual.tab}`
      : 'one of the two visual subjects was not read'
  );

  // And the tab MOVED across the four readings, which is what says `chosenTab` was null throughout:
  // a run contaminated by a click reads one constant tab and every expectation that matches it.
  const distinct = new Set(result.readings.map((r) => r.tab));
  arm(
    'the four cold readings are not one constant (the drive was not reading a remembered choice)',
    distinct.size === 2,
    `tabs seen: ${result.readings.map((r) => `${r.label} → ${r.tab}`).join(', ')}`
  );

  // ------------------------------------------------------------ 2. ⌘⇧L
  //
  // From here on a choice HAS been made, so these arms are about the memory, not about the default.
  await coldStart();
  await openPanel();
  await switchCanvas(SUBJECTS[0].name); // a page: the default here is Layers
  const beforeFlip = await readTab();
  await pressFlip();
  const afterFlip = await readTab();
  arm(
    '⌘⇧L flips the tab',
    beforeFlip === 'layers' && afterFlip === 'components',
    `${beforeFlip} → ${afterFlip}`
  );
  await pressFlip();
  const afterSecond = await readTab();
  arm('⌘⇧L flips back', afterSecond === 'layers', `${afterFlip} → ${afterSecond}`);

  // ------------------------------------------- 3. the shortcut opens the panel
  //
  // "a shortcut that only worked while the panel happened to be showing would be a door you have to
  // already be through" — EditorPage.tsx. So it is pressed from a DIFFERENT panel.
  await ev(`(() => { window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.switch('search'); return 'ok'; })()`);
  await wait(600);
  const elsewhere = await activePanel();
  const tabBeforeAway = afterSecond;
  await pressFlip();
  const panelNow = await activePanel();
  const tabNow = await readTab();
  arm(
    '⌘⇧L opens the Project panel from another panel, and flips',
    panelNow === 'components' && tabNow !== tabBeforeAway && tabNow !== 'ABSENT',
    `was on ${elsewhere} showing ${tabBeforeAway}; now on ${panelNow} showing ${tabNow}`
  );

  // ------------------------------------------------- 4. the choice is remembered
  //
  // R-E: once a person has chosen, the canvas no longer moves the tab under them. The canvas goes
  // to a component whose DEFAULT is the other tab — if the tab moves, the memory is not being kept.
  const chosen = tabNow;
  const opposite = SUBJECTS.find((s) => s.expect !== chosen);
  await switchCanvas(opposite.name);
  const afterCanvasMove = await readTab();
  arm(
    'after a choice the canvas no longer moves the tab (R-E)',
    afterCanvasMove === chosen,
    `chose ${chosen}, canvas moved to ${opposite.label} (default ${opposite.expect}), tab is ${afterCanvasMove}`
  );

  // ---------------------------------------- 5. and what the memory does NOT survive
  //
  // Measured rather than claimed: §2 says the tab is remembered "per session, not per project".
  // This is the reading that says what "session" turned out to mean in the build.
  await coldStart();
  await openPanel();
  const afterRoundTrip = await readTab();
  const rootDefault = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const { buildKindIndex } = window.__wreq('./src/editor/src/views/panels/ComponentsPanelNew/componentKind.ts');
    const p = ProjectModel.instance;
    const root = p.getRootComponent();
    const info = root ? buildKindIndex(p).get(root.name) : null;
    return { root: root ? root.name : 'ABSENT', kind: info ? info.kind : 'ABSENT' };
  })()`);
  result.roundTrip = { tab: afterRoundTrip, chosen, rootDefault };
  arm(
    'leaving the project and coming back puts the tab back to the DEFAULT (the choice is per visit, not per session)',
    null,
    `chose ${chosen} before leaving; on return the canvas is on ${rootDefault.root} (${rootDefault.kind}) and the tab is ${afterRoundTrip} — §2 says "remembered per session, not per project"`
  );

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held; ${result.arms.length - graded.length} ungraded.`);
  editor.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
