/**
 * P102 CMP-005 — the font composer: a list drawn in each font, backup fonts kept for you.
 *
 * 🔴 The list offers only fonts a visitor will see (CMP-007 row 1): the faces the project ships
 * (`projectFonts`, read by the host from its module stylesheets and loaded into this window), the
 * three system stacks, and the few faces every computer has (`KNOWN_FONTS` marked `everywhere`).
 * It used to offer 25 web fonts no project shipped: picking one named it, `validate_project`
 * warned, and every visitor read the backup font. A lead the project does not ship still shows,
 * once, as the current value, saying so.
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

/** Where a row's face comes from, which is what decides whether a visitor sees it. */
type Where = 'project' | 'device' | 'everywhere' | 'missing';
type Row = { name: string; kind: FontKind; where: Where; system?: boolean };

const WHERE_WORDS: Record<Where, string> = {
  project: 'in this project',
  device: "the reader's own device font",
  everywhere: 'on every computer',
  missing: 'not in this project · visitors see the backup fonts'
};

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
  /** Families the project ships (a module stylesheet declares their `@font-face`), already loaded here. */
  projectFonts?: string[];
}) {
  const [tab, setTab] = useState<'all' | FontKind>('all');
  const [custom, setCustom] = useState('');

  const modelKind = fontKind(model);
  const rows = useMemo<Row[]>(() => {
    const kinds = new Map(KNOWN_FONTS.map((f) => [f.name.toLowerCase(), f.kind]));
    const seen = new Set<string>();
    const list: Row[] = [];
    const add = (name: string, kind: FontKind, where: Where) => {
      if (seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      list.push({ name, kind, where });
    };
    // A face the project ships whose kind nobody knows keeps the current kind: picking it must
    // not swap the backup fonts on a guess.
    for (const p of projectFonts) {
      const plain = unquoteFont(p);
      if (!isGenericFamily(plain)) add(plain, kinds.get(plain.toLowerCase()) ?? modelKind, 'project');
    }
    (['sans', 'serif', 'mono'] as FontKind[]).forEach((k) =>
      list.push({ name: SYSTEM_LEADS[k], kind: k, where: 'device', system: true })
    );
    for (const f of KNOWN_FONTS) if (f.everywhere) add(f.name, f.kind, 'everywhere');
    const lead = unquoteFont(model.lead);
    if (!isGenericFamily(lead) && !seen.has(lead.toLowerCase())) list.unshift({ name: lead, kind: modelKind, where: 'missing' });
    return list;
  }, [projectFonts, model, modelKind]);

  const currentLead = fontLeadName(model);
  const savedKind = useMemo(() => {
    const parts = savedValue.split(', ');
    return fontKind({ lead: parts[0], tail: parts.slice(1) });
  }, [savedValue]);
  const kind = modelKind;
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
                  <span className={`${css.FontKind} ${row.where === 'missing' ? css.missing : ''}`}>
                    {row.where === 'missing' ? WHERE_WORDS.missing : `${KIND_WORDS[row.kind]} · ${WHERE_WORDS[row.where]}`}
                  </span>
                </span>
                {available ? (
                  <span className={css.FontSample} style={{ fontFamily: family }}>
                    Aa Bb 123
                  </span>
                ) : (
                  <span
                    className={css.Unavailable}
                    title="This font cannot be drawn in the editor on this computer."
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
        <div className={css.Help}>
          Press Enter to use it. Visitors see it only if the project ships the font; otherwise they get the backup
          fonts.
        </div>
      </div>
      <span hidden>{encodeFontFamily(model)}</span>
    </>
  );
}
