# Fridge Rescue

> Turn what's in your fridge into something delicious.
> *Less waste. More taste. More savings.*

Fridge Rescue is an ingredient-first cooking web app. Tell it what you have and it recommends realistic recipes, explains exactly what's missing, highlights food approaching the dates you entered, and helps you plan meals and shop for only what you need. No account, no paid AI – everything runs on structured recipe data and a deterministic, tested matching engine.

---

## Quick start (Windows, macOS, Linux)

Requires **Node.js 20.9+** (use the current LTS, e.g. 22.x) and npm.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

### All commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (static-generates all recipe pages) |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit/integration tests (Vitest) |
| `npm run validate:data` | Recipe database validation only |
| `npm run test:e2e` | Playwright end-to-end tests (builds must exist: run `npm run build` first) |
| `npm run check` | typecheck + lint + unit tests + build |

First time running e2e tests on your machine, install the browser once:

```bash
npx playwright install chromium
```

> `.npmrc` sets `legacy-peer-deps=true` because Vitest declares optional peer dependencies that trip npm's resolver. It doesn't change what gets installed for the app.

### Environment variables

Copy `.env.example` to `.env.local` and adjust. All are optional for local development.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public URL (canonical links, sitemap, Open Graph). **Set this in production.** |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Address used by the /contact page (mailto form, no backend). |
| `NEXT_PUBLIC_ADS_ENABLED` | `true` to enable AdSense (also needs the client id + visitor consent). Default off. |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Your real `ca-pub-…` id. Never commit a made-up one. |
| `NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS` | `true` to show grey "DEV AD PLACEHOLDER" boxes where ads would go. |

---

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS 4.** Public pages (home, recipes, guides, legal) are Server Components and are statically generated – 43 recipe pages and 6 guides are pre-rendered HTML. Only interactive islands (ingredient picker, fridge, lists, planner) are Client Components.
- **Recommendation engine** – `src/lib/matching/engine.ts`. Pure functions, no React. Documented scoring (coverage 45, completeness 20, use-soon 15, time 10, preference 10, penalties per missing/short ingredient) with fully stable tie-breaking. Handles unit conversion, unknown quantities ("Ingredients match — check quantities"), opt-in pantry staples, recipe-aware substitutions, excluded ingredients, diets, equipment and servings scaling.
- **Data** – `src/data/ingredients.ts` (≈120 canonical ingredients with synonyms, allergens, diet flags), `src/data/recipes/*` (43 original recipes), `src/data/substitutions.ts`, `src/data/guides.ts`. Diet labels are *derived* from ingredients, never hand-typed.
- **Persistence** – `src/lib/storage/`: a `KitchenRepository` interface with a `LocalStorageRepository` implementation, a Zod-validated versioned schema with migrations and per-entry salvage of corrupted data, and a small store consumed via `useSyncExternalStore` (no hydration mismatches). Swap in a Supabase repository later without touching UI.
- **Quantities** – `src/lib/quantities/units.ts`: exact conversions within mass/volume; pieces ↔ grams only via documented per-ingredient approximations, always labelled "estimated".

```
src/
  app/                 routes (pages, sitemap, robots, manifest, icons)
  components/          ui/, layout/, recipes/, inventory/, shopping/, planner/, ads/, …
  data/                ingredients, recipes, substitutions, guides
  hooks/               use-kitchen (store subscription)
  lib/                 matching/, quantities/, storage/, shopping/, planner/, seo/, ads/, analytics/
  types/               domain model
tests/
  unit/                engine, units/search, storage/shopping/deduction, data validation
  e2e/                 Playwright user journeys (desktop + mobile)
public/                sw.js, icons/
```

### Images

Photos live in `public/images/` and are served as resized AVIF/WebP by Next.js Image, so large PNG originals are fine.

| File | Used for |
| --- | --- |
| `public/images/hero-kitchen.png` | Homepage hero (cropped to keep the food along the counter) |
| `public/images/ingredients-editorial.png` | "Less waste. Better meals." section (copy sits on the empty stone) |
| `public/images/recipes/<recipe-slug>.(avif\|webp\|jpg\|png)` | Photo of that finished recipe, e.g. `recipes/red-lentil-curry.jpg` |

`npm run dev` and `npm run build` scan this folder automatically (`scripts/sync-images.mjs` → `src/data/image-manifest.ts`). If the dev server is already running, run `npm run images:sync` after adding files. Missing images show a neutral placeholder – never a substitute photo. Recipe photos work best at 4:3, at least 1600 px wide; they're also added to the recipe's structured data for search engines.

### Adding or editing recipes

Add a `defineRecipe({...})` entry to one of the files in `src/data/recipes/`, using ingredient ids from `src/data/ingredients.ts`. Then run `npm run validate:data` – it checks unique ids/slugs, valid ingredient references, positive quantities, sensible times/servings, valid substitutions, related-recipe links, and that every essential ingredient is actually mentioned in the method.

---

## Deploying

### Vercel (recommended)

1. Push the project to a GitHub repository.
2. In Vercel, **Add New → Project**, import the repo. Framework is detected automatically (build command `npm run build`, output handled by Next.js).
3. Add environment variables: at minimum `NEXT_PUBLIC_SITE_URL=https://your-domain.com` and `NEXT_PUBLIC_CONTACT_EMAIL`.
4. Deploy. Vercel provides HTTPS automatically.
5. **Domain**: buy a domain from any registrar, add it under Project → Settings → Domains and follow the DNS instructions. Update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

Any Node host that runs `npm run build` and `npm run start` (Render, Railway, a VPS behind HTTPS) also works.

### Production checklist

- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain (check a recipe page's `<link rel="canonical">`).
- [ ] `https://your-domain/sitemap.xml` lists recipe and guide URLs; `robots.txt` references it.
- [ ] Submit the sitemap in Google Search Console.
- [ ] Contact email configured and working.
- [ ] Test the core journey on a real phone (add ingredients → find recipes → save → reload).
- [ ] Install as an app from the browser menu and check offline fallback.
- [ ] Run Lighthouse on `/` and a recipe page (mobile).
- [ ] Re-read `/privacy` and `/terms` and adjust to your jurisdiction (have them reviewed if you add analytics or ads).

### Advertising (AdSense) – later

Ads are **off by default** and the app is fully usable without them. `AdSlot` components are placed only after useful content on public pages (never in ingredient lists, instructions or cooking mode) and reserve space to avoid layout shift. To enable once the site is live and approved:

1. Get AdSense approval for your domain and create ad units.
2. Set `NEXT_PUBLIC_ADS_ENABLED=true` and `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…`; replace the `slot` props in `AdSlot` usages with your real ad unit ids.
3. Scripts load only after the visitor allows advertising on `/cookie-settings`.
4. **For EEA/UK/Swiss visitors, integrate a Google-certified CMP (IAB TCF)** before serving personalised ads – the built-in settings page is not a certified CMP.
5. Update the privacy policy to describe advertising cookies.

### Analytics – later

`src/lib/analytics/events.ts` defines typed, coarse events (no inventory contents, ever). Nothing is sent until you register a sink *and* the visitor consents.

---

## Status

**Done and tested**: homepage finder, synonym-aware autocomplete, My Fridge dashboard + inventory (add/edit/combine/remove/undo/clear, locations, dates, leftovers, search/sort/filter), matching engine and explanations, recipe browser with filters, 43 recipe pages (scaling, checklist, timers, cooking mode, share, print, plan, mark-as-cooked with confirmed deduction), shopping list, meal planner, favourites + history, preferences, export/import, legal pages, cookie settings, SEO (metadata, canonical, sitemap, robots, Recipe/Breadcrumb JSON-LD), PWA (manifest, icons, service worker, offline page).

**Not yet done / ideas for next phases**
- Licensed food photography (recipe pages use original illustrations; Google Recipe rich results generally want a photo, so `image` is intentionally omitted from JSON-LD for now).
- Dark mode; US-customary unit display (the preference is stored but display is metric).
- Accounts and sync (Supabase) via a new `KitchenRepository`.
- Optional AI assistant, barcode scanning, photo ingredient recognition, nutrition from a credible database, notifications, i18n.
