/**
 * P112 OWN-012 — what a page does around the drawer, shared by the two pages that draw a screen from the descriptions:
 * `drawn.html` (the grade, beside the real app; steps 1–3) and `orbit.html` (the screen on the 3D phone; step 4).
 *
 * The drawer itself is `@nodegx/node-spec`'s (src/draw.ts, its drawer-only entry bundled as drawn.js by
 * own-012/build.sh). This file is the page's half of the job, the part a home-made editor writes for itself:
 *
 *   projectParts(files)          the files (path → text) as the drawer takes them: every component by path, the root,
 *                                the design tokens from the project file and the default table (never the page's CSS)
 *   drawProject(parts, …)        one drawing: the root component, the values the trace gave, a canvas text measurer
 *   realElements(preview, parts) the real app's element for each path, and the page each Router shows — read to GRADE
 *                                and to follow the Router, never to draw a box
 *   gradeDrawing(drawing, …)     each box against the real element, with a verdict that follows the cause
 *   paintDrawing(g, drawing, …)  the boxes painted on a 2D canvas in the node's own colours (look: rough, not graded)
 *   withoutGaps(components)      the mutant arm: every gap removed, for the drawer only — the grade must go red
 */
import { draw, traceValue, canvasTextMeasurer, DEFAULT_TOKENS, isVisualType } from './drawn.js';

export { traceValue, isVisualType };

/** A difference is within this many px on x, y, width and height. */
export const TOL = 2;

/** The files (path → text) as the drawer takes them. */
export function projectParts(files) {
  const project = JSON.parse(files['nodegx.project.json']);
  // every component by path: components/<path>/nodes.json → '/<path>'
  const components = {};
  for (const k of Object.keys(files).filter((k) => k.startsWith('components/') && k.endsWith('/nodes.json'))) {
    components['/' + k.slice('components/'.length, -'/nodes.json'.length)] = JSON.parse(files[k]);
  }
  // the root component: the one the project's rootNodeId lives in, else /App, else the first
  const rootPath = Object.keys(components).find((p) => components[p].nodes.some((n) => n.id === project.rootNodeId)) || (components['/App'] ? '/App' : Object.keys(components)[0]);
  // design tokens: the project's own over the default table — the files, not the page's CSS
  const tokens = new Map(DEFAULT_TOKENS.map((t) => [t.name, t.value]));
  for (const t of project.metadata?.designTokens?.customTokens ?? []) tokens.set(t.name, t.value);
  const tokenValue = (name) => tokens.get(name);
  // the layout model takes px only: a `px` token is one, a unitless or any other unit is "no value here" (reported by layoutOf)
  const tokenPx = (name) => { const v = tokens.get(name); const m = typeof v === 'string' && /^(-?\d*\.?\d+)\s*px$/.exec(v.trim()); return m ? Number(m[1]) : undefined; };
  const visualCount = Object.values(components).reduce((n, c) => n + c.nodes.filter((x) => isVisualType(x.type)).length, 0);
  return { project, components, rootPath, rootComp: components[rootPath], tokenValue, tokenPx, visualCount };
}

/** The mutant arm: the drawer alone loses every gap. */
export const withoutGaps = (components) => Object.fromEntries(Object.entries(components).map(([p, c]) => [p, { ...c, nodes: c.nodes.map((n) => { const prm = { ...n.parameters }; delete prm.rowGap; delete prm.columnGap; return { ...n, parameters: prm }; }) }]));

/** A canvas text measurer over the project's tokens (the one thing the layout model does not do: a leaf's content). */
export function measurerFor(parts, doc = document) {
  return canvasTextMeasurer({ context: doc.createElement('canvas').getContext('2d'), token: parts.tokenValue });
}

/** One drawing of the project's root component. `pages`: the page each Router shows, by path (from the real app, or none). */
export function drawProject(parts, { values, viewport, measure, pages, mutant }) {
  const components = mutant === 'nogap' ? withoutGaps(parts.components) : parts.components;
  return draw({
    nodes: components[parts.rootPath],
    components,
    values,
    viewport,
    measure,
    token: parts.tokenPx,
    pageOf: (node, path) => pages?.get(path),
    bodyScroll: parts.project.settings?.bodyScroll === true
  });
}

/**
 * The real app's elements by path, and which page each Router shows — read to grade, never to draw.
 * The runtime's scopes: a placed component is a node whose own scope holds the component's nodes; a Router makes the page
 * component's instance in its own scope under a generated id, so that instance is put under the Router's id, as the
 * drawer puts it (draw.ts header 4–5).
 */
export function realElements(preview, parts) {
  const { components, rootComp } = parts;
  const map = new Map();
  const pages = new Map();
  const rt = preview.frame?.contentWindow?.Noodl?.Navigation?._noodlRuntime;
  const root = rt?.context?.rootComponent;
  if (!root) return { map, pages };
  const walk = (scope, prefix, comp) => {
    const nodes = Object.values(scope.nodes || {});
    const fileIds = comp ? new Set(comp.nodes.map((n) => n.id)) : undefined;
    const routers = nodes.filter((n) => (n.model?.type || n.name) === 'Router');
    for (const r of routers) if (r._internal?.currentPage?.component) pages.set(prefix ? prefix + '/' + r.id : r.id, r._internal.currentPage.component);
    for (const n of nodes) {
      const isInstance = !!(n.nodeScope && n.nodeScope !== scope && n.nodeScope.nodes);
      let path = prefix ? prefix + '/' + n.id : n.id;
      let placed = isInstance ? components[n.name] : undefined;
      if (isInstance && fileIds && !fileIds.has(n.id)) {
        const r = routers.find((x) => x._internal?.currentPage?.component === n.name) || routers.find((x) => x._internal?.currentPage);
        if (r) { path = prefix ? prefix + '/' + r.id : r.id; placed = components[r._internal.currentPage.component]; }
      }
      if (isInstance) { walk(n.nodeScope, path, placed); continue; }
      const el = typeof n.getDOMElement === 'function' ? n.getDOMElement() : null;
      if (el && !map.has(path)) map.set(path, el);
    }
  };
  walk(root.nodeScope, '', rootComp);
  return { map, pages };
}

// A need that is an assumption the drawer or the measurer made in the open (not a note on how it measured) names a difference.
const isAssumption = (w) => /assumed|no spec|not among|one row per item|no size or axis role|lists no page|browser's own|browser draws/.test(w);

/**
 * Each box against the real element, read once, at the same instant. A box is matched by its path; a node the walk did
 * not reach falls back to `preview.elementsOf(id)` when that names exactly one element. `origin`: where the real app's
 * frame starts on the page the rects are read in (none: the rects are the frame's own).
 *
 * The verdict follows the cause, size and position each: a box is `within 2 px`. A size that is off is named by the
 * node's own setting (a limit, an assumption), or `holds` a descendant that is not within (a hugging parent is its
 * children). A position that is off `follows` its parent when the parent moved, or an earlier sibling that is not within (a
 * stack places what came before), or its own size when that is off and the box is aligned from its end or centre; else the
 * node's own setting (`position is fixed`). A difference with none of these is OFF — a defect to file, once, at its source.
 */
export function gradeDrawing(drawing, { real, preview, origin = { x: 0, y: 0 } }) {
  const elementFor = (b) => {
    const byPath = real.map.get(b.path);
    if (byPath) return byPath;
    const els = preview.elementsOf(b.id);
    return els.length === 1 ? els[0] : undefined;
  };
  const rows = drawing.boxes.map((b) => {
    const el = elementFor(b);
    const r = el?.getBoundingClientRect();
    const real = r ? { x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height } : null;
    const d = real && b.present ? { dx: b.x - real.x, dy: b.y - real.y, dw: b.width - real.width, dh: b.height - real.height } : {};
    const sizeOk = !!real && b.present && Math.abs(d.dw) <= TOL && Math.abs(d.dh) <= TOL;
    const posOk = !!real && b.present && Math.abs(d.dx) <= TOL && Math.abs(d.dy) <= TOL;
    const within = b.present ? sizeOk && posOk : !real;
    const own = [...b.outside, ...b.limits, ...b.needs.filter(isAssumption)];
    return { path: b.path, id: b.id, type: b.type, label: b.label, parent: b.parent, drawn: { x: b.x, y: b.y, width: b.width, height: b.height }, real, ...d, within, sizeOk, posOk, own, present: b.present, outside: b.outside, needs: b.needs, limits: b.limits };
  });
  const rowAt = (p) => rows.find((x) => x.path === p);
  const ancestors = (row) => { const out = []; for (let p = row.parent; p; p = rowAt(p)?.parent) out.push(p); return out; };
  const before = (row) => { const i = rows.indexOf(row); return rows.slice(0, i).filter((r) => r.parent === row.parent && r.present).map((r) => r.path); };
  const under = (row) => rows.filter((r) => r !== row && r.present && ancestors(r).includes(row.path)).map((r) => r.path);
  const notWithin = (paths) => paths.filter((p) => { const r = rowAt(p); return r && !r.within; });
  for (const row of rows) {
    if (row.within) { row.verdict = row.present ? 'within 2 px' : 'absent on both'; continue; }
    if (!row.present || !row.real) { row.verdict = row.own.length ? 'named: ' + row.own.join('; ') : 'OFF'; continue; }
    const parts = [];
    let explained = true;
    if (!row.sizeOk) {
      const inside = notWithin(under(row));
      if (row.own.length) parts.push(row.own.join('; '));
      else if (inside.length) parts.push(`holds ${inside.join(', ')}`);
      else explained = false;
    }
    if (!row.posOk) {
      const parent = rowAt(row.parent);
      const moved = parent && !parent.posOk ? [parent.path] : [];
      const earlier = notWithin(before(row));
      if (moved.length || earlier.length) parts.push(`follows ${[...moved, ...earlier].join(', ')}`);
      else if (!row.sizeOk && explained) parts.push('placed by its own size');
      else if (row.own.length && row.sizeOk) parts.push(row.own.join('; '));
      else explained = false;
    }
    row.verdict = explained ? 'named: ' + parts.join('; ') : 'OFF' + (parts.length ? ' (' + parts.join('; ') + ')' : '');
  }
  const needs = [...new Set(rows.flatMap((r) => [...r.needs, ...r.limits.map((w) => 'LIMIT ' + w)].map((w) => `${r.path}: ${w}`)))];
  return { rows, needs: [...drawing.needs, ...needs] };
}

/** The file node a box path names, following placed components and the page a Router shows. */
export function nodeAt(parts, path, pages) {
  const { components, rootComp } = parts;
  const ids = path.split('/');
  let comp = rootComp;
  let node;
  for (const id of ids) {
    node = comp?.nodes.find((n) => n.id === id);
    if (!node) return undefined;
    if (components[node.type]) comp = components[node.type];
    else if (node.type === 'Router') { const pg = pages?.get(ids.slice(0, ids.indexOf(id) + 1).join('/')) ?? node.parameters?.pages?.startPage; comp = components[pg]; }
  }
  return node;
}

const lengthOf = (v) => (v && typeof v === 'object' && 'value' in v ? Number(v.value) : typeof v === 'number' ? v : typeof v === 'string' && /^\d/.test(v) ? parseFloat(v) : undefined);

/**
 * The boxes painted on a 2D canvas, in the node's own colours where it names them: background, corner radius, a clip,
 * text and a button's label. Look is drawn roughly and not graded (OWN-012 §5). `outlines`: a faint line round every
 * box (the grading page); `highlight`: the path of one box to ring (a card pointed at).
 */
export function paintDrawing(g, drawing, { parts, values, pages, outlines = true, highlight } = {}) {
  const colour = (v) => { const m = typeof v === 'string' && /^var\(\s*(--[\w-]+)/.exec(v); return m ? parts.tokenValue(m[1]) : v; };
  const pxOf = (v) => { const m = typeof v === 'string' && /^var\(\s*(--[\w-]+)/.exec(v); return lengthOf(m ? parts.tokenValue(m[1]) : v); };
  const byPath = new Map(drawing.boxes.map((b) => [b.path, b]));
  // a clip: a box whose node sets `clip` clips what is inside it (Orbit's track clips its bar)
  const clipOf = (b) => { const out = []; for (let p = b.parent; p; p = byPath.get(p)?.parent) { const pb = byPath.get(p), pn = pb && nodeAt(parts, p, pages); if (pn?.parameters?.clip) out.push({ b: pb, r: pxOf(pn.parameters.borderRadius) ?? 0 }); } return out; };
  const rr = (b, r) => { g.beginPath(); g.roundRect(b.x, b.y, Math.max(b.width, 0), Math.max(b.height, 0), Math.min(r, b.width / 2, b.height / 2)); };
  for (const b of drawing.boxes) {
    if (!b.present) continue;
    const n = nodeAt(parts, b.path, pages);
    if (!n) continue;
    const read = (p) => values[b.path]?.[p] ?? values[n.id]?.[p] ?? n.parameters?.[p];
    const radius = pxOf(read('borderRadius')) ?? 0;
    g.save();
    for (const c of clipOf(b)) { rr(c.b, c.r); g.clip(); }
    const bg = colour(read('backgroundColor'));
    if (bg && bg !== 'transparent') { g.fillStyle = bg; rr(b, radius); g.fill(); }
    if (n.type === 'Text' || n.type === 'net.noodl.controls.button') {
      const t = String(read(n.type === 'Text' ? 'text' : 'label') ?? '');
      const tt = read('textTransform');
      g.fillStyle = colour(read('color')) || '#888';
      const size = pxOf(read('fontSize')) ?? 16;
      const w = colour(read('fontWeight'));
      g.font = `${w && w !== 'Auto' ? w : 400} ${size}px ${colour(read('fontFamily')) || 'system-ui'}`;
      g.letterSpacing = (pxOf(read('letterSpacing')) ?? 0) + 'px';
      g.textBaseline = 'middle';
      g.textAlign = n.type === 'Text' ? 'left' : 'center';
      g.beginPath(); g.rect(b.x, b.y, Math.max(b.width, 1), Math.max(b.height, 1)); g.clip();
      g.fillText(tt === 'uppercase' ? t.toUpperCase() : t, n.type === 'Text' ? b.x : b.x + b.width / 2, b.y + b.height / 2);
    }
    g.restore();
    if (outlines || highlight === b.path) {
      g.save();
      g.strokeStyle = highlight === b.path ? '#5ca9ff' : 'rgba(92,169,255,0.55)';
      g.lineWidth = highlight === b.path ? 2 : 1;
      if (highlight === b.path) g.setLineDash([4, 3]);
      g.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);
      g.restore();
    }
  }
}
