/**
 * The viewer compiles this package (`noodl-runtime/src/api/cloudstore.js` requires it) at `target: es5` without
 * `downlevelIteration` (`noodl-viewer-react/tsconfig.json`). There a spread or a `for…of` over a Map or a Set is
 * TS2802, the PR gate's `ci:build:viewer` writes no bundle, and where a bundle is written anyway the loop runs zero
 * times. It went red twice from this package: `migration.ts` (P116 s7) and `targetGoes.ts` (s12) — bug
 * P116-ONT-007-viewerbuild. This compiles `src/index.ts` with the viewer's target and libs, beside a known-firing
 * control so an empty answer means something.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

const VIEWER: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  lib: ['lib.es2019.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
  module: ts.ModuleKind.ES2015,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  types: []
};

/** The two codes TypeScript gives an iteration ES5 cannot do without `downlevelIteration`. */
const ITERATION = new Set([2802, 2569]);

function iterationErrors(entry: string): string[] {
  const program = ts.createProgram([entry], VIEWER);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => ITERATION.has(d.code))
    .map((d) => {
      const at = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : undefined;
      const where = d.file ? `${path.relative(path.join(__dirname, '..'), d.file.fileName)}:${at ? at.line + 1 : '?'}` : '?';
      return `${where} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    });
}

describe('the viewer can compile this package (ES5, no downlevelIteration)', () => {
  it('the control: a Map spread is refused at the viewer target', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-es5-'));
    try {
      const file = path.join(dir, 'spread.ts');
      fs.writeFileSync(file, 'export const n = [...new Map<string, number>().values()].length;\n');
      expect(iterationErrors(file)).toHaveLength(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('src/ has no iteration the viewer refuses', () => {
    expect(iterationErrors(path.join(__dirname, '..', 'src', 'index.ts'))).toEqual([]);
  });
});
