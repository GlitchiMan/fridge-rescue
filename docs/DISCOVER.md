# Discover, videos and Fridge AI: setup

The site works with none of this configured. Recipes, matching, My Fridge, lists, the planner and the non-AI assistant need no keys.

Add variables in Netlify under **Project configuration → Environment variables**, then redeploy. Never prefix a secret with `NEXT_PUBLIC_`.

## Variables

| Variable | Needed for | Cost |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Correct canonical links and sitemap | Free |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact page (this address is shown publicly) | Free |
| `YOUTUBE_ENABLED=true`, `YOUTUBE_API_KEY` | Real video search | Free quota |
| `CRON_SECRET` | Protects the trend refresh endpoint | Free |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared cache, trend history, AI spend limits | Free tier available |
| `AI_ENABLED=true`, `ANTHROPIC_API_KEY` | AI answers | **Paid, billed by Anthropic** |
| `AI_MODEL`, `AI_DAILY_BUDGET_USD`, `AI_PER_USER_DAILY_LIMIT` | AI model and limits (defaults: `claude-opus-5-5`, $1/day, 20/visitor/day) | n/a |

A Claude Pro subscription does not include API credits. On Netlify, AI stays off until Upstash is also configured, because spend limits are not reliable without a shared store.

## YouTube

Create a project in Google Cloud, enable **YouTube Data API v3**, and create an API key restricted to that API. The default quota is 10,000 units a day. A search costs 101 units here (search + video details), so about 79 uncached searches fit under the app's 8,000-unit cap. Results are cached.

## Trends

`npm run trends:refresh` refreshes once while the app is running. **No daily schedule is configured on Netlify yet**, so Fresh today does not update by itself. "Trending" appears only after two snapshots at least 20 hours apart show measurable growth.

## TikTok and Instagram

Neither offers open public video search for a commercial site, and this app does not scrape them. TikTok's Research API is limited to non-commercial research. Instagram hashtag search needs Meta App Review and is capped at 30 hashtags per week. Add verified public links by hand in `src/data/curated-videos.ts`.

## Estimated AI cost

Assumes about 2,500 input and 700 output tokens per uncached question. Real usage will vary.

| Questions/day | Opus 5.5 ($4/$20 per 1M) | Haiku 5.5 ($0.10/$0.50 per 1M) |
| --- | --- | --- |
| 100 | about $2.40/day | about $0.06/day |
| 1,000 | about $24/day | about $0.60/day |

The default $1/day limit pauses AI answers and falls back to free matching.
