# Muddy Paws Shelter — initial scope (SUBSTITUTE)

> Written 2026-11-02 for P125-MUDDY-SURFACESUNSAID's re-run, because Richard's original scope
> (`NodeGX test projects/Muddy Paws Shelter/docs/decisions/000-initial-scope.md`) is no longer on disk. Same shape as
> the run it stands in for (a bilingual shelter site, Home first, the backend later); not the same words.

## What it is

A website for Muddy Paws, a small dog and cat shelter run by volunteers. People find an animal to adopt, read how
adoption works, and offer to foster or volunteer.

## Who uses it

- Visitors: families thinking of adopting; most arrive on a phone.
- The shelter's two coordinators, who will later keep the animal list up to date.

## Languages

Everything in English and French. A switch in the header changes the language; the choice is remembered.

## Pages

1. Home: a header (logo, the language switch, links to the main pages), a headline and a short welcome, three
   animals waiting longest, and a call to adopt or foster.
2. Our animals: a list of animals with a photo, name, age and a short story.
3. One animal: the full story, photos, and an "I'm interested" button.
4. How adoption works.
5. Foster with us.
6. Volunteer.
7. Donate.
8. Contact and opening hours.

## What it stores (later)

Animals (name, species, age, story, photos, status: available / reserved / adopted) and enquiries (name, email,
which animal, message).

## What it deliberately will not do

No online payments, no accounts for visitors, no chat.
