// @ts-check
// P109 ISL-012 scratch kit: the docs' cube-kit sample, plus (a) OrbitControls only when the library has them (the
// vendored 0.158 control has none) and (b) a reading on window.__cube for the drive.
(function () {
  var h = React.createElement;
  var Cube = {
    name: 'cube-kit.Cube',
    displayNodeName: 'Cube',
    getReactComponent: function () {
      return function CubeComponent(props) {
        var host = React.useRef(null);
        React.useEffect(function () {
          var THREE = /** @type {any} */ (window).THREE;
          var el = /** @type {HTMLElement} */ (host.current);
          var renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(el.clientWidth || 300, el.clientHeight || 300);
          renderer.setClearColor(0xffffff, 1);
          el.appendChild(renderer.domElement);
          var scene = new THREE.Scene();
          var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
          camera.position.set(2, 2, 3);
          camera.lookAt(0, 0, 0);
          var controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
          scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()));
          /** @type {any} */ (window).__cube = { revision: THREE.REVISION, controls: !!controls, frames: 0 };
          var frame = 0;
          function draw() {
            if (controls) controls.update();
            renderer.render(scene, camera);
            /** @type {any} */ (window).__cube.frames++;
            frame = requestAnimationFrame(draw);
          }
          draw();
          return function () {
            cancelAnimationFrame(frame);
            if (controls) controls.dispose();
            renderer.dispose();
            el.removeChild(renderer.domElement);
          };
        }, []);
        return h('div', { ref: host, 'data-testid': 'cube', style: Object.assign({}, props.style, { width: 320, height: 320 }) });
      };
    }
  };
  Noodl.defineModule({ reactNodes: [Cube] });
})();
