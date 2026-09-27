#!/usr/bin/env node
/**
 * P93 TVW-004 AC2 — the rows against the screen itself.
 *
 * AC2 asks for the Layers row count to equal "the size of an independent DOM walk of the page
 * through instances", and for every row's glyph colour to equal the canvas's colour for that
 * node's category, **both read off rendered elements**.
 *
 * 🔴 **The two walks must share nothing but the identity space, or this grades a function against
 * itself.** `layersTree.ts` walks the editor's `NodeGraphNode.children[]` in the EDITOR renderer.
 * This script's oracle walks the **VIEWER** renderer's real DOM, element by element, up React's
 * fiber tree to the `noodlNode` prop, and derives each node's instance path from the runtime's
 * `nodeScope`/`parentNodeScope` links. Different process, different tree, different data structure.
 * The only thing in common is the node id, which is what both are claims about.
 *
 * 🔴 **The comparison is `pathAddresses`, not string equality.** The runtime mints fresh guids for
 * instances it creates itself — a Router's page, a `For Each` row — so a rendered path contains ids
 * that are in no project file and that the editor's authored path cannot carry
 * (`instance-path.ts`'s own warning). A Layers row addresses a rendered node when the last ids are
 * equal and the row's other ids appear in the rendered path in order.
 *
 * 🔴 **The direction that can fail is `rendered ⊆ Layers`.** Layers legitimately draws rows nothing
 * renders — a `Condition` that is false, a branch of a `States` node not in its current state — so
 * set equality would fail on a correct build. What a person is promised is the other direction:
 * *everything you can see is in this tree*. The reverse difference is reported in full rather than
 * graded, so it can be read and explained instead of being silently tolerated.
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9444 node scripts/devtools/drive-tvw004-ac2.js \
 *     [--json <file>] [--label <name>]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when a renderer is missing.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};

// 🔴 `cdp.js` reads NOODL_REMOTE_DEBUG_PORT at REQUIRE time.
const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The oracle. Every element in the preview's document, up to the Noodl node that drew it.
 *
 * Written out here rather than imported from the viewer bundle on purpose: an oracle that calls
 * `instancePathOf` would be grading the editor against a module the viewer also uses, and a bug in
 * that module would cancel out on both sides. This is the same walk, written again, from the
 * runtime links that are visible at the console.
 */
const PREVIEW_WALK = `(() => {
  const fiberOf = (el) => {
    for (const key in el) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return el[key];
    }
    return undefined;
  };

  // Up past the host fibers (type is a string for 'div', 'span'…) to the first composite.
  const composite = (fiber) => {
    let f = fiber && fiber.return;
    while (f && typeof f.type === 'string') f = f.return;
    return f;
  };

  const noodlOf = (el) => {
    const fiber = fiberOf(el);
    if (!fiber) return undefined;
    let f = composite(fiber);
    let guard = 0;
    while (f && guard++ < 512) {
      const props = f.stateNode && f.stateNode.props;
      if (props && props.noodlNode) return props.noodlNode;
      f = composite(f);
    }
    return undefined;
  };

  const pathOf = (node) => {
    const path = [node.id];
    let cur = node;
    for (let d = 0; d < 256; d++) {
      const scope = cur.parentNodeScope || cur.nodeScope;
      const owner = scope && scope.componentOwner;
      if (!owner || owner === cur || !owner.parentNodeScope) break;
      path.unshift(owner.id);
      cur = owner;
    }
    return path;
  };

  const seen = new Map();
  for (const el of document.querySelectorAll('*')) {
    const node = noodlOf(el);
    if (!node || !node.id) continue;
    const path = pathOf(node);
    const key = path.join('/');
    if (seen.has(key)) continue;
    const rect = el.getBoundingClientRect();
    seen.set(key, {
      path,
      id: node.id,
      // The runtime keeps the authored type name in a few places depending on node kind; the first
      // that answers is the one a person would recognise.
      type: (node.model && node.model.type) || (node.nodeScope && node.name) || node.name || undefined,
      label: (node.model && node.model.label) || undefined,
      w: Math.round(rect.width),
      h: Math.round(rect.height)
    });
  }
  return Array.from(seen.values());
})()`;

/**
 * Every Layers row, with its glyph colour read off the element that carries the category class.
 *
 * ⚠️ The colour is read from the **`Cat-*` wrapper**, not from the glyph inside it: `Icon` renders
 * an empty `<span>` whose colour is inherited, so reading the span would read the wrapper anyway on
 * a correct build and `rgb(0, 0, 0)` on a broken one — a reading that cannot tell the two apart is
 * not a measurement ([[an-icon-component-renders-an-empty-span]]).
 */
const LAYER_ROWS = `(() => {
  const els = document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]');
  return Array.from(els).map((el) => {
    const icon = el.querySelector('[class*="Cat-"]');
    const cat = icon && (icon.className.match(/Cat-([a-zA-Z]+)/) || [])[1];
    const label = el.querySelector('[class*="Label"]');
    return {
      kind: el.getAttribute('data-test').replace('layers-', ''),
      path: (el.getAttribute('data-node-path') || '').split('/').filter(Boolean),
      level: Number(el.getAttribute('data-level')),
      label: label ? label.textContent.trim() : el.textContent.trim(),
      category: cat || null,
      colour: icon ? getComputedStyle(icon).color : null
    };
  });
})()`;

/** The colours the canvas actually paints a category with — resolved, not read off the stylesheet. */
const CANVAS_COLOURS = `(() => {
  const mod = window.__wreq('./src/editor/src/views/nodegrapheditor/canvas/CanvasTheme.ts');
  const theme = mod.CanvasTheme && mod.CanvasTheme.instance;
  if (!theme || !theme.categoryColors) return null;
  // \`accent\` is the full-strength category hue — what the canvas paints a node's chip glyph and
  // selected outline with, and the only one of the pair a 14px glyph in a panel could equal.
  const accent = (name) => theme.categoryColors(name).accent;
  const colors = {
    categoryVisual: accent('visual'),
    categoryData: accent('data'),
    categoryLogic: accent('logic'),
    categoryJavascript: accent('javascript'),
    categoryComponent: accent('component'),
    categoryDefault: accent('default')
  };
  // Read them back THROUGH the DOM, so both sides of the comparison are in the same colour space:
  // the canvas stores '#a78bfa', getComputedStyle reports 'rgb(167, 139, 250)'.
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const asRgb = (value) => {
    probe.style.color = '';
    probe.style.color = value;
    return getComputedStyle(probe).color;
  };
  const out = {
    visual: asRgb(colors.categoryVisual),
    data: asRgb(colors.categoryData),
    logic: asRgb(colors.categoryLogic),
    javascript: asRgb(colors.categoryJavascript),
    component: asRgb(colors.categoryComponent),
    default: asRgb(colors.categoryDefault)
  };
  probe.remove();
  return out;
})()`;

/** The editor's own matcher, written again — see the header on why nothing here is imported. */
function pathAddresses(selector, path) {
  if (!selector.length || !path.length) return false;
  if (selector[selector.length - 1] !== path[path.length - 1]) return false;
  let at = 0;
  for (let i = 0; i < selector.length - 1; i++) {
    while (at < path.length - 1 && path[at] !== selector[i]) at++;
    if (at >= path.length - 1) return false;
    at++;
  }
  return true;
}

async function main() {
  const editor = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(editor, expr);

  await ev(
    `(() => { if (!window.__wreq) webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}]); return typeof window.__wreq; })()`
  );
  await wait(200);

  const info = await ev(`(() => {
    const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
    return { name: p.name, components: p.getComponents().length };
  })()`);

  const result = { label: opt('label') || info.name, project: info, arms: [] };
  const arm = (name, held, detail) => {
    result.arms.push({ name, held, detail });
    console.log(`${held === null ? 'UNGRADED' : held ? 'HELD    ' : 'FAILED  '}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // ------------------------------------------------------------- expand everything
  //
  // R-S opens Layers on the branch being edited, so most of the tree is shut. A comparison against
  // the screen has to see the whole tree, or it grades the collapse rather than the walk.
  let opened = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const n = await ev(`(() => {
      const carets = Array.from(document.querySelectorAll('[data-test="layers-caret"]'));
      const shut = carets.filter((c) => !/Expanded/.test(c.className));
      shut.forEach((c) => c.click());
      return shut.length;
    })()`);
    if (!n) break;
    opened += n;
    await wait(200);
  }

  const rows = await ev(LAYER_ROWS);
  result.rows = rows.length;
  arm('Layers drew rows and every one carries its instance path', rows.length > 0 && rows.every((r) => r.path.length > 0), `${rows.length} rows, ${opened} carets opened`);

  // --------------------------------------------------------------- the oracle
  let viewer;
  try {
    viewer = await connect(await appTarget('viewer'));
  } catch (error) {
    console.error(`refusing: no viewer target — ${error.message}`);
    editor.close();
    process.exit(2);
  }
  const rendered = await evaluate(viewer, PREVIEW_WALK);
  result.rendered = rendered.length;
  arm('the preview walk found rendered nodes', rendered.length > 0, `${rendered.length} distinct rendered nodes`);

  // ------------------------------------------- only what somebody authored
  //
  // 🔴 **A rendered node whose id is in no project file cannot have a Layers row, and grading it
  // grades nothing.** The runtime mints its own containers — a Router's page mount, a `For Each`'s
  // per-item root — with a fresh `guid()` each time. They are not a miss: nobody authored them,
  // no canvas has a node for them, and selecting one is not a thing a person can ask for. The
  // proof that they are minted rather than missed is that **their ids change on every reload**
  // (one top-level Group read `85a2c68f`, then `7e1cabea`, then `a908932d` across three runs of
  // this script), which no id in a project file does.
  //
  // The question is put to the PROJECT MODEL, not to `layersTree` — asking the walk under test
  // which nodes it ought to contain is how a comparison quietly becomes a tautology.
  const ids = [...new Set(rendered.map((r) => r.id))];
  const authored = new Set(
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      return ${JSON.stringify(ids)}.filter((id) => !!ProjectModel.instance.findNodeWithId(id));
    })()`)
  );
  const authoredRendered = rendered.filter((r) => authored.has(r.id));
  result.authoredRendered = authoredRendered.length;
  console.log(
    `         of ${rendered.length} rendered nodes, ${authoredRendered.length} are authored and ` +
      `${rendered.length - authoredRendered.length} are runtime-minted containers (not graded)`
  );

  // -------------------------------------------- what the walk openly refuses
  //
  // 🔴 **A node under a wired-template repeater is ACCOUNTED FOR, not missing.** Which component
  // draws there is decided by a value the editor has not run, so Layers draws a note saying so
  // instead of a subtree. Counting those rows as misses would grade the editor for declining to
  // guess — and, worse, would make the honest build score *worse* than the one that drew the
  // stale parameter's component (it did: 30 misses before the note, 36 after).
  //
  // A rendered node sits under such a repeater when the repeater's own trail — its row path minus
  // the repeater id, which the runtime replaces with a per-item guid — is a prefix subsequence of
  // the rendered path.
  const notes = await ev(`(() => Array.from(document.querySelectorAll('[data-test="layers-dynamic-template"]')).length)()`);
  const noteTrails = await ev(`(() => {
    // The note row carries no path attribute of its own, so take it from the repeater row that
    // precedes it — the two are emitted at the same trail.
    const all = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-dynamic-template"]'));
    const trails = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-test') !== 'layers-dynamic-template') continue;
      for (let j = i - 1; j >= 0; j--) {
        const p = all[j].getAttribute('data-node-path');
        // Drop the repeater's own id: the runtime replaces it with a per-item guid, so only the
        // trail ABOVE it can be looked for in a rendered path.
        if (p) { trails.push(p.split('/').filter(Boolean).slice(0, -1)); break; }
      }
    }
    return trails;
  })()`);
  const under = (trail, path) => {
    let at = 0;
    for (const id of trail) {
      while (at < path.length && path[at] !== id) at++;
      if (at >= path.length) return false;
      at++;
    }
    return true;
  };

  // ------------------------------------------------------- rendered ⊆ Layers
  const unaddressed = authoredRendered.filter((r) => !rows.some((row) => pathAddresses(row.path, r.path)));
  const accounted = unaddressed.filter((r) => noteTrails.some((trail) => under(trail, r.path)));
  const missing = unaddressed.filter((r) => !accounted.includes(r));
  result.missing = missing.slice(0, 40);
  result.accounted = accounted.length;
  console.log(
    `         ${notes} wired-template repeaters on screen account for ${accounted.length} of the ` +
      `${unaddressed.length} nodes no row addresses`
  );
  arm(
    'every node rendered in the preview has a Layers row, or a note saying why it cannot',
    missing.length === 0,
    missing.length
      ? `${missing.length} of ${authoredRendered.length} authored nodes on screen with no row: ${missing.slice(0, 6).map((m) => `${m.type || '?'}@${m.path.join('/')}`).join(', ')}`
      : `${authoredRendered.length} authored nodes on screen, all addressed by ${rows.length} rows`
  );

  // The other direction, reported rather than graded — see the header.
  const unrendered = rows.filter((row) => !authoredRendered.some((r) => pathAddresses(row.path, r.path)));
  result.unrendered = unrendered.map((r) => ({ label: r.label, category: r.category, level: r.level }));
  console.log(
    `         rows with nothing rendered: ${unrendered.length} of ${rows.length}` +
      (unrendered.length ? ` — ${unrendered.slice(0, 8).map((r) => r.label).join(', ')}` : '')
  );

  // ------------------------------------------------------------- the colours
  const canvas = await ev(CANVAS_COLOURS);
  result.canvasColours = canvas;
  if (!canvas) {
    arm('every row glyph is the canvas colour for its category', null, 'CanvasTheme did not answer');
  } else {
    const wrong = rows.filter((r) => r.category && canvas[r.category] && r.colour !== canvas[r.category]);
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
    const ungraded = categories.filter((c) => !canvas[c]);
    arm(
      'every row glyph is the canvas colour for its category',
      wrong.length === 0,
      wrong.length
        ? `${wrong.length} wrong: ${wrong.slice(0, 4).map((r) => `${r.label} ${r.category} ${r.colour} ≠ ${canvas[r.category]}`).join('; ')}`
        : `${categories.length} categories on screen (${categories.join(', ')}), each matching the canvas${ungraded.length ? `; ${ungraded.join(', ')} not in CanvasTheme` : ''}`
    );
    if (ungraded.length) {
      arm(`the categories Layers draws are all categories the canvas has`, false, `${ungraded.join(', ')} has no CanvasTheme colour — a second palette`);
    }
  }

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held.`);
  viewer.close();
  editor.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
