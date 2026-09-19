import React, { useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';

import { IconName } from '@noodl-core-ui/components/common/Icon';

import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { InlineNameInput, StylesSection, useLooksRevision } from '../../shared';
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

  const looks = useMemo(() => {
    const project = ProjectModel.instance;
    if (!project) return [];

    // 🔴 `variants` holds `VariantModel`s, not plain objects — a slice applied from disk used to
    // leave plain JSON here and every save then threw on `v.toJSON()`. STY-002 made the hydrator a
    // required parameter; this list reads `.name` and `.typename` off real models.
    return project.variants.map((variant) => ({
      variant,
      name: variant.name,
      typename: variant.typename,
      wearers: project.variantWearerCounts(variant.typename)[variant.name] ?? 0
    }));
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

      {looks.map(({ variant, name, typename, wearers }) =>
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
            usageCount={wearers}
            menuItems={[
              { label: 'Rename', icon: IconName.Pencil, onClick: () => setRenaming(`${typename}/${name}`) },
              {
                label: 'Delete',
                icon: IconName.Trash,
                isDangerous: true,
                isDisabled: wearers > 0,
                tooltip: wearers > 0 ? 'Worn by something — take those nodes out of it first' : undefined,
                onClick: () => onDelete(variant)
              }
            ]}
          />
        )
      )}
    </StylesSection>
  );
}
