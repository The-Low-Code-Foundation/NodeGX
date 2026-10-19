// Behaviour as sentences on the selected object: "When tapped → add 1 to the score". A sentence WRITES REAL NODES
// AND WIRES (the kit draws, the graph decides), so the main editor, the agent and `nodegx deploy` all run what it
// says. Reading back is by structure: a wire from the object's Tapped / Hit / Fell into a node a sentence made (marked
// `metadata.scene.role`) is that sentence; any other wire on the object is shown as it is, never hidden.
//
// Plain ES module over the SceneModel, no DOM: the inspector draws it, `tests/behaviour.test.mjs` grades it in Node.

export const T3 = {
  scene: 'three-kit.Scene',
  mesh: 'three-kit.Mesh',
  group: 'three-kit.Group',
  light: 'three-kit.Light',
  body: 'three-kit.Body',
  camera: 'three-kit.Camera',
  keys: 'three-kit.Keys'
};

/** When… — the object's output that starts a sentence, and which objects have it. */
export const TRIGGERS = [
  { key: 'tapped', out: 'onTapped', words: 'When tapped', on: (n) => [T3.mesh, T3.group, T3.body].includes(n.type) },
  { key: 'touched', out: 'onHit', words: 'When something touches it', on: (n) => n.type === T3.body },
  { key: 'fell', out: 'onFell', words: 'When it falls off', on: (n) => n.type === T3.body && kindOfBody(n) === 'moves' }
];

/** → … — what the sentence does, and which objects can do it. */
export const ACTIONS = [
  { key: 'score', words: 'add 1 to the score', on: () => true },
  { key: 'spot', words: 'move somewhere new', on: (n) => [T3.mesh, T3.group, T3.body].includes(n.type) },
  { key: 'start', words: 'go back to the start', on: (n) => n.type === T3.body }
];

/** Somewhere on a 12 × 12 floor, on a half step: what "somewhere new" means. */
export const SPOT = 'round((random() * 2 - 1) * 9) / 2';

const role = (n) => n?.metadata?.scene?.role;
const owner = (n) => n?.metadata?.scene?.for;
export function kindOfBody(n) {
  const b = n?.parameters?.body;
  return b === 'fixed' || b === 'ghost' ? b : 'moves';
}

function find(model, key, r, forId) {
  return model.nodes(key).find((n) => role(n) === r && (forId === undefined || owner(n) === forId));
}

/** Where a logic node goes on the canvas: a column to the right, one row each, so the main editor shows it tidy. */
function spot(model, key) {
  const ys = model.nodes(key).filter((n) => !n.parent && n.x !== undefined).map((n) => n.y ?? 0);
  return { x: 900, y: ys.length ? Math.max(...ys) + 60 : 100 };
}

/** The object's Name, made one if it has none: a Camera follows a name, and Hit Name reports one. */
function nameOf(model, key, n) {
  if (n.parameters?.name) return n.parameters.name;
  model.setParam(key, n.id, 'name', n.id);
  return n.id;
}

// ── reading ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What the object does, as sentences, plus every other wire on it as a plain line. `labelOf` names a node the way
 * the outline does.
 */
export function readBehaviour(model, key, n, labelOf = (x) => x?.label ?? x?.id) {
  const sentences = [];
  const others = [];
  const seen = new Set();
  for (const w of model.wires(key)) {
    if (w.fromId !== n.id) continue;
    const trig = TRIGGERS.find((t) => t.out === w.fromProperty);
    const t = model.node(key, w.toId);
    let action = null;
    if (trig && role(t) === 'score' && w.toProperty === 'increase') action = 'score';
    else if (trig && role(t) === 'spot-x' && owner(t) === n.id && w.toProperty === 'run') action = 'spot';
    else if (trig && role(t) === 'spot-z' && owner(t) === n.id && w.toProperty === 'run') continue; // the other half of "somewhere new"
    else if (trig && w.toId === n.id && w.toProperty === 'reset') action = 'start';
    if (action) {
      const k = `${trig.key}:${action}`;
      if (!seen.has(k)) sentences.push({ when: trig.key, do: action, words: `${trig.words} → ${ACTIONS.find((a) => a.key === action).words}` });
      seen.add(k);
    } else if (!(role(t) === 'spot-x' || role(t) === 'spot-z') || owner(t) !== n.id) {
      others.push(`${w.fromProperty.replace(/^on/, '')} → ${labelOf(t)} · ${w.toProperty}`);
    }
  }
  const keys = find(model, key, 'keys');
  const pushed = !!keys && ['pushX', 'pushZ'].every((p) => model.wireInto(key, n.id, p)?.fromId === keys.id);
  for (const w of model.wires(key)) {
    if (w.toId !== n.id || w.fromId === n.id) continue;
    const from = model.node(key, w.fromId);
    if (keys && w.fromId === keys.id && (w.toProperty === 'pushX' || w.toProperty === 'pushZ')) continue;
    if ((role(from) === 'spot-x' || role(from) === 'spot-z') && owner(from) === n.id) continue;
    if (w.toProperty === 'reset' || w.toProperty === 'pushX' || w.toProperty === 'pushZ') others.push(`${labelOf(from)} · ${w.fromProperty} → ${w.toProperty}`);
  }
  const name = n.parameters?.name;
  const followed = !!name && model.nodes(key).some((c) => c.type === T3.camera && c.parameters?.follow === name);
  return { sentences, others, keys: pushed, followed };
}

// ── writing ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The scene's score: a Counter, and a "Score 3" Text beside the Scene on the page. Made once, shared. */
function ensureScore(model, key, sceneId) {
  const have = find(model, key, 'score');
  if (have) return have.id;
  const at = spot(model, key);
  const counter = model.addNode(key, { type: 'Counter', label: 'Score', parameters: { startValue: 0 }, metadata: { scene: { role: 'score' } }, ...at });
  const text = model.addNode(key, { type: 'Expression', label: 'Score text', parameters: { expression: "'Score ' + score" }, metadata: { scene: { role: 'score-text' } }, x: at.x + 220, y: at.y });
  model.connect(key, counter, 'currentCount', text, 'score');
  const scene = model.node(key, sceneId);
  const holder = scene?.parent && model.node(key, scene.parent);
  if (holder) {
    const label = model.addNode(key, { type: 'Text', parent: holder.id, index: holder.children.indexOf(sceneId), label: 'Score', parameters: { text: 'Score 0' }, metadata: { scene: { role: 'score-label' } } });
    model.connect(key, text, 'result', label, 'text', { replace: true });
  }
  return counter;
}

function ensureSpot(model, key, n) {
  const ids = {};
  for (const axis of ['x', 'z']) {
    const have = find(model, key, `spot-${axis}`, n.id);
    ids[axis] = have
      ? have.id
      : model.addNode(key, { type: 'Expression', label: `${n.label || n.id} new ${axis.toUpperCase()}`, parameters: { expression: SPOT, evaluateAtLoad: false }, metadata: { scene: { role: `spot-${axis}`, for: n.id } }, ...spot(model, key) });
    // Into Jump To, not X / Z: a wired X would ignore where the person put it, and every coin would start at 0.
    model.connect(key, ids[axis], 'result', n.id, n.type === T3.body ? (axis === 'x' ? 'jumpX' : 'jumpZ') : axis, { replace: true });
  }
  return ids;
}

/** Adds "When <when> → <do>" to object `id`. One undo step. */
export function addSentence(model, key, sceneId, id, when, what) {
  const n = model.node(key, id);
  const trig = TRIGGERS.find((t) => t.key === when);
  if (!n || !trig || !trig.on(n)) return false;
  model.batch(key, () => {
    if (what === 'score') model.connect(key, id, trig.out, ensureScore(model, key, sceneId), 'increase');
    if (what === 'spot') {
      const s = ensureSpot(model, key, n);
      model.connect(key, id, trig.out, s.x, 'run');
      model.connect(key, id, trig.out, s.z, 'run');
    }
    if (what === 'start') model.connect(key, id, trig.out, id, 'reset');
    if (trig.key === 'touched') nameOf(model, key, n);
  });
  return true;
}

/** Takes "When <when> → <do>" off object `id`, and the nodes it made that nothing else uses. One undo step. */
export function removeSentence(model, key, id, when, what) {
  const trig = TRIGGERS.find((t) => t.key === when);
  if (!trig) return;
  model.batch(key, () => {
    if (what === 'score') {
      const score = find(model, key, 'score');
      if (!score) return;
      model.disconnect(key, { fromId: id, fromProperty: trig.out, toId: score.id, toProperty: 'increase' });
      if (!model.wires(key).some((w) => w.toId === score.id && w.toProperty === 'increase')) {
        const label = find(model, key, 'score-label');
        if (label) model.removeNode(key, label.id);
        const text = find(model, key, 'score-text');
        if (text) model.removeLogic(key, text.id);
        model.removeLogic(key, score.id);
      }
    }
    if (what === 'spot') {
      const sx = find(model, key, 'spot-x', id);
      const sz = find(model, key, 'spot-z', id);
      for (const s of [sx, sz]) if (s) model.disconnect(key, { fromId: id, fromProperty: trig.out, toId: s.id, toProperty: 'run' });
      if (sx && !model.wires(key).some((w) => w.toId === sx.id && w.toProperty === 'run')) for (const s of [sx, sz]) if (s) model.removeLogic(key, s.id);
    }
    if (what === 'start') model.disconnect(key, { fromId: id, fromProperty: trig.out, toId: id, toProperty: 'reset' });
  });
}

/** "The arrow keys push it": one Keys node for the scene, its X and Z wired into this Body's Push X and Push Z. */
export function setKeys(model, key, id, on) {
  model.batch(key, () => {
    let keys = find(model, key, 'keys');
    if (on) {
      if (!keys) keys = model.node(key, model.addNode(key, { type: T3.keys, label: 'Arrow keys', metadata: { scene: { role: 'keys' } }, ...spot(model, key) }));
      model.connect(key, keys.id, 'x', id, 'pushX', { replace: true });
      model.connect(key, keys.id, 'z', id, 'pushZ', { replace: true });
    } else if (keys) {
      model.disconnect(key, { fromId: keys.id, toId: id });
      if (!model.wires(key).some((w) => w.fromId === keys.id)) model.removeLogic(key, keys.id);
    }
  });
}

/** "The camera follows it": the scene's Camera node (made if there is none) follows this object's Name. */
export function setFollow(model, key, sceneId, id, on) {
  const n = model.node(key, id);
  if (!n) return null;
  return model.batch(key, () => {
    let cam = model.nodes(key).find((c) => c.type === T3.camera);
    if (!on) {
      if (cam) model.setParam(key, cam.id, 'follow', '');
      return cam?.id ?? null;
    }
    const name = nameOf(model, key, n);
    if (!cam) cam = model.node(key, model.addNode(key, { type: T3.camera, parent: sceneId, label: 'Camera', parameters: { distance: 8, height: 6, smoothing: 0.3 } }));
    model.setParam(key, cam.id, 'follow', name);
    return cam.id;
  });
}
