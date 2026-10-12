#!/usr/bin/env node
/**
 * P109 ISL-023 — the template generators' gate. Runs before a generator writes anything.
 *
 *     node scripts/template-gate.js scripts/generate-garden-template.ts   (one generator; `template:*` runs this first)
 *     node scripts/template-gate.js                                       (every `template:*` generator in package.json)
 *
 * Two halves, both read from the generator's SOURCE, never from what it produces:
 *
 * 1. **Types.** The generators run under `ts-node -T` (transpile only) and their modules are jest-run with
 *    `diagnostics: false`, so a type error was reported by nothing the author runs. This builds one TypeScript program
 *    rooted at the generator's entry, with the options `ts-node` runs it under (`scripts/tsconfig.json`), and reports
 *    every syntax and type error in its import graph by file and line.
 * 2. **Template literals.** The generators hold game code, CSS and engine text in template literals. A backtick typed
 *    into one of them ends it early, and the parser fails somewhere after it: the gate names the literal's closing
 *    backtick as the likely stray one. A `${name}` typed into a COMMENT of the produced script is an interpolation, so
 *    the script silently gets the value of `name`; the gate names every substitution that lands inside a `//` or a
 *    block comment of the text it produces. The specs' produced-string checks (`script.includes('`')`) cannot see
 *    either: an unescaped backtick never reaches the string, and an unescaped `${x}` reaches it as x's value.
 *
 * A substitution that is meant to sit in a comment says so with `/* template-gate: comment ok *\/` inside its braces.
 *
 * The generator list comes from `package.json`'s `template:*` scripts, so a generator that moves (ISL-024) moves its
 * gate with it. An entry that names a missing file is red, not a skip. Exit 0 green, 1 red; nothing is written.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const REPO = path.join(__dirname, '..');
const CONFIG = path.join(REPO, 'scripts', 'tsconfig.json');
const OK_MARK = 'template-gate: comment ok';

function rel(file) {
  return path.relative(REPO, file).split(path.sep).join('/');
}

/** `template:<name>` → the generator entry it runs, from the committed shape `ts-node … ./scripts/<file>.ts`. */
function generatorsFromPackageJson() {
  const scripts = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts || {};
  const out = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (!/^template:/.test(name) || name === 'template:gate') continue;
    const entry = (command.match(/(\S+\.ts)\s*$/) || [])[1];
    out.push({ name, entry: entry ? path.resolve(REPO, entry) : null, command });
  }
  return out;
}

function compilerOptions() {
  const parsed = ts.getParsedCommandLineOfConfigFile(CONFIG, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  return { ...parsed.options, noEmit: true, sourceMap: false };
}

function where(file, pos) {
  const { line, character } = file.getLineAndCharacterOfPosition(pos);
  return `${rel(file.fileName)}:${line + 1}:${character + 1}`;
}

function local(file) {
  return !file.isDeclarationFile && !file.fileName.includes('/node_modules/');
}

/**
 * The generator's OWN files: its entry and every module it imports that is not a package's product source. Product
 * source (`packages/<pkg>/src/`) is its own package's typecheck's to gate (`typecheck:mcp` reads `noodl-mcp/src` under
 * its own Node16 options in seconds); under these options zod's types in `noodl-mcp/src` exhaust a 4 GB heap.
 */
function own(file) {
  return local(file) && !/\/packages\/[^/]+\/src\//.test(file.fileName);
}

/**
 * Walk the produced text of a template literal and say, for each substitution, whether it lands inside a comment of
 * that text. A small lexer over the cooked pieces: code, `//` comment, block comment, '…' and "…" strings. `//` opens a
 * comment only at the start of a line or after a space, so `https://${host}` is not one.
 */
function substitutionsInComments(node) {
  // The COOKED text (`\\n` is a newline in the produced script, and ends a `//` comment there); raw only where an
  // escape is invalid and there is no cooked text.
  const pieces = [node.head.text ?? node.head.rawText, ...node.templateSpans.map((s) => s.literal.text ?? s.literal.rawText)];
  const hits = [];
  let state = 'code';
  for (let p = 0; p < pieces.length; p++) {
    const text = pieces[p];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const n = text[i + 1];
      if (state === 'code') {
        if (c === '/' && n === '*') { state = 'block'; i++; }
        else if (c === '/' && n === '/' && (i === 0 ? true : /\s/.test(text[i - 1]))) state = 'line';
        else if (c === "'" ) state = 'sq';
        else if (c === '"') state = 'dq';
      } else if (state === 'line') {
        if (c === '\n') state = 'code';
      } else if (state === 'block') {
        if (c === '*' && n === '/') { state = 'code'; i++; }
      } else if (state === 'sq' || state === 'dq') {
        if (c === '\\') i++;
        else if (c === '\n' || c === (state === 'sq' ? "'" : '"')) state = 'code';
      }
    }
    if (p < node.templateSpans.length && (state === 'line' || state === 'block')) hits.push({ span: node.templateSpans[p], state });
  }
  return hits;
}

function scanLiterals(file, report) {
  let literals = 0;
  let substitutions = 0;
  const text = file.getFullText();
  const visit = (node) => {
    if (ts.isNoSubstitutionTemplateLiteral(node)) literals++;
    if (ts.isTemplateExpression(node)) {
      literals++;
      substitutions += node.templateSpans.length;
      for (const { span, state } of substitutionsInComments(node)) {
        // The expression's full text carries its leading comments: `${/* template-gate: comment ok */ x}`.
        if (text.slice(span.expression.getFullStart(), span.expression.getEnd()).includes(OK_MARK)) continue;
        report(
          `${where(file, span.expression.getStart(file))} ` +
            `\${${span.expression.getText(file)}} sits inside a ${state === 'line' ? '// comment' : '/* comment */'} of the text this literal produces, ` +
            `so the produced script holds its VALUE there. Escape it (\\\${) or reword the comment.`
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { literals, substitutions };
}

/**
 * After a syntax error, the template literal that closed last before it: its closing backtick is the likely stray one.
 * No parent pointers: a file with a syntax error is never bound, so `node.parent` is unset there.
 */
function lastLiteralBefore(file, pos) {
  let best = null;
  const visit = (node) => {
    if ((ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && node.end <= pos) {
      if (!best || node.end > best.end) best = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return best && { open: where(file, best.getStart(file)), close: where(file, best.end - 1) };
}

function gate(entries) {
  const started = Date.now();
  const red = [];
  const roots = [];
  for (const g of entries) {
    if (!g.entry) red.push(`${g.name}: its command names no .ts entry: ${g.command}`);
    else if (!fs.existsSync(g.entry)) red.push(`${g.name}: its entry ${rel(g.entry)} does not exist`);
    else roots.push(g.entry);
  }
  const program = ts.createProgram(roots, compilerOptions());
  const files = program.getSourceFiles().filter(own);
  let literals = 0;
  let substitutions = 0;
  for (const file of files) {
    const syntax = program.getSyntacticDiagnostics(file);
    if (syntax.length) {
      // A stray backtick turns the rest of its literal into code: the errors cascade from just after it. Name the
      // backtick first, then the first few errors, not all of them.
      const stray = lastLiteralBefore(file, syntax[0].start);
      if (stray) red.push(`${stray.close} the template literal opened at ${stray.open} closes here, before the first syntax error: if this backtick is inside the text, it is a stray one (escape it as \\\` or reword)`);
      for (const d of syntax.slice(0, 3)) red.push(`${where(file, d.start)} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
      if (syntax.length > 3) red.push(`…and ${syntax.length - 3} more syntax errors in ${rel(file.fileName)}`);
      continue;
    }
    for (const d of program.getSemanticDiagnostics(file)) red.push(`${where(file, d.start)} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    const counted = scanLiterals(file, (line) => red.push(line));
    literals += counted.literals;
    substitutions += counted.substitutions;
  }
  for (const d of program.getGlobalDiagnostics()) red.push(`TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const summary = `${entries.map((g) => g.name).join(', ')}: ${files.length} files, ${literals} template literals, ${substitutions} substitutions read in ${seconds} s`;
  return { red, summary };
}

function main() {
  const known = generatorsFromPackageJson();
  const args = process.argv.slice(2);
  const entries = args.length
    ? args.map((a) => {
        const entry = path.resolve(process.cwd(), a);
        return known.find((g) => g.entry === entry) || { name: rel(entry), entry, command: a };
      })
    : known;
  if (entries.length === 0) {
    console.error('template gate: no template:* script in package.json and no generator named: nothing to read is a red');
    process.exit(1);
  }
  const { red, summary } = gate(entries);
  if (red.length) {
    console.error(`template gate RED — ${summary}. Nothing written.`);
    for (const line of red) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(`template gate green — ${summary}`);
}

if (require.main === module) main();

module.exports = { gate, generatorsFromPackageJson, substitutionsInComments };
