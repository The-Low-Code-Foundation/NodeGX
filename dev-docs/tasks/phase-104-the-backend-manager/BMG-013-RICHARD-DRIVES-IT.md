# BMG-013 — Richard drives it

**Opened 2026-09-24.** **Depends on every build task.** His; not a session's build job.
**Status: 📋 waits.**

## 1. The person sentence

The phase's (README §1), read by Richard as the person in it:

> **On any page, a person can name what they want in plain words and find a control that does
> exactly that. Nothing asks for JSON, a comma-separated list, a cron string, an id, or a name
> they have to know already.**

## 2. The script (his order, one line each — he may ignore it)

On a copy of a real project's backend (never the live one; `cp -R` the data dir, start a second
`nodegx-backend serve` on a scratch port, open its `/_admin`):

1. **Users:** add a *phone* field from the Users tab; open a user; give them a role by name;
   invite someone by email; disable a user and try to sign in as them.
2. **Collections:** find *records where status is open and created this week*; sort by a
   column; hide two columns; save it as a view; open a record; set *who can see this* to a
   role; upload a picture into a File field.
3. **API keys:** make a key that may read data and call one function; copy the secret; use it
   in a `curl` the card gives you.
4. **Roles:** make *editors*; add two people by typing; remove one; read *what editors can do*.
5. **Permissions:** start *Pets* from *Only the owner*; try it as one of your users.
6. **Triggers:** schedule a function *every weekday at 9*; read the next five runs; run it now;
   watch it in Runs. Make a webhook and paste its URL somewhere.
7. **Schema:** add a *Choice* field with three values; try to save a record with a fourth;
   drop a field; find *Delete collection*. On a collection that has records, add a **required**
   field: the box says *Fill the N records already here with* — fill them, then create a record
   WITHOUT the field and see it refused (R6).
8. **Email / Sign-in:** pick an SMTP preset; edit the welcome template and send it to yourself;
   start the Google wizard and stop at step 2.
9. **Storage / Backups / Settings:** see your files; set the backup schedule; restore (R4) — and
   after a restore, check a permission you changed since that backup is back as it was;
   set a secret; set an allowed origin; on Server, *How long a list can be*. With a bucket
   (MinIO: `docker run -p 9000:9000 minio/minio server /data`, or any S3-compatible one): connect
   it on Storage with *Test connection*, then **Move them to the bucket** and watch the progress;
   send backups to the bucket on Backups.
10. **From the editor:** *Add a field* on a Query Records node; *Manage data & settings*. Once you
    have made your admin account, these open WITHOUT the machine key: sign in once with your
    email and password, and every later open from the editor is already you (R7) — *Activity*
    names you, not *admin credential*.

## 3. What he records

For each page: **WORTHY / NOT WORTHY** as the person in §1, and his words for anything that made
him reach for a string, an id, or a doc. Each finding becomes a row in README §2 the way P103
did it, and is built before the phase closes.

## 4. Rulings he owes before the drive

None. R1, R3, R4 (2026-09-24), R6 and R7 (2026-09-26) are ruled — README §8.
