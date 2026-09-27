---
title: "Translation"
---

This is the node where the translation happens. You typically connect these to your **Text** nodes and **Text Input** nodes. Translation nodes automatically change their output if language changes, if the bundle is changing, and when it becomes available.

There are two dynamic features in the Translation node:

- If your translation includes some of i18next dynamic features, for example having a `{{count}}` variable deciding between a plural string or not, or by inserting variables in the middle of the string, any variables used can be added as inputs on the Translation node, and be connected to other nodes in Noodl. For example if a translation uses the variable `{{count}}` adding an input named "count" and connecting it to a Number node, the translation will change when the Number node is updated.

- The name of the key can be dynamic. In most cases the key of a translation is known when building the app, but there are cases when the name of the key is only known during runtime. For example, in a database with thousands of products and related texts translated to multiple languages, the translations are generated when needed. The name of the keys are also generated dynamically. A product with an id `xyz123abc` may have its translations stored in an object named `xyz123abc`, `{"xyz123abc":{"label":"Product A", "desc":"A great product"}}`. By using dynamic naming of the key in a Translation node, using the {}-pattern, the actual key can be resolved at runtime. In this scenario naming the Key in the translation node `{product_id}.label`, will expose a new input to the Translation node called "product_id" that can be connected to a Model node in Noodl.

## Inputs

**Key**
The key of the translation. This can be a static text or a text including one or more variables using `{var}` syntax. Variables will become available as inputs.

**Namespace**
The namespace that this translation is using. Should match a namespace of a Language Bundle.

### Variables
You can also add custom inputs to the translation node. They will be mapped to variables in the translated text itself (`{{var}}`) to make use of the i18next transformation functionality, such as plurals.

## Outputs

**Translation**
This translated and formatted text string.
