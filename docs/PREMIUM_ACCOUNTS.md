# Fridge Rescue 4.0: premium accounts status

Work in progress on `feature/premium-accounts`. **Not live. Do not merge until real Supabase testing is complete and the owner approves.**

## Built and locally tested

- Forest, Sage, Champagne and Midnight palettes with light, dark and system modes.
- Saved appearance applied before first paint on every page.
- Guest mode, with no Supabase code loaded for guests.
- One database schema: `supabase/migrations/20261123120000_accounts.sql`.
- Row Level Security, tested on Postgres with two users plus anonymous access.
- Sync logic with optimistic locking and conflict merging, tested against a simulated cloud.
- Guest import with explicit confirmation. The guest copy is kept on the device.

## Written but NOT yet proven against a real Supabase project

- Sign-up, email confirmation, sign-in, password reset and Google sign-in.
- Session cookies and the auth callback.
- Real cross-device sync, profile name and appearance sync.
- Account deletion.

Do not describe these as working until the checklist in `docs/SUPABASE.md` passes.

## Decisions

- Browsers cannot write kitchen rows directly. Saves go through `save_kitchen_state`, which enforces revisions and always acts on the caller's own row.
- Cookie consent stays per browser and is never synced.
- Amounts are never added together during guest import, because both lists may describe the same food.
- Account prompts stay hidden in production builds until Supabase is configured.
