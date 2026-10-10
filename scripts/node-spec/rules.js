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
 * `says` must be a string literal in the patch's own object literal, and so must a said branch's `emit` elements and
 * `outcome` (s73: a computed one throws); a branch built by a helper outside the reducer is not seen here. A patch computed
 * from a draft (For Each's `run`) is said with `said('words', patch)` (spec.ts, s74): its line is the words alone.
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
  // `'deferred' as const`, `('a')`
  while (node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node)))) node = node.expression;
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
 * cannot read it). `dir`: the spec files to read (a test's fixtures; default the package's `src/nodes`).
 */
function readReducers(dir = nodesDir) {
  const ts = require(path.join(root, 'node_modules', 'typescript'));
  const files = new Map(); // file name in nodesDir → its parsed source, read once
  const parse = (name) => {
    if (!files.has(name)) {
      const file = path.join(dir, name);
      const text = fs.readFileSync(file, 'utf8');
      files.set(name, { source: ts.createSourceFile(file, text, ts.ScriptTarget.ES2019, true), rel: path.relative(root, file).split(path.sep).join('/') });
    }
    return files.get(name);
  };
  // s73: a reducer that calls a named helper (`value: (s, v, i) => onValue(BOOLEAN, s, v, i)`, variable-base.ts) has its
  // branches in the helper. Resolve the callee — a function in the same file, or one imported from a sibling node file —
  // and read its body as the reducer's. Words written once in a shared helper are every caller's.
  const functionNamed = (src, name) => {
    for (const st of src.statements) {
      if (ts.isFunctionDeclaration(st) && st.name && st.name.text === name && st.body) return st.body;
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) return d.initializer.body;
        }
      }
    }
    return undefined;
  };
  const resolveCall = (src, name) => {
    const here = functionNamed(src, name);
    if (here) return { body: here, at: [...files.values()].find((f) => f.source === src) };
    for (const st of src.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.moduleSpecifier.text.startsWith('./')) continue;
      const named = st.importClause && st.importClause.namedBindings;
      if (!named || !ts.isNamedImports(named) || !named.elements.some((e) => e.name.text === name && !e.propertyName)) continue;
      const fileName = st.moduleSpecifier.text.slice(2) + '.ts';
      if (!fs.existsSync(path.join(dir, fileName))) continue;
      const at = parse(fileName);
      const body = functionNamed(at.source, name);
      if (body) return { body, at };
    }
    return undefined;
  };

  const out = {};
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) {
    const { source } = parse(name);
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
            const followed = new Set();
            const walk = (n, at) => {
              // an `idioms` entry (`{ says, example }`) is not a branch
              if (ts.isObjectLiteralExpression(n) && !propOf(ts, n, 'example')) {
                const saysNode = propOf(ts, n, 'says');
                if (saysNode) {
                  const says = stringOf(ts, saysNode);
                  const { line } = at.source.getLineAndCharacterOfPosition(saysNode.getStart());
                  if (says === undefined) throw new Error(`${at.rel}:${line + 1}: ${type}.${port} — a \`says\` must be a string literal (the rules are read from the source)`);
                  // s73: the wire half must be literal too. A pulse chosen by a ternary (`emit: [on ? 'a' : 'b']`) was
                  // DROPPED here, so the line named fewer pulses than the branch sends — write the two cases as two branches.
                  const unreadable = (what) =>
                    new Error(`${at.rel}:${line + 1}: ${type}.${port} — a said branch's \`${what}\` must be literal (split a computed one into branches, each with its \`says\`)`);
                  // a spread can carry an `emit` or `outcome` the reader would not see
                  if (n.properties.some((p) => ts.isSpreadAssignment(p))) throw unreadable('...spread');
                  const emitNode = propOf(ts, n, 'emit');
                  if (emitNode && !ts.isArrayLiteralExpression(emitNode)) throw unreadable('emit');
                  const emit = emitNode ? emitNode.elements.map((e) => stringOf(ts, e)) : [];
                  if (emit.includes(undefined)) throw unreadable('emit');
                  const outcomeNode = propOf(ts, n, 'outcome');
                  const outcome = stringOf(ts, outcomeNode);
                  if (outcomeNode && outcome === undefined) throw unreadable('outcome');
                  branches.push({ says, outcome, emit, file: at.rel, line: line + 1 });
                }
              }
              // s74: `said('words', patch)` (spec.ts) — the words of a computed patch. Its wire is not in the source, so the
              // branch is `computed`: the line carries the words alone, and names no sibling's pulse as silent
              if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'said') {
                const saysNode = n.arguments[0];
                const says = stringOf(ts, saysNode);
                const { line } = at.source.getLineAndCharacterOfPosition(n.getStart());
                if (says === undefined) throw new Error(`${at.rel}:${line + 1}: ${type}.${port} — a \`said\` must be given its words as a string literal (the rules are read from the source)`);
                branches.push({ says, outcome: undefined, emit: [], computed: true, file: at.rel, line: line + 1 });
              }
              if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
                const target = resolveCall(at.source, n.expression.text);
                if (target && !followed.has(target.body)) {
                  followed.add(target.body);
                  walk(target.body, target.at);
                }
              }
              ts.forEachChild(n, (c) => walk(c, at));
            };
            // a reducer given by name (`saveValue: onSet`, or shorthand) is that function's body
            const ref = ts.isShorthandPropertyAssignment(r) ? r.name : ts.isPropertyAssignment(r) && ts.isIdentifier(r.initializer) ? r.initializer : undefined;
            const named = ref && resolveCall(source, ref.text);
            if (named) {
              followed.add(named.body);
              walk(named.body, named.at);
            }
            walk(r, parse(name));
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
      // a computed patch (`said`): the words alone — its wire is not in the source, so naming a sibling's pulse silent could be false
      if (b.computed) return b.says;
      // in the order a frame settles them (interpreter.ts): the pulses, then the outcome
      const wire = b.emit.map((e) => (OUTCOME_NAMES[e] && !nameOf('output', e, true) ? OUTCOME_NAMES[e] : nameOf('output', e)));
      // `deferred` / `pending`: the outcome comes later (afterInputs, a world answer), so the branch itself puts none on the wire
      if (b.outcome && b.outcome !== 'deferred' && b.outcome !== 'pending') wire.push(OUTCOME_NAMES[b.outcome] || b.outcome);
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
