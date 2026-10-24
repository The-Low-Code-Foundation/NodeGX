<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
/* The canon homepage: an illustrated conversation with Studio in it, and three toys where a list of settings
   becomes controls. Nothing here talks to a server; the conversation's replies are scripted. */
(function () {
  function $(id) { return document.getElementById(id); }
  function pressOne(group, btn) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  }

  /* ---------- the conversation ---------- */
  var msgs = $('msgs'), studio = $('studio'), app = $('app');
  var holding = false, pending = null, timer = null, lastNote = null, lastReply = null;
  var colourNames = { '#0b8f81': 'teal', '#7b3fa0': 'plum', '#b4532a': 'rust', '#12161c': 'ink' };

  function add(cls, html, who) {
    var d = document.createElement('div');
    d.className = 'msg ' + cls + ' fresh';
    d.innerHTML = (who ? '<span class="who">' + who + '</span>' : '') + html;
    msgs.appendChild(d);
    return d;
  }
  function changed(what) {
    pending = what;
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (lastNote) lastNote.remove();
      if (lastReply) lastReply.remove();
      lastNote = add('note', 'You changed ' + pending + ' in Studio');
      lastReply = holding ? null : add('ai', 'Got it. I&rsquo;ll keep ' + pending.replace(/^.* to /, '') +
        ' and carry on with the booking button.', 'Claude');
    }, 650);
  }
  if (msgs && app) {
    var textSize = $('c-size'), textSizeOut = $('c-size-out');
    textSize.addEventListener('input', function () {
      app.style.setProperty('--app-size', textSize.value + 'px');
      textSizeOut.textContent = textSize.value + 'px';
      changed('Text size to ' + textSize.value + 'px');
    });
    var col = $('c-col');
    col.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      pressOne(col, b);
      app.style.setProperty('--app-accent', b.dataset.c);
      changed('Colour to ' + colourNames[b.dataset.c]);
    });
    $('hold').addEventListener('click', function () {
      holding = !holding;
      var btn = $('hold'), say = $('say').value.trim();
      btn.textContent = holding ? 'Release' : 'HOLD';
      btn.classList.toggle('on', holding);
      $('held').hidden = !holding;
      studio.classList.toggle('holding', holding);
      if (holding) {
        add('note hold', 'You pressed HOLD' + (say ? ': &ldquo;' + say.replace(/</g, '&lt;') + '&rdquo;' : ''));
        add('ai', 'I&rsquo;ve stopped. Tell me what you saw. I won&rsquo;t change anything until you press Release.', 'Claude');
      } else {
        add('note', 'You pressed Release');
        add('ai', 'Thanks. Carrying on from where you left it.', 'Claude');
        $('say').value = '';
      }
      lastNote = lastReply = null;
    });
  }

  /* ---------- toy 1: a @tweak note becomes a slider ---------- */
  var t1 = $('t1');
  if (t1) t1.addEventListener('input', function () {
    var v = t1.value + 'px';
    $('t1-out').textContent = v; $('t1-code').textContent = v; $('t1-sample').style.fontSize = v;
  });

  /* ---------- toy 2: a node's list becomes a panel ---------- */
  var btn2 = $('t2-btn');
  if (btn2) {
    var s2 = { label: 'Book a cut', colour: 'teal', size: 'medium', round: 'on' };
    var C2 = { teal: '#0b8f81', plum: '#7b3fa0', ink: '#12161c' };
    var S2 = { small: ['6px 12px', '13px'], medium: ['9px 18px', '15px'], large: ['13px 26px', '18px'] };
    var draw2 = function () {
      btn2.textContent = s2.label || ' ';
      btn2.style.background = C2[s2.colour];
      btn2.style.padding = S2[s2.size][0]; btn2.style.fontSize = S2[s2.size][1];
      btn2.style.borderRadius = s2.round === 'on' ? '999px' : '3px';
      $('t2-c-label').textContent = '"' + s2.label + '"';
      $('t2-c-colour').textContent = s2.colour; $('t2-c-size').textContent = s2.size; $('t2-c-round').textContent = s2.round;
    };
    $('t2-label').addEventListener('input', function (e) { s2.label = e.target.value; draw2(); });
    ['colour', 'size', 'round'].forEach(function (k) {
      var g = $('t2-' + k);
      g.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        pressOne(g, b); s2[k] = b.dataset.v; draw2();
      });
    });
    draw2();
  }

  /* ---------- toy 3: a spaceship built from its settings ---------- */
  var host = $('ship');
  if (!host) return;
  var hasGL = false;
  try { var tc = document.createElement('canvas'); hasGL = !!(window.WebGLRenderingContext && (tc.getContext('webgl') || tc.getContext('experimental-webgl'))); } catch (e) {}
  if (!window.THREE || !hasGL) {
    var n = document.createElement('div'); n.className = 'nogl';
    n.textContent = 'This browser can’t draw 3D here. The list on the left still shows what the model offers.';
    host.appendChild(n); return;
  }
  var T = window.THREE;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var s3 = { paint: '#9aa3ad', len: 40, wing: 26, eng: 2, stripe: true, fins: true, cannons: false, thrusters: false };
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.insertBefore(renderer.domElement, host.firstChild);
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(32, 1, 0.1, 800);
  camera.position.set(0, 30, 108); camera.lookAt(0, -2, 0);
  scene.add(new T.HemisphereLight(0xbfd9ff, 0x1a2230, 0.75));
  var key = new T.DirectionalLight(0xfff1de, 1.05); key.position.set(40, 60, 50); scene.add(key);
  var rim = new T.DirectionalLight(0x58b0ff, 0.9); rim.position.set(-50, 20, -70); scene.add(rim);

  // a field of stars and a faint deck grid for scale
  (function () {
    var g = new T.BufferGeometry(), p = [], r = 260;
    for (var i = 0; i < 420; i++) {
      var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      p.push(r * q * Math.cos(a), r * u, r * q * Math.sin(a));
    }
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xcfe3ff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
    var grid = new T.GridHelper(160, 32, 0x3a6ea5, 0x3a6ea5);
    grid.material.transparent = true; grid.material.opacity = 0.13; grid.position.y = -14; scene.add(grid);
  })();

  var pivot = new T.Group(); scene.add(pivot);
  pivot.rotation.set(0.12, Math.PI * 0.78, 0);
  var ship = null, picked = null, flames = [];

  function mat(c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.5, flatShading: true }, o || {})); }
  function part(mesh, name) {
    mesh.userData.part = name;
    if (mesh.material && mesh.material.emissive) { mesh.userData.e0 = mesh.material.emissive.getHex(); mesh.userData.i0 = mesh.material.emissiveIntensity; }
    ship.add(mesh); return mesh;
  }
  var ACCENT = 0xf2a93b;

  function build() {
    if (ship) { pivot.remove(ship); ship.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    ship = new T.Group(); flames = [];
    var L = s3.len, S = s3.wing, half = L / 2, hullMat = mat(s3.paint);

    // hull: a lathe along the length, flattened, nose toward -z
    var prof = [[0.01, -half], [2.4, -half], [3.7, -half + L * 0.18], [3.9, -half + L * 0.5], [3.1, half - L * 0.12],
                [1.5, half + 5], [0.01, half + 11]].map(function (v) { return new T.Vector2(v[0], v[1]); });
    var hull = new T.Mesh(new T.LatheGeometry(prof, 10), hullMat);
    hull.rotation.x = -Math.PI / 2; hull.scale.set(1.3, 1, 0.72); part(hull, 'hull');

    // canopy
    var can = new T.Mesh(new T.SphereGeometry(1, 16, 10), mat(0x7fd8ff, { metalness: 0.7, roughness: 0.12, emissive: 0x0b3554, emissiveIntensity: 1, flatShading: false }));
    can.scale.set(1.9, 1.2, 4.6); can.position.set(0, 2.15, -half + L * 0.12); part(can, 'cockpit');

    // swept wings, mirrored, with a little dihedral
    if (S > 0) {
      var c = Math.max(10, L * 0.42), sweep = S * 0.42;
      var sh = new T.Shape();
      sh.moveTo(0, -c / 2); sh.lineTo(S / 2, -c * 0.05 + sweep); sh.lineTo(S / 2, c * 0.2 + sweep); sh.lineTo(0, c / 2); sh.lineTo(0, -c / 2);
      var wg = new T.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 1 });
      [-1, 1].forEach(function (side) {
        var w = new T.Mesh(wg.clone(), hullMat.clone());
        w.rotation.x = Math.PI / 2; w.scale.x = side;
        w.position.set(side * 2.8, -0.6, L * 0.06); w.rotation.z = side * 0.08;
        part(w, 'wing');
        if (s3.stripe) {
          var tip = new T.Mesh(new T.BoxGeometry(0.9, 0.9, c * 0.25 + 0.6), mat(ACCENT, { metalness: 0.3 }));
          tip.position.set(side * (2.8 + S / 2), -0.55 + S * 0.04, L * 0.06 + sweep + c * 0.08); part(tip, 'stripe');
        }
        if (s3.cannons) {
          var gx = side * (2.8 + S * 0.32), gz = L * 0.06 + sweep * 0.55 - c * 0.15;
          var barrel = new T.Mesh(new T.CylinderGeometry(0.32, 0.42, 11, 8), mat(0x2b3038, { metalness: 0.8, roughness: 0.3 }));
          barrel.rotation.x = Math.PI / 2; barrel.position.set(gx, -1.4, gz - 5); part(barrel, 'cannon');
          var muzzle = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 1.2, 8), mat(ACCENT, { metalness: 0.4 }));
          muzzle.rotation.x = Math.PI / 2; muzzle.position.set(gx, -1.4, gz - 10.6); part(muzzle, 'cannon');
        }
      });
    } else if (s3.cannons) {
      [-1, 1].forEach(function (side) {
        var b2 = new T.Mesh(new T.CylinderGeometry(0.32, 0.42, 11, 8), mat(0x2b3038, { metalness: 0.8, roughness: 0.3 }));
        b2.rotation.x = Math.PI / 2; b2.position.set(side * 4.6, -1, -half + 4); part(b2, 'cannon');
      });
    }

    // stripe: two bands round the hull
    if (s3.stripe) {
      [-0.1, 0.02].forEach(function (f) {
        var band = new T.Mesh(new T.CylinderGeometry(3.98, 3.98, 1.1, 10, 1, true), mat(ACCENT, { metalness: 0.3, side: T.DoubleSide }));
        band.rotation.x = -Math.PI / 2; band.scale.set(1.3, 1, 0.72); band.position.z = L * f; part(band, 'stripe');
      });
    }

    // twin tail fins, canted out
    if (s3.fins) {
      var fs = new T.Shape(); fs.moveTo(0, 0); fs.lineTo(7, 0); fs.lineTo(8.5, 6); fs.lineTo(5.2, 6); fs.lineTo(0, 0);
      var fg = new T.ExtrudeGeometry(fs, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1 });
      [-1, 1].forEach(function (side) {
        var fin = new T.Mesh(fg.clone(), hullMat.clone());
        fin.rotation.order = 'ZYX'; fin.rotation.set(0, -Math.PI / 2, -side * 0.38);
        fin.position.set(side * 1.6, 1.4, half - 9.5); part(fin, 'fin');
      });
    }

    // engines, glowing discs, and flames when the thrusters are on
    var n = s3.eng, gap = 4.4;
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * gap;
      var eng = new T.Mesh(new T.CylinderGeometry(1.55, 1.9, 6.5, 12), mat(0x2b3038, { metalness: 0.8, roughness: 0.35, emissive: 0x58b0ff, emissiveIntensity: s3.thrusters ? 0.25 : 0 }));
      eng.rotation.x = Math.PI / 2; eng.position.set(x, -0.3, half + 1.2); part(eng, 'engine');
      var disc = new T.Mesh(new T.CircleGeometry(1.35, 20), new T.MeshBasicMaterial({ color: s3.thrusters ? 0xd8f1ff : 0x6fa9d8 }));
      disc.position.set(x, -0.3, half + 4.47); part(disc, 'engine');
      if (s3.thrusters) {
        [[1.3, 9, 0x58b0ff, 0.55], [0.7, 5.5, 0xe6f6ff, 0.9]].forEach(function (f) {
          var cone = new T.Mesh(new T.ConeGeometry(f[0], f[1], 16, 1, true),
            new T.MeshBasicMaterial({ color: f[2], transparent: true, opacity: f[3], blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
          cone.geometry.translate(0, -f[1] / 2, 0); cone.rotation.x = -Math.PI / 2; cone.position.set(x, -0.3, half + 4.5);
          part(cone, 'engine'); flames.push(cone);
        });
      }
    }
    pivot.add(ship);
    if (picked) highlight(picked);
    dirty = true;
  }

  var SETS = { hull: 'paint, length', cockpit: 'no settings of its own', wing: 'paint, wingSpan', engine: 'engines, thrusters',
               stripe: 'stripe', fin: 'fins', cannon: 'cannons' };
  function highlight(name) {
    picked = name;
    ship.traverse(function (o) {
      if (!o.isMesh || !o.material.emissive) return;
      var on = name && o.userData.part === name;
      o.material.emissive.setHex(on ? 0x12b3a1 : o.userData.e0);
      o.material.emissiveIntensity = on ? 0.6 : o.userData.i0;
    });
    $('t3-point').textContent = name ? 'Pointing at: ' + name + ' (' + SETS[name] + ')' : 'Drag to turn it. Click a part.';
    dirty = true;
  }

  // draw: every frame for the first second, then only when something changed (or flames flicker)
  var dirty = true, warm = 60, t0 = 0;
  function frame(t) {
    if (flames.length && !still) {
      var k = 1 + 0.12 * Math.sin(t * 0.031) + 0.07 * Math.sin(t * 0.073);
      flames.forEach(function (f, j) { f.scale.set(1, j % 2 ? k * 1.08 : k, 1); });
      dirty = true;
    }
    if (dirty || warm > 0) { renderer.render(scene, camera); dirty = false; if (warm > 0) warm--; }
    requestAnimationFrame(frame);
  }
  function size() {
    var w = host.clientWidth, h = host.clientHeight || 340;
    if (!w) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera); dirty = true;
  }

  // turn by dragging; a click without a drag picks a part. Nothing turns on its own.
  var down = null, moved = 0, ray = new T.Raycaster(), ptr = new T.Vector2();
  host.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; moved = 0; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy);
    pivot.rotation.y += dx * 0.01;
    pivot.rotation.x = Math.max(-0.5, Math.min(0.7, pivot.rotation.x + dy * 0.006));
    down = { x: e.clientX, y: e.clientY }; dirty = true;
  });
  host.addEventListener('pointerup', function (e) {
    if (down && moved < 5) {
      var r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      var hit = ray.intersectObjects(ship.children, false).filter(function (h) { return !h.object.material.blending || h.object.material.blending !== T.AdditiveBlending; })[0];
      highlight(hit ? hit.object.userData.part : null);
    }
    down = null;
  });

  var paintG = $('t3-paint');
  paintG.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    pressOne(paintG, b); s3.paint = b.dataset.c; $('t3-c-paint').textContent = b.dataset.n; build();
  });
  [['len', ' m'], ['wing', ' m'], ['eng', '']].forEach(function (p) {
    var el = $('t3-' + p[0]);
    el.addEventListener('input', function () {
      s3[p[0]] = +el.value;
      $('t3-' + p[0] + '-out').textContent = el.value + p[1];
      $('t3-c-' + p[0]).textContent = el.value + p[1];
      build();
    });
  });
  ['stripe', 'fins', 'cannons', 'thrusters'].forEach(function (k) {
    var el = $('t3-' + k);
    el.addEventListener('change', function () { s3[k] = el.checked; $('t3-c-' + k).textContent = el.checked ? 'on' : 'off'; build(); });
  });

  build();
  if (window.ResizeObserver) new ResizeObserver(size).observe(host);
  window.addEventListener('resize', size);
  window.addEventListener('load', size);
  document.addEventListener('visibilitychange', function () { dirty = true; warm = 30; });
  size();
  requestAnimationFrame(frame);
})();
</script>
