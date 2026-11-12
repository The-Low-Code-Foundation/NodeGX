# Habit Tracker

A small, dependency-free habit tracker. One file, no build step, no network calls.

## Run it

Either open `index.html` directly, or (recommended, so browser storage is always
available) serve the folder over HTTP:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## What it does

- **Add a habit** — type a name and press Enter (or *Add habit*). Max 60 characters.
- **Tick off today** — the big button at the bottom of each card toggles today.
- **Last 7 days** — every card shows the last 7 days, oldest on the left, today on
  the right (outlined). Click any of them to fix a day you forgot; the button is
  pressed-in/green when the day is done.
- **Streak count** — the blue chip shows consecutive completed days ending today.
  If today isn't ticked yet the streak is still alive, so it counts back from
  yesterday instead (the card explains this in the hint text). A second chip shows
  the best streak ever, and a third shows how many of the last 7 days were done.
- **Delete a habit** — the ✕ in the top-right corner, with a confirmation prompt.
- **Remembered on return** — everything is saved to `localStorage` on every change,
  and re-rendered on the next visit. Multiple tabs stay in sync.

## Data

Saved under the localStorage key `habit-tracker.v1` as:

```json
{
  "version": 1,
  "habits": [
    {
      "id": "h_lq3k8f2a9c",
      "name": "Read 10 pages",
      "createdAt": "2026-10-30",
      "done": { "2026-10-28": true, "2026-10-29": true, "2026-10-30": true }
    }
  ]
}
```

Dates are `YYYY-MM-DD` keys built from **local** calendar parts (never
`toISOString()`), so a habit ticked at 11pm stays on that day, and streaks survive
DST changes. Corrupt or malformed entries are filtered out on load instead of
crashing the app.

## Tests

Open `index.html#selftest` to run the built-in checks for the date maths, streak
counting, the 7-day window and the storage round-trip. The results appear in a
panel at the bottom of the page (and in the console). The tests only use
throwaway fixtures, so your saved habits are never modified.
