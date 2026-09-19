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
   * Every component in the project, with the number of roots the RUNTIME calls visual.
   *
   * ⚠️ `isVisualRoot` lives on the graph model, so each component's graph has to be materialised.
   * `component.graph` is lazy; reading `.roots` is what builds it.
   */
  const shapes = await json(`JSON.stringify((() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const out = [];
    for (const c of ProjectModel.instance.getComponents()) {
      try {
        const graph = c.graph;
        const roots = graph.roots || [];
        if (!roots.length) continue;
        const visual = roots.filter((r) => graph.isVisualRoot(r)).length;
        out.push({ name: c.name, roots: roots.length, visual });
      } catch (e) { /* a component whose graph will not build is not a subject */ }
    }
    return out;
  })())`);

  const pick = (predicate) => shapes.find(predicate);
  const subjects = [
    { kind: 'one-lane', component: pick((s) => s.visual === 1) },
    { kind: 'many-lanes', component: pick((s) => s.visual >= 2) },
    { kind: 'no-lane', component: pick((s) => s.visual === 0) }
  ];

  const missing = subjects.filter((s) => !s.component);
  if (missing.length) {
    console.error(
      `refusing: this project has no example of ${missing.map((m) => m.kind).join(', ')}. ` +
        `Shapes present: ${JSON.stringify(shapes.reduce((a, s) => ((a[s.visual] = (a[s.visual] || 0) + 1), a), {}))}`
    );
    process.exit(2);
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

    // Frame the graph the same way for every subject, so three shots are comparable.
    await ev(`(() => { const ed = window.NodeGraphEditor.instance; ed.centerToFit && ed.centerToFit(0); ed.repaint(); return 'ok'; })()`);
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
          window.NodeGraphEditor.instance.setLaneFilter(${JSON.stringify(filter)});
          return { via: 'CONTROL_ABSENT' };
        })())`);
        await wait(450);

        // Read back what is actually on screen, in a separate eval, before the shutter.
        const applied = await json(`JSON.stringify((() => {
          const ed = window.NodeGraphEditor.instance;
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
