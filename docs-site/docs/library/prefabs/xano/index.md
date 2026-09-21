---
title: "Xano"
---

This prefab gives you a few components that allows you to connect to Xano and manage user authentication.

> This prefab is built by [Guillaume Maison](https://twitter.com/gmaison). Please show him some love if you find this prefab useful.

## Included components

### Base Components

- **Xano - Setup XanoClient**: Sets up the Xano SDK client to access your instance and workspace. Must be placed in your projects home component.
- **Xano - Request**: Does an API Call to a Xano Endpoint and returns the result.

### User Components

- **Xano – Sign Up**: Signs up a new user.
- **Xano – Log In**: Logs in a user.
- **Xano – Log Out**: Logs out a user.
- **Xano – Current User**: Gets the user data of the currently logged in user and saves it to a global `currentUser` object.
- **Xano – Update Current User**: Updates user data for the currently logged in user, both in Xano and the `currentUser` object.
- **Xano – authToken – Refresh**: Triggers a refresh of the auth token. Mostly for internal use inside of the Xano prefab, but exposed for advanced users.

## Quickstart

First, drop a **Xano – Setup XanoClient** in your project home component. Then set the `API Group Base URL` and the `Datasource`. Finally, open the Project Settings sidebar, find the **Head Code** input and paste the following at the top:

```html
<script
  type="text/javascript"
  src="https://cdn.jsdelivr.net/npm/@xano/js-sdk@latest/dist/xano.min.js"
></script>
```

To automatically refresh the users **authToken** and keep them logged in for longer periods of time, add this to your project home component:
