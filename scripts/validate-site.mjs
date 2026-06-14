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

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(SITE_ROOT, file) || '.'}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(SITE_ROOT, file) || '.'}: ${msg}`);

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

function validateHtml(file) {
  const html = readFileSync(file, 'utf8');
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
}

// --- Gate 4: SEO essentials at root ---
for (const f of REQUIRED_ROOT_FILES) {
  if (!existsSync(join(SITE_ROOT, f))) errors.push(`${f}: required root file is missing`);
}

const pages = collectHtml(SITE_ROOT);
for (const p of pages) validateHtml(p);

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
