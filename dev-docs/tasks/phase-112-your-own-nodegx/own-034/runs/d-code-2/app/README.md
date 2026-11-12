# Habit Tracker

A small, dependency-free habit tracker. Add habits, tick them off for today,
see the last 7 days at a glance, and keep a running streak. Everything is
stored in the browser, so your habits are still there when you come back.

## Running it

No build step, no dependencies, no package manager. Either:

```sh
# from this folder
python3 -m http.server 8000
# then open http://localhost:8000
```

or simply open `index.html` in your browser.

> Serving over `http://` is recommended. Some browsers (notably Safari) block
> `localStorage` on `file://` pages. If that happens the app still works, but
> it will show a warning that nothing can be saved between visits.

## What you can do

| Action | How |
| --- | --- |
| Add a habit | Type a name and press **Enter** or click **Add habit** |
| Tick off today | Click the round **Mark done** pill on the habit row |
| See the last 7 days | The 7-cell strip under each habit (oldest → today) |
| Fix a past day | Click any cell in the 7-day strip to toggle it |
| Check your streak | Shown under the habit name |
| Delete a habit | Click **Delete** and confirm |
| See today's progress | The `n of m done today` line in the header |

## How the streak is counted

A streak is the run of consecutive completed days ending at today.

If you have **not** ticked today off yet, the run is measured from *yesterday*
instead, so an unfinished today does not wipe out your streak. In that case the
habit says `· not done today` so it is clear the streak is at risk.

Example — today is the 30th and you completed the 27th, 28th and 29th:

- Not done today → `3 days in a row · not done today`
- Tick today off → `4 days in a row`

## Data

Stored under the `habit-tracker.v1` key in `localStorage`:

```json
{
  "version": 1,
  "habits": [
    {
      "id": "b0f1…",
      "name": "Read 10 pages",
      "createdAt": 1761820800000,
      "log": { "2026-10-28": true, "2026-10-29": true, "2026-10-30": true }
    }
  ]
}
```

`log` is sparse — a date key exists only for days that were completed. Dates
are `YYYY-MM-DD` keys built from the **local** calendar day, so "today" always
matches your own clock rather than UTC.

Stored data is re-validated on load: unknown fields are dropped, unusable
records are skipped, and a corrupt payload falls back to an empty list rather
than breaking the page. Malformed days are ignored instead of trusted.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup, plus the `<template>` for one habit row |
| `styles.css` | Styling; light/dark via `prefers-color-scheme` |
| `app.js` | Date helpers, persistence, streaks, rendering, events |

## Notes

- Habit names are capped at 60 characters and duplicates (case-insensitive)
  are rejected with an inline message.
- Habit names are rendered with `textContent`, so names containing HTML are
  shown as literal text rather than being interpreted.
- The list is re-rendered after each change, and focus is put back on the
  control you used, so keyboard and screen-reader use stays predictable.
- Other open tabs of the page stay in sync via the `storage` event, and a tab
  left open overnight rolls over to the new day when you return to it.
- There is no undo for deleting a habit — the confirm dialog is the safety net.
