# Before you export to Swift — HookDesk

**2 views**: HomePageView, ItemView.

**7 logic components** (each a view that draws nothing): DoubleLogic, EchoLogic, LabelLogic, PickerLogic, ShelfLogic, StampLogic, TallyLogic.

## Left out by the plan (0) — the same nodes the React export leaves out


## Functions that touch the browser (0) — they run, but a phone has no browser around them

Each runs in the app's JavaScriptCore context. `window` is the global object there and `localStorage` is kept on the
device; `document`, `location` and `matchMedia` are not there, so what a body reads of them reads nothing.


## Read in the plan, not printed by the Swift target yet (0)


## Looks a phone has no counterpart for (0 kinds)

