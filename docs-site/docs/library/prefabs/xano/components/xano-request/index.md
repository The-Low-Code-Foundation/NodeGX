---
title: "Request"
---

This component is used to call Xano API endpoints.

> Please note that [Xano Client](/docs/library/prefabs/xano/components/setup-xanoclient) needs to be set up in your app before you can properly use this component.

## Extracting the data

The simplest way to extract the data from the response is by using an [Expression](/docs/nodes/custom-code/expression) node, and accessing the body from the response:

For more advanced extraction (and parsing) you can use a Function node.

## Inputs

| Data                                           | Description                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Endpoint`     | The path of the endpoint to be called within the API Group, like `/auth/signup` or `/auth/login`.         |
| `Request Type` | The type of request you want send. Follows the HTTP standards `GET`, `POST`, `PUT`, `PATCH` and `DELETE`. |
| `Data`         | A JSON formatted payload that will be sent as Request Body.                                               |

| Signals                                | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| `Do` | Sends a Signal to this input to start the request. |

## Outputs

| Data                                       | Description                                   |
| ------------------------------------------ | --------------------------------------------- |
| `Response` | The JSON formatted response from the request. |

| Signals                                     | Description                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `Success` | Sends a signal when the request succeeded.                                       |
| `Failure` | Sends a signal when an error occurred, and logs an error message in the console. |
