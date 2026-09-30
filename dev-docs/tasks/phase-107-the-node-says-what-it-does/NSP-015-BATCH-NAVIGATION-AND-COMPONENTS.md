# NSP-015 — Batch: navigation, popups, component utilities

**Opened 2026-09-29.** **Depends on NSP-008** (graph scenarios) and R4 = continue.
**Status: 📋 not started.**

## 1. The person sentence

> **Moving between pages, opening popups, and passing values in and out of components behaves the
> same on every target — the parts of an app a person notices first when they are wrong.**

## 2. The nodes (from the census)

**14**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T4 graph (14):** Component Inputs · Component Outputs · Close Popup (`NavigationClosePopup`) · Show Popup (`NavigationShowPopup`) · Component Object (`net.noodl.ComponentObject`) · External Link (`net.noodl.externallink`) · Parent Component Object (`net.noodl.ParentComponentObject`) · Set Component Object Properties (`net.noodl.SetComponentObjectProperties`) · Set Parent Component Object Properties (`net.noodl.SetParentComponentObjectProperties`) · Page Inputs (`PageInputs`) · Push Component To Stack (`PageStackNavigate`) · Pop Component Stack (`PageStackNavigateBack`) · Navigate To Path (`PageStackNavigateToPath`) · Navigate (`RouterNavigate`)

Census notes:
- **Component Inputs** — the interface every component depends on — parent + child scenarios, placed more than once
- **Close Popup** — returns values to the Show Popup that opened it — the round trip is the scenario
- **External Link** — the world records the last external URL opened
- **Navigate** — observable as a location change in the world, not a rendered page

## 3. What is special here

- **Navigation is observable as a route change**, not a rendered page: the world gains a
  **location** (path, history stack, the last external URL opened). Specs assert location events;
  what renders at the new route is NSP-016's concern.
- **Component Inputs/Outputs** are the interface every component depends on (the MCP's
  instructions call it "the ONLY thing that makes an instance parameter arrive"). Their scenarios
  are graph scenarios with a parent and a child instance, placed more than once.
- **Popups** return values through Close Popup's outputs to the Show Popup that opened them; that
  round trip is the scenario.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. A component placed **twice** with different inputs produces two different traces (the control
   that proves inputs arrive at all).
6. Navigate → back → Navigate produces the same location stack on the runtime and the export.

## 5. Watch for

- Memory: *a hash change is not a navigation — `#hash` does not reload.* The location world must
  model hash and path changes separately.
- Memory: *a page is only reachable if a Router lists it.* Graph scenarios that navigate must
  include the router, or they grade a page nobody can reach.

## 6. Built

*(empty)*
