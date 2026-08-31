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

## App Store Connect sync

- `terms.txt` is a plain-text mirror of `terms.html`'s legal-prose content (headers as bare lines, blank-line-separated paragraphs, no markup). It's the copy-paste source for the app's Custom License Agreement field in App Store Connect (App Information > License Agreement > Edit), which only accepts plain text.
- Whenever `terms.html` changes, update `terms.txt` to match in the same commit, then paste the new `terms.txt` into App Store Connect. They drifted once already (Feb 2026 EULA text left in ASC after the site moved to Aug 2026 terms, including a stale "lifetime plan" mention) and it went unnoticed until an Apple rejection surfaced it.

## Conventions

- Never use em dashes in copy or code
- All pages should have: meta description, canonical URL, Open Graph tags, Twitter Card tags, structured data where appropriate
- New content pages must be added to `sitemap.xml` and linked from the footer
