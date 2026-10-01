'use strict';
// The five nodes as small classes. Each is handed a `link` by the engine (target.js):
//   link.clock()          the world's time now
//   link.freshId()        a v4 UUID from the world's seeded stream
//   link.screen()         { width, height } of the world's window, or null when there is none
//   link.onResize(fn)     subscribe fn to the window's resizes (the engine unsubscribes on dispose)
//   link.pulse(name)      a signal output fired
//   link.verdict(input, outcome, code?)   an outcome reported for an invoked input
//   link.sent(name)       a value output flagged as sent now (sampled by the engine)
// Nothing here touches Date, timers, Math.random or a global window.
const { shapeNamed } = require('./curves');

// ---------------------------------------------------------------- Timer (the Delay)
class Countdown {
  constructor(link) {
    this.link = link;
    this.duration = 0;
    this.startDelay = 0;
    this.waiting = false; // queued, joins at the next frame end
    this.live = false; // in the scheduler's running set
    this.begun = false; // Started already fired for this run
    this.from = 0; // raw `now + startDelay`
  }
  static get ports() {
    return { values: ['duration', 'startDelay'], signals: ['start', 'restart', 'stop'], outputs: [] };
  }
  receive(port, v) {
    this[port] = v; // stored raw
  }
  trigger(port) {
    const L = this.link;
    if (port === 'start') {
      if (this.live) return L.verdict('start', 'unchanged');
      this.waiting = true;
      return L.verdict('start', 'done');
    }
    if (port === 'restart') {
      this.waiting = true;
      this.live = false;
      this.begun = false;
      return L.verdict('restart', 'done');
    }
    // stop
    const was = this.live;
    this.waiting = false;
    this.live = false;
    this.begun = false;
    L.verdict('stop', was ? 'done' : 'unchanged');
  }
  frameEnd() {
    const now = this.link.clock();
    if (this.live && now >= this.from) {
      if (!this.begun) {
        this.link.pulse('timerStarted');
        this.begun = true;
      }
      const dur = this.duration;
      const t = dur > 0 ? (now - this.from) / (dur * 1) : 1.0;
      if (!(t < 1.0)) {
        this.live = false;
        this.begun = false;
        this.link.pulse('timerFinished');
      }
    }
    if (this.waiting) {
      this.from = now + this.startDelay;
      this.live = true;
      this.waiting = false;
      if (this.startDelay === 0) {
        this.link.pulse('timerStarted');
        this.begun = true;
      }
    }
  }
  read() {
    return undefined;
  }
}

// ---------------------------------------------------------------- Repeat
const usable = (v) => typeof v === 'number' && isFinite(v) && v > 0;

class Metronome {
  constructor(link) {
    this.link = link;
    this.on = false; // the node's own running flag
    this.ticks = 0;
    this.interval = 1000;
    this.beat = 1000;
    this.due = 0;
    this.lastFrame = 0;
    // the one scheduler timer
    this.tWaiting = false;
    this.tLive = false;
    this.tFrom = 0;
    this.tSpan = 1000;
  }
  static get ports() {
    return { values: ['interval'], signals: ['start', 'stop'], outputs: ['count'] };
  }
  receive(port, v) {
    this.interval = v;
  }
  trigger(port) {
    const L = this.link;
    if (port === 'start') {
      if (this.on) return L.verdict('start', 'unchanged');
      if (!usable(this.interval)) return L.verdict('start', 'failure', 'repeat/interval-not-positive');
      this.beat = this.interval;
      this.due = this.lastFrame + this.beat;
      if (this.ticks !== 0) {
        this.ticks = 0;
        L.sent('count');
      }
      this.on = true;
      this.tSpan = this.beat;
      this.tWaiting = true;
      return L.verdict('start', 'done');
    }
    if (!this.on) return L.verdict('stop', 'unchanged');
    this.on = false;
    this.tWaiting = false;
    this.tLive = false;
    L.verdict('stop', 'done');
  }
  frameEnd() {
    const now = this.link.clock();
    if (this.tLive && now >= this.tFrom) {
      const t = this.tSpan > 0 ? (now - this.tFrom) / (this.tSpan * 1) : 1.0;
      if (!(t < 1.0)) {
        this.tLive = false;
        if (this.on) {
          this.ticks += 1;
          this.link.sent('count');
          this.link.pulse('tick');
          if (usable(this.interval)) this.beat = this.interval;
          this.due += this.beat;
          if (this.due <= now) this.due += Math.ceil((now - this.due) / this.beat + Number.EPSILON) * this.beat;
          this.tSpan = this.due - now;
          this.tWaiting = true;
        }
      }
    }
    if (this.tWaiting) {
      this.tFrom = now;
      this.tLive = true;
      this.tWaiting = false;
    }
    this.lastFrame = now;
  }
  read(port) {
    return this.ticks;
  }
}

// ---------------------------------------------------------------- Animate To Value
const asNumber = (v) => (v === true ? 1 : v === false ? 0 : Number(v));

class Glide {
  constructor(link) {
    this.link = link;
    this.current = 0;
    this.adopted = false;
    this.from = 0;
    this.to = 0;
    this.span = 300;
    this.delay = 0;
    this.curveName = 'easeOut';
    this.jumpValue = undefined;
    this.jumpAsked = false;
    this.tWaiting = false;
    this.tLive = false;
    this.tFrom = 0; // raw `now + delay`
  }
  static get ports() {
    return { values: ['targetValue', 'jumpValue', 'duration', 'delay', 'easingCurve'], signals: ['jumpTo'], outputs: ['currentValue'] };
  }
  receive(port, v) {
    switch (port) {
      case 'targetValue': {
        const n = asNumber(v);
        if (n !== n) return;
        if (!this.adopted) {
          this.current = n;
          this.adopted = true;
          this.to = n;
          this.link.sent('currentValue');
          return;
        }
        if (n === this.to) return;
        this.from = this.current;
        this.to = n;
        this.tLive = false;
        this.tWaiting = true;
        return;
      }
      case 'jumpValue':
        this.jumpValue = v;
        return;
      case 'duration':
        this.span = v;
        return;
      case 'delay':
        this.delay = v;
        return;
      case 'easingCurve':
        this.curveName = v;
        return;
    }
  }
  trigger() {
    const n = asNumber(this.jumpValue);
    if (n !== n) return;
    this.tLive = false;
    this.tWaiting = false;
    this.current = n;
    this.jumpAsked = true;
    if (!this.adopted) {
      this.adopted = true;
      this.to = n;
    }
    this.link.sent('currentValue');
  }
  frameEnd() {
    const now = this.link.clock();
    const shape = shapeNamed(this.curveName);
    const d = this.span;
    if (this.jumpAsked && this.to !== this.current) {
      this.from = this.current;
      if (!this.tWaiting) this.tWaiting = true;
    }
    this.jumpAsked = false;
    if (this.tLive && now >= this.tFrom) {
      const t = d > 0 ? (now - this.tFrom) / (d * 1) : 1.0;
      const local = t >= 1.0 ? 1.0 : t * 1 - Math.floor(t * 1);
      if (shape) {
        this.current = shape(this.from, this.to, local);
        this.link.sent('currentValue');
      }
      if (!(t < 1.0)) {
        this.tLive = false;
        this.link.pulse('atTargetValue');
      }
    }
    if (this.tWaiting) {
      this.tFrom = now + this.delay;
      this.tLive = true;
      this.tWaiting = false;
      if (this.delay === 0 && shape) {
        this.current = shape(this.from, this.to, 0);
        this.link.sent('currentValue');
      }
    }
  }
  read() {
    return this.current;
  }
}

// ---------------------------------------------------------------- UUID
class IdMaker {
  constructor(link) {
    this.link = link;
    this.id = link.freshId(); // drawn at creation
    this.problem = undefined;
  }
  static get ports() {
    return { values: [], signals: ['generate'], outputs: ['uuid', 'error'] };
  }
  receive() {}
  trigger() {
    this.id = this.link.freshId();
    this.problem = undefined;
    this.link.sent('uuid');
    this.link.sent('error');
    this.link.verdict('generate', 'done');
  }
  frameEnd() {}
  read(port) {
    return port === 'uuid' ? this.id : this.problem;
  }
}

// ---------------------------------------------------------------- Screen Resolution
class WindowSize {
  constructor(link) {
    this.link = link;
    this.w = undefined;
    this.h = undefined;
    const s = link.screen();
    if (!s) return; // server render: nothing at all
    link.onResize(() => {
      const now = link.screen();
      this.w = now.width;
      this.h = now.height;
      link.sent('width');
      link.sent('height');
      link.sent('aspectRatio');
    });
    this.w = s.width;
    this.h = s.height;
  }
  static get ports() {
    return { values: [], signals: [], outputs: ['aspectRatio', 'height', 'width'] };
  }
  receive() {}
  trigger() {}
  frameEnd() {}
  read(port) {
    if (port === 'width') return this.w;
    if (port === 'height') return this.h;
    return this.w / this.h;
  }
}

module.exports = {
  catalog: {
    Timer: Countdown,
    Repeat: Metronome,
    'net.noodl.animatetovalue': Glide,
    'net.noodl.UUID': IdMaker,
    'Screen Resolution': WindowSize
  }
};
