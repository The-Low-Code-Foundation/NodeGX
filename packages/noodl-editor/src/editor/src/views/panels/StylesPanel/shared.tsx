import React, { useCallback, useEffect, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { StylesModel } from '@noodl-models/StylesModel';
import { EditorSettings } from '@noodl-utils/editorsettings';

import { NodeGraphContextTmp } from '../../../contexts/NodeGraphContext/NodeGraphContext';
import { ToastLayer } from '../../ToastLayer/ToastLayer';

import { CollapsableSection } from '@noodl-core-ui/components/sidebar/CollapsableSection';
import { SectionVariant } from '@noodl-core-ui/components/sidebar/Section';

import css from './StylesPanel.module.scss';
import { readSectionOpenState, SectionOpenState, StylesSectionId } from './stylesPanelRoute';

/**
 * One `StylesModel` per mounted panel, disposed with it.
 *
 * `StylesModel`'s constructor reads `ProjectModel.instance` and binds `EventDispatcher` listeners,
 * so it is not something to build during render. Every other reader in the editor does exactly
 * this (`colorstylepicker`, `TextStylePicker`, `ProjectDesignTokenContext`), and they all re-read
 * on `stylesChanged` rather than trusting the copy they hold.
 */
export function useStylesModel(): { stylesModel: StylesModel | null; revision: number } {
  const [stylesModel, setStylesModel] = useState<StylesModel | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!ProjectModel.instance) return;

    const model = new StylesModel();
    setStylesModel(model);

    // Every write goes through the model and comes back as this event, so the panel never has to
    // guess what its own edit did — it re-reads. That is also what makes an undo redraw the list.
    model.on('stylesChanged', () => setRevision((r) => r + 1));

    return () => {
      model.dispose();
      setStylesModel(null);
    };
  }, []);

  return { stylesModel, revision };
}

/**
 * Redraw when the project's Looks change.
 *
 * 🔴 `variantRenamed` is raised on the **PROJECT**, not on a node — the property panel spent a
 * session learning that, because it subscribed to node events only and went on printing a Look
 * name that no longer existed anywhere. Every event this list can be wrong about is a project
 * event, so they are all listed here by name.
 */
export function useLooksRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const project = ProjectModel.instance;
    if (!project) return;

    const group = {};
    project.on(
      ['variantCreated', 'variantAdded', 'variantDeleted', 'variantRenamed', 'variantUpdated'],
      () => setRevision((r) => r + 1),
      group
    );

    return () => {
      // Leaving a project clears the singleton before React finishes unmounting, so this can run
      // with no instance left to detach from — `ProjectDesignTokenContext` has the same guard and
      // the same reason: throwing here takes the editor window down.
      ProjectModel.instance?.off(group);
    };
  }, []);

  return revision;
}

/**
 * P103 CMG-005 §3.2 — which sections are open, remembered per person.
 *
 * `EditorSettings` is the store the sidebar already uses for its widths and float rects
 * (`useSidePanelLayout.ts`) and the inspector for its collapsed state, so it is the one here:
 * a person's panel opens the way they left it, on every project, and survives a restart.
 * Nothing about it goes in the project file.
 */
const SECTIONS_SETTING = 'styles.sections';

export function useStylesSectionsOpen(): [SectionOpenState, (id: StylesSectionId, open: boolean) => void] {
  const [open, setOpen] = useState<SectionOpenState>(() =>
    readSectionOpenState(EditorSettings.instance.get(SECTIONS_SETTING))
  );

  const set = useCallback((id: StylesSectionId, isOpen: boolean) => {
    setOpen((prev) => {
      if (prev[id] === isOpen) return prev;
      const next = { ...prev, [id]: isOpen };
      EditorSettings.instance.set(SECTIONS_SETTING, next);
      return next;
    });
  }, []);

  return [open, set];
}

/**
 * CMG-004 §3.3 — *Reset this section (N)* in a section header. `undefined` when nothing in the
 * section differs from its default, so the header carries no dead button.
 */
export interface SectionReset {
  count: number;
  onReset: () => void;
}

export interface StylesSectionProps {
  id: StylesSectionId;
  title: string;
  /** What this section holds, in a sentence, for someone who has never met the distinction. */
  subtitle?: string;
  isFirst?: boolean;
  /** CMG-005: controlled by the panel, so `revealStyle` can open a section from outside. */
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reset?: SectionReset;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function StylesSection({
  id,
  title,
  subtitle,
  isFirst,
  isOpen,
  onOpenChange,
  reset,
  actions,
  children
}: StylesSectionProps) {
  const headerActions =
    reset || actions ? (
      <span className={css['HeaderActions']}>
        {reset && (
          <button
            type="button"
            className={css['SectionReset']}
            data-test={`section-reset-${id}`}
            title={
              reset.count === 1
                ? 'Put the one changed token here back to its default'
                : `Put the ${reset.count} changed tokens here back to their defaults — you will be asked first`
            }
            onClick={reset.onReset}
          >
            Reset {reset.count}
          </button>
        )}
        {actions}
      </span>
    ) : undefined;

  return (
    <CollapsableSection
      sectionId={id}
      title={title}
      variant={SectionVariant.Panel}
      hasVisibleOverflow
      isCollapsed={!isOpen}
      onCollapsedChange={(collapsed) => onOpenChange(!collapsed)}
      actions={headerActions}
      UNSAFE_style={{ marginTop: isFirst ? '12px' : '8px' }}
    >
      {subtitle ? <div className={css['SectionSubtitle']}>{subtitle}</div> : null}
      {children}
    </CollapsableSection>
  );
}

export interface InlineNameInputProps {
  placeholder: string;
  initialValue?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

/**
 * The one text field the panel uses, for both "name the new one" and "rename this one".
 *
 * `autoFocus` is not enough on its own anywhere this panel's neighbours live — they mount on a
 * non-React host — but this panel is React all the way down, so it is, and the ref is here for the
 * selection rather than the focus.
 */
export function InlineNameInput({ placeholder, initialValue, onCommit, onCancel }: InlineNameInputProps) {
  const [value, setValue] = useState(initialValue ?? '');

  return (
    <div className={css['InlineInputRow']}>
      <input
        className={css['InlineInput']}
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(value.trim());
          // Escape must reach this field and stop here. The panel sits in the sidebar and the
          // editor's own key handling treats Escape as "deselect"; letting it through would cancel
          // the rename and change the canvas selection in one press.
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
        onBlur={() => onCancel()}
      />
    </div>
  );
}

/**
 * P94 STY-006 AC5 — go to the node that wears this style.
 *
 * 🔴 **`switchToComponent(component, { node })` is the door, and it is the SAME door** the canvas
 * uses for a breadcrumb, a navigation-history step and "edit this component" on a node's context
 * menu. It clears the selection, selects the node and pans the viewport so the node is centred —
 * all of which is what "takes you there" means and none of which this panel should reimplement.
 *
 * 🔴 **The component is resolved at the moment of the press, by name.** A wearer list can be a
 * minute old, and a `ComponentModel` captured when it was drawn is a reference to something that
 * may have been deleted since. `getComponentWithName` returning nothing is a message; a stale model
 * is a crash inside the canvas.
 *
 * ⚠️ `args.node` is read for `.id` only (`findNodeWithId(args.node.id)`), so the id is the whole
 * identity and there is no `NodeGraphNode` to find first. The cast says that, rather than this
 * panel walking the graph to produce a model the canvas is about to look up again anyway.
 */
export function useGoToWearer(): (wearer: { componentName: string; nodeId: string }) => void {
  return useCallback((wearer) => {
    const component = ProjectModel.instance?.getComponentWithName(wearer.componentName);

    if (!component) {
      ToastLayer.showError(`That node's component (${wearer.componentName}) is not in this project any more`);
      return;
    }

    if (!NodeGraphContextTmp.switchToComponent) {
      // The canvas has not mounted — opening a project is the only way to be here, so this is a
      // race and not a state. Saying so beats a press that silently does nothing.
      ToastLayer.showError('The canvas is not ready yet');
      return;
    }

    NodeGraphContextTmp.switchToComponent(component, {
      node: { id: wearer.nodeId } as TSFixme,
      pushHistory: true
      /*
       * P101 INS-002 — this carried `keepSidePanel: true`, because selecting the node swapped the
       * Styles panel out for Properties and a person working through nine wearers lost the list on
       * the first one (P94 STY-006, found by the drive). Properties has its own column now: the
       * list stays on the left and each wearer's properties appear on the right, which is the
       * "use it in conjunction" case Richard named on drive A.
       */
    });
  }, []);
}

/**
 * Which row's wearer list is open, for one section.
 *
 * 🔴 **One at a time.** The rail is narrow and a list is up to N lines tall; two open lists put the
 * second row's wearers a screen below the number that opened them, which is the *"buried under
 * ninety swatches"* shape the shot caught at s8. Pressing an open row closes it.
 */
export function useOpenUsageRow(): [string | null, (key: string) => void] {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = useCallback((key: string) => setOpenKey((current) => (current === key ? null : key)), []);
  return [openKey, toggle];
}
