import React, { useEffect, useRef } from 'react';

import type { StyleTokensModel } from '@noodl-models/StyleTokensModel/StyleTokensModel';
import type { TokenPickGroup } from '@noodl-models/StyleTokensModel/TokensForPicking';

/**
 * HLT-012 — the project's spacing, typography, radius and border-width tokens, offered for picking
 * from the field they belong on.
 *
 * 🔴 **Why this is a second component and not the colour picker widened.** `ColorStylePicker` is a
 * popout that also creates, renames and deletes *colour styles*, and reaches `PopupLayer` to open a
 * colour wheel over itself. None of that exists for a spacing token — there is no "spacing style"
 * model, and a token is created in the Styles panel (P94), never here. What the two share is the
 * enumeration (`TokensForPicking`, one module, AC2) and the row markup below, which is deliberately
 * the same CSS as `DesignTokensList`'s so a token row reads identically wherever it is offered.
 *
 * ⚠️ **No filter box, and that is measured rather than lazy.** The longest list this can draw is
 * `spacing` at 31 rows; the colour picker needs a filter because its ramp is 61 on top of 25. A
 * search input invented for 31 rows is a second way to reach a list that already fits one scroll.
 *
 * ✅ **The resolved value is on the row** — `--space-3` beside `0.75rem`. Richard's ask on the
 * colour picker was the same one in the other direction (*"when I see --var(someColour) I can go
 * find out what that colour is"*), and it matters more here: nobody knows what `--text-xl` is.
 */
export interface TokenFieldPickerProps {
  /** What this field may offer, grouped by category. Never empty — the row does not open on `[]`. */
  groups: TokenPickGroup[];
  /** The model the resolved values are read from. */
  tokensModel: StyleTokensModel | null;
  /** The `var(--name)` this parameter currently holds, if it holds one — the row is marked and scrolled to. */
  currentValue?: string;
  /** Hands back `var(--name)`, never the resolved value. See {@link TokenRow}. */
  onSelect: (reference: string) => void;
}

export function TokenFieldPicker({ groups, tokensModel, currentValue, onSelect }: TokenFieldPickerProps) {
  return (
    <div
      className="token-field-picker"
      style={{ width: '230px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      data-test="token-field-picker"
    >
      <div style={{ overflow: 'hidden auto', flexGrow: 1, maxHeight: '600px' }}>
        {groups.map((group) => (
          <React.Fragment key={group.category}>
            <div className="variants-header">
              <span>{group.label}</span>
              <span className="variants-header-count">{group.tokens.length}</span>
            </div>

            {group.tokens.map((token) => (
              <TokenRow
                key={token.name}
                name={token.name}
                value={token.value}
                description={token.description}
                tokensModel={tokensModel}
                currentValue={currentValue}
                onSelect={onSelect}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * One token row.
 *
 * 🔴 **What it SETS is `var(--name)`, never the resolved length.** That is the whole point of
 * picking a token: the parameter keeps the reference, so changing `--space-3` in the Styles panel
 * moves every node that picked it. All three callers hand this string to `setParameter` unchanged,
 * and `readNumberFieldEdit`'s `token` branch is what stores it verbatim.
 */
function TokenRow({
  name,
  value,
  description,
  tokensModel,
  currentValue,
  onSelect
}: {
  name: string;
  value: string;
  description?: string;
  tokensModel: StyleTokensModel | null;
  currentValue?: string;
  onSelect: (reference: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reference = `var(${name})`;
  const isCurrent = currentValue === reference;

  const resolved = tokensModel ? tokensModel.resolveToken(name) : undefined;
  const displayValue = resolved || value;

  useEffect(() => {
    if (isCurrent && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isCurrent]);

  return (
    <div
      ref={ref}
      className="variants-pick-variant-item"
      data-token={name}
      title={description ? `${description} — ${displayValue}` : displayValue}
      style={{ backgroundColor: isCurrent ? 'var(--hover-bg-color)' : null }}
      onClick={(e) => {
        onSelect(reference);
        e.stopPropagation();
      }}
    >
      <div className="variant-item-name">{name}</div>
      <div className="token-item-value">{displayValue}</div>
    </div>
  );
}
