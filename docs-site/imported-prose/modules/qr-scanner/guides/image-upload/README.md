---
title: "Scanning for QR Codes in uploaded images"
---

This example enables you to scan uploaded images for Quick Response (QR) Codes and fetch the resulting data in the QR Code. To scan for QR Codes via a camera feed, see the documentation on the [Camera QR Scanner](/library/modules/qr-scanner/guides/camera-feed).

**The Image QR Scanner** node works in conjunction with the **Open File Picker** node, which is used to upload an image that will be scanned for QR Codes. You can read more about the **File Picker** node [here](/nodes/utilities/open-file-picker). In the image below you can see how such a node tree might look.

## A simple example setup

In the example below, we use a [Button Node](/nodes/ui-controls/button) to open the **File Picker**. Once a file has been successfully uploaded and sent to the QR Node, the `Scan Result` is returned to the [Text Node](/nodes/basic-elements/text) where the data contained in the QR Code will be displayed.

    </img>

Note that In this particular example, no text will be shown if QR Code can’t be found or read from the uploaded image. You can use the `Scan Success/Scan Failed` signals of the **Image QR Scanner** node to include error handling, but this is not shown in this simple setup.
