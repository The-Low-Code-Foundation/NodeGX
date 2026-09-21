---
title: "SendGrid"
---

This prefab will add a logic component to your cloud functions so you can send emails with [SendGrid](https://sendgrid.com), it will show up in the **SendGrid** folder among your cloud functions.

## Settings

First you must provide a few settings, this is done in the **Config** part of the **Cloud Dashboard**. Launch your cloud services dashboard (if you don't have a cloud service you need to create and make it active for the project).

Then find the **Config** section in the sidebar of your dashboard. You can take a look at the Config node for more details on how config parameters work. Create a parameter for `SendGridAPIKey`, make sure you make the **Master Key Only** so it is protected in your cloud service.

## Sending an email

Sending an email is done by adding a **Send Email** logic component to your cloud function and then sending a signal to the **Do** input.

There are a number of inputs to this node that is good to review:

- `To` This is the email for the recipients on your email.
- `CC` This is the email for the cc on your email.
- `BCC` This is the email for the bcc on your email.

The three above inputs can also accept an array of emails, such as:

```javascript
[
    'example@email.com',
    'another@email.com'
]
```

- `From` One string containing an email that should be the from email address.
- `Subject` The subject of your email.
- `Text` If you want to send a pure text email provide the content of the email on this input.
- `Html` If you want to send a html emal, provide the content of the email on this input.
