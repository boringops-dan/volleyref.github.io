#!/usr/bin/env node
/**
 * Translated legal pages, generated from the English book of record.
 *
 * English `terms.html`, `privacy.html` and `delete-account.html` are
 * hand-written and are the only legally binding versions. Each translation
 * lives in `_legal/<locale>/<page>` as a front-matter comment plus the
 * translated `.legal-prose` body, and records the fingerprint of the English
 * text it was translated from (`source-sha`). Everything else on a translated
 * page (head, nav, footer, scripts) is derived from the English page, so the
 * two can only differ in the translated words.
 *
 * A translation whose `source-sha` no longer matches the English page is an
 * error, in both write and check mode: changing English copy forces every
 * translation to be redone before the site can deploy. The fingerprint is
 * printed in the error so the retranslation can record it.
 *
 * The generator also owns two marked regions of each English page (the
 * hreflang alternates in <head> and the language switcher under the title)
 * and `terms.txt`, the plain-text mirror of English `terms.html` pasted into
 * App Store Connect's Custom License Agreement field.
 *
 * `_legal/` is underscore-prefixed so Jekyll never publishes it, and it is
 * skipped by validate-site.mjs, which calls `checkLegalTranslations` as a
 * gate so a stale or hand-edited output fails the deploy.
 *
 * This file is identical (byte-for-byte, intentionally) across
 * beachtennisref.github.io and volleyref.github.io. If you edit it, mirror
 * the change into the sibling repo.
 *
 * Usage:  node scripts/legal-translations.mjs            (write outputs)
 *         node scripts/legal-translations.mjs --check    (exit 1 on drift)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEGAL_PAGES = ['terms.html', 'privacy.html', 'delete-account.html'];
export const SOURCE_DIR = '_legal';

const ENGLISH = { lang: 'en', autonym: 'English', languageNavLabel: 'Language' };
const ALTERNATES = ['<!-- legal-i18n:alternates -->', '<!-- /legal-i18n:alternates -->'];
const LANGUAGES = ['<!-- legal-i18n:languages -->', '<!-- /legal-i18n:languages -->'];
const FRONT_MATTER_KEYS = ['source-sha', 'title', 'description', 'social-description', 'breadcrumb', 'label', 'h1', 'updated'];

class LegalError extends Error {}

function fail(message) {
  throw new LegalError(message);
}

/** Replace the single match of `re` (which must match exactly once). */
function replaceOnce(html, re, replacement, what) {
  const matches = html.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`));
  if (!matches || matches.length !== 1) fail(`${what}: expected exactly one match, found ${matches ? matches.length : 0}`);
  return html.replace(re, replacement);
}

function escapeAttr(text) {
  return text.replace(/&(?!#?\w+;)/g, '&amp;').replace(/"/g, '&quot;');
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** The `.legal-prose` block: [start of inner content, end of inner content]. */
function legalProseBounds(html, file) {
  const open = html.match(/<div class="legal-prose">/g);
  if (!open || open.length !== 1) fail(`${file}: expected exactly one <div class="legal-prose">`);
  const start = html.indexOf('<div class="legal-prose">') + '<div class="legal-prose">'.length;
  const end = html.indexOf('</div>', start);
  if (end < 0) fail(`${file}: unterminated .legal-prose`);
  if (html.slice(start, end).includes('<div')) fail(`${file}: .legal-prose must not contain nested <div>s`);
  return [start, end];
}

function sectionHeader(html, file) {
  const m = html.match(/<div class="section-header">([\s\S]*?)<\/div>/);
  if (!m) fail(`${file}: missing .section-header`);
  return m[1];
}

/**
 * Fingerprint of the English legal text a translation must reproduce: the
 * title, the "Last updated" line, and the `.legal-prose` body, with
 * whitespace collapsed so reindenting the English page is not a change.
 */
export function legalSourceSha(englishHtml, file = 'English page') {
  const header = sectionHeader(englishHtml, file);
  const h1 = (header.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1];
  if (h1 === undefined) fail(`${file}: missing <h1> in .section-header`);
  const updated = (header.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '';
  const [start, end] = legalProseBounds(englishHtml, file);
  const text = [h1, updated, englishHtml.slice(start, end)].map(collapse).join('\n');
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** Parse `_legal/<locale>/<page>`: a leading `<!-- key: value -->` block, then the body. */
export function parseSource(text, file) {
  const m = text.match(/^\s*<!--([\s\S]*?)-->\s*\n([\s\S]*)$/);
  if (!m) fail(`${file}: must start with a <!-- front matter --> comment`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const kv = line.match(/^\s*([a-z0-9-]+):\s*(.*?)\s*$/);
    if (!kv) fail(`${file}: unparseable front-matter line "${line.trim()}"`);
    if (!FRONT_MATTER_KEYS.includes(kv[1])) fail(`${file}: unknown front-matter key "${kv[1]}"`);
    meta[kv[1]] = kv[2];
  }
  for (const key of ['source-sha', 'title', 'description', 'breadcrumb', 'label', 'h1']) {
    if (!meta[key]) fail(`${file}: missing front-matter key "${key}"`);
  }
  return { meta, body: m[2].replace(/\s+$/, '') };
}

function loadSite(root) {
  const cnamePath = join(root, 'CNAME');
  if (!existsSync(cnamePath)) fail('CNAME is missing; the site origin is derived from it');
  const origin = `https://${readFileSync(cnamePath, 'utf8').trim()}`;
  const sourceRoot = join(root, SOURCE_DIR);
  const locales = existsSync(sourceRoot)
    ? readdirSync(sourceRoot).filter((d) => statSync(join(sourceRoot, d)).isDirectory()).sort()
    : [];
  return {
    origin,
    locales: locales.map((dir) => {
      const chromePath = join(sourceRoot, dir, 'chrome.json');
      if (!existsSync(chromePath)) fail(`${SOURCE_DIR}/${dir}/chrome.json is missing`);
      const chrome = JSON.parse(readFileSync(chromePath, 'utf8'));
      for (const key of ['lang', 'ogLocale', 'autonym', 'languageNavLabel', 'notice', 'noticeLink', 'strings', 'keep']) {
        if (chrome[key] === undefined) fail(`${SOURCE_DIR}/${dir}/chrome.json: missing "${key}"`);
      }
      return { dir, ...chrome };
    }),
  };
}

function pageUrl(locale, page) {
  return locale ? `/${locale.dir}/${page}` : `/${page}`;
}

function alternatesBlock(site, page) {
  const lines = [`<link rel="alternate" hreflang="en" href="${site.origin}${pageUrl(null, page)}">`];
  for (const l of site.locales) lines.push(`<link rel="alternate" hreflang="${l.lang}" href="${site.origin}${pageUrl(l, page)}">`);
  lines.push(`<link rel="alternate" hreflang="x-default" href="${site.origin}${pageUrl(null, page)}">`);
  return lines.map((l) => `  ${l}`).join('\n');
}

function languagesBlock(site, page, current) {
  const label = current ? current.languageNavLabel : ENGLISH.languageNavLabel;
  const entries = [null, ...site.locales].map((l) => {
    const lang = l ? l.lang : ENGLISH.lang;
    const name = l ? l.autonym : ENGLISH.autonym;
    const here = l === current ? ' aria-current="page"' : '';
    return `          <a href="${pageUrl(l, page)}" hreflang="${lang}" lang="${lang}"${here}>${name}</a>`;
  });
  return `        <nav class="legal-languages" aria-label="${label}">\n${entries.join('\n')}\n        </nav>`;
}

function fillRegion(html, [open, close], content, what) {
  const re = new RegExp(`${open}[\\s\\S]*?${close}`);
  return replaceOnce(html, re, () => `${open}\n${content}\n${indentOf(html, open)}${close}`, what);
}

function indentOf(html, marker) {
  const at = html.indexOf(marker);
  const lineStart = html.lastIndexOf('\n', at) + 1;
  return html.slice(lineStart, at);
}

/** English page with its generator-owned regions filled. */
export function renderEnglish(site, page, html) {
  let out = fillRegion(html, ALTERNATES, alternatesBlock(site, page), `${page}: alternates region`);
  out = fillRegion(out, LANGUAGES, languagesBlock(site, page, null), `${page}: languages region`);
  return out;
}

/**
 * Translate the page chrome (nav, breadcrumb, footer): every text node and
 * aria-label must be either in `strings` or listed in `keep`, so an English
 * chrome change cannot silently ship untranslated.
 */
function translateChrome(region, locale, used, where) {
  const replaceText = (text) => {
    const trimmed = text.trim();
    if (!/[A-Za-z]/.test(trimmed)) return text;
    if (Object.hasOwn(locale.strings, trimmed)) {
      used.add(trimmed);
      return text.replace(trimmed, locale.strings[trimmed]);
    }
    if (locale.keep.includes(trimmed)) return text;
    fail(`${SOURCE_DIR}/${locale.dir}/chrome.json: no translation for "${trimmed}" (${where}); add it to "strings", or to "keep" if it stays as is`);
  };
  return region
    .replace(/aria-label="([^"]*)"/g, (_, v) => `aria-label="${replaceText(v)}"`)
    .replace(/>([^<>]+)</g, (_, t) => `>${replaceText(t)}<`);
}

function setContent(html, selector, value, page) {
  const re = new RegExp(`(<meta ${selector} content=")[^"]*(")`);
  return replaceOnce(html, re, (_, a, b) => `${a}${value}${b}`, `${page}: <meta ${selector}>`);
}

function translateMeta(html, locale, used, name) {
  const re = new RegExp(`(<meta (?:name|property)="${name}" content=")([^"]*)(")`);
  return replaceOnce(html, re, (_, a, v, b) => {
    if (!Object.hasOwn(locale.strings, v)) fail(`${SOURCE_DIR}/${locale.dir}/chrome.json: no translation for "${v}" (${name})`);
    used.add(v);
    return `${a}${escapeAttr(locale.strings[v])}${b}`;
  }, `${name} meta`);
}

function localizeBreadcrumbLd(html, site, locale, page, meta, used) {
  const re = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g;
  let found = 0;
  const out = html.replace(re, (whole, open, json, close) => {
    const data = JSON.parse(json);
    if (data['@type'] !== 'BreadcrumbList') return whole;
    found += 1;
    for (const item of data.itemListElement) {
      if (item.item === `${site.origin}/${page}`) {
        item.name = meta.breadcrumb;
        item.item = `${site.origin}${pageUrl(locale, page)}`;
      } else {
        if (!Object.hasOwn(locale.strings, item.name)) fail(`${SOURCE_DIR}/${locale.dir}/chrome.json: no translation for "${item.name}" (breadcrumb JSON-LD)`);
        used.add(item.name);
        item.name = locale.strings[item.name];
      }
    }
    const body = JSON.stringify(data, null, 2).split('\n').map((l) => `  ${l}`).join('\n');
    return `${open}\n${body}\n  ${close}`;
  });
  if (found !== 1) fail(`${page}: expected one BreadcrumbList JSON-LD block, found ${found}`);
  return out;
}

/** A translated page: the English page with every English word replaced. */
export function renderTranslation(site, locale, page, englishHtml, source, used) {
  const { meta, body } = source;
  const where = `${SOURCE_DIR}/${locale.dir}/${page}`;
  const expected = legalSourceSha(englishHtml, page);
  if (meta['source-sha'] !== expected) {
    fail(`${where} was translated from a different English ${page} (source-sha ${meta['source-sha']}, English is now ${expected}). English is the book of record: retranslate the changed English text, then set source-sha: ${expected}`);
  }
  const url = `${site.origin}${pageUrl(locale, page)}`;
  const description = escapeAttr(meta.description);
  const social = escapeAttr(meta['social-description'] || meta.description);
  const title = escapeAttr(meta.title);

  let html = renderEnglish(site, page, englishHtml);
  const bodyStart = html.indexOf('<body>');
  const mainStart = html.indexOf('<main>');
  const mainEnd = html.indexOf('</main>');
  if (bodyStart < 0 || mainStart < 0 || mainEnd < 0) fail(`${page}: missing <body> or <main>`);

  let head = html.slice(0, bodyStart);
  head = replaceOnce(head, /<html lang="en">/, () => `<html lang="${locale.lang}">`, `${page}: <html lang="en">`);
  head = replaceOnce(head, /<title>[^<]*<\/title>/, () => `<title>${title}</title>`, `${page}: <title>`);
  head = setContent(head, 'name="description"', description, page);
  head = head.replace(/\n\s*<meta name="keywords" content="[^"]*">/, '');
  head = replaceOnce(head, /(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => `${a}${url}${b}`, `${page}: canonical`);
  head = setContent(head, 'property="og:title"', title, page);
  head = setContent(head, 'property="og:description"', social, page);
  head = setContent(head, 'property="og:url"', url, page);
  head = setContent(head, 'property="og:locale"', locale.ogLocale, page);
  head = setContent(head, 'name="twitter:title"', title, page);
  head = setContent(head, 'name="twitter:description"', social, page);
  head = translateMeta(head, locale, used, 'og:image:alt');
  head = translateMeta(head, locale, used, 'twitter:image:alt');
  head = localizeBreadcrumbLd(head, site, locale, page, meta, used);

  let main = html.slice(mainStart, mainEnd);
  // The current crumb is the page title, set from front matter after the
  // rest of the breadcrumb goes through the chrome strings.
  main = replaceOnce(main, /(<li aria-current="page">)[^<]*(<\/li>)/, (_, a, b) => `${a}${b}`, `${page}: current breadcrumb`);
  main = main.replace(/<nav class="breadcrumb"[\s\S]*?<\/nav>/, (nav) => translateChrome(nav, locale, used, 'breadcrumb'));
  main = main.replace(/(<li aria-current="page">)(<\/li>)/, (_, a, b) => `${a}${meta.breadcrumb}${b}`);
  main = replaceOnce(main, /(<span class="section-label">)[^<]*(<\/span>)/, (_, a, b) => `${a}${meta.label}${b}`, `${page}: section label`);
  main = replaceOnce(main, /(<h1>)[\s\S]*?(<\/h1>)/, (_, a, b) => `${a}${meta.h1}${b}`, `${page}: <h1>`);
  const englishUpdated = /<\/h1>\s*<p>[^<]*<\/p>/.test(main);
  if (englishUpdated !== Boolean(meta.updated)) {
    fail(`${where}: "updated" must be set exactly when the English page has a "Last updated" line`);
  }
  if (englishUpdated) main = main.replace(/(<\/h1>\s*<p>)[^<]*(<\/p>)/, (_, a, b) => `${a}${meta.updated}${b}`);
  main = fillRegion(main, LANGUAGES, languagesBlock(site, page, locale), `${page}: languages region`);
  const [proseStart, proseEnd] = legalProseBounds(main, page);
  const notice = `        <p class="legal-notice" role="note">${locale.notice} <a href="${pageUrl(null, page)}" hreflang="en">${locale.noticeLink}</a></p>`;
  main = `${main.slice(0, proseStart)}\n${notice}\n\n${body}\n      ${main.slice(proseEnd)}`;

  // Chrome links to legal pages stay in the reader's language; the switcher
  // and the notice are the deliberate ways back to English.
  const localizeLegalLinks = (region) =>
    region.replace(/href="\/([a-z-]+\.html)"/g, (whole, target) => (LEGAL_PAGES.includes(target) ? `href="${pageUrl(locale, target)}"` : whole));
  const nav = localizeLegalLinks(translateChrome(html.slice(bodyStart, mainStart), locale, used, 'nav'));
  const footer = localizeLegalLinks(translateChrome(html.slice(mainEnd), locale, used, 'footer'));
  html = `${head}${nav}${main}${footer}`;

  // Relative asset/link paths in the English page would break one directory down.
  return html.replace(/((?:href|src)=")(?!\/|[a-z]+:|#)/g, '$1/');
}

function plainText(html) {
  return collapse(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&'),
  );
}

/**
 * `terms.txt`: title and "Last updated" line, then each section as its
 * heading line followed by blank-line-separated blocks; list items are one
 * line each.
 */
export function renderTermsTxt(englishTermsHtml) {
  const header = sectionHeader(englishTermsHtml, 'terms.html');
  const lines = [plainText(header.match(/<h1>([\s\S]*?)<\/h1>/)[1])];
  const updated = header.match(/<p>([\s\S]*?)<\/p>/);
  if (updated) lines.push(plainText(updated[1]));
  const [start, end] = legalProseBounds(englishTermsHtml, 'terms.html');
  const sections = [];
  const blockRe = /<(h2|p|ul|ol)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRe.exec(englishTermsHtml.slice(start, end)))) {
    const [, tag, inner] = m;
    if (tag === 'h2') {
      sections.push({ heading: plainText(inner), blocks: [] });
      continue;
    }
    if (!sections.length) fail('terms.html: .legal-prose must open with an <h2>');
    const block = tag === 'p' ? plainText(inner) : [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => plainText(li[1])).join('\n');
    sections.at(-1).blocks.push(block);
  }
  return `${lines.join('\n')}\n\n${sections.map((s) => `${s.heading}\n${s.blocks.join('\n\n')}`).join('\n\n')}\n`;
}

/** Every generated file as { path, html }, English pages included. */
export function renderLegalTranslations(root) {
  const site = loadSite(root);
  const outputs = [];
  const usedByLocale = new Map(site.locales.map((l) => [l.dir, new Set()]));
  for (const page of LEGAL_PAGES) {
    const englishPath = join(root, page);
    if (!existsSync(englishPath)) fail(`${page} is missing`);
    const english = readFileSync(englishPath, 'utf8');
    outputs.push({ path: page, html: renderEnglish(site, page, english) });
    if (page === 'terms.html') outputs.push({ path: 'terms.txt', html: renderTermsTxt(english) });
    for (const locale of site.locales) {
      const sourcePath = join(root, SOURCE_DIR, locale.dir, page);
      if (!existsSync(sourcePath)) fail(`${SOURCE_DIR}/${locale.dir}/${page} is missing: every locale translates every legal page`);
      const source = parseSource(readFileSync(sourcePath, 'utf8'), `${SOURCE_DIR}/${locale.dir}/${page}`);
      const html = renderTranslation(site, locale, page, english, source, usedByLocale.get(locale.dir));
      outputs.push({ path: `${locale.dir}/${page}`, html });
    }
  }
  for (const locale of site.locales) {
    const used = usedByLocale.get(locale.dir);
    const stale = Object.keys(locale.strings).filter((k) => !used.has(k));
    if (stale.length) fail(`${SOURCE_DIR}/${locale.dir}/chrome.json: unused strings (the English chrome no longer has them): ${stale.map((s) => `"${s}"`).join(', ')}`);
  }
  return outputs;
}

/** Validator entry point: a list of error strings, empty when everything is current. */
export function checkLegalTranslations(root) {
  let outputs;
  try {
    outputs = renderLegalTranslations(root);
  } catch (e) {
    if (e instanceof LegalError) return [e.message];
    throw e;
  }
  return outputs
    .filter(({ path, html }) => !existsSync(join(root, path)) || readFileSync(join(root, path), 'utf8') !== html)
    .map(({ path }) => `${path}: out of date with the English legal pages and ${SOURCE_DIR}/; run node scripts/legal-translations.mjs`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const errors = checkLegalTranslations(root);
    for (const e of errors) console.error(`x ${e}`);
    process.exit(errors.length ? 1 : 0);
  }
  try {
    for (const { path, html } of renderLegalTranslations(root)) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      if (!existsSync(target) || readFileSync(target, 'utf8') !== html) {
        writeFileSync(target, html);
        console.log(`wrote ${path}`);
      }
    }
  } catch (e) {
    if (!(e instanceof LegalError)) throw e;
    console.error(`x ${e.message}`);
    process.exit(1);
  }
}
