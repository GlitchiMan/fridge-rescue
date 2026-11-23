# Supabase account setup

Takes about 15 minutes. The Supabase Free plan is enough to start. Guests keep working whether or not this is configured.

## 1. Create a project

1. Sign in at https://supabase.com/dashboard and click **New project**.
2. Name it `fridge-rescue`, generate a strong database password, store it in a password manager, and pick the region closest to your visitors.

## 2. Create the database tables

1. Open **SQL Editor → New query**.
2. Paste the full contents of `supabase/migrations/20261123120000_accounts.sql`. This is the **only** migration. An earlier draft called `0001_user_kitchens.sql` was removed, so do not run it.
3. Click **Run**. You should see "Success".
4. Under **Table Editor**, confirm `profiles` and `kitchen_states` exist and show RLS as enabled.

## 3. Set the sign-in URLs

Open **Authentication → URL Configuration**.

- **Site URL:** `http://localhost:3000` while testing. Change it to `https://fridge-rescue-118.netlify.app` at launch.
- **Redirect URLs:** add both:
  - `http://localhost:3000/auth/callback`
  - `https://fridge-rescue-118.netlify.app/auth/callback`

## 4. Add the keys locally

In **Project Settings → API Keys**, copy the **Project URL** and the **publishable** key (older projects call it `anon`).

Create `.env.local` in the project folder. Git ignores this file.

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Restart `npm run dev`.

**Never use the `service_role` or secret key here.** Do not paste keys into chat.

## 5. Email

Supabase's built-in email is for testing only and is heavily rate-limited. Before launch, add a custom SMTP provider under **Authentication → Emails → SMTP Settings**.

To let people confirm their email on a different device from the one they signed up on, change the **Confirm signup** template link to:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/my-fridge
```

and the **Reset password** template link to:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

## 6. Google sign-in (optional)

1. In Google Cloud Console, create an **OAuth client ID** of type **Web application**.
2. Add the callback URL shown in Supabase under **Authentication → Providers → Google** as an authorized redirect URI.
3. Paste the client ID and secret into that Supabase page and enable it.
4. Add `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` to `.env.local`.

## 7. Test before launch

- [ ] Create an account and confirm the email
- [ ] Sign out and back in
- [ ] Reset the password
- [ ] Add guest ingredients, sign in, and choose **Add to my account**
- [ ] Change palette and mode, then confirm they follow you to a second browser
- [ ] Open the account in a second browser and confirm the data appears
- [ ] Make changes in both browsers and confirm both survive
- [ ] Sign in as a second user and confirm the first user's data is not visible
- [ ] Delete a test account

## 8. Going live (only after approval)

Add the same variables in Netlify under **Project configuration → Environment variables**, merge the branch into `main`, and change the Supabase Site URL to the live address.
