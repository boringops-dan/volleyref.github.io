# SEO Strategy -- VolleyRef.App

Living document for organic search growth. Last updated: 2026-03-17.

## Current State (Baseline: March 2026)

**Search Console (28-day window):**
- 28 impressions, 1 click, 3.6% CTR
- Average position: 33.5 across all queries
- Brand term "volleyball referee app" ranks ~6.6 (strong, protect this)
- Informational term "how to keep score volleyball" ranks ~60 (huge upside)

**GA4 (28-day window):**
- ~146 users, ~219 sessions
- Top channels: Organic Search, Direct, Referral
- "Unassigned" channel is disproportionately high -- likely attribution gaps (missing UTMs, cross-domain issues)
- Parents page has highest engagement (59s avg session duration) when users find it

**Pages indexed:** 19 HTML pages + sitemap.xml

---

## Analytics Reference

| Property | Measurement ID | Dashboard |
|----------|---------------|-----------|
| Marketing site (volleyref.app) | `G-MRGTZX69JM` | [GA4 Dashboard](https://analytics.google.com/analytics/web/?authuser=1#/a382390020p522069779/) |
| Web app (app.volleyref.app) | `G-H4CBKV3G9Z` | Separate property |

**Search Console:** [Google Search Console](https://search.google.com/search-console?resource_id=sc-domain%3Avolleyref.app)

---

## Keyword Strategy

### Brand Keywords (Defend)
| Keyword | Current Rank | Goal |
|---------|-------------|------|
| volleyball referee app | ~6.6 | Top 3 |
| volleyref | unranked/new | Top 1 |
| volleyball scoring app | monitor | Top 5 |

**Action:** Homepage and volleyball-referee-app.html are the primary brand pages. Keep title tags and H1s aligned with these terms.

### Feature Keywords (Capture)
| Keyword | Target Page | Priority |
|---------|------------|----------|
| volleyball substitution tracker | volleyball-substitution-tracking.html | High |
| volleyball libero tracking | volleyball-libero-tracking.html | High |
| volleyball scoresheet app | volleyball-scoresheet-app.html | High |
| volleyball scoreboard app | volleyball-scoreboard.html | Medium |
| usav scoring rules | usav-scoring.html | Medium |
| nfhs volleyball scoring | nfhs-volleyball-scoring.html | Medium |

### Informational Keywords (Grow)
| Keyword | Target Page | Current Rank | Opportunity |
|---------|------------|-------------|-------------|
| how to keep score in volleyball | how-to-keep-score-volleyball.html | ~60 | Very high -- need content depth + links |
| best volleyball referee apps | best-volleyball-referee-apps.html | unranked | High -- comparison/listicle intent |
| volleyball rotation rules | (new page needed) | n/a | High search volume |
| volleyball scoring rules | (new page needed) | n/a | High search volume |
| volleyball substitution rules | (new page needed) | n/a | Medium search volume |

### Audience Keywords (Expand)
| Keyword | Target Page | Notes |
|---------|------------|-------|
| volleyball scoring for parents | volleyball-scoring-for-parents.html | Highest engagement when found |
| volleyball coach scoring app | volleyball-scoring-for-coaches.html | |
| volleyball tournament scoring | volleyball-scoring-for-tournaments.html | |
| volleyball league management | volleyball-scoring-for-leagues.html | |

---

## Content Roadmap

### Priority 1: Improve Existing Content
1. **how-to-keep-score-volleyball.html** -- Expand depth significantly. Add step-by-step sections, diagrams, and internal links. This is the highest-volume informational query we can rank for.
2. **best-volleyball-referee-apps.html** -- Ensure it reads as genuinely helpful comparison content, not just self-promotion. Add real competitor analysis.
3. **Audience pages (parents, coaches, teams, leagues, tournaments)** -- Add more specific use cases and scenarios. These pages have thin content relative to the intent.

### Priority 2: New Content Pages
1. **Volleyball Rotation Rules Guide** (`volleyball-rotation-rules.html`) -- High search volume educational content with natural product tie-in.
2. **Volleyball Scoring Rules Explained** (`volleyball-scoring-rules.html`) -- Comprehensive guide covering all rulesets (FIVB, USAV, NFHS, NCAA).
3. **Volleyball Substitution Rules** (`volleyball-substitution-rules.html`) -- Detailed guide on sub limits across rulesets.

### Priority 3: Supporting Content
- Blog-style or resource pages that target long-tail queries
- FAQ expansion on the homepage
- Consider a glossary page for volleyball officiating terms

---

## Technical SEO Checklist

### Completed
- [x] Sitemap.xml with all indexable pages
- [x] Canonical tags on all pages
- [x] Meta descriptions on all pages
- [x] Open Graph and Twitter Card tags
- [x] Structured data (Organization, SoftwareApplication, FAQ, HowTo)
- [x] Mobile-responsive design
- [x] HTTPS everywhere
- [x] robots.txt present
- [x] 404 page with noindex

### Ongoing
- [ ] Update sitemap `<lastmod>` dates when content changes
- [ ] Monitor Core Web Vitals in Search Console
- [ ] Check for crawl errors monthly
- [ ] Verify new pages get indexed within 1-2 weeks of publish
- [ ] Keep structured data valid (test with Google Rich Results Test)

### Recently Fixed
- [x] UTM auto-tagging -- `analytics.js` now auto-appends `utm_source=volleyref_site`, `utm_medium=website`, `utm_campaign={page}`, `utm_content={cta}` to all outbound `app.volleyref.app` links. This should reduce the "Unassigned" channel in the app's GA4 property.
- [x] 404.html and tutorial/index.html now have GA4 tracking
- [x] Sitemap updated with missing SEO content pages

### To Investigate
- [ ] GA4 admin: Add `volleyref.app` as a referral exclusion in the app property (`G-H4CBKV3G9Z`) so marketing site visits don't start new sessions
- [ ] Consider adding hreflang if targeting non-English markets later
- [ ] Image optimization -- ensure all images have descriptive alt text and are compressed

---

## Internal Linking Strategy

**Hub pages:** Homepage, volleyball-referee-app.html
**Spoke pages:** Feature pages, audience pages, educational content

### Linking Rules
1. Every feature page should link to at least 2 other feature pages and the homepage
2. Every audience page should link to relevant feature pages
3. Educational content (how-to, rules guides) should link to the most relevant feature page and the homepage CTA
4. Footer links provide baseline connectivity across all pages
5. Add contextual in-body links where natural -- not just footer/nav

### Cross-linking Gaps to Fix
- Educational pages (how-to-keep-score, best-referee-apps) should link to each other
- Audience pages should cross-link (e.g., coaches page links to teams page)
- Tutorial page should link to relevant feature pages

---

## Measurement Plan

### Weekly Check
- Search Console: impressions, clicks, average position for target keywords
- GA4: sessions by channel, new users

### Monthly Review
- Keyword ranking changes for top 10 target terms
- Pages indexed count in Search Console
- Core Web Vitals status
- Top landing pages by organic traffic
- "Unassigned" channel percentage (should decrease as attribution improves)

### Quarterly Assessment
- Content performance: which pages drive organic traffic vs. which don't
- Keyword gap analysis: new opportunities
- Competitor check: what are competing apps ranking for?
- Decide on new content to create for next quarter

### Key Metrics to Move
| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| Monthly organic impressions | ~28/mo | 200/mo | 1,000/mo |
| Monthly organic clicks | ~1/mo | 20/mo | 100/mo |
| Pages ranking top 20 | 1 | 5 | 10 |
| Brand term position | ~6.6 | Top 3 | Top 3 |

---

## Notes

- The site uses standalone HTML files (no template engine or SSG). Changes must be made per-file.
- GA4 tracking is via `G-MRGTZX69JM` with a custom `analytics.js` for event tracking.
- Never use em dashes in copy on this site.
- See `marketing.md` and `landing_page_marketing.md` for messaging and positioning guidance.
