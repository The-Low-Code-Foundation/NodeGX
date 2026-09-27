import classNames from 'classnames';
import React from 'react';

import { PropertyPanelBaseInputProps } from '@noodl-core-ui/components/property-panel/PropertyPanelBaseInput';

import css from './PropertyPanelCheckbox.module.scss';

export interface PropertyPanelCheckboxProps extends Omit<PropertyPanelBaseInputProps<boolean>, 'type'> {}

/**
 * Boolean property control. PAR-002: renders as the mock's 32×19 toggle
 * switch (accent on / border-strong off, white knob) — same checkbox input
 * semantics underneath.
 */
export function PropertyPanelCheckbox({ value, onChange, isConnected, isChanged }: PropertyPanelCheckboxProps) {
  return (
    <div className={css['Root']}>
      <input
        type="checkbox"
        // HLT-010: this carried `value={null}`, which React reports as an error — once per session,
        // so it hid behind whichever null input rendered first (HLT-003 fixed that one). A
        // checkbox's state is `checked`; `value` is only what a form would submit, and nothing does.
        // `Boolean` so an unset property is a controlled `false`, never uncontrolled.
        checked={Boolean(value)}
        className={css['Checkbox']}
        role="switch"
        aria-checked={Boolean(value)}
        onChange={() => onChange(!value)}
      />

      <div
        className={classNames(
          css['FauxCheckbox'],
          value && css['is-checked'],
          isChanged && css['is-changed'],
          isConnected && css['is-connected']
        )}
      />
    </div>
  );
}
