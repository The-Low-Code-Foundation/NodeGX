---
title: "Validate"
---

The **Validate** node is used to validate data provided as inputs to the node based on a specified _schema_. This is most commonly used to validate input forms, learn more in the [guide](/library/modules/validation).

## Inputs

### General

**Schema**
Here you can specify a _schema_ script that declares the inputs to the node and how they should be validated. The script has the following format:

```javascript
schema({
    Name: string().required('Must provide name'),
    Email: string()
        .required('Must provide email')
        .email('Must be a valid email'),
})
```

Learn more about the schema script in the validation [guide](/library/modules/validation).

**Enabled**
This property controls if the validation should run or not. If set to **false** the validation will not run and no errors will be outputted. Default is **true**.

### Properties

For each property declared in the _schema_ script the node will have one input with the same name. These are used to supply the data that should be validated.

You can also provide an object to be valided via the **Object Id** input. See the [guide](/library/modules/validation) for more details.

### Property Enabled

For each property there will be one boolean that specifies if that particular property should be validated. Default is **true**, if set to **false** that property will not generate any errors during validation.

### Actions

This category consist of two signal inputs for each property, one to enable the validation for the corresponding property and one to disable it. All property validations are enabled by default, if disabled that particular property will not generate any errors.

## Outputs

### General

**Is Valid**
If the node is enabled, and all properties in the _schema_ are valid this output will have **true** otherwise **false**.

### Properties

Each property in the _schema_ will have an output as well. The schema can contain transforms on the properties, such as trimming etc. The transformed properties will be available on these outputs.

### Errors

Each property will possibly have an error if it fails validation according to the _schema_. In that case the error message will be outputted here. If there are not errors or if the validation for that property is disabled an empty string will be outputted.

There is also an array with a collection of all errors on the **Errors** output. See the [guide](/library/modules/validation) for more details.

### Has Error

Each property will also have a corresponding **Has Error** output that is a boolean, so it will have **true** if the property validation is enabled and the property fails validation, otherwise **false**.
