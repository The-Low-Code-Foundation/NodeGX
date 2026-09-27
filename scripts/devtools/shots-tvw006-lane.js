#!/usr/bin/env node
/**
 * P93 TVW-006 AC5 — the structure lane photographed, both themes, three filter states.
 *
 * 🔴 **The three subjects are chosen by SHAPE, not by name.** §2/AC5 name "Home, Hero, Format
 * price", which are three components in one project and say nothing about what the lane has to
 * cope with. The census measured what it does have to cope with, so the subjects are one of each:
 *
 *   1. ONE lane   — 3,103 components (56%), the ordinary page or component
 *   2. MANY lanes — 1,412 (26%), of which 667 have three or more. R-X says overlapping lanes are
 *                   left overlapping, and this is the photograph that ruling is answerable to
 *   3. NO lane    — 1,012 (18%), the `LOGIC ONLY — NO STRUCTURE LANE` eyebrow
 *
 * The script FINDS them in whatever project is open and refuses if the open project has no
 * example of one, rather than photographing three pages and calling the set complete.
 *
 * 🔴 **Each subject's shape is read off the editor's OWN `isVisualRoot`** — the same call the
 * renderer makes — and written into the manifest. Classifying off `project.json` would let a shot
 * labelled "two lanes" be a component the runtime thinks has one, and the photograph would be
 * evidence for a claim nobody checked ([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]]).
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9222 node scripts/devtools/shots-tvw006-lane.js [--dir <project>] [--out <dir>]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 🔴 There is no `window.NodeGraphEditor` — the canvas is `NodeGraphContextTmp.nodeGraph`, reached
 * through the webpack runtime. The same wrong assumption cost the drive a run; it was in this file
 * too ([[a-new-instruments-first-drive-finds-instrument-faults]]).
 */
const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
const ED = `window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx').NodeGraphContextTmp.nodeGraph`;

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-004 s15 Drive');
const OUT = opt(
  'out',
  path.join(__dirname, '../../dev-docs/tasks/phase-93-three-views-of-one-app/verdicts/TVW-006', new Date().toISOString().slice(0, 10))
);
const THEMES = ['light', 'dark'];
const FILTERS = ['all', 'structure', 'logic'];

async function main() {
  const editor = await connect(await appTarget('editor'));
  const ev = (expression) => evaluate(editor, expression);

  await ev(BOOT);
  // 🔴 A hidden Electron window never fires rAF, so `repaint()` does nothing and every shot is of
  // a stale canvas. This pair wakes it; `Page.bringToFront` alone does not.
  for (const [method, params] of [
    ['Page.setWebLifecycleState', { state: 'active' }],
    ['Emulation.setFocusEmulationEnabled', { enabled: true }]
  ]) {
    try { await editor.send(method, params); } catch (error) { /* older target, fall through */ }
  }
  await wait(500);
  const json = async (expression) => {
    const raw = await ev(expression);
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`unparseable: ${String(raw).slice(0, 200)}`);
    }
  };

  const open = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    return ProjectModel.instance ? ProjectModel.instance._retainedProjectDirectory : null;
  })()`);
  if (open !== PROJECT_DIR) {
    console.error(`refusing: the editor has ${open || 'no project'} open, not ${PROJECT_DIR}.`);
    process.exit(2);
  }

  fs.mkdirSync(OUT, { recursive: true });

  /**
   * Shortlist the three subjects from `project.json` on disk, then VERIFY each one against the
   * runtime.
   *
   * 🔴 The obvious version — ask the editor to classify all 364 components — materialises 364
   * lazy graphs inside one `evaluate` and never returns. Measured: the call sat at 0% CPU for ten
   * minutes while the editor answered every other query instantly.
   *
   * ⚠️ So disk PICKS and the runtime DECIDES: the number written into the manifest beside each
   * photograph is `isVisualRoot`'s, read on the component that is actually on screen. If the two
   * disagree the shot is still labelled with the runtime's answer, and `shapeSource` says
   * `disk-shortlist, runtime-verified` so nobody reads the label as a disk fact
   * ([[a-client-property-read-as-a-fact-about-the-source]]).
   */
  const disk = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'project.json'), 'utf8'));
  const diskNames = new Set(disk.components.map((c) => c.name));
  const shapes = [];
  for (const component of disk.components) {
    const roots = (component.graph && component.graph.roots) || [];
    if (!roots.length) continue;
    const recorded = new Set((component.graph && component.graph.visualRoots) || []);
    const visual = roots.filter((r) => {
      const t = typeof r.type === 'string' ? r.type : r.type && r.type.name;
      return recorded.has(r.id) || (t && diskNames.has(t));
    }).length;
    shapes.push({ name: component.name, roots: roots.length, visual });
  }

  // 🔴 The many-lanes subject is the WORST case in the project, not the first one found. R-X ruled
  // that overlapping lanes are left overlapping; the photograph that ruling has to answer for is
  // the busiest canvas there is, not a tidy three-root one.
  const rankedFor = (predicate) =>
    shapes.filter(predicate).sort((a, b) => b.visual - a.visual || b.roots - a.roots);

  /** Open a component and ask the RUNTIME how many lanes it has. */
  const switchTo = async (name) => {
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(name)});
      if (!c) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);
    await wait(700);
    // Fit the whole graph, then report the zoom that took — a candidate is only usable if the
    // result is legible.
    await ev(`(() => { const ed = ${ED}; ed.centerToFit && ed.centerToFit(1); ed.repaint(); return 'ok'; })()`);
    await wait(500);
    return json(`JSON.stringify((() => {
      const ed = ${ED};
      if (!ed || !ed.model) return { lanes: -1, roots: -1, fitScale: 0 };
      return {
        component: ed.model.owner ? ed.model.owner.name : 'ABSENT',
        lanes: (ed.roots || []).filter((r) => ed.model.isVisualRoot(r.model)).length,
        roots: (ed.roots || []).length,
        fitScale: +ed.getPanAndScale().scale.toFixed(3)
      };
    })())`);
  };

  /**
   * 🔴 **A shot nobody can read is not evidence for anything.** The corpus's worst canvas — 29
   * lanes, 242 nodes — fits only at **4% zoom**, where the lane is a hairline and the eyebrow is
   * deliberately hidden (§3 hides it below 50%). The first reframed set photographed exactly that:
   * every lane in frame, not one of them legible. So a candidate must also FIT AT >= 50%, and the
   * many-lanes subject is the busiest canvas that does. The extreme case is recorded as a number in
   * the manifest instead of as a picture of nothing.
   */
  /**
   * 🔴 **No real canvas fits legibly, so the shots are at TRUE SIZE.** Measured across two
   * projects: every multi-lane component fits only below 40% zoom (the corpus's worst — 29 lanes,
   * 242 nodes — at **4%**), and §3 hides the eyebrow below 50%. A "fit everything" frame therefore
   * photographs a hairline and no label: all the lanes in shot, not one of them readable. Framing
   * is `centerToFit` followed by a reset to 100%, which is what a person actually looks at.
   */
  const SHOOT_SCALE = 1;

  /**
   * 🔴 **Disk shortlists; the RUNTIME decides — and it disagrees.** The first run of this script
   * labelled a subject `one-lane` off the disk heuristic and photographed a canvas the runtime
   * gives **zero** lanes: six shots whose filename asserted the very thing they did not show.
   * So each candidate is opened and counted before it is accepted, and a shape with no candidate
   * that survives verification is REFUSED rather than mislabelled.
   */
  const wanted = [
    { kind: 'one-lane', predicate: (s) => s.visual === 1, matches: (r) => r.lanes === 1 },
    { kind: 'many-lanes', predicate: (s) => s.visual >= 2, matches: (r) => r.lanes >= 2 },
    { kind: 'no-lane', predicate: (s) => s.visual === 0, matches: (r) => r.lanes === 0 }
  ];

  const subjects = [];
  for (const want of wanted) {
    const candidates = rankedFor(want.predicate).slice(0, 40);
    let chosen = null;
    let rejected = 0;
    for (const candidate of candidates) {
      const runtime = await switchTo(candidate.name);
      if (want.matches(runtime)) {
        chosen = {
          kind: want.kind,
          component: { name: candidate.name, roots: runtime.roots, visual: runtime.lanes, fitScale: runtime.fitScale }
        };
        break;
      }
      rejected++;
    }
    if (!chosen) {
      console.error(
        `refusing: no component in this project verified as ${want.kind} — ${rejected} disk candidates all disagreed with the runtime.`
      );
      process.exit(2);
    }
    if (rejected) console.log(`(${want.kind}: ${rejected} disk candidate(s) rejected by the runtime)`);
    subjects.push(chosen);
  }

  console.log(
    `subjects: ${subjects.map((s) => `${s.kind}=${s.component.name} (${s.component.visual}/${s.component.roots} visual)`).join(' · ')}`
  );

  const shots = [];

  for (const subject of subjects) {
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(subject.component.name)});
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);
    await wait(600);

    /**
     * Frame the WHOLE graph, the same way for every subject.
     *
     * 🔴 `CenterToFitMode.RootNodes` (0) is not the right mode here and the first set of shots
     * proved it: on a 29-lane canvas it framed the roots and left most of the lanes outside the
     * viewport, so the photographs of the thing being ruled on did not contain it.
     * `AllNodes` (1) is what a person pressing "fit" means.
     */
    /**
     * Frame the SUBJECT'S OWN LANE at true size.
     *
     * 🔴 `centerToFit` computes a pan that belongs to the scale it chose. Setting the scale back to
     * 1 afterwards without recomputing the pan puts the graph off-screen entirely — the first
     * true-size set photographed an empty canvas, eighteen times. The pan is derived here from the
     * transform the renderer actually uses, `screen = (graph + pan) * scale`, so the lane's
     * top-left lands at a fixed inset and the eyebrow is always in frame.
     */
    await ev(`(() => {
      const ed = ${ED};
      const root = (ed.roots || []).find((r) => ed.model.isVisualRoot(r.model)) || (ed.roots || [])[0];
      if (!root) return 'NO_ROOT';
      const scale = ${SHOOT_SCALE};
      const inset = 90;
      ed.setPanAndScale({ x: inset / scale - (root.x - 12), y: inset / scale - (root.y - 34), scale });
      ed.repaint();
      return 'ok';
    })()`);
    await wait(800);
    const framedAt = await ev(`String(${ED}.getPanAndScale().scale.toFixed(3))`);
    console.log(`  ${subject.kind}: ${subject.component.name} — ${subject.component.visual} lanes at ${framedAt}x`);

    /**
     * Put the sidebar back on the components panel and drop any selection before the shutter.
     *
     * ⚠️ A verdict shot is read whole. An earlier set caught the PROPERTIES panel and an unrelated
     * "Save as a token?" toast, because a previous drive had left a node selected and
     * `SelectionActions.selectNode` switches the sidebar. The canvas was right and the frame was
     * still noise ([[verify-the-consequence-not-just-the-mechanism]]).
     */
    await ev(`(() => {
      const ed = ${ED};
      ed.selector && ed.selector.deselectAll && ed.selector.deselectAll();
      const { SidebarModel } = window.__wreq('./src/editor/src/models/sidebar/index.ts');
      SidebarModel.instance && SidebarModel.instance.switch('components');
      ed.repaint();
      return 'ok';
    })()`);
    await wait(500);

    for (const theme of THEMES) {
      await ev(
        `(() => { window.__wreq('./src/editor/src/models/ThemeManager.ts').ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`
      );
      await wait(700);

      for (const filter of FILTERS) {
        // 🔴 Pressed, not set: the control is part of what AC5 photographs. It falls back to the
        // editor call only when the segment is genuinely absent, and the manifest says which.
        const pressed = await json(`JSON.stringify((() => {
          const el = document.querySelector('[data-test="lane-filter-${filter}"]');
          if (el) { el.click(); return { via: 'click' }; }
          ${ED}.setLaneFilter(${JSON.stringify(filter)});
          return { via: 'CONTROL_ABSENT' };
        })())`);
        await wait(450);

        // Read back what is actually on screen, in a separate eval, before the shutter.
        const applied = await json(`JSON.stringify((() => {
          const ed = ${ED};
          return {
            theme: document.documentElement.getAttribute('data-theme') || 'ABSENT',
            laneFilter: ed.laneFilter || 'ABSENT',
            component: ed.model && ed.model.owner ? ed.model.owner.name : 'ABSENT',
            visualRoots: (ed.roots || []).filter((r) => ed.model.isVisualRoot(r.model)).length,
            roots: (ed.roots || []).length
          };
        })())`);

        const file = path.join(OUT, `${subject.kind}--${applied.theme}--${applied.laneFilter}.png`);
        const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(file, Buffer.from(data, 'base64'));

        shots.push({
          file: path.basename(file),
          subject: subject.kind,
          component: applied.component,
          visualRoots: applied.visualRoots,
          fitScale: subject.component.fitScale,
          roots: applied.roots,
          theme: applied.theme,
          laneFilter: applied.laneFilter,
          pressedVia: pressed.via,
          md5: crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
        });
        console.log(`shot ${path.basename(file)} — ${applied.component}, ${applied.visualRoots} lanes, ${pressed.via}`);
      }
    }
  }

  // Leave the canvas as it was found: All, dark.
  await ev(`(() => { const el = document.querySelector('[data-test="lane-filter-all"]'); if (el) el.click(); return 'ok'; })()`);
  await ev(`(() => { window.__wreq('./src/editor/src/models/ThemeManager.ts').ThemeManager.setMode('dark'); return 'ok'; })()`);

  const manifest = {
    task: 'TVW-006',
    criterion: 'AC5 — three lane shapes, both themes, three filter states. Richard rules WORTHY.',
    date: new Date().toISOString().slice(0, 10),
    project: PROJECT_DIR,
    shapeSource: 'disk-shortlist, runtime-verified — the number beside each shot is isVisualRoot on the component actually on screen',
    subjectsChosenBy:
      'SHAPE, from the corpus census: one lane (56% of components), two or more (26%), none (18%). ' +
      'Each shape is read off the editor’s own isVisualRoot, not off project.json.',
    whatToLookAt: [
      'many-lanes--*: R-X says overlapping lanes are left overlapping, each with its own STRUCTURE eyebrow. Does that read, or does it look like a mistake?',
      'no-lane--*: the LOGIC ONLY — NO STRUCTURE LANE eyebrow, once, at the top-left. Is it too loud, or too easy to miss?',
      '*--structure / *--logic: the dimmed half is at 25%. R-F says dimmed things are still clickable — does 25% look disabled rather than quiet?',
      'A logic node that sits INSIDE a lane stays bright under Logic (R-W, 838 in the corpus). If one is in shot, is that readable?'
    ],
    shots
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`\n${shots.length} shots + manifest.json in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
