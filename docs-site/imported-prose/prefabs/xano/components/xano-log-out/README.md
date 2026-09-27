---
title: "Log Out"
---

This component is used to log in a user.

> Please note that [Xano Client](/library/prefabs/xano/components/setup-xanoclient/) needs to be set up in your app before you can properly use this component.

## On success

When a user has successfuly been logged out the **Log Out** component will empty the Noodl Object with the id `currentUser`.

A successful signup will also trigger a `Xano User Logged Out` event. You can hook into to this event anywhere in your app using a [Receive Event](/nodes/events/receive-event/) node. This event can be used to stop the **authToken** refresh.

## If you are refreshing the authToken

Don't forget to turn off the **authToken** refresh if you have added that to your app. This can be done by placing the following nodes in the **home component**:

## Inputs

| Signals                                | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| `Do` | Send a Signal to this input to send the logout request. |

## Outputs

| Signals                                     | Description                                |
| ------------------------------------------- | ------------------------------------------ |
| `Success` | Sends a signal when the request succeeded. |
