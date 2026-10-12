import React, { useState } from 'react';

import type { NodeGraphNode } from '@noodl-models/nodegraphmodel';

import { rulesFor } from './nodeRules';
import { NodeRulesSection } from './NodeRulesSection';
import css from './SpecSections.module.scss';
import { TryNodePanel } from './TryNodePanel';

/**
 * NSP-019 — the two spec-fed sections under a node's property rows: *What this node does*
 * (AC1, the rules) and *Try this node* (AC2, the interpreter).
 *
 * Mounted by the Properties tab (`propertyeditor/index.tsx`) under the legacy rows, keyed by node.
 * It draws NOTHING for a node whose catalog entry has no `rules` — absent, not empty (AC1's second
 * half) — and that same test is what offers the Try panel: the catalog carries no other sign that a
 * spec exists, and asking the spec package would load every spec on every selection.
 *
 * The folds remember their open/closed choice across nodes in module scope, as the tab strip
 * remembers its tab (`rememberedTab`): a person reading rules node after node should not reopen the
 * fold each time.
 */
let rulesOpen = true;
let tryOpen = false;

export interface SpecSectionsProps {
  model: NodeGraphNode;
}

export function SpecSections({ model }: SpecSectionsProps) {
  const typeName = model.typename;
  const groups = rulesFor(typeName);
  const [isRulesOpen, setRulesOpen] = useState(rulesOpen);
  const [isTryOpen, setTryOpen] = useState(tryOpen);

  if (!groups) return null;

  return (
    <div className={css['Root']}>
      <NodeRulesSection
        groups={groups}
        isOpen={isRulesOpen}
        onToggle={(open) => {
          rulesOpen = open;
          setRulesOpen(open);
        }}
      />
      <details
        className={css['Fold']}
        open={isTryOpen}
        onToggle={(event) => {
          const open = (event.currentTarget as HTMLDetailsElement).open;
          tryOpen = open;
          setTryOpen(open);
        }}
      >
        <summary className={css['FoldTitle']}>Try this node</summary>
        <div className={css['FoldBody']}>
          <TryNodePanel typeName={typeName} parameters={model.parameters} isActive={isTryOpen} />
        </div>
      </details>
    </div>
  );
}
