---
title: "GraphQL Query"
---

This node enables you to connect to GraphQL based API:s in a quick and easy way.

## Inputs

**Query**
Input your GraphQL query in this field. Example: `{ hero { name } }`

**Endpoint**
A URL for the service that you are using.

**Results**
Click the plus button to define the name of the results array you want to receive from your query. If your query was `{ hero { name } }`, you would give your result the name `hero`.

**Request Headers**
Use this field to add any headers the GraphQL service requires.
Example:
```javascript
headers({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer f60e2ea4dcd07fbcdaef8c8cd8418e', })
```

**Fetch**
Send a signal to this input to execute your GraphQL query.

## Outputs

**Results**
This is a list of the results that were defined in the inputs. Each result will have the name that was defined in the inputs section and it will be an array of items.
