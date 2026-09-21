---
title: "Shake Detector"
---

This is an example of how to use the [Script](/nodes/javascript/script) node to implement a "Shake detector".

## Inputs

| Data                                        | Description                                                  |
| ------------------------------------------- | ------------------------------------------------------------ |
| `Timeout`   | The minimum time between two shakes                          |
| `Threshold` | How much the phone has to be moved until a shake is detected |

| Signal                                                 | Description                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Request Permission` | Some systems, mainly iOS, requires the user to give the web app permission to use the sensors. This signal will open a popup that allows the users to grant permission. |

## Outputs

| Data                                               | Description                                                                                                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Needs Permission` | **True** if permission is required for accessing the device sensors. Usually **true** on iOS, and **false** on other systems. Will also be **false** on iOS after permission has been granted |

| Signal                                             | Description                |
| -------------------------------------------------- | -------------------------- |
| `Shake Detected` | A shake has been detected! |
