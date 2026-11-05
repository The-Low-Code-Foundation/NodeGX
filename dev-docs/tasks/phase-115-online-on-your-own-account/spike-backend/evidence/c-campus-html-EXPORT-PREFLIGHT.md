# Before you export to plain HTML — Campus

**3 components drawn**: mountAnswerRow, mountHomePage, mountOwnerPage.

**0 logic components** (they draw nothing; each runs where a component places it): none.

## Left out by the plan (15) — the same nodes the React export leaves out

- `Pages/Home` "The link's id" — nothing reads any of its parameters, so it contributes no value to the page
- `Pages/Home` "The reader the link names" — its Failure output is consumed and its Fetch is unwired — both fire only after a Fetch, and an Id only binds the record it names (dbmodelnode2.ts setModelID)
- `Pages/Home` "Hello, name" — format output drives nothing statically translatable
- `Pages/Home` "Reader found" — trigger h-reader.fetched is not a rendered element event or a receiver
- `Pages/Home` "Save yes" — its Fetched output is consumed — that pulse fires when an Id is bound and again after every read, and this slice emits only the read
- `Pages/Home` "Save no" — its Fetched output is consumed — that pulse fires when an Id is bound and again after every read, and this slice emits only the read
- `Pages/Home` "Saved" — trigger h-saveno.done is not a rendered element event or a receiver
- `Pages/Home` "Save failed" — trigger h-saveno.failure is not a rendered element event or a receiver
- `Pages/Owner` "Who is signed in" — logic node (net.noodl.user.User)
- `Pages/Owner` "Not signed in" — logic output drives nothing statically translatable
- `Pages/Owner` "Sign in" — its trigger, "Sign in" (o-signin), is not drawn: an element above it, "Sign-in form" (o-login), is authored Mounted false, and the wire into its Mounted from "Not signed in".result is not exported (its loggedIn output is consumed — it belongs to the Fetch path, which is not translated in this slice)
- `Pages/Owner` "Sign out" — its trigger, "Sign out" (o-signout), is not drawn: an element above it, "Signed-in area" (o-in), is authored Mounted false, and the wire into its Mounted from "Who is signed in".authenticated is not exported (the node it comes from is not exported: logic node (net.noodl.user.User))
- `Pages/Owner` "Signed in as …" — format output drives nothing statically translatable
- `Pages/Owner` "Query refused" — trigger o-answers.fetched is not a rendered element event or a receiver
- `Pages/Owner` "Sign-in failed" — its trigger, "Sign in" (o-signin), is not drawn: an element above it, "Sign-in form" (o-login), is authored Mounted false, and the wire into its Mounted from "Not signed in".result is not exported (its loggedIn output is consumed — it belongs to the Fetch path, which is not translated in this slice)

## Read in the plan, not printed by the HTML target yet (1)

- `Answer Row` "When" — its text reads a date-call value, which the HTML target does not print yet
