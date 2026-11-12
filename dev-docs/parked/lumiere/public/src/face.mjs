// A Sim's face: a mood (eased in and out), blinking every few seconds, and a mouth that moves while talking.
// Realistic people carry seven mixed expressions as morph targets (tools/convert/convert.mjs); a VRM carries its own
// expression table, which is read once from the loaded model and replayed on every copy (copies have no three-vrm).
// `neutral` is the resting face: a soft, closed-mouth smile ("content"). A blank Rocketbox face reads stern.
export const MOODS = {
  neutral: { content: 1 },
  blank: {},
  happy: { happy: 1 },
  sad: { sad: 1 },
  angry: { angry: 1 },
  surprised: { surprised: 1 },
  sleepy: { blink: 0.6, sad: 0.15 },
  // The life prototype's in-between feelings (game/needs.mjs EMOTIONS).
  cheerful: { content: 0.5, happy: 0.55 },
  uncomfortable: { sad: 0.45, angry: 0.2 },
  asleep: { blink: 1 }
};
const CHANNELS = ['content', 'happy', 'sad', 'angry', 'surprised', 'blink', 'talk'];
// The VRM preset expression behind each channel.
const VRM_NAMES = { content: 'relaxed', happy: 'happy', sad: 'sad', angry: 'angry', surprised: 'surprised', blink: 'blink', talk: 'aa' };

const meshesOf = (root) => {
  const list = [];
  root.traverse((o) => o.isMesh && list.push(o));
  return list;
};

// Read once from a loaded VRM: channel → [{ mesh (its index among the model's meshes), morph index, weight }].
export function vrmFaceTable(vrm, root) {
  const meshes = meshesOf(root);
  const table = {};
  for (const [channel, name] of Object.entries(VRM_NAMES)) {
    const expr = vrm.expressionManager?.getExpression(name);
    table[channel] = (expr?.binds ?? [])
      .filter((b) => b.primitives && b.index !== undefined)
      .flatMap((b) => b.primitives.map((m) => ({ mesh: meshes.indexOf(m), index: b.index, weight: b.weight })))
      .filter((b) => b.mesh >= 0);
  }
  return table;
}

export class Face {
  // `table`: a VRM face table (for a VRM body or a copy of one); without it, the body's own named morph targets.
  constructor(root, table = null) {
    const meshes = meshesOf(root);
    this.channels = {};
    for (const c of CHANNELS) {
      this.channels[c] = table
        ? (table[c] ?? []).map((b) => ({ mesh: meshes[b.mesh], index: b.index, weight: b.weight })).filter((b) => b.mesh?.morphTargetInfluences)
        : meshes.filter((m) => m.morphTargetDictionary?.[c] !== undefined).map((m) => ({ mesh: m, index: m.morphTargetDictionary[c], weight: 1 }));
    }
    this.live = Object.values(this.channels).some((l) => l.length);
    this.weights = Object.fromEntries(CHANNELS.map((c) => [c, 0]));
    this.mood = 'neutral';
    this.talking = false;
    this.t = Math.random() * 10;
    this.nextBlink = 1 + Math.random() * 3;
    this.blinkLeft = 0;
  }

  update(dt) {
    if (!this.live) return;
    this.t += dt;
    const target = MOODS[this.mood] ?? {};
    for (const c of ['content', 'happy', 'sad', 'angry', 'surprised']) this.weights[c] += ((target[c] ?? 0) - this.weights[c]) * Math.min(1, dt * 5);
    // Blink every 2–5 s, for 150 ms, on top of whatever the eyes are doing.
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) (this.blinkLeft = 0.15), (this.nextBlink = 2 + Math.random() * 3);
    this.blinkLeft = Math.max(0, this.blinkLeft - dt);
    const restEyes = target.blink ?? 0;
    this.weights.blink = Math.max(restEyes, this.blinkLeft > 0 ? 1 : 0);
    // Talking: the jaw opens and closes in syllables, with pauses.
    const talk = this.talking ? Math.max(0, Math.sin(this.t * 13)) * (0.55 + 0.45 * Math.sin(this.t * 2.3)) : 0;
    this.weights.talk += (talk - this.weights.talk) * Math.min(1, dt * 20);
    // Channels can share a morph target (a VRM's blink and happy both move the eyes): clear, then add.
    for (const list of Object.values(this.channels)) for (const b of list) b.mesh.morphTargetInfluences[b.index] = 0;
    for (const [c, list] of Object.entries(this.channels)) {
      const w = this.weights[c];
      if (w > 0.001) for (const b of list) b.mesh.morphTargetInfluences[b.index] = Math.min(1, b.mesh.morphTargetInfluences[b.index] + w * b.weight);
    }
  }
}
