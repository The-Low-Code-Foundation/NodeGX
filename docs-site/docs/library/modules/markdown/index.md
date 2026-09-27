---
title: "Markdown"
---

Markdown in Noodl is a combination of the **Markdown** and **CSS Definition** nodes. The CSS enables styling of all the individual components of the resulting markdown, like headers, lists, images, links, and so on.

## Example

Let's recreate this example.

We'll need three nodes. A **Group**, the **Markdown** node, and a **CSS Definition** node.

This is the markdown:

```markdown
# H1

## H2

### H3

Emphasis, aka italics, with _asterisks_ or _underscores_.
Strong emphasis, aka bold, with **asterisks** or **underscores**.
Combined emphasis with **asterisks and _underscores_**.

1. First ordered list item
2. Another item

-   Unordered sub-list.

1. Actual numbers don't matter, just that it's a number
1. Ordered sub-list
1. And another item.

-   Unordered list can use asterisks

*   Or minuses

-   Or pluses

[Link to Google](https://www.google.com)

Image:

> Blockquote

Iframe embed:

```

To get the HTML to render we need to enable the **Allow HTML** input
!()[/modules/markdown/markdown-allow-html.png]

The styling is done with the **CSS Definition** node. This node allows you to write regular CSS in your Noodl project.

In this example we'll use the following CSS:

```css
/* Open Sans font added with the help of https://fonts.google.com */
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap');

.markdown {
    font-family: 'Open Sans';
    font-size: 16px; /* default font size*/
}

/* make all h1 blue */
.markdown h1 {
    color: blue;
}

/* style the unordered lists */
.markdown ul {
    list-style-type: circle;
    /* list-style-image: url('sqpurple.gif'); */ /* you can also use images in the project folder */
}

/* style links */
.markdown a {
    text-decoration: none;
}
```

The `.markdown` class is the default class name. This can be changed on the **Markdown** node with the _CSS Class_ input.

## Beind the scenes

This module enables you to use [Markdown](https://commonmark.org/help/) in Noodl. It's implemented with [react-markdown](https://github.com/remarkjs/react-markdown) which in turn uses [remark](https://github.com/remarkjs/remark).
