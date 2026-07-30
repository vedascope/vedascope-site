import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GRAHAS, HOUSES, PUBLIC_NAV, SIGNS } from "../content/jyotish/base.mjs";
import { NAKSHATRAS } from "../content/jyotish/nakshatras.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_CATEGORY_COUNTS = Object.freeze({ grahas: 9, signs: 12, houses: 12, nakshatras: 27 });
const EXPECTED_SLUGS = Object.freeze({
  grahas: GRAHAS.map((item) => item.slug),
  signs: SIGNS.map((item) => item.slug),
  houses: HOUSES.map((item) => item.slug),
  nakshatras: NAKSHATRAS.map((item) => item.slug)
});

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function pagePaths() {
  const result = ["jyotish/index.html"];
  for (const [category, slugs] of Object.entries(EXPECTED_SLUGS)) {
    result.push(`jyotish/${category}/index.html`);
    slugs.forEach((slug) => result.push(`jyotish/${category}/${slug}/index.html`));
  }
  return result;
}

function extract(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : "";
}

function educationLinks(html) {
  return [...html.matchAll(/href="(\/jyotish\/[^"#?]*\/?)"/g)].map((match) => match[1]);
}

function routeToFile(route) {
  const relative = route.replace(/^\//, "");
  return path.join(ROOT, relative, route.endsWith("/") ? "index.html" : "");
}

function hashFiles(files) {
  const hash = crypto.createHash("sha256");
  files.forEach((file) => {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(ROOT, file)));
  });
  return hash.digest("hex");
}

test("1. generator creates exactly 65 static education pages", () => {
  assert.equal(pagePaths().length, 65);
  pagePaths().forEach((relativePath) => assert.ok(fs.existsSync(path.join(ROOT, relativePath)), relativePath));
});

test("2. category counts and exact route slugs match the specification", () => {
  for (const [category, count] of Object.entries(EXPECTED_CATEGORY_COUNTS)) {
    assert.equal(EXPECTED_SLUGS[category].length, count);
    const children = fs.readdirSync(path.join(ROOT, "jyotish", category), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(children, [...EXPECTED_SLUGS[category]].sort());
  }
});

test("3. every page has one H1, unique title, description and production canonical", () => {
  const titles = new Set();
  const descriptions = new Set();
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, relativePath);
    const title = extract(html, /<title>([^<]+)<\/title>/);
    const description = extract(html, /<meta name="description" content="([^"]+)">/);
    const canonical = extract(html, /<link rel="canonical" href="([^"]+)">/);
    assert.ok(title.length >= 30, relativePath);
    assert.ok(description.length >= 90, relativePath);
    assert.ok(canonical.startsWith("https://vedascope.ru/jyotish/"), relativePath);
    assert.ok(!titles.has(title), `duplicate title: ${title}`);
    assert.ok(!descriptions.has(description), `duplicate description: ${description}`);
    titles.add(title);
    descriptions.add(description);
  });
});

test("4. all pages expose valid WebPage, BreadcrumbList and FAQPage JSON-LD", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    const raw = extract(html, /<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    const data = JSON.parse(raw);
    const types = data["@graph"].map((item) => item["@type"]);
    assert.ok(types.includes("WebPage"), relativePath);
    assert.ok(types.includes("BreadcrumbList"), relativePath);
    assert.ok(types.includes("FAQPage"), relativePath);
  });
});

test("5. every page has visible breadcrumbs, sources and at least three FAQ answers", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    assert.match(html, /class="jyotish-breadcrumbs"/, relativePath);
    assert.match(html, /class="jyotish-section jyotish-sources"/, relativePath);
    assert.ok((html.match(/class="jyotish-faq__item"/g) || []).length >= 3, relativePath);
  });
});

test("6. every page has the three required separated CTA components", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    assert.equal((html.match(/class="education-cta /g) || []).length, 3, relativePath);
    assert.match(html, /Постройте свою натальную карту/);
    assert.match(html, /Рассчитать карту бесплатно/);
    assert.match(html, /Заказать консультацию/);
    assert.match(html, /Telegram/);
    assert.match(html, /VK/);
    assert.match(html, /YouTube/);
  });
});

test("7. desktop and mobile navigation contain exactly the same five public items", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    const desktop = extract(html, /<nav class="header-nav jyotish-desktop-nav"[^>]*>([\s\S]*?)<\/nav>/);
    const mobile = extract(html, /<nav aria-label="Разделы для мобильных устройств">([\s\S]*?)<\/nav>/);
    const labels = PUBLIC_NAV.map(([label]) => label);
    for (const section of [desktop, mobile]) {
      const found = [...section.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((match) => match[1]);
      assert.deepEqual(found, labels, relativePath);
    }
  });
});

test("8. homepage 'Что такое Джйотиш' card is a full link to the encyclopedia", () => {
  const html = read("index.html");
  assert.match(html, /<a class="academy-card" href="\/jyotish\/" aria-label="Открыть энциклопедию «Что такое Джйотиш»">[\s\S]*?<h3>Что такое Джйотиш<\/h3>[\s\S]*?<\/a>/);
});

test("9. sitemap contains all 65 education URLs and no anchors, queries or staging URLs", () => {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const education = urls.filter((url) => url.startsWith("https://vedascope.ru/jyotish/"));
  assert.equal(education.length, 65);
  assert.equal(new Set(education).size, 65);
  urls.forEach((url) => {
    assert.ok(!url.includes("#"));
    assert.ok(!url.includes("?"));
    assert.ok(!url.includes("staging"));
    assert.ok(!url.includes("localhost"));
  });
});

test("10. all 27 nakshatra pages include four complete padas and 108 exact anchors total", () => {
  let total = 0;
  for (const slug of EXPECTED_SLUGS.nakshatras) {
    const html = read(`jyotish/nakshatras/${slug}/index.html`);
    const anchors = [...html.matchAll(/<section class="jyotish-pada" id="pada-(\d)">/g)].map((match) => match[1]);
    assert.deepEqual(anchors, ["1", "2", "3", "4"], slug);
    assert.equal((html.match(/Традиционный звук/g) || []).length, 4, slug);
    assert.equal((html.match(/Навамша/g) || []).length >= 4, true, slug);
    total += anchors.length;
  }
  assert.equal(total, 108);
});

test("11. padas have exact degree ranges, navamsha rulers and non-placeholder prose", () => {
  for (const slug of EXPECTED_SLUGS.nakshatras) {
    const html = read(`jyotish/nakshatras/${slug}/index.html`);
    assert.equal((html.match(/3°20′/g) || []).length >= 1, true, slug);
    const padas = [...html.matchAll(/<section class="jyotish-pada"[\s\S]*?<\/section>/g)].map((match) => match[0]);
    assert.equal(padas.length, 4, slug);
    padas.forEach((pada) => assert.match(pada, /управитель навамши/, slug));
    assert.doesNotMatch(html, /TODO|TBD|(?:^|\s)скоро(?:\s|[.!?])|заполняется|рыба рыба/i, slug);
  }
});

test("12. every internal education link resolves to a generated page", () => {
  pagePaths().forEach((relativePath) => {
    educationLinks(read(relativePath)).forEach((route) => {
      assert.ok(fs.existsSync(routeToFile(route)), `${relativePath}: ${route}`);
    });
  });
});

test("13. entity pages provide previous/next navigation without broken targets", () => {
  pagePaths().filter((file) => file.split("/").length === 4).forEach((relativePath) => {
    const html = read(relativePath);
    assert.match(html, /class="jyotish-prev-next"/, relativePath);
    educationLinks(extract(html, /(<nav class="jyotish-prev-next"[\s\S]*?<\/nav>)/)).forEach((route) => {
      assert.ok(fs.existsSync(routeToFile(route)), `${relativePath}: ${route}`);
    });
  });
});

test("14. nonexistent entity routes are not generated and will return static 404", () => {
  assert.ok(!fs.existsSync(path.join(ROOT, "jyotish/grahas/pluto/index.html")));
  assert.ok(!fs.existsSync(path.join(ROOT, "jyotish/signs/aries/index.html")));
  assert.ok(!fs.existsSync(path.join(ROOT, "jyotish/nakshatras/abhijit/index.html")));
});

test("15. no page contains localhost, noindex or staging references", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1|noindex|account-staging/i, relativePath);
  });
});

test("16. page templates use one shared stylesheet, script and reusable components", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    assert.match(html, /\/assets\/css\/jyotish\.css/);
    assert.match(html, /\/assets\/js\/jyotish\.js/);
    assert.match(html, /class="jyotish-hero"/);
    assert.match(html, /class="jyotish-toc"/);
  });
});

test("17. mobile CSS includes 390px-safe stacking and no fixed content width", () => {
  const css = read("assets/css/jyotish.css");
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /width: calc\(100% - 18px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.doesNotMatch(css, /min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
});

test("18. SEO research and content audit artifacts exist", () => {
  for (const category of Object.keys(EXPECTED_CATEGORY_COUNTS)) {
    assert.ok(fs.existsSync(path.join(ROOT, `docs/seo/keywords-${category}.csv`)));
    assert.ok(fs.existsSync(path.join(ROOT, `docs/seo/map-${category}.md`)));
  }
  const audit = read("docs/content/education-content-audit.md");
  assert.match(audit, /Страниц: 65/);
  assert.match(audit, /Подробных описаний пад: 108/);
});

test("19. generator is deterministic across two consecutive builds", () => {
  const tracked = [
    ...pagePaths(),
    "index.html",
    "sitemap.xml",
    "docs/content/education-content-audit.md",
    ...Object.keys(EXPECTED_CATEGORY_COUNTS).flatMap((category) => [
      `docs/seo/keywords-${category}.csv`,
      `docs/seo/map-${category}.md`
    ])
  ];
  const before = hashFiles(tracked);
  const first = spawnSync(process.execPath, ["scripts/build-jyotish-pages.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  const middle = hashFiles(tracked);
  const second = spawnSync(process.execPath, ["scripts/build-jyotish-pages.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(second.status, 0, second.stderr);
  const after = hashFiles(tracked);
  assert.equal(before, middle);
  assert.equal(middle, after);
});

test("20. content has no unfinished markers and provides substantive page length", () => {
  pagePaths().forEach((relativePath) => {
    const html = read(relativePath);
    const plain = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.doesNotMatch(plain, /\bTODO\b|\bTBD\b|заглушка|контент позже|скоро появится/i, relativePath);
    assert.doesNotMatch(html, /[ \t]+\n/, `${relativePath}: trailing whitespace`);
    assert.ok(plain.split(" ").filter(Boolean).length >= 450, `${relativePath}: page is too short`);
  });
});
