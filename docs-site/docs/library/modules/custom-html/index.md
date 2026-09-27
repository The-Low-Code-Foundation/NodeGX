---
title: "Custom HTML"
---

This node allows you to add your own custom HTML markup to your visual tree. Common use cases include embeds or inline SVG's.

You can pass dynamic values to your markup by using template strings. `{{ FillColor }}` will create an input port named `FillColor`.

## Security notice

This node also allows you to add script tags to your app. For security reasons all script tags are deactivated, but if you need to run a script (required for some embeds) you can turn off that fail safe. <strong>Please note that passing user input to your template string variables can be a security risk for you and your users, leaving you vulnerable to [XSS Attacks](https://en.wikipedia.org/wiki/Cross-site_scripting).</strong>

## Inputs

| Data                                                    | Description                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HTML`                  | Your custom markup that will be rendered in the visual tree.                                                                                                                                                                                                                                                   |
| `Run inline JavaScript` | Running scripts with user input can be dangerous. To provide an extra layer of security JavaScript in the custom HTML is prevented from running. Turn this on if your embed require scripts or if you are an advanced user with knowledge of [XSS Attacks](https://en.wikipedia.org/wiki/Cross-site_scripting) |
| `Custom Variables`      | Any variable in a template string will become an input. Only one variable per template string allowed                                                                                                                                                                                                          |
