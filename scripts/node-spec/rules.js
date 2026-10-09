/**
 * NSP-018 (phase 107) — a node's rules in words, generated from its spec.
 *
 * For every `defineNode({ type: … }).on({ … })` in `packages/nodegx-node-spec/src/nodes`, each reducer's branches are the
 * object literals in its body that carry a `says` (spec.ts `Patch.says`), in source order. A branch reads as
 *
 *     Increase Count: at Max Value with Limits Enabled → Unchanged; Count Changed stays silent
 *
 * — the port's display name (the catalog keys the lines by the port's name instead), the branch's `says`, then what the branch puts on the wire: its `outcome`, the signals it
 * `emit`s, in the order a frame settles them, and the signals a sibling branch of the same reducer emits and this one does not ("stays silent"). The words
 * are the spec author's; everything after the arrow is the spec's structure. Read statically (the TypeScript AST), so a
 * `says` must be a string literal in the patch's own object literal; a branch built by a helper outside the reducer is
 * not seen here.
 *
 *   node scripts/node-spec/rules.js [Type …]   print the rules (all said specs, or the named ones)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const nodesDir = path.join(root, 'packages', 'nodegx-node-spec', 'src', 'nodes');

/** The outcome ports' display names, as the runtime's `outcomeOutputs` registers them. */
const OUTCOME_NAMES = { done: 'Done', unchanged: 'Unchanged', failure: 'Failure', completed: 'Completed' };

function stringOf(ts, node) {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) return node.text;
  return undefined;
}

function propertyName(ts, name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  return undefined;
}

function propOf(ts, obj, key) {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && propertyName(ts, p.name) === key) return p.initializer;
  }
  return undefined;
}

/**
 * `{ [type]: { [reducerPort]: Branch[] } }` for every spec file, where a Branch is `{ says, outcome?, emit: string[], file, line }`.
 * Every input reducer is present, a reducer with no said branch as `[]`; a `says` that is not a literal throws (the generator
 * cannot read it).
 */
function readReducers() {
  const ts = require(path.join(root, 'node_modules', 'typescript'));
  const out = {};
  for (const name of fs.readdirSync(nodesDir).filter((f) => f.endsWith('.ts')).sort()) {
    const file = path.join(nodesDir, name);
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2019, true);
    const rel = path.relative(root, file).split(path.sep).join('/');
    const visit = (node) => {
      // defineNode({ type: '…', … }).on({ reducers }, …)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'on' &&
        ts.isCallExpression(node.expression.expression) &&
        ts.isIdentifier(node.expression.expression.expression) &&
        node.expression.expression.expression.text === 'defineNode'
      ) {
        const decl = node.expression.expression.arguments[0];
        const reducers = node.arguments[0];
        const type = decl && ts.isObjectLiteralExpression(decl) ? stringOf(ts, propOf(ts, decl, 'type')) : undefined;
        if (type && reducers && ts.isObjectLiteralExpression(reducers)) {
          for (const r of reducers.properties) {
            const port = r.name && propertyName(ts, r.name);
            if (!port) continue;
            const branches = [];
            const walk = (n) => {
              if (ts.isObjectLiteralExpression(n)) {
                const saysNode = propOf(ts, n, 'says');
                if (saysNode) {
                  const says = stringOf(ts, saysNode);
                  const { line } = source.getLineAndCharacterOfPosition(saysNode.getStart());
                  if (says === undefined) throw new Error(`${rel}:${line + 1}: ${type}.${port} — a \`says\` must be a string literal (the rules are read from the source)`);
                  const emitNode = propOf(ts, n, 'emit');
                  const emit =
                    emitNode && ts.isArrayLiteralExpression(emitNode) ? emitNode.elements.map((e) => stringOf(ts, e)).filter((e) => e !== undefined) : [];
                  branches.push({ says, outcome: stringOf(ts, propOf(ts, n, 'outcome')), emit, file: rel, line: line + 1 });
                }
              }
              ts.forEachChild(n, walk);
            };
            walk(r);
            (out[type] = out[type] || {})[port] = branches;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return out;
}

/** `readReducers()` with only the reducers that have a said branch, and only the specs that have one. */
function readSaidBranches() {
  const out = {};
  for (const [type, reducers] of Object.entries(readReducers())) {
    const said = Object.entries(reducers).filter(([, b]) => b.length > 0);
    if (said.length) out[type] = Object.fromEntries(said);
  }
  return out;
}

/**
 * NSP-018 AC2's count, for spec-ledger: the input reducers of the registered specs (the live `spec.on`, so a spec built by a
 * factory is counted too), how many have their words, the specs fully said, and the specs whose reducers this source read
 * cannot see (written inside a factory — Add / Remove Record Relation's `relationNode`).
 */
function saidCoverage(specs) {
  const read = readReducers();
  let reducers = 0;
  let said = 0;
  const specsSaid = [];
  const unread = [];
  for (const [type, spec] of Object.entries(specs)) {
    const ports = Object.keys(spec.on || {});
    if (!ports.length) continue;
    reducers += ports.length;
    if (!read[type]) {
      unread.push(type);
      continue;
    }
    const n = ports.filter((p) => (read[type][p] || []).length > 0).length;
    said += n;
    if (n === ports.length) specsSaid.push(type);
  }
  return { reducers, said, specsSaid, unread };
}

/**
 * `{ [inputPort]: string[] }` — one line per said branch, `<the case> → <what the wire carries>`, in the order the
 * reducers and their branches are written. Keyed by the port's NAME, which is what an agent writes against; the words
 * use display names, which is what the spec author and a person read. `nameOf(plug, port, strict?)` gives a port's
 * display name (the spec's; without `strict`, falling back to the port name).
 */
function rulesInWords(reducers, nameOf) {
  const out = {};
  for (const [port, branches] of Object.entries(reducers)) {
    const pulsed = [...new Set(branches.flatMap((b) => b.emit))];
    out[port] = branches.map((b) => {
      // in the order a frame settles them (interpreter.ts): the pulses, then the outcome
      const wire = b.emit.map((e) => (OUTCOME_NAMES[e] && !nameOf('output', e, true) ? OUTCOME_NAMES[e] : nameOf('output', e)));
      if (b.outcome && b.outcome !== 'deferred') wire.push(OUTCOME_NAMES[b.outcome] || b.outcome);
      const silent = pulsed.filter((e) => !b.emit.includes(e)).map((e) => nameOf('output', e));
      const tail = [wire.join(', '), silent.length ? `${silent.join(', ')} ${silent.length > 1 ? 'stay' : 'stays'} silent` : '']
        .filter(Boolean)
        .join('; ');
      return `${b.says}${tail ? ' → ' + tail : ''}`;
    });
  }
  return out;
}

/** `{ [type]: { [inputPort]: string[] } }` for every spec with a said branch — what `generate.js` writes as a catalog node's `rules`. */
function rulesFor(specs) {
  const said = readSaidBranches();
  const out = {};
  for (const [type, reducers] of Object.entries(said)) {
    const spec = specs[type];
    if (!spec) continue; // a spec file not in the registry draws nothing
    const nameOf = (plug, port, strict) => {
      const d = (plug === 'input' ? spec.inputs : spec.outputs)[port];
      if (strict) return d && d.displayName;
      return (d && d.displayName) || port;
    };
    out[type] = rulesInWords(reducers, nameOf);
  }
  return out;
}

module.exports = { readReducers, readSaidBranches, saidCoverage, rulesInWords, rulesFor };

if (require.main === module) {
  const { loadSpecs } = require('./load-specs');
  const only = process.argv.slice(2);
  const rules = rulesFor(loadSpecs());
  for (const [type, ports] of Object.entries(rules)) {
    if (only.length && !only.includes(type)) continue;
    console.log(type);
    for (const [port, lines] of Object.entries(ports)) for (const l of lines) console.log(`  ${port}: ${l}`);
  }
}
