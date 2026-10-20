# Setting up the marketplace

The marketplace lets sellers in several countries sell to buyers who don't need an account. You set it up once, in
the order of this page. Then sellers add their products and buyers can order.

## 1. Start its backend

Open the marketplace in NodeGX. The first time, NodeGX updates the project and keeps the original in a folder beside
it called `marketplace.before-0.4`. You can delete that folder once the marketplace opens.

Open **Backend Services** in the left-hand bar and press **+**. Choose **Built-in**, then **Run one on this computer**.
Give the backend a name, press **Create**, then **Start backend**. The shop's home page then reads "Nothing is on sale
yet".

Run one app's backend at a time. If another NodeGX app's backend is running, stop it before you open the marketplace.

## 2. Open the admin app

On the backend's card, press **Manage data & settings**. The backend's admin app opens in your browser.

The first time, it asks you to create your admin account for the backend. Choose an email and a password. Use a
different email for the marketplace's admin in step 4. The marketplace refuses an email that already has an account.

## 3. Choose a setup token

The setup token lets one person set the marketplace up and become its admin. It works once.

In the admin app, open **Secrets** and add a secret named `MARKETPLACE_SETUP_TOKEN`. Its value is any long phrase you
keep to yourself.

## 4. Set the marketplace up

Open the app and press **Sign in**, then **Set up this marketplace**. Fill in the setup token, the marketplace's name,
your name, your email and a password of 8 characters or more. Press **Make me the admin**.

Buyers see the marketplace's name at the top of every page. You can change it later with **Rename the marketplace**,
on the Sellers page.

You're taken back to **Sign in**. Sign in with that email and password. As the admin, you land on **Sellers**.

## 5. Countries and ways to pay

Sellers, prices and ways to pay all belong to a country. Open **Ways to pay** and add each country the marketplace
sells in, with its currency code (GHS for Ghana, NGN for Nigeria).

Then turn each way to pay on for each country, and change what it tells buyers at checkout if you like. Pay on
delivery, bank transfer and WhatsApp need nothing else. Card and mobile money need Paystack: see
[PAYING-BY-CARD.md](PAYING-BY-CARD.md).

## 6. Rates

Buyers see every price converted into one currency. Open **Rates** and type 1 beside the marketplace's own currency.
For each other currency, type what one unit of it is worth in yours. You set the rates by hand. Each seller is still
paid in their own currency.

## 7. Shelves

A product goes on a shelf, so add the shelves before sellers add products. Open **Shelves**, type a name and press
**Add the shelf**. A shelf can be renamed but never taken away. Old orders keep theirs.

## 8. Sellers

Open **Sellers** and press **Add a seller**. Give their name, their country, a phone number, a WhatsApp number buyers
can message and a few lines about them for their page. Their logo and their payout account at Paystack can wait. Only
you see the payout account.

Then press **Give a login** and type the name, email and a password for the person who'll run the seller's shop. Tell
them the password yourself. A seller can have more than one login.

## 9. What sellers do

A seller signs in from **Sign in** and lands on their **Orders**. On **Products** they add a product: up to 8 photos, a
name, a description, a price in their currency and a shelf. Each photo is made smaller on the phone before it's sent.
A product is either bought through the basket or enquired about, where the buyer messages the seller and they settle
it between them.

Each new order waits for the seller to confirm their part of it. They type the delivery cost and when it comes. Then
they press the **Confirm** button. They move it on with **Packed**, **Sent** and, for pay on delivery, **Delivered and
paid**. A seller sees only their own part of an order.

## 10. What buyers do

A buyer needs no account. They add products to the basket and check out with their name, phone and address, and pick a
way to pay. Their order opens on a private link that shows each seller's progress. The phone keeps the link under **My
order**.

## What isn't there yet

- Photos need NodeGX 0.4.3 or later. On 0.4.2 a product's photo uploads, but it shows as a broken image.
- Putting the marketplace on the internet. For now it runs on your own computer.
- Paying by Flutterwave.
