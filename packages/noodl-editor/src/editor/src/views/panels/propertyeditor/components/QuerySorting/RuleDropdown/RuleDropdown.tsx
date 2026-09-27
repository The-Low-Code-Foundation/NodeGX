import React, { useState } from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import type { Slot } from '@noodl-core-ui/types/global';

export interface RuleDropdownProps {
  label: Slot;
  value: string;

  dropdownItems: string[];

  onItemSelected: (value: string) => void;
}

export function RuleDropdown({ label, value, dropdownItems, onItemSelected }: RuleDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="queryeditor-component hoverable" onClick={() => setShowDropdown(!showDropdown)}>
      <div className="queryeditor-property-inner">
        <div className="queryeditor-property-label">{label}</div>
        {value}
      </div>

      <Icon icon={IconName.CaretDown} size={IconSize.Tiny} UNSAFE_className="queryeditor-caret-icon" />

      {showDropdown ? (
        <div className="queryeditor-dropdown">
          {dropdownItems.map((p) => (
            <div
              key={p}
              className="queryeditor-dropdown-item"
              onClick={(e) => {
                onItemSelected(p);
                setShowDropdown(false);
                e.stopPropagation();
              }}
            >
              {p}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
