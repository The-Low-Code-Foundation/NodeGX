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
    var size = $('c-size'), sizeOut = $('c-size-out');
    size.addEventListener('input', function () {
      app.style.setProperty('--app-size', size.value + 'px');
      sizeOut.textContent = size.value + 'px';
      changed('Text size to ' + size.value + 'px');
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
    n.textContent = 'This browser can’t draw 3D here. The settings on the left still show what the model lists.';
    host.appendChild(n); return;
  }
  var T = window.THREE;
  var s3 = { paint: '#9aa3ad', len: 40, wing: 22, eng: 2 };
  var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.insertBefore(renderer.domElement, host.firstChild);
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(35, 1, 0.1, 500);
  camera.position.set(0, 34, 92); camera.lookAt(0, 0, 0);
  scene.add(new T.HemisphereLight(0xffffff, 0x445566, 0.9));
  var sun = new T.DirectionalLight(0xffffff, 0.8); sun.position.set(30, 50, 40); scene.add(sun);
  var grid = new T.GridHelper(120, 24, 0x8a96a4, 0x8a96a4);
  grid.material.transparent = true; grid.material.opacity = 0.18; grid.position.y = -9; scene.add(grid);
  var pivot = new T.Group(); scene.add(pivot);
  pivot.rotation.y = -0.6;
  var ship = null, picked = null;

  function mat(c, extra) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.3, flatShading: true }, extra || {})); }
  function named(mesh, part) { mesh.name = part; mesh.userData.part = part; return mesh; }

  function build() {
    if (ship) { pivot.remove(ship); ship.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    ship = new T.Group();
    var L = s3.len, paint = s3.paint;
    // hull: a six-sided body, nose forward (-z)
    var hull = named(new T.Mesh(new T.CylinderGeometry(3.2, 5.2, L, 6), mat(paint)), 'hull');
    hull.rotation.x = Math.PI / 2; ship.add(hull);
    var nose = named(new T.Mesh(new T.ConeGeometry(3.2, 9, 6), mat(paint)), 'hull');
    nose.rotation.x = -Math.PI / 2; nose.position.z = -L / 2 - 4.5; ship.add(nose);
    // cockpit
    var cock = named(new T.Mesh(new T.SphereGeometry(2.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0x58b0ff, { metalness: 0.1, roughness: 0.2, emissive: 0x0d2a4a })), 'cockpit');
    cock.scale.set(1, 0.9, 1.8); cock.position.set(0, 3.4, -L / 2 + 6); ship.add(cock);
    // wings: one each side, swept back
    if (s3.wing > 0) {
      [-1, 1].forEach(function (side) {
        var w = named(new T.Mesh(new T.BoxGeometry(s3.wing / 2, 0.8, Math.max(8, L * 0.35)), mat(paint)), 'wing');
        w.position.set(side * (4 + s3.wing / 4), -0.5, L * 0.12);
        w.rotation.y = side * 0.25;
        ship.add(w);
      });
    }
    // engines: a row at the back, glowing
    var n = s3.eng, spacing = 4.6;
    for (var i = 0; i < n; i++) {
      var e = named(new T.Mesh(new T.CylinderGeometry(1.6, 2, 6, 10),
        mat(0x30353d, { emissive: 0x58b0ff, emissiveIntensity: 0.0 })), 'engine');
      e.rotation.x = Math.PI / 2;
      e.position.set((i - (n - 1) / 2) * spacing, 0, L / 2 + 2);
      ship.add(e);
      var glow = named(new T.Mesh(new T.CircleGeometry(1.4, 16), new T.MeshBasicMaterial({ color: 0x8fd0ff })), 'engine');
      glow.position.set(e.position.x, 0, L / 2 + 5.05); ship.add(glow);
    }
    pivot.add(ship);
    if (picked) highlight(picked);
  }

  function highlight(part) {
    picked = part;
    ship.traverse(function (o) {
      if (!o.isMesh || !o.material.emissive) return;
      var on = o.userData.part === part;
      o.material.emissive.setHex(on ? 0x12b3a1 : (o.userData.part === 'cockpit' ? 0x0d2a4a : 0x000000));
      o.material.emissiveIntensity = on ? 0.55 : 1;
    });
    var settings = { hull: 'paint, length', cockpit: 'no settings yet', wing: 'paint, wingSpan', engine: 'engines' };
    $('t3-point').textContent = part ? 'Pointing at: ' + part + ' (' + settings[part] + ')' : 'Drag to turn it. Click a part.';
  }

  function size() {
    var w = host.clientWidth, h = host.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  }
  function draw() { renderer.render(scene, camera); }

  // turn by dragging; a click without a drag picks a part. Nothing moves on its own.
  var down = null, moved = 0, ray = new T.Raycaster(), ptr = new T.Vector2();
  host.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; moved = 0; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y; moved += Math.abs(dx) + Math.abs(dy);
    pivot.rotation.y += dx * 0.01;
    pivot.rotation.x = Math.max(-0.6, Math.min(0.6, pivot.rotation.x + dy * 0.006));
    down = { x: e.clientX, y: e.clientY }; draw();
  });
  host.addEventListener('pointerup', function (e) {
    if (down && moved < 5) {
      var r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      var hit = ray.intersectObjects(ship.children, false)[0];
      highlight(hit ? hit.object.userData.part : null); draw();
    }
    down = null;
  });

  var paintG = $('t3-paint');
  paintG.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    pressOne(paintG, b); s3.paint = b.dataset.c; $('t3-c-paint').textContent = b.dataset.n; build(); draw();
  });
  [['len', ' m'], ['wing', ' m'], ['eng', '']].forEach(function (p) {
    var el = $('t3-' + p[0]);
    el.addEventListener('input', function () {
      s3[p[0]] = +el.value;
      $('t3-' + p[0] + '-out').textContent = el.value + p[1];
      $('t3-c-' + p[0]).textContent = el.value + p[1];
      build(); draw();
    });
  });

  build();
  if (window.ResizeObserver) new ResizeObserver(size).observe(host); else window.addEventListener('resize', size);
  size();
})();
</script>
