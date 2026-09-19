import React, { useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { lookWearersIn } from '@noodl-models/StylesModel.usage';

import { IconName } from '@noodl-core-ui/components/common/Icon';

import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { InlineNameInput, StylesSection, useGoToWearer, useLooksRevision, useOpenUsageRow } from '../../shared';
import { displayTypeName } from '../../format';
import { StyleRow, StyleSectionEmpty } from '../StyleRow';

/**
 * The project's Looks — STY-002's one concept, listed where a person can find them without
 * selecting a node first.
 *
 * 🔴 **There is no "New Look" button here, and that is the design, not an omission.** A Look is
 * made of a node's styles ("save this text's styles as a new Look…", STY-003's menu), so creating
 * one from an empty panel would mean inventing a node type and a set of parameters out of nothing —
 * which is the MCP authoring question, named as its own phase in README §4.1. This surface renames,
 * deletes and counts. STY-005 §3 says so in writing.
 */
export function LooksSection() {
  const looksRevision = useLooksRevision();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [openUsage, toggleUsage] = useOpenUsageRow();
  const goToWearer = useGoToWearer();

  const looks = useMemo(() => {
    const project = ProjectModel.instance;
    if (!project) return [];

    /**
     * 🔴 **P94 STY-006 AC2 + AC6 — one walk per TYPENAME, not one per Look.**
     *
     * `variantWearerCounts(typename)` walks every node in the project and answers for every Look of
     * that type at once; calling it inside the `map` walked the whole graph once per row, which was
     * already wrong at s8 and becomes indefensible now that each row also wants the wearers
     * themselves. Cached by typename here, so a project with eight Button Looks walks once.
     */
    const byTypename = new Map<string, Record<string, ReturnType<typeof lookWearersIn>[string]>>();
    const wearersFor = (typename: string) => {
      if (!byTypename.has(typename)) byTypename.set(typename, lookWearersIn(project, typename));
      return byTypename.get(typename);
    };

    // 🔴 `variants` holds `VariantModel`s, not plain objects — a slice applied from disk used to
    // leave plain JSON here and every save then threw on `v.toJSON()`. STY-002 made the hydrator a
    // required parameter; this list reads `.name` and `.typename` off real models.
    return project.variants.map((variant) => {
      const worn = wearersFor(variant.typename)[variant.name] ?? [];
      return {
        variant,
        name: variant.name,
        typename: variant.typename,
        // 🔴 The count IS the list's length. It is not read from `variantWearerCounts` beside it —
        // that function is now the same `.length` over the same walk, and asking both would be two
        // answers where the whole task is that there is one.
        worn
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looksRevision]);

  function onRename(variant, newName: string) {
    setRenaming(null);
    if (!newName || newName === variant.name) return;

    if (ProjectModel.instance.findVariant(newName, variant.typename)) {
      ToastLayer.showError('A Look with that name already exists');
      return;
    }

    ProjectModel.instance.renameVariant(variant, newName, { undo: true });
    ToastLayer.showSuccess('Look renamed');
  }

  function onDelete(variant) {
    // The model refuses to delete a Look in use, and it is right to: deleting one would strip the
    // styles off everything wearing it. The row already says how many that is, so this message
    // tells a person what to do rather than only that they cannot.
    if (ProjectModel.instance.isVariantUsed(variant)) {
      ToastLayer.showError(`${variant.name} is worn by something — take those nodes out of it first`);
      return;
    }

    ProjectModel.instance.deleteVariant(variant, { undo: true });
  }

  return (
    <StylesSection
      title="Looks"
      subtitle="A named set of styles a node can wear. Change the Look and everything wearing it changes."
    >
      {looks.length === 0 && (
        <StyleSectionEmpty>
          No Looks yet. Select a node and use <em>Save this node&rsquo;s styles as a new Look…</em> in its
          Look menu.
        </StyleSectionEmpty>
      )}

      {looks.map(({ variant, name, typename, worn }) =>
        renaming === `${typename}/${name}` ? (
          <InlineNameInput
            key={`${typename}/${name}`}
            placeholder="New name"
            initialValue={name}
            onCommit={(value) => onRename(variant, value)}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <StyleRow
            // 🔴 Keyed by type AND name: two Looks may share a name if they are for different node
            // types (`findVariant` takes both), so a name alone is not an identity here.
            key={`${typename}/${name}`}
            name={name}
            value={displayTypeName(typename)}
            layer="Look"
            usageCount={worn.length}
            // A Look is worn by nodes and never by another Look — STY-DESIGN §9 left
            // Look-extends-Look explicitly unbuilt — so this list has no `variants` half.
            wearers={{ nodes: worn, variants: [] }}
            isUsageOpen={openUsage === `${typename}/${name}`}
            onToggleUsage={() => toggleUsage(`${typename}/${name}`)}
            onGoToWearer={goToWearer}
            menuItems={[
              { label: 'Rename', icon: IconName.Pencil, onClick: () => setRenaming(`${typename}/${name}`) },
              {
                label: 'Delete',
                icon: IconName.Trash,
                isDangerous: true,
                isDisabled: worn.length > 0,
                tooltip: worn.length > 0 ? 'Worn by something — take those nodes out of it first' : undefined,
                onClick: () => onDelete(variant)
              }
            ]}
          />
        )
      )}
    </StylesSection>
  );
}
