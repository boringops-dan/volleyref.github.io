#!/usr/bin/env node
/**
 * Static-site validator for the SportsRef marketing sites.
 *
 * Dependency-free (pure Node). Runs as the CI quality gate before deploy and
 * is also invoked by the sportsref_aeo sync workflow before it pushes
 * generated output, so bad content never reaches the live site.
 *
 * Gates:
 *   1. HTML essentials   - every page has <title>, meta description,
 *                          canonical link, lang attribute, and viewport.
 *   2. Internal links    - every root-absolute / relative href & src resolves
 *                          to a file that exists on disk.
 *   3. JSON-LD           - every application/ld+json block parses and carries
 *                          @context + @type.
 *   4. SEO essentials    - sitemap.xml, robots.txt, llms.txt, CNAME present.
 *   5. Copy hygiene      - no em dashes (CLAUDE.md: "Never use em dashes"),
 *                          and no ". lowercase" sentence fragments left by
 *                          mechanical em-dash removal (config-gated; see
 *                          `banStripArtifacts`).
 *   6. Social meta       - Open Graph + Twitter Card tags present.
 *   7. GA4 property      - the gtag('config', ...) id matches this site's
 *                          dedicated property, never the sibling site's.
 *   8. Page reachability - every page is listed in sitemap.xml AND reachable
 *                          from the homepage via internal links (a practical
 *                          proxy for "linked from the footer" that survives
 *                          footer markup changes).
 *   9. CTA branding      - beachtennisref.app only: every `data-cta`-marked
 *                          link points at app.beachtennisref.app, never
 *                          volleyref.app (CLAUDE.md rule is one-directional).
 *
 * This file is identical (byte-for-byte, intentionally) across
 * beachtennisref.github.io and volleyref.github.io — SITE_CONFIG below
 * self-derives per-site expectations from CNAME so both repos can share one
 * script. If you edit this file, mirror the change into the sibling repo.
 *
 * Usage:  node scripts/validate-site.mjs            (validates repo root)
 *         node scripts/validate-site.mjs <siteRoot>
 *
 * Exit code 0 = clean, 1 = one or more errors.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));

// Directories that are not part of the published site.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'scripts', '_site', '.github']);
// Root-level files required for SEO / AEO / custom domain.
const REQUIRED_ROOT_FILES = ['sitemap.xml', 'robots.txt', 'llms.txt', 'CNAME'];

// Per-site config, keyed by CNAME content. Each site's CLAUDE.md is the
// source of truth for these values; update both in lockstep with any rename.
// `enforceCtaDomain`: only beachtennisref's CLAUDE.md states a CTA-domain
// rule ("CTAs point at https://app.beachtennisref.app... never volleyball
// branding or volleyref.app links"). volleyref's CLAUDE.md has no reciprocal
// rule — it deliberately publishes beach-tennis-focused content pages
// (e.g. "Best Beach Tennis Scoring Apps") that fish for cross-sport search
// traffic and funnel it to the sibling app via BeachTennisRef-branded CTAs,
// so Gate 9 must not flag those as errors.
// `banStripArtifacts`: a historical mechanical em-dash strip left ". lowercase"
// sentence fragments ("The libero can serve. but only..."). volleyref was swept
// clean on 2026-08-23 and stays clean via this gate. beachtennisref still has
// ~440 such fragments (many in generated pages whose fix belongs in the
// sportsref_aeo data) — flip its flag to true once that site is swept.
// `llmsRequiredSections`: llms.txt headings that are hand-maintained ahead of
// the sportsref_aeo generator; the gate fails loudly if a regeneration
// clobbers them instead of losing them silently.
const SITE_CONFIGS = {
  'beachtennisref.app': { ga4Id: 'G-JELDXQYBLN', appDomain: 'app.beachtennisref.app', enforceCtaDomain: true, banStripArtifacts: false, llmsRequiredSections: [] },
  'volleyref.app': { ga4Id: 'G-MRGTZX69JM', appDomain: 'app.volleyref.app', enforceCtaDomain: false, banStripArtifacts: true, llmsRequiredSections: ['## About VolleyRef'] },
};

function loadSiteConfig() {
  const cnamePath = join(SITE_ROOT, 'CNAME');
  if (!existsSync(cnamePath)) return null;
  const domain = readFileSync(cnamePath, 'utf8').trim();
  const config = SITE_CONFIGS[domain];
  if (!config) {
    warnings.push(`CNAME: unrecognized domain "${domain}" — add it to SITE_CONFIGS in validate-site.mjs to enable GA4/CTA-domain checks`);
    return null;
  }
  return { domain, ...config };
}

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(SITE_ROOT, file) || '.'}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(SITE_ROOT, file) || '.'}: ${msg}`);
const SITE_CONFIG = loadSiteConfig();

/** Recursively collect every .html file under the site root. */
function collectHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collectHtml(join(dir, entry.name)));
    } else if (entry.name.endsWith('.html')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Resolve an internal link target to an on-disk path, or null if external/uncheckable. */
function resolveTarget(rawHref, fromFile) {
  let href = rawHref.trim();
  if (!href) return null;
  // External, protocol-relative, fragment-only, or non-navigational schemes.
  if (/^(https?:)?\/\//i.test(href)) return null;
  if (/^(mailto:|tel:|data:|javascript:|#)/i.test(href)) return null;
  // Strip query and fragment.
  href = href.split('#')[0].split('?')[0];
  if (!href) return null;

  // Resolve relative to site root (absolute) or the linking file's dir (relative).
  let target = href.startsWith('/')
    ? join(SITE_ROOT, href)
    : resolve(dirname(fromFile), href);

  // Directory link -> its index.html.
  if (href.endsWith('/') || (existsSync(target) && statSync(target).isDirectory())) {
    target = join(target, 'index.html');
  }
  return target;
}

// Every page is read once here and re-read by the Gate 8 reachability BFS;
// cache so each file's content is read from disk exactly once per run.
const htmlCache = new Map();
function readHtmlCached(file) {
  let html = htmlCache.get(file);
  if (html === undefined) {
    html = readFileSync(file, 'utf8');
    htmlCache.set(file, html);
  }
  return html;
}

function validateHtml(file) {
  const html = readHtmlCached(file);
  const lower = html.toLowerCase();

  // --- Gate 1: HTML essentials ---
  if (!/<title>[^<]*\S[^<]*<\/title>/i.test(html)) err(file, 'missing or empty <title>');
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']*\S/i.test(html))
    err(file, 'missing meta description');
  if (!/<link\s+rel=["']canonical["']/i.test(html)) warn(file, 'missing canonical link');
  if (!/<html[^>]*\slang=/i.test(html)) warn(file, 'missing <html lang=...>');
  if (!/<meta\s+name=["']viewport["']/i.test(lower)) warn(file, 'missing viewport meta');

  // --- Gate 2: internal links & assets ---
  const refRe = /(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = refRe.exec(html))) {
    const target = resolveTarget(m[1], file);
    if (target && !existsSync(target)) {
      err(file, `broken internal link -> ${m[1]}`);
    }
  }

  // --- Gate 3: JSON-LD structured data ---
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1].trim());
    } catch (e) {
      err(file, `invalid JSON-LD: ${e.message}`);
      continue;
    }
    const blocks = Array.isArray(data) ? data : [data];
    for (const b of blocks) {
      if (!b || typeof b !== 'object') { err(file, 'JSON-LD block is not an object'); continue; }
      if (!b['@context']) err(file, 'JSON-LD missing @context');
      if (!b['@type'] && !b['@graph']) err(file, 'JSON-LD missing @type');
    }
  }

  // --- Gate 5: copy hygiene (no em dashes) ---
  if (/[—–]/.test(html)) err(file, 'contains an em dash (—) or en dash (–) — never use em dashes in copy');

  // Gate 5 (cont.): ". lowercase" fragments left by mechanical em-dash
  // removal. The allowlist covers contexts where a period before a lowercase
  // letter is legitimate (domains, filenames, brand tokens, JS member access).
  if (SITE_CONFIG && SITE_CONFIG.banStripArtifacts) {
    const artifactRe = /[\w"')?%]\. [a-z]/g;
    const artifactAllow = /beachtennisref\.app|volleyref\.app|apps\.apple|analytics\.google|window\.|document\.|dataLayer\.|schema\.org|w3\.org|iScore|iPhones?|vMix|e\.g\.|i\.e\.|Inc\. in|href|src=|\.html|\.css|\.js\b|\.png|\.jpg|\.webm|\.mp4|\.md\b|\.xml|\.txt|\.com|\.org\b|\.io\b|\.mjs|\.json|\.yaml/;
    let am;
    while ((am = artifactRe.exec(html))) {
      const ctx = html.slice(Math.max(0, am.index - 55), am.index + 60);
      if (artifactAllow.test(ctx)) continue;
      err(file, `em-dash-strip artifact (". lowercase" fragment): "...${ctx.replace(/\s+/g, ' ').trim()}..."`);
    }
  }

  // --- Gate 6: social meta (Open Graph + Twitter Card) ---
  if (!/<meta\s+property=["']og:title["']/i.test(html)) warn(file, 'missing og:title');
  if (!/<meta\s+property=["']og:description["']/i.test(html)) warn(file, 'missing og:description');
  if (!/<meta\s+(name|property)=["']twitter:card["']/i.test(html)) warn(file, 'missing twitter:card');

  // --- Gate 7: GA4 property (never the sibling site's) ---
  if (SITE_CONFIG) {
    const gtagMatch = html.match(/gtag\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/);
    if (gtagMatch && gtagMatch[1] !== SITE_CONFIG.ga4Id) {
      err(file, `gtag('config', '${gtagMatch[1]}') does not match this site's GA4 property (${SITE_CONFIG.ga4Id}) — never reuse the sibling site's property`);
    }
  }

  // --- Gate 9: CTA branding (data-cta links point at this site's own app) ---
  // Matches the whole <a ...> tag first, then pulls href/data-cta out of it
  // independently — real markup orders attributes either way
  // (href ... data-cta or data-cta ... href), so a single ordered regex
  // silently misses half of them.
  if (SITE_CONFIG && SITE_CONFIG.enforceCtaDomain) {
    const anchorRe = /<a\b[^>]*>/gi;
    let am;
    while ((am = anchorRe.exec(html))) {
      const tag = am[0];
      if (!/\bdata-cta=["'][^"']*["']/.test(tag)) continue;
      const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      if (/^https?:\/\//i.test(href) && !href.includes(SITE_CONFIG.appDomain)) {
        err(file, `data-cta link points at "${href}" — CTAs must point at https://${SITE_CONFIG.appDomain}`);
      }
    }
  }
}

// --- Gate 4: SEO essentials at root ---
for (const f of REQUIRED_ROOT_FILES) {
  if (!existsSync(join(SITE_ROOT, f))) errors.push(`${f}: required root file is missing`);
}

// Gate 4 (cont.): hand-maintained llms.txt sections survive regeneration.
const llmsPath = join(SITE_ROOT, 'llms.txt');
if (SITE_CONFIG && existsSync(llmsPath)) {
  const llms = readFileSync(llmsPath, 'utf8');
  for (const heading of SITE_CONFIG.llmsRequiredSections || []) {
    if (!llms.includes(heading)) {
      errors.push(`llms.txt: required section "${heading}" is missing — a sportsref_aeo sync likely clobbered it; restore the section (and port it into the generator)`);
    }
  }
}

const pages = collectHtml(SITE_ROOT);
for (const p of pages) validateHtml(p);

// --- Gate 8: sitemap coverage + footer/nav reachability ---
// CLAUDE.md: "New content pages must be added to sitemap.xml and linked
// from the footer." Pages here are never required to be in either — each
// is opted OUT explicitly, so a forgotten new page fails loudly.
const SITEMAP_EXEMPT = new Set(['404.html']);
const REACHABILITY_EXEMPT = new Set(['404.html']);

const sitemapPath = join(SITE_ROOT, 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const sitemapXml = readFileSync(sitemapPath, 'utf8');
  const locPaths = new Set(
    [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
      try {
        return new URL(m[1]).pathname.replace(/^\//, '') || 'index.html';
      } catch {
        return m[1];
      }
    }),
  );
  for (const p of pages) {
    const rel = relative(SITE_ROOT, p).replace(/\\/g, '/');
    if (SITEMAP_EXEMPT.has(rel)) continue;
    const asIndexDir = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : null;
    if (!locPaths.has(rel) && !(asIndexDir && locPaths.has(asIndexDir))) {
      err(p, 'not listed in sitemap.xml');
    }
  }
} else {
  warnings.push('sitemap.xml missing — skipped Gate 8 sitemap-coverage check (Gate 4 already reports this)');
}

// Practical proxy for "linked from the footer": reachable from the homepage
// via SOME internal link (nav, footer, or in-content), so an orphaned page
// (added to disk but never linked anywhere) is caught without depending on
// exact footer markup.
const indexFile = join(SITE_ROOT, 'index.html');
if (existsSync(indexFile)) {
  const reachable = new Set([indexFile]);
  const queue = [indexFile];
  while (queue.length) {
    const current = queue.pop();
    const html = readHtmlCached(current);
    const refRe = /(?:href|src)=["']([^"']+)["']/gi;
    let m;
    while ((m = refRe.exec(html))) {
      const target = resolveTarget(m[1], current);
      if (target && target.endsWith('.html') && existsSync(target) && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const p of pages) {
    const rel = relative(SITE_ROOT, p).replace(/\\/g, '/');
    if (REACHABILITY_EXEMPT.has(rel)) continue;
    if (!reachable.has(p)) warn(p, 'not reachable from index.html via any internal link (orphaned — not linked from nav/footer/content)');
  }
}

// --- Report ---
console.log(`Validated ${pages.length} HTML pages under ${SITE_ROOT}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('\nFAIL');
  process.exit(1);
}
console.log('\nOK - all gates passed');
