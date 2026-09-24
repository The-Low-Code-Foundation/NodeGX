/**
 * P102 CMP-005 — the font composer: a list drawn in each font, backup fonts kept for you.
 *
 * ⚠️ A list "drawn in each font" can only draw the fonts the editor's own window can load. A row
 * drawn in a font that is not loadable silently falls back to the system font and *looks* like a
 * choice that was made. So each row is measured: a name whose glyphs paint no differently from
 * the generic fallback is drawn in the UI font with a small *preview unavailable* mark, never a
 * silent fallback (CMP-005 §2, AC3).
 */

import {
  encodeFontFamily,
  fontKind,
  fontLeadName,
  FONT_TAILS,
  isGenericFamily,
  KNOWN_FONTS,
  quoteFont,
  SYSTEM_LEADS,
  systemStack,
  unquoteFont,
  withLeadFont,
  type FontFamilyModel,
  type FontKind
} from '@nodegx/project-contract/token-codecs';
import React, { useMemo, useState } from 'react';

import { SectionTitle, Segmented } from './controls';
import css from './TokenComposer.module.scss';

const KIND_WORDS: Record<FontKind, string> = { sans: 'Sans serif', serif: 'Serif', mono: 'Monospace' };

// ─── Availability ────────────────────────────────────────────────────────────

const availability = new Map<string, boolean>();

/**
 * Whether the editor's window can paint this family. Measured, not asked: `document.fonts.check`
 * answers *true* for any family it has never heard of, so the test is whether the text takes a
 * different width with the family in front of each of two generics.
 */
export function isFontAvailable(name: string): boolean {
  if (isGenericFamily(name)) return true;
  const cached = availability.get(name);
  if (cached !== undefined) return cached;
  let available = false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const sample = 'mmmmmmmmmmlli1WWW@';
      const width = (font: string) => {
        ctx.font = `32px ${font}`;
        return ctx.measureText(sample).width;
      };
      const mono = width('monospace');
      const sans = width('sans-serif');
      available = width(`"${name}", monospace`) !== mono || width(`"${name}", sans-serif`) !== sans;
    }
  } catch {
    available = false;
  }
  availability.set(name, available);
  return available;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export function FontPreview({ css: value, dark }: { css: string; resolve: (v: string) => string; dark: boolean }) {
  return (
    <div className={`${css.Stage} ${dark ? css.dark : ''}`} style={{ height: 'auto', padding: 12 }}>
      <div className={css.Paragraph} style={{ fontFamily: value }}>
        <div className={css.ParagraphTitle}>Fresh bread, every morning</div>
        <div className={css.ParagraphBody}>
          Order before 9pm and we'll have it warm at your door by eight. Sourdough, rye and a seeded loaf that sells out
          by lunch.
        </div>
      </div>
    </div>
  );
}

export function drawFontPreset(value: string) {
  return <span style={{ fontFamily: value, fontSize: 18 }}>Aa</span>;
}

// ─── Controls ────────────────────────────────────────────────────────────────

type Row = { name: string; kind: FontKind; system?: boolean };

export function FontControls({
  model,
  onChange,
  savedValue,
  projectFonts = []
}: {
  model: FontFamilyModel;
  onChange: (model: FontFamilyModel) => void;
  /** The saved value, so the kind-change line can say what Apply will rewrite. */
  savedValue: string;
  /** Fonts the project already uses, listed even when they are not common. */
  projectFonts?: string[];
}) {
  const [tab, setTab] = useState<'all' | FontKind>('all');
  const [custom, setCustom] = useState('');

  const rows = useMemo<Row[]>(() => {
    const known = new Map(KNOWN_FONTS.map((f) => [f.name.toLowerCase(), f]));
    const list: Row[] = [...KNOWN_FONTS];
    for (const p of projectFonts) {
      const plain = unquoteFont(p);
      if (isGenericFamily(plain) || known.has(plain.toLowerCase())) continue;
      known.set(plain.toLowerCase(), { name: plain, kind: 'sans' });
      list.push({ name: plain, kind: 'sans' });
    }
    const lead = unquoteFont(model.lead);
    if (!isGenericFamily(lead) && !known.has(lead.toLowerCase())) list.unshift({ name: lead, kind: fontKind(model) });
    (['sans', 'serif', 'mono'] as FontKind[]).forEach((k) =>
      list.push({ name: SYSTEM_LEADS[k], kind: k, system: true })
    );
    return list;
  }, [projectFonts, model]);

  const currentLead = fontLeadName(model);
  const savedKind = useMemo(() => {
    const parts = savedValue.split(', ');
    return fontKind({ lead: parts[0], tail: parts.slice(1) });
  }, [savedValue]);
  const kind = fontKind(model);
  const tailChanged = kind !== savedKind;

  const pick = (row: Row) => {
    if (row.system) onChange(systemStack(row.kind));
    else onChange(withLeadFont(model, row.name, row.kind).model);
  };

  const visible = rows.filter((r) => tab === 'all' || r.kind === tab);

  return (
    <>
      <div className={css.Section}>
        <Segmented<'all' | FontKind>
          options={[
            { value: 'all', label: 'All' },
            { value: 'sans', label: 'Sans' },
            { value: 'serif', label: 'Serif' },
            { value: 'mono', label: 'Mono' }
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className={css.FontList} role="listbox" aria-label="Fonts">
          {visible.map((row) => {
            const on = row.name === currentLead;
            const available = row.system || isFontAvailable(row.name);
            const family = row.system
              ? FONT_TAILS[row.kind].join(', ')
              : `${quoteFont(row.name, [])}, ${FONT_TAILS[row.kind].join(', ')}`;
            return (
              <button
                key={row.name}
                type="button"
                role="option"
                aria-selected={on}
                className={`${css.FontRow} ${on ? css.on : ''}`}
                onClick={() => pick(row)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className={css.FontName} style={available ? { fontFamily: family } : undefined}>
                    {row.name}
                  </span>
                  <span className={css.FontKind}>
                    {KIND_WORDS[row.kind]}
                    {row.system ? " · the reader's own device font" : ''}
                  </span>
                </span>
                {available ? (
                  <span className={css.FontSample} style={{ fontFamily: family }}>
                    Aa Bb 123
                  </span>
                ) : (
                  <span
                    className={css.Unavailable}
                    title="This font is not installed here, so it cannot be drawn. It will still work in the app if the project loads it."
                  >
                    preview unavailable
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={css.Help}>
          Backup fonts are added for you ({FONT_TAILS[kind].join(', ')}). They show while {currentLead} loads, or if it
          can't.
        </div>
        {tailChanged && (
          <div className={css.Sentence} style={{ margin: 0 }}>
            Switching to a {KIND_WORDS[kind].toLowerCase()} font also changes the backup fonts to the{' '}
            {KIND_WORDS[kind].toLowerCase()} set when you press Apply.
          </div>
        )}
      </div>

      <div className={css.Section}>
        <SectionTitle>Another font…</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className={css.NumberInput}
            placeholder="Any font name"
            value={custom}
            aria-label="Another font"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && custom.trim()) {
                onChange(withLeadFont(model, custom.trim(), kind).model);
                setCustom('');
              }
            }}
          />
        </div>
        <div className={css.Help}>Press Enter to use it. The app must load the font itself; this only names it.</div>
      </div>
      <span hidden>{encodeFontFamily(model)}</span>
    </>
  );
}
