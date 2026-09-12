#!/usr/bin/env node
/**
 * Comparison page generator.
 *
 * "Best X app" queries are answered by Google's AI Overview from comparison
 * content, not feature pages. best-volleyball-referee-apps.html is the shape
 * that works; this turns that shape into a template so the next comparison page
 * is data, not another hand-written 600-line file.
 *
 * Source of truth: data/comparisons/<slug>.yaml. Output: <slug>.html at the site
 * root, committed like the rest of the generated content. Hand-edits to the
 * generated HTML are overwritten on the next run; edit the YAML.
 *
 * Usage: npm run generate:comparisons
 *
 * NOT yet ported: best-volleyball-referee-apps.html stays hand-written. It is
 * currently the one page Google's AI Overview cites, so it is not worth
 * regenerating just to prove the template reproduces it.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(ROOT, 'data', 'comparisons');
const ASSET_VERSION = '20260821';
const BASE = 'https://volleyref.app';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const NAV = `  <nav class="navbar" aria-label="Main navigation">
    <div class="container">
      <a href="/" class="logo" aria-label="Volleyball Referee. Home"><img src="/images/nav-logo.png" alt="" class="logo-icon"><span class="logo-text"><span class="logo-hi">Volley</span>ball <span class="logo-hi">Ref</span>eree</span></a>
      <ul class="nav-links" id="nav-links" role="list">
        <li><a href="/#features">Features</a></li>
        <li><a href="/#how-it-works">How It Works</a></li>
        <li><a href="/#live-story">Live</a></li>
        <li><a href="/#pricing" data-cta="nav-pricing">Pricing</a></li>
        <li><a href="/#faq">FAQ</a></li>
        <li class="mobile-cta"><a href="https://app.volleyref.app/login" class="btn btn-outline btn-small" data-cta="nav-login">Log In</a></li>
        <li class="mobile-cta"><a href="https://app.volleyref.app" class="btn btn-primary btn-small" data-cta="nav-mobile">Start Scoring Free</a></li>
      </ul>
      <div class="nav-cta">
        <a href="https://app.volleyref.app/login" class="btn btn-outline btn-small" data-cta="nav-login">Log In</a>
        <a href="https://app.volleyref.app" class="btn btn-primary btn-small" data-cta="nav">Start Scoring Free</a>
      </div>
      <button class="mobile-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="nav-links">&#9776;</button>
    </div>
  </nav>`;

const FOOTER = `  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo" aria-label="Volleyball Referee. Home"><img src="/images/nav-logo.png" alt="" class="logo-icon"><span class="logo-text"><span class="logo-hi">Volley</span>ball <span class="logo-hi">Ref</span>eree</span></a>
          <p>Volleyball scorekeeping with rule enforcement built in. FIVB / USAV / NFHS / NCAA, plus Beach and Snow. Any device.</p>
        </div>
        <div class="footer-links">
          <h4>Features</h4>
          <ul role="list">
            <li><a href="/volleyball-substitution-tracking.html">Substitution Tracking</a></li>
            <li><a href="/volleyball-libero-tracking.html">Libero Tracking</a></li>
            <li><a href="/volleyball-scoresheet-app.html">Scoresheet Export</a></li>
            <li><a href="/volleyball-scoreboard.html">Live Scoreboard</a></li>
            <li><a href="/volleyball-scoreboard-overlay.html">Streaming Overlay</a></li>
            <li><a href="/usav-scoring.html">USAV Rules</a></li>
            <li><a href="/nfhs-volleyball-scoring.html">NFHS Rules</a></li>
            <li><a href="/beach-volleyball-scoring.html">Beach Volleyball</a></li>
            <li><a href="/snow-volleyball-scoring.html">Snow Volleyball</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Learn</h4>
          <ul role="list">
            <li><a href="/how-to-keep-score-volleyball.html">How to Keep Score</a></li>
            <li><a href="/volleyball-scoring-rules.html">Scoring Rules</a></li>
            <li><a href="/volleyball-rotation-rules.html">Rotation Rules</a></li>
            <li><a href="/volleyball-substitution-rules.html">Substitution Rules</a></li>
            <li><a href="/volleyball-video-challenge.html">Video Challenge</a></li>
            <li><a href="/volleyref-vs-iscore.html">VolleyRef vs iScore</a></li>
            <li><a href="/volleyref-vs-vbstats.html">VolleyRef vs VBStats</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Guides</h4>
          <ul role="list">
            <li><a href="/best-volleyball-referee-apps.html">Best Referee Apps</a></li>
            <li><a href="/tutorial/">Tutorial</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>For You</h4>
          <ul role="list">
            <li><a href="/volleyball-scoring-for-coaches.html">For Coaches</a></li>
            <li><a href="/volleyball-scoring-for-teams.html">For Teams</a></li>
            <li><a href="/volleyball-scoring-for-leagues.html">For Leagues</a></li>
            <li><a href="/volleyball-scoring-for-parents.html">For Parents</a></li>
            <li><a href="/volleyball-scoring-for-tournaments.html">For Tournaments</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Legal</h4>
          <ul role="list">
            <li><a href="/privacy.html">Privacy Policy</a></li>
            <li><a href="/terms.html">Terms of Service</a></li>
            <li><a href="/delete-account.html">Delete Account</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 VolleyRef.App. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <script src="js/analytics.js"></script>
  <script src="js/main.js"></script>
</body>
</html>`;

function cards(items) {
  return items.map((item) => `
        <div class="feature-card">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.body)}</p>
        </div>`).join('');
}

// Features run down the left and apps across the top: with five apps and eight
// features the app-per-row layout used elsewhere on the site would not fit.
// Markup otherwise matches the existing comparison tables so it picks up the
// same CSS, which styles thead th and tbody td:first-child and knows nothing
// about row headers or captions.
function comparisonTable(table) {
  const head = table.columns.map((col, index) =>
    `<th>${index === 0 ? `<span style="color: var(--primary);">${esc(col)}</span>` : esc(col)}</th>`).join('');
  const body = table.rows.map((row) => {
    const cells = row.cells.map((cell, index) =>
      `<td>${index === 0 ? `<strong>${esc(cell)}</strong>` : esc(cell)}</td>`).join('');
    return `
            <tr>
              <td><strong>${esc(row.feature)}</strong></td>${cells}
            </tr>`;
  }).join('');
  return `
      <div class="comparison-table" style="overflow-x: auto;">
        <table class="comparison-table cmp" aria-label="${esc(table.caption)}">
          <thead>
            <tr>
              <th>Feature</th>${head}
            </tr>
          </thead>
          <tbody>${body}
          </tbody>
        </table>
      </div>`;
}

function competitorSections(competitors) {
  return competitors.map((rival) => `
        <h3 id="${esc(rival.id)}" style="font-size: 1.5rem; margin-bottom: 1rem;">${esc(rival.name)}</h3>
        <p style="margin-bottom: 1rem;">${esc(rival.summary)}</p>
        <div class="features-grid" style="margin-bottom: 2.5rem;">${cards(rival.points)}
        </div>`).join('');
}

function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function render(page) {
  const url = `${BASE}/${page.slug}.html`;
  const listItems = [
    { '@type': 'ListItem', position: 1, name: page.ourApp.name, url: `${BASE}/` },
    ...page.competitors.map((rival, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: rival.name,
      url: `${url}#${rival.id}`,
    })),
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: page.title, description: page.socialDescription,
      author: { '@type': 'Organization', name: 'VolleyRef.App' },
      publisher: { '@type': 'Organization', name: 'VolleyRef.App', logo: { '@type': 'ImageObject', url: `${BASE}/images/logo.png` } },
      datePublished: page.datePublished, dateModified: page.dateModified,
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: page.title, itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: listItems.length, itemListElement: listItems,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: page.breadcrumb, item: url },
      ],
    },
    faqJsonLd(page.faqs),
  ].map((block) => `  <script type="application/ld+json">\n  ${JSON.stringify(block, null, 2).split('\n').join('\n  ')}\n  </script>`).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="darkreader-lock">
  <meta name="color-scheme" content="only light">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${esc(page.title)} | VolleyRef.App</title>
  <meta name="description" content="${esc(page.metaDescription)}">
  <meta name="keywords" content="${esc(page.keywords.join(', '))}">
  <link rel="canonical" href="${url}">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#f97316">

  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.socialDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}/images/app-screenshot.png">
  <meta property="og:image:width" content="2560">
  <meta property="og:image:height" content="1600">
  <meta property="og:image:alt" content="${esc(page.imageAlt)}">
  <meta property="og:site_name" content="VolleyRef.App">
  <meta property="og:locale" content="en_US">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.socialDescription)}">
  <meta name="twitter:image" content="${BASE}/images/app-screenshot.png">
  <meta name="twitter:image:alt" content="${esc(page.imageAlt)}">

  <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
  <link rel="stylesheet" href="css/style.css?v=${ASSET_VERSION}">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon.png">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">

${jsonLd}

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MRGTZX69JM"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MRGTZX69JM');
  </script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

${NAV}

  <main id="main-content">
  <div class="container" style="padding-top: 5rem;">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol role="list">
        <li><a href="/">Home</a></li>
        <li aria-current="page">${esc(page.breadcrumb)}</li>
      </ol>
    </nav>
  </div>

  <section class="hero-v7" data-section="hero">
    <div class="hero-text">
      <h1 class="mega-headline">
        <span class="line line-1">${esc(page.headline[0])}</span>
        <span class="line line-accent">${esc(page.headline[1])}</span>
      </h1>
      <p class="hero-subline">${esc(page.subline)}</p>
    </div>
  </section>

  <section class="section" data-section="disclosure" style="padding: 1.5rem 0;">
    <div class="container">
      <p style="max-width: 800px; margin: 0 auto; font-size: 0.95rem;">${esc(page.disclosure)}</p>
    </div>
  </section>

  <section class="section" data-section="criteria" style="background: var(--bg-elevated);">
    <div class="container">
      <div class="section-header">
        <span class="section-label">What Matters</span>
        <h2>${esc(page.criteriaHeading)}</h2>
      </div>
      <div class="features-grid">${cards(page.criteria)}
      </div>
    </div>
  </section>

  <section class="section" data-section="quick-compare">
    <div class="container">
      <div class="section-header">
        <span class="section-label">At a Glance</span>
        <h2>The Apps at a Glance.</h2>
      </div>${comparisonTable(page.table)}
    </div>
  </section>

  <section class="section" data-section="our-app" style="background: var(--bg-elevated);">
    <div class="container">
      <div class="section-header">
        <span class="section-label">${esc(page.ourApp.label)}</span>
        <h2>${esc(page.ourApp.name)}</h2>
      </div>
      <p style="max-width: 800px; margin: 0 auto 2rem;">${esc(page.ourApp.summary)}</p>
      <div class="features-grid">${cards(page.ourApp.points)}
      </div>
      <div class="features-grid" style="margin-top: 1.5rem;">${cards(page.ourApp.limitations)}
      </div>
    </div>
  </section>

  <section class="section cta-section" data-section="mid-cta">
    <div class="container">
      <div class="cta-content">
        <h2>Try VolleyRef.App Free</h2>
        <p>${esc(page.midCta)}</p>
        <div class="cta-buttons">
          <a href="https://app.volleyref.app" class="btn btn-primary btn-large" data-cta="comparison-mid">Start Scoring Free</a>
        </div>
        <p class="hero-microcopy">3 matches free. No credit card.</p>
      </div>
    </div>
  </section>

  <section class="section" data-section="other-apps">
    <div class="container">
      <div class="section-header">
        <span class="section-label">The Alternatives</span>
        <h2>The Competition.</h2>
      </div>
      <div style="max-width: 900px; margin: 0 auto;">${competitorSections(page.competitors)}
      </div>
    </div>
  </section>

  <section class="section" data-section="verdict" style="background: var(--bg-elevated);">
    <div class="container">
      <div class="section-header">
        <span class="section-label">The Verdict</span>
        <h2>Which One Should You Use?</h2>
      </div>
      <div class="features-grid">${cards(page.verdict)}
      </div>
    </div>
  </section>

  <section class="section" data-section="faq">
    <div class="container">
      <div class="section-header">
        <span class="section-label">FAQ</span>
        <h2>Common Questions.</h2>
      </div>
      <div class="features-grid">${cards(page.faqs.map((faq) => ({ title: faq.question, body: faq.answer })))}
      </div>
    </div>
  </section>

  <section class="section" data-section="related">
    <div class="container">
      <div class="section-header">
        <span class="section-label">Keep Reading</span>
        <h2>Related Articles.</h2>
      </div>
      <div class="features-grid">${page.related.map((link) => `
        <a href="${esc(link.href)}" class="feature-card" style="text-decoration: none; color: inherit;">
          <h3>${esc(link.title)}</h3>
          <p>${esc(link.body)}</p>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section cta-section" data-section="final-cta">
    <div class="container">
      <div class="cta-content">
        <h2>${esc(page.finalCta.heading)}</h2>
        <p>${esc(page.finalCta.body)}</p>
        <div class="cta-buttons">
          <a href="https://app.volleyref.app" class="btn btn-primary btn-large" data-cta="comparison-final">Start Scoring Free</a>
        </div>
        <p class="hero-microcopy">3 matches free. No credit card.</p>
      </div>
    </div>
  </section>
  </main>

${FOOTER}
`;
}

const files = readdirSync(DATA_DIR).filter((name) => name.endsWith('.yaml'));
if (files.length === 0) {
  console.error('No comparison data found in data/comparisons/');
  process.exitCode = 1;
}
for (const file of files) {
  const page = yaml.load(readFileSync(join(DATA_DIR, file), 'utf8'));
  const out = join(ROOT, `${page.slug}.html`);
  writeFileSync(out, render(page), 'utf8');
  console.log(`  + ${page.slug}.html`);
}
