---
title: "Log In"
---

This component is used to log in a user.

> Please note that [Xano Client](/docs/library/prefabs/xano/components/setup-xanoclient) needs to be set up in your app before you can properly use this component.

## On success

When a user has successfully been logged in the **Log In** component will create a Noodl Object with the id `currentUser`. This object contains all the user data retrieved from Xanos `/auth/me` endpoint.

A successful signup will also trigger a `Xano User Logged In` event. You can hook into to this event anywhere in your app using a Receive Event node.

## Keeping the user logged in

To keep the user logged in for longer periods of time you need to refresh the **authToken**. This can be done by placing the following nodes in the **home component**:

## Inputs

| Data                                       | Description                                  |
| ------------------------------------------ | -------------------------------------------- |
| `Email`    | The email of the user you want to log in.    |
| `Password` | The password of the user you want to log in. |

| Signals                                | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| `Do` | Send a Signal to this input to send the login request. |

## Outputs

| Signals                                     | Description                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                       |
| `Failure` | Sends a signal when an error occurred, and logs an error message in the console. |
