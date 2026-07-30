"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const observationsHtml = fs.readFileSync(path.join(root, "observations/index.html"), "utf8");
const observationsCss = fs.readFileSync(path.join(root, "assets/css/observations.css"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");

function count(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

test("canonical observations route has shared shell and complete SEO metadata", () => {
  assert.match(observationsHtml, /<title>База наблюдений по Джйотиш — vedascope<\/title>/);
  assert.match(observationsHtml, /name="description"[\s\S]*База наблюдений VedaScope готовится/);
  assert.match(observationsHtml, /rel="canonical" href="https:\/\/vedascope\.ru\/observations\/"/);
  assert.match(observationsHtml, /property="og:url" content="https:\/\/vedascope\.ru\/observations\/"/);
  assert.match(observationsHtml, /property="og:title" content="База наблюдений по Джйотиш — vedascope"/);
  assert.match(observationsHtml, /property="og:description"/);
  assert.match(observationsHtml, /href="\/assets\/css\/style\.css/);
  assert.match(observationsHtml, /href="\/assets\/css\/footer\.css/);
  assert.match(observationsHtml, /href="\/assets\/css\/observations\.css/);
  assert.match(observationsHtml, /<header class="site-header observations-header"/);
  assert.match(observationsHtml, /<footer class="global-footer"/);
  assert.equal(count(observationsHtml, /<h1\b/g), 1);
  assert.match(observationsHtml, /<h1[^>]*>База наблюдений<br><span>vedascope<\/span><\/h1>/);
  assert.match(observationsHtml, /"@type": "CollectionPage"/);
  assert.match(observationsHtml, /"@type": "BreadcrumbList"/);
  assert.doesNotMatch(observationsHtml, /noindex|localhost|127\.0\.0\.1/);
});

test("existing home observation feature is the single semantic link to the new route", () => {
  const featureStart = homeHtml.indexOf('<a class="observation-feature"');
  assert.notEqual(featureStart, -1);
  const featureEnd = homeHtml.indexOf("</a>", featureStart);
  assert.notEqual(featureEnd, -1);
  const feature = homeHtml.slice(featureStart, featureEnd + 4);

  assert.match(feature, /href="\/observations\/"/);
  assert.match(feature, /База наблюдений vedascope/);
  assert.match(feature, /Перейти к базе/);
  assert.equal(count(feature, /<a\b/g), 1, "внутри кликабельной карточки не должно быть вложенной ссылки");
  assert.equal(count(homeHtml, /<a class="observation-feature"/g), 1);
  assert.equal(count(homeHtml, />База наблюдений vedascope</g), 1);
  assert.match(
    observationsCss + fs.readFileSync(path.join(root, "assets/css/style.css"), "utf8"),
    /\.observation-feature:focus-visible[\s\S]*outline/
  );
});

test("desktop and mobile navigation use the same five primary sections", () => {
  const desktopNav = observationsHtml.match(
    /<nav class="header-nav observations-desktop-nav"[\s\S]*?<\/nav>/
  )?.[0] || "";
  const mobileNav = observationsHtml.match(
    /<nav aria-label="Разделы для мобильных устройств">[\s\S]*?<\/nav>/
  )?.[0] || "";
  const expectedLabels = ["Главная", "Сервисы", "Обучение", "Консультации", "Сообщество"];

  assert.equal(count(desktopNav, /<a\b/g), 5);
  assert.equal(count(mobileNav, /<a\b/g), 5);
  expectedLabels.forEach((label) => {
    assert.equal(count(desktopNav, new RegExp(`>${label}<`, "g")), 1);
    assert.equal(count(mobileNav, new RegExp(`>${label}<`, "g")), 1);
  });
  assert.doesNotMatch(desktopNav + mobileNav, /Панчанга|Nabhasa|База наблюдений/);
  assert.match(observationsHtml, /<details class="observations-mobile-menu">/);
});

test("page is a compact and honest empty state without invented observations", () => {
  assert.match(observationsHtml, /href="#what-will-appear">Что появится в базе ↓<\/a>/);
  assert.match(observationsHtml, /href="\/#academy">Вернуться к разделу «Обучение» ↑<\/a>/);
  assert.equal(count(observationsHtml, /class="observations-future-list"/g), 1);
  assert.equal(count(observationsHtml, /<li>\s*<span>0[1-3]<\/span>/g), 3);
  assert.match(observationsHtml, /БАЗА НАПОЛНЯЕТСЯ/);
  assert.match(observationsHtml, /Публикаций пока нет/);
  assert.match(observationsHtml, /Первый материал появится только после проверки/);
  assert.doesNotMatch(observationsHtml, /data-observation-filter|data-observation-search|Добавить наблюдение/);
  assert.doesNotMatch(observationsHtml, /Открыть наблюдение|Читать наблюдение|Опубликовано/);
  assert.equal(count(observationsHtml, /<section\b/g), 2);
  const main = observationsHtml.match(/<main>([\s\S]*?)<\/main>/)?.[1] || "";
  assert.doesNotMatch(main, /<img\b/);
});

test("graphics, typography and responsive styles reuse the public design system", () => {
  assert.match(observationsHtml, /family=Inter:wght@400;500;600;700&family=Literata/);
  assert.equal(count(observationsHtml, /fonts\.googleapis\.com\/css2/g), 1);
  assert.doesNotMatch(observationsCss, /@font-face/);
  const fontFamilies = Array.from(
    observationsCss.matchAll(/font-family:\s*([^;]+);/g),
    (match) => match[1].trim()
  );
  assert.ok(
    fontFamilies.every((family) => /^(Literata|Inter|inherit)\b/.test(family)),
    `unexpected font family: ${fontFamilies.join(", ")}`
  );
  ["--paper", "--ivory", "--ink", "--ink-soft", "--teal", "--gold", "--line", "--shadow", "--radius"]
    .forEach((token) => assert.match(observationsCss, new RegExp(`var\\(${token}\\)`)));
  assert.match(observationsHtml, /class="observations-hero-visual" aria-hidden="true"/);
  assert.match(observationsHtml, /focusable="false"/);
  assert.match(observationsCss, /@media \(max-width: 959px\)/);
  assert.match(observationsCss, /@media \(max-width: 819px\)/);
  assert.match(observationsCss, /@media \(max-width: 679px\)/);
  assert.match(observationsCss, /@media \(max-width: 519px\)/);
  assert.match(observationsCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(observationsCss, /\.observations-page\s*\{[\s\S]*overflow-x:\s*hidden/);
});

test("sitemap and robots expose the canonical production route", () => {
  assert.equal(count(sitemap, /https:\/\/vedascope\.ru\/observations\//g), 1);
  assert.doesNotMatch(sitemap, /https:\/\/vedascope\.ru\/observations\/[^<]/);
  assert.match(robots, /^User-agent: \*\nAllow: \//);
  assert.match(robots, /Sitemap: https:\/\/vedascope\.ru\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow:\s*\/|noindex/);
});
