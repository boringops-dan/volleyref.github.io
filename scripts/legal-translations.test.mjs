// node --test scripts/legal-translations.test.mjs
//
// Identical (byte-for-byte, intentionally) across beachtennisref.github.io
// and volleyref.github.io, like the generator it tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEGAL_PAGES,
  SOURCE_DIR,
  checkLegalTranslations,
  legalSourceSha,
  renderLegalTranslations,
} from './legal-translations.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['es', 'pt'];

/** A throwaway copy of just the files the generator reads and writes. */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'legal-i18n-'));
  for (const f of ['CNAME', 'terms.txt', ...LEGAL_PAGES, SOURCE_DIR, ...LOCALES]) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
  return dir;
}

function edit(dir, file, fn) {
  const path = join(dir, file);
  writeFileSync(path, fn(readFileSync(path, 'utf8')));
}

function withFixture(fn) {
  const dir = fixture();
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the committed translations and generated pages are current', () => {
  assert.deepEqual(checkLegalTranslations(ROOT), []);
});

test('changing English legal text fails every translation of that page until it is retranslated', () => {
  withFixture((dir) => {
    edit(dir, 'privacy.html', (h) => h.replace('We respect your privacy', 'We deeply respect your privacy'));
    const newSha = legalSourceSha(readFileSync(join(dir, 'privacy.html'), 'utf8'));
    const [error] = checkLegalTranslations(dir);
    assert.match(error, /_legal\/es\/privacy\.html was translated from a different English privacy\.html/);
    assert.match(error, new RegExp(`set source-sha: ${newSha}`));
  });
});

test('changing the English "Last updated" line also counts as an English change', () => {
  withFixture((dir) => {
    edit(dir, 'terms.html', (h) => h.replace(/Last updated: [^<]+/, 'Last updated: October 2026'));
    assert.match(checkLegalTranslations(dir)[0], /_legal\/es\/terms\.html was translated from a different English terms\.html/);
  });
});

test('reindenting the English page is not a content change', () => {
  const html = readFileSync(join(ROOT, 'terms.html'), 'utf8');
  const reindented = html.replace(/\n {8}</g, '\n\t\t<');
  assert.notEqual(reindented, html);
  assert.equal(legalSourceSha(reindented), legalSourceSha(html));
});

test('an English edit to the account-deletion steps names the translation to redo', () => {
  withFixture((dir) => {
    edit(dir, 'delete-account.html', (h) => h.replace('Confirm the deletion when prompted.', 'Confirm the deletion.'));
    const errors = checkLegalTranslations(dir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /retranslate the changed English text/);
    assert.match(errors[0], /_legal\/es\/delete-account\.html/);
  });
});

test('a new English nav or footer label without a translation fails loudly', () => {
  withFixture((dir) => {
    for (const page of LEGAL_PAGES) {
      edit(dir, page, (h) => h.replace('<li><a href="/privacy.html">Privacy Policy</a></li>', '<li><a href="/privacy.html">Privacy Policy</a></li>\n            <li><a href="/cookies.html">Cookie Settings</a></li>'));
    }
    assert.match(checkLegalTranslations(dir)[0], /_legal\/es\/chrome\.json: no translation for "Cookie Settings" \(footer\)/);
  });
});

test('a chrome string the English page no longer uses fails as stale', () => {
  withFixture((dir) => {
    edit(dir, `${SOURCE_DIR}/pt/chrome.json`, (j) => {
      const chrome = JSON.parse(j);
      chrome.strings['Old Footer Link'] = 'Link antigo';
      return JSON.stringify(chrome, null, 2);
    });
    assert.match(checkLegalTranslations(dir)[0], /_legal\/pt\/chrome\.json: unused strings .*"Old Footer Link"/);
  });
});

test('a hand edit to a generated page is reported as out of date', () => {
  withFixture((dir) => {
    edit(dir, 'es/terms.html', (h) => h.replace('Aceptación de los términos', 'Aceptación'));
    assert.deepEqual(checkLegalTranslations(dir), ['es/terms.html: out of date with the English legal pages and _legal/; run node scripts/legal-translations.mjs']);
  });
});

test('terms.txt, the App Store Connect EULA text, must match terms.html', () => {
  withFixture((dir) => {
    edit(dir, 'terms.txt', (t) => t.replace('Governing Law', 'Governing law'));
    assert.deepEqual(checkLegalTranslations(dir), ['terms.txt: out of date with the English legal pages and _legal/; run node scripts/legal-translations.mjs']);
  });
});

test('every locale must translate every legal page', () => {
  withFixture((dir) => {
    rmSync(join(dir, SOURCE_DIR, 'pt', 'delete-account.html'));
    assert.match(checkLegalTranslations(dir)[0], /_legal\/pt\/delete-account\.html is missing/);
  });
});

test('translated pages carry the notice, a reciprocal switcher and hreflang alternates, and root-absolute paths', () => {
  const outputs = new Map(renderLegalTranslations(ROOT).map((o) => [o.path, o.html]));
  const origin = `https://${readFileSync(join(ROOT, 'CNAME'), 'utf8').trim()}`;
  for (const page of LEGAL_PAGES) {
    for (const path of [page, ...LOCALES.map((l) => `${l}/${page}`)]) {
      const html = outputs.get(path);
      assert.ok(html, `${path} is generated`);
      for (const target of [page, ...LOCALES.map((l) => `${l}/${page}`)]) {
        assert.ok(html.includes(`<link rel="alternate" hreflang=`) && html.includes(`href="${origin}/${target}"`), `${path} lists alternate ${target}`);
        assert.ok(html.includes(`<a href="/${target}" hreflang=`), `${path} switcher links ${target}`);
      }
      assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${origin}/${page}">`), `${path} x-default is English`);
      assert.equal((html.match(/aria-current="page">(English|Español|Português)</g) || []).length, 1, `${path} marks exactly one current language`);
    }
    for (const locale of LOCALES) {
      const html = outputs.get(`${locale}/${page}`);
      assert.match(html, /<p class="legal-notice" role="note">[^<]+<a href="\/[a-z-]+\.html" hreflang="en">/, `${locale}/${page} notice links the English version`);
      assert.match(html, new RegExp(`<link rel="canonical" href="${origin}/${locale}/${page}">`));
      assert.doesNotMatch(html, /<html lang="en">/);
      assert.doesNotMatch(html, /(?:href|src)="(?!\/|[a-z]+:|#)/, `${locale}/${page} has no relative paths, which would resolve inside /${locale}/`);
      for (const legal of LEGAL_PAGES) {
        assert.ok(!html.slice(html.indexOf('</main>')).includes(`href="/${legal}"`), `${locale}/${page} footer keeps ${legal} in ${locale}`);
      }
    }
  }
});

test('writing the rendered outputs makes the check pass', () => {
  withFixture((dir) => {
    rmSync(join(dir, 'es'), { recursive: true });
    edit(dir, 'terms.txt', () => '');
    assert.ok(checkLegalTranslations(dir).some((e) => e.startsWith('es/terms.html:')));
    for (const { path, html } of renderLegalTranslations(dir)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), html);
    }
    assert.deepEqual(checkLegalTranslations(dir), []);
  });
});
