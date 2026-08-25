#!/usr/bin/env node
/**
 * WCAG AA contrast gate for the static site.
 *
 * Renders each page in headless Chrome, walks every element that owns a direct
 * text node, composites its color over the nearest opaque ancestor background,
 * and fails if the ratio is below the AA threshold for that size and weight.
 *
 * There is deliberately NO allowlist and NO baseline file. If this reports a
 * failure, fix the CSS. An exemption here would defeat the point of the gate.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Pages that between them exercise every page family the site ships.
const PAGES = [
  'index.html',
  'volleyball-scoring-rules.html',
  'volleyref-vs-iscore.html',
  'answers/index.html',
];

// Widths that exercise both the desktop and the stacked mobile layouts.
const WIDTHS = [1440, 390];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** Runs inside the page. Returns every text element that fails AA. */
function auditInPage() {
  const parse = (s) => {
    const m = (s || '').match(/[\d.]+/g);
    if (!m) return null;
    return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1];
  };
  const lum = (c) => {
    const f = c.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // The surface the text actually lands on: the nearest ancestor whose own
  // background is effectively opaque. Anything more translucent than this would
  // need real layer compositing, which no rule in this codebase relies on.
  const surfaceOf = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.95) return c;
    }
    const c = parse(getComputedStyle(document.documentElement).backgroundColor);
    return c && c[3] > 0.95 ? c : [255, 255, 255, 1];
  };
  // Compositing the text color over its surface is REQUIRED: treating
  // rgba(250,246,239,0.55) as opaque cream reports a passing ratio for text
  // that actually fails.
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const required = (size, weight) =>
    size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;

  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    return el.tagName.toLowerCase() + (cls ? '.' + cls.split(/\s+/).join('.') : '');
  };

  const seen = new Set();
  const fails = [];
  for (const el of document.querySelectorAll('body *')) {
    let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.textContent.trim();
    if (!text) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const size = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight || 400;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = surfaceOf(el);
    const r = ratio(over(fg, bg), bg);
    const need = required(size, weight);
    if (r >= need) continue;

    const key = describe(el) + '|' + cs.color + '|' + size + '|' + bg.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    fails.push({
      selector: describe(el).slice(0, 70),
      size: `${size}px/${weight}`,
      color: cs.color,
      on: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`,
      ratio: Math.round(r * 100) / 100,
      need,
      sample: text.slice(0, 42),
    });
  }
  return fails;
}

const { server, port } = await serve();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
let total = 0;

try {
  for (const page of PAGES) {
    for (const width of WIDTHS) {
      const tab = await browser.newPage();
      await tab.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await tab.goto(`http://127.0.0.1:${port}/${page}`, { waitUntil: 'load' });
      const fails = await tab.evaluate(auditInPage);
      await tab.close();
      if (!fails.length) continue;
      total += fails.length;
      console.log(`\n${page} @ ${width}px  ${fails.length} failure(s)`);
      for (const f of fails) {
        console.log(
          `  x ${f.ratio}:1 (needs ${f.need}) ${f.color} on ${f.on}  ${f.size}  ${f.selector}\n` +
          `      "${f.sample}"`,
        );
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (total) {
  console.log(`\nFAIL - ${total} contrast failure(s). Fix the CSS; do not add an exemption.`);
  process.exit(1);
}
console.log(`OK - all text passes WCAG AA on ${PAGES.length} pages x ${WIDTHS.length} widths`);
