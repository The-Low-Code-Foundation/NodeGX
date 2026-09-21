---
title: "Setup XanoClient"
---

This component is used to configure the Xano Client, enabling your app to establish connections and query your endpoints.

This prefab will not work unless you place one instance of the Setup Xano Client component in your projects Home Component and set the `API Group Base URL` and `Datasource` values:

The `API Group Base URL` can be found here in Xano:

## Inputs

| Data                                                 | Description                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `API Group Base URL` | The base Request URL used to call all the endpoints of the API Groups.           |
| `Datasource`         | The data environment to be used in your Xano workspace. Defaults to `live`.      |
| `Auth Login Path`    | The path to the login endpoint. Defaults to `/auth/login`.                       |
| `Auth Signup Path`   | The path to the signup endpoint. Defaults to `/auth/signup`.                     |
| `Auth Me Path`       | The path to the endpoint containing the user information. Defaults to `/auth/me` |

After the Xano Client has been set up you can find all the input values in the following Noodl variables:

- `Noodl.Variables.xanoApiGroupBaseUrl`
- `Noodl.Variables.xanoDatasource`
- `Noodl.Variables.xanoAuthSignupPath`
- `Noodl.Variables.xanoAuthLoginPath`
- `Noodl.Variables.xanoAuthMePath`

## Outputs

| Signals                                     | Description                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the Xano Client initilized successfully.                                       |
| `Failure` | Sends a signal when the Xano Client failed initializing. Outputs the error message in the console. |
