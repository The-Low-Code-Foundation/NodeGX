/**
 * LauncherPage — CHR-005: THE launcher page. Every tab renders inside one.
 *
 * One column (1120px, centred — the homepage's), one title in the display face (the one place the
 * launcher uses it), an optional lede, an actions slot beside the title, a toolbar slot under it,
 * then the content. Before this, four tabs drew four layouts — a 224px sidebar with a fixed
 * three-column grid, a full-bleed list, Learning's own padding wrapper, Community's page — so there
 * was no page to design (phase 92, CHR-005 §2).
 *
 * ⚠️ The head is top-aligned on purpose: a tab with a two-line lede and a tab with none must put
 * their titles at the same y (CHR-005 AC1), which bottom-aligning to the actions would not.
 *
 * ⚠️ HOOK-FREE. `TemplatesTabBody` and the community view are graded by
 * `tests-unit/support/renderElements`, which calls components with React's dispatcher null. The
 * slots are props, not `LauncherContext` fields (that context already carries 71).
 *
 * @module noodl-core-ui/preview/launcher
 */

import React from 'react';

import css from './LauncherPage.module.scss';

export interface LauncherPageProps {
  title: string;
  /** One sentence under the title saying what the page is for. */
  lede?: React.ReactNode;
  /** Buttons beside the title. They wrap under it when the window is narrow. */
  actions?: React.ReactNode;
  /** Search, filter chips and view controls, on one row between the head and the content. */
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
}

export function LauncherPage({ title, lede, actions, toolbar, children }: LauncherPageProps) {
  return (
    <div className={css['Root']}>
      <div className={css['Column']}>
        <div className={css['Head']}>
          <div className={css['HeadText']}>
            <h1 className={css['Title']}>{title}</h1>
            {lede && <p className={css['Lede']}>{lede}</p>}
          </div>
          {actions && <div className={css['Actions']}>{actions}</div>}
        </div>
        {toolbar && <div className={css['Toolbar']}>{toolbar}</div>}
        {children}
      </div>
    </div>
  );
}
