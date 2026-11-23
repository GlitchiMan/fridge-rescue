# Launch checklist

Live site: https://fridge-rescue-118.netlify.app

## 1. Connect automatic deploys (needs the site owner)

1. Open https://app.netlify.com/projects/fridge-rescue-118/configuration/deploys
2. Under **Continuous deployment**, choose **Link repository**, then **GitHub**.
3. Authorize Netlify and select `GlitchiMan/fridge-rescue`.
4. Keep branch `main`. `netlify.toml` supplies the build settings.

After that, every push to `main` updates the live site.

## 2. Google Search Console

1. Open https://search.google.com/search-console and add a **URL prefix** property for the live URL.
2. Choose the **HTML tag** method and send the tag to be added to the site.
3. After verifying, submit `sitemap.xml` under **Sitemaps**.
4. Use **URL Inspection** on the homepage and one recipe.

If you buy a domain, do this after moving to it, and update `NEXT_PUBLIC_SITE_URL` first.

## 3. Before applying to AdSense

Approval is Google's decision and is not guaranteed.

- [ ] Set `NEXT_PUBLIC_CONTACT_EMAIL`. The contact page is incomplete without it, and the address is public.
- [ ] Use a custom domain.
- [ ] Add photos for more recipes (see `RECIPE_IMAGE_BRIEF.md`).
- [ ] Review `/privacy` and `/terms` for your jurisdiction.
- [ ] Before serving ads to EEA, UK or Swiss visitors, integrate a Google-certified consent platform (IAB TCF). The built-in cookie page is not one.
- [ ] Update the privacy policy to describe advertising cookies before turning ads on.

Ads stay off until `NEXT_PUBLIC_ADS_ENABLED=true` and a real client ID are set.

## 4. Optional integrations

See `docs/DISCOVER.md` for YouTube, trends, Upstash and AI. The trend refresh has **no scheduler on Netlify yet**.
