/**
 * P112 OWN-004 — the trace owner name, and the script that arms the trace inside the app's own page.
 *
 * No imports, so a test can run the script without the exporter.
 */

/** The trace owner name (HUD-004): this preview's recording is its own, and stops with its frame. */
export const TRACE_OWNER = 'noodl-preview-in-page';

/**
 * P112-S4-TRACEARM — the trace is armed the moment the app's runtime exists, inside the app's own page, before the
 * project loads. Arming it from here instead (polling for the runtime every 10 ms) let the first values of a run go
 * unrecorded: a Number sends its value once, at start, and on Orbit 2 of 36 wires were missing from the trace in about
 * one run in four, so a home-made editor's card for them stayed empty for good. The runtime publishes itself as
 * `Noodl.Navigation._noodlRuntime` in the Viewer's constructor, BEFORE `setData` (noodl-viewer-react `viewer.jsx`:
 * `NoodlJSAPI(noodlRuntime)`, then `setData`); this script, first in `<head>`, catches that assignment. Nothing in the
 * runtime changes and nothing else reads the accessors differently: each getter returns what was set.
 */
export const ARM_TRACE = `<script>(function(){var owner=${JSON.stringify(TRACE_OWNER)};var noodl;
function nav(n){if(!n||typeof n!=='object')return n;var rt=n._noodlRuntime;Object.defineProperty(n,'_noodlRuntime',{configurable:true,enumerable:true,get:function(){return rt;},set:function(v){rt=v;try{v&&v.context&&v.context.setTraceEnabled(true,owner);}catch(e){}}});return n;}
Object.defineProperty(window,'Noodl',{configurable:true,enumerable:true,get:function(){return noodl;},set:function(v){noodl=v;if(v&&typeof v==='object'){var n=v.Navigation;Object.defineProperty(v,'Navigation',{configurable:true,enumerable:true,get:function(){return n;},set:function(x){n=nav(x);}});}}});})();</script>`;

/** The page with {@link ARM_TRACE} first in its head. */
export function armed(html: string): string {
  const head = html.match(/<head[^>]*>/i);
  return head ? html.replace(head[0], () => head[0] + ARM_TRACE) : ARM_TRACE + html;
}

