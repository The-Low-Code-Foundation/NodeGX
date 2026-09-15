/**
 * LauncherSearchField — CHR-005: the launcher's one search box, and it is HOOK-FREE.
 *
 * Projects (inside `LauncherSearchBar`) and the Templates toolbar both draw this. Templates used to
 * draw a second, plainer `<input>` because the bar holds its ⌘K listener in `useEffect`, and the
 * Templates body must render under `tests-unit/support/renderElements`, which throws on a hook. So
 * the box lives here and the shortcut stays in the bar: pass `shortcutHint` only where a listener
 * backs it, or the keycap is a promise nothing keeps.
 *
 * @module noodl-core-ui/preview/launcher
 */

import React from 'react';

import css from './LauncherSearchBar.module.scss';

export interface LauncherSearchFieldProps {
  value: string;
  /** Also the field's accessible name. */
  placeholder: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  shortcutHint?: string;
  testId?: string;
}

export function LauncherSearchField({
  value,
  placeholder,
  onChange,
  inputRef,
  shortcutHint,
  testId
}: LauncherSearchFieldProps) {
  return (
    <div className={css['Search']}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <input
        ref={inputRef}
        className={css['SearchInput']}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        data-test={testId}
      />
      {shortcutHint && <kbd className={css['Kbd']}>{shortcutHint}</kbd>}
    </div>
  );
}
