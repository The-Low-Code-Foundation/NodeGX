# Date Picker

A date field with a calendar. Rewritten from scratch in 2026-09 (version 2.0.0). The old prefab
fetched a calendar library from a CDN at run time, and its popup disappeared before a click on a
day could land.

- **Always a real date input underneath.** `<input type="date">` holds the value, so the
  browser's own date picker is there from the first frame.
- **On a phone or tablet** the device's own picker opens. It is better than anything drawn here.
- **On a computer** a calendar drops down: no dependencies, coloured from the project's design
  tokens (so it follows light and dark), and usable from the keyboard. The system picker's button
  is hidden only after the calendar has drawn once without an error. If opening it ever fails,
  the field goes back to the system picker.

## Inputs

| Port | Type | Meaning |
|---|---|---|
| `Value` | string | The date to show, `YYYY-MM-DD` (a Date also works). Empty shows no date |
| `Label` | string | The label text, and what a screen reader calls the field |
| `Show Label` | boolean | Draw the label above the field. Leave off when your own label sits beside it |
| `Min` / `Max` | string | The earliest / latest date that can be picked, `YYYY-MM-DD` |
| `Disabled` | boolean | Show the date without letting it change |
| `First Day Of Week` | number | `0` Sunday … `6` Saturday. Empty follows the browser's locale |
| `Width`, `Align X/Y`, `Margin Top/Right/Bottom/Left`, `Position` | | Placement, as on the other shelf parts |

## Outputs

| Port | Type | Meaning |
|---|---|---|
| `Value` | string | The date as `YYYY-MM-DD`, or empty. Read as a **local** day, never UTC |
| `Date` | Date | The same day as a `Date` at local midnight, or `null` |
| `Changed` | signal | A person picked, typed or cleared a date. Typing commits on Enter or on leaving the field, never per keystroke |

## Keyboard

In the field: type the date, then press Enter. Alt+↓ or F4 opens the calendar. In the calendar:
arrows move by day or week, Page Up/Down by month (with Shift, by year), Home/End go to the start or
end of the week, Enter picks, Escape closes.

## Source

The graph is generated. Edit `packages/noodl-mcp/tests/datePicker.ts` and run
`npm run library:date-picker`; the todo list template builds from the same file.
