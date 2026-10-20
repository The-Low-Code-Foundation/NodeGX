/**
 * P112-OWN020-RENDERNOVARIANTS — render_report's renderer (`scripts/devtools/render-from-disk.js`) built the runtime's
 * project data with no `variants`, so it drew every control at the runtime's own defaults and dropped every named
 * Look, while `@nodegx/preview` drew the same files with them. Measured on OpenTune with element styles: a Radio
 * Button 32px in render_report, 16px in the preview; after the fix render_report reads 16px and `control-off-scale`
 * goes quiet. The script runs a server at load, so the function is lifted out of its source and run on real files.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SCRIPT = path.join(__dirname, '../../../scripts/devtools/render-from-disk.js');
const SRC = fs.readFileSync(SCRIPT, 'utf8');

function readVariantsFor(projectDir: string): Array<Record<string, unknown>> {
  const start = SRC.indexOf('function readVariants() {');
  const end = SRC.indexOf('\n}\n', start);
  expect(start).toBeGreaterThan(-1);
  const body = SRC.slice(start, end + 2);
  const readJSON = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
  return new Function('fs', 'path', 'PROJECT', 'readJSON', `${body}\nreturn readVariants();`)(fs, path, projectDir, readJSON);
}

describe('P112-OWN020-RENDERNOVARIANTS', () => {
  it('reads named Looks and nameless element styles in the runtime shape, both state spellings', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own020-rv-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'nodegx.styles.json'),
        JSON.stringify({
          variants: [
            { typename: 'net.noodl.controls.radiobutton', parameters: { width: 'var(--space-4)' }, stateParameters: { hover: { borderColor: 'var(--primary)' } } },
            { name: 'Card', typename: 'Group', parameters: { borderRadius: 'var(--radius-lg)' }, stateParamaters: { hover: { opacity: 0.9 } } },
            { name: 'Broken' }
          ]
        })
      );
      const variants = readVariantsFor(dir);
      expect(variants).toEqual([
        {
          typename: 'net.noodl.controls.radiobutton',
          parameters: { width: 'var(--space-4)' },
          stateParameters: { hover: { borderColor: 'var(--primary)' } },
          stateTransitions: {},
          defaultStateTransitions: {}
        },
        {
          name: 'Card',
          typename: 'Group',
          parameters: { borderRadius: 'var(--radius-lg)' },
          stateParameters: { hover: { opacity: 0.9 } },
          stateTransitions: {},
          defaultStateTransitions: {}
        }
      ]);
      // nameless stays nameless: the runtime matches it with v.name === node.variant, both undefined
      expect('name' in variants[0]).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a project with no styles file renders with no variants, as before', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own020-rv-'));
    try {
      expect(readVariantsFor(dir)).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the project data handed to the runtime carries them (the line whose absence was the defect)', () => {
    const build = SRC.slice(SRC.indexOf('function buildProjectData() {'));
    const from = build.indexOf('\n  return {');
    const ret = build.slice(from, build.indexOf('\n  };', from));
    expect(ret).toContain('rootComponent');
    expect(ret).toContain('variants: readVariants()');
  });
});
