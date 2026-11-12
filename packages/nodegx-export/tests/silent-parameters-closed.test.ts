/**
 * The per-parameter check's silent ports, closed (EXP-008; P18 session 111 onward).
 *
 * `parameter-coverage.test.ts` holds each port to "the export moved" by name; this file holds it to
 * *what* moved. Every case varies one parameter on every node of its type in a corpus fixture and
 * reads the sentence the export now says — and the control: the same fixture unvaried says nothing
 * of the kind, so the sentence is the parameter's and not the fixture's.
 *
 *   P18-S110-RUNONCHANGE  — Object, Record, Array Filter, Variable: an unticked box the export
 *                           cannot honour is refused by name, as each node's twin already refused it.
 *   P18-S110-NEWTAB       — Navigate's Open In New Tab is carried: `window.open(url, '_blank')`.
 *   P18-S110-UPSERTON     — Create Record with Upsert On is refused by name.
 *   P18-S110-ONLYIFUNCHANGED — Set Record Properties with Only If Unchanged is refused by name.
 *   P18-S110-STORENOTES   — a Global Store declarer's notes reach the app notes and the report.
 *   P18-S110-DYNAMICTEMPLATE — a For Each with Template Type dynamic is refused by name.
 *   P18-S110-TASKERROR    — a Run Tasks whose template has the named error output says it is dropped.
 */
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import type { ExportIR, ParamValue } from '../src/ir/types';

const catalog = loadCatalog();
const FIXTURES = path.join(__dirname, 'fixtures');
const parsed = new Map<string, ExportIR>();
const irOf = (fixture: string): ExportIR => {
  if (!parsed.has(fixture)) parsed.set(fixture, parseProject(path.join(FIXTURES, fixture), catalog));
  return structuredClone(parsed.get(fixture)!);
};

/** Every node of `type` in the fixture gets `name` = `value`. Throws when the fixture has none — a case that varies nothing grades nothing. */
const varied = (fixture: string, type: string, name: string, value: string | number | boolean): ExportIR => {
  const ir = irOf(fixture);
  let hits = 0;
  for (const component of ir.components) {
    for (const node of component.nodes) {
      if (node.type !== type) continue;
      hits++;
      const literal: ParamValue = { kind: 'literal', value };
      const existing = node.parameters.find((p) => p.name === name);
      if (existing) existing.value = literal;
      else node.parameters.push({ name, value: literal });
    }
  }
  if (hits === 0) throw new Error(`${fixture} has no ${type}`);
  return ir;
};

const notesOf = (ir: ExportIR): string => emitApp(ir, catalog).notes.join('\n');

describe('P18-S110-RUNONCHANGE — an unticked box is refused by name', () => {
  const cases: Array<[string, string, string, string]> = [
    ['profile-desk', 'Model2', 'runOnChange-modelId', 'Id is unticked under Run On Value Change'],
    ['profile-desk', 'Model2', 'runOnChange-object', 'Object properties is unticked under Run On Value Change'],
    ['link-desk', 'DbModel2', 'runOnChange-modelId', 'its Id is unticked under Run On Value Change and its Fetch is unwired'],
    ['reading-shelf', 'Filter Collection', 'runOnChange-items', 'its Run On Value Change box for "Items" is unticked'],
    ['reading-shelf', 'Filter Collection', 'runOnChange-array', 'its Run On Value Change box for "Array changes" is unticked'],
    ['account-desk', 'Variable2', 'runOnChange-variable', 'its Variable changes box is unticked under Run On Value Change']
  ];
  it.each(cases)('%s: %s %s', (fixture, type, port, sentence) => {
    expect(notesOf(irOf(fixture))).not.toContain(sentence);
    expect(notesOf(varied(fixture, type, port, false))).toContain(sentence);
  });

  it('ticked is the default and refuses nothing — setting it true is the unvaried export', () => {
    const base = emitApp(irOf('profile-desk'), catalog);
    const ticked = emitApp(varied('profile-desk', 'Model2', 'runOnChange-object', true), catalog);
    expect(ticked.files).toEqual(base.files);
  });
});

describe('P18-S110-NEWTAB — Navigate opens its page in a new tab', () => {
  it('ticked: the handler is window.open on the page path, and the file no longer needs useNavigate', () => {
    const base = emitApp(irOf('cheer'), catalog);
    const built = emitApp(varied('cheer', 'RouterNavigate', 'openInNewTab', true), catalog);
    const before = base.files['src/pages/Home.tsx'];
    const after = built.files['src/pages/Home.tsx'];
    expect(before).toMatch(/navigate\('\/mood'\)/);
    expect(after).toContain("window.open('/mood', '_blank')");
    expect(after).not.toMatch(/navigate\('\/mood'\)/);
    expect(after).not.toContain('useNavigate');
  });

  it('wired: refused by name — the runtime chooses the arm per press', () => {
    const ir = irOf('cheer');
    const home = ir.components.find((c) => c.path === 'Pages/Home')!;
    const navigate = home.nodes.find((n) => n.type === 'RouterNavigate')!;
    const source = home.nodes.find((n) => n.type !== 'RouterNavigate' && n.id !== navigate.id)!;
    home.connections.push({ key: `${source.id}:x->${navigate.id}:openInNewTab`, fromId: source.id, fromProperty: 'x', toId: navigate.id, toProperty: 'openInNewTab', kind: 'value' });
    expect(notesOf(ir)).toContain('its Open In New Tab port is wired');
  });
});

describe('P18-S110-UPSERTON and -ONLYIFUNCHANGED — refused by name', () => {
  it('Create Record with Upsert On', () => {
    expect(notesOf(irOf('puppy-test-3'))).not.toContain('Upsert On');
    expect(notesOf(varied('puppy-test-3', 'NewDbModelProperties', 'upsertOn', 'email'))).toContain(
      'its Upsert On names a unique property'
    );
  });

  it('Upsert On that is only spaces is the setter’s empty — nothing refused', () => {
    const base = emitApp(irOf('puppy-test-3'), catalog);
    expect(emitApp(varied('puppy-test-3', 'NewDbModelProperties', 'upsertOn', '  '), catalog).files).toEqual(base.files);
  });

  it('Set Record Properties with Only If Unchanged', () => {
    expect(notesOf(irOf('puppy-test-3'))).not.toContain('Only If Unchanged');
    expect(notesOf(varied('puppy-test-3', 'SetDbModelProperties', 'onlyIfUnchanged', 'version'))).toContain(
      'its Only If Unchanged names properties'
    );
  });

  it('Only If Unchanged that is only commas is the setter’s empty — nothing refused', () => {
    const base = emitApp(irOf('puppy-test-3'), catalog);
    expect(emitApp(varied('puppy-test-3', 'SetDbModelProperties', 'onlyIfUnchanged', ' , '), catalog).files).toEqual(base.files);
  });

  // P112 OWN-026 FIX-03 A (P112-OWN026-EXPORTADDTO): the amount would be written as the new value.
  it('Set Record Properties with Add To', () => {
    expect(notesOf(irOf('puppy-test-3'))).not.toContain('Add To');
    expect(notesOf(varied('puppy-test-3', 'SetDbModelProperties', 'addTo', 'points'))).toContain('its Add To names properties');
  });

  it('Add To that is only commas is the setter’s empty — nothing refused', () => {
    const base = emitApp(irOf('puppy-test-3'), catalog);
    expect(emitApp(varied('puppy-test-3', 'SetDbModelProperties', 'addTo', ' , '), catalog).files).toEqual(base.files);
  });
});

describe('P18-S110-STORENOTES — a store declarer’s notes have a reader', () => {
  it('storageKey without persist reaches the app notes and the report’s project section', () => {
    const built = emitApp(varied('cheer', 'net.noodl.GlobalStore', 'storageKey', 'mood-v1'), catalog);
    const line = built.notes.find((n) => n.includes('sets storageKey without persist'));
    expect(line).toMatch(/^Pages\/Mood: node \S+ \(net\.noodl\.GlobalStore, store "[^"]+"\): sets storageKey without persist — inert, ignored$/);
    expect(built.report.project).toContain(line);
    expect(built.files['EXPORT-REPORT.md']).toContain('sets storageKey without persist');
    expect(emitApp(irOf('cheer'), catalog).notes.join('\n')).not.toContain('storageKey');
  });
});

describe('P18-S110-DYNAMICTEMPLATE — a dynamic template is refused by name', () => {
  it('Template Type dynamic: the For Each is refused, where the static one renders its Template per row', () => {
    const sentence = "its Template Type is dynamic — each row's component is chosen by the Template Script";
    expect(notesOf(irOf('cheer'))).not.toContain(sentence);
    expect(notesOf(varied('cheer', 'For Each', 'templateType', 'dynamic'))).toContain(sentence);
  });
});

describe('P18-S110-TASKERROR — a dropped task error output is said, per node', () => {
  /** batch-desk's `/Notify` template declares Success and Failure; this gives it an error output named `name`. */
  const withErrorOutput = (ir: ExportIR, name: string): ExportIR => {
    const outputs = ir.components.find((c) => c.path === 'Notify')!.nodes.find((n) => n.type === 'Component Outputs')!;
    outputs.declaredPorts.push({ ...outputs.declaredPorts.find((p) => p.plug === 'input')!, name, kind: 'value', type: 'string' });
    return ir;
  };
  const sentence = 'a failed task is reported without its Template';

  it('no error output on the template: nothing is lost, nothing said', () => {
    expect(notesOf(irOf('batch-desk'))).not.toContain(sentence);
  });

  it('the default name, Error, declared: said, naming it', () => {
    expect(notesOf(withErrorOutput(irOf('batch-desk'), 'Error'))).toContain(`${sentence}'s "Error" output`);
  });

  it('an authored name follows the parameter: the template’s Why is lost only when the node names Why', () => {
    expect(notesOf(withErrorOutput(irOf('batch-desk'), 'Why'))).not.toContain(sentence);
    expect(notesOf(withErrorOutput(varied('batch-desk', 'RunTasks', 'taskErrorOutput', 'Why'), 'Why'))).toContain(`${sentence}'s "Why" output`);
  });
});
