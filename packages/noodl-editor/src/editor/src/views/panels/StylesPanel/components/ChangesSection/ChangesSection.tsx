/**
 * P103 CMG-004 §3.2 — the answer to *"I didn't even know what the 150 tokens were."*
 *
 * The strip at the top of the Styles panel: how many tokens differ from the defaults, and, when
 * pressed, which ones — name, *yours → default*, drawn, grouped by section — each with its own
 * *Put back*, each section with *Put back these N*, and *Put all back* for the lot. Every reset of
 * more than one token goes through `confirmReset` first (README §7). The count comes from
 * `tokenChanges`, never from `isCustom`: a stored value equal to its default is not a change.
 *
 * It sits above the sections rather than inside one because it is about all of them — inside
 * *Other tokens* the old sentence read as *reset the other tokens* (finding 7).
 */

import React, { useMemo, useState } from 'react';

import type { StyleTokenRecord } from '@noodl-models/StyleTokensModel/TokenCategories';
import {
  ChangedToken,
  TokenChanges,
  describeChangeCount,
  isColourCategory
} from '@noodl-models/StyleTokensModel/TokenChanges';

import { STYLES_SECTIONS, StylesSectionSpec } from '../../stylesPanelRoute';
import css from './ChangesSection.module.scss';

export interface ChangesSectionProps {
  changes: TokenChanges;
  resolve: (value: string) => string;
  /** One token. Never confirmed: the row says what it does. */
  onResetOne: (name: string) => void;
  /** Several tokens. The caller confirms (`confirmReset`) before it writes. */
  onResetMany: (changed: ChangedToken[], scope: { kind: 'all' } | { kind: 'section'; title: string }) => void;
}

export function ChangesSection({ changes, resolve, onResetOne, onResetMany }: ChangesSectionProps) {
  const [open, setOpen] = useState(false);
  const n = changes.changed.length;

  const bySection = useMemo(() => {
    const out: { section: StylesSectionSpec; rows: ChangedToken[] }[] = [];
    for (const section of STYLES_SECTIONS) {
      if (!section.group) continue;
      const rows = changes.changed.filter((c) => c.group === section.group);
      if (rows.length) out.push({ section, rows });
    }
    return out;
  }, [changes]);

  if (n === 0) {
    return (
      <div className={css['Root']} data-token-changes="0">
        <span className={css['Quiet']}>
          Every token is at its default
          {changes.added.length > 0 ? `, plus ${changes.added.length} you added` : ''}.
        </span>
      </div>
    );
  }

  return (
    <div className={css['Root']} data-token-changes={String(n)}>
      <div className={css['Line']}>
        <button
          type="button"
          className={css['CountButton']}
          data-test="token-changes-toggle"
          aria-expanded={open ? 'true' : 'false'}
          title={open ? 'Hide the list' : 'See which tokens, and what each goes back to'}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={css['Caret']}>{open ? '▾' : '▸'}</span>
          {describeChangeCount(n)}
        </button>
        <button
          type="button"
          className={css['ResetAll']}
          data-test="token-changes-reset-all"
          title={`Put all ${n} back to their defaults — you will be asked first`}
          onClick={() => onResetMany(changes.changed, { kind: 'all' })}
        >
          Put all back…
        </button>
      </div>

      {open && (
        <div className={css['List']} data-test="token-changes-list">
          {bySection.map(({ section, rows }) => (
            <div key={section.id} className={css['Group']} data-changes-group={section.id}>
              <div className={css['GroupHead']}>
                <span className={css['GroupTitle']}>
                  {section.title} ({rows.length})
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className={css['GroupReset']}
                    data-test={`token-changes-reset-${section.id}`}
                    onClick={() => onResetMany(rows, { kind: 'section', title: section.title })}
                  >
                    Put back these {rows.length}…
                  </button>
                )}
              </div>
              {rows.map((c) => (
                <ChangeRow key={c.token.name} change={c} resolve={resolve} onReset={() => onResetOne(c.token.name)} />
              ))}
            </div>
          ))}
          {changes.added.length > 0 && (
            <div className={css['Added']}>
              {changes.added.length === 1 ? '1 token you added has' : `${changes.added.length} tokens you added have`} no
              default and {changes.added.length === 1 ? 'is' : 'are'} never reset:{' '}
              {changes.added.map((t) => t.name).join(', ')}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeRow({ change, resolve, onReset }: { change: ChangedToken; resolve: (v: string) => string; onReset: () => void }) {
  const { token, defaultValue } = change;
  return (
    <div className={css['Row']} data-token-change={token.name}>
      <span className={css['Name']} title={token.description}>
        {token.name}
      </span>
      <span className={css['Pair']}>
        <ValueChip token={token} value={token.value} resolve={resolve} />
        <span className={css['Arrow']}>→</span>
        <ValueChip token={token} value={defaultValue} resolve={resolve} />
      </span>
      <button
        type="button"
        className={css['RowReset']}
        data-test={`token-change-reset-${token.name}`}
        title={`Put ${token.name} back to ${defaultValue}`}
        onClick={onReset}
      >
        Put back
      </button>
    </div>
  );
}

/**
 * A value you can see: a swatch for a colour, a lit card for a shadow, a painted strip for a
 * gradient, a rounded box for a radius, and the text for everything else.
 */
function ValueChip({ token, value, resolve }: { token: StyleTokenRecord; value: string; resolve: (v: string) => string }) {
  const cat = String(token.category);
  const painted = resolve(value);
  if (isColourCategory(cat)) {
    return (
      <span className={css['Chip']} title={value}>
        <span className={css['Swatch']} style={{ backgroundColor: painted }} />
        <span className={css['Text']}>{value}</span>
      </span>
    );
  }
  if (cat === 'shadow') {
    return (
      <span className={css['Chip']} title={value}>
        <span className={css['ShadowStage']}>
          <span className={css['ShadowCard']} style={{ boxShadow: value === 'none' ? 'none' : painted }} />
        </span>
      </span>
    );
  }
  if (cat === 'gradient') {
    return (
      <span className={css['Chip']} title={value}>
        <span className={css['Strip']} style={{ backgroundImage: painted }} />
      </span>
    );
  }
  if (cat === 'border-radius') {
    return (
      <span className={css['Chip']} title={value}>
        <span className={css['RadiusBox']} style={{ borderRadius: painted }} />
        <span className={css['Text']}>{value}</span>
      </span>
    );
  }
  return (
    <span className={css['Chip']} title={value}>
      <span className={css['Text']}>{value}</span>
    </span>
  );
}
