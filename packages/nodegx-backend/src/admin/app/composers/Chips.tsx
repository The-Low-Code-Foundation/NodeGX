/**
 * `Chips` — a set with ✕ per chip and an add control (BMG-001 §3.5.2).
 *
 * The add control is free text with validation (origins, MIME types) or, when
 * `suggest` is given, a `Picker` (roles, users). Duplicates are refused
 * quietly; the order is the order they were added.
 */
import { useState } from 'preact/hooks';

import { Picker } from './Picker';

export interface ChipsProps {
  items: string[];
  onChange: (items: string[]) => void;
  /** Free-text add: returns a sentence when the text is not acceptable, null when it is. */
  validate?: (text: string) => string | null;
  /** Suggestion add: the picker's fetcher over strings. */
  suggest?: (query: string) => Promise<string[]>;
  placeholder?: string;
  disabled?: boolean;
  /** What a chip says for a value (default: the value). */
  label?: (item: string) => string;
  addLabel?: string;
  id?: string;
}

export function Chips(props: ChipsProps) {
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (props.validate) {
      const p = props.validate(value);
      if (p) {
        setProblem(p);
        return;
      }
    }
    setProblem(null);
    if (props.items.indexOf(value) !== -1) {
      setText('');
      return;
    }
    props.onChange([...props.items, value]);
    setText('');
  };

  const remove = (value: string) => props.onChange(props.items.filter((i) => i !== value));

  return (
    <div class="chips" id={props.id}>
      <div class="chips-set">
        {props.items.map((item) => (
          <span class="chip accent" key={item}>
            {props.label ? props.label(item) : item}
            {props.disabled ? null : (
              <button type="button" class="chip-x" aria-label={'Remove ' + (props.label ? props.label(item) : item)} onClick={() => remove(item)}>
                ✕
              </button>
            )}
          </span>
        ))}
        {!props.items.length ? <span class="hint">None yet.</span> : null}
      </div>
      {props.disabled ? null : props.suggest ? (
        <Picker<string>
          fetch={(q) => props.suggest!(q).then((found) => found.filter((f) => props.items.indexOf(f) === -1))}
          label={(s) => (props.label ? props.label(s) : s)}
          keyOf={(s) => s}
          value={null}
          onPick={(s) => {
            if (s) add(s);
          }}
          placeholder={props.placeholder || props.addLabel || 'Add…'}
        />
      ) : (
        <div class="chips-add">
          <input
            type="text"
            placeholder={props.placeholder || 'Add…'}
            aria-label={props.addLabel || 'Add'}
            value={text}
            onInput={(e) => {
              setText((e.currentTarget as HTMLInputElement).value);
              if (problem) setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(text);
              } else if (e.key === 'Backspace' && !text && props.items.length) {
                remove(props.items[props.items.length - 1]);
              }
            }}
          />
          <button type="button" class="btn tiny" onClick={() => add(text)}>
            {props.addLabel || 'Add'}
          </button>
          {problem ? <span class="chips-problem">{problem}</span> : null}
        </div>
      )}
    </div>
  );
}
