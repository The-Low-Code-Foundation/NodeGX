---
title: "Current User"
---

This component is used to fetch information from the current logged in users `/auth/me` path in Xano.

On a request it checks if the user is still logged in by looking for a valid **authToken**. The **authToken** is automatically generated when the user is logged in.

> Please note that [Xano Client](/docs/library/prefabs/xano/components/setup-xanoclient) needs to be set up in your app before you can properly use this component.

## Inputs

| Signals                                   | Description                                       |
| ----------------------------------------- | ------------------------------------------------- |
| `Fetch` | Send a Signal to this input to retrieve the data. |

## Outputs

| Data                                        | Description                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `Logged In` | `true` if the user is logged in, `false` if not.                           |
| `Xano ID`   | The users ID.                                                              |
| `Email`     | The users email.                                                           |
| `User Data` | All the data retrieved from the `/auth/me` endpoint of the logged in user. |

| Signals                                     | Description                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                                                           |
| `Failure` | Sends a signal when an error occurred, or if the **authToken** is expired, and logs an error message in the console. |
