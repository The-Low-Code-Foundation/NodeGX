---
title: "Media Queries"
---

This prefab gives you a couple of components that allow you to easily work with media queries and responsive design.

## Included components

- **[Media Query Setup](./components/media-query-setup/README.md)**: Sets up the global breakpoints. Needs to be placed in your projects home component.

- **[Match Media Query](./components/match-media-query/README.md)**: Checks all global media queries and outputs a boolean based on the current active breakpoint.

- **[Match Custom Media Query](./components/match-custom-media-query/README.md)**: Checks for a custom one-off media query. Only used for edge-cases outside of the breapoints in **Match Media Query**

- **[Media Query Debugger](./components/media-query-debugger/README.md)**: A visual component that renders the name of the currently active breakpoint.

## Quickstart

Place a **Media Query Setup** in your projects home component. Then use **Match Media Query** in every component where you need to check for the currently active breakpoint. **Match Media Query** paris nicely with the [States](/nodes/utilities/logic/states) node, or the [Mounted](/nodes/shared-props/inputs/visual-input-properties#other) property.

> To get the most out of this prefab it is recommended to read the [Responsive Design](/docs/guides/user-interfaces/responsive-design) guide, in addition to the prefab docs.
