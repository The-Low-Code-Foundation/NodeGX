/**
 * P109 ISL-005 — a Function's Uses: the project's script files its code reaches as `Scripts.<name>`
 * (the mockup's first screen, the panel's Uses group).
 *
 * One row per file: its path, the name the code uses for it, and a remove button; a file the project
 * no longer has is marked, as the write gate would refuse it. Under the rows, a picker of the files
 * not yet used and "New script…". Clicking a file opens it.
 *
 * The rows are the list the runtime will load, read with the runtime's own `scriptUsesOf`, so what
 * the panel shows and what runs cannot disagree.
 */
import React from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

import { scriptAlias } from '@noodl/runtime/src/scriptfiles';

import css from './ScriptUsesInput.module.scss';

export interface ScriptUsesInputProps {
  /** The files this Function uses, as the project names them. */
  uses: string[];
  /** Every script file in the project. */
  available: string[];
  onAdd: (path: string) => void;
  onRemove: (path: string) => void;
  onOpen: (path: string) => void;
  onNew: () => void;
}

const NEW_VALUE = '\u0000new';

export function ScriptUsesInput({ uses, available, onAdd, onRemove, onOpen, onNew }: ScriptUsesInputProps) {
  const known = new Set(available);
  const unused = available.filter((p) => !uses.includes(p));

  return (
    <div className={css.Root} data-test="script-uses">
      {uses.map((path) => {
        const missing = !known.has(path);
        return (
          <div key={path} className={missing ? `${css.Row} ${css.Missing}` : css.Row} data-test="script-uses-row" data-path={path}>
            <button
              type="button"
              className={css.Open}
              onClick={() => onOpen(path)}
              title={missing ? `The project has no script file scripts/${path}` : `Open scripts/${path}`}
            >
              <span className={css.Glyph}>
                <Icon icon={IconName.Code} size={IconSize.Small} />
              </span>
              <span className={css.Path}>{path}</span>
              <code className={css.Alias}>{missing ? 'missing' : `Scripts.${scriptAlias(path)}`}</code>
            </button>
            <button
              type="button"
              className={css.Remove}
              aria-label={`Stop using ${path}`}
              title={`Stop using ${path}`}
              onClick={() => onRemove(path)}
            >
              <Icon icon={IconName.Close} size={IconSize.Tiny} />
            </button>
          </div>
        );
      })}

      <label className={css.Picker}>
        <span className={css.PickerLabel}>
          <Icon icon={IconName.Plus} size={IconSize.Tiny} />
          Use a script…
        </span>
        <select
          className={css.Select}
          value=""
          data-test="script-uses-add"
          aria-label="Use a script file"
          onChange={(e) => {
            const value = e.target.value;
            if (value === NEW_VALUE) onNew();
            else if (value) onAdd(value);
          }}
        >
          <option value="" disabled>
            Use a script…
          </option>
          {unused.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={NEW_VALUE}>New script…</option>
        </select>
      </label>

      <p className={css.Help}>
        These files are loaded before this Function runs. Its code reaches each one by the name on the right.
      </p>
    </div>
  );
}
