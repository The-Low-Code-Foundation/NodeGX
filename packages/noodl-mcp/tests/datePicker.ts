/**
 * The Date Picker — one source for the library prefab (`library/prefabs/date-picker`) and the
 * todo list's deadline field (`Todo/Date picker`, TPL-008).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Why it was rewritten (2026-09-16), measured on the prefab it replaces
 *
 * - It fetched `vanillajs-datepicker` from jsdelivr at run time: no network, a CSP or an
 *   installed PWA and there was no calendar.
 * - The popup was removed on the text field's `blur`, and pressing a day blurs the field
 *   first — so the popup was gone before the click that picked the day arrived.
 * - Its colours were palette NAMES (`Grey - 700`) pasted into a CSS string, where they mean
 *   nothing; `SelectedDateBackgroud` was misspelt and a `color:` line had no semicolon.
 * - Its touch path read `new Date('YYYY-MM-DD')` (UTC midnight — a day early west of
 *   Greenwich) and wrote `getMonth()` unpadded and zero-based (September as `-8-`).
 * - Blurring an empty field set the date to `null`, and the change handler then called
 *   `null.getFullYear()`.
 *
 * ## The shape now
 *
 * 🔴 **Not in Firefox.** Its calendar button sits inside the field with no pseudo-element to hide it, so
 * enhancing it drew two icons (Richard, 2026-09-16). Firefox keeps its own picker; Chrome, Edge and Safari
 * hide theirs with `::-webkit-calendar-picker-indicator`.
 *
 * **A real `<input type="date">` is the value, always.** It is in the page from the first
 * frame, so the system picker is the picker until something better has proved it works —
 * on a touch screen it stays the picker, because the phone's own date wheel is better than
 * anything drawn here. On a mouse or trackpad a calendar popup is built from plain DOM (no
 * dependency), coloured from the design tokens so it follows light and dark, and driven from
 * the keyboard. The native calendar button is hidden only AFTER that popup has rendered once
 * without throwing; if opening it ever throws, the field drops back to the system picker.
 *
 * The value is a `YYYY-MM-DD` string read as a LOCAL day (`''` when empty) — what a date
 * column in a form or a record wants, and what TPL-008 stores. `Date` is the same day as a
 * `Date` at local midnight, for anything that wants one.
 *
 * 🔴 **`Changed` fires on a decision, not on a keystroke.** Typing into a date input fires
 * `change` as each segment completes (`0002`, `0020`, `0202`, `2026` while typing a year),
 * so typed input commits on Enter or blur. A day picked in the popup or the system picker
 * commits at once. A half-typed date the browser reports as `''` restores the last value
 * rather than clearing it — a stray keystroke must not wipe a deadline.
 *
 * @module noodl-mcp/tests/datePicker
 */

export const DATE_PICKER_CSS_ID = 'ndg-date-picker-css';

/** Classes the script adds; named here so a drive and the CSS cannot disagree. */
export const DATE_PICKER_CLASS = {
  root: 'ndg-dp',
  enhanced: 'ndg-dp--enhanced',
  empty: 'ndg-dp--empty',
  input: 'ndg-dp-input',
  button: 'ndg-dp-button',
  popup: 'ndg-dp-pop',
  day: 'ndg-dp-day'
} as const;

/**
 * Every colour and size is a token with a fallback, so the part draws in a project that has
 * never defined the token (CMP-007) and adopts the look of one that has.
 */
export const DATE_PICKER_CSS = String.raw`.ndg-dp { position: relative; display: flex; align-items: center; width: 100%; box-sizing: border-box; }
.ndg-dp-input {
  box-sizing: border-box; width: 100%; min-height: 40px; margin: 0;
  font: inherit; font-size: var(--text-base, 16px); line-height: 1.25;
  color: var(--foreground, #1c1c1c); background-color: var(--background, #ffffff);
  border: var(--border-1, 1px) solid var(--border-control, #8a8f98); border-radius: var(--radius-md, 6px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  -webkit-appearance: none; appearance: none;
}
.ndg-dp-input:focus { outline: none; border-color: var(--ring, #3b82f6); box-shadow: 0 0 0 1px var(--ring, #3b82f6); }
.ndg-dp-input:disabled { opacity: 0.5; cursor: not-allowed; }
.ndg-dp-input::-webkit-date-and-time-value { text-align: left; }
.ndg-dp--empty .ndg-dp-input::-webkit-datetime-edit { color: var(--muted-foreground, #6b7280); }
.ndg-dp--enhanced .ndg-dp-input { padding-right: calc(var(--space-3, 12px) + 28px); }
.ndg-dp--enhanced .ndg-dp-input::-webkit-calendar-picker-indicator { display: none; }
.ndg-dp-button { display: none; }
.ndg-dp--enhanced .ndg-dp-button {
  display: flex; align-items: center; justify-content: center; box-sizing: border-box;
  position: absolute; top: 0; bottom: 0; right: var(--space-1, 4px); margin: auto 0;
  width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--radius-sm, 4px);
  background: transparent; color: var(--muted-foreground, #6b7280); cursor: pointer;
}
.ndg-dp--enhanced .ndg-dp-button:hover { background-color: var(--muted, #f1f1f1); color: var(--foreground, #1c1c1c); }
.ndg-dp-button:disabled { opacity: 0.5; cursor: not-allowed; }
.ndg-dp-pop {
  position: fixed; z-index: 10000; box-sizing: border-box; width: 296px; padding: var(--space-3, 12px);
  color: var(--foreground, #1c1c1c); background-color: var(--surface-raised, var(--background, #ffffff));
  border: var(--border-1, 1px) solid var(--border, #e2e2e2); border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.1));
  font-size: var(--text-sm, 14px); line-height: 1.25; -webkit-user-select: none; user-select: none;
}
.ndg-dp-pop button {
  font: inherit; color: inherit; margin: 0; border: 0; background: transparent; cursor: pointer;
  border-radius: var(--radius-md, 6px); box-sizing: border-box;
}
.ndg-dp-pop button:focus { outline: none; }
.ndg-dp-pop button:focus-visible { outline: 2px solid var(--ring, #3b82f6); outline-offset: 1px; }
.ndg-dp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2, 8px); }
.ndg-dp-title { font-weight: var(--font-semibold, 600); font-size: var(--text-sm, 14px); }
.ndg-dp-nav { width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground, #6b7280); }
.ndg-dp-nav:hover { background-color: var(--muted, #f1f1f1); color: var(--foreground, #1c1c1c); }
.ndg-dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.ndg-dp-dow { text-align: center; font-size: var(--text-xs, 12px); color: var(--muted-foreground, #6b7280); padding: var(--space-1, 4px) 0; }
.ndg-dp-day { height: 36px; padding: 0; text-align: center; font-variant-numeric: tabular-nums; }
.ndg-dp-day:hover { background-color: var(--muted, #f1f1f1); }
.ndg-dp-day.is-outside { color: var(--muted-foreground, #6b7280); }
.ndg-dp-day.is-today { box-shadow: inset 0 0 0 1px var(--border-strong, #9ca3af); font-weight: var(--font-semibold, 600); }
.ndg-dp-day.is-selected, .ndg-dp-day.is-selected:hover { background-color: var(--primary, #2563eb); color: var(--primary-foreground, #ffffff); box-shadow: none; }
.ndg-dp-day:disabled { opacity: 0.35; cursor: not-allowed; background: transparent; }
.ndg-dp-foot { display: flex; justify-content: space-between; margin-top: var(--space-2, 8px); padding-top: var(--space-2, 8px); border-top: var(--border-1, 1px) solid var(--border, #e2e2e2); }
.ndg-dp-foot button { padding: var(--space-1, 4px) var(--space-2, 8px); color: var(--primary, #2563eb); font-weight: var(--font-medium, 500); }
.ndg-dp-foot button:hover { background-color: var(--muted, #f1f1f1); }
.ndg-dp-foot button:disabled { opacity: 0.35; cursor: not-allowed; }`;

/**
 * The `Function` that builds and runs the field. It re-runs whenever an input changes — and
 * `mounted` is one of them: a count the host Group's `didMount` bumps (the element does not exist
 * before the first mount, and a remount is a NEW element). State lives on `this`, which the
 * Function node keeps for the life of the node — one per placed instance.
 *
 * 🔴 Why a count and not `didMount → run`: a wired `run` does not stop value changes running the
 * script (TPL-008 D71), and the gate for that rule wants every input of a run-wired Function
 * ticked off. This script NEEDS to run on value changes, so it has no `run` wire at all.
 */
export const DATE_PICKER_MOUNT_SCRIPT = 'this.mounts = (this.mounts || 0) + 1;\nOutputs.mounts = this.mounts;';

export const DATE_PICKER_SCRIPT =
  `var CSS_ID = ${JSON.stringify(DATE_PICKER_CSS_ID)};\nvar CSS = ${JSON.stringify(DATE_PICKER_CSS)};\n` +
  String.raw`var S = this.datePicker || (this.datePicker = {});
S.Outputs = Outputs;
S.mounts = Inputs.mounted;
S.label = String(Inputs.label || 'Date');
S.min = normal(Inputs.min);
S.max = normal(Inputs.max);
S.disabled = Inputs.disabled === true || Inputs.disabled === 'true';
S.firstDay = firstDayOfWeek(Inputs.firstDayOfWeek);

var hostNode = Inputs.host;
var host = hostNode && typeof hostNode.getDOMElement === 'function' ? hostNode.getDOMElement() : null;
if (!host || typeof document === 'undefined') return;

if (!document.getElementById(CSS_ID)) {
  var sheet = document.createElement('style');
  sheet.id = CSS_ID;
  sheet.textContent = CSS;
  document.head.appendChild(sheet);
}

if (!S.wrap || S.host !== host || !host.contains(S.wrap)) build(host);

S.input.min = S.min;
S.input.max = S.max;
S.input.disabled = S.disabled;
S.button.disabled = S.disabled;
S.input.setAttribute('aria-label', S.label);

var incoming = normal(Inputs.value);
if (incoming !== S.lastIncoming) {
  S.lastIncoming = incoming;
  var busy = document.activeElement === S.input && S.typed;
  if (!busy) {
    S.input.value = incoming;
    S.committed = incoming;
    publish(incoming);
    syncEmpty();
    if (S.pop) render();
  }
}
if (S.disabled && S.pop) close(false);

// ── dates ──────────────────────────────────────────────────────────────────
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function toDay(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(v === undefined || v === null ? '' : v).trim());
  if (!m) return null;
  var y = Number(m[1]), mo = Number(m[2]) - 1, da = Number(m[3]);
  var d = new Date(y, mo, da);
  return d.getFullYear() === y && d.getMonth() === mo && d.getDate() === da ? d : null;
}
function normal(v) { var d = toDay(v); return d ? iso(d) : ''; }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function addMonths(d, n) {
  var last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
}
function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function inRange(s) { return (!S.min || s >= S.min) && (!S.max || s <= S.max); }
function firstDayOfWeek(v) {
  var n = Number(v);
  if (v !== undefined && v !== null && v !== '' && n >= 0 && n <= 6) return Math.floor(n);
  try {
    var loc = new Intl.Locale(navigator.language || 'en-GB');
    var info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
  } catch (e) {}
  return 1;
}
function fmt(d, opts, fallback) {
  try { return new Intl.DateTimeFormat(undefined, opts).format(d); } catch (e) { return fallback; }
}

// ── the value ─────────────────────────────────────────────────────────────
function publish(v) {
  S.Outputs.value = v;
  if (S.lastDate !== v) {
    S.lastDate = v;
    S.Outputs.date = v ? toDay(v) : null;
  }
}
function commit(v) {
  v = normal(v);
  S.typed = false;
  if (S.input.value !== v) S.input.value = v;
  syncEmpty();
  if (v === S.committed) return;
  S.committed = v;
  publish(v);
  S.Outputs.changed();
}
function commitTyped() {
  if (!S.typed) return;
  var input = S.input;
  if (input.value === '' && input.validity && input.validity.badInput) {
    // Half a date: the browser reports '' — put the last value back rather than clear it.
    input.value = S.committed || '';
    S.typed = false;
    syncEmpty();
    return;
  }
  if (input.type !== 'date' && input.value !== '' && !toDay(input.value)) {
    input.value = S.committed || '';
    S.typed = false;
    syncEmpty();
    return;
  }
  commit(input.value);
}
function syncEmpty() { S.wrap.classList.toggle('ndg-dp--empty', !S.input.value); }

// ── the field ─────────────────────────────────────────────────────────────
function build(el) {
  if (S.wrap && S.wrap.parentNode) S.wrap.parentNode.removeChild(S.wrap);
  if (S.pop) close(false);
  S.host = el;
  S.typed = false;

  var wrap = document.createElement('div');
  wrap.className = 'ndg-dp ndg-dp--empty';
  var input = document.createElement('input');
  input.type = 'date';
  input.className = 'ndg-dp-input';
  if (input.type !== 'date') input.placeholder = 'YYYY-MM-DD';
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'ndg-dp-button';
  button.tabIndex = -1;
  button.setAttribute('aria-label', 'Choose a date');
  button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  wrap.appendChild(input);
  wrap.appendChild(button);
  el.appendChild(wrap);
  S.wrap = wrap;
  S.input = input;
  S.button = button;

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); S.typed = true; commitTyped(); close(false); return; }
    if (e.key === 'Escape') { if (S.pop) { e.preventDefault(); close(false); } return; }
    if (S.enhanced && (e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))) { e.preventDefault(); open(true); return; }
    if (e.key !== 'Tab' && e.key !== 'Shift') S.typed = true;
  });
  input.addEventListener('input', function () {
    syncEmpty();
    if (S.pop) { var d = toDay(input.value); if (d) { S.focus = d; render(); } }
  });
  input.addEventListener('change', function () {
    syncEmpty();
    // A typed segment waits for Enter or blur; the system picker's choice is a decision.
    if (!S.typed) commit(input.value);
  });
  input.addEventListener('blur', function () {
    setTimeout(function () {
      if (S.pop && S.pop.contains(document.activeElement)) return;
      commitTyped();
    }, 0);
  });
  input.addEventListener('click', function (e) {
    if (!S.enhanced || S.disabled) return;
    e.preventDefault();
    open(false);
  });
  button.addEventListener('mousedown', function (e) { e.preventDefault(); });
  button.addEventListener('click', function () {
    if (S.disabled) return;
    if (S.pop) close(false);
    else { input.focus(); open(false); }
  });

  // Enhance only where a pointer can aim at a 36px day, where the browser's own calendar button can
  // be hidden, and only once a calendar has drawn. 🔴 Firefox draws its button inside the field with no
  // pseudo-element to hide it, so enhancing there showed TWO calendar icons (Richard, 2026-09-16) —
  // Firefox keeps its own picker instead.
  S.enhanced = false;
  var fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  // 🔴 An ENGINE check, because nothing can be measured: CSS.supports('selector(::-webkit-…)') is false in
  // Chrome too, and getComputedStyle cannot read the button's pseudo-element in either engine. Gecko is the
  // one engine that draws a button no CSS can hide ('mozInnerScreenX' exists only there; Firefox 148 true,
  // Chrome false, measured 2026-09-16).
  var gecko = typeof window !== 'undefined' && 'mozInnerScreenX' in window;
  if (fine && !gecko && input.type === 'date') {
    try {
      S.view = today();
      S.focus = today();
      renderInto(document.createElement('div'));
      S.enhanced = true;
      wrap.classList.add('ndg-dp--enhanced');
    } catch (err) {
      console.warn('Date Picker: using the system date picker —', err);
    }
  }
  // A remount draws a new field: it shows the date this one last held, not a blank.
  if (S.committed !== undefined) { input.value = S.committed; syncEmpty(); }
}

// ── the popup ─────────────────────────────────────────────────────────────
function open(focusGrid) {
  if (S.disabled || !S.enhanced) return;
  try {
    if (!S.pop) {
      var sel = toDay(S.input.value);
      S.focus = sel || today();
      var pop = document.createElement('div');
      pop.className = 'ndg-dp-pop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', S.label);
      pop.style.fontFamily = window.getComputedStyle(S.input).fontFamily;
      pop.addEventListener('mousedown', function (e) { e.preventDefault(); });
      pop.addEventListener('keydown', onPopKey);
      pop.addEventListener('click', onPopClick);
      pop.addEventListener('focusout', function () {
        setTimeout(function () {
          var a = document.activeElement;
          if (S.pop && !S.pop.contains(a) && a !== S.input) close(false);
        }, 0);
      });
      S.pop = pop;
      render();
      document.body.appendChild(pop);
      S.onOutside = function (e) { if (S.pop && !S.pop.contains(e.target) && !S.wrap.contains(e.target)) close(false); };
      S.onMove = function () { place(); };
      document.addEventListener('pointerdown', S.onOutside, true);
      window.addEventListener('resize', S.onMove);
      window.addEventListener('scroll', S.onMove, true);
      place();
    }
    if (focusGrid) focusDay();
  } catch (err) {
    // The calendar failed where it matters: hand the field back to the system picker.
    console.warn('Date Picker: the calendar failed, using the system date picker —', err);
    close(false);
    S.enhanced = false;
    S.wrap.classList.remove('ndg-dp--enhanced');
    try { if (S.input.showPicker) S.input.showPicker(); } catch (e2) {}
  }
}
function close(refocus) {
  var pop = S.pop;
  if (!pop) return;
  S.pop = null;
  document.removeEventListener('pointerdown', S.onOutside, true);
  window.removeEventListener('resize', S.onMove);
  window.removeEventListener('scroll', S.onMove, true);
  if (pop.parentNode) pop.parentNode.removeChild(pop);
  if (refocus && S.input && document.body.contains(S.input)) S.input.focus();
}
function place() {
  var pop = S.pop;
  if (!pop) return;
  if (!document.body.contains(S.input)) { close(false); return; }
  var r = S.input.getBoundingClientRect();
  var w = pop.offsetWidth, h = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 4, edge = 8;
  var top = r.bottom + gap;
  if (top + h > vh - edge && r.top - gap - h >= edge) top = r.top - gap - h;
  top = Math.max(edge, Math.min(top, vh - h - edge));
  var left = Math.max(edge, Math.min(r.left, vw - w - edge));
  pop.style.top = Math.round(top) + 'px';
  pop.style.left = Math.round(left) + 'px';
}
function render() {
  if (!S.pop) return;
  var hadFocus = S.pop.contains(document.activeElement);
  renderInto(S.pop);
  if (hadFocus) focusDay();
}
function renderInto(pop) {
  var focus = S.focus || today();
  var y = focus.getFullYear(), m = focus.getMonth();
  var first = new Date(y, m, 1);
  var start = addDays(first, -((first.getDay() - S.firstDay + 7) % 7));
  var selected = normal(S.input.value);
  var now = iso(today());
  var focusIso = iso(focus);
  var title = fmt(first, { month: 'long', year: 'numeric' }, y + '-' + pad(m + 1));
  var html = '<div class="ndg-dp-head">' +
    '<button type="button" class="ndg-dp-nav" data-nav="-1" aria-label="Previous month">' + chevron('15 18 9 12 15 6') + '</button>' +
    '<div class="ndg-dp-title" aria-live="polite">' + esc(title) + '</div>' +
    '<button type="button" class="ndg-dp-nav" data-nav="1" aria-label="Next month">' + chevron('9 18 15 12 9 6') + '</button>' +
    '</div><div class="ndg-dp-grid" role="grid">';
  for (var i = 0; i < 7; i++) {
    var wd = addDays(start, i);
    html += '<div class="ndg-dp-dow" aria-hidden="true">' + esc(fmt(wd, { weekday: 'short' }, ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][wd.getDay()]).slice(0, 2)) + '</div>';
  }
  for (var k = 0; k < 42; k++) {
    var d = addDays(start, k);
    var s = iso(d);
    var cls = 'ndg-dp-day' + (d.getMonth() !== m ? ' is-outside' : '') + (s === now ? ' is-today' : '') + (s === selected ? ' is-selected' : '');
    html += '<button type="button" role="gridcell" class="' + cls + '" data-day="' + s + '"' +
      ' tabindex="' + (s === focusIso ? '0' : '-1') + '"' +
      ' aria-selected="' + (s === selected ? 'true' : 'false') + '"' +
      (s === now ? ' aria-current="date"' : '') +
      (inRange(s) ? '' : ' disabled') +
      ' aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, s)) + '">' + d.getDate() + '</button>';
  }
  html += '</div><div class="ndg-dp-foot">' +
    '<button type="button" data-pick="today"' + (inRange(now) ? '' : ' disabled') + '>Today</button>' +
    '<button type="button" data-pick="clear"' + (selected ? '' : ' disabled') + '>Clear</button></div>';
  pop.innerHTML = html;
}
function chevron(points) {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="' + points + '"/></svg>';
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function focusDay() {
  if (!S.pop) return;
  var b = S.pop.querySelector('[data-day="' + iso(S.focus) + '"]');
  if (b) b.focus();
}
function pick(s, fromKeyboard) {
  commit(s);
  close(fromKeyboard);
}
function onPopClick(e) {
  var t = e.target.closest ? e.target.closest('button') : null;
  if (!t || t.disabled) return;
  var fromKeyboard = e.detail === 0;
  if (t.getAttribute('data-nav')) {
    S.focus = addMonths(S.focus, Number(t.getAttribute('data-nav')));
    render();
    return;
  }
  if (t.getAttribute('data-day')) { pick(t.getAttribute('data-day'), fromKeyboard); return; }
  if (t.getAttribute('data-pick') === 'today') { pick(iso(today()), fromKeyboard); return; }
  if (t.getAttribute('data-pick') === 'clear') pick('', fromKeyboard);
}
function onPopKey(e) {
  var onDay = e.target && e.target.getAttribute && e.target.getAttribute('data-day');
  if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
  if (!onDay) return;
  var next = null;
  if (e.key === 'ArrowLeft') next = addDays(S.focus, -1);
  else if (e.key === 'ArrowRight') next = addDays(S.focus, 1);
  else if (e.key === 'ArrowUp') next = addDays(S.focus, -7);
  else if (e.key === 'ArrowDown') next = addDays(S.focus, 7);
  else if (e.key === 'PageUp') next = addMonths(S.focus, e.shiftKey ? -12 : -1);
  else if (e.key === 'PageDown') next = addMonths(S.focus, e.shiftKey ? 12 : 1);
  else if (e.key === 'Home') next = addDays(S.focus, -((S.focus.getDay() - S.firstDay + 7) % 7));
  else if (e.key === 'End') next = addDays(S.focus, 6 - ((S.focus.getDay() - S.firstDay + 7) % 7));
  if (!next) return;
  e.preventDefault();
  S.focus = next;
  renderInto(S.pop);
  focusDay();
}`;

// ── The graph, in the flat template form ─────────────────────────────────────

export interface DatePickerPort {
  name: string;
  /** The template's port type. The prefab writes every port as `*`, as the rest of the shelf does. */
  type: string;
  description: string;
}

export const DATE_PICKER_INPUTS: DatePickerPort[] = [
  { name: 'Value', type: 'string', description: 'The date to show, as YYYY-MM-DD (a Date also works). Empty shows no date.' },
  { name: 'Label', type: 'string', description: 'The label above the field, and what a screen reader calls it.' },
  { name: 'Show Label', type: 'boolean', description: 'Draw the label above the field. Off when a label already sits beside it.' },
  { name: 'Min', type: 'string', description: 'The earliest date that can be picked, as YYYY-MM-DD.' },
  { name: 'Max', type: 'string', description: 'The latest date that can be picked, as YYYY-MM-DD.' },
  { name: 'Disabled', type: 'boolean', description: 'Show the date but do not let it be changed.' },
  { name: 'First Day Of Week', type: 'number', description: '0 = Sunday … 6 = Saturday. Empty follows the browser’s locale.' },
  { name: 'Width', type: '*', description: 'How wide the field is. Fills its parent when unset.' },
  { name: 'Align X', type: '*', description: 'Horizontal alignment in an absolutely positioned parent.' },
  { name: 'Align Y', type: '*', description: 'Vertical alignment in an absolutely positioned parent.' },
  { name: 'Margin Top', type: '*', description: 'Space above.' },
  { name: 'Margin Right', type: '*', description: 'Space to the right.' },
  { name: 'Margin Bottom', type: '*', description: 'Space below.' },
  { name: 'Margin Left', type: '*', description: 'Space to the left.' },
  { name: 'Position', type: '*', description: 'Layout position (in layout, absolute, …).' }
];

export const DATE_PICKER_OUTPUTS: DatePickerPort[] = [
  { name: 'Value', type: 'string', description: 'The date, as YYYY-MM-DD, or empty.' },
  { name: 'Date', type: '*', description: 'The same day as a Date at local midnight, or null.' },
  { name: 'Changed', type: 'signal', description: 'Fires when a person picks, types (on Enter or leaving the field) or clears a date.' }
];

export const DATE_PICKER_DESCRIPTION =
  'A date field with a calendar. Value is YYYY-MM-DD; Changed fires when a person picks, types or clears a date. ' +
  'On a phone or tablet the device’s own date picker opens; on a computer a keyboard-friendly calendar drops down, ' +
  'and if it cannot draw, the browser’s own date picker is used instead.';

/** Wires from the interface into the Function, by component port → Function input. */
const TO_SCRIPT: Array<[string, string]> = [
  ['Value', 'value'],
  ['Label', 'label'],
  ['Min', 'min'],
  ['Max', 'max'],
  ['Disabled', 'disabled'],
  ['First Day Of Week', 'firstDayOfWeek']
];

const TO_ROOT: Array<[string, string]> = [
  ['Width', 'width'],
  ['Align X', 'alignX'],
  ['Align Y', 'alignY'],
  ['Margin Top', 'marginTop'],
  ['Margin Right', 'marginRight'],
  ['Margin Bottom', 'marginBottom'],
  ['Margin Left', 'marginLeft'],
  ['Position', 'position']
];

export interface FlatNode {
  id: string;
  type: string;
  label: string;
  parent?: string;
  parameters?: Record<string, unknown>;
  ports?: Array<{ name: string; type: string; plug: 'input' | 'output'; displayName?: string; group?: string }>;
}
export interface FlatWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}

/**
 * The component's nodes and wires. `p` prefixes every node id — ids are unique across a whole
 * project (TPL-008 §7: a clash is renamed silently), so each consumer names its own.
 */
export function datePickerGraph(p: string): { nodes: FlatNode[]; connections: FlatWire[] } {
  const id = (s: string) => `${p}${s}`;
  const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): FlatWire => ({
    fromId,
    fromProperty,
    toId,
    toProperty
  });
  const nodes: FlatNode[] = [
    {
      id: id('In'),
      type: 'Component Inputs',
      label: 'Date picker settings',
      ports: DATE_PICKER_INPUTS.map((x) => ({ name: x.name, type: x.type, plug: 'output' as const }))
    },
    {
      id: id('Out'),
      type: 'Component Outputs',
      label: 'The date',
      ports: DATE_PICKER_OUTPUTS.map((x) => ({ name: x.name, type: x.type, plug: 'input' as const }))
    },
    {
      id: id('Root'),
      type: 'Group',
      label: 'Date picker',
      parameters: {
        flexDirection: 'column',
        sizeMode: 'contentHeight',
        width: { value: 100, unit: '%' },
        rowGap: 'var(--space-1)'
      }
    },
    {
      id: id('Label'),
      type: 'Text',
      label: 'Label',
      parent: id('Root'),
      parameters: {
        text: '',
        mounted: false,
        sizeMode: 'contentHeight',
        width: { value: 100, unit: '%' },
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        color: 'var(--foreground)'
      }
    },
    {
      id: id('Field'),
      type: 'Group',
      label: 'Field (the script draws the input and calendar here)',
      parent: id('Root'),
      parameters: { sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }
    },
    {
      id: id('Script'),
      type: 'JavaScriptFunction',
      label: 'Draw the field and calendar',
      parameters: { functionScript: DATE_PICKER_SCRIPT },
      // 🔴 Declared, not left to the editor: the runtime makes `Outputs.changed` callable only for an
      // output port the saved node says is a signal. A prefab that has never been opened and re-saved
      // in the editor carries exactly these, and without them `Changed` throws "not a function".
      ports: [
        ...['host', 'mounted', ...TO_SCRIPT.map(([, to]) => to)].map((n) => ({
          name: `in-${n}`,
          displayName: n,
          plug: 'input' as const,
          type: '*',
          group: 'Inputs'
        })),
        ...[
          ['value', '*'],
          ['date', '*'],
          ['changed', 'signal']
        ].map(([n, t]) => ({ name: `out-${n}`, displayName: n, plug: 'output' as const, type: t, group: 'Outputs' }))
      ]
    },
    {
      id: id('Mounts'),
      type: 'JavaScriptFunction',
      label: 'Count mounts (a remount is a new element to draw into)',
      parameters: { functionScript: DATE_PICKER_MOUNT_SCRIPT },
      ports: [{ name: 'out-mounts', displayName: 'mounts', plug: 'output', type: '*', group: 'Outputs' }]
    }
  ];
  const connections: FlatWire[] = [
    wire(id('Field'), 'this', id('Script'), 'in-host'),
    wire(id('Field'), 'didMount', id('Mounts'), 'run'),
    wire(id('Mounts'), 'out-mounts', id('Script'), 'in-mounted'),
    ...TO_SCRIPT.map(([from, to]) => wire(id('In'), from, id('Script'), `in-${to}`)),
    ...TO_ROOT.map(([from, to]) => wire(id('In'), from, id('Root'), to)),
    wire(id('In'), 'Label', id('Label'), 'text'),
    wire(id('In'), 'Show Label', id('Label'), 'mounted'),
    wire(id('Script'), 'out-value', id('Out'), 'Value'),
    wire(id('Script'), 'out-date', id('Out'), 'Date'),
    wire(id('Script'), 'out-changed', id('Out'), 'Changed')
  ];
  return { nodes, connections };
}
