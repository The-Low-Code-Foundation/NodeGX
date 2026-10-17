/**
 * The worked example's node list, shared by the export page (build.js) and the node reference
 * (generate-node-docs.js), whose Code export section links these node types to the example's
 * "What each node became" row. One list, so the two pages cannot disagree about which nodes are in it.
 */

/** What each node in the sample became, in the order the page shows them. A line says only what the code shows. */
const BECAME = [
  ['Page', 'the page component `HomePage`, its `<title>`, and the route `/` in `App.tsx`'],
  ['Group', 'a `<div>` whose layout is a class in `Home.module.css`'],
  ['Text', 'a `<p>` whose text is the String Format, inlined'],
  ['net.noodl.controls.button', 'a `<button>` with its label and an `onClick`'],
  ['Counter', 'one `useState`; Increase becomes `setClicks((v) => v + 1)` and Reset becomes `setClicks(0)`'],
  ['String Format', 'a template string, `` `Clicked ${clicks} times` ``, compiled away where its output lands'],
  ['Router', 'the `react-router-dom` routes in `App.tsx`']
];

module.exports = { BECAME };
