// @ts-check
/**
 * Game Kit — a NodeGX node kit for small games.
 *
 * Six nodes, and each one exists because the graph cannot draw or play the
 * thing itself:
 *
 * | node | kind | why it is not nodes |
 * |---|---|---|
 * | `Sound`        | logic | nothing in the standard library plays audio |
 * | `Keep Storage` | logic | `navigator.storage.persist()` is a browser API, not a node |
 * | `Avatar`       | React | a picture generated from a name — DiceBear, bundled above this file |
 * | `Race Track`   | React | two sprites positioned along an SVG path — there is no SVG node |
 * | `Keyboard Map` | React | an on-screen keyboard with a colour per finger |
 * | `Answer Pad`   | React | keys that type at the caret and read a key's `code` — Text Input can do neither (D60) |
 *
 * Hand-written in the shape of `keyboard-shortcuts`: no SDK, no npm install,
 * no bundler for THIS file. The avatar library is vendored into `index.js`
 * above this source by `build.mjs` (esbuild, deterministic), so the file the
 * editor installs is still one file that runs as-is.
 *
 * ── The rule this file follows ───────────────────────────────────────────────
 *
 *   Ports are the product. JavaScript is the escape hatch.
 *
 * Nothing here decides anything about a game. `Race Track` does not know who
 * is winning — it draws two rockets at two progress values the graph sends.
 * `Sound` does not know what "correct" is — the graph picks a sound and pulses
 * `Play`. `Keyboard Map` does not know which key is next — the graph says.
 *
 * ── The one thing every node here is careful about ──────────────────────────
 *
 * 🔴 **Nothing outlives its node.** Every timer `Sound` schedules is cleared on
 * delete, through `addDeleteListener` — the same hook `keyboard-shortcuts`
 * documents at length, and the runtime's own teardown path on delete, unmount
 * and navigate-away. A sound that fires after its page is gone is the same
 * defect as a shortcut that fires twice.
 *
 * ── Licences ─────────────────────────────────────────────────────────────────
 *
 * The avatar bundle is DiceBear (`@dicebear/core`, MIT) with five collections:
 * `pixel-art` (MIT), `thumbs` (MIT), `fun-emoji`, `big-smile` and `adventurer`
 * (MIT code, CC BY 4.0 artwork — credit "DiceBear" and the artist named in each
 * collection's LICENSE). README.md carries the attribution in full.
 */
(function () {
  // ✅ React is a global the runtime installs before this file runs. Read it
  // bare; never `window.React` — a server render has no `window`.
  var h = typeof React !== 'undefined' ? React.createElement : null;

  /** The avatar bundle, when it is present above this source. */
  var dicebear = typeof NodegxDicebear !== 'undefined' ? NodegxDicebear : null;

  /** The five collections the bundle carries, in the order the property panel lists them. */
  var AVATAR_STYLES = ['pixel-art', 'fun-emoji', 'thumbs', 'big-smile', 'adventurer'];

  var AVATAR_STYLE_ENUM = AVATAR_STYLES.map(function (id) {
    return { value: id, label: id.replace('-', ' ') };
  });

  /**
   * DiceBear's own options, from an object or its JSON; anything else is none. P87 RKT-011: a worn part is its value in an
   * array AND its `*Probability` at 100 (`{ hat: ['variant03'], hatProbability: 100 }`), or the seed decides whether it draws.
   */
  function avatarOptions(options) {
    var o = options;
    if (typeof o === 'string') {
      try {
        o = JSON.parse(o);
      } catch (e) {
        o = null;
      }
    }
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  }

  /** An avatar as a data URI, or an empty string when there is no bundle (SSR, tests). */
  function avatarDataUri(style, seed, size, options) {
    if (!dicebear) return '';
    try {
      var svg = dicebear.avatarSvg(style, seed, Object.assign({}, avatarOptions(options), { size: size }));
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    } catch (e) {
      return '';
    }
  }

  /** An unset boolean port reads as its documented default, not as `undefined`. */
  function flag(value, whenUnset) {
    if (value === undefined || value === null) return whenUnset;
    return value === true;
  }

  function clamp01(v) {
    var n = Number(v);
    if (!isFinite(n)) return 0;
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sound — a logic node
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Every sound is a short list of notes: [frequency Hz, duration ms, wave].
   * Synthesised, so the kit ships no audio files and needs no network.
   */
  var SOUNDS = {
    correct: [[523.25, 90, 'sine'], [659.25, 140, 'sine']],
    wrong: [[180, 220, 'square']],
    tick: [[1000, 30, 'sine']],
    win: [[523.25, 90, 'triangle'], [659.25, 90, 'triangle'], [783.99, 90, 'triangle'], [1046.5, 260, 'triangle']],
    lose: [[392, 140, 'sawtooth'], [329.63, 140, 'sawtooth'], [261.63, 320, 'sawtooth']],
    pop: [[600, 40, 'sine'], [300, 60, 'sine']],
    type: [[1800, 18, 'square']],
    heart: [[880, 70, 'sine'], [1174.66, 160, 'sine']]
  };

  var SOUND_ENUM = Object.keys(SOUNDS).map(function (id) {
    return { value: id, label: id };
  });

  /**
   * One AudioContext per page, created on the first Play (browsers refuse one
   * created before a user gesture). Shared on purpose: closing a context would
   * silence every other Sound node on the page, so no node ever closes it.
   */
  function audioContext() {
    if (typeof window === 'undefined') return null;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!window.__nodegxGameKitAudio) {
      try {
        window.__nodegxGameKitAudio = new Ctx();
      } catch (e) {
        return null;
      }
    }
    var ctx = window.__nodegxGameKitAudio;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    return ctx;
  }

  /** Schedule the notes; returns the total length in ms so `Ended` can follow. */
  function scheduleNotes(ctx, notes, volume) {
    var t = ctx.currentTime;
    var total = 0;
    for (var i = 0; i < notes.length; i++) {
      var freq = notes[i][0];
      var ms = notes[i][1];
      var wave = notes[i][2];
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
      t += ms / 1000;
      total += ms;
    }
    return total;
  }

  /** @type {import('./types/node-kit').LogicNodeDefinition} */
  var Sound = {
    name: 'game-kit.Sound',
    displayNodeName: 'Sound',
    category: 'Game Kit',
    color: 'logic',
    docs:
      'Plays one short synthesised sound — correct, wrong, tick, win, lose, pop, type or heart — when Play ' +
      'fires. No audio files, no network. Pick the sound on a port so the graph decides what each moment ' +
      'sounds like.',
    searchTags: ['audio', 'beep', 'sfx', 'game', 'sound effect'],
    ssr: { compat: 'client-only', note: 'No AudioContext on the server; Play does nothing there.' },

    initialize: function () {
      var node = this;
      node._internal.sound = 'correct';
      node._internal.volume = 0.4;
      node._internal.enabled = true;
      node._internal.timer = null;
      // 🔴 The teardown. A pending `Ended` after the node is gone is the leak.
      if (typeof node.addDeleteListener === 'function') {
        node.addDeleteListener(function () {
          if (node._internal.timer !== null) {
            clearTimeout(node._internal.timer);
            node._internal.timer = null;
          }
          node._internal.detached = true;
        });
      }
    },

    inputs: {
      sound: {
        type: { name: 'enum', enums: SOUND_ENUM },
        displayName: 'Sound',
        group: 'Sound',
        default: 'correct',
        description: 'Which of the built-in sounds to play. Drive it from a States node or an Expression.',
        set: function (value) {
          this._internal.sound = value;
        }
      },
      volume: {
        type: 'number',
        displayName: 'Volume',
        group: 'Sound',
        default: 0.4,
        description: '0 to 1.',
        set: function (value) {
          this._internal.volume = value;
        }
      },
      enabled: {
        type: 'boolean',
        displayName: 'Enabled',
        group: 'Sound',
        default: true,
        description: 'Set false to mute this node without rewiring it — a "sound off" switch in the profile.',
        set: function (value) {
          this._internal.enabled = value;
        }
      },
      play: {
        displayName: 'Play',
        group: 'Sound',
        description: 'Play the chosen sound now.',
        valueChangedToTrue: function () {
          var node = this;
          if (node._internal.detached) return;
          if (!flag(node._internal.enabled, true)) return;
          var notes = SOUNDS[node._internal.sound] || SOUNDS.correct;
          var ctx = audioContext();
          var total = 0;
          if (ctx) {
            var vol = Number(node._internal.volume);
            if (!isFinite(vol)) vol = 0.4;
            total = scheduleNotes(ctx, notes, Math.max(0, Math.min(1, vol)));
          } else {
            for (var i = 0; i < notes.length; i++) total += notes[i][1];
          }
          if (node._internal.timer !== null) clearTimeout(node._internal.timer);
          node._internal.timer = setTimeout(function () {
            node._internal.timer = null;
            if (node._internal.detached) return;
            node.sendSignalOnOutput('ended');
          }, total);
        }
      }
    },

    outputs: {
      ended: {
        type: 'signal',
        displayName: 'Ended',
        group: 'Events',
        description: 'The sound has finished. Chain the next thing here rather than guessing a delay.'
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Keep Storage — a logic node
  // ═══════════════════════════════════════════════════════════════════════════

  /** @type {import('./types/node-kit').LogicNodeDefinition} */
  var KeepStorage = {
    name: 'game-kit.KeepStorage',
    displayNodeName: 'Keep Storage',
    category: 'Game Kit',
    color: 'logic',
    docs:
      'Asks the browser to keep this site\'s storage (localStorage, IndexedDB) instead of evicting it when ' +
      'space is short or the site has not been visited for a while. Fire Request once, after the person has ' +
      'done something — browsers ignore the request before a gesture. Granted says what the browser decided.',
    searchTags: ['localStorage', 'persist', 'storage', 'save'],
    ssr: { compat: 'client-only', note: 'No navigator on the server; Request answers Granted = false.' },

    initialize: function () {
      this._internal.granted = false;
      this._internal.detached = false;
      var node = this;
      if (typeof node.addDeleteListener === 'function') {
        node.addDeleteListener(function () {
          node._internal.detached = true;
        });
      }
    },

    inputs: {
      request: {
        displayName: 'Request',
        group: 'Storage',
        description: 'Ask the browser to keep the storage.',
        valueChangedToTrue: function () {
          var node = this;
          var finish = function (granted) {
            if (node._internal.detached) return;
            node._internal.granted = granted === true;
            node.flagOutputDirty('granted');
            node.sendSignalOnOutput('done');
          };
          var nav = typeof navigator !== 'undefined' ? navigator : null;
          if (nav && nav.storage && typeof nav.storage.persist === 'function') {
            try {
              nav.storage.persist().then(finish, function () {
                finish(false);
              });
              return;
            } catch (e) {
              // fall through
            }
          }
          finish(false);
        }
      }
    },

    outputs: {
      granted: {
        type: 'boolean',
        displayName: 'Granted',
        group: 'Storage',
        description: 'True when the browser agreed to keep the storage. False is normal on a first visit.',
        get: function () {
          return this._internal.granted === true;
        }
      },
      done: {
        type: 'signal',
        displayName: 'Done',
        group: 'Storage',
        description: 'The browser has answered, either way.'
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Avatar — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Avatar = {
    name: 'game-kit.Avatar',
    displayNodeName: 'Avatar',
    docs:
      'A picture made from a name. The same Seed and Style always give the same face, so a profile stores ' +
      'two strings and never an image. Five styles, all bundled — nothing is fetched.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    usePortAsLabel: 'seed',
    // ⚠️ The collection is `look`, not `style`: the React bridge writes the
    // node's CSS into `props.style`, and a prop of that name would be overwritten.

    getReactComponent: function () {
      return function AvatarComponent(props) {
        var el = React.useRef(null);
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);
        var size = padPx(props.size, 64);
        var uri = avatarDataUri(props.look, props.seed, size, props.options);
        return h(
          'div',
          {
            ref: el,
            style: Object.assign(
              {
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: props.background,
                boxShadow: props.ringWidth ? '0 0 0 ' + props.ringWidth + 'px ' + props.ringColor : 'none',
                display: 'inline-block',
                flexShrink: 0
              },
              props.style
            ),
            onClick: props.onClick,
            title: props.seed || ''
          },
          uri
            ? h('img', {
                src: uri,
                alt: props.seed || 'avatar',
                width: size,
                height: size,
                style: { display: 'block', width: '100%', height: '100%' }
              })
            : null
        );
      };
    },

    defaultCss: { display: 'inline-block' },

    inputProps: {
      look: {
        type: { name: 'enum', enums: AVATAR_STYLE_ENUM },
        displayName: 'Style',
        group: 'Avatar',
        default: 'pixel-art',
        description: 'The DiceBear collection the face is drawn in.'
      },
      seed: {
        type: 'string',
        displayName: 'Seed',
        group: 'Avatar',
        default: 'Rocket',
        description: 'Any text. The same seed always gives the same face — a name, or a roll of random letters.'
      },
      size: {
        type: { name: 'number', units: ['px'], defaultUnit: 'px' },
        displayName: 'Size',
        group: 'Avatar',
        default: 64
      },
      options: {
        type: 'object',
        displayName: 'Options',
        group: 'Avatar',
        description:
          'DiceBear options for this Style, as an object or JSON: what the face wears. A worn part is its value in a list and its ' +
          'probability at 100, e.g. { "hat": ["variant03"], "hatProbability": 100 }. A part the Style does not have is ignored.'
      },
      background: {
        type: 'color',
        displayName: 'Background',
        group: 'Style',
        default: 'var(--surface-raised)'
      },
      ringColor: { type: 'color', displayName: 'Ring Colour', group: 'Style', default: 'var(--primary)' },
      ringWidth: {
        type: { name: 'number', units: ['px'], defaultUnit: 'px' },
        displayName: 'Ring Width',
        group: 'Style',
        default: 0,
        description: 'A ring around the face — 3px says "this one is chosen".'
      }
    },

    outputProps: {
      onClick: { type: 'signal', displayName: 'Click', group: 'Events' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Race Track — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The default course: a winding path across a 1000 × 420 box, start bottom
   * left, planet top right. Any SVG `d` works; the sprites follow whatever is
   * given, so a person changes the course by editing one string.
   */
  var DEFAULT_PATH =
    'M 60 360 C 160 360, 180 140, 300 140 S 420 330, 520 330 S 640 90, 760 90 S 880 250, 940 200';

  var RACE_W = 1000;
  var RACE_H = 420;

  /**
   * P87 RKT-003 — one course per box shape. The default course was drawn for a landscape box, and
   * at a phone's width it shrank to a strip with 16px rockets. `wide` IS the default course,
   * unchanged; `compact` bends twice in a box about 3:2; `tall` zig-zags up a portrait box. Each
   * starts bottom left and ends at the planet near the top.
   */
  var COURSES = {
    wide: { w: RACE_W, h: RACE_H, d: DEFAULT_PATH },
    compact: { w: 1000, h: 640, d: 'M 90 540 C 280 540, 300 300, 480 300 S 660 520, 800 450 S 900 200, 910 130' },
    tall: { w: 600, h: 1000, d: 'M 110 900 C 380 900, 500 820, 460 700 S 130 580, 150 470 S 480 360, 450 250 S 250 110, 470 100' }
  };

  /** Width ÷ height at or above which a box gets the wide course; at or above COMPACT_AT, compact; below it, tall. */
  var WIDE_AT = 1.9;
  var COMPACT_AT = 1.05;

  /** A rocket body is 64 units from nose to tail. */
  /**
   * A rocket body is this many units from nose to tail — the number `spriteScale` sizes against, so it must be the
   * TRUE length of ROCKET_BODY (x −38 … 40). P95 PLY-006 lengthened the hull from 64 to make room for a cockpit and a
   * decal, and raised ROCKET_SIZE_DEFAULT with it: the face on screen is `size × 2·WINDOW_R ÷ ROCKET_UNITS`, which is
   * 72 × 25 ÷ 78 ≈ 23px where the first build drew 44 × 18 ÷ 64 ≈ 12px.
   */
  var ROCKET_UNITS = 78;

  /**
   * Which course a box gets. A Course that is not the default is the author's own, drawn in the
   * 1000 × 420 box, and it always wins. A named shape beats the box. An unmeasured box (a server
   * render, or the first paint) gets the wide course, which is what every build before RKT-003 drew.
   */
  function chooseCourse(aspect, path, box) {
    if (path && path !== DEFAULT_PATH) return { id: 'custom', w: RACE_W, h: RACE_H, d: path };
    var id = COURSES[aspect] ? aspect : null;
    if (!id) {
      if (!box || !(box.w > 0) || !(box.h > 0)) id = 'wide';
      else {
        var ratio = box.w / box.h;
        id = ratio >= WIDE_AT ? 'wide' : ratio >= COMPACT_AT ? 'compact' : 'tall';
      }
    }
    return { id: id, w: COURSES[id].w, h: COURSES[id].h, d: COURSES[id].d };
  }

  /**
   * How much the sprites grow so a rocket is at least `rocketSize` screen pixels long. The SVG is
   * drawn `meet` into its box, so one unit is min(boxW ÷ w, boxH ÷ h) pixels. Never below 1: a big
   * track keeps its big rockets. Unmeasured, 1. `rocketSize` may arrive as "44px" from a unit port.
   */
  function spriteScale(course, box, rocketSize) {
    if (!box || !(box.w > 0) || !(box.h > 0)) return 1;
    var unit = Math.min(box.w / course.w, box.h / course.h);
    var want = parseFloat(rocketSize);
    if (!(want > 0) || !(unit > 0)) return 1;
    return Math.max(1, want / (ROCKET_UNITS * unit));
  }

  /**
   * P95 PLY-006 — the rocket, pointing right, centred on 0,0, ROCKET_UNITS long.
   *
   * 🔴 Richard, 2026-09-18: *"make them bigger and a tiny bit more detailed, certainly to be able to see your avatar
   * inside the rocket better."* The first build's window was a 9-unit circle on a 64-unit hull — the face was 14% of
   * the rocket's length, about **12 screen pixels** at the 44px floor. The hull below is deeper (±15 instead of ±12)
   * and the window is 13 units, forward of centre where a cockpit belongs: the face is now about 41% of the length,
   * and the floor moved to ROCKET_SIZE_DEFAULT, so a phone draws a face of about 26px instead of 12.
   */
  var ROCKET_BODY = 'M -38 0 L -26 -16 L 20 -16 Q 40 0 20 16 L -26 16 Z';
  var ROCKET_FIN_TOP = 'M -26 -16 L -38 -27 L -30 -8 Z';
  var ROCKET_FIN_BOTTOM = 'M -26 16 L -38 27 L -30 8 Z';
  var ROCKET_FLAME = 'M -38 -7 L -54 0 L -38 7 Z';
  /** The detail, drawn over the paint: a nose cone at the tip and a band where the hull meets the fins. */
  var ROCKET_NOSE = 'M 20 -16 Q 40 0 20 16 Z';
  var ROCKET_BAND = 'M -26 -16 L -21 -16 L -21 16 L -26 16 Z';
  /** A hotter core inside the flame, so the exhaust reads as exhaust and not as a triangle. */
  var ROCKET_FLAME_CORE = 'M -38 -3.5 L -47 0 L -38 3.5 Z';

  /** The cockpit: where the avatar sits, and how big it is drawn. */
  var WINDOW_CX = 15;
  var WINDOW_R = 12.5;

  /** The shortest a rocket is drawn by default, nose to tail, in screen pixels. */
  var ROCKET_SIZE_DEFAULT = 72;

  /**
   * P95 PLY-002 — the decals a rocket can wear over its paint. Richard, 2026-09-18: *"the colour would be a basic
   * thing, and the reward would be stripes or polkadots or something."* So paint is one port and PATTERN is another,
   * and these are what the hangar sells. Each is drawn in the body's own coordinates and clipped to the hull, so a
   * pattern can never spill onto the fins or the sky.
   *
   * White at 0.9, with a hairline dark edge, so one set of shapes reads on every `--rocket-paint-*` token; the
   * template gate holds white to ≥ 3:1 against each paint, exactly as the paints are held against the track.
   */
  var PATTERNS = {
    dots: [
      ['circle', { cx: -21, cy: -8, r: 3.3 }], ['circle', { cx: -12, cy: 6, r: 3.3 }], ['circle', { cx: -3, cy: -8, r: 3.3 }],
      ['circle', { cx: -21, cy: 7, r: 3.0 }], ['circle', { cx: -12, cy: -7, r: 3.0 }], ['circle', { cx: -3, cy: 6, r: 3.0 }]
    ],
    stripes: [
      ['rect', { x: -24, y: -17, width: 5, height: 34 }], ['rect', { x: -15, y: -17, width: 5, height: 34 }],
      ['rect', { x: -6, y: -17, width: 5, height: 34 }]
    ],
    checker: [
      ['rect', { x: -26, y: -16, width: 7, height: 8 }], ['rect', { x: -19, y: -8, width: 7, height: 8 }],
      ['rect', { x: -12, y: -16, width: 7, height: 8 }], ['rect', { x: -5, y: -8, width: 7, height: 8 }],
      ['rect', { x: -26, y: 0, width: 7, height: 8 }], ['rect', { x: -19, y: 8, width: 7, height: 8 }],
      ['rect', { x: -12, y: 0, width: 7, height: 8 }], ['rect', { x: -5, y: 8, width: 7, height: 8 }]
    ],
    chevron: [
      ['path', { d: 'M -26 -16 L -18 0 L -26 16 L -32 16 L -24 0 L -32 -16 Z' }],
      ['path', { d: 'M -16 -16 L -8 0 L -16 16 L -22 16 L -14 0 L -22 -16 Z' }],
      ['path', { d: 'M -6 -16 L 2 0 L -6 16 L -12 16 L -4 0 L -12 -16 Z' }]
    ],
    flames: [
      ['path', { d: 'M -38 -16 Q -27 -10 -35 -3 Q -23 -1 -31 5 Q -21 9 -29 16 L -38 16 Z' }],
      ['path', { d: 'M -22 -16 Q -11 -10 -19 -3 Q -7 -1 -15 5 Q -5 9 -13 16 L -22 16 Z' }]
    ],
    stars: [
      ['path', { d: 'M -20 -8 l 2.4 5.6 l 5.6 2.4 l -5.6 2.4 l -2.4 5.6 l -2.4 -5.6 l -5.6 -2.4 l 5.6 -2.4 Z' }],
      ['path', { d: 'M -6 -9 l 1.8 4.2 l 4.2 1.8 l -4.2 1.8 l -1.8 4.2 l -1.8 -4.2 l -4.2 -1.8 l 4.2 -1.8 Z' }],
      ['path', { d: 'M -8 8 l 1.5 3.5 l 3.5 1.5 l -3.5 1.5 l -1.5 3.5 l -1.5 -3.5 l -3.5 -1.5 l 3.5 -1.5 Z' }],
      ['path', { d: 'M -24 9 l 1.5 3.5 l 3.5 1.5 l -3.5 1.5 l -1.5 3.5 l -1.5 -3.5 l -3.5 -1.5 l 3.5 -1.5 Z' }]
    ],
    bolt: [['path', { d: 'M -2 -16 L -20 1 L -11 1 L -18 16 L 3 -3 L -6 -3 L 1 -16 Z' }]]
  };

  /** The decal ids a Pattern port accepts, in the order the hangar lists them. */
  var PATTERN_IDS = Object.keys(PATTERNS);

  /** The shapes of one pattern, or none. An unknown id draws nothing rather than throwing. */
  function patternShapes(id, key) {
    var list = PATTERNS[id];
    if (!list) return null;
    return list.map(function (shape, i) {
      var props = {};
      for (var k in shape[1]) props[k] = shape[1][k];
      props.key = key + i;
      props.fill = '#ffffff';
      props.fillOpacity = 0.9;
      props.stroke = 'rgba(0,0,0,0.28)';
      props.strokeWidth = 1;
      return h(shape[0], props);
    });
  }

  /** P87 RKT-007 — how long the stretch a move just gained stays lit, in ms. */
  var GAIN_MS = 3200;

  /**
   * P87 RKT-007 — a Target that ROSE lights the stretch from where the rocket was heading to where it heads now: the distance
   * that answer earned. The first value a track sees, the same value again, a fall (a restart) or a non-number lights nothing.
   */
  function gainSpan(before, after) {
    if (before === undefined || before === null) return null;
    var a = Number(before);
    var b = Number(after);
    if (!isFinite(a) || !isFinite(b) || !(b > a)) return null;
    return { from: clamp01(a), to: clamp01(b) };
  }

  /**
   * P87 RKT-002 AC4 — the reward moments: sparks burst from a rocket's tail when its Boost count rises, and rings go
   * round the planet when a rocket lands. All the motion is in this one stylesheet, so a reduced-motion setting stills
   * all of it. The burst is not drawn at all, and the landing keeps one still ring, so the child still sees it happened.
   */
  var MOTION_CSS =
    '@keyframes gk-spark { 0% { transform: translate(0px, 0px) scale(0.3) rotate(0deg); opacity: 1; } 70% { opacity: 1; } ' +
    '100% { transform: translate(var(--gk-dx), var(--gk-dy)) scale(1.1) rotate(90deg); opacity: 0; } }\n' +
    '@keyframes gk-ring { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }\n' +
    '@keyframes gk-gain { 0% { opacity: 0.15; } 20% { opacity: 0.7; } 70% { opacity: 0.7; } 100% { opacity: 0; } }\n' +
    '.gk-spark { animation: gk-spark 1100ms cubic-bezier(0.15, 0.7, 0.3, 1) both; }\n' +
    '.gk-landing .gk-spark { animation-duration: 1400ms; animation-iteration-count: 3; }\n' +
    '.gk-ring { transform-box: fill-box; transform-origin: center; animation: gk-ring 1400ms ease-out 3 both; }\n' +
    '.gk-gain { animation: gk-gain ' + GAIN_MS + 'ms ease-out both; }\n' +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  .gk-burst, .gk-spark { animation: none; display: none; }\n' +
    '  .gk-ring, .gk-gain { animation: none; }\n' +
    '}';

  /** Where a burst's sparks fly, in rocket units from the tail: behind it, and a little to each side. */
  var BURST_SPARKS = [[-82, 0], [-70, -32], [-70, 32], [-48, -54], [-48, 54], [-100, -16], [-100, 18]];
  /** A landing's sparks, all the way round the planet. */
  var LANDING_SPARKS = [[0, -100], [71, -71], [100, 0], [71, 71], [0, 100], [-71, 71], [-100, 0], [-71, -71]];
  /** A four-point sparkle, 26 units across. At 7 units the first build's burst drew about 8px sparkles on a phone, too small to read as a reward. */
  var SPARK = 'M 0 -13 L 3.5 -3.5 L 13 0 L 3.5 3.5 L 0 13 L -3.5 3.5 L -13 0 L -3.5 -3.5 Z';

  /** A Boost count that went UP is a burst. A reset to 0, or the same value again, is not. */
  function burstRose(before, after) {
    var a = Number(before);
    var b = Number(after);
    if (!isFinite(b)) return false;
    return b > (isFinite(a) ? a : 0);
  }

  function sparks(list, fill, stroke, prefix) {
    return list.map(function (p, i) {
      return h('path', {
        key: prefix + i,
        className: 'gk-spark',
        d: SPARK,
        fill: fill,
        stroke: stroke,
        strokeWidth: 2.5,
        strokeLinejoin: 'round',
        style: { '--gk-dx': p[0] + 'px', '--gk-dy': p[1] + 'px', animationDelay: (i % 3) * 60 + 'ms' }
      });
    });
  }

  /** The stars, placed in the wide box and stretched to whichever course is drawn. */
  var STARS = [
    [120, 80, 2],
    [380, 60, 1.5],
    [640, 380, 2],
    [860, 40, 1.5],
    [250, 300, 1.5]
  ];

  function pointAlong(pathEl, fraction, offset) {
    var len = pathEl.getTotalLength();
    var at = Math.max(0, Math.min(len, fraction * len));
    var p = pathEl.getPointAtLength(at);
    var ahead = pathEl.getPointAtLength(Math.min(len, at + 4));
    var behind = pathEl.getPointAtLength(Math.max(0, at - 4));
    var dx = ahead.x - behind.x;
    var dy = ahead.y - behind.y;
    var mag = Math.sqrt(dx * dx + dy * dy) || 1;
    var angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // The two lanes: perpendicular to the direction of travel.
    var nx = -dy / mag;
    var ny = dx / mag;
    return { x: p.x + nx * offset, y: p.y + ny * offset, angle: angle };
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var RaceTrack = {
    name: 'game-kit.RaceTrack',
    displayNodeName: 'Race Track',
    docs:
      'A winding course with a planet at the end and one or two rockets on it. Each rocket sits at a ' +
      'Progress from 0 (the start) to 1 (the planet); the graph decides what moves them and by how much. ' +
      'The rockets carry the same avatars as the Avatar node. The course fits the box the node is given: ' +
      'a wide strip, a compact 3:2 box or a tall column each get a course of their own, and on a small ' +
      'track the rockets, their names and the planet are drawn at least Rocket Size long. A Boost count that goes up bursts ' +
      'sparks from that rocket, and a landing rings the planet; both respect reduced motion. A Target that rises lights the ' +
      'stretch of course that move gained, in the rocket’s colour, for a few seconds.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    /** The two decisions the component makes about its box, exposed so a gate can grade them without a browser. */
    layout: { chooseCourse: chooseCourse, spriteScale: spriteScale, courses: COURSES },

    /** PLY-002 / PLY-006: the decals, the cockpit and the size floor, exposed so a gate can grade them without a browser. */
    rocket: { patterns: PATTERNS, patternIds: PATTERN_IDS, patternShapes: patternShapes, windowR: WINDOW_R, windowCx: WINDOW_CX, units: ROCKET_UNITS, sizeDefault: ROCKET_SIZE_DEFAULT },

    /** RKT-002 AC4: the reward moments' stylesheet and the burst rule, exposed so a gate can grade them without a browser. */
    motion: { css: MOTION_CSS, burstRose: burstRose, gainSpan: gainSpan, gainMs: GAIN_MS },

    getReactComponent: function () {
      return function RaceTrackComponent(props) {
        var el = React.useRef(null);
        var pathRef = React.useRef(null);
        var posState = React.useState({ a: null, b: null });
        var pos = posState[0];
        var setPos = posState[1];
        var boxState = React.useState(null);
        var box = boxState[0];
        var setBox = boxState[1];

        // RKT-002 AC4: a Boost count that has risen since the last render is a new burst. The count the track mounts with
        // is not, so a track that remounts mid-race replays nothing. The burst's key changes, which restarts its animation.
        var bursts = React.useRef(null);
        if (bursts.current === null) bursts.current = { a: props.burstA, b: props.burstB, na: 0, nb: 0 };
        var seen = bursts.current;
        if (seen.a !== props.burstA) {
          if (burstRose(seen.a, props.burstA)) seen.na++;
          seen.a = props.burstA;
        }
        if (seen.b !== props.burstB) {
          if (burstRose(seen.b, props.burstB)) seen.nb++;
          seen.b = props.burstB;
        }
        var celebrate = flag(props.celebrate, true);

        // RKT-007: a Target that has risen since the last render lights the stretch it gained. The Target the track mounts
        // with lights nothing, so a track that remounts mid-race replays nothing; a newer rise replaces an older one.
        var gains = React.useRef(null);
        if (gains.current === null) gains.current = { a: { target: props.targetA, lit: null, n: 0 }, b: { target: props.targetB, lit: null, n: 0 } };
        var rerender = React.useState(0)[1];
        [['a', props.targetA], ['b', props.targetB]].forEach(function (pair) {
          var slot = gains.current[pair[0]];
          if (slot.target === pair[1]) return;
          var span = gainSpan(slot.target, pair[1]);
          slot.lit = span ? { from: span.from, to: span.to, n: ++slot.n } : null;
          slot.target = pair[1];
        });
        var litKeyA = gains.current.a.lit ? gains.current.a.lit.n : 0;
        var litKeyB = gains.current.b.lit ? gains.current.b.lit.n : 0;
        var unlightLater = function (id, key) {
          if (!key) return undefined;
          var timer = setTimeout(function () {
            var slot = gains.current[id];
            if (slot.lit && slot.lit.n === key) {
              slot.lit = null;
              rerender(function (x) {
                return x + 1;
              });
            }
          }, GAIN_MS);
          return function () {
            clearTimeout(timer);
          };
        };
        React.useEffect(function () {
          return unlightLater('a', litKeyA);
        }, [litKeyA]);
        React.useEffect(function () {
          return unlightLater('b', litKeyB);
        }, [litKeyB]);

        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);

        // RKT-003: the box's own size picks the course and the sprite scale — measured, never assumed.
        React.useLayoutEffect(function () {
          var node = el.current;
          if (!node || typeof node.getBoundingClientRect !== 'function') return;
          var measure = function () {
            var r = node.getBoundingClientRect();
            var w = Math.round(r.width);
            var tall = Math.round(r.height);
            setBox(function (prev) {
              return prev && prev.w === w && prev.h === tall ? prev : { w: w, h: tall };
            });
          };
          measure();
          if (typeof ResizeObserver !== 'function') return;
          var observer = new ResizeObserver(measure);
          observer.observe(node);
          return function () {
            observer.disconnect();
          };
        }, []);

        var course = chooseCourse(props.aspect, props.path, box);
        var k = spriteScale(course, box, props.rocketSize);
        var unit = box && box.w > 0 && box.h > 0 ? Math.min(box.w / course.w, box.h / course.h) : null;
        // A name stays readable: at least 12 screen pixels, however small the track.
        var labelSize = unit ? Math.max(13, 12 / (unit * k)) : 13;
        var pa = clamp01(props.progressA);
        var pb = clamp01(props.progressB);
        var showB = flag(props.showB, true);
        var lane = 14 * k;

        // Positions come from the browser's own path geometry, which exists
        // only once the <path> is in the DOM — hence an effect, not a memo.
        React.useLayoutEffect(
          function () {
            var pathEl = pathRef.current;
            if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;
            var next = {
              a: pointAlong(pathEl, pa, showB ? -lane : 0),
              b: showB ? pointAlong(pathEl, pb, lane) : null
            };
            setPos(next);
          },
          [course.d, pa, pb, showB, lane]
        );

        var lastPathEl = pathRef.current;
        var goal = null;
        if (lastPathEl && typeof lastPathEl.getTotalLength === 'function') {
          var end = lastPathEl.getPointAtLength(lastPathEl.getTotalLength());
          goal = { x: end.x, y: end.y };
        }

        var sprite = function (id, at, style, seed, colour, label, burst, options, pattern) {
          if (!at) return null;
          // PLY-006: the window is bigger, so the face is asked for at a size that does not look soft inside it.
          var uri = avatarDataUri(style, seed, 64, options);
          var nodeId = props.noodlNode ? props.noodlNode.id : 'x';
          var clipId = 'gk-clip-' + id + '-' + nodeId;
          var hullId = 'gk-hull-' + id + '-' + nodeId;
          var shapes = patternShapes(pattern, 'p' + id);
          var labelY = -(30 + labelSize * 0.7);
          return h(
            'g',
            {
              key: id,
              transform:
                'translate(' + at.x.toFixed(1) + ' ' + at.y.toFixed(1) + ') rotate(' + at.angle.toFixed(1) + ') scale(' + k.toFixed(3) + ')'
            },
            celebrate && burst
              ? h(
                  'g',
                  { key: 'burst' + burst, className: 'gk-burst', 'data-burst': burst, transform: 'translate(-34 0)' },
                  sparks(BURST_SPARKS, props.goalColor, props.laneColor, 'b')
                )
              : null,
            h(
              'defs',
              null,
              h('clipPath', { id: clipId }, h('circle', { cx: WINDOW_CX, cy: 0, r: WINDOW_R })),
              // PLY-002: the hull, so a decal is clipped to the paint and can never spill onto a fin or the sky.
              h('clipPath', { id: hullId }, h('path', { d: ROCKET_BODY }))
            ),
            h('path', { d: ROCKET_FLAME, fill: '#ffb347', opacity: 0.9 }),
            h('path', { d: ROCKET_FLAME_CORE, fill: '#fff2c2', opacity: 0.95 }),
            h('path', { d: ROCKET_FIN_TOP, fill: colour, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1.2, strokeLinejoin: 'round' }),
            h('path', { d: ROCKET_FIN_BOTTOM, fill: colour, stroke: 'rgba(0,0,0,0.3)', strokeWidth: 1.2, strokeLinejoin: 'round' }),
            h('path', { d: ROCKET_BODY, fill: colour, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 1.5, 'data-rocket': id }),
            // PLY-002: the decal the hangar sold, over the paint and under the cockpit.
            shapes ? h('g', { clipPath: 'url(#' + hullId + ')', 'data-pattern': pattern }, shapes) : null,
            // PLY-006: the detail. A lighter nose cone and a darker band, both inside the hull, so the rocket reads as a machine.
            h('path', { d: ROCKET_NOSE, fill: '#ffffff', opacity: 0.22 }),
            h('path', { d: ROCKET_BAND, fill: 'rgba(0,0,0,0.22)' }),
            h('circle', { cx: WINDOW_CX, cy: 0, r: WINDOW_R + 2.5, fill: '#ffffff' }),
            h('circle', { cx: WINDOW_CX, cy: 0, r: WINDOW_R + 2.5, fill: 'none', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 1.6 }),
            uri
              ? h('image', {
                  href: uri,
                  x: WINDOW_CX - WINDOW_R,
                  y: -WINDOW_R,
                  width: WINDOW_R * 2,
                  height: WINDOW_R * 2,
                  clipPath: 'url(#' + clipId + ')',
                  preserveAspectRatio: 'xMidYMid slice'
                })
              : null,
            // The glass: a highlight across the top of the window, so it reads as a canopy rather than a hole.
            h('path', {
              d: 'M ' + (WINDOW_CX - WINDOW_R * 0.8) + ' ' + (-WINDOW_R * 0.45) + ' A ' + WINDOW_R + ' ' + WINDOW_R + ' 0 0 1 ' + (WINDOW_CX + WINDOW_R * 0.2) + ' ' + (-WINDOW_R * 0.92),
              fill: 'none',
              stroke: '#ffffff',
              strokeOpacity: 0.75,
              strokeWidth: 2.2,
              strokeLinecap: 'round'
            }),
            label
              ? h(
                  'text',
                  {
                    x: 0,
                    y: labelY,
                    transform: 'rotate(' + (-at.angle).toFixed(1) + ' 0 ' + labelY.toFixed(1) + ')',
                    textAnchor: 'middle',
                    fontSize: Math.round(labelSize * 10) / 10,
                    fontWeight: 700,
                    fill: colour,
                    style: { fontFamily: 'inherit' }
                  },
                  label
                )
              : null
          );
        };

        // RKT-007: the stretch just gained, along the course centre, growing with the rocket as it glides. `pathLength` makes
        // the dash fractions of the course, the same fractions the sprites are placed at. Butt caps: a round cap on the
        // zero-length first dash would draw a dot at the start.
        var gainPath = function (id, lit, drawn, colour) {
          if (!celebrate || !lit) return null;
          var to = Math.min(lit.to, Math.max(lit.from, drawn));
          var len = to - lit.from;
          if (!(len > 0.001)) return null;
          return h('path', {
            key: 'gain-' + id,
            className: 'gk-gain',
            'data-gain': id,
            d: course.d,
            pathLength: 1000,
            fill: 'none',
            stroke: colour,
            strokeWidth: 30 * k,
            strokeLinecap: 'butt',
            opacity: 0.7,
            strokeDasharray: '0 ' + (lit.from * 1000).toFixed(1) + ' ' + (len * 1000).toFixed(1) + ' 100000'
          });
        };

        // RKT-002 AC4: a rocket at the planet is a landing, ringed in that rocket's colour.
        var landed = !celebrate ? null : pa >= 1 ? 'A' : showB && pb >= 1 ? 'B' : null;
        var landedColour = landed === 'B' ? props.colorB : props.colorA;

        var sx = course.w / RACE_W;
        var sy = course.h / RACE_H;
        return h(
          'div',
          { ref: el, style: Object.assign({ width: '100%', height: '100%' }, props.style) },
          h(
            'svg',
            {
              viewBox: '0 0 ' + course.w + ' ' + course.h,
              width: '100%',
              height: '100%',
              preserveAspectRatio: 'xMidYMid meet',
              role: 'img',
              'aria-label': 'race track',
              'data-course': course.id,
              style: { display: 'block', overflow: 'visible' }
            },
            h('style', null, MOTION_CSS),
            // Stars, so the space reads as space.
            STARS.map(function (s, i) {
              return h('circle', { key: 'star' + i, cx: s[0] * sx, cy: s[1] * sy, r: s[2] * k, fill: props.laneColor });
            }),
            h('path', {
              ref: pathRef,
              d: course.d,
              fill: 'none',
              stroke: props.trackColor,
              strokeWidth: 44 * k,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }),
            h('path', {
              d: course.d,
              fill: 'none',
              stroke: props.laneColor,
              strokeWidth: 2 * k,
              strokeDasharray: 10 * k + ' ' + 12 * k,
              strokeLinecap: 'round'
            }),
            gainPath('b', showB ? gains.current.b.lit : null, pb, props.colorB),
            gainPath('a', gains.current.a.lit, pa, props.colorA),
            goal
              ? h(
                  'g',
                  { transform: 'translate(' + goal.x + ' ' + goal.y + ') scale(' + k.toFixed(3) + ')' },
                  landed
                    ? h(
                        'g',
                        { className: 'gk-landing', 'data-landing': landed },
                        h('circle', { className: 'gk-ring', cx: 0, cy: 0, r: 40, fill: 'none', stroke: landedColour, strokeWidth: 9, opacity: 0.9 }),
                        h('circle', {
                          className: 'gk-ring',
                          cx: 0,
                          cy: 0,
                          r: 40,
                          fill: 'none',
                          stroke: props.goalColor,
                          strokeWidth: 6,
                          opacity: 0.9,
                          style: { animationDelay: '470ms' }
                        }),
                        sparks(LANDING_SPARKS, props.goalColor, props.laneColor, 'l')
                      )
                    : null,
                  h('circle', { cx: 0, cy: 0, r: 40, fill: props.goalColor, opacity: 0.25 }),
                  h('circle', { cx: 0, cy: 0, r: 30, fill: props.goalColor }),
                  h(
                    'text',
                    { x: 0, y: 12, textAnchor: 'middle', fontSize: 34, style: { fontFamily: 'inherit' } },
                    props.goal
                  )
                )
              : null,
            sprite('b', pos.b, props.styleB, props.seedB, props.colorB, props.nameB, seen.nb, props.optionsB, props.patternB),
            sprite('a', pos.a, props.styleA, props.seedA, props.colorA, props.nameA, seen.na, props.optionsA, props.patternA)
          )
        );
      };
    },

    defaultCss: { display: 'block' },

    inputProps: {
      path: {
        type: 'string',
        displayName: 'Course',
        group: 'Course',
        default: DEFAULT_PATH,
        description:
          'An SVG path in a 1000 × 420 box. The rockets follow it from its start to its end. Left at the default, Course Shape picks one of three built-in courses; any other path is drawn as given.'
      },
      aspect: {
        type: {
          name: 'enum',
          enums: [
            { value: 'auto', label: 'Fit the box' },
            { value: 'wide', label: 'Wide' },
            { value: 'compact', label: 'Compact' },
            { value: 'tall', label: 'Tall' }
          ]
        },
        displayName: 'Course Shape',
        group: 'Course',
        default: 'auto',
        description:
          "Fit the box picks the course by the node's own width ÷ height: wide at 1.9 or more, compact at 1.05 or more, tall below that. Give the node (or the Group around it) a height for it to choose; with no height it draws the wide course. A Course of your own always wins."
      },
      goal: { type: 'string', displayName: 'Goal Glyph', group: 'Course', default: '🪐' },
      progressA: {
        type: 'number',
        displayName: 'Progress A',
        group: 'Rockets',
        default: 0,
        description: '0 at the start, 1 at the planet. Drive it from an Animate To Value node for a smooth move.'
      },
      progressB: { type: 'number', displayName: 'Progress B', group: 'Rockets', default: 0 },
      showB: {
        type: 'boolean',
        displayName: 'Show Rocket B',
        group: 'Rockets',
        default: true,
        description: 'Off for a solo run against the clock.'
      },
      rocketSize: {
        type: { name: 'number', units: ['px'], defaultUnit: 'px' },
        displayName: 'Rocket Size',
        group: 'Rockets',
        default: ROCKET_SIZE_DEFAULT,
        description:
          'The shortest a rocket is drawn, nose to tail, in screen pixels. On a small track the rockets, the lanes, the names and the planet grow to it; a big track keeps its natural size. 0 turns the floor off.'
      },
      // P88 GAM-017: a signal. Before the bridge could deliver one, Boost was a number the page had to count up; a signal
      // prop now reaches the component as exactly that count (from 0, one per pulse), so the burst code below is unchanged.
      burstA: {
        type: 'signal',
        displayName: 'Boost A',
        group: 'Rewards',
        description: 'Sparks burst from rocket A each time this fires. Wire a right answer into it.'
      },
      burstB: { type: 'signal', displayName: 'Boost B', group: 'Rewards', description: 'The same, for rocket B.' },
      targetA: {
        type: 'number',
        displayName: 'Target A',
        group: 'Rewards',
        default: 0,
        description:
          'Where rocket A is heading: the value its Progress glides to, before the glide. Each time it rises, the stretch that move gained lights up in the rocket’s colour for a few seconds. A fall (a restart) lights nothing.'
      },
      targetB: { type: 'number', displayName: 'Target B', group: 'Rewards', default: 0, description: 'The same, for rocket B.' },
      celebrate: {
        type: 'boolean',
        displayName: 'Celebrate',
        group: 'Rewards',
        default: true,
        description:
          'Draws the bursts, and rings round the planet when a rocket lands. With reduced motion on, the burst is skipped and the ring stays still.'
      },
      nameA: { type: 'string', displayName: 'Name A', group: 'Rockets', default: '' },
      nameB: { type: 'string', displayName: 'Name B', group: 'Rockets', default: '' },
      styleA: { type: { name: 'enum', enums: AVATAR_STYLE_ENUM }, displayName: 'Avatar Style A', group: 'Rockets', default: 'pixel-art' },
      seedA: { type: 'string', displayName: 'Avatar Seed A', group: 'Rockets', default: 'Rocket' },
      styleB: { type: { name: 'enum', enums: AVATAR_STYLE_ENUM }, displayName: 'Avatar Style B', group: 'Rockets', default: 'thumbs' },
      seedB: { type: 'string', displayName: 'Avatar Seed B', group: 'Rockets', default: 'Computer' },
      optionsA: { type: 'object', displayName: 'Avatar Options A', group: 'Rockets', description: 'What rocket A’s face wears: the Avatar node’s Options, for Style A.' },
      optionsB: { type: 'object', displayName: 'Avatar Options B', group: 'Rockets', description: 'The same, for rocket B.' },
      patternA: {
        type: { name: 'enum', enums: [{ value: '', label: 'None' }].concat(PATTERN_IDS.map(function (id) { return { value: id, label: id.charAt(0).toUpperCase() + id.slice(1) }; })) },
        displayName: 'Pattern A',
        group: 'Style',
        default: '',
        description: 'A decal drawn over rocket A’s paint and clipped to its hull: polka dots, racing stripes, a checkerboard, chevrons, flames, stars or a lightning bolt. None leaves the paint plain.'
      },
      patternB: { type: { name: 'enum', enums: [{ value: '', label: 'None' }].concat(PATTERN_IDS.map(function (id) { return { value: id, label: id.charAt(0).toUpperCase() + id.slice(1) }; })) }, displayName: 'Pattern B', group: 'Style', default: '', description: 'The same, for rocket B.' },
      colorA: { type: 'color', displayName: 'Colour A', group: 'Style', default: 'var(--primary)' },
      colorB: { type: 'color', displayName: 'Colour B', group: 'Style', default: 'var(--accent-foreground)' },
      trackColor: { type: 'color', displayName: 'Track', group: 'Style', default: 'var(--surface-raised)' },
      laneColor: { type: 'color', displayName: 'Lane Line', group: 'Style', default: 'var(--border-strong)' },
      goalColor: { type: 'color', displayName: 'Planet', group: 'Style', default: 'var(--accent)' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Keyboard Map — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  var LAYOUTS = {
    azerty: {
      rows: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
        ['w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!']
      ],
      home: ['q', 's', 'd', 'f', 'j', 'k', 'l', 'm'],
      bumps: ['f', 'j']
    },
    qwerty: {
      rows: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
      ],
      home: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
      bumps: ['f', 'j']
    }
  };
  // P87 RKT-008 AC7: a UK keyboard shares every letter and every key this map draws with a US one; it has its own name so a child's
  // choice of "UK" is kept, not so it draws anything different.
  LAYOUTS['qwerty-uk'] = LAYOUTS.qwerty;

  /** Column → finger. The zoning every typing course shares; the palette is this kit's own. */
  var FINGER_BY_COLUMN = ['pinky', 'ring', 'middle', 'index', 'index', 'index', 'index', 'middle', 'ring', 'pinky'];
  var ROW_OFFSETS = [0, 0.5, 0.75, 1.25];

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var KeyboardMap = {
    name: 'game-kit.KeyboardMap',
    displayNodeName: 'Keyboard Map',
    docs:
      'An on-screen keyboard, AZERTY or QWERTY, with one colour per finger and the next key to press lit ' +
      'up. It draws; the graph decides which key is next and which layout the person has.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    getReactComponent: function () {
      return function KeyboardMapComponent(props) {
        var el = React.useRef(null);
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(el.current);
        }, []);
        var layout = LAYOUTS[props.layout] || LAYOUTS.azerty;
        var next = String(props.nextKey || '').toLowerCase();
        var pressed = String(props.pressedKey || '').toLowerCase();
        // RKT-012: a refused key flashes for a moment while the next key stays lit. Wrong Count starts a flash, not Wrong Key,
        // so the same wrong key pressed twice flashes twice.
        var wrong = String(props.wrongKey || '').toLowerCase();
        var wrongCount = Number(props.wrongCount) || 0;
        var flashState = React.useState(wrongCount > 0 ? wrong : '');
        React.useEffect(
          function () {
            if (!(wrongCount > 0)) {
              flashState[1]('');
              return undefined;
            }
            flashState[1](wrong);
            var t = setTimeout(function () {
              flashState[1]('');
            }, 450);
            return function () {
              clearTimeout(t);
            };
          },
          [wrongCount]
        );
        var flash = flashState[0];
        var size = padPx(props.keySize, 34);
        var gap = Math.round(size * 0.18);
        var showFingers = flag(props.showFingers, true);
        var showDigits = flag(props.showDigits, true);
        var colours = {
          pinky: props.pinkyColor,
          ring: props.ringColor,
          middle: props.middleColor,
          index: props.indexColor,
          thumb: props.thumbColor
        };

        var rows = layout.rows.filter(function (_, i) {
          return showDigits || i > 0;
        });

        var keyEl = function (key, col, rowIndex) {
          var finger = FINGER_BY_COLUMN[Math.min(col, FINGER_BY_COLUMN.length - 1)];
          var isNext = next !== '' && key === next;
          var isPressed = pressed !== '' && key === pressed;
          var isWrong = flash !== '' && key === flash && !isNext;
          var isHome = layout.home.indexOf(key) !== -1;
          var bg = showFingers ? colours[finger] : props.keyColor;
          return h(
            'div',
            {
              key: rowIndex + '-' + key,
              'data-key': key,
              'data-next': isNext ? 'true' : undefined,
              'data-wrong': isWrong ? 'true' : undefined,
              style: {
                width: size + 'px',
                height: size + 'px',
                borderRadius: Math.round(size * 0.2) + 'px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.round(size * 0.45) + 'px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: isNext ? props.highlightTextColor : isWrong ? props.wrongTextColor : props.textColor,
                background: isNext ? props.highlightColor : isWrong ? props.wrongColor : bg,
                boxShadow: isNext
                  ? '0 0 0 3px ' + props.highlightColor + ', 0 4px 0 rgba(0,0,0,0.25)'
                  : isWrong
                  ? '0 0 0 3px ' + props.wrongColor
                  : isPressed
                  ? 'inset 0 2px 0 rgba(0,0,0,0.25)'
                  : '0 3px 0 rgba(0,0,0,0.25)',
                transform: isPressed ? 'translateY(2px)' : isNext ? 'scale(1.12)' : 'none',
                transition: 'transform 80ms ease-out, background 120ms ease-out',
                position: 'relative',
                userSelect: 'none'
              }
            },
            key,
            isHome && layout.bumps.indexOf(key) !== -1
              ? h('span', {
                  style: {
                    position: 'absolute',
                    bottom: '4px',
                    width: '10px',
                    height: '2px',
                    borderRadius: '1px',
                    background: 'rgba(0,0,0,0.45)'
                  }
                })
              : null
          );
        };

        var rowEls = rows.map(function (keys, i) {
          var rowIndex = showDigits ? i : i + 1;
          return h(
            'div',
            {
              key: 'row' + rowIndex,
              style: {
                display: 'flex',
                gap: gap + 'px',
                marginLeft: Math.round(ROW_OFFSETS[rowIndex] * size) + 'px'
              }
            },
            keys.map(function (k, col) {
              return keyEl(k, col, rowIndex);
            })
          );
        });

        var spaceNext = next === ' ' || next === 'space';
        var spaceWrong = flash === ' ' && !spaceNext;
        rowEls.push(
          h(
            'div',
            { key: 'space', style: { display: 'flex', gap: gap + 'px', marginLeft: Math.round(2.5 * size) + 'px' } },
            h('div', {
              'data-key': ' ',
              'data-next': spaceNext ? 'true' : undefined,
              'data-wrong': spaceWrong ? 'true' : undefined,
              style: {
                width: Math.round(5 * size + 4 * gap) + 'px',
                height: Math.round(size * 0.8) + 'px',
                borderRadius: Math.round(size * 0.2) + 'px',
                background: spaceNext ? props.highlightColor : spaceWrong ? props.wrongColor : showFingers ? colours.thumb : props.keyColor,
                boxShadow: spaceNext ? '0 0 0 3px ' + props.highlightColor : spaceWrong ? '0 0 0 3px ' + props.wrongColor : '0 3px 0 rgba(0,0,0,0.25)'
              }
            })
          )
        );

        return h(
          'div',
          {
            ref: el,
            style: Object.assign(
              { display: 'inline-flex', flexDirection: 'column', gap: gap + 'px', padding: gap + 'px' },
              props.style
            )
          },
          rowEls
        );
      };
    },

    defaultCss: { display: 'inline-flex' },

    inputProps: {
      layout: {
        type: { name: 'enum', enums: [{ value: 'azerty', label: 'AZERTY (French)' }, { value: 'qwerty', label: 'QWERTY' }, { value: 'qwerty-uk', label: 'QWERTY (UK)' }] },
        displayName: 'Layout',
        group: 'Keyboard',
        default: 'azerty'
      },
      nextKey: {
        type: 'string',
        displayName: 'Next Key',
        group: 'Keyboard',
        default: '',
        description: 'The key to light up — one character, or "space". Empty lights nothing.'
      },
      pressedKey: {
        type: 'string',
        displayName: 'Pressed Key',
        group: 'Keyboard',
        default: '',
        description: 'A key to show pressed down. Clear it after a moment from the graph.'
      },
      wrongKey: {
        type: 'string',
        displayName: 'Wrong Key',
        group: 'Keyboard',
        default: '',
        description: 'A key pressed by mistake, flashed for a moment in the Wrong Key colour. The Next Key stays lit.'
      },
      wrongCount: {
        type: 'number',
        displayName: 'Wrong Count',
        group: 'Keyboard',
        default: 0,
        description: 'Starts the flash: wire a mistake count here (an Answer Pad\'s Mistakes), so the same wrong key twice flashes twice. 0 clears it.'
      },
      showFingers: { type: 'boolean', displayName: 'Colour By Finger', group: 'Keyboard', default: true },
      showDigits: { type: 'boolean', displayName: 'Show Digit Row', group: 'Keyboard', default: true },
      keySize: {
        type: { name: 'number', units: ['px'], defaultUnit: 'px' },
        displayName: 'Key Size',
        group: 'Keyboard',
        default: 34
      },
      // The finger palette. Literal on purpose: a design system has no token
      // for "ring finger", and the five must be told apart at a glance.
      pinkyColor: { type: 'color', displayName: 'Little Finger', group: 'Fingers', default: '#f9a8d4' },
      ringColor: { type: 'color', displayName: 'Ring Finger', group: 'Fingers', default: '#fcd34d' },
      middleColor: { type: 'color', displayName: 'Middle Finger', group: 'Fingers', default: '#86efac' },
      indexColor: { type: 'color', displayName: 'Index Finger', group: 'Fingers', default: '#93c5fd' },
      thumbColor: { type: 'color', displayName: 'Thumb', group: 'Fingers', default: '#d4d4d8' },
      keyColor: { type: 'color', displayName: 'Key', group: 'Style', default: 'var(--surface-raised)' },
      textColor: { type: 'color', displayName: 'Key Text', group: 'Style', default: '#18181b' },
      highlightColor: { type: 'color', displayName: 'Next Key Colour', group: 'Style', default: 'var(--primary)' },
      highlightTextColor: { type: 'color', displayName: 'Next Key Text', group: 'Style', default: 'var(--primary-foreground)' },
      wrongColor: { type: 'color', displayName: 'Wrong Key Colour', group: 'Style', default: 'var(--destructive)' },
      wrongTextColor: { type: 'color', displayName: 'Wrong Key Text', group: 'Style', default: 'var(--destructive-foreground)' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Answer Pad — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * P87 RKT-005. A French keyboard puts the digits on Shift, and a tablet's keyboard covers half the game. The pad is an
   * answer box and a row of keys the graph names, and it OWNS the answer string, because only something holding the
   * field itself can do the two things the graph cannot (D60):
   *
   * - **Type at the caret of a focused field.** Text Input's Set abstains while the field has focus (it must not fight a
   *   typist), so a pad writing through Value/Set is dropped exactly while a child has the caret in the box.
   * - **Read a key's `code`.** In a numeric pad, `Digit4` enters 4 whatever the layout or Shift says; AZERTY sends `'`.
   *
   * Under a finger (`pointer: coarse`) a numeric pad's box is display-only, so no soft keyboard opens. A typing pad always
   * keeps a real box: a typing lesson needs the letters.
   */
  var DIGIT_CODE = /^(?:Digit|Numpad)([0-9])$/;

  /**
   * P87 RKT-008 AC7. Which keyboard a child has, from one key press: the physical key (`code`) against the character it typed (`key`).
   * `KeyQ` typing "a" is AZERTY; `KeyQ` typing "q" is QWERTY. An unshifted digit-row key that types "&", "é", "(" … is AZERTY (its
   * digits are on Shift). Returns 'azerty', 'qwerty', or null when the press says nothing: a chord, Shift on the digit row, an unshifted
   * digit (Caps Lock on a French Mac types digits too), or a key both layouts share.
   */
  var LAYOUT_PROBES = {
    KeyQ: { a: 'azerty', q: 'qwerty' },
    KeyA: { q: 'azerty', a: 'qwerty' },
    KeyW: { z: 'azerty', w: 'qwerty' },
    KeyZ: { w: 'azerty', z: 'qwerty' },
    KeyM: { ',': 'azerty', m: 'qwerty' },
    Semicolon: { m: 'azerty' }
  };
  var AZERTY_DIGIT_ROW = '&é"\'(-§è_!çà';
  function layoutFromKey(code, key, shift, chord) {
    if (chord || typeof code !== 'string' || typeof key !== 'string' || key.length !== 1) return null;
    var k = key.toLowerCase();
    var probe = LAYOUT_PROBES[code];
    if (probe) return probe[k] || null;
    if (/^Digit[0-9]$/.test(code) && !shift && AZERTY_DIGIT_ROW.indexOf(k) !== -1) return 'azerty';
    return null;
  }

  /** A key press in a numeric pad: the digit its CODE names, or null (a chord, anything else, or not numeric). */
  function digitFromCode(code, numeric, chord) {
    if (!numeric || chord) return null;
    var m = DIGIT_CODE.exec(String(code || ''));
    return m ? m[1] : null;
  }

  /** A selection [start, end) inside `s`, clamped; a missing one is the end of the text. */
  function clampSelection(s, start, end) {
    var a = typeof start === 'number' ? Math.max(0, Math.min(start, s.length)) : s.length;
    var b = typeof end === 'number' ? Math.max(a, Math.min(end, s.length)) : a;
    return [a, b];
  }

  /** `text` with `ch` typed over the selection, and where the caret lands. */
  function insertAt(text, ch, start, end) {
    var s = String(text || '');
    var sel = clampSelection(s, start, end);
    return { text: s.slice(0, sel[0]) + ch + s.slice(sel[1]), caret: sel[0] + ch.length };
  }

  /** Backspace: the selection when there is one, otherwise the character before the caret. */
  function backspaceAt(text, start, end) {
    var s = String(text || '');
    var sel = clampSelection(s, start, end);
    if (sel[1] > sel[0]) return { text: s.slice(0, sel[0]) + s.slice(sel[1]), caret: sel[0] };
    if (sel[0] === 0) return { text: s, caret: 0 };
    return { text: s.slice(0, sel[0] - 1) + s.slice(sel[0]), caret: sel[0] - 1 };
  }

  /** One key per distinct character of Keys, in order; whitespace is not a key. */
  function padKeyList(keys) {
    var out = [];
    var chars = Array.from(String(keys || ''));
    for (var i = 0; i < chars.length; i++) {
      if (/\s/.test(chars[i]) || out.indexOf(chars[i]) !== -1) continue;
      out.push(chars[i]);
    }
    return out;
  }

  /**
   * P87 RKT-012. A pad that knows the word refuses a key that does not continue it: the text after the key must be the start of
   * Expected, letter case aside. An empty Expected accepts every key (maths, a custom set).
   */
  function acceptsTyping(expected, next) {
    var want = String(expected || '');
    if (want === '') return true;
    return want.toLowerCase().indexOf(String(next || '').toLowerCase()) === 0;
  }

  /** The first character of `text` that Expected does not have at that place: the key a refused edit typed. */
  function wrongCharacter(expected, text) {
    var want = String(expected || '').toLowerCase();
    var got = String(text || '');
    for (var i = 0; i < got.length; i++) {
      if (got.charAt(i).toLowerCase() !== want.charAt(i)) return got.charAt(i);
    }
    return '';
  }

  /** `display` (no keyboard can open) or `input`. Auto: display only for a numeric pad under a finger. */
  function padFieldMode(field, numeric, coarse) {
    if (field === 'display' || field === 'input') return field;
    return numeric && coarse ? 'display' : 'input';
  }

  function coarsePointer() {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  }

  /**
   * A px port as a number: 48, "48px" and { value: 48, unit: 'px' } all read 48. P88 GAM-015 measured what the bridge delivers: the
   * string "48px", for a wired size and a typed one alike; `{ value, unit }` is only what the port's setter receives. D65: the Avatar
   * read `Number(props.size) || 64`, so a wired Size drew at 64 whatever it asked for (the header's 40, the hangar preview's 96).
   * Kept rather than swapped for the scaffold's stricter `readPx`: it reads the same "48px", and a kit's own fallback for 0 is its call.
   */
  function padPx(v, whenUnset) {
    var n = v && typeof v === 'object' ? Number(v.value) : parseFloat(v);
    return isFinite(n) && n > 0 ? n : whenUnset;
  }

  /**
   * Pressed keys sink. RKT-012: a refused key shakes the box. Two identical shakes, so a second refusal inside the first
   * restarts it by swapping the class; reduced motion stills both and keeps the red outline.
   */
  var PAD_SHAKE = '{ 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }';
  var PAD_CSS =
    '.gk-pad-key:active { transform: translateY(2px); box-shadow: none !important; }\n' +
    '.gk-pad-key:focus-visible, .gk-pad-field:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }\n' +
    '.gk-pad-field::placeholder { color: inherit; opacity: 0.45; }\n' +
    '@keyframes gk-pad-shake-a ' + PAD_SHAKE + '\n' +
    '@keyframes gk-pad-shake-b ' + PAD_SHAKE + '\n' +
    '.gk-pad-wrong-a { animation: gk-pad-shake-a 320ms ease-in-out; }\n' +
    '.gk-pad-wrong-b { animation: gk-pad-shake-b 320ms ease-in-out; }\n' +
    '@media (prefers-reduced-motion: reduce) { .gk-pad-wrong-a { animation: none; } .gk-pad-wrong-b { animation: none; } }';

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var AnswerPad = {
    name: 'game-kit.AnswerPad',
    displayNodeName: 'Answer Pad',
    docs:
      'An answer box with keys to tap: digits and a decimal point for maths, accented letters for typing. It owns the ' +
      'answer, publishes Text after every key and Submitted on the check key or Enter. In a numeric pad a digit key on ' +
      'the keyboard enters its digit whatever the layout or Shift says, and on a touch screen the box is display-only, ' +
      'so no soft keyboard opens. A new Question clears it.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    /** The pure parts, for the kit gate. */
    logic: { digitFromCode: digitFromCode, layoutFromKey: layoutFromKey, insertAt: insertAt, backspaceAt: backspaceAt, padKeyList: padKeyList, padFieldMode: padFieldMode, acceptsTyping: acceptsTyping, wrongCharacter: wrongCharacter, css: PAD_CSS },

    getReactComponent: function () {
      return function AnswerPadComponent(props) {
        var root = React.useRef(null);
        var field = React.useRef(null);
        var caret = React.useRef(null);
        var textState = React.useState('');
        var text = textState[0];
        var coarseState = React.useState(coarsePointer);
        var numeric = flag(props.numeric, true);
        var enabled = flag(props.enabled, true);
        var mode = padFieldMode(props.field, numeric, coarseState[0]);
        var keys = padKeyList(props.keys);
        var expected = String(props.expected || '');
        // RKT-012: the mistakes on this question, and the one the box is flashing for (0 = not flashing).
        var mistakes = React.useRef(0);
        var wrongState = React.useState(0);
        var wrongN = wrongState[0];
        // The key listener is registered once; it reads the latest of everything through this ref.
        var live = React.useRef({});
        live.current = { text: text, numeric: numeric, enabled: enabled, mode: mode, keys: keys, expected: expected, onText: props.onText, onSubmit: props.onSubmit, onLayout: props.onLayout, onLayoutSeen: props.onLayoutSeen, onWrongKey: props.onWrongKey, onMistakes: props.onMistakes, onMistake: props.onMistake };
        // RKT-008 AC7: the last layout this pad reported, so a keyboard is reported once per pad, not once per key.
        var lastLayout = React.useRef(null);

        var publish = function (next, at) {
          live.current.text = next;
          caret.current = at;
          textState[1](next);
          if (typeof live.current.onText === 'function') live.current.onText(next);
        };
        var selection = function () {
          var f = field.current;
          var len = live.current.text.length;
          if (live.current.mode === 'input' && f && typeof document !== 'undefined' && document.activeElement === f && typeof f.selectionStart === 'number') {
            return [f.selectionStart, f.selectionEnd];
          }
          return [len, len];
        };
        // RKT-012: a key that does not continue the word never reaches the box. It is counted, the box flashes, and the graph
        // is told which key, so the keyboard can flash it too.
        var refuse = function (ch) {
          mistakes.current += 1;
          var n = mistakes.current;
          wrongState[1](n);
          if (typeof live.current.onWrongKey === 'function') live.current.onWrongKey(String(ch || ''));
          if (typeof live.current.onMistakes === 'function') live.current.onMistakes(n);
          if (typeof live.current.onMistake === 'function') live.current.onMistake();
        };
        var type = function (ch) {
          if (!live.current.enabled) return;
          var s = selection();
          var r = insertAt(live.current.text, ch, s[0], s[1]);
          if (!acceptsTyping(live.current.expected, r.text)) return refuse(ch);
          publish(r.text, r.caret);
        };
        var back = function () {
          if (!live.current.enabled) return;
          var s = selection();
          var r = backspaceAt(live.current.text, s[0], s[1]);
          publish(r.text, r.caret);
        };
        var submit = function () {
          if (live.current.enabled && typeof live.current.onSubmit === 'function') live.current.onSubmit();
        };

        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(root.current);
        }, []);

        // A new question clears the answer and its mistakes; the first render publishes the empty answer and 0.
        React.useEffect(
          function () {
            publish('', 0);
            mistakes.current = 0;
            wrongState[1](0);
            if (typeof live.current.onMistakes === 'function') live.current.onMistakes(0);
          },
          [props.question]
        );

        // RKT-012: the flash lasts a moment. The count, not a boolean, so a second refusal restarts it.
        React.useEffect(
          function () {
            if (!wrongN) return undefined;
            var t = setTimeout(function () {
              wrongState[1](0);
            }, 450);
            return function () {
              clearTimeout(t);
            };
          },
          [wrongN]
        );

        // Once the box shows the edit, the caret goes back where the edit left it.
        React.useEffect(
          function () {
            var f = field.current;
            if (f && caret.current !== null && typeof document !== 'undefined' && document.activeElement === f && typeof f.setSelectionRange === 'function') {
              f.setSelectionRange(caret.current, caret.current);
            }
            caret.current = null;
          },
          [text]
        );

        React.useEffect(function () {
          if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
          var mq = window.matchMedia('(pointer: coarse)');
          var onChange = function () {
            coarseState[1](mq.matches);
          };
          if (mq.addEventListener) mq.addEventListener('change', onChange);
          else if (mq.addListener) mq.addListener(onChange);
          return function () {
            if (mq.removeEventListener) mq.removeEventListener('change', onChange);
            else if (mq.removeListener) mq.removeListener(onChange);
          };
        }, []);

        // The keyboard. A digit by its code in a numeric pad; Enter submits; with nothing else holding the keyboard,
        // Backspace and the pad's own characters work too. A focused control that is not the box (one of the pad's
        // own keys, reached with Tab) keeps its keys.
        React.useEffect(function () {
          if (typeof window === 'undefined') return undefined;
          var onKey = function (e) {
            var now = live.current;
            // RKT-008 AC7: any press says which keyboard this is, even while the pad waits (a disabled pad, or focus elsewhere).
            var seen = layoutFromKey(e.code, e.key, e.shiftKey, e.ctrlKey || e.metaKey || e.altKey);
            if (seen && seen !== lastLayout.current) {
              lastLayout.current = seen;
              if (typeof now.onLayout === 'function') now.onLayout(seen);
              if (typeof now.onLayoutSeen === 'function') now.onLayoutSeen();
            }
            if (!now.enabled || e.defaultPrevented) return;
            var active = document.activeElement;
            var inField = !!field.current && active === field.current;
            var free = !active || active === document.body || active === document.documentElement;
            if (!inField && !free) return;
            var chord = e.ctrlKey || e.metaKey || e.altKey;
            var digit = digitFromCode(e.code, now.numeric, chord);
            if (digit !== null) {
              e.preventDefault();
              type(digit);
              return;
            }
            if (chord) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
              return;
            }
            // RKT-012: in the box too, a letter that does not continue the word is stopped before the box shows it.
            if (inField && now.expected && e.key && e.key.length === 1) {
              var s = selection();
              if (!acceptsTyping(now.expected, insertAt(now.text, e.key, s[0], s[1]).text)) {
                e.preventDefault();
                refuse(e.key);
              }
              return;
            }
            if (inField) return; // the box types its own letters and its own Backspace
            if (e.key === 'Backspace') {
              e.preventDefault();
              back();
            } else if (e.key && e.key.length === 1 && now.keys.indexOf(e.key) !== -1) {
              e.preventDefault();
              type(e.key);
            }
          };
          window.addEventListener('keydown', onKey);
          return function () {
            window.removeEventListener('keydown', onKey);
          };
        }, []);

        var size = padPx(props.keySize, 48);
        var gap = Math.max(4, Math.round(size * 0.14));
        var ink = props.borderColor;
        var font = props.fontFamily || 'inherit';
        var keyStyle = function (extra) {
          return Object.assign(
            {
              minWidth: size + 'px',
              height: size + 'px',
              padding: '0 ' + Math.round(size * 0.22) + 'px',
              margin: 0,
              borderRadius: props.radius,
              border: '2px solid ' + ink,
              boxShadow: '0 3px 0 ' + ink,
              background: props.keyColor,
              color: props.textColor,
              fontFamily: font,
              fontSize: Math.round(size * 0.46) + 'px',
              fontWeight: 800,
              lineHeight: 1,
              cursor: enabled ? 'pointer' : 'default',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              flex: '0 0 auto'
            },
            extra
          );
        };
        // A pad key never takes the focus from the box, so the caret stays where the child left it.
        var keepFocus = function (e) {
          e.preventDefault();
        };
        var fieldStyle = {
          width: padPx(props.fieldWidth, 220) + 'px',
          maxWidth: '100%',
          height: size + 'px',
          boxSizing: 'border-box',
          margin: 0,
          padding: '0 ' + Math.round(size * 0.25) + 'px',
          borderRadius: props.radius,
          border: '2px solid ' + (wrongN ? props.wrongColor : ink),
          boxShadow: wrongN ? '0 0 0 3px ' + props.wrongColor : undefined,
          background: props.fieldColor,
          color: props.textColor,
          fontFamily: font,
          fontSize: props.fieldFontSize,
          fontWeight: 700,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        };
        var fieldClass = 'gk-pad-field' + (wrongN ? (wrongN % 2 ? ' gk-pad-wrong-a' : ' gk-pad-wrong-b') : '');
        var wrongAttr = wrongN ? String(wrongN) : undefined;
        var fieldEl =
          mode === 'display'
            ? h(
                'div',
                { key: 'field', ref: field, className: fieldClass, role: 'textbox', 'aria-readonly': 'true', 'aria-label': props.fieldLabel, 'data-pad-field': 'display', 'data-pad-text': text, 'data-pad-wrong': wrongAttr, style: fieldStyle },
                text || h('span', { style: { opacity: 0.45 } }, props.placeholder || '')
              )
            : h('input', {
                key: 'field',
                ref: field,
                className: fieldClass,
                type: 'text',
                value: text,
                placeholder: props.placeholder || '',
                'aria-label': props.fieldLabel,
                'data-pad-field': 'input',
                'data-pad-text': text,
                'data-pad-wrong': wrongAttr,
                inputMode: numeric ? 'decimal' : 'text',
                enterKeyHint: 'done',
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: false,
                disabled: !enabled,
                onChange: function (e) {
                  var next = e.target.value;
                  // RKT-012: what the key listener cannot see (a tablet's keyboard, a dead-key accent, a paste) is checked here.
                  // The box is controlled, so a refused edit is drawn back to the text it had.
                  if (!acceptsTyping(live.current.expected, next)) {
                    refuse(wrongCharacter(live.current.expected, next));
                    return;
                  }
                  publish(next, null);
                },
                style: fieldStyle
              });
        var submitEl = h(
          'button',
          { key: 'submit', type: 'button', className: 'gk-pad-key', 'data-pad-submit': 'true', disabled: !enabled, onMouseDown: keepFocus, onClick: submit, style: keyStyle({ background: props.submitColor, color: props.submitTextColor, padding: '0 ' + Math.round(size * 0.4) + 'px' }) },
          props.submitLabel || '✓'
        );
        var keyEls = keys.map(function (ch) {
          return h(
            'button',
            { key: 'k-' + ch, type: 'button', className: 'gk-pad-key', 'data-pad-key': ch, disabled: !enabled, onMouseDown: keepFocus, onClick: function () { type(ch); }, style: keyStyle() },
            ch
          );
        });
        // RKT-012: a pad that knows the word draws ⌫ beside the box, where a child who has never used Backspace is looking.
        // It is faint while there is nothing to delete. A strip without Expected keeps ⌫ at the end of its keys.
        var backBeside = expected !== '';
        var backEl = function (beside) {
          return h(
            'button',
            { key: beside ? 'back-beside' : 'back', type: 'button', className: 'gk-pad-key', 'data-pad-back': beside ? 'beside' : 'true', 'aria-label': props.backLabel, title: props.backLabel, disabled: !enabled, onMouseDown: keepFocus, onClick: back, style: keyStyle(beside ? { opacity: text ? 1 : 0.45 } : undefined) },
            '⌫'
          );
        };
        if (keyEls.length && !backBeside) keyEls.push(backEl(false));

        return h(
          'div',
          { ref: root, className: 'gk-pad', style: Object.assign({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: gap + 'px', width: '100%' }, props.style) },
          h('style', { key: 'css' }, PAD_CSS),
          h('div', { key: 'answer', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: gap + 'px', maxWidth: '100%' } }, fieldEl, backBeside ? backEl(true) : null, submitEl),
          keyEls.length ? h('div', { key: 'keys', role: 'group', 'aria-label': props.keysLabel, style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: gap + 'px', maxWidth: '100%' } }, keyEls) : null
        );
      };
    },

    defaultCss: { display: 'flex' },

    inputProps: {
      keys: {
        type: 'string',
        displayName: 'Keys',
        group: 'Pad',
        default: '1234567890',
        description: 'The characters to draw as keys, in order, one key each: "1234567890," for French maths, "âèéê" for a typing strip. Empty draws only the box and the check key.'
      },
      numeric: {
        type: 'boolean',
        displayName: 'Numeric',
        group: 'Pad',
        default: true,
        description: 'A numeric answer. A digit key on the keyboard enters its digit whatever the layout or Shift says (AZERTY puts the digits on Shift), the box asks a tablet for a number keypad, and on a touch screen the box is display-only.'
      },
      field: {
        type: { name: 'enum', enums: [{ value: 'auto', label: 'Auto' }, { value: 'input', label: 'Always a text box' }, { value: 'display', label: 'Display only' }] },
        displayName: 'Box',
        group: 'Pad',
        default: 'auto',
        description: 'Auto: display-only for a numeric pad on a touch screen, so no soft keyboard opens; a real text box otherwise.'
      },
      question: { type: 'string', displayName: 'Question', group: 'Pad', default: '', description: 'Anything that changes with the question. A new value clears the answer.' },
      expected: {
        type: 'string',
        displayName: 'Expected',
        group: 'Pad',
        default: '',
        description: 'The word being typed, for a typing lesson. Set, a key that does not continue it is refused (letter case aside): the box flashes, Mistakes counts it, Wrong Key names it, and ⌫ is drawn beside the box. Empty accepts every key.'
      },
      enabled: { type: 'boolean', displayName: 'Enabled', group: 'Pad', default: true, description: 'False ignores every key, the box and Enter.' },
      placeholder: { type: 'string', displayName: 'Placeholder', group: 'Text', default: '…' },
      submitLabel: { type: 'string', displayName: 'Check Label', group: 'Text', default: 'Check' },
      fieldLabel: { type: 'string', displayName: 'Box Label', group: 'Text', default: 'Your answer', description: 'What a screen reader calls the box.' },
      keysLabel: { type: 'string', displayName: 'Keys Label', group: 'Text', default: 'Keys', description: 'What a screen reader calls the row of keys.' },
      backLabel: { type: 'string', displayName: 'Delete Label', group: 'Text', default: 'Delete', description: 'What a screen reader calls the ⌫ key.' },
      keySize: { type: { name: 'number', units: ['px'], defaultUnit: 'px' }, displayName: 'Key Size', group: 'Style', default: 48 },
      fieldWidth: { type: { name: 'number', units: ['px'], defaultUnit: 'px' }, displayName: 'Box Width', group: 'Style', default: 220 },
      fieldFontSize: { type: 'string', displayName: 'Box Font Size', group: 'Style', default: 'var(--text-2xl)' },
      fontFamily: { type: 'string', displayName: 'Font', group: 'Style', default: 'inherit' },
      radius: { type: 'string', displayName: 'Corner Radius', group: 'Style', default: 'var(--radius-lg)' },
      keyColor: { type: 'color', displayName: 'Key', group: 'Style', default: 'var(--surface)' },
      textColor: { type: 'color', displayName: 'Key Text', group: 'Style', default: 'var(--foreground)' },
      borderColor: { type: 'color', displayName: 'Outline', group: 'Style', default: 'var(--foreground)' },
      fieldColor: { type: 'color', displayName: 'Box', group: 'Style', default: 'var(--background)' },
      submitColor: { type: 'color', displayName: 'Check Key', group: 'Style', default: 'var(--primary)' },
      submitTextColor: { type: 'color', displayName: 'Check Key Text', group: 'Style', default: 'var(--primary-foreground)' },
      wrongColor: { type: 'color', displayName: 'Wrong Key', group: 'Style', default: 'var(--destructive)', description: 'The box outline while it flashes for a refused key.' }
    },

    outputProps: {
      onText: { type: 'string', displayName: 'Text', group: 'Answer', description: 'The answer as it stands, after every key.' },
      onMistakes: { type: 'number', displayName: 'Mistakes', group: 'Answer', description: 'Keys refused on this question (Expected set). A new Question sets it back to 0.' },
      onWrongKey: { type: 'string', displayName: 'Wrong Key', group: 'Answer', description: 'The character of the last refused key.' },
      onMistake: { type: 'signal', displayName: 'Mistake', group: 'Answer', description: 'A key was refused. Mistakes and Wrong Key already hold it.' },
      onSubmit: { type: 'signal', displayName: 'Submitted', group: 'Answer', description: 'The check key, or Enter. Text already holds the answer.' },
      onLayout: { type: 'string', displayName: 'Layout', group: 'Keyboard', description: 'The keyboard the last telling key press came from: azerty or qwerty. A press that says nothing (a digit, Shift on the digit row, a shared key) leaves it.' },
      onLayoutSeen: { type: 'signal', displayName: 'Layout Seen', group: 'Keyboard', description: 'The first time a key press tells this pad the keyboard, and again only if a later one says a different keyboard. Layout already holds it.' }
    }
  };

  /** @type {import('./types/node-kit').NodeKitModule} */
  var kit = {
    nodes: [Sound, KeepStorage],
    reactNodes: h ? [Avatar, RaceTrack, KeyboardMap, AnswerPad] : []
  };

  Noodl.defineModule(kit);
})();
