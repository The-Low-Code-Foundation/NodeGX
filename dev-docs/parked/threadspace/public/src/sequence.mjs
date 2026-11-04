// The animations between seats: through the airlock, into the Wren and out of the bay, back in on the bay's own
// guidance. s6 (Richard, 2026-10-29): "getting into the airlock and alarms going off … open the Wren's cockpit and jump
// in and it closes and alarms go off and the hangar opens … ask to dock first, the hangar doors open, fly at least to
// the door and let the animation take over".
//
// A Sequence is a timeline of tracks. Each track owns a span of seconds and is called with k (0 to 1) across it; an
// event (`at`) fires once at its time. A track only SETS state from k (a door's travel, a position along a path, a
// lamp's colour), never adds to it, so a slow frame that jumps a whole track still lands it at k = 1, and a skip (E)
// runs every track left to its end and every event left in order: the skip and the watched run end in the same place.
// The verbs a drive uses (launch, land, setPhase('eva')) are those ends, unchanged.

export const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
export const easeOut = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

export class Sequence {
  /** `inside`: is the camera within the Kestrel's hull (then her shell is not drawn, as when walking)? A track or a
   *  shot may change it (`seq.inside = …`). `camera(c, t)` places the view; `end()` hands over to a seat. */
  constructor(name, { length, inside = true, camera = null, end = null } = {}) {
    this.name = name;
    this.length = length;
    this.inside = inside;
    this.t = 0;
    this.tracks = [];
    this.events = [];
    this.shots = [];
    this.camera = camera;
    this.end = end;
    this.done = false;
  }

  /** A track from `t0` to `t1`: fn(k, dt) with k from 0 to 1 (always reaching 1). */
  track(t0, t1, fn) {
    this.tracks.push({ t0, t1, fn, ended: false, started: false });
    return this;
  }

  /** Once, at `t`. */
  at(t, fn) {
    this.events.push({ t, fn, fired: false });
    this.events.sort((a, b) => a.t - b.t);
    return this;
  }

  /** From `t0` to `t1` the camera is `fn(camera, k)`, and the shell is drawn or not by `inside`. */
  shot(t0, t1, fn, { inside = this.inside } = {}) {
    this.shots.push({ t0, t1, fn, inside });
    return this;
  }

  frame(dt) {
    if (this.done) return;
    this.t += dt;
    this.advance(this.t, dt);
    if (this.t >= this.length) this.finish();
  }

  /** Everything up to `t`, in time order: before each event fires, the tracks catch up to its time (a track that ends
   *  there ends first; one that starts there starts after it). s6's first drive: a slow frame crossed both the end of
   *  the climb and the "sit in her seat" event, the event fired first, and the climb's last step then set your seat in
   *  the bay's coordinates while you were already the Wren's child: you were left floating 27 m behind her. */
  advance(t, dt) {
    for (const e of this.events) {
      if (e.fired || e.t > t) continue;
      this.runTracks(e.t, 0, true);
      e.fired = true;
      e.fn();
    }
    this.runTracks(t, dt, false);
  }

  runTracks(t, dt, beforeEvent) {
    for (const tr of this.tracks) {
      if (tr.ended || t < tr.t0 || (beforeEvent && t === tr.t0)) continue;
      const k = tr.t1 > tr.t0 ? Math.min(1, (t - tr.t0) / (tr.t1 - tr.t0)) : 1;
      tr.started = true;
      tr.fn(k, dt);
      if (k >= 1) tr.ended = true;
    }
  }

  /** E: everything left, in order, to its end; then the hand-over. */
  skip() {
    if (this.done) return;
    this.t = this.length;
    this.advance(this.length, 0);
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.end?.();
  }

  /** The shot for now: its camera, and whether the camera is inside the hull. */
  place(c) {
    const s = this.shots.find((x) => this.t >= x.t0 && this.t < x.t1) ?? this.shots[this.shots.length - 1];
    if (!s) return this.camera?.(c, this.t);
    this.inside = s.inside;
    s.fn(c, s.t1 > s.t0 ? Math.min(1, (this.t - s.t0) / (s.t1 - s.t0)) : 1);
  }
}

/** Things that move on their own while you play on (the bay doors opening when you call for them): fn(k) over `dur`
 *  seconds, then `done`. A new tween on the same key replaces the old one where it stands. */
export class Tweens {
  constructor() {
    this.list = new Map();
  }

  add(key, dur, fn, done = null) {
    this.list.set(key, { t: 0, dur, fn, done });
  }

  frame(dt) {
    for (const [key, w] of this.list) {
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      w.fn(k);
      if (k >= 1) {
        this.list.delete(key);
        w.done?.();
      }
    }
  }
}
