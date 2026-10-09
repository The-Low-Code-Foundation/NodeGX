/**
 * NSP-017 s68 — which Noodl globals an Expression reads, as the runtime finds them: `detectDependencies` and its result type,
 * copied VERBATIM from `noodl-runtime/src/expression-evaluator.ts` (the spec package cannot import the runtime, and that file
 * imports the runtime's `Model`). Held by tests/expression-dependencies-parity.test.ts, which compares the two functions' source.
 * The runtime subscribes to what this returns (`subscribeToChanges`), so a name it misses is a global the node never hears move.
 * Change both or neither.
 */
export interface ExpressionDependencies {
  variables: string[];
  objects: string[];
  arrays: string[];
}

/**
 * Detect dependencies in an expression string
 * Returns { variables: string[], objects: string[], arrays: string[] }
 *
 * @example
 * detectDependencies('Noodl.Variables.isLoggedIn ? "Hi" : "Login"')
 * // Returns: { variables: ['isLoggedIn'], objects: [], arrays: [] }
 */
export function detectDependencies(expression: string): ExpressionDependencies {
  const dependencies: ExpressionDependencies = {
    variables: [],
    objects: [],
    arrays: []
  };

  // Template-literal interpolations are code, not string content — pull them out
  // before stripping strings so `${Variables.x}` still registers a dependency.
  const interpolations = Array.from(expression.matchAll(/\$\{([^}]*)\}/g))
    .map((m) => m[1])
    .join(' ');

  // Remove strings to avoid false matches on dot-notation references.
  const exprWithoutStrings =
    expression
      .replace(/"([^"\\]|\\.)*"/g, '""')
      .replace(/'([^'\\]|\\.)*'/g, "''")
      .replace(/`([^`\\]|\\.)*`/g, '``') +
    ' ' +
    interpolations;

  // Bracket-notation keys ARE string literals, so they must be matched against the
  // original expression — stripping empties them (`Variables["x"]` → `Variables[""]`).
  const bracketSource = expression + ' ' + interpolations;

  // Array.from rather than iterating the RegExpStringIterator: the viewer's ts-jest
  // program compiles this file at a pre-ES2015 target, where that is TS2802.
  const collect = (list: string[], dotSource: string, name: string) => {
    const dotRe = new RegExp('(?:Noodl\\.)?' + name + '\\.([a-zA-Z_$][a-zA-Z0-9_$]*)', 'g');
    for (const match of Array.from(dotSource.matchAll(dotRe))) {
      if (match[1] && !list.includes(match[1])) list.push(match[1]);
    }
    const bracketRe = new RegExp('(?:Noodl\\.)?' + name + '\\[["\']([^"\']+)["\']\\]', 'g');
    for (const match of Array.from(bracketSource.matchAll(bracketRe))) {
      if (match[1] && !list.includes(match[1])) list.push(match[1]);
    }
  };

  collect(dependencies.variables, exprWithoutStrings, 'Variables');
  collect(dependencies.objects, exprWithoutStrings, 'Objects');
  collect(dependencies.arrays, exprWithoutStrings, 'Arrays');

  return dependencies;
}
