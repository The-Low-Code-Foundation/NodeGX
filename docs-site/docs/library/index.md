---
title: "Library"
---

Modules and prefabs you can install into a project from the node picker.

There are 28 modules and 46 prefabs documented here.

## Removing something you installed

**A prefab** is copied into your project as ordinary components. To remove it, right-click its top
component in the Components panel and choose **Delete**. The components inside it are deleted with it.
One undo brings them all back. If Delete does nothing on that row, your editor is older than that fix.
Delete the components inside it first, then the top one. Styles and colours the prefab added stay in
the Styles panel.

**A module** lives in your project folder, in `noodl_modules/<module name>/`. The editor has no
Remove button for it yet. To take one out, close the project, delete that folder, and open the
project again. Its nodes leave the node picker. Delete any of its nodes still placed in a component,
because they now show as an unknown node type.
