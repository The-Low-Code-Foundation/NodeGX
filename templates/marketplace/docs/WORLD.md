# The marketplace — its world, in plain words

This is what the marketplace holds and who may do what, before any screen is drawn. The files in `world/` say the
same thing in a form the backend is made from: change the world there and the backend follows. This page is for
reading.

## The things in it

| thing | what it is | named in a list by |
|---|---|---|
| **Seller** | a business selling on the marketplace: its name, story, logo, phone and WhatsApp, the country it's in. The admin adds it; sellers don't sign themselves up. | its name |
| **Person** | someone with a login: the admin, a seller's staff, or a buyer who made an account. | their name |
| **Country** | a country the marketplace sells in, with its currency. | its name |
| **Rate** | what one unit of a currency is worth in the marketplace's own currency. The admin sets it by hand. | the currency |
| **Category** | a shelf: food and drinks, phones and laptops, cars. | its name |
| **Product** | something a seller sells: photos, a description, a price in the seller's currency. Either **bought** through the basket, or **enquired about** (a car), when buyer and seller settle it between themselves, off the site. | its name |
| **Way to pay** | on delivery, a bank transfer with a reference, ordering on WhatsApp, or a card or mobile money through a payment provider. The admin turns each one on for each country. | its name |
| **Order** | one checkout: what the buyer bought from one or more sellers, where it goes, the currency they saw it in. Its number is read aloud on the phone: **MK-2026-00042**, starting again each year. | the buyer's name |
| **Order part** | the part of an order one seller sends, and how it is paid: the way the buyer picked for that seller's country. The seller confirms the delivery and its cost, then moves it along: confirmed, paid, packed, sent, delivered. Paid on delivery has no paid step: it is paid when it is delivered. Until it is delivered, it can be cancelled, always with why. | its status |
| **Order line** | one product in an order part: how many, and the price it had when it was ordered. | the product's name |
| **Enquiry** | a buyer's message to a seller about one product: their name, a number to reach them on, what they ask. The seller marks it answered once they have talked (and can unmark it). The marketplace takes no part in the sale. | the buyer's name |
| **The marketplace** | there is one: its name, which buyers see at the top of every page. The first admin names it when they set it up (Richard, 2026-10-15). | its name |

And one thing that **happens** and is kept: a payment provider says an order was **paid**, or that the payment
failed, with its reference and amount.

## Who can do what

- **The admin** adds, changes and stops sellers and gives them logins; changes any seller's products; sets the
  countries, the rates, the shelves and which ways to pay each country has; sees every order.
- **A seller's staff** add, change and take off sale their own seller's products, see their own order parts and
  move them along one step at a time (or cancel them, saying why), and read enquiries about their own products and mark them answered. Nothing of another seller's.
- **A buyer** browses with no account, fills a basket from several sellers, checks out and follows their order.
  A buyer who makes an account sees their past orders. Nobody sees another buyer's order.
- **Anyone** sees the products on sale, the sellers' pages and the shelves.

## The rules

1. **Nothing that was ordered is deleted.** A product is taken off sale and a seller is stopped, so old orders
   still show what was bought. Either can be brought back.
2. **An order line keeps the price it had when it was ordered.** Changing a product's price later changes no order.
3. **One order, one part per seller.** Each seller sees only their part; the buyer sees every part move.
4. **Stopping a seller hides its products and stops its logins,** and always records why.
5. **A payment is kept forever and never changed.** A failed one stays beside the one that worked. **A payment's
   reference is one payment** (`world/rules.json`): the buyer's page and the provider's webhook can both check it at
   once, and the store keeps it once.
6. **Who changed what is kept** for people, sellers, countries, rates, products, ways to pay and order parts.
7. **A buyer's phone, email and address are private**: the buyer, the admin and the sellers in that order see them;
   no one else.

## Money between sellers

A basket can hold products from several sellers. The payment provider splits the money to each seller, as Stripe
Connect does; the marketplace never holds a seller's money. A provider can only split a payment between sellers in
one country, so **a basket with sellers in two countries is paid twice, once per country**, each in that country's
currency. **The buyer picks a way to pay for each of those countries**, among the ways the admin turned on there, and
each order part keeps the way picked for its seller's country. Each seller's account at the provider is kept on the
seller, private to the admin.

## Not in this world yet

Live exchange rates, delivery prices and logistics partners, sellers signing themselves up, refunds, paying for
enquire items. The marketplace's own currency is the one the admin rates at 1 on the Rates tab.
