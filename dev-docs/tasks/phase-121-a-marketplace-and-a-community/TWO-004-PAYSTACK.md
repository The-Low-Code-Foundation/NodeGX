# TWO-004 — Payment doors anyone can use: Paystack, then Flutterwave

**Opened 2026-10-14; widened the same day from the builder's answer** (as many ways to pay as possible, because they vary by country). **Depends on TWO-003 slice 3.** **Status: 🟡 step 1 done s1 (2026-10-14): R8 checked; Richard ruled A, one payment per seller country (§6.4).** Steps 2–8 waited for TWO-003 slice 3, **built and driven in s6 (2026-10-14)**: half of step 3's shape is there (a
`WayToPay` row per method, switched on per country by a relation; the checkout picks one per seller country and each
order part keeps it; TWO-003 §9.1–9.2). **s9 (2026-10-15): step 2 done (§7); step 3's shape built, specced and driven
against a stand-in for Paystack (§8): `startPayment` and `checkPayment`, the order page's Pay box, the way back.**
**s10 (2026-10-15): step 5 for Paystack built and specced (§9): the webhook trigger's `hmac-sha512` scheme (a product
change: backend, admin app, MCP, editor) and `paystackEvent`, which marks paid by `checkPayment`'s own check; the page
and the webhook racing on one payment move the parts once.** Next: step 4 needs Richard's Paystack test keys (§8.6);
Flutterwave's half of step 5 waits for step 6. Kind: product.
**Model:** Fable for the shape (where secrets live, how webhooks are verified, how ways to pay are set per country,
what another template reuses); Opus to build it.

## 1. The person sentence

> **The admin turns on the ways to pay each country uses. A buyer in Nigeria pays by card or bank transfer through
> Paystack; a buyer in a country Paystack doesn't cover pays through Flutterwave, mobile money included. Either way
> they come back to the marketplace and the order says paid. No secret key reaches the browser, and the next template
> that needs payments takes these doors rather than building its own.**

## 2. What exists

- **No Paystack or Flutterwave** in the repo (grep, 2026-10-14).
- Webhook triggers verify `hmac-sha256` or a token only (`nodegx-backend/src/triggers/registry.ts:71`). Paystack signs
  with **HMAC-SHA512** in `x-paystack-signature`; Flutterwave sends a secret hash in a header (both to confirm on their
  docs on the day).
- P112 OWN-015's pattern: a cloud function keeps the key. The secrets store (`SecretsStore`, mode 0600).
- TWO-003's per-country payment settings and orders split per seller.

## 3. What to do

1. **R8's check, first and before TWO-002's pictures are shown:** can Paystack or Flutterwave split one payment
   between several sellers (subaccounts, the Stripe Connect idea) for sellers and buyers across his countries? Which
   countries, which payment methods, what each seller must provide to be paid, the fees. If neither can, stop and ask
   Richard: R8 said it may block the scope.
2. Read the rest of both providers' docs: initialising a payment, the redirect, verifying, webhooks and their
   signatures, test keys and cards. Dated notes and a country × method table in this file.
3. **The shape:** a "way to pay" is a record the admin turns on per country (pay on delivery, bank transfer,
   WhatsApp, Paystack, Flutterwave); the two providers sit behind one pair of cloud functions (start, verify) so the
   checkout doesn't care which.
4. **Paystack v1, no webhook:** start returns the checkout URL; on return, verify with Paystack and mark the order
   paid.
5. **Webhooks:** add an `hmac-sha512` scheme to the webhook trigger (with its header name), and whatever Flutterwave's
   check needs, each with a test that sends a bad signature and sees a refusal. A way to fire a test-mode event at a local backend (Wappler ships a Stripe CLI terminal for this; TWO-008), so the tutorial can show it working. Bug P121-TWO008-WEBHOOKSHA512. Product changes, filed in P78's
   register as the gaps they close.
6. **Flutterwave**, through the same pair of functions.
7. **Split payments** (R8): each seller's share of a basket paid to their subaccount by the provider, tested with two test sellers.
8. Package both so another template can take them: a prefab or a documented set of cloud functions, decided in step 3.

## 4. Acceptance criteria

1. R8's check answered in this file before TWO-002's pictures are shown: which provider splits payments where, or the stop and Richard's ruling.
2. The country × method table in this file, dated, sourced.
3. A test-mode payment completes through each provider and marks the order paid by verification, from recordings.
4. A basket with two test sellers pays each their share through the provider's split.
5. Each webhook marks paid with a correct signature and refuses a wrong one (tested).
6. Secret keys are in no project file and no browser response (searched).
7. A second, empty project takes the doors and completes a test payment by following their own instructions.

## 5. Not this task

Refunds. Live keys. Providers beyond these two.

## 6. Step 1, R8's check (s1, 2026-10-14)

Read on 2026-10-14 by a research agent from the providers' own docs (paystack.com blocks a direct fetch with a 403;
its pages were read through a reader and checked against docs-v2.paystack.com). Marked **unverified** where the docs
don't say.

### 6.1 Paystack

- **Countries:** Nigeria, Ghana, South Africa, Kenya, Côte d'Ivoire ([API currencies](https://paystack.com/docs/api/)).
  Egypt and Rwanda: unverified.
- **Splits:** one payment split to as many subaccounts as wanted, by percentage or a flat amount, set up once
  (`POST /split`) or inline on `/transaction/initialize`; who bears the fee is a choice (`account`, `subaccount`, `all`,
  `all-proportional`) ([multi-split](https://paystack.com/docs/payments/multi-split-payments/),
  [split API](https://paystack.com/docs/api/split/)). **On by default for merchants in Ghana and Nigeria.**
- **The limit:** "You may only split into one currency at a time" ([multisplits FAQ](https://paystack.com/blog/product/multisplits)).
  A subaccount is a bank code from List Banks, which filters by one country. Whether a subaccount's bank can be in
  another country: **not said**; inferred no.
- **A seller provides:** business name, bank, account number. No seller checks by Paystack; the marketplace answers
  for a wrong account.
- **Fees (Nigeria):** 1.5% + NGN 100, capped at NGN 2,000; an international card 3.9% + NGN 100. Ghana: unverified.

| | card | bank transfer | USSD | mobile money | other |
|---|---|---|---|---|---|
| Nigeria | ✓ | ✓ | ✓ | – | Pay with Bank |
| Ghana | ✓ | ✓ | – | ✓ | – |
| Kenya | ✓ | Pesalink | – | M-Pesa | – |
| Côte d'Ivoire | ✓ | – | – | ✓ | – |
| South Africa | ✓ | EFT | – | – | QR, Capitec Pay |

Source: [payment channels](https://paystack.com/docs/payments/payment-channels/).

### 6.2 Flutterwave

- **Splits:** `subaccounts[]` on a charge, shares by ratio, no limit stated; each subaccount has its own `country`
  (NG, GH, KE…; GH, TZ, RW, UG need a branch code); "subaccounts work the same regardless of the currency the
  transaction is in"; automatic settlement only ([split payments](https://developer.flutterwave.com/docs/split-payments),
  [create a subaccount](https://developer.flutterwave.com/v3.0/reference/create-a-sub-account)). No mobile-money
  subaccount documented. v3 only (v4's split page is a 404).
- **Settlement:** a naira card always settles in NGN; other currencies sit in balances per currency.
- **Fees:** Nigeria 2% local, 4.8% international; Ghana card 2.6%, mobile money and transfer 2%.
- **News:** a Nigerian microfinance banking licence (April 2026); no 2025–26 onboarding restriction found for Ghana
  or Kenya.

| | methods |
|---|---|
| Nigeria (NGN) | card, USSD, bank transfer, account, NQR, Apple Pay, eNaira, Opay |
| Ghana (GHS) | card, mobile money |
| Kenya (KES) | card, M-Pesa |
| Uganda, Rwanda, Tanzania, Malawi | card, mobile money |
| Francophone (XOF, XAF) | card, mobile money |
| South Africa (ZAR) | card, account, 1voucher, Apple Pay |

Source: [payment channels](https://flutterwave.com/mw/support/payment-methods/payment-channels).

### 6.3 Webhooks and verifying (for steps 2, 4 and 5)

- **Paystack:** `x-paystack-signature` = HMAC-SHA512 of the raw body with the secret key; three fixed sending IPs;
  live retries for 72 h ([webhooks](https://paystack.com/docs/payments/webhooks/)). Verify:
  `GET /transaction/verify/{reference}`. Test card 4084 0840 8408 4081.
- **Flutterwave v3:** `verif-hash` carries the dashboard's secret hash as is (compare in constant time); **v4:**
  `flutterwave-signature`, an HMAC-SHA256 of the body, base64, though v4's own example compares the header to the
  secret directly ([v4 webhooks](https://developer.flutterwave.com/v4.0/docs/webhooks)). Verify:
  `GET /v3/transactions/{id}/verify` or by `tx_ref`; check status, `tx_ref`, currency and amount.

### 6.4 The verdict, and the stop

**A seller in Ghana and a seller in Nigeria, a buyer in Ghana, one payment split to both:**

- **Paystack: no.** A split is one currency, and (inferred) its subaccounts are banks in the merchant's country.
- **Flutterwave: possible, not proven.** A subaccount carries its own country and the docs say any currency splits,
  but nothing documents one GHS payment settling part to a Nigerian bank, and test mode can't prove it (any account
  number passes).
- **Within one country, both can**: Paystack by default in Ghana and Nigeria.

Neither is proven for his case, so per R8 **the phase stops here for Richard's ruling.** The ways on, as asked:

| | what | R8 kept? |
|---|---|---|
| A | **One payment per seller country.** The checkout charges once for the Ghana sellers (split in GHS) and once for the Nigeria sellers (split in NGN). The provider splits each. | yes |
| B | **Ask Flutterwave in writing** whether one payment can split to banks in two countries; if yes, one payment. | yes, if they say yes |
| C | **The marketplace collects and pays each seller out** (Transfers API). One payment, but the marketplace holds sellers' money for a while. | no |
| D | **v1 sells within one country at a time**: a basket only holds sellers from the buyer's country; cross-border later. | yes |

**Richard, 2026-10-14: A, one payment per seller country.** A basket with sellers in one country pays once; a
basket across two countries pays twice, each payment split by the provider to that country's sellers in that
country's currency. Step 7 tests it with two test sellers in each of two countries. Flutterwave's answer (B) can make
it one payment later without changing the world: a payment already belongs to an order, several to one.

## 7. Step 2, the docs read for the day (s9, 2026-10-15)

Read by a research agent. 🔴 **paystack.com/docs answers 403 to every fetch** (direct, a reader, a browser user agent),
and web.archive.org is blocked here, so nothing below comes from it. Sources actually read: **Paystack's own OpenAPI
spec** ([github.com/PaystackOSS/openapi](https://github.com/PaystackOSS/openapi), `dist/paystack.yaml`, last pushed
2026-06-09: the most current), **docs-v2.paystack.com** (answers 200 but is a stale copy: its test cards expire 10/24
and it has no XOF), and **support.paystack.com**. "Unverified" means none of them says.

| | what | source |
|---|---|---|
| initialize | `POST /transaction/initialize`, `Authorization: Bearer sk_…`; `email` and `amount` required; amount in the subunit (NGN kobo, GHS pesewa, KES, ZAR, USD cents: all ×100); `reference` only `-`, `.`, `=` and letters/digits (max length unverified); `callback_url`; `metadata` (spec: object; v2 docs: stringified); answers `{status, message, data: {authorization_url, access_code, reference}}`; a used reference is a 400 `duplicate_reference` | spec `TransactionInitialize`, v2 transaction page |
| inline split | `split: {type: flat\|percentage, bearer_type: all\|all-proportional\|account\|subaccount, subaccounts: [{subaccount, share}]}`; flat shares in the subunit, their sum **not more than** the amount. 🔴 The spec's `SplitCreate` also requires `name` and `currency`; sending both satisfies either source. Where a remainder goes, and whether the main account must get something: unverified | v2 multi-split page, spec |
| verify | `GET /transaction/verify/:reference`: `data.status`, `amount`, `currency`, `reference`, `metadata` (string or object), `paid_at`, `channel`, `fees`, `split`. Statuses listed anywhere: success, failed, abandoned, reversed (ongoing/pending/queued unverified). Unknown reference: 404 `Entity not found` (generic). "We always send a 200 if a verify request was made": read `data.status` | spec `VerifyResponse`, v2 errors page |
| the way back | the buyer returns to `callback_url` with `?reference=…` (`trxref`: unverified). Always verify on the server and compare the amount | v2 accept-payments |
| subaccount | `POST /subaccount`: `business_name`, `settlement_bank` (a code from `GET /bank?country=ghana\|nigeria\|kenya\|south africa`, whose `type` includes `mobile_money` for Ghana), `account_number`, `percentage_charge`; answers `subaccount_code` (`ACCT_4hl4xenwpjy5wb`). An unverified subaccount's first payout waits until it is verified in the dashboard | spec `SubaccountCreate`, v2 subaccount, support 2125314 |
| webhook | `x-paystack-signature` = HMAC-SHA512, hex, keyed with the **secret key**; event `charge.success` (its payload's fields: unverified); answer 200 first, work after; from 52.31.139.75, 52.49.173.169, 52.214.14.220; retries live every 3 min ×4 then hourly for 72 h, test hourly | v2 webhooks |
| test mode | `sk_test_…`; card 4084 0840 8408 4081 / CVV 408 succeeds; 4084 0800 0000 5408 is declined; Ghana MTN mobile money 055 123 4987. Whether test subaccounts take any account number: unverified | v2 test-payments |
| currencies | 🔴 **a Ghana business charges GHS; Nigeria NGN and USD; Kenya KES and USD; South Africa ZAR; Côte d'Ivoire XOF.** Nothing found lets one business charge both GHS and NGN | support 2130690 |

**What it changes.** R8-A (one payment per seller country) means, on Paystack, **one Paystack business per country**,
each with its own secret key, and each seller's subaccount under the business in the seller's country. Built that way
(§8.1). Whether one business can be registered in two countries is the builder's to find out with Paystack (§8.6).
XOF is left out: neither the spec nor the API docs list it, so its subunit is unknown.

## 8. Session 9 (2026-10-15, Opus 5.5): step 3, the start/verify pair, against a stand-in

### 8.1 The shape

| | where | what |
|---|---|---|
| functions | `packages/noodl-mcp/tests/two004Paystack.ts` | **`startPayment`** (public, 10/min): the order's link token, the country, where to come back. Pays every part of that order in that country paid by Paystack, **once every one is confirmed** (one payment per country, never before the delivery cost is known); the amount is the parts' subtotals and delivery costs read from the store, never the phone's; an inline flat split, each seller's whole part to their subaccount, fees `all-proportional`; a fresh reference each try (`MK-2026-00042-GHS-<12 hex>`); writes nothing. **`checkPayment`** (public, 30/min): a reference. Asks Paystack; success with the amount and currency the confirmed parts add up to now is a `Payment` (`paid`) and moves each part to paid with its history (`paidBy: <reference>`); success with anything else, or a failure, is a `Payment` (`failed`) and moves nothing; unfinished writes nothing; asked again, it answers from the row |
| the keys | the same file | **`PAYSTACK_SECRET_KEY_<currency>`** on the backend (§7: one business per country), read by a Secret node the script names from the country (start) or the reference (check). A country with no key saved says so in words. `PAYSTACK_API_URL`, also a secret, points both at a stand-in; unset, they call `https://api.paystack.co`. A secret, not a parameter: whoever picks that address receives the key |
| the checkout | `two003Checkout.ts` | Paystack is a built way ("Card or mobile money"): the admin turns it on only where Paystack takes the currency (GHS, KES, NGN, USD, ZAR); `placeOrder` takes it only with an email (Paystack's receipt) and when every seller in that country has a subaccount (`ACCT_…`). `followOrder` hands back the order's payments and each part's country id. Flutterwave is still refused |
| a seller's page | `two003Orders.ts` | `movePart` refuses a card payment's confirmed → paid ("marked paid by the payment provider"); the Orders card says "The buyer pays by card; it says paid here once they have." and offers no "The buyer has paid" |
| the buyer's page | `two003Basket.ts` | **`/Shop/PayBox`**, one per country paid by card: who it pays, then **Pay GH₵150 by card or mobile money** once all there have confirmed, then "Paid GH₵150 through Paystack"; the button opens what `startPayment` answers. Back with `?reference=`, the page asks `checkPayment` first, says what happened ("Paid. Thank you: your sellers can see it." / "That payment didn't go through. You can try again."), and drops the reference from the address |
| the admin | `two003Admin.ts` | the grey "not yet" card is gone: Card or mobile money is a way like the others, with a note on what it needs (a Paystack business per country, its key's name, each seller's `ACCT_…`) |

### 8.2 Readings (2026-10-15, working tree on `38373d895`)

- `nodegx-backend/tests/two-004-paystack.test.ts` **10/10**: the shipped functions on a locked backend, against the
  stand-in (`tests/helpers/fake-paystack.ts`). `TWO003_MUTANTS=1 npx jest tests/two-004-paystack-mutants.test.ts`
  **21 of 21 red** (the first run had one green, an equivalent: `checkPayment` keeps only confirmed parts, so dropping
  its cancelled filter changes nothing; removed and written down). With the checkout (its Paystack refusal now
  Flutterwave's) and orders mutant files: **56 of 56 red**.
- The marketplace's backend specs (TWO-001 ×2, sellers, checkout, orders, enquire, Paystack): **133/133**.
- `noodl-mcp/tests/two004Paystack.test.ts` **16/16** (6 checks, 9 mutants red; one more was equivalent: a country never
  holds a paid part beside a confirmed one). With the shop, basket, orders, enquire and template specs: **136/136**.
- The first page-spec run found a fault of mine, not a hole: `ORDER_LOAD` read `Outputs.paidWords` back, which the
  harness answers with a function (always "true"); it keeps a local now.
- Drives, one at a time, all **1/1**: `two-004-paystack-drive` (23 s), then `two-003-drive`, `-shop-`, `-checkout-`,
  `-orders-`, `-enquire-drive` again. No console error but the stand-in's own favicon; 0 px overflow.
- The door raised **no warning**; census: only the marketplace moved (32,210 → 33,512 code lines), no new candidate,
  `--check` fresh; DEF-038 **36/37** (the red `templates/nightbook`, P78's, as before).

### 8.3 The drive

`two-004-paystack-drive.test.ts`, at 390×800 and 1024×640. The phone: the admin switches Card or mobile money on in
Ghana and Nigeria on the page; the checkout offers it first and its email field says "needed to pay by card"; an order
from Kofi's Kitchen and Ama's Shea (Ghana). With Kofi confirmed and Ama not, the box says it waits for both and there is
no button; both confirmed, **Pay GH₵150** (2 × 45 + 20, 30 + 10); the stand-in's page opens on its own origin; declined
there, the page says so and nothing moves; paid there, the order says paid, both parts Paid, the store holds a failed
and a paid payment of GH₵150. The tablet: the same, then Kofi signed in sees his card part waiting with no paid button,
then Nigeria's own payment (₦7,300, the Nigeria key). 14 screenshots, `shots/two004-*.png`.

**What looking at them found, that the drive passed:** the seller's section "Waiting for the buyer to pay" told every
seller to "mark it paid when the money is with you", card payments included (now "…; a card payment marks itself");
the admin's shot was taken at the top of the page, above the card it was for. Noted, not changed: back from a declined
try, the page says it twice (the line above the box, and the box's "The last try didn't go through").

### 8.4 Where it differs, and what is not settled (for gate 4 and step 4)

- **Not asked of Richard:** a country is paid once all its sellers have confirmed (not each seller as they confirm);
  each seller's share is their whole part and the fees are shared in proportion (`all-proportional`), so the
  marketplace takes nothing; a payment for the wrong amount is kept as `failed` and nothing moves (the money stays with
  Paystack's split; refunds are out of scope); paying needs an email.
- 🔴 **Unproven until step 4:** that Paystack takes flat shares adding up to the whole amount with fees in proportion
  (the docs allow ≤; who pays the fee when the main account's share is 0 is unverified); the shape of the real
  checkout's way back.
- 🔴 **For step 5:** a webhook and the page checking the same payment at the same moment could both find no row and
  both write one. The world has no unique reference; the webhook's function should check after writing, or the world
  should say a reference is one payment.
- The picture's "Paid GH₵148 by MTN MoMo" names the channel; the box says "through Paystack" (`data.channel` isn't kept:
  the world's payment has no field for it).

### 8.5 Findings

- **None filed.** Met, good: the door refused nothing and warned nothing; the Secret node's loud failure made "use it
  if set" a wire, not a special case.
- Met, ours: the harness's `Outputs` proxy answers a read with a function (§8.2); a page script must never read its
  own outputs back.
- 🔴 Old trap, met again: `grep` skipped `nodegx-backend/src/server/HttpServer.ts` (the webhook route) as binary; `grep
  -a` found it.

### 8.6 What step 4 needs from Richard

1. **Paystack test keys** for a Ghana business and a Nigeria business (or one, to start: the drive can run one
   country), saved as `PAYSTACK_SECRET_KEY_GHS` / `PAYSTACK_SECRET_KEY_NGN` on a local backend, never in the repo.
2. Two test subaccounts under each (any test bank account), for step 7's two sellers.
3. For the builder: whether his marketplace can hold a Paystack business in each country it sells in (§7's currency
  row). If it can't, R8-A on Paystack means one country per marketplace, or Flutterwave (B).

## 9. Session 10 (2026-10-15, Opus 5.5): step 5, Paystack's webhook

### 9.1 The product change: an `hmac-sha512` scheme on the webhook trigger

Bug P121-TWO008-WEBHOOKSHA512. A webhook trigger's scheme is now one of `hmac-sha256`, **`hmac-sha512`**, `token`.

| | where | what |
|---|---|---|
| the check | `nodegx-backend/src/triggers/webhook.ts` | an HMAC-SHA512 of the raw body, from `x-paystack-signature` or `X-Webhook-Signature`, hex or base64, an optional `sha512=` prefix; constant-time, as the SHA-256 one. `signWebhookHmac512` signs as Paystack does (exported) |
| the rules | `registry.ts`, `admin-triggers.ts` | `WEBHOOK_SCHEMES` is the one list. 🔴 **An `hmac-sha512` hook is never given a made-up secret**: Paystack signs with the business's own secret key, so a minted one would refuse every call. Created without `secret`: refused in words. Its key is not handed back (the caller holds it, and it is a payment key). Rotating it is refused (paste the new key instead). A SHA-256 hook switched to SHA-512 without a key: refused (it would keep its minted secret) |
| the admin app | `admin/app/views/triggers.tsx` | a third choice, **Paystack signature**, with a password box for the key (needed to create; blank on an edit keeps the saved one); no Rotate button for it; its curl example signs with `openssl dgst -sha512` into `x-paystack-signature` |
| MCP, editor | `backendTools.ts`, `TriggerBackendClient.ts`, `workflowTriggerNodes.ts` | the enum, the type, the canvas node's words ("HMAC-SHA512 — x-paystack-signature, Paystack style") |

Specs: `webhook-verify.test.ts` (6 new: Paystack's own form, the accepted variants, wrong/other key/tampered, a
SHA-256 signature refused by SHA-512 and the reverse, the missing header named, no secret); `triggers-http.test.ts`
(2 new, through the real route: no minting, no key in any answer, right signature 200, three wrong ones 401 and
recorded, rotate refused, an edit keeps the key, a switch without a key refused; **the admin page's curl example run
as written by bash and openssl: 200**); `admin-app/schedule.test.tsx` (the drawer's model: the key needed, kept on an
edit, sent trimmed, never sent for another scheme; the example).

### 9.2 The marketplace: `paystackEvent`

`packages/noodl-mcp/tests/two004Paystack.ts`. **What a builder sets up, per Paystack business (per country):** a
webhook trigger, target function `paystackEvent`, scheme `hmac-sha512`, its secret that business's secret key (the same
value as `PAYSTACK_SECRET_KEY_<currency>`), slug e.g. `paystack-ghs`; then the hook's URL
(`/hooks/<backendId>/paystack-ghs`) goes into that business's Paystack dashboard. The template can't ship a trigger
(no template carries `triggers.json`; triggers live on the backend), so this is TWO-007's tutorial and step 8's
package.

- **`call: nobody`** in the policy: only its trigger runs it (a trigger fire doesn't pass the `/functions` gate;
  measured: stranger and admin refused over HTTP, the trigger runs it).
- The trigger hands it Paystack's event as `body`. **A `charge.success` for a reference this marketplace made runs
  `checkPayment`'s own script** (one builder, `checkPaymentScript`, two inputs), asking Paystack again with the key the
  reference names: the event's fields are a hint, never the evidence. Any other event, or another app's reference:
  answered `{}` (200), nothing written, so Paystack stops sending it. A payment Paystack hasn't finished, or Paystack
  unreachable: refused (non-200), so Paystack sends it again (it retries for 72 h).
- 🔴 **§8.4's race, closed for the parts:** the check now asks the store again after its slow call to Paystack
  (`meanwhile`), and after writing reads every row with that reference oldest first: only the first row's writer moves
  the parts (`kept`). Both scripts carry it, so it holds whichever arrives first.

### 9.3 Readings (2026-10-15, working tree on `d65a0b88a`)

- **The product change**, `nodegx-backend`: `webhook-verify`, `triggers-http`, `admin-app/schedule`, `triggers-registry`,
  `triggers-edit` **80/80** (the curl example really run: bash + OpenSSL 3.6.4 → 200). A hand mutant (the SHA-512
  scheme computing SHA-256) turned 4 of `webhook-verify`'s 16 red. `tsc --noEmit`: backend, admin app, MCP **0**;
  the backend's test project **0** (it was 5, all in s3–s7's drive and orders specs: types only, fixed).
- `two-004-paystack.test.ts` **15/15** (5 new: nobody calls it over HTTP; the webhook marks paid by the same check and
  refuses three wrong signatures; other events left alone; one finishing while the other asks; the same instant ×8,
  which kept two rows in 7, then 8, of 8). Mutants: `TWO003_MUTANTS=1 npx jest tests/two-004-paystack-mutants.test.ts
  tests/two-003-checkout-mutants.test.ts tests/two-003-orders-mutants.test.ts` **62 of 63 red**; the green, "asked
  twice, kept twice", had turned equivalent behind the new `meanwhile` check: the spec now counts Paystack's verifies
  (asked again, no new ask), and it and a twin on `paystackEvent` went red: **64 of 64**. Hand mutant, policy
  `paystackEvent` made `public`: red.
- The marketplace's backend specs (TWO-001 ×2, sellers, checkout, orders, enquire, Paystack) **138/138**.
- `noodl-mcp`: `toolDisclosure` (the budget gate) and the Paystack, shop, basket, orders, enquire and template specs
  **154/154**; regenerated twice, the door raised **no warning**; the template spec matches a fresh build.
- Drives, one at a time, all **1/1**: `two-004-paystack-drive` (25 s; the stand-in's Pay now posts Paystack's signed
  webhook, which answered 200 every time; one row per reference agreeing, the parts' paid step once; 14 shots retaken,
  the two paid ones looked at: unchanged), then slices 1–5's five drives. The viewer bundle (Oct 14 19:56) is newer than
  `noodl-viewer-react/src` and `noodl-runtime/src`.
- Census: only the marketplace moved (33,512 → 33,984 code lines read), no new candidate, `--check` fresh. DEF-038
  **36/37** (the red `templates/nightbook`, P78's, as before).
- Not run: the editor's `tests/workflow/workflowtriggernodes.test.ts` (the editor bundle suite) after the canvas
  node's new wording; the admin drawer in a browser (§1 of the handoff).
- 🔴 Peers' jest ran beside some of these (`nodegx-export --ci`, P78's `tpl007*`); the backend specs and every drive
  waited for them to finish.

### 9.4 What is not settled

- ~~**Two rows for one payment.**~~ **Ruled and built the same day (§9.5).** Released at the same instant at the stand-in, the page and the webhook kept two
  `Payment` rows for one reference in 7 and then 8 of 8 races (the parts moved once every time, and both rows always
  agree). The world has no rule that a reference is one payment, and its rules need a person as their source ("Claude
  is not a source"), so none was written. `followOrder` shows one payment per reference meanwhile. **For Richard: "a
  payment's reference is one payment"** — said, it becomes a unique index on `Payment.reference` (a `rules.json` rule,
  `holds: {unique: [reference]}`), and the second write is refused by the store instead of kept.
- **Not built:** a way to fire a real test-mode event at a local backend (§3 step 5's second half). Paystack's test
  mode sends to a public URL only, so a local backend needs a tunnel; the admin page's curl example sends a correctly
  signed event, which is as far as a machine with no public address goes.
- Flutterwave's check (`verif-hash`) waits for step 6.
- Unproven until step 4: the real `charge.success` payload (its fields unverified, §7); the check only reads
  `event` and `data.reference`.

### 9.5 Richard's ruling, and the setup note (s10, later the same day)

- **R11, Richard, 2026-10-15: a payment's reference is one payment** (he asked for a recommendation and took it:
  Paystack already refuses a reused reference, and a kept payment can never be cleaned up). Built: the marketplace's
  first `docs/world/rules.json` (`payment-reference-once`, `holds: {unique: [reference]}`, `from: oral`), projected
  into `backend/schema.json` as a unique index on `Payment.reference`; `WORLD.md` rule 5 says it.
- The check's two after-the-fact guards (`meanwhile`, `kept`) are gone: the store refuses the second row, and the
  check whose row was refused answers from the row that won and moves nothing (`catch` → `won`). The early `known`
  check stays (it saves asking Paystack, and is specced by counting verifies). `followOrder`'s one-per-reference
  filter is gone too: there is one row.
- Measured: the same-instant test, 8 races, **exactly one row each**; **with the index removed from a copy of the
  schema, both race tests go red** (the store is what holds it). Four mutants on the refusal's handling, all red.
- **`templates/marketplace/docs/PAYING-BY-CARD.md`**, for the builder: one Paystack business per country, each key
  saved under **Secrets** as `PAYSTACK_SECRET_KEY_<currency>`, each seller's `ACCT_…` on the seller form, Ways to pay
  switched on, one webhook per business under **Triggers**; and what isn't there (Flutterwave, refunds, a real Paystack
  run). Written to the content-authoring skill and run through its offline checks; the flags left are false alarms
  (step numbers, a complete "If…" sentence, "has confirmed").

**Readings after R11 (2026-10-15, working tree on `d65a0b88a`):** backend specs (the marketplace's seven, `webhook-verify`,
`triggers-http`, `admin-app/schedule`) **196/196**; `noodl-mcp` (budget gate, Paystack, shop, basket, orders, enquire,
template, DEF-038) **190/191**, the red DEF-038's `templates/nightbook` as always; the three mutant files **63 of 63
red** (the five on the retired guards and `followOrder`'s filter gone, four on the refusal's handling added); drives
`two-004-paystack` (now exactly one row per payment), `two-003-checkout`, `two-003-orders` **1/1** each; census: only
the marketplace moved (33,990 code lines), `--check` fresh.


## 10. Session 11 (2026-10-15, Opus 5.5): the admin app's Paystack hook, driven

s10 left one thing built and never rendered: the admin app's **Paystack signature** choice and its key box. s11 drove
it, following the builder's setup page (`templates/marketplace/docs/PAYING-BY-CARD.md` §5) step by step.

### 10.1 The drive

`packages/nodegx-backend/tests/two-004-admin-hook-drive.test.ts`: the served admin page (`/_admin`) in headless
Chrome, signed in as the builder's own account (BMG-014's setup step), against a backend carrying the marketplace's
functions. At **1024×640 and 1440×900**, not 390: the admin app has no narrow layout (§10.3). Each size: Triggers,
New trigger, "When called from outside", `paystackEvent` from the picker, the path, Paystack signature, the key,
Create. Then:

- **Create is greyed until the key is pasted**, and says why on hover (its `title`, new in s11).
- **The URL on screen** (read off the page, never built by the spec) answers a call signed as Paystack signs **200**,
  and one signed with another key **401**.
- **The key is in no answer** of `/admin/triggers` and on no screen after Create.
- **The "Try it" command** (new in s11, §10.2), read off the screen: the key in none of its lines; with the key put in
  its first line, bash and OpenSSL run it as written: **200**; left as it is: **401**.
- **Opened again**: the key box blank with "Saved. Paste a new key only to change it.", **no Rotate button**; Save with
  it blank keeps the key (the signed call still **200**).
- **Runs of this trigger**: 5 runs, 2 refused, 3 accepted. **A refused run's Detail says why** (new in s11, §10.2):
  "unauthenticated webhook (hmac-sha512): HMAC-SHA512 signature mismatch".
- 0 px overflow on every screen at both sizes; 0 console errors. 14 screenshots, `shots/two004-hook-*.png`, looked
  at.

### 10.2 What it found, and what was fixed

| | found | done |
|---|---|---|
| ours, s10 | **The SHA-512 "Try it" example could never be seen.** `webhookExample(…, 'hmac-sha512', key)` is shown only in the one-time secret card, and a Paystack hook never returns a secret. §9.1's "its curl example signs with openssl dgst -sha512" was true of a function, not a screen; `schedule.test.tsx` and `triggers-http.test.ts` graded the function | fixed: the drawer shows a **Try it** block when Paystack signature is picked. The command's first line is `KEY='paste the secret key here'` (`PAYSTACK_KEY_PLACEHOLDER`); the page never holds the key. The test's reference is not one of ours, so `paystackEvent` answers 200 and changes nothing. Setup page step 6 says so |
| product | **A run refused before its first step didn't say why** (P121-TWO004-RUNWHY): "error … This run recorded no steps." The reason was only in Raw JSON. `recordSummary` computed `errorMessage` and nothing rendered it | fixed: the failure band reads "Why it failed" and the reason when no step failed (`runs.tsx` `FailureBand`). jsdom spec in `runs-view.test.tsx`; a hand mutant (the old early return) red |
| ours, s10 | Create greyed with its reason below the fold at 1024×640 | the reason on the button's `title` too (as `files.tsx` does) |
| ours, s10 | the key box touched "Shared token" below it, and its focus ring covered the hint above | spacing |
| product | **The admin app has no narrow layout** (P121-TWO004-ADMINNARROW, low): 308 px off the right at 390, 98 at 600, 0 from 768 | filed, P104's lane; ruling wanted on whether it owes a phone |
| product | **A toast covers a drawer's Save** for 4.5 s (12 s for an error; P121-TWO004-TOASTOVERSAVE, low). The drive waited ~2 s for it | filed |
| product | **Opening a run's Detail drops the Runs filter** (P121-TWO004-DETAILFILTER, low) | filed |
| harness | `helpers/http.ts` `request` JSON-encodes a string body unless `raw: true`, so a signature computed over the string never matches (the first run's 401) | the drive sends `raw: true` |

### 10.3 Readings (2026-10-15, working tree on `9cc3331ad`)

- `two-004-admin-hook-drive` **1/1** (38 s), run alone; earlier runs went beside a peer's single jest file.
- `admin-app/schedule`, `admin-app/runs-view` **48/48** (one new); `triggers-http`, `webhook-verify` **26/26**
  (`triggers-http` runs the changed example as written: 200).
- `tsc --noEmit`: the admin app **0**; the backend's test project (`tsconfig.tests.json`) **0**.
- Copy (setup page step 6 and the drawer's hint): the content-authoring skill's `written`, `closer`, `opener` clean;
  `figures` flags "200", the HTTP status the drive measures.
- Not rerun: the marketplace's own specs and drives (no template file changed in s11).
