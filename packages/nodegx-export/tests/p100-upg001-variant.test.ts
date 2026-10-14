import * as fs from 'fs';
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { PRESET_MARKERS } from '../src/emit/component';
import { parseProject } from '../src/parse/parseProject';
import { ExportIR } from '../src/ir/types';

/**
 * P100-UPG001-VARIANT — the export report said an inert preset marker was dropped.
 *
 * `_variant` / `_size` are the old Look-preset markers. No runtime, viewer or exporter reads them (UPG-001 §3.4),
 * so "parameter _variant … has no style/content mapping — dropped, reported" made a person think part of their
 * design was left out when nothing was.
 *
 * 🔴 **The control is a parameter that really is dropped**, reported on the same node in the same run, so the
 * absence rows below sit beside a report line that is known to fire.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'cheer');
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);
const EDITOR_LOOKS = path.join(__dirname, '..', '..', 'noodl-editor', 'src', 'editor', 'src', 'models', 'Looks', 'looks.ts');

/** The Notes page's heading, carrying both markers and one parameter nothing maps. */
const exportWithMarkers = () => {
  const ir: ExportIR = JSON.parse(JSON.stringify(baseIr));
  const notes = ir.components.find((c) => c.path === 'Pages/Notes')!;
  const heading = notes.nodes.find((n) => n.id === 'notesHeading')!;
  heading.parameters.push(
    { name: '_variant', value: { kind: 'literal', value: 'heading' } },
    { name: '_size', value: { kind: 'literal', value: 'large' } },
    { name: 'zzNoSuchParameter', value: { kind: 'literal', value: 'x' } }
  );
  return emitApp(ir, catalog).notes.join('\n');
};

describe('P100-UPG001-VARIANT — the preset markers are not reported as dropped', () => {
  test('neither marker is named as a dropped parameter', () => {
    const notes = exportWithMarkers();
    expect(notes).not.toContain('parameter _variant');
    expect(notes).not.toContain('parameter _size');
  });

  /** The known-firing line beside the absences above: a parameter nothing maps is still reported. */
  test('the control, a parameter that really is dropped, is still reported on the same node', () => {
    expect(exportWithMarkers()).toContain('parameter zzNoSuchParameter on notesHeading has no style/content mapping — dropped, reported');
  });

  /**
   * One list, two copies: the export may not import the editor (HLS-001 AC2), so it keeps its own and this row
   * fails the day the editor's list changes. Read as text, the way §15.6 reads a runtime file.
   */
  test("the export's markers are the editor's PRESET_MARKERS", () => {
    const source = fs.readFileSync(EDITOR_LOOKS, 'utf8');
    const match = /export const PRESET_MARKERS = \[([^\]]*)\] as const;/.exec(source);
    expect(match).not.toBeNull();
    const editorMarkers = match![1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    expect([...PRESET_MARKERS]).toEqual(editorMarkers);
  });
});
