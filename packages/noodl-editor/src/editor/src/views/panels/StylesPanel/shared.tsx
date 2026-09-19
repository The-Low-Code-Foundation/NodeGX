import React, { useEffect, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';
import { StylesModel } from '@noodl-models/StylesModel';

import { CollapsableSection } from '@noodl-core-ui/components/sidebar/CollapsableSection';
import { SectionVariant } from '@noodl-core-ui/components/sidebar/Section';

import css from './StylesPanel.module.scss';

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

export interface StylesSectionProps {
  title: string;
  /** What this section holds, in a sentence, for someone who has never met the distinction. */
  subtitle?: string;
  isFirst?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function StylesSection({ title, subtitle, isFirst, actions, children }: StylesSectionProps) {
  return (
    <CollapsableSection
      title={title}
      variant={SectionVariant.Panel}
      hasVisibleOverflow
      actions={actions}
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
