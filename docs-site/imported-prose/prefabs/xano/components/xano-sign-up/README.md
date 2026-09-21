---
title: "Sign Up"
---

This component is used create a new user in Xano.

> Please note that [Xano Client](/library/prefabs/xano/components/setup-xanoclient/) needs to be set up in your app before you can properly use this component.

## On success

When a new user has successfully been registered the **Sign Up** component will create a Noodl Object with the id `currentUser`. This object contains all the user data retrieved from Xanos `/auth/me` endpoint.

A successful signup will also trigger a `Xano User Logged In` event. You can hook into to this event anywhere in your app using a [Receive Event](/nodes/events/receive-event/) node.

## Inputs

| Data                                       | Description                                   |
| ------------------------------------------ | --------------------------------------------- |
| `Email`    | The email of the user you want to sign up.    |
| `Password` | The password of the user you want to sign up. |

| Signals                                | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| `Do` | Send a Signal to this input to send the signup request. |

## Outputs

| Signals                                     | Description                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                       |
| `Failure` | Sends a signal when an error occurred, and logs an error message in the console. |
