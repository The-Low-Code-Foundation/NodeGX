// @ts-check
/**
 * three-kit — three.js as NodeGX nodes. A PROTOTYPE (dev-docs/parked/THREE-IN-NODES.md), 2026-10-19.
 *
 * Four visual nodes. `Scene` draws a WebGL canvas and is a parent; `Mesh`, `Light` and `3D Group` are its children in
 * the structure lane and draw nothing of their own: each one tells the Scene above it what it is, through a React
 * context, and the Scene keeps a three.js object per child. A `3D Group` is a parent too: what is under it moves,
 * turns and scales with it, so a robot is a group of meshes and a For Each of groups is a row of robots. A `For Each` under a Scene therefore makes one mesh per
 * row, the same way it makes one Group per row in the DOM — that is the claim this prototype exists to measure.
 *
 * Hand-written in the shape of `garden-3d-kit`: ES5, no SDK, no bundler for THIS file. `build.mjs` copies it under a
 * banner into `project/noodl_modules/three-kit/index.js`. three.js 0.158.0 is vendored BESIDE it as `three.min.js`
 * (MIT, LICENSE.txt), listed in manifest.json `dependencies`, so the page loads it first and this file reads the
 * `THREE` global — at MOUNT, never at definition (the kit catalog extractor loads `main` alone).
 *
 * The rule: the kit draws, the graph decides. A mesh is where the graph puts it; the Scene never moves one by itself
 * except to spin it when asked. Rendering is ON DEMAND: a still scene draws nothing, a spinning one draws every frame.
 */
(function () {
  // ✅ React is a global the runtime installs before this file runs. Read it bare; never window.React.
  var h = typeof React !== 'undefined' ? React.createElement : null;
  var SceneContext = h ? React.createContext(null) : null;

  var DEG = Math.PI / 180;

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function bool(v) {
    return v === true || v === 'true';
  }

  /** `var(--token)` reaches nothing in WebGL: resolve it on the element, or fall back. */
  function colourOf(v, el, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    var s = String(v);
    if (s.indexOf('var(') === 0 && el && typeof getComputedStyle === 'function') {
      var name = s.slice(4, -1).trim();
      var resolved = getComputedStyle(el).getPropertyValue(name).trim();
      return resolved || fallback;
    }
    return s;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The engine — everything that touches THREE. `create` returns null when WebGL is not there.
  // ═══════════════════════════════════════════════════════════════════════════

  var SHAPES = {
    box: function (T) {
      return new T.BoxGeometry(1, 1, 1);
    },
    sphere: function (T) {
      return new T.SphereGeometry(0.5, 24, 16);
    },
    cylinder: function (T) {
      return new T.CylinderGeometry(0.5, 0.5, 1, 24);
    },
    cone: function (T) {
      return new T.ConeGeometry(0.5, 1, 24);
    },
    torus: function (T) {
      return new T.TorusGeometry(0.4, 0.1, 12, 32);
    },
    plane: function (T) {
      return new T.PlaneGeometry(1, 1);
    }
  };

  function createEngine(T, canvas, opts) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch (e) {
      gl = null;
    }
    if (!gl) return null;

    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch (e) {
      return null;
    }
    renderer.setPixelRatio(Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(45, 1, 0.1, 1000);
    var geometries = {};
    var objects = {}; // id -> { obj, spec }
    var cam = { distance: 12, height: 6, angle: 35, fov: 45, target: new T.Vector3(0, 0, 0) };
    var floor = null;
    var needs = true;
    var raf = 0;
    var last = 0;
    var frames = 0;
    var listeners = opts.listeners;

    function geometry(shape) {
      var make = SHAPES[shape] || SHAPES.box;
      var key = SHAPES[shape] ? shape : 'box';
      if (!geometries[key]) geometries[key] = make(T);
      return geometries[key];
    }

    function placeCamera() {
      var a = cam.angle * DEG;
      camera.fov = cam.fov;
      camera.position.set(cam.target.x + Math.sin(a) * cam.distance, cam.target.y + cam.height, cam.target.z + Math.cos(a) * cam.distance);
      camera.lookAt(cam.target);
      camera.updateProjectionMatrix();
      needs = true;
    }

    function resize(w, hgt) {
      if (w < 1 || hgt < 1) return;
      renderer.setSize(w, hgt, false);
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
      needs = true;
      schedule();
    }

    function anySpin() {
      for (var id in objects) if (objects[id].spec.spin) return true;
      return false;
    }

    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      var spinning = false;
      for (var id in objects) {
        var o = objects[id];
        if (o.spec.spin && (o.kind === 'mesh' || o.kind === 'group')) {
          o.obj.rotation.y += o.spec.spinSpeed * DEG * dt;
          spinning = true;
        }
      }
      if (needs || spinning) {
        renderer.render(scene, camera);
        frames++;
        needs = false;
      }
      if (spinning) raf = requestAnimationFrame(tick);
      else last = 0;
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    /**
     * Put an object under the parent it asked for. React runs a child's effects BEFORE its parent's, so a Mesh inside a
     * 3D Group speaks first: until the group exists the mesh waits in the scene, and the group adopts it when it arrives.
     */
    function attach(o) {
      var want = o.spec.parent && objects[o.spec.parent] ? objects[o.spec.parent].obj : scene;
      if (o.obj.parent !== want) want.add(o.obj);
    }

    function adopt(groupId) {
      for (var id in objects) if (objects[id].spec.parent === groupId) attach(objects[id]);
    }

    function upsert(id, spec) {
      var o = objects[id];
      if (o && o.kind !== spec.kind) {
        remove(id);
        o = null;
      }
      if (spec.kind === 'group') {
        var made = !o;
        if (made) {
          var g = new T.Group();
          g.userData.id = id;
          o = objects[id] = { kind: 'group', obj: g, spec: spec };
        }
        var gr = o.obj;
        var sc = Math.max(0.0001, spec.scale);
        gr.scale.set(sc, sc, sc);
        gr.position.set(spec.x, spec.y, spec.z);
        if (!spec.spin || o.spec.spin !== spec.spin) gr.rotation.y = spec.yaw * DEG;
        o.spec = spec;
        attach(o);
        if (made) adopt(id);
      } else if (spec.kind === 'mesh') {
        if (!o) {
          var mat = new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: spec.shape === 'plane' ? T.DoubleSide : T.FrontSide });
          var mesh = new T.Mesh(geometry(spec.shape), mat);
          mesh.userData.id = id;
          o = objects[id] = { kind: 'mesh', obj: mesh, spec: spec, shape: spec.shape };
        }
        var m = o.obj;
        if (o.shape !== spec.shape) {
          m.geometry = geometry(spec.shape);
          m.material.side = spec.shape === 'plane' ? T.DoubleSide : T.FrontSide;
          m.material.needsUpdate = true;
          o.shape = spec.shape;
        }
        m.material.color.set(spec.colour);
        m.material.wireframe = !!spec.wireframe;
        m.scale.set(spec.w, spec.shape === 'plane' ? spec.d : spec.h, spec.shape === 'plane' ? 1 : spec.d);
        var lift = spec.sit ? (spec.shape === 'plane' ? 0 : spec.h / 2) : 0;
        m.position.set(spec.x, spec.y + lift, spec.z);
        m.rotation.order = 'YXZ';
        if (!spec.spin || o.spec.spin !== spec.spin) m.rotation.y = spec.yaw * DEG;
        m.rotation.x = spec.shape === 'plane' ? -Math.PI / 2 : 0;
        o.spec = spec;
        attach(o);
      } else if (spec.kind === 'light') {
        if (!o || o.lightKind !== spec.light) {
          if (o) remove(id);
          var light;
          if (spec.light === 'sky') light = new T.HemisphereLight(0xffffff, 0x444444, 1);
          else if (spec.light === 'lamp') light = new T.PointLight(0xffffff, 1, 0, 1);
          else light = new T.DirectionalLight(0xffffff, 1);
          light.userData.id = id;
          o = objects[id] = { kind: 'light', obj: light, spec: spec, lightKind: spec.light };
        }
        var l = o.obj;
        l.color.set(spec.colour);
        l.intensity = spec.intensity;
        l.position.set(spec.x, spec.y, spec.z);
        if (spec.light === 'sky' && l.groundColor) l.groundColor.set(spec.ground);
        o.spec = spec;
        attach(o);
      }
      if (objects[id]) objects[id].obj.userData.nodeId = spec.node || '';
      needs = true;
      schedule();
      if (listeners.onCount) listeners.onCount(count());
    }

    function remove(id) {
      var o = objects[id];
      if (!o) return;
      if (o.kind === 'group') for (var c in objects) if (objects[c].spec.parent === id) scene.add(objects[c].obj);
      if (o.obj.parent) o.obj.parent.remove(o.obj);
      if (o.kind === 'mesh') o.obj.material.dispose();
      delete objects[id];
      needs = true;
      schedule();
      if (listeners.onCount) listeners.onCount(count());
    }

    function count() {
      var n = 0;
      for (var id in objects) if (objects[id].kind === 'mesh') n++;
      return n;
    }

    function setLook(look) {
      scene.background = new T.Color(look.background);
      if (look.floor && !floor) {
        floor = new T.GridHelper(20, 20, 0x666666, 0x333333);
        floor.userData.floor = true;
        scene.add(floor);
      } else if (!look.floor && floor) {
        scene.remove(floor);
        floor = null;
      }
      cam.distance = look.distance;
      cam.height = look.height;
      cam.angle = look.angle;
      cam.fov = look.fov;
      placeCamera();
      schedule();
    }

    /** A tap: the nearest mesh under the point, in canvas pixels. */
    function pick(px, py) {
      var r = canvas.getBoundingClientRect();
      var ndc = new T.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
      var ray = new T.Raycaster();
      ray.setFromCamera(ndc, camera);
      var meshes = [];
      for (var id in objects) if (objects[id].kind === 'mesh') meshes.push(objects[id].obj);
      scene.updateMatrixWorld();
      var hits = ray.intersectObjects(meshes, false);
      if (!hits.length) return null;
      return objects[hits[0].object.userData.id] || null;
    }

    /** The mesh and every 3D Group it sits in, innermost first: a tap belongs to all of them. */
    function lineage(o) {
      var out = [];
      var seen = {};
      while (o && !seen[o.obj.userData.id]) {
        seen[o.obj.userData.id] = true;
        out.push(o);
        o = o.spec.parent ? objects[o.spec.parent] : null;
      }
      return out;
    }

    function orbit(dAngle, dHeight) {
      cam.angle += dAngle;
      cam.height = Math.max(-cam.distance, Math.min(cam.distance * 2, cam.height + dHeight));
      placeCamera();
      schedule();
    }

    function zoom(factor) {
      cam.distance = Math.max(1, Math.min(200, cam.distance * factor));
      placeCamera();
      schedule();
    }

    function dispose() {
      if (raf) cancelAnimationFrame(raf);
      for (var id in objects) remove(id);
      for (var k in geometries) geometries[k].dispose();
      renderer.dispose();
    }

    /** What a drive reads: the scene graph, no pixels needed. */
    function census() {
      scene.updateMatrixWorld();
      var out = [];
      for (var id in objects) {
        var o = objects[id];
        var w = o.obj.getWorldPosition(new T.Vector3());
        out.push({ id: id, node: o.spec.node || null, kind: o.kind, name: o.spec.name || null, shape: o.shape || o.lightKind || null, parent: o.spec.parent || null, x: o.obj.position.x, y: o.obj.position.y, z: o.obj.position.z, wx: w.x, wy: w.y, wz: w.z, h: o.obj.scale.y });
      }
      return { meshes: count(), objects: out, frames: frames, camera: { distance: cam.distance, height: cam.height, angle: cam.angle } };
    }

    return { upsert: upsert, remove: remove, resize: resize, setLook: setLook, pick: pick, lineage: lineage, orbit: orbit, zoom: zoom, dispose: dispose, census: census, count: count, anySpin: anySpin, schedule: schedule, camera: camera, scene: scene, renderer: renderer, projectOf: function (id) {
      var o = objects[id];
      if (!o) return null;
      scene.updateMatrixWorld();
      var v = o.obj.getWorldPosition(new T.Vector3()).project(camera);
      var r = canvas.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scene — the parent. Its children are Mesh and Light nodes (and For Each, which makes them).
  // ═══════════════════════════════════════════════════════════════════════════

  var SCENE_CSS = '.tk-scene{position:relative;overflow:hidden;touch-action:none}.tk-scene>canvas{display:block;width:100%;height:100%}.tk-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;color:#888}';

  var Scene = {
    name: 'three-kit.Scene',
    displayName: 'Scene',
    category: '3D',
    description:
      'A three.js scene on a canvas. Put Mesh, Light and 3D Group nodes under it (or a For Each that makes them) and it draws them; ' +
      'the graph says where everything is. A drag orbits the camera and a wheel zooms when Orbit is on. A tap on a mesh fires ' +
      'Tapped with its Name. Supported is false when there is no WebGL: nothing is drawn, nothing throws, Ready never fires.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    allowChildren: true,
    defaultCss: { display: 'block' },

    getReactComponent: function () {
      return function SceneComponent(props) {
        var rootRef = React.useRef(null);
        var canvasRef = React.useRef(null);
        var engRef = React.useRef(null);
        var pendingRef = React.useRef({}); // children that spoke before the engine existed
        var countRef = React.useRef(-1);
        var supportedState = React.useState(null);
        var supported = supportedState[0];
        var setSupported = supportedState[1];
        var background = colourOf(props.background, rootRef.current, '#14181f');
        var look = {
          background: background,
          floor: bool(props.floor),
          distance: num(props.cameraDistance, 12),
          height: num(props.cameraHeight, 6),
          angle: num(props.cameraAngle, 35),
          fov: num(props.fieldOfView, 45)
        };
        var lookKey = JSON.stringify(look);
        var orbitOn = bool(props.orbit);

        // The context the children speak through. Stable for the Scene's life; it reaches the engine through the ref.
        var api = React.useMemo(function () {
          return {
            upsert: function (id, spec) {
              if (engRef.current) engRef.current.upsert(id, spec);
              else pendingRef.current[id] = spec;
            },
            remove: function (id) {
              if (engRef.current) engRef.current.remove(id);
              else delete pendingRef.current[id];
            }
          };
        }, []);

        React.useEffect(function () {
          var T = typeof THREE !== 'undefined' ? THREE : null;
          var canvas = canvasRef.current;
          var root = rootRef.current;
          var eng = T && canvas ? createEngine(T, canvas, {
            listeners: {
              onCount: function (n) {
                if (n === countRef.current) return;
                countRef.current = n;
                if (root) root.setAttribute('data-meshes', String(n));
                if (typeof props.onMeshCount === 'function') props.onMeshCount(n);
              }
            }
          }) : null;
          engRef.current = eng;
          if (!eng) {
            setSupported(false);
            if (typeof props.onSupported === 'function') props.onSupported(false);
            return undefined;
          }
          setSupported(true);
          if (typeof props.onSupported === 'function') props.onSupported(true);
          eng.setLook(look);
          var pending = pendingRef.current;
          pendingRef.current = {};
          for (var id in pending) eng.upsert(id, pending[id]);
          if (countRef.current < 0) eng.upsert('__probe__', { kind: 'light', light: 'sky', colour: '#ffffff', ground: '#444444', intensity: 0.001, x: 0, y: 1, z: 0 });
          eng.remove('__probe__');

          var ro = null;
          function fit() {
            var r = root.getBoundingClientRect();
            eng.resize(Math.round(r.width), Math.round(r.height));
          }
          fit();
          if (typeof ResizeObserver === 'function') {
            ro = new ResizeObserver(fit);
            ro.observe(root);
          }
          root.setAttribute('data-ready', 'true');
          root.__threeKit = eng; // a drive reads the census here; nothing in the kit does
          if (typeof props.onReady === 'function') props.onReady();

          return function () {
            if (ro) ro.disconnect();
            root.removeAttribute('data-ready');
            delete root.__threeKit;
            eng.dispose();
            engRef.current = null;
          };
        }, []);

        React.useEffect(
          function () {
            if (engRef.current) engRef.current.setLook(look);
          },
          [lookKey]
        );

        // Pointer: a tap picks, a drag orbits, a wheel zooms. One pointer at a time.
        var pointer = React.useRef(null);
        function onDown(e) {
          pointer.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now(), moved: false };
          if (e.currentTarget.setPointerCapture) {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {
              /* a synthetic pointer */
            }
          }
        }
        function onMove(e) {
          var p = pointer.current;
          if (!p) return;
          var dx = e.clientX - p.x;
          var dy = e.clientY - p.y;
          p.x = e.clientX;
          p.y = e.clientY;
          if (Math.abs(e.clientX - p.sx) > 8 || Math.abs(e.clientY - p.sy) > 8) p.moved = true;
          if (p.moved && orbitOn && engRef.current) engRef.current.orbit(-dx * 0.4, dy * 0.03);
        }
        function onUp(e) {
          var p = pointer.current;
          pointer.current = null;
          if (!p || p.moved || !engRef.current) return;
          var hit = engRef.current.pick(e.clientX, e.clientY);
          if (!hit) return;
          // The name is the mesh's own, or the nearest 3D Group's it sits in: tap a robot's arm, the Scene says the robot.
          var line = engRef.current.lineage(hit);
          var name = '';
          for (var i = 0; i < line.length && !name; i++) name = line[i].spec.name || '';
          if (typeof props.onTappedName === 'function') props.onTappedName(name);
          if (typeof props.onTapped === 'function') props.onTapped();
          for (var j = 0; j < line.length; j++) if (typeof line[j].spec.onTap === 'function') line[j].spec.onTap();
        }
        function onWheel(e) {
          if (!orbitOn || !engRef.current) return;
          e.preventDefault();
          engRef.current.zoom(e.deltaY > 0 ? 1.1 : 0.9);
        }

        var style = Object.assign({}, props.style);
        return h(
          'div',
          {
            ref: rootRef,
            className: 'tk-scene',
            'data-three-scene': 'true',
            role: 'img',
            'aria-label': props.label || '3D scene',
            style: style,
            onPointerDown: onDown,
            onPointerMove: onMove,
            onPointerUp: onUp,
            onPointerCancel: onUp,
            onWheel: onWheel
          },
          h('style', { key: 'css' }, SCENE_CSS),
          h('canvas', { key: 'canvas', ref: canvasRef, 'aria-hidden': 'true' }),
          supported === false ? h('div', { key: 'fallback', className: 'tk-fallback', 'data-three-fallback': 'true' }, 'No WebGL here') : null,
          h(SceneContext.Provider, { key: 'children', value: api }, props.children)
        );
      };
    },

    inputProps: {
      background: { type: 'color', displayName: 'Background', group: 'Look', default: '#14181f', description: 'The colour behind everything.' },
      floor: { type: 'boolean', displayName: 'Floor Grid', group: 'Look', default: true, description: 'A 20 × 20 grid on the floor, so the eye has a ground.' },
      cameraDistance: { type: 'number', displayName: 'Camera Distance', group: 'Camera', default: 12, description: 'How far the camera stands from the middle.' },
      cameraHeight: { type: 'number', displayName: 'Camera Height', group: 'Camera', default: 6, description: 'How high above the floor the camera is.' },
      cameraAngle: { type: 'number', displayName: 'Camera Angle', group: 'Camera', default: 35, description: 'Where round the middle the camera stands, in degrees.' },
      fieldOfView: { type: 'number', displayName: 'Field Of View', group: 'Camera', default: 45, description: 'The lens, in degrees. Smaller is longer.' },
      orbit: { type: 'boolean', displayName: 'Orbit', group: 'Camera', default: true, description: 'A drag turns the camera round the middle and a wheel zooms.' },
      label: { type: 'string', displayName: 'Label', group: 'Look', default: '3D scene', description: 'What a screen reader calls the scene.' }
    },

    // The Scene's size is the page's to decide, the way a Group's is: the canvas fills whatever these make.
    inputCss: {
      width: {
        index: 1,
        group: 'Dimensions',
        displayName: 'Width',
        description: 'How wide the scene is on the page.',
        type: { name: 'number', units: ['%', 'px', 'vw'], defaultUnit: '%' },
        default: 100
      },
      height: {
        index: 2,
        group: 'Dimensions',
        displayName: 'Height',
        description: 'How tall the scene is on the page. The camera keeps its framing at any size.',
        type: { name: 'number', units: ['px', '%', 'vh'], defaultUnit: 'px' },
        default: 360
      }
    },

    outputProps: {
      onReady: { type: 'signal', displayName: 'Ready', group: 'Events', description: 'The scene is on the page and drawing.' },
      onSupported: { type: 'boolean', displayName: 'Supported', group: 'Events', description: 'True when WebGL and three.js are both here. False draws nothing and never fires Ready.' },
      onMeshCount: { type: 'number', displayName: 'Mesh Count', group: 'Events', description: 'How many meshes the scene holds right now.' },
      onTappedName: { type: 'string', displayName: 'Tapped Name', group: 'Taps', description: 'The Name of the last mesh tapped.' },
      onTapped: { type: 'signal', displayName: 'Tapped', group: 'Taps', description: 'A mesh was tapped. Tapped Name already holds it.' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Mesh, Light and 3D Group — children. They render nothing; they tell the Scene what they are.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The child's identity in the Scene is PER INSTANCE, never the node id: under a For Each every row's Mesh is the same
   * node (one id) rendered many times, and keying by node id collapsed eight rows into one object (measured 2026-10-19,
   * the prototype's first drive: Mesh Count 2 for 9). A ref made once per mounted component is one per row.
   */
  var nextId = 1;

  /**
   * The id of the node in the project's files that made this object (shared by every row of a For Each). Not the
   * object's identity (that is per mount, above): a label an editor reads to point from a picked object to its node.
   */
  function nodeIdOf(props) {
    return props.noodlNode && props.noodlNode.id !== undefined ? String(props.noodlNode.id) : '';
  }

  /**
   * PARKED-THREE-S2-MESHOUTSIDE, the kit's half: a child with no Scene above it has no one to speak to and draws nothing,
   * and nothing in the format can say "only inside a Scene" (the bridge registers every kit node as Visual). So the child
   * says it, as a console ERROR: `render_report` collects errors and exceptions only (render-capture.js, `type ===
   * 'error'`), so a warning would never reach the agent. Once per node and name, not once per For Each row.
   */
  var KIND_LABEL = { mesh: 'Mesh', group: '3D Group', light: 'Light' };
  var saidOutside = {};
  function sayOutsideScene(spec) {
    var what = KIND_LABEL[spec.kind] || spec.kind;
    var who = what + (spec.name ? ' "' + spec.name + '"' : '');
    if (saidOutside[who]) return;
    saidOutside[who] = true;
    console.error(
      'three-kit: ' + who + ' is not inside a Scene, so it draws nothing. Move it under a three-kit Scene ' +
        '(or under a 3D Group or a For Each that is inside one).'
    );
  }

  function useSceneObject(props, spec) {
    var ctx = React.useContext(SceneContext);
    var idRef = React.useRef(null);
    if (idRef.current === null) idRef.current = 'tk' + nextId++;
    var id = idRef.current;
    var key = JSON.stringify(spec);
    React.useEffect(
      function () {
        if (!ctx) sayOutsideScene(spec);
      },
      [ctx]
    );
    React.useEffect(
      function () {
        if (ctx) ctx.upsert(id, spec);
      },
      [ctx, key]
    );
    React.useEffect(
      function () {
        return function () {
          if (ctx) ctx.remove(id);
        };
      },
      [ctx]
    );
    return { ctx: ctx, id: id };
  }

  var Mesh = {
    name: 'three-kit.Mesh',
    displayName: 'Mesh',
    category: '3D',
    usePortAsLabel: 'name',
    description:
      'One shape in the Scene above it: a box, sphere, cylinder, cone, torus or plane, at X Y Z, sized by Width, Height and ' +
      'Depth, in one Colour. Draws nothing outside a Scene. Inside a 3D Group, X Y Z are from the group’s middle. Sit On Floor makes Y the base instead of the middle, so a bar ' +
      'chart is a For Each of boxes with Height wired to the number. Spin turns it on its own axis. Tapped fires when a finger ' +
      'or a mouse lands on it.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    allowChildren: false,
    defaultCss: { display: 'none' },

    getReactComponent: function () {
      return function MeshComponent(props) {
        var spec = {
          kind: 'mesh',
          node: nodeIdOf(props),
          name: props.name ? String(props.name) : '',
          shape: props.shape || 'box',
          x: num(props.x, 0),
          y: num(props.y, 0),
          z: num(props.z, 0),
          w: Math.max(0.0001, num(props.width, 1)),
          h: Math.max(0.0001, num(props.height, 1)),
          d: Math.max(0.0001, num(props.depth, 1)),
          yaw: num(props.rotationY, 0),
          colour: colourOf(props.colour, null, '#4f8cff'),
          sit: bool(props.sitOnFloor),
          spin: bool(props.spin),
          spinSpeed: num(props.spinSpeed, 60),
          wireframe: bool(props.wireframe)
        };
        var so = useSceneObject(props, spec);
        // The tap callback is not part of the key: it is attached after the upsert, fresh every render.
        React.useEffect(function () {
          if (so.ctx) so.ctx.upsert(so.id, Object.assign({}, spec, { onTap: function () {
            if (typeof props.onTapped === 'function') props.onTapped();
          } }));
        });
        return null;
      };
    },

    inputProps: {
      shape: {
        type: { name: 'enum', enums: [{ value: 'box', label: 'Box' }, { value: 'sphere', label: 'Sphere' }, { value: 'cylinder', label: 'Cylinder' }, { value: 'cone', label: 'Cone' }, { value: 'torus', label: 'Torus' }, { value: 'plane', label: 'Plane' }] },
        displayName: 'Shape',
        group: 'Shape',
        default: 'box',
        description: 'Which primitive.'
      },
      name: { type: 'string', displayName: 'Name', group: 'Shape', default: '', description: 'What the Scene reports in Tapped Name when this is tapped.' },
      colour: { type: 'color', displayName: 'Colour', group: 'Shape', default: '#4f8cff', description: 'Its colour, flat shaded.' },
      wireframe: { type: 'boolean', displayName: 'Wireframe', group: 'Shape', default: false, description: 'Draw the edges only.' },
      x: { type: 'number', displayName: 'X', group: 'Place', default: 0, description: 'Left and right. 0 is the middle.' },
      y: { type: 'number', displayName: 'Y', group: 'Place', default: 0, description: 'Up and down. 0 is the floor.' },
      z: { type: 'number', displayName: 'Z', group: 'Place', default: 0, description: 'Towards and away. 0 is the middle.' },
      width: { type: 'number', displayName: 'Width', group: 'Size', default: 1, description: 'Along X.' },
      height: { type: 'number', displayName: 'Height', group: 'Size', default: 1, description: 'Along Y.' },
      depth: { type: 'number', displayName: 'Depth', group: 'Size', default: 1, description: 'Along Z.' },
      rotationY: { type: 'number', displayName: 'Rotation Y', group: 'Place', default: 0, description: 'Turned about its vertical axis, in degrees.' },
      sitOnFloor: { type: 'boolean', displayName: 'Sit On Floor', group: 'Place', default: false, description: 'Y is the base, not the middle: the shape stands on Y.' },
      spin: { type: 'boolean', displayName: 'Spin', group: 'Motion', default: false, description: 'Turn on its own axis, forever.' },
      spinSpeed: { type: 'number', displayName: 'Spin Speed', group: 'Motion', default: 60, description: 'Degrees per second when spinning.' }
    },

    outputProps: {
      onTapped: { type: 'signal', displayName: 'Tapped', group: 'Events', description: 'A finger or a mouse landed on this mesh.' }
    }
  };

  var Group3D = {
    name: 'three-kit.Group',
    displayName: '3D Group',
    category: '3D',
    usePortAsLabel: 'name',
    description:
      'Meshes, Lights and other 3D Groups under it move, turn and scale with it, so a robot is a 3D Group of meshes and a ' +
      'For Each of 3D Groups is a row of robots. What is under it is placed from its middle, not from the Scene’s. A tap ' +
      'on any mesh inside it fires its Tapped, and the Scene’s Tapped Name is its Name when the mesh has none. Draws ' +
      'nothing outside a Scene.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    allowChildren: true,
    defaultCss: { display: 'none' },

    getReactComponent: function () {
      return function GroupComponent(props) {
        var spec = {
          kind: 'group',
          node: nodeIdOf(props),
          name: props.name ? String(props.name) : '',
          x: num(props.x, 0),
          y: num(props.y, 0),
          z: num(props.z, 0),
          yaw: num(props.rotationY, 0),
          scale: num(props.scale, 1),
          spin: bool(props.spin),
          spinSpeed: num(props.spinSpeed, 60)
        };
        var so = useSceneObject(props, spec);
        React.useEffect(function () {
          if (so.ctx) so.ctx.upsert(so.id, Object.assign({}, spec, { onTap: function () {
            if (typeof props.onTapped === 'function') props.onTapped();
          } }));
        });
        // What is under it speaks through a context that names this group as its parent, unless a nearer one already did.
        var parentCtx = so.ctx;
        var gid = so.id;
        var api = React.useMemo(
          function () {
            if (!parentCtx) return null;
            return {
              upsert: function (id, childSpec) {
                parentCtx.upsert(id, childSpec.parent ? childSpec : Object.assign({}, childSpec, { parent: gid }));
              },
              remove: function (id) {
                parentCtx.remove(id);
              }
            };
          },
          [parentCtx, gid]
        );
        return h(SceneContext.Provider, { value: api }, props.children);
      };
    },

    inputProps: {
      name: { type: 'string', displayName: 'Name', group: 'Group', default: '', description: 'What the Scene reports in Tapped Name when a mesh inside it with no Name of its own is tapped.' },
      x: { type: 'number', displayName: 'X', group: 'Place', default: 0, description: 'Left and right. 0 is the middle of whatever it is in.' },
      y: { type: 'number', displayName: 'Y', group: 'Place', default: 0, description: 'Up and down. 0 is the floor of whatever it is in.' },
      z: { type: 'number', displayName: 'Z', group: 'Place', default: 0, description: 'Towards and away. 0 is the middle of whatever it is in.' },
      rotationY: { type: 'number', displayName: 'Rotation Y', group: 'Place', default: 0, description: 'Turned about its vertical axis, in degrees, and everything in it with it.' },
      scale: { type: 'number', displayName: 'Scale', group: 'Place', default: 1, description: 'Everything in it, bigger or smaller. 2 is twice the size.' },
      spin: { type: 'boolean', displayName: 'Spin', group: 'Motion', default: false, description: 'Turn on its own axis, forever, with everything in it.' },
      spinSpeed: { type: 'number', displayName: 'Spin Speed', group: 'Motion', default: 60, description: 'Degrees per second when spinning.' }
    },

    outputProps: {
      onTapped: { type: 'signal', displayName: 'Tapped', group: 'Events', description: 'A finger or a mouse landed on a mesh inside it.' }
    }
  };

  var Light = {
    name: 'three-kit.Light',
    displayName: 'Light',
    category: '3D',
    description:
      'A light in the Scene above it. Sun is parallel light from its position towards the middle; Lamp is a point of light at ' +
      'its position; Sky is soft light from above with a Ground colour from below. A Scene with no Light is black: start with ' +
      'one Sky and one Sun.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,
    allowChildren: false,
    defaultCss: { display: 'none' },

    getReactComponent: function () {
      return function LightComponent(props) {
        useSceneObject(props, {
          kind: 'light',
          node: nodeIdOf(props),
          light: props.kind || 'sun',
          colour: colourOf(props.colour, null, '#ffffff'),
          ground: colourOf(props.ground, null, '#444444'),
          intensity: num(props.intensity, 1),
          x: num(props.x, 5),
          y: num(props.y, 10),
          z: num(props.z, 5)
        });
        return null;
      };
    },

    inputProps: {
      kind: {
        type: { name: 'enum', enums: [{ value: 'sun', label: 'Sun' }, { value: 'lamp', label: 'Lamp' }, { value: 'sky', label: 'Sky' }] },
        displayName: 'Kind',
        group: 'Light',
        default: 'sun',
        description: 'Sun, Lamp or Sky.'
      },
      colour: { type: 'color', displayName: 'Colour', group: 'Light', default: '#ffffff', description: 'The light’s colour.' },
      ground: { type: 'color', displayName: 'Ground', group: 'Light', default: '#444444', description: 'Sky only: the colour coming up from the floor.' },
      intensity: { type: 'number', displayName: 'Intensity', group: 'Light', default: 1, description: 'How strong. 1 is plain daylight.' },
      x: { type: 'number', displayName: 'X', group: 'Place', default: 5, description: 'Where the light is.' },
      y: { type: 'number', displayName: 'Y', group: 'Place', default: 10, description: 'Where the light is.' },
      z: { type: 'number', displayName: 'Z', group: 'Place', default: 5, description: 'Where the light is.' }
    },

    outputProps: {}
  };

  /** @type {import('./types/node-kit').NodeKitModule} */
  var kit = {
    nodes: [],
    reactNodes: h ? [Scene, Mesh, Light, Group3D] : []
  };

  Noodl.defineModule(kit);
})();
