# Fridge AI recipe generation

Fridge AI creates new recipe ideas from the visitor's ingredients. It is **off** until you switch it on. While it's off, the homepage says so and shows matches from the tested recipe collection instead.

## How it works

1. **Ideas** (`POST /api/generate`, `kind: "ideas"`): three short ideas. This step is fast and cheap.
2. **Full recipe** (`kind: "recipe"`): written only for the idea the visitor opens.
3. **Server checks** (`src/lib/generate/validate.ts`) run on every result before anyone sees it:
   - The app, not the model, decides what the visitor has. Anything they didn't enter or confirm as a pantry basic is listed under "To buy".
   - Amounts and units must be realistic. Steps must use the listed ingredients.
   - Recipes that conflict with the visitor's diet or foods to avoid are blocked.
   - Food-safety guidance is written by the app (temperatures, rice, beans, hot oil, leftovers).
   - Words like "tested" or "guaranteed" are removed.
4. AI recipes are labelled "AI-generated, not kitchen-tested". They are never indexed, because `/ai-recipe` is `noindex` and blocked in `robots.txt`.
5. Saved AI recipes are stored in the kitchen data, so they sync with accounts once Supabase is connected.

## Turning it on (needs your approval: it costs money)

The Anthropic API is billed separately from any Claude subscription. Add these as Netlify environment variables, never in the code:

| Variable | Value |
| --- | --- |
| `AI_ENABLED` | `true` |
| `ANTHROPIC_API_KEY` | a key from console.anthropic.com (with a spend limit set there too) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | required on Netlify so the limits and cache are shared (Upstash free tier) |
| `AI_DAILY_BUDGET_USD` | site-wide daily cap, default `1` |
| `AI_PER_USER_DAILY_LIMIT` | generations per visitor per day, default `20` |
| `AI_MODEL` | default `claude-opus-5-5` |

## Expected cost (estimates, verify with real usage)

At Claude Opus 5.5 prices ($4 per million input tokens, $20 per million output tokens):

- Three ideas: roughly $0.01–0.03
- One full recipe: roughly $0.02–0.05
- So a $1 daily cap covers roughly 15–30 complete journeys a day. Repeated identical requests are served from the cache for free (ideas for 6 hours, recipes for 7 days).

If the model declines a request, the API retries once on a fallback model (`server-side-fallback`). That attempt is billed and counted toward the cap.

## Limits and protection

- 5 generations per minute per visitor, plus the per-visitor daily limit.
- The site-wide daily budget stops all AI calls when it's reached. Visitors then see the tested recipes.
- Requests are size-limited and validated, and user text is passed to the model as untrusted data.

## Not yet verified

- No real model call has been made yet. All tests use a fake model.
- Netlify function time limits: the full-recipe call allows up to 60 seconds. Check the time on a deploy preview after switching AI on.
