# Story engine — exported as plain HTML by NodeGX

This folder is the whole app: HTML, CSS and JavaScript, with nothing to install and nothing to build.

## Run it

Serve the folder with any static web server, and open the address it prints:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
npx serve .                     # or this, if you have Node
```

Any web host serves it the same way: upload the folder. Opening `index.html` straight from the disk does not work in
most browsers, because they refuse JavaScript modules from a file.

Each page is an address after `#`: `#/read`, `#/remix`. That is what lets a plain server
refresh any page without being told about it.

## What is where

| folder or file | what |
|---|---|
| `index.html` | the page: its stylesheets and one script, `app.js` |
| `app.js` | the pages, and the one the app opens on |
| `pages/`, `components/` | one JavaScript file per part, with its look beside it in a `.css` file of the same name |
| `styles/theme.css` | the design tokens (colours, sizes, fonts) as CSS custom properties: change one here and it changes everywhere |
| `styles/base.css`, `styles/app.css` | the page's floor, and the stylesheets the app's shell held in NodeGX |
| `lib/` | the small library every part uses: `core.js` holds values and redraws what reads them, `dom.js` makes the elements, `router.js` changes page |

A part is a function: `mountReadPage(element, inputs)` draws the page into `element`. To find where a piece of text
comes from, search the `pages/` and `components/` files for it.

## What did not come across

32 things are listed in `EXPORT-PREFLIGHT.md`, each by the node it sat on.
