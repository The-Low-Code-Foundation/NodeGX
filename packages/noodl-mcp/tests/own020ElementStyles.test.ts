/**
 * P112-OWN020-OFFSYSTEM — element styles: one look per node type, written as a variant with no name.
 *
 * Richard on OpenTune (2026-10-19): the "Sort by" radio buttons came out chunky beside a token-styled page because
 * the model never styled them and the runtime's own defaults are a 32 px circle with a 2 px black ring. These pin the
 * writing side of the layer the runtime already honours: set_element_style sets one (starter: true = the on-system
 * look), get_style_vocabulary reports them. New projects and set_style_preset write NONE (2026-10-20, option 4
 * parked: every template is built through create_project, so a creation stamp restyled 13 shipped templates).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getNodeTypeDetail } from '../src/catalog';
import { SCHEMA_IDS, SchemaValidator } from '../src/editor-deps';
import { writeProjectSkeleton } from '../src/tools/createProject';
import { ELEMENT_STYLE_STARTERS, STYLES_SCHEMA } from '../src/tools/elementStyles';
import { call, connect, copyFixture, readJson, reveal, TestSession } from './helpers';

type Styles = { variants?: Array<{ name?: string; typename: string; parameters?: Record<string, unknown>; stateParameters?: Record<string, Record<string, unknown>> }> };

const RADIO = 'net.noodl.controls.radiobutton';

describe('P112-OWN020-OFFSYSTEM element styles', () => {
  it('every starter parameter is a real port of its type, and every value is a token or a plain value', () => {
    // A renamed port would otherwise write a parameter nothing reads, and the control would quietly keep the
    // runtime's look — the defect this layer exists to remove.
    for (const [typename, style] of Object.entries(ELEMENT_STYLE_STARTERS)) {
      const detail = getNodeTypeDetail(typename);
      expect('error' in detail ? detail.error : typename).toBe(typename);
      if ('error' in detail) continue;
      const ports = new Set(detail.inputs.map((p) => p.name));
      const params = [style.parameters, ...Object.values(style.stateParameters ?? {})].flatMap((p) => Object.keys(p));
      expect({ typename, missing: params.filter((p) => !ports.has(p)) }).toEqual({ typename, missing: [] });
      for (const v of Object.values(style.parameters)) {
        if (typeof v === 'string' && /#[0-9a-f]{3,8}\b|\d+px/i.test(v)) throw new Error(`${typename}: raw value ${v}`);
      }
    }
    // the control from Richard's screenshot is covered, with a size off the 32 px default
    expect(ELEMENT_STYLE_STARTERS[RADIO].parameters.width).toBe('var(--space-4)');
  });

  it('option 4 is parked: a new project has no styles file, so a template built through create_project is unchanged', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own020-skel-'));
    try {
      writeProjectSkeleton(dir, 'Element styles');
      expect(fs.existsSync(path.join(dir, 'nodegx.styles.json'))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('every starter, written as the nameless variants set_element_style writes, passes the styles schema', () => {
    const styles = {
      $schema: STYLES_SCHEMA,
      variants: Object.entries(ELEMENT_STYLE_STARTERS).map(([typename, s]) => ({ typename, parameters: s.parameters, ...(s.stateParameters ? { stateParameters: s.stateParameters } : {}) }))
    };
    // nameless: that is what makes the runtime dress every node of the type (getVariant: v.name === node.variant)
    expect(new SchemaValidator().validate(SCHEMA_IDS.STYLES, styles).valid).toBe(true);
  });

  it('the styles schema still refuses an empty name (absent is the element style; "" is a mistake)', () => {
    const bad = { variants: [{ name: '', typename: RADIO, parameters: {} }] };
    expect(new SchemaValidator().validate(SCHEMA_IDS.STYLES, bad).valid).toBe(false);
  });

  describe('through the server', () => {
    let session: TestSession;
    let projectDir: string;

    beforeEach(async () => {
      projectDir = copyFixture();
      session = await connect(projectDir, true);
      await reveal(session, 'theme');
    });
    afterEach(async () => {
      await session.close();
    });

    it('set_element_style takes a display name, merges, and writes a nameless variant', async () => {
      const first = await call<{ ok: boolean; type: string }>(session, 'set_element_style', {
        type: 'Radio Button',
        parameters: { width: 'var(--space-5)', fillColor: 'var(--primary)' }
      });
      expect(first.isError).toBeFalsy();
      expect(first.data.type).toBe(RADIO);
      await call(session, 'set_element_style', { type: RADIO, parameters: { height: 'var(--space-5)' }, states: { hover: { borderColor: 'var(--primary)' } } });
      const styles = readJson<Styles>(projectDir, 'nodegx.styles.json');
      const radios = (styles.variants ?? []).filter((v) => v.typename === RADIO);
      expect(radios).toHaveLength(1);
      expect(radios[0].name).toBeUndefined();
      expect(radios[0].parameters).toEqual({ width: 'var(--space-5)', fillColor: 'var(--primary)', height: 'var(--space-5)' });
      expect(radios[0].stateParameters).toEqual({ hover: { borderColor: 'var(--primary)' } });
    });

    it('a parameter the type does not have is refused by name with a suggestion, and nothing is written', async () => {
      const r = await call<{ error?: { message: string; details?: { unknownParameters?: string[]; suggestions?: Record<string, string> } } }>(
        session,
        'set_element_style',
        { type: 'Radio Button', parameters: { labelFontSize: 'var(--text-sm)' } }
      );
      expect(r.isError).toBe(true);
      expect(r.data.error?.details?.unknownParameters).toEqual(['labelFontSize']);
      expect(r.data.error?.details?.suggestions?.labelFontSize).toBe('labelfontSize');
      expect(fs.existsSync(path.join(projectDir, 'nodegx.styles.json'))).toBe(false);
    });

    it('an unknown visual state is refused; remove clears the style', async () => {
      const bad = await call(session, 'set_element_style', { type: 'Checkbox', states: { checked: { borderColor: 'var(--primary)' } } });
      expect(bad.isError).toBe(true);
      await call(session, 'set_element_style', { type: 'Checkbox', parameters: { width: 'var(--space-4)' } });
      const gone = await call<{ removed: boolean }>(session, 'set_element_style', { type: 'Checkbox', remove: true });
      expect(gone.data.removed).toBe(true);
      const styles = readJson<Styles>(projectDir, 'nodegx.styles.json');
      expect((styles.variants ?? []).some((v) => v.typename === 'net.noodl.controls.checkbox')).toBe(false);
    });

    it('option 4 is parked: set_style_preset writes no element style', async () => {
      const r = await call<Record<string, unknown>>(session, 'set_style_preset', { preset_id: 'minimal' });
      expect(r.isError).toBeFalsy();
      expect(r.data.elementStyles).toBeUndefined();
      const styles = fs.existsSync(path.join(projectDir, 'nodegx.styles.json')) ? readJson<Styles>(projectDir, 'nodegx.styles.json') : {};
      expect((styles.variants ?? []).filter((v) => !v.name)).toEqual([]);
    });

    it('starter: true writes the on-system look for one type, parameters on top; a type with no starter is refused', async () => {
      const r = await call<{ style: { parameters: Record<string, unknown>; states?: Record<string, Record<string, unknown>> } }>(
        session,
        'set_element_style',
        { type: 'Radio Button', starter: true, parameters: { width: 'var(--space-5)' } }
      );
      expect(r.isError).toBeFalsy();
      expect(r.data.style.parameters).toEqual({ ...ELEMENT_STYLE_STARTERS[RADIO].parameters, width: 'var(--space-5)' });
      expect(r.data.style.states).toEqual(ELEMENT_STYLE_STARTERS[RADIO].stateParameters);
      const styles = readJson<Styles>(projectDir, 'nodegx.styles.json');
      // only the type asked for: no other control is dressed behind the agent's back
      expect((styles.variants ?? []).map((v) => v.typename)).toEqual([RADIO]);
      const text = await call<{ error?: { message: string } }>(session, 'set_element_style', { type: 'Text', starter: true });
      expect(text.isError).toBe(true);
      expect(text.data.error?.message).toMatch(/no starter look for .*Pass parameters instead/);
    });

    it('get_style_vocabulary reports the element styles, in both forms, and says when there are none', async () => {
      const none = await call<{ vocabulary: string }>(session, 'get_style_vocabulary', { detail: 'prompt' });
      expect(none.data.vocabulary).toContain('ELEMENT STYLES: none');
      expect(none.data.vocabulary).toContain('call set_element_style for each control type you use');
      await call(session, 'set_element_style', { type: 'Radio Button', starter: true });
      const full = await call<{ elementStyles: Record<string, { parameters: Record<string, unknown> }> }>(session, 'get_style_vocabulary', {});
      expect(full.data.elementStyles[RADIO].parameters.width).toBe('var(--space-4)');
      const prompt = await call<{ vocabulary: string }>(session, 'get_style_vocabulary', { detail: 'prompt' });
      expect(prompt.data.vocabulary).toContain('ELEMENT STYLES (every node of the type');
      expect(prompt.data.vocabulary).toContain('radiobutton: width var(--space-4)');
      // named Looks stay Looks: a nameless variant is not reported as a Look called "undefined"
      const looks = await call<{ projectLooks?: Array<{ name: string }> }>(session, 'get_style_vocabulary', {});
      expect((looks.data.projectLooks ?? []).every((l) => typeof l.name === 'string')).toBe(true);
    });
  });
});
