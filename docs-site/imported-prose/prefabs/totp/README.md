---
title: "TOTP"
---

**Timebase One Time Password**s is a popular way to do 2-Factor Authentication (2FA) for users, that is, after the user signs in with username and password they need to provide a time based token to complete the login. [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en&gl=US) is a commonly used app, and there are other apps that are compatible.

This prefab contains a couple of cloud functions and frontend logic functions that help you build a 2FA sign up / log in flow in Noodl.

After installing you will see two folders, one among your componets (the frontend) and one in your cloud functions called **TOTP**.

Let's review how we use these components to build the sign up and log in flow.

## Signing up

First the user needs to sign up normally using the [Sign Up](/nodes/data/user/sign-up) node. The **TOTP** prefabs can also be used on an existing user, that is, you can enable **TOTP** after the user has signed up or you can make it required as part of the sign up flow.

## Connecting

When you have a user signed up / logged in you can start the process of activating **TOTP**, this is a two step process. First you need to generate a secret that is attaced to your users, you then need to present the user with a QR Code that is used to add your application to the **TOTP** authentication device (e.g. Google Authenticator). Once that is successful the user can verify that it works by typing in a valid token.

The first step is simply calling the **TOTP/Start Connect** cloud function. The example below calls the function when the page is loaded on the **Did Mount** signal. When the function completes you will receive a **QR Code** that you can simply use as source for an image node to display it.

When completed, you might have a screen like this:

You can customize what name is used when your application shows up in the authentication device / app by looking in the **TOTP/Start Connect** cloud function for the action node called **Generate Secret**, clicking that node will reveal a property called **Name** that you can edit.

At this point the **TOTP** is not yet activated for the user. To activate the user must prove that the authentication device is working by entering a valid token. This token is sent to the cloud function **TOTP/Complete Connect**, when this function completes with **Sucess** the user can no longer log in with just username and password, more on this later. If it completes with **Failure** the token was not correct and you need to alert the user.

When the **TOTP** connection is completed, you can have the user keep using your application as normal. But when it's time for login you need a different flow.

## Logging in

Logging in is now divided into two steps, the first will simply ask for the username / email and password like before.

When the **TOTP** connect has completed you cannot use the [Log In](/nodes/data/user/log-in) node anymore, it will fail stating that log in is disabled. Instead you need to use the **TOTP / Start Log In** component that was installed in your project when cloning the prefab. You use it just like you would the good old **Log In** node, providing **Username** and **Password**.

There can be three possible output signals from this action node:

- **Success** The user is logged in, **TOTP** was not enabled, you can proceed to your application as normal.

- **Failure** The user did not provide the right username / password.

- **TOTP Needed** The username and password was correct but **TOTP** is enabled. You need to send the user to a new page where the **TOTP** can be entered and validated.

This next step simply need to ask the user to provide the **TOTP** from their authentication device.

In this step we are going to use the **TOTP / Complete Log In** that was installed into the project when the prefab was cloned. The **TOTP** token along with the **Username** and **Password** from the previous step (in this example they were stored in variables) need to be provided.

If this action results in a **Success** signal the log in is completed and you can move the user on to your application. If **Failure** is sent then the token was not correct and you need to notify the user.

## Disconnecting

When the user is logged in you can disconnt the **TOTP**, this will remove the secret and the user can now log in the normal way again with just username and password.

This is just a matter of calling the **TOTP / Disconnect** cloud function while the user is logged in. This will return a **Success** or **Failure** signal.
