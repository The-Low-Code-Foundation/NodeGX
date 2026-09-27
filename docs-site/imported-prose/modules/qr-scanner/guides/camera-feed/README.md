---
title: "Scanning for QR Codes in a camera feed"
---

This example enables you to scan a camera feed for Quick Response (QR) Codes and fetch the resulting data in the QR Code. To scan for QR Codes via uploaded images, see the documentation on the [Image QR Scanner](/library/modules/qr-scanner/guides/image-upload).

The Camera QR Scanner Node works in conjunction with the **Video Node**, which displays the camera feed that will be scanned for QR Codes. In the image below you can see how such a node tree might look.

## A simple example setup

In the example below, we use a [Video](/nodes/basic-elements/video) node to display the camera feed of the Camera QR Scanner. We start this feed with the `Did Mount` signal on the top parent **Group**. If a QR Code has been successfully recognized in the camera feed the `Scan Result` is returned to a [String](/nodes/data/string) node that then goes to a [Text Node](/nodes/basic-elements/text) where the data contained in the QR Code will be displayed.

    </img>

It is also possible to connect the `Scan Result` directly to a **Text** node, but by doing it the way above we ensure that the data in the **Text** node does not disappear after the QR Code is out of view again.

## Flipping the camera

Also displayed in the example above is the possibility to flip the camera via the `Front Facing` boolean of the **Camera QR Scanner** node. On mobile devices that have both front- and back-facing cameras these are the cameras you can switch between — in this example this is achieved via a [Switch](/nodes/logic/switch) node that is toggled with a [Button Node](/nodes/ui-controls/button). If you are working on a desktop device via e.g. a webcam, this function might only flip the camera feed itself since there are rarely both front- and back-facing cameras on such devices.

## Displaying the camera feed

Since we are using a **Video** node to display the camera feed, you might want to make adjustments to how the feed is being displayed. Typically you would want to use the display option _Cover_ in the **Video** node’s properties. You can read more about the **Video** node and its different kinds of properties [here](/nodes/basic-elements/video). Likewise it might be a good idea to set a maximum width and height for the video feed itself, either directly in the node itself or via a parent **Group**.

## No camera stream in viewer? HTTP vs. HTTPS

For security reasons, the camera feed can generally only be accessed through a secure connection, i.e. an URL beginning with <code>https://</code>, and not <code>http://</code>. This means that on some platforms (depending on OS and browser) the camera feed of the **Camera QR Scanner** will not work inside of the Noodl viewer. Furthermore, connecting to http://localhost:8574/ might have the same issue. However, on some platforms localhost is exempted from the rule and the camera works without problems in the viewer.
If you run into this problem you will have to deploy to a secure server via <code>https://</code>.
