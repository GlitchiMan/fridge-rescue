# Fridge Rescue 4.0 — Premium accounts implementation handoff

**Work in progress on `feature/premium-accounts`. This is NOT a live account system.**

## What this branch currently adds

- New premium color palettes: Forest, Sage, Champagne and Midnight.
- Light, dark and system appearance preferences saved locally in this browser.
- A more personal homepage heading and an accurate recipe-section title.
- A proposed Supabase row-level-security migration for one kitchen per user.

## What is not implemented or enabled yet

- Sign-up, login, Google OAuth, email verification or password reset.
- Actual Supabase connection, session handling or cross-device cloud sync.
- Migration from local data to a signed-in user.
- Account deletion and export from the cloud.
- Auth-specific automated tests.

Do **not** market these as active features until verified. Production stays
on `main` until the feature branch is reviewed, tested and merged.

## Next implementation tasks

1. Configure a Supabase project; apply `supabase/migrations/0001_user_kitchens.sql`.
   Confirm RLS with two separate authenticated test users.
2. Install and lock a supported Supabase browser/server client library. Keep
   server secrets outside the repository; publishable browser keys alone do not
   grant access to private rows.
3. Implement secure SSR-compatible auth session/cookie handling for Next.js 16.
4. Add accessible sign-up, login, logout, recovery and Google OAuth callbacks.
   Verify production redirect allowlists in Supabase.
5. Map the existing `KitchenStore` to user-scoped cloud persistence without
   making its currently synchronous `KitchenRepository` interface pretend that
   network saves are synchronous.
6. Preserve localStorage guest mode. On first login show an explicit import
   preview and confirmation. Merge duplicates by stable IDs, keep a backup and
   never delete guest data automatically.
7. Maintain one authoritative sync source per signed-in session. Implement
   optimistic concurrency using `revision` or a similar mechanism.
8. Treat consent decisions separately from cloud kitchen preferences; confirm
   which values are device-specific and legally appropriate to synchronize.
9. Test anonymous access denial, user A/B isolation, reloads, multi-device
   consistency, account deletion, and offline/network failure behavior.
10. Run `npm run check` and `npm run test:e2e` in a real Node environment,
    check the Netlify deploy preview, then request approval before merging.

## Design note

The original home page directly searches ingredients rather than forcing
onboarding. Keep this useful guest path. A real `Get started free` CTA should
only be added after registration and account saving actually work.

## Configuration still required

When auth is implemented, add the appropriate Supabase URL and publishable
key to Netlify project settings, configure the Google OAuth provider and
approved callback URLs, and review privacy/data-deletion obligations.

No Supabase project, key, migration or live authentication setup has been
created by this branch.
