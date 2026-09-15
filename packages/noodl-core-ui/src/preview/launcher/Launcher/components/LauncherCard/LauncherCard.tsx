/**
 * LauncherCard — CHR-005 / R5: the one launcher card. Projects and Templates draw the same object.
 *
 * A 16:9 picture slot, an eyebrow, a title, a sentence and a footer row: the homepage's demo card
 * (nodegx.io's `.demos`) at the launcher's scale. The picture is a SLOT — a project passes its
 * captured `thumbURI`, a template its shot once the shelf carries one (CHR-006, R4), and
 * `LauncherCardWireframe` until then. Never a kitten.
 *
 * ⚠️ HOOK-FREE, like everything `TemplatesTabBody` renders (`tests-unit/support/renderElements`
 * calls components with no React dispatcher). State a picture needs — a capture that failed to
 * load — belongs to the caller's picture component, not to the card.
 *
 * ⚠️ A `role="button"` DIV, not a `<button>`: a project card carries a kebab menu, and a button
 * inside a button is invalid HTML that the parser repairs by moving the inner one out.
 *
 * @module noodl-core-ui/preview/launcher
 */

import classNames from 'classnames';
import React from 'react';

import css from './LauncherCard.module.scss';

export interface LauncherCardProps {
  picture: React.ReactNode;
  /** The mono line above the title: a category, as it should read. */
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** The row pinned to the bottom of the card: an action, tags, a menu. */
  footer?: React.ReactNode;
  onClick?: () => void;
  testId?: string;
  /** A caller-only rule beside the card's own (the project card's `user-select`). */
  className?: string;
}

export function LauncherCard({
  picture,
  eyebrow,
  title,
  description,
  footer,
  onClick,
  testId,
  className
}: LauncherCardProps) {
  return (
    <div
      className={classNames(css['Card'], className)}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      data-test={testId}
    >
      <div className={css['Picture']}>{picture}</div>
      <div className={css['Body']}>
        {eyebrow && <span className={css['Eyebrow']}>{eyebrow}</span>}
        <h3 className={css['Title']} title={title}>
          {title}
        </h3>
        {description && <p className={css['Description']}>{description}</p>}
        {footer && <div className={css['Footer']}>{footer}</div>}
      </div>
    </div>
  );
}

/**
 * The grid every card sits in: as many 280px-or-wider columns as fit, so the page is one column at
 * the window's 600px minimum and four at 1368. A list, so a screen reader hears how many there are.
 */
export function LauncherCardGrid({ children }: { children?: React.ReactNode }) {
  return (
    <ul className={css['Grid']}>
      {React.Children.map(children, (child) => (child ? <li className={css['Item']}>{child}</li> : null))}
    </ul>
  );
}

/** The footer's action words ("Use this template →"). */
export function LauncherCardAction({ children }: { children?: React.ReactNode }) {
  return <span className={css['Action']}>{children}</span>;
}

/** A quiet mono tag in the footer ("Built in"). Not a control. */
export function LauncherCardTag({ children }: { children?: React.ReactNode }) {
  return <span className={css['Tag']}>{children}</span>;
}

/**
 * The picture for a card with no image yet: a page drawn in outline, in the theme's own tones.
 * Deliberately not the project placeholder's gradient-and-initial — that one means "a project
 * never opened" (R5), and a template is not one.
 */
export function LauncherCardWireframe() {
  return (
    <div className={css['Wireframe']} aria-hidden="true">
      <div className={css['WireframePage']}>
        <i className={css['WireframeNav']} />
        <i className={css['WireframeHeading']} />
        <i className={css['WireframeLine']} />
        <i className={css['WireframeLineShort']} />
        <i className={css['WireframeBlock']} />
      </div>
    </div>
  );
}
