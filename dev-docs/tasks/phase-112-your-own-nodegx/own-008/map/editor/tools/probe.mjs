// Prints what the kit's node-spec exports, for the developer.
import * as ns from '@nodegx/node-spec';
console.log(Object.keys(ns).filter((k) => /spec|port/i.test(k)).join(' '));
console.log(typeof ns.specs, Array.isArray(ns.specs), ns.specs instanceof Map, Object.keys(ns.specs).slice(0, 5));
const s = ns.specFor('JavaScriptFunction');
console.log(Object.keys(s), s.derived && s.derived.needs, s.displayName, s.category);
console.log(JSON.stringify(ns.drawnPorts(ns.specFor('Group'), {}).slice(0, 3)));
