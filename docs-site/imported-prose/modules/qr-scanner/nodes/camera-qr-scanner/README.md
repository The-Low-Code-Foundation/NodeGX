---
title: "Camera QR Scanner"
---

The **Camera QR Scanner** node is used to open the camera view finder and scan for QR codes. It uses a [Video](/nodes/basic-elements/video) node to display the camera stream.

When a QR code has been successfully identified, the node will send a `Scan Successful` event and the decoded string, otherwise `Scan Failed`.
In this node, the decoding happens in real time, meaning if the QR code is not visible anymore the node will send an event to indicate that the scanning failed.

## Inputs

| Data                                                   | Description                                                                                                                                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Video Node`           | This input should be connected to the **Dom Element** output of the **Video** node that's used render the camera view finder.                                                                               |
| `Front Facing`         | A **boolean** that decides if the front facing camera should be used (default) or the user facing came.                                                                                                     |
| `Max Scans Per Second` | The number of scans per second the scanner will do to find QR codes. Lowering this number may improve performance if needed. Note that changing this number after triggering **Start** will have no effect. |

| Signal                                    | Description                                               |
| ----------------------------------------- | --------------------------------------------------------- |
| `Start` | Opens the camera stream and starts scanning for QR codes. |
| `Stop`  | Stops the camera stream and stops scanning for QR codes.  |

## Outputs

| Data                                          | Description                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Scan Result` | This output contains the decoded string when a QR code has been found and decoded. If no QR code is found this string will be empty. |
| `Valid Scan`  | A **boolean** that is **true** if the last scan was valid, otherwise **false**.                                                      |

| Signal                                              | Description                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Scan Successful` | Sends a signal when a successful scan was done. The resulting scan is on the **Scan Result** output. |
| `Scan Failed`     | Sends a signal when the latest scan failed, i.e. no QR code was found.                               |
