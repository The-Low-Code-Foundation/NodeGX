# Paying by card or mobile money (Paystack)

Buyers can pay by card or mobile money through Paystack. Paystack splits each payment between the sellers, so the
marketplace never holds a seller's money. This page is the setup. Nothing else is needed: pay on delivery, bank
transfer and WhatsApp work without it.

## How a payment works

A buyer's basket can hold products from sellers in different countries. The buyer pays once for each country. A
basket with sellers in Ghana and Nigeria is two payments: one in cedis to the Ghana sellers, one in naira to the
Nigeria sellers.

A country's payment opens once every seller there has confirmed the order and its delivery cost. Each seller's share
is their whole part of the order, goods and delivery. Paystack's fee comes out of each share in proportion. The
marketplace takes no commission.

The order says paid only when Paystack confirms that the right amount arrived. A seller can't mark a card payment paid
by hand.

## 1. One Paystack business per country

A Paystack business takes payments in its own country's currency only. So the marketplace needs a Paystack business in
each country it sells in. The template takes cards in Ghana, Nigeria, Kenya and South Africa, each in its own
currency. Côte d'Ivoire isn't supported yet.

If you can only open a Paystack business in one country, card payments work in that country only. The other countries
keep the other ways to pay.

## 2. Save each country's secret key

In Paystack, each business has a secret key (`sk_test_…` while testing, `sk_live_…` for real money). Save it on the
backend: open the backend's admin app, go to **Secrets**, and add one secret per country, named after the currency.

| country | secret name |
|---|---|
| Ghana | `PAYSTACK_SECRET_KEY_GHS` |
| Nigeria | `PAYSTACK_SECRET_KEY_NGN` |
| Kenya | `PAYSTACK_SECRET_KEY_KES` |
| South Africa | `PAYSTACK_SECRET_KEY_ZAR` |

The key stays on the backend. No page and no answer to a buyer ever carries it.

## 3. Give each seller a payout account

Each seller needs a subaccount at Paystack, under the business in the seller's own country. Paystack gives it a code
that starts with `ACCT_`. In the marketplace, open the seller as the admin and paste the code into **Payout account at
the payment provider**. Only the admin sees it.

A seller without one can't be paid by card. A buyer who picks card for that country is told to pick another way.

## 4. Turn it on for each country

Signed in as the admin, open **Ways to pay** and switch on **Card or mobile money** for each country you set up in
steps 1 to 3. A buyer who pays by card has to give an email address at checkout. Paystack sends the receipt there.

## 5. Add Paystack's webhook

Paystack sends a buyer who has paid back to their order page. The page then checks the payment. The webhook covers a
buyer who closes the tab before they get back: Paystack tells the backend directly.

Do this for each Paystack business.

1. In the backend's admin app, open **Triggers** and add a trigger.
2. Pick **When called from outside**, and the function `paystackEvent`.
3. Give it a path, such as `paystack-ghs` for Ghana.
4. Pick **Paystack signature**. Then paste that business's secret key, the same one as in step 2.
5. Paste the hook's URL into that business's Paystack dashboard as its webhook URL.
6. To check the key, copy the command under **Try it**. Put the key in its first line and run it in a terminal on the
   computer the backend runs on. The answer 200 means the hook accepted the signature. The test names no order, so
   nothing changes.

The backend checks every call against the key, and refuses one Paystack didn't sign. Refused calls are listed under
**Runs**.

Paystack can only reach a backend that's on the internet. To test the webhook on your own computer, open a tunnel to
the backend. Payments still work without the webhook, because the order page checks each one when the buyer comes
back.

## What isn't there yet

- Flutterwave.
- Refunds. Make a refund in Paystack's dashboard. The order won't show it.
- Paystack itself. Every payment so far has gone through a stand-in that answers as Paystack's documentation says it
  does. Your test keys will be the first real run, so please say what happens.
