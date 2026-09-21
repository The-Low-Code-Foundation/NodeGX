---
title: "Show Tooltip"
---

This logic node adds a tooltip to the visual tree.

## Inputs

| Data                                                             | Description                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Node Reference`                 | Plug in the 'This' property from a visual node to tell the tooltip where to be visible.                                                                              |
| `Allow HTML`                     | Determines if content strings are parsed as HTML instead of text.                                                                                                    |
| `Content`                        | The content of the tooltip.                                                                                                                                          |
| `Background Color`               | The background color of the tooltip.                                                                                                                                 |
| `Text Style`                     | The Text Style in the tooltip.                                                                                                                                       |
| `Max Width`                      | Specifies the maximum width of the tooltip.                                                                                                                          |
| `Arrow`                          | Determines if the tooltip has an arrow.                                                                                                                              |
| `Corner Radius`                  | The corner radius of the tooltip.                                                                                                                                    |
| `Margin and Padding`             | The padding of the tooltip.                                                                                                                                          |
| `Placement`                      | The preferred placement of the tooltip.                                                                                                                              |
| `Follow Cursor`                  | Determines if the tooltip follows the user's mouse cursor.                                                                                                           |
| `Offset X`                       | Displaces the tooltip from its reference element in pixels (skidding).                                                                                               |
| `Offset Y`                       | Displaces the tooltip from its reference element in pixels (distance).                                                                                               |
| `Animation`                      | The type of transition animation.                                                                                                                                    |
| `Delay Show`                     | Delay in ms once a trigger event is fired before a tippy shows.                                                                                                      |
| `Delay Hide`                     | Delay in ms once a trigger event is fired before a tippy hides.                                                                                                      |
| `Duration Show`                  | Duration in ms of the transition animation.                                                                                                                          |
| `Duration Hide`                  | Duration in ms of the transition animation.                                                                                                                          |
| `Hide On Click`                  | Determines if the tippy hides upon clicking the reference or outside of the tooltip. The behavior can depend upon the trigger events used.                           |
| `Trigger`                        | Determines the events that will show the tooltip.                                                                                                                    |
| `Interactive`                    | Determines if the tooltip has interactive content inside of it, so that it can be hovered over and clicked inside without hiding.                                    |
| `Interactive Border`             | Determines the size of the invisible border around the tooltip that will prevent it from hiding if the cursor left it.                                               |
| `Interactive Debounce`           | Determines the time in ms to debounce the interactive hide handler when the cursor leaves the tooltip's interactive region.                                          |
| `Shadow Enabled`                 | Enables and disables the shadow.                                                                                                                                     |
| `Offset X`                       | The horizontal offset of the shadow. A positive value puts the shadow on the right side of the node, a negative value puts the shadow on the left side of the node.  |
| `Offset Y`                       | The vertical offset of the shadow. A positive value puts the shadow below the node, a negative value puts the shadow above node.                                     |
| `Blur Radius`                    | The blur radius. The higher the number, the blurrier the shadow will be.                                                                                             |
| `Spread Radius`                  | The spread radius. A positive value increases the size of the shadow, a negative value decreases the size of the shadow.                                             |
| `Inset`                          | Changes the shadow from an outer shadow (outset) to an inner shadow.                                                                                                 |
| `Shadow Color`                   | The color of the shadow.                                                                                                                                             |

| Signal                                                           | Description                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Show`                         | Show the tooltip.                                                                                                                                                    |
| `Hide`                         | Hide the tooltip.                                                                                                                                                    |

## Outputs

| Data                                                             | Description                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Is Open`                        | True, if the tooltip is open; Otherwise, false.                                                                                                                      |

| Signal                                                           | Description                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Shown`                        | Sends a signal when the tooltip is visible.                                                                                                                          |
| `Hidden`                       | Sends a signal when the tooltip is hidden.                                                                                                                           |
