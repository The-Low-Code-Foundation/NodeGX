/**
 * EXP-022 S9 — On App Error in the Swift app, and the parsers that raise on it (Richard's ruling, 2026-10-23: "Keep going
 * with Swift a bit more"; then, asked, "Fix it in both" for P18-S106-PARSERAISE).
 *
 * The four t07 scenarios needed two things the Swift printer did not print: the parsers (a `util-call` the web export
 * answers from `src/lib/parse.ts`) and the boundary (`useAppError` over `src/lib/errors.ts`). Both travel S3's road: the
 * web export's own modules in the app's JavaScriptCore context, with `fast-xml-parser` as a constant at the pinned version.
 * Swift holds a boundary as an `AppErrorBoundary`. And neither export raised a failed parse on the channel at all
 * (PARSERAISE): each parser node now raises once per change of its inputs, from one effect, in both.
 *
 * §A `fast-xml-parser` travels as a constant read from the package, and only where a carried module imports it;
 * §B the carried parse and error modules run in a bare JavaScript context, as the host loads them;
 * §C what the Swift printer writes for the four;
 * §D P18-S106-PARSERAISE in the web export: one raise per parser node, its code, its detail;
 * §E (behind the build) the boundary's Swift, compiled and run in `swift test` by the graph rows.
 *
 * The graph scenarios themselves are played in `node-spec-graph.test.ts` (React) and `node-spec-graph-swift.test.ts`.
 */

import * as vm from 'vm';

import { loadGraphScenarios, type GraphScenario } from '../../nodegx-node-spec/src';
import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { PARSE_DEPENDENCIES } from '../src/emit/parseLib';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { clientModulesJs } from '../src/emit/swift/client';
import { FXP_JS } from '../src/emit/swift/fxpJs';
import { HOST_JS } from '../src/emit/swift/scripts';
import { fxpJs, fxpRoot, fxpVersion } from './helpers/swift-fxp-js';
import { drivenInputs, graphComponent, probeProject } from './helpers/node-spec-target';

const catalog = loadCatalog();
const scenarios = loadGraphScenarios();
const t07 = scenarios.filter((s) => (s.file ?? '').includes('t07-on-app-error'));
const probeIr = (sc: GraphScenario) => probeProject(graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc)));
const reactProbe = (sc: GraphScenario) => emitApp(probeIr(sc), catalog).files['src/components/Probe.tsx'];
const swiftProbe = (sc: GraphScenario) => {
  const app = emitSwiftApp(probeIr(sc), catalog);
  const file = Object.keys(app.files).find((f) => f.endsWith('/ProbeView.swift'))!;
  return { app, source: app.files[file] };
};
const count = (text: string, needle: string) => text.split(needle).length - 1;

/** A bare JavaScript context with the host and a project's carried modules in it, as `Scripts.swift` loads them. */
function host(files: Record<string, string>): vm.Context {
  const logs: string[] = [];
  const context = vm.createContext({
    __log: (level: string, text: string) => logs.push(`${level} ${text}`),
    __later: (fn: () => void, ms: number) => setTimeout(fn, ms),
    __storage: () => undefined,
    __fetch: () => undefined,
    __env: () => ({}),
    __variable: () => undefined,
    __setVariable: () => undefined,
    __logs: logs
  });
  vm.runInContext(HOST_JS, context);
  for (const mod of clientModulesJs(files)) vm.runInContext(mod.js, context, { filename: mod.name });
  return context;
}

describe('§A fast-xml-parser travels as a constant, and only where a carried module imports it', () => {
  it('A1 the constant is the installed package read now, at the version the web export pins: a different package turns this red', () => {
    expect(fxpVersion(fxpRoot())).toBe(PARSE_DEPENDENCIES['fast-xml-parser']);
    expect(FXP_JS).toBe(fxpJs());
    expect(FXP_JS).toContain('__define("fast-xml-parser", function (exports, __require) {');
    expect(FXP_JS).toContain('__define("fast-xml-parser/lib/fxparser.min", function (exports, __require, module) {');
  });

  it('A2 a parser scenario carries the parsers, the error channel and the XML parser; a scenario with neither carries none', () => {
    const names = clientModulesJs(emitApp(probeIr(t07[0]), catalog).files).map((m) => m.name);
    expect(names).toEqual(['fast-xml-parser', 'lib/errors', 'lib/parse']);
    const clause = clientModulesJs(emitApp(probeIr(scenarios.find((s) => (s.file ?? '').includes('c02-every-send-is-delivered'))!), catalog).files);
    expect(clause.map((m) => m.name)).toEqual([]);
  });
});

describe('§B the carried modules run in a bare JavaScript context, as the host loads them', () => {
  it('B1 the web export\'s own parseXml reads a document with the carried XML parser, and its failure is the node\'s', () => {
    const context = host(emitApp(probeIr(t07[0]), catalog).files);
    const read = vm.runInContext(
      `var p = __nodegx.module('lib/parse');
       JSON.stringify({
         result: p.parseXml('<a x="1"><b>0123</b></a>', '@', '', true, 5242880, 'result'),
         error: p.parseXml('   ', '@', '', true, 5242880, 'error'),
         failed: p.parseXmlFailure('   ', '@', '', true, 5242880),
         none: p.parseXmlFailure(undefined, '@', '', true, 5242880) === undefined
       })`,
      context
    );
    expect(JSON.parse(read as string)).toEqual({
      result: { a: { b: '0123', '@x': '1' } },
      error: 'There was no XML to parse — the text was empty',
      failed: { message: 'There was no XML to parse — the text was empty', detail: { code: 'xml/empty' } },
      none: true
    });
  });

  it('B2 Parse CSV\'s failure carries the line, as parsecsv.ts raises it', () => {
    const context = host(emitApp(probeIr(t07[1]), catalog).files);
    const read = vm.runInContext(`JSON.stringify(__nodegx.module('lib/parse').parseCsvFailure('a,"never closed', true, ','))`, context);
    expect(JSON.parse(read as string)).toEqual({ message: expect.stringContaining('line 1'), detail: { line: 1 } });
  });

  it('B3 a raise reaches every subscriber in order, nothing claims it, and the console default says it once', () => {
    const context = host(emitApp(probeIr(t07[0]), catalog).files);
    const read = vm.runInContext(
      `var e = __nodegx.module('lib/errors'), heard = [];
       var off = e.subscribeAppErrors(function (x) { heard.push('a ' + x.code); });
       e.subscribeAppErrors(function (x) { heard.push('b ' + x.code); });
       e.raiseAppError({ code: 'parse-xml/parse-failed', message: 'm', nodeId: 'xml', nodeType: 'net.noodl.ParseXML', componentName: 'P' });
       off();
       e.raiseAppError({ code: 'parse-csv/parse-failed', message: 'n', nodeId: 'csv', nodeType: 'net.noodl.ParseCSV', componentName: 'P' });
       JSON.stringify({ heard: heard, logged: __logs.filter(function (l) { return l.indexOf('error ') === 0; }).length })`,
      context
    );
    expect(JSON.parse(read as string)).toEqual({ heard: ['a parse-xml/parse-failed', 'b parse-xml/parse-failed', 'b parse-csv/parse-failed'], logged: 2 });
  });
});

describe('§C the Swift printer: the four On App Error scenarios', () => {
  it('C1 none of the four leaves anything on the Swift printer', () => {
    const left = t07.map((sc, i) => [i, emitSwiftApp(probeIr(sc), catalog).preflight.swiftLosses.map((l) => l.what)]);
    expect(left.filter(([, losses]) => (losses as string[]).length > 0)).toEqual([]);
  });

  it('C2 a boundary is an AppErrorBoundary per placement; its values read off it; one parser read three times raises from one effect', () => {
    const { source } = swiftProbe(t07[0]);
    expect(count(source, '= AppErrorBoundary()')).toBe(2);
    expect(source).toContain('appError.read("code")');
    expect(source).toContain('appError2.read("errorObject")');
    expect(count(source, 'Scripts.shared.call(module: "lib/parse", "parseXml"')).toBe(3);
    expect(count(source, 'AppErrors.raiseParse(')).toBe(1);
    expect(source).toContain('AppErrors.raiseParse("parseXmlFailure", [xml_text, "@", "", true, 5242880.0], code: "parse-xml/parse-failed", nodeId: "xml", nodeType: "net.noodl.ParseXML", componentName: "/Components/Probe")');
  });

  it('C3 a Filter is set at every draw, authored or wired; no Filter prints no line', () => {
    // The plan's locals, React's own: `useAppError({ filter: 'parse-csv' })` is `appError` in both exports.
    const three = swiftProbe(t07[1]).source;
    expect(three).toContain('let _ = appError.inputs(filter: "parse-csv")');
    expect(three).toContain('let _ = appError2.inputs(filter: "parse-xml/parse-failed")');
    expect(three).toContain('let _ = appError3.inputs(filter: "parse")');
    expect(swiftProbe(t07[0]).source).not.toContain('.inputs(filter:');
    expect(swiftProbe(t07[2]).source).toContain('let _ = appError.inputs(filter: boundary_filter)');
  });

  it('C4 the host carries the boundary and the raise, and hands a carried module its `module` (fast-xml-parser sets module.exports whole)', () => {
    const { app } = swiftProbe(t07[0]);
    const scripts = Object.entries(app.files).find(([f]) => f.endsWith('/Scripts.swift'))![1];
    expect(scripts).toContain('public final class AppErrorBoundary: ObservableObject {');
    expect(scripts).toContain('public static func raiseParse(');
    expect(HOST_JS).toContain('factory(module.exports, __require, module);');
  });
});

describe('§D P18-S106-PARSERAISE in the web export', () => {
  it('D1 one effect per parser node raises its failed parse with the node\'s code, id, type and component; three reads, one raise', () => {
    const tsx = reactProbe(t07[0]);
    expect(count(tsx, 'parseXmlFailure(')).toBe(1);
    expect(tsx).toContain("import { parseXml, parseXmlFailure } from '../lib/parse';");
    expect(tsx).toContain("import { raiseAppError, useAppError } from '../lib/errors';");
    expect(tsx).toContain("if (failed !== undefined) raiseAppError({ code: 'parse-xml/parse-failed', message: failed.message, nodeId: 'xml', nodeType: 'net.noodl.ParseXML', componentName: '/Components/Probe', detail: failed.detail });");
    expect(tsx).toMatch(/useEffect\(\(\) => \{\n {4}const failed = parseXmlFailure\(xml_text, '@', '', true, 5242880\);\n.*\n {2}\}, \[xml_text\]\);/);
  });

  it('D2 two parsers, two raises, each under its own code', () => {
    const tsx = reactProbe(t07[1]);
    expect(tsx).toContain("raiseAppError({ code: 'parse-csv/parse-failed'");
    expect(tsx).toContain("raiseAppError({ code: 'parse-xml/parse-failed'");
    expect(count(tsx, 'const failed = ')).toBe(2);
  });

  it('D3 a parser with no On App Error anywhere still raises (the console default hears it, as the runtime\'s does)', () => {
    const sc = t07[0];
    const nodes = { xml: sc.nodes.xml };
    const tsx = emitApp(probeProject(graphComponent(nodes, [], ['xml.text'])), catalog).files['src/components/Probe.tsx'];
    expect(tsx).toContain("import { raiseAppError } from '../lib/errors';");
    expect(count(tsx, 'parseXmlFailure(')).toBe(1);
  });

  it('D4 To CSV raises nothing (tocsv.ts has no raise)', () => {
    const tsx = emitApp(probeProject(graphComponent({ to: { type: 'net.noodl.ToCSV', params: {} } }, [], ['to.items'])), catalog).files['src/components/Probe.tsx'];
    expect(tsx).not.toContain('raiseAppError');
    expect(tsx).not.toContain('Failure(');
  });
});
