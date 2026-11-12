'use strict';

/* ------------------------------------------------------------------ *
 * Habit Tracker
 *
 * Dependency-free. All state lives in localStorage under STORAGE_KEY:
 *
 *   {
 *     version: 1,
 *     habits: [
 *       { id, name, createdAt, log: { "YYYY-MM-DD": true, ... } }
 *     ]
 *   }
 *
 * `log` is sparse: a date key is only present when that day was completed.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'habit-tracker.v1';
const SCHEMA_VERSION = 1;
const MAX_NAME_LENGTH = 60;
const WEEK_LENGTH = 7;
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/* ----------------------------- date utils -------------------------- *
 * Dates are handled as local-time wall-clock days, never UTC, so a
 * "day" always matches the user's calendar day.
 * ------------------------------------------------------------------ */

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

function formatFullDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/* ------------------------------ storage ---------------------------- */

let storageAvailable = true;
try {
  const probeKey = '__habit_tracker_probe__';
  window.localStorage.setItem(probeKey, '1');
  window.localStorage.removeItem(probeKey);
} catch (error) {
  storageAvailable = false;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Coerce one stored record into a safe habit object, or null if unusable. */
function normaliseHabit(value) {
  if (!value || typeof value !== 'object') return null;

  const name = typeof value.name === 'string'
    ? value.name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
    : '';
  if (!name) return null;

  const log = {};
  if (value.log && typeof value.log === 'object') {
    for (const key of Object.keys(value.log)) {
      if (value.log[key] && DATE_KEY_PATTERN.test(key)) log[key] = true;
    }
  }

  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
    ? value.createdAt
    : Date.now();

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId(),
    name,
    createdAt,
    log
  };
}

function loadState() {
  const empty = { version: SCHEMA_VERSION, habits: [] };
  if (!storageAvailable) return empty;

  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return empty;
  }
  if (!raw) return empty;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.habits)) return empty;
    return {
      version: SCHEMA_VERSION,
      habits: parsed.habits.map(normaliseHabit).filter(Boolean)
    };
  } catch (error) {
    // Corrupt payload: start clean rather than breaking the whole page.
    return empty;
  }
}

function saveState() {
  if (!storageAvailable) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: SCHEMA_VERSION,
      habits: state.habits
    }));
  } catch (error) {
    // Quota exceeded or storage revoked mid-session.
    storageAvailable = false;
    showStorageWarning();
  }
}

let state = loadState();

/* ------------------------------- streaks --------------------------- *
 * A streak is the run of consecutive completed days ending at today.
 * If today has not been ticked yet the run is measured from yesterday,
 * so an un-ticked today does not wipe out the streak — but the UI says
 * "not done today" so it is clear the streak is at risk.
 * ------------------------------------------------------------------ */

function currentStreak(habit, reference) {
  const today = startOfDay(reference || new Date());
  let cursor = today;

  if (!habit.log[dateKey(cursor)]) cursor = addDays(cursor, -1);

  let streak = 0;
  while (habit.log[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/* -------------------------------- DOM ------------------------------ */

const els = {
  form: document.getElementById('add-form'),
  input: document.getElementById('habit-input'),
  error: document.getElementById('form-error'),
  warning: document.getElementById('storage-warning'),
  list: document.getElementById('habit-list'),
  empty: document.getElementById('empty-state'),
  todayLabel: document.getElementById('today-label'),
  summary: document.getElementById('today-summary'),
  template: document.getElementById('habit-template')
};

function showStorageWarning() {
  if (!els.warning) return;
  els.warning.textContent =
    'This browser is blocking local storage, so habits cannot be saved between visits. ' +
    'If you opened this file directly, try serving the folder over http:// instead ' +
    '(for example: python3 -m http.server).';
  els.warning.hidden = false;
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
  els.input.setAttribute('aria-invalid', 'true');
}

function clearError() {
  els.error.textContent = '';
  els.error.hidden = true;
  els.input.removeAttribute('aria-invalid');
}

/* ------------------------------ rendering -------------------------- */

function renderDay(habit, date, isToday) {
  const key = dateKey(date);
  const done = Boolean(habit.log[key]);
  const label = formatFullDate(date);

  const item = document.createElement('li');
  item.className = 'day';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'day__btn';
  button.dataset.action = 'toggle-day';
  button.dataset.date = key;
  button.setAttribute('aria-pressed', String(done));
  button.setAttribute('aria-label', `${done ? 'Completed' : 'Not completed'} on ${label}`);
  button.title = `${label} — click to ${done ? 'unmark' : 'mark'}`;
  if (done) button.classList.add('is-done');
  if (isToday) {
    button.classList.add('is-today');
    button.setAttribute('aria-current', 'date');
  }

  const dow = document.createElement('span');
  dow.className = 'day__dow';
  dow.textContent = DAY_INITIALS[date.getDay()];

  const num = document.createElement('span');
  num.className = 'day__num';
  num.textContent = String(date.getDate());

  button.append(dow, num);
  item.append(button);
  return item;
}

function renderHabit(habit, today) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.dataset.id = habit.id;

  node.querySelector('.habit__name').textContent = habit.name;

  const doneToday = Boolean(habit.log[dateKey(today)]);
  const toggle = node.querySelector('[data-action="toggle-today"]');
  toggle.classList.toggle('is-done', doneToday);
  toggle.setAttribute('aria-pressed', String(doneToday));
  toggle.setAttribute('aria-label', doneToday
    ? `Mark as not done today: ${habit.name}`
    : `Mark as done today: ${habit.name}`);
  toggle.querySelector('.check__text').textContent = doneToday ? 'Done today' : 'Mark done';

  const streak = currentStreak(habit, today);
  const streakEl = node.querySelector('.streak');
  if (streak === 0) {
    streakEl.textContent = 'No streak yet';
  } else {
    streakEl.textContent = `${streak} day${streak === 1 ? '' : 's'} in a row`
      + (doneToday ? '' : ' · not done today');
    streakEl.classList.add('is-active');
  }

  const week = node.querySelector('[data-role="week"]');
  week.setAttribute('aria-label', `Last ${WEEK_LENGTH} days for ${habit.name}`);
  for (let offset = WEEK_LENGTH - 1; offset >= 0; offset -= 1) {
    week.append(renderDay(habit, addDays(today, -offset), offset === 0));
  }

  const remove = node.querySelector('[data-action="delete"]');
  remove.setAttribute('aria-label', `Delete habit: ${habit.name}`);
  remove.title = `Delete "${habit.name}"`;

  return node;
}

function render() {
  const today = startOfDay(new Date());
  const todayStr = dateKey(today);

  els.todayLabel.textContent = formatFullDate(today);

  const total = state.habits.length;
  const done = state.habits.filter((habit) => habit.log[todayStr]).length;
  els.summary.textContent = total === 0
    ? ''
    : `${done} of ${total} done today`;

  els.list.replaceChildren();
  for (const habit of state.habits) {
    els.list.append(renderHabit(habit, today));
  }
  els.empty.hidden = total > 0;
}

/* ------------------------------ mutations -------------------------- */

function findHabit(id) {
  return state.habits.find((habit) => habit.id === id) || null;
}

function addHabit(rawName) {
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');

  if (!name) {
    showError('Enter a name for your habit.');
    return;
  }
  if (name.length > MAX_NAME_LENGTH) {
    showError(`Habit names can be at most ${MAX_NAME_LENGTH} characters.`);
    return;
  }
  const clash = state.habits.some(
    (habit) => habit.name.toLowerCase() === name.toLowerCase()
  );
  if (clash) {
    showError(`"${name}" is already on your list.`);
    return;
  }

  clearError();
  state.habits.push({ id: createId(), name, createdAt: Date.now(), log: {} });
  saveState();
  render();

  els.input.value = '';
  els.input.focus();
}

/** Flip a single day on or off for one habit. */
function toggleDay(habit, key) {
  if (!key || !DATE_KEY_PATTERN.test(key)) return;
  if (habit.log[key]) {
    delete habit.log[key];
  } else {
    habit.log[key] = true;
  }
}

function removeHabit(habit) {
  const confirmed = window.confirm(
    `Delete "${habit.name}"?\n\nThis also removes its history and cannot be undone.`
  );
  if (!confirmed) return false;

  state.habits = state.habits.filter((item) => item.id !== habit.id);
  saveState();
  render();
  return true;
}

/* --------------------------- focus handling ------------------------ *
 * The list is re-rendered wholesale after every change, so remember
 * which control was used and put focus back on its replacement.
 * ------------------------------------------------------------------ */

function captureFocus(button) {
  const item = button.closest('.habit');
  if (!item || !item.dataset.id) return null;
  return {
    id: item.dataset.id,
    action: button.dataset.action,
    date: button.dataset.date || null
  };
}

function restoreFocus(token) {
  if (!token) return;
  const items = Array.from(els.list.children);
  for (const item of items) {
    if (item.dataset.id !== token.id) continue;
    const selector = token.action === 'toggle-day'
      ? `.day__btn[data-date="${token.date}"]`
      : `[data-action="${token.action}"]`;
    const target = item.querySelector(selector);
    if (target) target.focus();
    return;
  }
}

/* ------------------------------- events ---------------------------- */

function onSubmit(event) {
  event.preventDefault();
  addHabit(els.input.value);
}

function onListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button || !els.list.contains(button)) return;

  const item = button.closest('.habit');
  const habit = item ? findHabit(item.dataset.id) : null;
  if (!habit) return;

  const action = button.dataset.action;

  if (action === 'delete') {
    if (removeHabit(habit)) els.input.focus();
    return;
  }

  const token = captureFocus(button);

  if (action === 'toggle-today') {
    toggleDay(habit, todayKey());
  } else if (action === 'toggle-day') {
    toggleDay(habit, button.dataset.date);
  } else {
    return;
  }

  saveState();
  render();
  restoreFocus(token);
}

/** Keep other tabs/windows of this page in sync. */
function onStorage(event) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  state = loadState();
  render();
}

/* -------------------------------- init ----------------------------- */

function init() {
  if (!storageAvailable) showStorageWarning();

  els.form.addEventListener('submit', onSubmit);
  els.list.addEventListener('click', onListClick);
  els.input.addEventListener('input', clearError);
  window.addEventListener('storage', onStorage);

  // A tab left open overnight should roll over to the new day, and
  // should never look stale when the user comes back to it.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const active = document.activeElement;
    const token = active && active.dataset && active.dataset.action
      ? captureFocus(active)
      : null;
    render();
    restoreFocus(token);
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
