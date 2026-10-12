// What the wall's 3D scene imports from three (bundled by build.sh into three.js, gitignored): the core, and the
// CSS3D renderer that pins the parts' DOM elements (two faces, the gate's click targets) onto their meshes.
export * from 'three';
export { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
