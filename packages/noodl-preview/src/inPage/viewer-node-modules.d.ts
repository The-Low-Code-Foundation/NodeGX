/**
 * The module `build.mjs` generates for the graph-target bundle (THE GRAPH TARGET): the runtime test helper's four
 * viewer-node lists as statically imported modules. It exists only inside that bundle.
 */
declare module 'nodegx-viewer-node-modules' {
  import type { ViewerNodeModules } from '../../../noodl-runtime/test/helpers/node-spec-target';
  const modules: ViewerNodeModules;
  export default modules;
}
