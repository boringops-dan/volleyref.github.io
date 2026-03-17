# volleyref.github.io

Static marketing site for [VolleyRef.App](https://volleyref.app) -- a volleyball scorekeeping app with automatic rule enforcement.

## Architecture

- Standalone HTML pages (no template system, no SSG). Each page is self-contained.
- Shared CSS in `css/style.css`, shared JS in `js/` directory.
- Hosted on GitHub Pages, served at volleyref.app via custom domain.

## Analytics

- **Marketing site GA4:** `G-MRGTZX69JM`
  - Dashboard: `https://analytics.google.com/analytics/web/?authuser=1#/a382390020p522069779/`
- **Web app GA4:** `G-H4CBKV3G9Z` (separate property, tracked in the app repo)
- Custom event tracking in `js/analytics.js` -- all pages should include the GA4 tag in `<head>` and `analytics.js` before `</body>`.

## Key References

- **Marketing plan:** `MARKETING_PLAN.md` -- master plan for distribution and growth across all channels
- **SEO strategy:** `SEO_STRATEGY.md` -- primary reference for all SEO and organic growth decisions
- **Messaging/positioning:** `marketing.md` and `landing_page_marketing.md`
- **Sitemap:** `sitemap.xml` -- update `<lastmod>` dates when content changes, add new pages when created

## Conventions

- Never use em dashes in copy or code
- All pages should have: meta description, canonical URL, Open Graph tags, Twitter Card tags, structured data where appropriate
- New content pages must be added to `sitemap.xml` and linked from the footer
