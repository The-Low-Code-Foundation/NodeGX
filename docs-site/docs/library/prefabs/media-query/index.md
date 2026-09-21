---
title: "Media Query"
---

This prefab gives you a couple of components that allow you to easily work with media queries and responsive design.

## Included components

- **Media Query Setup**: Sets up the global breakpoints. Needs to be placed in your projects home component.

- **Match Media Query**: Checks all global media queries and outputs a boolean based on the current active breakpoint.

- **Match Custom Media Query**: Checks for a custom one-off media query. Only used for edge-cases outside of the breapoints in **Match Media Query**

- **Media Query Debugger**: A visual component that renders the name of the currently active breakpoint.

## Quickstart

Place a **Media Query Setup** in your projects home component. Then use **Match Media Query** in every component where you need to check for the currently active breakpoint. **Match Media Query** paris nicely with the [States](/docs/nodes/animation/states) node, or the Mounted property.

> To get the most out of this prefab it is recommended to read the Responsive Design guide, in addition to the prefab docs.
