---
title: "Update Current User"
---

This component is used to update information in the current logged in users `/auth/me` path in Xano.

> Please note that [Xano Client](/library/prefabs/xano/components/setup-xanoclient/) needs to be set up in your app before you can properly use this component.

## Setting up endpoint

Xano does not create this endpoint by default for the user table. You have to create it manually, with a POST verb:

## On success

When the data has successfully been updated the **Update Current User** component will also update the Noodl Object with the id `currentUser`.

A successful update will also trigger a `Xano currentUser Updated` event. You can hook into to this event anywhere in your app using a [Receive Event](/nodes/events/receive-event/) node.

## Inputs

| Data                                   | Description                  |
| -------------------------------------- | ---------------------------- |
| `Data` | The data you want to update. |

| Signals                                | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| `Do` | Send a Signal to this input to update the data. |

## Outputs

| Signals                                     | Description                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                       |
| `Failure` | Sends a signal when an error occurred, and logs an error message in the console. |
