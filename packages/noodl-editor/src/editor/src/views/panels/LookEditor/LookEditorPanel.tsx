/**
 * P103 CMG-006 — the Look-only host: a Look's fields, edited without a node.
 *
 * ## The seam
 *
 * Look editing has always gone through a node's `.variant`: the property panel's `ModelProxy` in
 * `editMode === 'variant'` reads and writes `node.variant` (a `VariantModel`) instead of the node,
 * and `Ports` draws whatever the proxy answers. Nothing in that path needs the node to be on a
 * canvas — it needs a node with a type and a Look name. So this host builds a **detached**
 * `NodeGraphNode` (`{ type: typename, variant: name }`, no owner, no parameters of its own), puts
 * the same `ModelProxy` in variant mode on it, and mounts the same `Ports` view. Every write lands
 * on the project's `VariantModel` through `VariantModel.setParameter(…, { undo: true })` — one undo
 * step per field, `variantParametersChanged` to the viewer (`ViewerConnection.ts`) so every wearer
 * on the canvas follows, and to the autosave (`projectmodel.ts`). Exactly the node-side path, with
 * the node taken out.
 *
 * Chosen over a drawer inside the Styles panel: the inspector is where fields are edited for a
 * node (P101 INS-001), so a Look's fields belong in the same column, beside the Styles list that
 * opened them rather than pushing it down.
 *
 * ## What it says
 *
 * *Editing the Look **Card** · worn by 14 nodes* — so nobody thinks they are changing one node.
 * Visual states (hover, pressed) are drawn with the same `VisualStates` control the node side
 * uses, so nothing is dropped silently (§5).
 */
import React, { useEffect, useReducer, useRef, useState } from 'react';

import { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { ProjectModel } from '@noodl-models/projectmodel';
import { SidebarModel } from '@noodl-models/sidebar';

import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { VisualStates } from '../propertyeditor/components/VisualStates';
import { Ports } from '../propertyeditor/DataTypes/Ports';
import { ModelProxy } from '../propertyeditor/models/modelProxy';
import { displayTypeName } from '../StylesPanel/format';
import { revealStyle } from '../StylesPanel/stylesPanelRoute';
import css from './LookEditorPanel.module.scss';

// The property editor's own stylesheets: the Ports rows and the edit-mode tint are theirs.
require('../../../styles/propertyeditor/propertyeditor.css');
require('../../../styles/propertyeditor/variantseditor.css');

export interface LookEditorPanelProps {
  typename: string;
  name: string;
}

/**
 * The Look by TYPENAME and name. ⚠️ `ProjectModel.findVariant(name, nodetype)` takes a node TYPE
 * object and reads `nodetype.localName`; handed the typename string it reads `undefined` and finds
 * nothing — which is how this host first said *"no longer in the project"* about a Look that was.
 */
export function findLook(project: { variants: { name: string; typename: string }[] }, typename: string, name: string) {
  return project.variants.find((v) => v.name === name && v.typename === typename);
}

export function LookEditorPanel({ typename, name }: LookEditorPanelProps) {
  const groupsRef = useRef<HTMLDivElement>(null);
  const [proxy, setProxy] = useState<ModelProxy | null>(null);
  const [portsView, setPortsView] = useState<Ports | null>(null);
  const [gone, setGone] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const project = ProjectModel.instance;
    if (!project) return;
    if (!findLook(project, typename, name)) {
      setGone(true);
      return;
    }

    // A node that exists only to carry the type and the Look name. Never on a graph.
    const node = new NodeGraphNode({ id: `look-editor:${typename}:${name}`, type: typename, variant: name, parameters: {} });
    const modelProxy = new ModelProxy({ model: node });
    modelProxy.setEditMode('variant');

    const view = new Ports({ model: modelProxy });
    view.render();
    groupsRef.current?.replaceChildren(view.el);
    setProxy(modelProxy);
    setPortsView(view);

    // The Look can be renamed or deleted under this host from the Styles panel or a node.
    const group = {};
    project.on(
      ['variantRenamed', 'variantDeleted', 'variantAdded', 'variantCreated', 'variantUpdated'],
      () => {
        const p = ProjectModel.instance;
        if (!p || !findLook(p, typename, name)) setGone(true);
        else bump();
      },
      group
    );

    return () => {
      view.dispose();
      ProjectModel.instance?.off(group);
      setProxy(null);
      setPortsView(null);
    };
  }, [typename, name]);

  const wearers = ProjectModel.instance?.variantWearerCounts(typename)[name] ?? 0;
  const wornBy = wearers === 0 ? 'worn by nothing yet' : wearers === 1 ? 'worn by 1 node' : `worn by ${wearers} nodes`;
  const hasStates = Boolean(proxy && proxy.model.type && proxy.model.type.visualStates !== undefined);

  const close = () => SidebarModel.instance.hidePanels();

  return (
    <BasePanel title="Look" hasContentScroll>
      <div className={css['Header']} data-test="look-editor-header" data-look-name={name} data-look-typename={typename}>
        <div className={css['Title']}>
          Editing the Look <strong>{name}</strong>
          <span className={css['Meta']}>
            {' '}
            · {displayTypeName(typename)} · {wornBy}
          </span>
        </div>
        <div className={css['Actions']}>
          <button
            type="button"
            className={css['Action']}
            data-test="look-editor-show-in-styles"
            title="Show this Look in the Styles panel"
            onClick={() => revealStyle({ kind: 'look', name, typename })}
          >
            Show in Styles
          </button>
          <button type="button" className={`${css['Action']} ${css['Primary']}`} data-test="look-editor-done" onClick={close}>
            Done
          </button>
        </div>
        {wearers > 0 && (
          <div className={css['Note']}>
            Every change here reaches {wearers === 1 ? 'the node wearing it' : `all ${wearers} nodes wearing it`}. ⌘Z
            undoes one field at a time.
          </div>
        )}
      </div>

      {gone ? (
        <div className={css['Gone']}>This Look is no longer in the project.</div>
      ) : (
        // The property editor's shell, so `Ports` draws as it does on a node, in its edit-mode tint.
        <div className="sidebar-panel property-editor-shell">
          <div className="sidebar-property-editor variants-sidepanel-edit-mode">
            <div className="visual-states">
              {hasStates && proxy && portsView && (
                <VisualStates
                  model={proxy as never}
                  portsView={portsView as never}
                  onVisualStateChanged={(state: { name: string }) => {
                    proxy.setVisualState(state.name);
                    portsView.render();
                    groupsRef.current?.replaceChildren(portsView.el);
                  }}
                />
              )}
            </div>
            <div className="groups" ref={groupsRef} data-test="look-editor-fields" />
          </div>
        </div>
      )}
    </BasePanel>
  );
}
