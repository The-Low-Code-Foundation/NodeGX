// The habit tracker's rules, in one place: how a day is written down, what a
// streak counts, and what the screen is handed. Every Function in
// `/Components/Habit Store` calls in here, so each rule has one definition.
//
// Nothing in this file touches the browser: no window, no document, no
// localStorage. The Functions do the reading and writing; this file only
// decides what the data means.

const STORAGE_KEY = 'habit-tracker:v1';
const SHOWN_DAYS = 7;
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A day is the local date the person was living in. Never a UTC date: a tick
// at nine in the evening, west of Greenwich, would be filed under tomorrow.
function dayString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function parseDay(day) {
  const parts = String(day).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Local midnight, so stepping back over a clock change lands on the same hour
// of the previous day rather than on the day before it.
function daysBack(today, back) {
  const date = parseDay(today);
  date.setDate(date.getDate() - back);
  return dayString(date);
}

function habitWith(state, habitId) {
  return state.habits.find(function (habit) {
    return habit.id === habitId;
  });
}

exports.KEY = STORAGE_KEY;

exports.today = function () {
  return dayString(new Date());
};

// A store we cannot read is a store we cannot rescue, so the app opens empty
// rather than refusing to open at all.
exports.parse = function (text) {
  if (!text) return { habits: [] };
  try {
    const saved = JSON.parse(text);
    if (!saved || !Array.isArray(saved.habits)) return { habits: [] };
    return { habits: saved.habits };
  } catch (error) {
    return { habits: [] };
  }
};

exports.serialise = function (state) {
  return JSON.stringify(state);
};

// An id is minted, never derived from the name, so two habits may share a
// name and the row a person is looking at keeps its identity.
function newId(today) {
  return 'h-' + today + '-' + Math.random().toString(36).slice(2, 8);
}

// Refused when there is nothing to name. The Add control is disabled until
// there is, so this is the rule stated once rather than a path people reach.
exports.add = function (state, rawName, today) {
  const name = String(rawName == null ? '' : rawName).trim();
  if (!name) return false;
  state.habits.push({ id: newId(today), name: name, createdOn: today, ticks: [] });
  return true;
};

exports.toggle = function (state, habitId, today) {
  const habit = habitWith(state, habitId);
  if (!habit) return;
  const at = habit.ticks.indexOf(today);
  if (at === -1) habit.ticks.push(today);
  else habit.ticks.splice(at, 1);
};

// A habit's ticks go with it: there is no tick without a habit to belong to.
exports.remove = function (state, habitId) {
  state.habits = state.habits.filter(function (habit) {
    return habit.id !== habitId;
  });
};

// Today is still open. A habit not ticked yet keeps the streak it had
// yesterday, so the number never drops merely because the app was opened
// before the tick — and a streak is not lost by not having opened it at all.
function streakFor(habit, today) {
  let day = habit.ticks.indexOf(today) === -1 ? daysBack(today, 1) : today;
  let count = 0;
  while (habit.ticks.indexOf(day) !== -1) {
    count += 1;
    day = daysBack(day, 1);
  }
  return count;
}

// The seven days run oldest first and today last, and every one of them is
// present whether or not it was ticked: a gap is information.
function daysFor(habit, today) {
  const days = [];
  for (let back = SHOWN_DAYS - 1; back >= 0; back -= 1) {
    const day = daysBack(today, back);
    days.push({
      id: habit.id + ':' + day,
      label: WEEKDAY_INITIALS[parseDay(day).getDay()],
      ticked: habit.ticks.indexOf(day) !== -1,
      isToday: back === 0
    });
  }
  return days;
}

// What the screen is handed: the habits as rows, and the three numbers the
// page needs around them.
exports.view = function (state, today) {
  const habits = state.habits.map(function (habit) {
    return {
      id: habit.id,
      name: habit.name,
      streak: streakFor(habit, today),
      tickedToday: habit.ticks.indexOf(today) !== -1,
      days: daysFor(habit, today)
    };
  });
  return {
    habits: habits,
    count: habits.length,
    done: habits.filter(function (habit) {
      return habit.tickedToday;
    }).length,
    empty: habits.length === 0
  };
};
