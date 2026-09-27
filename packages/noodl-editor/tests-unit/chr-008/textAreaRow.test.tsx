/**
 * CHR-008 §3.1 — the multiline-string row draws what the row class drew.
 *
 * ## Why this is an equivalence, not a description
 *
 * `TextAreaType.renderReact()` is being replaced by a component, and the props it built are the
 * whole of what the row is. A spec asserting "it returns a label and a value" would pass on a row
 * that had quietly lost its expression guard, its connection chip, or the blur-commit rule — none
 * of which had a single test before this file (measured: `TextAreaType` appeared in **zero**
 * `tests-unit` specs). So each case below is one decision taken verbatim out of the old
 * `renderReact`, re-asked of the pure module.
 *
 * What is NOT graded here: the component itself. It calls hooks and imports the expression modal,
 * which reaches `common/Icon` — this runner can load neither. That half is the drive.
 */
import * as fs from 'fs';
import * as path from 'path';

import { createExpressionParameter } from '../../src/editor/src/models/ExpressionParameter';
import {
  TEXT_AREA_INPUT_TYPE,
  shouldCommitTextArea,
  textAreaLiteral,
  textAreaRowProps
} from '../../src/editor/src/views/panels/propertyeditor/model/textAreaRow';

const PROPERTY_PANEL_INPUT_TSX = path.join(
  __dirname,
  '../../../noodl-core-ui/src/components/property-panel/PropertyPanelInput/PropertyPanelInput.tsx'
);

/**
 * `PropertyPanelInputType`, read out of the real file rather than imported.
 *
 * 🔴 **The first version of this file imported the enum and failed the suite TO RUN** — the import
 * pulls `PropertyPanelInput` → `LengthUnitInput` → `SelectInput` → a raw `.svg`, and this config
 * maps `css|scss` only. That reports `Tests: 0 total`, which is indistinguishable from a clean pass
 * at a glance. Stubbing the module instead would have been worse: the assertion would then compare
 * the literal against a value written in this file, which grades nothing.
 *
 * So the enum is parsed out of its declaration, the same move `connectedRowPolicy.test.ts` makes on
 * `Ports.WIDGET_CLASSES` for the same reason — the population is the real source file.
 */
function inputTypeEnumMember(member: string): string | undefined {
  const source = fs.readFileSync(PROPERTY_PANEL_INPUT_TSX, 'utf8');
  const block = /export enum PropertyPanelInputType \{([\s\S]*?)\n\}/.exec(source);
  if (!block) return undefined;
  const hit = new RegExp(`^\\s*${member}\\s*=\\s*'([^']+)'`, 'm').exec(block[1]);
  return hit ? hit[1] : undefined;
}

const base = {
  name: 'text',
  displayName: 'Text',
  isDefault: true,
  isConnected: false,
  parameter: undefined as unknown
};

describe('CHR-008 §3.1 — the literal the textarea shows', () => {
  it('shows a plain string as itself', () => {
    expect(textAreaLiteral('hello\nworld')).toBe('hello\nworld');
  });

  it('shows the empty string for an unset parameter, never "undefined"', () => {
    expect(textAreaLiteral(undefined)).toBe('');
    expect(textAreaLiteral(null)).toBe('');
  });

  it('🔴 shows an expression parameter as its FALLBACK, never the object', () => {
    // 🔴 Built by the real constructor, not by hand. The first version of this case wrote the
    // object literally and omitted `mode: 'expression'` — the marker `isExpressionParameter`
    // actually tests — so the fixture was not an expression parameter at all and the assertion
    // failed against correct code. A fixture for a tagged shape has to come from its producer.
    const param = createExpressionParameter('Noodl.Variables.greeting', 'Hi there');
    // Handing the object to a textarea renders `[object Object]` over the author's text — the
    // guard `BasicType` documents and this row inherits.
    expect(textAreaLiteral(param)).toBe('Hi there');
    expect(textAreaLiteral(param)).not.toContain('object');
  });

  it('survives an expression whose fallback was never set', () => {
    expect(textAreaLiteral(createExpressionParameter('x'))).toBe('');
  });

  it('🔴 treats an untagged object as a plain value, not as an expression', () => {
    // What a half-written or migrated parameter looks like. It must not be read as an expression
    // on the strength of having an `expression` key — `mode` is the marker, and this is the arm
    // that makes the case above prove something.
    expect(textAreaLiteral({ expression: 'x', fallback: 'Hi there' })).not.toBe('Hi there');
  });
});

describe('CHR-008 §3.1 — a blur is only worth an undo entry when something changed', () => {
  it('refuses a commit identical to the stored value', () => {
    // Tabbing across the panel blurs every row it passes; without this each one is an undo entry
    // that changed nothing, and Cmd+Z then appears to do nothing several times over.
    expect(shouldCommitTextArea('same', 'same')).toBe(false);
  });

  it('accepts a real edit', () => {
    expect(shouldCommitTextArea('changed', 'same')).toBe(true);
  });

  it('compares against the fallback while in expression mode', () => {
    const param = createExpressionParameter('e', 'literal');
    expect(shouldCommitTextArea('literal', param)).toBe(false);
    expect(shouldCommitTextArea('other', param)).toBe(true);
  });

  it('treats an emptied field and an unset parameter as the same thing', () => {
    expect(shouldCommitTextArea('', undefined)).toBe(false);
  });
});

describe('CHR-008 §3.1 — the props the row draws', () => {
  it('labels the row and identifies the port', () => {
    const props = textAreaRowProps({ ...base, displayName: 'Text', name: 'text' });
    expect(props.label).toBe('Text');
    expect(props.dataIdentifier).toBe('text');
    expect(props.properties).toBeUndefined();
  });

  it('asks for the textarea input type', () => {
    expect(textAreaRowProps(base).inputType).toBe(TEXT_AREA_INPUT_TYPE);
  });

  it('🔴 and that literal is the real enum member, so the two cannot drift apart', () => {
    // A parser that silently matched nothing would make this pass on any literal at all, so the
    // parse is checked for plausibility first — and against a member whose value is DIFFERENT,
    // which is what proves it is reading members rather than returning one constant.
    expect(inputTypeEnumMember('Text')).toBe('text');
    expect(inputTypeEnumMember('TextArea')).toBe(TEXT_AREA_INPUT_TYPE);
  });

  it('marks the row changed only when the parameter is not at its default', () => {
    expect(textAreaRowProps({ ...base, isDefault: true }).isChanged).toBe(false);
    expect(textAreaRowProps({ ...base, isDefault: false }).isChanged).toBe(true);
  });

  it('carries FB-018s binding chip when a connection drives the port', () => {
    const onConnectionClick = () => undefined;
    const props = textAreaRowProps({
      ...base,
      isConnected: true,
      connectionLabel: 'String Format · Result',
      onConnectionClick
    });
    expect(props.isConnected).toBe(true);
    expect(props.connectionLabel).toBe('String Format · Result');
    expect(props.onConnectionClick).toBe(onConnectionClick);
  });

  it('🔴 drops a stale label and handler on a disconnected row', () => {
    // Passing these through regardless would draw the chip over a field the author can edit —
    // FB-018s bug with the arrow reversed.
    const props = textAreaRowProps({
      ...base,
      isConnected: false,
      connectionLabel: 'String Format · Result',
      onConnectionClick: () => undefined
    });
    expect(props.connectionLabel).toBeUndefined();
    expect(props.onConnectionClick).toBeUndefined();
  });

  it('still shows the value a connection is overriding', () => {
    // The row is not blanked: the author can read what is being ignored, as every other
    // connected row does.
    expect(textAreaRowProps({ ...base, isConnected: true, parameter: 'kept' }).value).toBe('kept');
  });
});
