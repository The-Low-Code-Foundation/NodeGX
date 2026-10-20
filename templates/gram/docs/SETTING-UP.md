# Setting up the community app

The app is for a church community. People ask to join. An admin lets them in. Members sign in with a link sent to their
email. This page is the setup. Each step is done once, before anyone joins.

## Before you start

Open the community app in NodeGX. The first time, NodeGX updates the project and keeps the original in a folder beside
it called `community-app.before-0.4`. You can delete that folder once the app opens.

Open **Backend Services** in the left-hand bar and press **+**. Choose **Built-in**, then **Run one on this computer**.
Give the backend the community's name: members see it in the email that signs them in. Press **Create**, then **Start
backend**.

Run one app's backend at a time. If another NodeGX app's backend is running, stop it before you open the community app.

On the backend's card, press **Manage data & settings**. The backend's admin app opens in your browser. The first time,
it asks you to create your admin account for the backend. Use a different email for the community's first admin in
step 4. The app refuses an email that already has an account.

## 1. Choose a setup token

The setup token lets one person set the community up and become its first admin. It works once.

In the backend's admin app, open **Secrets** and add a secret named `GRAM_SETUP_TOKEN`. Its value is any long phrase
you keep to yourself.

## 2. Set up email

Members sign in with a link sent to their email. They get a message when an admin lets them in. Both need the backend
to send email. Open **Email** in the admin app and set up the mail service.

1. Pick who sends the mail: Gmail, Resend, Postmark, Amazon SES, Mailgun, Brevo, or **Other** for any other mail
   server. Each one shows what goes in Username and Password, with a link to where the provider gives it to you.
2. Fill in **From address** and **From name**. Members see them on every message.
3. In **Base URL (links in emails)**, type the backend's address, shown on its card in Backend Services (such as
   `http://localhost:8607`).
4. Switch on **Sending is on**, press **Save**, then **Send test email** to yourself.

Without email, people can still ask to join and be let in. Nobody can sign in until it's set up. The admin who lets
someone in is told the message didn't go.

## 3. Turn on sign-in links

Open **Sign-in** in the admin app. Sign-up stays closed whatever the switches there say. People ask to join in the app
instead.

1. Switch on **People may sign in with a link sent to their email**.
2. Under **Where your app lives**, add the app's web address, such as `https://community.example.org`. A link only
   brings someone back to an address on this list. While you try the app on your own computer, add
   `http://localhost:8574`, the address of NodeGX's preview.
3. Press **Save policy**.

## 4. Set the community up

Open the app. It says the community isn't set up yet. Press **Set up the community** and fill in the setup token, the
community's name, your name, your email and a password of 8 characters or more.

You're now the first admin. You sign in with that password.

The bar at the top of every page says "gram". To change it, open the `UI/Bar` component in NodeGX and change the text
of its wordmark.

## 5. Letting people in

Someone who asks to join gives their name and email. They tick a box to say they're 13 or older. They wait until an admin
lets them in.

Signed in as an admin, you land on **Waiting for you**. Each person has two buttons.

- **Let in**: they become a member and get a message saying so, with a link to sign in.
- **No**: they're blocked, with the reason "Not let in." They can't sign in. Nothing is deleted.

Under **Admins** you can make a member an admin. Every admin can let people in.

## 6. Posts, hearts and comments

Members land on **The feed**, newest first. **New post** takes up to four photos and a caption. Each photo is made
smaller on the phone before it's sent.

Only signed-in members and admins can see a photo. Its address alone shows nothing to anyone else. The
app checks this when a post is shared, and refuses a photo that anyone could see.

A heart or a comment shows on everyone's feed as it happens, without reloading.

Photos and live updates need NodeGX 0.4.2 or later.

## 7. Profiles

Every member has a profile. It shows their photo, their name, a line about them and their posts.

Press a name in the feed to open that member's profile. **Profile**, in the sections, opens your own. **Edit
profile** changes your photo, your name and the line about you.

A profile photo is kept like a post's photo. Only signed-in members and admins can see it.

## 8. Prayer requests

A member asks the others to pray in a prayer request. It's words only, with no photo. Open **Prayer** and press
**Ask for prayer**. On **New post**, the **Prayer request** button does the same.

A request shows in the feed and on **Prayer**. Members press **I prayed**. Pressing it again takes it back.

Every member sees how many prayed. Only the person who asked sees who. The admins can read who prayed in the admin
app, but the app shows the names to the person who asked and nobody else.

A profile counts a member's posts, their prayer requests and their testimonies. Its grid shows the posts.

## 9. The sections

On a phone, **Feed**, **Post**, **Prayer** and **Profile** sit along the bottom of the screen. On a tablet they run
down the left side. Only members who've been let in see them.

## 10. Reports, hiding and blocking

Nothing is ever deleted. A post or comment that breaks the rules is hidden. Members stop seeing it. Admins still see
it, with the reason. A blocked member can't sign in. Everything they wrote is hidden until an admin lets them back.

**Members** report a post from its page (**Report this post**) and a comment from under it (**Report**). They pick a
reason: a child shown without a parent's yes, unkind, spam or something else. For something else, they say what's
wrong. Only the admins see a report and who sent it. The member reported never does.

A member takes their own post or comment down from its page. Only an admin can bring it back.

**Admins** see reports on the queue, under **Waiting for you**. A child shown without a parent's yes comes first,
then the newest. Press **Look** to see the post or comment, every report on it and who sent it. To hide it, say why
and press **Hide from members**. The reason starts as the one most members gave. **Bring it back** puts it in the feed
again. The queue also lists everything hidden, and every member who's blocked.

To block a member, open their profile (**Look** shows a link to it). Say why and press **Block**. They can't sign in
any more. Their posts and comments go from the feed. **Let them back** on the same profile undoes it, all but anything
hidden for its own reason. An admin can't be blocked. The blocked list also holds anyone you didn't let in. Letting
them back puts them on the waiting list again.

## 11. The community rules

Everyone can read the rules. The waiting page and the queue both open them. An admin changes them there and presses
**Save the rules**. The app keeps a record of each change and the admin who made it.

## 12. Testimonies and events

A testimony is a member's story, told to the others. Press **Testimony** on **New post**. It needs words and can
carry photos. Its words come first on its card, above its photos and its hearts.

An event has a day and a time. Press **Event** on **New post** and say what it is. Then pick the day and the time it
starts. The day can't be in the past or more than a year away. The times run every half hour from 6:00 to 22:00.

A post's card says when it was shared. An event's card says when the event is, and "was" once that day has passed. Each phone shows the time in its own time zone. An event at 9:00 in Lagos shows 8:00 on a phone in Accra.

A profile counts testimonies beside posts and prayer requests. Its grid shows posts and events.

## What isn't there yet

- Search.
- The daily devotional, the Bible and notes.
- Signing in with a six-digit code instead of a link, and installing the app on a phone.
