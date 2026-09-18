/**
 * P94 STY-002 — a Look survives a project-level reload, and the project can still be saved.
 *
 * ## The defect this grades
 *
 * `applyProjectLevelSlice` adopted a fresh `nodegx.styles.json` with
 * `target.variants = slice.variants ?? []` — assigning **plain JSON objects** onto
 * `ProjectModel.variants`, whose elements `ProjectModel.toJSON()` calls `.toJSON()` on. After that
 * assignment every `doWriteProjectToDisk` threw `TypeError: v.toJSON is not a function`, which is
 * the shape P92 CHR-010 saw and filed as "creating a variant leaves the project unable to save",
 * and which STY-001's drive then re-attributed to the *reload* path rather than the create path
 * (`[FLD-009] could not reload project-level files from disk`). `ProjectModel.fromJSON` had it right
 * all along; this one path did not.
 *
 * 🔴 **The hydrator is a required parameter, and that is the fix.** A default of identity would let
 * the next caller reintroduce this silently, and there is no unit-testable seam on `ProjectModel`
 * itself to pin the call — so the type system holds the half these specs cannot reach.
 *
 * ⚠️ **What these specs deliberately do NOT claim.** They grade the pure function and a `toJSON`
 * round trip over a real `VariantModel`. Whether the editor's own save path is healthy end to end is
 * the Jasmine suite and a drive; this is the reason the throw was possible, not a screenshot of it
 * being gone.
 */
import { applyProjectLevelSlice } from '../../src/editor/src/services/ProjectStructure/projectLevel';
import { VariantModel } from '../../src/editor/src/models/VariantModel';

/** A variant as it arrives from `ProjectImporter.reconstructVariants` — legacy-shaped. */
const RAW_FROM_DISK = {
  name: 'Primary',
  typename: 'net.noodl.controls.button',
  parameters: { backgroundColor: 'var(--primary)' },
  // 🔴 legacy spells it with the typo, and the importer deliberately reverses the v2 file's
  // `stateParameters` back to this. A hydrator expecting the v2 spelling would drop every state.
  stateParamaters: { hover: { backgroundColor: 'var(--primary-hover)' } },
  stateTransitions: {}
};

const hydrate = (raw: unknown) => (raw instanceof VariantModel ? raw : VariantModel.fromJSON(raw));

function styleSlice(variants: unknown[]) {
  return { metadata: { styles: { colors: { Brand: '#123456' } } }, variants } as never;
}

describe('STY-002 — adopting a styles file from disk', () => {
  it('🔴 leaves the project savable: every variant is a model that can be serialised', () => {
    const target: { metadata?: Record<string, unknown>; variants?: unknown[] } = {};

    applyProjectLevelSlice(target, styleSlice([RAW_FROM_DISK]), 'styles', hydrate);

    expect(target.variants!.length).toBe(1);
    // The exact call `ProjectModel.toJSON()` makes, and the exact one that used to throw.
    expect(() => (target.variants as { toJSON(): unknown }[]).map((v) => v.toJSON())).not.toThrow();
  });

  it('the control: without hydration, that same call is the TypeError that was filed', () => {
    const target: { variants?: unknown[] } = {};
    applyProjectLevelSlice(target, styleSlice([RAW_FROM_DISK]), 'styles', (raw) => raw);
    expect(() => (target.variants as { toJSON(): unknown }[]).map((v) => v.toJSON())).toThrowError(
      /toJSON is not a function/
    );
  });

  it('the Look’s state data survives the round trip, typo and all', () => {
    const target: { variants?: unknown[] } = {};
    applyProjectLevelSlice(target, styleSlice([RAW_FROM_DISK]), 'styles', hydrate);

    const look = target.variants![0] as VariantModel;
    expect(look.name).toBe('Primary');
    expect(look.typename).toBe('net.noodl.controls.button');
    expect(look.parameters).toEqual({ backgroundColor: 'var(--primary)' });
    // in memory the field is spelled correctly…
    expect(look.stateParameters).toEqual({ hover: { backgroundColor: 'var(--primary-hover)' } });
    // …and on the way back out it is the legacy spelling again, which is what the v2 writer
    // normalises (`buildStylesV2File` reads `v.stateParamaters`). Getting this backwards would
    // silently empty every Look's states on the next save.
    expect((look.toJSON() as { stateParamaters: unknown }).stateParamaters).toEqual({
      hover: { backgroundColor: 'var(--primary-hover)' }
    });
  });

  it('a styles file with no variants empties the list rather than leaving stale Looks', () => {
    const target: { variants?: unknown[] } = { variants: [VariantModel.fromJSON(RAW_FROM_DISK)] };
    applyProjectLevelSlice(target, styleSlice([]), 'styles', hydrate);
    expect(target.variants).toEqual([]);
  });

  it('an already-hydrated variant is not re-wrapped', () => {
    const model = VariantModel.fromJSON(RAW_FROM_DISK);
    const target: { variants?: unknown[] } = {};
    applyProjectLevelSlice(target, styleSlice([model]), 'styles', hydrate);
    expect(target.variants![0]).toBe(model);
  });

  it('the colours in the same file still arrive — the fix touches nothing else', () => {
    const target: { metadata?: Record<string, unknown>; variants?: unknown[] } = {};
    applyProjectLevelSlice(target, styleSlice([RAW_FROM_DISK]), 'styles', hydrate);
    expect(target.metadata!.styles).toEqual({ colors: { Brand: '#123456' } });
  });
});
