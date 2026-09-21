---
title: "Match Media Query"
---

This component is used to check what breakpoint is currently active. It has one output for every breakpoint that outputs either `true` or `false`.

> Please note that you need to place a **[Media Query Setup](/docs/library/prefabs/media-query/components/media-query-setup)** component in your projects home component for the **Match Media Query** comoponent to work.

<br/>

## Breakpoints

The breakpoints are set in the **[Media Query Setup](/docs/library/prefabs/media-query/components/media-query-setup)** component. If the built in default breakpoints don't fit you, you can change them there.

For edge cases where you need to use a one-off breakpoint, you can use the **[Match Custom Media Query](/docs/library/prefabs/media-query/components/match-custom-media-query)** component.

## Common usage

The most common usecase is to use this node together with a [States](/docs/nodes/animation/states) node, or the **Mounted** input, as pictured above.

## Outputs

| Data                                                      | Description                                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Matches Small Mobile`    | _true_ if the viewport matches the **Small Mobile** breakpoint                          |
| `Matches Regular Mobile`  | _true_ if the viewport matches the **Regular Mobile** breakpoint                        |
| `Matches Tablet`          | _true_ if the viewport matches the **Tablet** breakpoint                                |
| `Matches Regular Desktop` | _true_ if the viewport matches the **Regular Desktop** breakpoint                       |
| `Matches Large Desktop`   | _true_ if the viewport matches the **Large Desktop** breakpoint                         |
| `Matches All Mobile`      | _true_ if the viewport matches the **Small Mobile** or **Regular Mobile** breakpoints   |
| `Matches All Desktop`     | _true_ if the viewport matches the **Regular Desktop** or **Large Desktop** breakpoints |
