const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const EXPECTED_LABELS = [
  "Главная",
  "Сервисы",
  "Обучение",
  "Консультации",
  "Сообщество",
];

const PUBLIC_PAGES = [
  "index.html",
  "panchanga/index.html",
  "nabhasa/index.html",
  "sky-clock/index.html",
  "observations/index.html",
  "events/index.html",
  "events/india-tour-2026/index.html",
  "events/jyotish-practice-august-2026/index.html",
  "events/jyotish-weekend-september-2026/index.html",
  "events/moskva-konferentsiya-2026/index.html",
  "events/seminar-july-2026/index.html",
  "events/tajny-navamshi-spb-2026/index.html",
  "legal/privacy.html",
  "legal/personal-data.html",
  "legal/consent.html",
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function extractElement(html, tagName, startPattern) {
  const start = html.search(startPattern);
  assert.notEqual(start, -1, `Не найден <${tagName}> по шаблону ${startPattern}`);
  const end = html.indexOf(`</${tagName}>`, start);
  assert.notEqual(end, -1, `Не найдено закрытие </${tagName}>`);
  return html.slice(start, end + tagName.length + 3);
}

function linkLabels(html) {
  return [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function headerMenus(html) {
  const header = extractElement(
    html,
    "header",
    /<header\b[^>]*class="[^"]*(?:site-header|tour-header|legal-header)[^"]*"/i,
  );
  return [...header.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi)].map(
    (match) => match[0],
  );
}

function footerNavigation(html) {
  const footer = extractElement(
    html,
    "footer",
    /<footer\b[^>]*class="[^"]*global-footer[^"]*"/i,
  );
  const navs = [...footer.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi)];
  const navigation = navs.find((match) =>
    /<h2>\s*Навигация\s*<\/h2>/i.test(match[0]),
  );
  assert.ok(navigation, "В футере не найден блок «Навигация»");
  return navigation[0];
}

for (const page of PUBLIC_PAGES) {
  test(`${page}: шапка использует единые пять пунктов`, () => {
    const menus = headerMenus(read(page));
    assert.ok(menus.length >= 1, "В шапке отсутствует меню");
    for (const menu of menus) {
      assert.deepEqual(linkLabels(menu), EXPECTED_LABELS);
    }
  });

  test(`${page}: навигация футера использует единые пять пунктов`, () => {
    assert.deepEqual(linkLabels(footerNavigation(read(page))), EXPECTED_LABELS);
  });
}
