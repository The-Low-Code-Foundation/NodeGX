---
title: "authToken Refresh"
---

This component is used to automatically refresh the user **authToken**.

> Please note that [Xano Client](/docs/library/prefabs/xano/components/setup-xanoclient) needs to be set up in your app before you can properly use this component.

## Inputs

| Data                                            | Description                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `TTL`           | Sets the duration before refreshing the authToken. It is commonly set to half of the token duration. |
| `Endpoint Path` | Sets the API endpoint path (used with the `API Group Base URL`) to refresh the user authToken.       |

| Signals                                   | Description                  |
| ----------------------------------------- | ---------------------------- |
| `Start` | Starts the refresh sequence. |
| `Stop`  | Stops the refresh sequence.  |

## Outputs

| Signals                                     | Description                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                       |
| `Failure` | Sends a signal when an error occurred, and logs an error message in the console. |
