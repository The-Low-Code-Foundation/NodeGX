/**
 * P109 ISL-006 — `@nodegx/project-contract/function-ports`, the one reader of a Function's code, and the on-open
 * fix-up that keeps an old project's wires (AC9, AC10).
 *
 * Ruling 3, "Fix all three" (2026-10-05): an `_` in a signal name, `Inputs["x"]` as an input whose name stops at its
 * quote, and no port from a name inside a comment. Then "fix up old projects": a wired port only the old reader made
 * goes onto the Function's list when the project opens.
 *
 * The frozen old reader is pinned to the runtime's real `parseAndAddPortsFromScript` (still the Script node's), so
 * the fix-up's idea of "what the old reader made" cannot drift from what old projects were actually given.
 */
import {
  applyFunctionPortFixUp,
  describeFunctionPortFixUp,
  functionScriptPortNames,
  legacyFunctionScriptPortNames,
  planFunctionPortFixUp,
  stripScriptComments,
  type FunctionPortProjectLike
} from '@nodegx/project-contract/function-ports';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JavascriptNodeParser = require('../../../noodl-runtime/src/javascriptnodeparser');

describe('stripScriptComments — a comment goes, nothing else does', () => {
  it.each([
    ['a line comment', 'Outputs.a = 1; // Outputs.b', 'Outputs.a = 1; '],
    ['a block comment keeps its newlines', 'x /* Inputs.a\n Inputs.b */ y', 'x ' + ' '.repeat(11) + '\n' + ' '.repeat(12) + ' y'],
    ['a // inside a double-quoted URL', 'f("https://x.io/" + Inputs.id)', 'f("https://x.io/" + Inputs.id)'],
    ['a // inside a single-quoted string', "f('a//b', Inputs.c)", "f('a//b', Inputs.c)"],
    ['a regular expression ending in \\//', 'const r = /https?:\\/\\//; Outputs.k = 1;', 'const r = /https?:\\/\\//; Outputs.k = 1;'],
    ['a / in a character class', 'return /[/]x/.test(Inputs.s) // c', 'return /[/]x/.test(Inputs.s) '],
    ['division is not a regular expression', 'const h = a / 2; Outputs.h = h / b; // Inputs.z', 'const h = a / 2; Outputs.h = h / b; '],
    ['a template literal with a nested template', 'const s = `a ${ `b ${Inputs.deep}` } // c`; // d', 'const s = `a ${ `b ${Inputs.deep}` } // c`; '],
    ['an escaped quote', 'f("a\\"//", Inputs.q)', 'f("a\\"//", Inputs.q)']
  ])('%s', (_label, source, expected) => {
    expect(stripScriptComments(source)).toBe(expected);
  });

  it('never throws on code that does not parse', () => {
    for (const source of ['"unterminated', '`open ${', '/* never closed', 'a / / b', '/']) {
      expect(() => stripScriptComments(source)).not.toThrow();
    }
  });
});

describe('functionScriptPortNames — the three fixes', () => {
  it('an underscore signal is a signal, not a value', () => {
    expect(functionScriptPortNames('Outputs.do_it();')).toEqual({ inputs: [], signals: ['do_it'], outputs: [] });
  });

  it('Inputs["x"] is an input, and two on one line are two', () => {
    expect(functionScriptPortNames('const v = Inputs["a"] + Inputs[\'b\'];').inputs).toEqual(['a', 'b']);
  });

  it('a name in a comment makes no port; one in a string still does what it did', () => {
    const names = functionScriptPortNames('// Inputs.old\n/* Outputs.gone */\nOutputs.url = "http://x" + Inputs.id;');
    expect(names).toEqual({ inputs: ['id'], signals: [], outputs: ['url'] });
  });

  it('unchanged: a computed key makes nothing, and a regular Outputs["y"] is double quotes only', () => {
    expect(functionScriptPortNames("Outputs[k] = 1; Outputs['single'] = 2; Outputs[\"double\"] = 3;").outputs).toEqual([
      'double'
    ]);
  });
});

describe('legacyFunctionScriptPortNames — the old reader, frozen, agrees with the runtime parser it froze', () => {
  const CORPUS = [
    'const a = Inputs.amount;\nOutputs.formatted = a;\nOutputs.done();',
    "Outputs.total = Inputs['unit price'] * Inputs.qty;",
    'Outputs["Ready"]();\nOutputs.Failure();',
    '// Inputs.commented\nOutputs.x = 1;',
    'Outputs.do_it();',
    'const both = Inputs["a"] + Inputs["b"];',
    'f("https://x.io/" + Inputs.id); // Outputs.c',
    ''
  ];
  it.each(CORPUS)('%j', (script) => {
    const ports: { displayName: string; plug: string; type: string }[] = [];
    JavascriptNodeParser.parseAndAddPortsFromScript(script, ports, {});
    const names = legacyFunctionScriptPortNames(script);
    expect(names.inputs).toEqual(ports.filter((p) => p.plug.startsWith('input')).map((p) => p.displayName));
    expect(names.signals).toEqual(ports.filter((p) => p.plug === 'output' && p.type === 'signal').map((p) => p.displayName));
    expect(names.outputs).toEqual(ports.filter((p) => p.plug === 'output' && p.type !== 'signal').map((p) => p.displayName));
  });
});

/** A legacy-format project: one component, one Function, and the wires given. */
function project(script: string, connections: { fromId: string; fromProperty: string; toId: string; toProperty: string }[], extra = {}): FunctionPortProjectLike {
  return {
    components: [
      {
        name: '/Row',
        graph: {
          roots: [
            { id: 'g', type: 'Group', children: [{ id: 'fn', type: 'JavaScriptFunction', label: 'Validate', parameters: { functionScript: script }, ...extra }] },
            { id: 'src', type: 'Variable2' },
            { id: 'dst', type: 'Text' }
          ],
          connections
        }
      }
    ]
  };
}

describe('the on-open fix-up (AC10)', () => {
  const SCRIPT = '// Inputs.id is read below\n// Outputs.Done()\n// Outputs.old = 1\nOutputs.ok = true;';
  const WIRES = [
    { fromId: 'src', fromProperty: 'value', toId: 'fn', toProperty: 'in-id' },
    { fromId: 'fn', fromProperty: 'out-Done', toId: 'dst', toProperty: 'text' },
    { fromId: 'fn', fromProperty: 'out-ok', toId: 'dst', toProperty: 'text' }
  ];

  it('writes each wired port only a comment made onto the list, a signal as a signal; an unwired one goes', () => {
    const p = project(SCRIPT, WIRES);
    const writes = applyFunctionPortFixUp(p);
    expect(writes.map((w) => `${w.list}:${w.name}:${w.type ?? ''}`)).toEqual(['scriptInputs:id:', 'scriptOutputs:Done:signal']);
    const fn = p.components![0].graph!.roots![0].children![0];
    expect(fn.parameters!.scriptInputs).toEqual([{ id: 'id', label: 'id' }]);
    expect(fn.parameters!.scriptOutputs).toEqual([{ id: 'Done', label: 'Done' }]);
    expect(fn.parameters!['outtype-Done']).toBe('signal');
    // `old` was named only in a comment and nothing is wired to it: not written.
    expect(JSON.stringify(fn.parameters)).not.toContain('"old"');
  });

  it('is idempotent: a second pass writes nothing', () => {
    const p = project(SCRIPT, WIRES);
    applyFunctionPortFixUp(p);
    const before = JSON.stringify(p);
    expect(applyFunctionPortFixUp(p)).toEqual([]);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('control: writes nothing where the port is still made by the code, on the list already, or saved on the node', () => {
    expect(planFunctionPortFixUp(project('Outputs.x = Inputs.id;', [WIRES[0]]))).toEqual([]);
    expect(planFunctionPortFixUp(project(SCRIPT, [WIRES[0]], { parameters: { functionScript: SCRIPT, scriptInputs: [{ id: 'id', label: 'id' }] } }))).toEqual([]);
    expect(planFunctionPortFixUp(project(SCRIPT, [WIRES[0]], { ports: [{ name: 'in-id' }] }))).toEqual([]);
  });

  it('reads the v2 files too, where nodes are flat and `children` holds id strings', () => {
    const p: FunctionPortProjectLike = {
      components: [
        {
          name: '/Row',
          graph: {
            roots: [
              { id: 'g', type: 'Group', children: ['fn'] as never },
              { id: 'fn', type: 'JavaScriptFunction', label: 'Validate', parameters: { functionScript: SCRIPT } }
            ],
            connections: [WIRES[0]]
          }
        }
      ]
    };
    expect(applyFunctionPortFixUp(p).map((w) => w.name)).toEqual(['id']);
    expect(p.components![0].graph!.roots![1].parameters!.scriptInputs).toEqual([{ id: 'id', label: 'id' }]);
  });

  it('a row id already taken gets a suffix, and the label stays the name', () => {
    const p = project(SCRIPT, [WIRES[0]], { parameters: { functionScript: SCRIPT, scriptInputs: [{ id: 'id', label: 'other' }] } });
    applyFunctionPortFixUp(p);
    const fn = p.components![0].graph!.roots![0].children![0];
    expect(fn.parameters!.scriptInputs).toEqual([{ id: 'id', label: 'other' }, { id: 'id-2', label: 'id' }]);
  });

  it('says what it did in sentences a person reads, and nothing when it did nothing', () => {
    const p = project(SCRIPT, WIRES);
    const lines = describeFunctionPortFixUp(applyFunctionPortFixUp(p));
    expect(lines[0]).toBe(
      "A name inside a code comment no longer makes a Function port. 2 wired ports made that way were added to their Function's port list. Their wires still work."
    );
    expect(lines.slice(1)).toEqual(['In /Row, "Validate" keeps the input id and the output Done.']);
    expect(describeFunctionPortFixUp([])).toEqual([]);
  });

  it('one sentence per place: two unlabelled Functions keeping the same port read as two, not as a repeated line', () => {
    const w = (component: string, nodeId: string, list: 'scriptInputs' | 'scriptOutputs', name: string) => ({ component, nodeId, list, name });
    const lines = describeFunctionPortFixUp([
      w('/Offices/Office Settings', 'a', 'scriptInputs', 'reps'),
      w('/Offices/Office Settings', 'b', 'scriptInputs', 'reps'),
      w('/Pay', 'c', 'scriptOutputs', 'NoodlObject'),
      w('/Pay', 'c', 'scriptOutputs', 'Done')
    ]);
    expect(lines.slice(1)).toEqual([
      'In /Offices/Office Settings, 2 Functions keep the input reps.',
      'In /Pay, a Function keeps the outputs NoodlObject and Done.'
    ]);
  });

  it('names six places and counts the rest', () => {
    const writes = Array.from({ length: 9 }, (_, i) => ({ component: `/C${i}`, nodeId: `n${i}`, list: 'scriptInputs' as const, name: 'x' }));
    const lines = describeFunctionPortFixUp(writes);
    expect(lines).toHaveLength(1 + 6 + 1);
    expect(lines[lines.length - 1]).toBe('3 more Functions keep theirs the same way.');
  });
});

describe('the editor runs the fix-up when a project opens (upgradeOnLoad)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { upgradeOnLoad, describeUpgradeReport } = require('../../src/editor/src/models/ProjectPatches/upgradeOnLoad');
  const SCRIPT = '// Inputs.id is read below\nOutputs.ok = true;';
  const WIRE = { fromId: 'src', fromProperty: 'value', toId: 'fn', toProperty: 'in-id' };

  it('reports one section a person reads, and the content carries the list row', () => {
    const content = project(SCRIPT, [WIRE]);
    const { sections, files } = upgradeOnLoad(content);
    expect(files).toEqual([]);
    expect(sections).toEqual([
      {
        title: 'Wired Function ports kept',
        lines: [
          "A name inside a code comment no longer makes a Function port. 1 wired port made that way was added to its Function's port list. Its wire still works.",
          'In /Row, "Validate" keeps the input id.'
        ]
      }
    ]);
    expect(content.components![0].graph!.roots![0].children![0].parameters!.scriptInputs).toEqual([{ id: 'id', label: 'id' }]);
    expect(describeUpgradeReport(sections).message).toContain('Wired Function ports kept. A name inside a code comment');
  });

  it('control: a project with nothing to keep opens with no section (no backup, no toast)', () => {
    expect(upgradeOnLoad(project('Outputs.ok = Inputs.id;', [WIRE])).sections).toEqual([]);
  });
});

describe('the reader reads the same when the viewer compiles it (ES5, no downlevelIteration)', () => {
  // s20: the viewer bundle compiles this file with its own tsconfig (`target: es5`). There `for…of` over
  // `matchAll` becomes an index loop over `.length`, which an iterator does not have: the loop ran zero
  // times, the editor's preview runtime made no port from any Function's code, and a 0.2 project opened
  // with 1,769 "port doesn't exist" errors. Read the viewer's own options so this cannot drift from it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');

  function compiledAsTheViewerDoes() {
    const viewerDir = path.join(__dirname, '../../../noodl-viewer-react');
    const read = ts.readConfigFile(path.join(viewerDir, 'tsconfig.json'), ts.sys.readFile);
    const { options } = ts.convertCompilerOptionsFromJson(read.config.compilerOptions, viewerDir);
    const source = fs.readFileSync(path.join(__dirname, '../../../nodegx-project-contract/function-ports.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { ...options, module: ts.ModuleKind.CommonJS, sourceMap: false }
    });
    const module = { exports: {} as Record<string, unknown> };
    new Function('module', 'exports', 'require', outputText)(module, module.exports, require);
    return { target: options.target, reader: module.exports.functionScriptPortNames as typeof functionScriptPortNames };
  }

  it('the viewer still compiles at ES5 (the condition this guards)', () => {
    expect(compiledAsTheViewerDoes().target).toBe(ts.ScriptTarget.ES5);
  });

  it('nothing in the file iterates an iterator: no TS2802 under the viewer\'s options', () => {
    // The viewer's dev log said `[tsl] TS2802` for the broken loop and still emitted it ("compiled with 1 error").
    // TS2802 is the whole class: `for…of` or spread over a Map, a Set or `matchAll`, each of which runs zero times at ES5.
    const viewerDir = path.join(__dirname, '../../../noodl-viewer-react');
    const read = ts.readConfigFile(path.join(viewerDir, 'tsconfig.json'), ts.sys.readFile);
    const { options } = ts.convertCompilerOptionsFromJson(read.config.compilerOptions, viewerDir);
    const file = path.join(__dirname, '../../../nodegx-project-contract/function-ports.ts');
    const program = ts.createProgram([file], { ...options, noEmit: true, types: [], skipLibCheck: true });
    const codes = program.getSemanticDiagnostics(program.getSourceFile(file)).map((d: { code: number }) => d.code);
    expect(codes.filter((c: number) => c === 2802 || c === 2569)).toEqual([]);
  });

  it.each([
    ['outputs by dot', 'Outputs.Items = [1, 2];'],
    ['inputs, a signal, a bracket input', 'if (Inputs.a) Outputs.done(); Outputs.b = Inputs["first name"];'],
    ['a name past a URL', 'fetch("https://x.io/" + Inputs.id); Outputs.res = 1;']
  ])('%s', (_label, script) => {
    const viaViewer = compiledAsTheViewerDoes().reader(script);
    expect(viaViewer).toEqual(functionScriptPortNames(script));
    expect(viaViewer.inputs.length + viaViewer.outputs.length + viaViewer.signals.length).toBeGreaterThan(0);
  });
});
