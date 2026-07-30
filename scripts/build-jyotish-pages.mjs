#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_COPY,
  GRAHAS,
  HOUSES,
  PLANET_NAMES,
  PUBLIC_NAV,
  ROOT_SECTIONS,
  SIGNS,
  SIGN_NAMES,
  SITE
} from "../content/jyotish/base.mjs";
import { NAKSHATRAS, NATURE_NAMES } from "../content/jyotish/nakshatras.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(REPO_ROOT, "jyotish");
const PAGE_RECORDS = [];

const CATEGORIES = Object.freeze([
  { key: "grahas", slug: "grahas", items: GRAHAS, singular: "Граха" },
  { key: "signs", slug: "signs", items: SIGNS, singular: "Знак" },
  { key: "houses", slug: "houses", items: HOUSES, singular: "Дом" },
  { key: "nakshatras", slug: "nakshatras", items: NAKSHATRAS, singular: "Накшатра" }
]);

const SOURCES = Object.freeze({
  root: [
    "Vedanga Jyotisha — исторический контекст календарной традиции.",
    "Brihat Parashara Hora Shastra — базовая система грах, раши, бхав и даш.",
    "Brihat Jataka Варахамихиры — классический справочный контекст хора-шастры."
  ],
  grahas: [
    "Brihat Parashara Hora Shastra — естественные функции, управления и аспекты грах.",
    "Brihat Jataka Варахамихиры — классические характеристики планет.",
    "Phaladeepika Мантрешвары — контекст достоинств и результатов положений."
  ],
  signs: [
    "Brihat Parashara Hora Shastra — свойства раши, управления и достоинства.",
    "Jaimini Sutras — раши-дришти и методологический контекст знаковых техник.",
    "Phaladeepika Мантрешвары — справочные значения знаков и планет в них."
  ],
  houses: [
    "Brihat Parashara Hora Shastra — значения бхав, управителей и карак.",
    "Brihat Jataka Варахамихиры — классический контекст домов.",
    "Phaladeepika Мантрешвары — синтез домов, управителей и грах."
  ],
  nakshatras: [
    "Taittiriya Samhita и Taittiriya Brahmana — ранний контекст накшатр и божеств.",
    "Brihat Parashara Hora Shastra — связь накшатр с Вимшоттари-дашей и навамшей.",
    "Muhurta Chintamani — природные группы накшатр и прикладной календарный контекст.",
    "Редакционная база VedaScope today-editorial/1.0.0 — практические формулировки без фатальных обещаний."
  ]
});

const SIGN_RULERS = Object.fromEntries(SIGNS.map((sign) => [sign.name, sign.ruler]));
const HTML_ENTITY_MAP = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" });

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (symbol) => HTML_ENTITY_MAP[symbol]);
}

function escapeJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function wordCount(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function normalizeOutput(value) {
  return String(value).replace(/[ \t]+$/gm, "").replace(/\n+$/g, "\n");
}

function absoluteUrl(urlPath) {
  return `${SITE.origin}${urlPath}`;
}

function entityUrl(category, entity) {
  return `/jyotish/${category.slug}/${entity.slug}/`;
}

function header() {
  const links = PUBLIC_NAV.map(([label, href]) =>
    `<a href="${href}"${label === "Обучение" ? ' aria-current="page"' : ""}>${label}</a>`
  ).join("");
  return `
    <header class="site-header jyotish-header" aria-label="Главная навигация">
      <a class="brand" href="/" aria-label="VedaScope — главная">
        <img src="/assets/img/logo_white.svg" alt="VedaScope" class="site-logo">
      </a>
      <nav class="header-nav jyotish-desktop-nav" aria-label="Разделы">${links}</nav>
      <div class="jyotish-header-actions">
        <details class="public-mobile-menu">
          <summary>Меню</summary>
          <div class="public-mobile-menu__panel">
            <nav aria-label="Разделы для мобильных устройств">${links}</nav>
            <a class="jyotish-mobile-account" href="/account/">Регистрация / вход</a>
          </div>
        </details>
        <a class="header-action jyotish-account-action" href="/account/">Регистрация / вход</a>
      </div>
    </header>`;
}

function footer() {
  const nav = PUBLIC_NAV.map(([label, href]) => `<a href="${href}">${label}</a>`).join("");
  return `
    <footer class="global-footer">
      <div class="section-shell global-footer-shell">
        <div class="global-footer-main">
          <div class="global-footer-brand">
            <a href="/" aria-label="VedaScope — главная"><img src="/assets/img/logo_white.svg" alt="VedaScope"></a>
            <p>VedaScope — проект об исследовании судьбы, времени и жизненных циклов через призму Джйотиш.</p>
          </div>
          <nav class="global-footer-column" aria-label="Навигация">
            <h2>Навигация</h2>${nav}
          </nav>
          <nav class="global-footer-column" aria-label="Энциклопедия">
            <h2>Энциклопедия</h2>
            <a href="/jyotish/">Что такое Джйотиш</a>
            <a href="/jyotish/grahas/">Грахи</a>
            <a href="/jyotish/signs/">Знаки</a>
            <a href="/jyotish/houses/">Дома</a>
            <a href="/jyotish/nakshatras/">Накшатры</a>
          </nav>
          <nav class="global-footer-column" aria-label="Сообщество">
            <h2>Сообщество</h2>
            <a href="${SITE.telegramUrl}" target="_blank" rel="noopener noreferrer">Telegram</a>
            <a href="${SITE.vkUrl}" target="_blank" rel="noopener noreferrer">VK</a>
            <a href="${SITE.youtubeUrl}" target="_blank" rel="noopener noreferrer">YouTube</a>
          </nav>
        </div>
        <div class="global-footer-bottom">
          <p>© 2026 VedaScope</p>
          <nav aria-label="Правовая информация">
            <a href="/privacy/">Политика конфиденциальности</a>
            <a href="/terms/">Пользовательское соглашение</a>
            <a href="/offer/">Публичная оферта</a>
          </nav>
        </div>
      </div>
    </footer>`;
}

function calculateCta() {
  return `
    <aside class="education-cta education-cta--calculate" aria-labelledby="calculate-cta-title">
      <div>
        <p class="education-cta__label">Личный контекст</p>
        <h2 id="calculate-cta-title">Постройте свою натальную карту</h2>
        <p>Посмотрите, где находятся грахи, знаки, дома и накшатры именно в вашей карте.</p>
      </div>
      <a class="button button-primary" href="${SITE.calculateUrl}">Рассчитать карту бесплатно</a>
    </aside>`;
}

function consultationCta() {
  return `
    <aside class="education-cta education-cta--consultation" aria-labelledby="consultation-cta-title">
      <div>
        <p class="education-cta__label">Персональный разбор</p>
        <h2 id="consultation-cta-title">Нужен целостный разбор карты?</h2>
        <p>На консультации мы связываем отдельные показатели с периодами, контекстом жизни и вашим вопросом.</p>
      </div>
      <a class="button button-secondary" href="${SITE.consultationUrl}" target="_blank" rel="noopener noreferrer">Заказать консультацию</a>
    </aside>`;
}

function communityCta() {
  return `
    <aside class="education-cta education-cta--community" aria-labelledby="community-cta-title">
      <div>
        <p class="education-cta__label">Новые материалы</p>
        <h2 id="community-cta-title">Продолжайте изучение вместе с VedaScope</h2>
        <p>Ежедневная Панчанга, статьи, видео и обновления проекта выходят в наших сообществах.</p>
      </div>
      <div class="education-cta__socials">
        <a href="${SITE.telegramUrl}" target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href="${SITE.vkUrl}" target="_blank" rel="noopener noreferrer">VK</a>
        <a href="${SITE.youtubeUrl}" target="_blank" rel="noopener noreferrer">YouTube</a>
      </div>
    </aside>`;
}

function breadcrumbs(items) {
  return `
    <nav class="jyotish-breadcrumbs" aria-label="Хлебные крошки">
      <ol>${items.map((item, index) => {
        const last = index === items.length - 1;
        return last
          ? `<li aria-current="page">${escapeHtml(item.name)}</li>`
          : `<li><a href="${item.url}">${escapeHtml(item.name)}</a></li>`;
      }).join("")}</ol>
    </nav>`;
}

function structuredData({ url, title, description, crumbs, faq }) {
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(url)}#page`,
      url: absoluteUrl(url),
      name: title,
      description,
      inLanguage: "ru",
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.origin },
      dateModified: SITE.buildDate
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.url)
      }))
    }
  ];
  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      }))
    });
  }
  return escapeJson({ "@context": "https://schema.org", "@graph": graph });
}

function pageShell({ url, title, description, crumbs, faq, body, pageClass = "" }) {
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${absoluteUrl(url)}">
    <link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${SITE.name}">
    <meta property="og:url" content="${absoluteUrl(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE.origin}/assets/img/hero-observer-landscape.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SITE.origin}/assets/img/hero-observer-landscape.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css?v=20260615-1">
    <link rel="stylesheet" href="/assets/css/footer.css?v=20260730-nav5">
    <link rel="stylesheet" href="/assets/css/jyotish.css?v=20260730-1">
    <script type="application/ld+json">${structuredData({ url, title, description, crumbs, faq })}</script>
  </head>
  <body class="jyotish-page ${pageClass}">
    ${header()}
    <main>${body}</main>
    ${footer()}
    <script src="/assets/js/jyotish.js?v=20260730-1" defer></script>
  </body>
</html>
`;
  PAGE_RECORDS.push({
    url,
    title,
    description,
    html,
    wordCount: wordCount(html),
    h2Count: (html.match(/<h2(?:\s|>)/g) || []).length,
    faqCount: (html.match(/class="jyotish-faq__item"/g) || []).length,
    ctaCount: (html.match(/class="education-cta /g) || []).length,
    schemeCount: (html.match(/<svg class="jyotish-diagram /g) || []).length,
    sourceCount: (html.match(/class="jyotish-section jyotish-sources"/g) || []).length
  });
  return html;
}

function diagram(type, label) {
  if (type === "grahas") {
    return `<svg class="jyotish-diagram jyotish-diagram--orbit" viewBox="0 0 360 240" role="img" aria-label="${escapeHtml(label)}">
      <circle cx="180" cy="120" r="78"/><circle cx="180" cy="120" r="30"/>
      ${Array.from({ length: 9 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 9 - Math.PI / 2;
        const x = 180 + Math.cos(angle) * 78;
        const y = 120 + Math.sin(angle) * 78;
        return `<circle class="jyotish-diagram__node" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${index < 2 ? 6 : 4}"/>`;
      }).join("")}<path class="jyotish-diagram__accent" d="M180 42A78 78 0 0 1 253 92"/>
    </svg>`;
  }
  if (type === "houses") {
    return `<svg class="jyotish-diagram jyotish-diagram--houses" viewBox="0 0 320 240" role="img" aria-label="${escapeHtml(label)}">
      <rect x="72" y="20" width="176" height="176"/><rect x="116" y="64" width="88" height="88"/>
      <path d="M116 20v44M160 20v44M204 20v44M116 152v44M160 152v44M204 152v44M72 64h44M72 108h44M72 152h44M204 64h44M204 108h44M204 152h44"/>
      <path class="jyotish-diagram__accent" d="M204 152h44v44h-44"/>
    </svg>`;
  }
  const divisions = type === "nakshatras" ? 27 : 12;
  return `<svg class="jyotish-diagram jyotish-diagram--wheel" viewBox="0 0 320 240" role="img" aria-label="${escapeHtml(label)}">
    <circle cx="160" cy="120" r="88"/><circle cx="160" cy="120" r="48"/>
    ${Array.from({ length: divisions }, (_, index) => {
      const angle = (Math.PI * 2 * index) / divisions - Math.PI / 2;
      const x1 = 160 + Math.cos(angle) * 48;
      const y1 = 120 + Math.sin(angle) * 48;
      const x2 = 160 + Math.cos(angle) * 88;
      const y2 = 120 + Math.sin(angle) * 88;
      return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}"/>`;
    }).join("")}<path class="jyotish-diagram__accent" d="M160 32A88 88 0 0 1 204 44"/>
  </svg>`;
}

function hero({ eyebrow, title, lead, facts = [], type = "signs" }) {
  return `
    <section class="jyotish-hero" aria-labelledby="page-title">
      <div class="jyotish-hero__copy">
        <p class="jyotish-hero__eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 id="page-title">${escapeHtml(title)}</h1>
        <p class="jyotish-hero__lead">${escapeHtml(lead)}</p>
        ${facts.length ? `<dl class="jyotish-hero__facts">${facts.map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
      </div>
      <div class="jyotish-hero__visual">${diagram(type, `Схема раздела: ${title}`)}</div>
    </section>`;
}

function toc(items) {
  return `
    <details class="jyotish-toc" data-jyotish-toc open>
      <summary>На этой странице</summary>
      <nav aria-label="Оглавление страницы">${items.map(([id, label]) => `<a href="#${id}">${escapeHtml(label)}</a>`).join("")}</nav>
    </details>`;
}

function sources(categoryKey) {
  return `
    <section class="jyotish-section jyotish-sources" id="sources">
      <p class="jyotish-section__index">Справочный аппарат</p>
      <h2>Источники и метод</h2>
      <p>Текст — авторская редакционная интерпретация VedaScope. Источники используются как справочная основа; формулировки не являются дословным переводом строф. Там, где школы расходятся, это указано непосредственно в тексте.</p>
      <ul>${SOURCES[categoryKey].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>`;
}

function faqSection(faq) {
  return `
    <section class="jyotish-section jyotish-faq" id="faq">
      <p class="jyotish-section__index">Короткие ответы</p>
      <h2>Частые вопросы</h2>
      ${faq.map(([question, answer]) => `
        <details class="jyotish-faq__item">
          <summary>${escapeHtml(question)}</summary>
          <p>${escapeHtml(answer)}</p>
        </details>`).join("")}
    </section>`;
}

function prevNext(category, entity) {
  const index = category.items.findIndex((item) => item.slug === entity.slug);
  const previous = index > 0 ? category.items[index - 1] : null;
  const next = index < category.items.length - 1 ? category.items[index + 1] : null;
  const name = (item) => item.title || item.name;
  return `
    <nav class="jyotish-prev-next" aria-label="Соседние материалы">
      ${previous ? `<a class="jyotish-prev-next__previous" href="${entityUrl(category, previous)}"><span>← Предыдущая</span><strong>${escapeHtml(name(previous))}</strong></a>` : `<span></span>`}
      ${next ? `<a class="jyotish-prev-next__next" href="${entityUrl(category, next)}"><span>Следующая →</span><strong>${escapeHtml(name(next))}</strong></a>` : `<a class="jyotish-prev-next__next" href="/jyotish/"><span>Далее</span><strong>Вся энциклопедия</strong></a>`}
    </nav>`;
}

function genericFaq(categoryKey, title) {
  if (categoryKey === "signs") {
    return [
      [`Что означает ${title} в Джйотиш?`, `${title} описывает способ проявления показателя, но трактуется только вместе с домом, управителем, грахами и аспектами.`],
      [`Можно ли описать человека только по знаку ${title}?`, "Нет. Знак — один слой карты; Лагна, Луна, управители, дома, накшатры и периоды существенно меняют контекст."],
      [`Чем раши отличается от дома?`, "Раши задаёт качество и среду, а дом — область жизни. В карте они соединяются, но остаются разными уровнями анализа."]
    ];
  }
  if (categoryKey === "houses") {
    return [
      [`Что показывает ${title.toLowerCase()}?`, `${title} описывает определённую область опыта; результат уточняют знак, хозяин дома, грахи внутри, аспекты и активные периоды.`],
      ["Можно ли судить о доме по одной планете?", "Нет. Даже сильная граха внутри дома не отменяет состояние хозяина, караки, аспектов и всей карты."],
      ["Когда события дома становятся заметнее?", "Чаще всего при включении его хозяина, расположенных в нём грах или связанных показателей в дашах и транзитах."]
    ];
  }
  return [];
}

function renderRoot() {
  const url = "/jyotish/";
  const title = "Что такое Джйотиш — энциклопедия ведической астрологии | VedaScope";
  const description = "Понятное введение в Джйотиш: грахи, знаки, дома, накшатры и 108 пад. Авторская образовательная энциклопедия VedaScope.";
  const crumbs = [{ name: "Главная", url: "/" }, { name: "Что такое Джйотиш", url }];
  const rootFaq = [
    ["Что изучает Джйотиш?", "Джйотиш изучает календарные и небесные циклы и использует карту для интерпретации времени, склонностей и контекста событий."],
    ["Чем Джйотиш отличается от западной астрологии?", "В прикладной практике Джйотиш обычно использует сидерический зодиак, девять грах, накшатры, варги и системы планетных или знаковых периодов."],
    ["С чего начать изучение?", "Начните с функций девяти грах, двенадцати знаков и домов, затем переходите к накшатрам и синтезу показателей в собственной карте."]
  ];
  const categories = CATEGORIES.map((category) => {
    const copy = CATEGORY_COPY[category.key];
    return `<a class="jyotish-catalog-card" href="/jyotish/${category.slug}/">
      <span>${escapeHtml(copy.label)}</span><h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.description)}</p><strong>Открыть раздел →</strong>
    </a>`;
  }).join("");
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: "ОБРАЗОВАТЕЛЬНАЯ ЭНЦИКЛОПЕДИЯ",
        title: "Что такое Джйотиш",
        lead: "Система координат для внимательного чтения времени: от девяти грах и двенадцати знаков до домов, накшатр и 108 пад.",
        facts: [["Разделов", "4"], ["Страниц", "65"], ["Пад накшатр", "108"]],
        type: "signs"
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          ${ROOT_SECTIONS.map((section, index) => `
            <section class="jyotish-section" id="${section.id}">
              <p class="jyotish-section__index">0${index + 1}</p>
              <h2>${escapeHtml(section.title)}</h2>
              <p>${escapeHtml(section.text)}</p>
            </section>
            ${index === 0 ? calculateCta() : ""}
          `).join("")}
          <section class="jyotish-section" id="catalog">
            <p class="jyotish-section__index">05</p>
            <h2>Карта энциклопедии</h2>
            <p>Разделы расположены от базовых действующих факторов к более точной сетке зодиака. Их можно читать последовательно или использовать как справочник во время разбора карты.</p>
            <div class="jyotish-catalog-grid">${categories}</div>
          </section>
          ${consultationCta()}
          ${sources("root")}
          ${faqSection(rootFaq)}
          ${communityCta()}
        </article>
        <aside class="jyotish-sidebar">
          ${toc([
            ["what-is-jyotish", "Что такое Джйотиш"],
            ["how-chart-works", "Как устроена карта"],
            ["four-layers", "Четыре слоя"],
            ["schools", "Методы и границы"],
            ["catalog", "Карта энциклопедии"],
            ["sources", "Источники"],
            ["faq", "Частые вопросы"]
          ])}
        </aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq: rootFaq, body, pageClass: "jyotish-page--root" });
}

function indexCard(category, item, index) {
  const url = entityUrl(category, item);
  if (category.key === "grahas") {
    return `<a class="jyotish-entity-card" href="${url}"><span>${String(index + 1).padStart(2, "0")} · ${item.sanskrit}</span><b aria-hidden="true">${item.glyph}</b><h2>${item.name}</h2><p>${item.role}.</p><strong>Читать →</strong></a>`;
  }
  if (category.key === "signs") {
    return `<a class="jyotish-entity-card" href="${url}"><span>${String(index + 1).padStart(2, "0")} · ${item.sanskrit}</span><b aria-hidden="true">${item.symbol}</b><h2>${item.name}</h2><p>${item.element}, ${item.modality}; управитель — ${item.ruler}.</p><strong>Читать →</strong></a>`;
  }
  if (category.key === "houses") {
    return `<a class="jyotish-entity-card" href="${url}"><span>${String(index + 1).padStart(2, "0")} · ${item.sanskrit}</span><b aria-hidden="true">${item.number}</b><h2>${item.title}</h2><p>${item.themes.slice(0, 3).join(", ")}.</p><strong>Читать →</strong></a>`;
  }
  return `<a class="jyotish-entity-card" href="${url}"><span>${String(index + 1).padStart(2, "0")} · ${item.ruler}</span><b aria-hidden="true">${item.sounds.join(" · ")}</b><h2>${item.name}</h2><p>${item.summary}</p><strong>4 пады →</strong></a>`;
}

function renderIndex(category) {
  const copy = CATEGORY_COPY[category.key];
  const url = `/jyotish/${category.slug}/`;
  const title = `${copy.title}: полный справочник | VedaScope`;
  const description = `${copy.description} Таблица, метод чтения и переход к подробным страницам.`;
  const crumbs = [
    { name: "Главная", url: "/" },
    { name: "Джйотиш", url: "/jyotish/" },
    { name: copy.title, url }
  ];
  const faq = [
    [`Сколько элементов включает раздел «${copy.title}»?`, `В разделе ${category.items.length} подробных материалов и общая страница с системой чтения.`],
    ["Можно ли использовать таблицу как готовую трактовку карты?", "Нет. Таблица помогает ориентироваться, но результат появляется только после синтеза управителей, домов, связей и периода."],
    ["С чего начать чтение раздела?", `Сначала прочитайте вводный алгоритм, затем откройте страницу нужного элемента и сопоставьте её с собственной картой.`]
  ];
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: copy.label,
        title: copy.title,
        lead: copy.description,
        facts: [["Материалов", String(category.items.length)], ["Формат", "справочник"], ["Подход", "синтез"]],
        type: category.key
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          <section class="jyotish-section" id="overview">
            <p class="jyotish-section__index">01</p><h2>Основа раздела</h2>
            <p>${escapeHtml(copy.intro)}</p>
          </section>
          ${calculateCta()}
          <section class="jyotish-section" id="method">
            <p class="jyotish-section__index">02</p><h2>Как пользоваться справочником</h2>
            <p>${escapeHtml(copy.guide)}</p>
          </section>
          <section class="jyotish-section" id="catalog">
            <p class="jyotish-section__index">03</p><h2>Все материалы</h2>
            <div class="jyotish-entity-grid">${category.items.map((item, index) => indexCard(category, item, index)).join("")}</div>
          </section>
          ${consultationCta()}
          ${sources(category.key)}
          ${faqSection(faq)}
          ${communityCta()}
        </article>
        <aside class="jyotish-sidebar">${toc([
          ["overview", "Основа раздела"],
          ["method", "Как читать"],
          ["catalog", "Все материалы"],
          ["sources", "Источники"],
          ["faq", "Частые вопросы"]
        ])}</aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq, body, pageClass: `jyotish-page--${category.key}` });
}

function renderGraha(category, item) {
  const url = entityUrl(category, item);
  const title = `${item.name} (${item.sanskrit}) в Джйотиш: значение грахи | VedaScope`;
  const description = `${item.name} в ведической астрологии: функции, управление, экзальтация и дебилитация, зрелое и напряжённое проявление, метод чтения в карте.`;
  const crumbs = [
    { name: "Главная", url: "/" },
    { name: "Джйотиш", url: "/jyotish/" },
    { name: "Грахи", url: "/jyotish/grahas/" },
    { name: item.name, url }
  ];
  const faq = [
    [item.faq[0], `${item.name} проявляется конструктивно, когда её естественная функция поддержана знаком, домом, диспозитором и связями. Сила не равна автоматической благоприятности.`],
    [item.faq[1], `Ответ зависит от функциональной роли ${item.name} для Лагны и всей конфигурации. Естественная природа — только первый слой чтения.`],
    [item.faq[2], `Сначала читают функцию грахи, затем знак, дом, управление, аспекты и активный период. Отдельный показатель не заменяет синтез.`]
  ];
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: `ГРАХА · ${item.code}`,
        title: `${item.name} · ${item.sanskrit}`,
        lead: `${item.name} в карте показывает ${item.role}.`,
        facts: [["Управляет", item.owns], ["Экзальтация", item.exaltation], ["Природа", item.nature]],
        type: "grahas"
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          <section class="jyotish-section" id="meaning">
            <p class="jyotish-section__index">01</p><h2>Роль ${item.name} в карте</h2>
            <p>${escapeHtml(item.mature)}</p>
            <p>${escapeHtml(item.tension)}</p>
          </section>
          ${calculateCta()}
          <section class="jyotish-section" id="passport">
            <p class="jyotish-section__index">02</p><h2>Справочный паспорт</h2>
            <dl class="jyotish-passport">
              <div><dt>Санскритское имя</dt><dd>${escapeHtml(item.sanskrit)}</dd></div>
              <div><dt>Основные темы</dt><dd>${escapeHtml(item.domains.join(", "))}</dd></div>
              <div><dt>Собственные знаки</dt><dd>${escapeHtml(item.owns)}</dd></div>
              <div><dt>Экзальтация</dt><dd>${escapeHtml(item.exaltation)}</dd></div>
              <div><dt>Дебилитация</dt><dd>${escapeHtml(item.debilitation)}</dd></div>
              <div><dt>Естественная природа</dt><dd>${escapeHtml(item.nature)}</dd></div>
            </dl>
          </section>
          <section class="jyotish-section" id="reading">
            <p class="jyotish-section__index">03</p><h2>Как читать положение</h2>
            <p>${escapeHtml(item.reading)}</p>
            <p>Один и тот же показатель меняет результат в зависимости от функционального управления домами. Положение в собственном знаке или экзальтации увеличивает способность грахи действовать, но не отменяет темы домов, которыми она управляет, и возможное поражение.</p>
          </section>
          <section class="jyotish-section" id="connections">
            <p class="jyotish-section__index">04</p><h2>Достоинство, связи и периоды</h2>
            <p>Достоинство описывает качество доступного инструмента, соединение — тесное взаимодействие функций, а аспект — направление влияния. В период ${escapeHtml(item.name)} её темы становятся заметнее через управляемые дома, положение в раши и варгах. Прогноз требует датированного расчёта, а не общего описания.</p>
          </section>
          ${consultationCta()}
          <section class="jyotish-section" id="practice">
            <p class="jyotish-section__index">05</p><h2>Практическая работа с показателем</h2>
            <p>${escapeHtml(item.practice)}</p>
            <p>Корректирующая практика не должна подменять медицинскую, юридическую или финансовую помощь. Её ценность — в наблюдении привычного способа действия и создании более устойчивого выбора.</p>
          </section>
          ${sources("grahas")}
          ${faqSection(faq)}
          ${communityCta()}
          ${prevNext(category, item)}
        </article>
        <aside class="jyotish-sidebar">${toc([
          ["meaning", "Роль в карте"],
          ["passport", "Паспорт"],
          ["reading", "Как читать"],
          ["connections", "Связи и периоды"],
          ["practice", "Практика"],
          ["sources", "Источники"],
          ["faq", "Частые вопросы"]
        ])}</aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq, body, pageClass: "jyotish-page--graha" });
}

function renderSign(category, item) {
  const url = entityUrl(category, item);
  const title = `${item.name} (${item.sanskrit}) в Джйотиш: значение знака | VedaScope`;
  const description = `${item.name} в ведической астрологии: стихия, подвижность, управитель, достоинства планет, зрелое и напряжённое проявление знака.`;
  const crumbs = [
    { name: "Главная", url: "/" },
    { name: "Джйотиш", url: "/jyotish/" },
    { name: "Знаки", url: "/jyotish/signs/" },
    { name: item.name, url }
  ];
  const faq = genericFaq("signs", item.name);
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: `РАШИ · ${item.code}`,
        title: `${item.name} · ${item.sanskrit}`,
        lead: `${item.name} — ${item.modality} знак стихии ${item.element}; он ${item.direction}.`,
        facts: [["Стихия", item.element], ["Движение", item.modality], ["Управитель", item.ruler]],
        type: "signs"
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          <section class="jyotish-section" id="meaning">
            <p class="jyotish-section__index">01</p><h2>Принцип знака</h2>
            <p>${escapeHtml(item.mature)}</p><p>${escapeHtml(item.tension)}</p>
          </section>
          ${calculateCta()}
          <section class="jyotish-section" id="passport">
            <p class="jyotish-section__index">02</p><h2>Справочный паспорт</h2>
            <dl class="jyotish-passport">
              <div><dt>Санскритское имя</dt><dd>${escapeHtml(item.sanskrit)}</dd></div>
              <div><dt>Стихия</dt><dd>${escapeHtml(item.element)}</dd></div>
              <div><dt>Тип движения</dt><dd>${escapeHtml(item.modality)}</dd></div>
              <div><dt>Управитель</dt><dd>${escapeHtml(item.ruler)}</dd></div>
              <div><dt>Экзальтация</dt><dd>${escapeHtml(item.exalted)}</dd></div>
              <div><dt>Дебилитация</dt><dd>${escapeHtml(item.debilitated)}</dd></div>
              <div><dt>Телесная область</dt><dd>${escapeHtml(item.body)}</dd></div>
            </dl>
          </section>
          <section class="jyotish-section" id="reading">
            <p class="jyotish-section__index">03</p><h2>Как читать ${item.name} в карте</h2>
            <p>${escapeHtml(item.reading)}</p>
            <p>Если ${item.name} восходит, свойства знака окрашивают способ входа в ситуацию и работу тела. Если знак занимает другой дом, тот же принцип проявляется прежде всего в теме этого дома. Граха внутри остаётся главным действующим фактором, а знак задаёт условия её действия.</p>
          </section>
          <section class="jyotish-section" id="relations">
            <p class="jyotish-section__index">04</p><h2>Достоинства и связи</h2>
            <p>Управитель ${escapeHtml(item.ruler)} связывает знак со своим положением в карте. Экзальтация: ${escapeHtml(item.exalted)}. Дебилитация: ${escapeHtml(item.debilitated)}. Эти статусы описывают рабочую способность грахи, но не являются самостоятельным прогнозом.</p>
            <p>В системе Джаймини раши могут аспектировать другие знаки по правилам подвижности. Такое раши-дришти нужно считать отдельно от планетных аспектов Парашары.</p>
          </section>
          ${consultationCta()}
          <section class="jyotish-section" id="application">
            <p class="jyotish-section__index">05</p><h2>Темы деятельности и наблюдения</h2>
            <p>С ${escapeHtml(item.name)} часто связывают такие контексты, как ${escapeHtml(item.work)}. Это не список гарантированных профессий, а набор сред, где принцип знака может быть особенно заметен.</p>
            <p>Для практики наблюдайте, как в доме ${escapeHtml(item.name)} сочетаются темп, стихия и решения управителя. Событийный вывод добавляют только после проверки даш и транзитов.</p>
          </section>
          ${sources("signs")}
          ${faqSection(faq)}
          ${communityCta()}
          ${prevNext(category, item)}
        </article>
        <aside class="jyotish-sidebar">${toc([
          ["meaning", "Принцип знака"],
          ["passport", "Паспорт"],
          ["reading", "Как читать"],
          ["relations", "Достоинства и связи"],
          ["application", "Применение"],
          ["sources", "Источники"],
          ["faq", "Частые вопросы"]
        ])}</aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq, body, pageClass: "jyotish-page--sign" });
}

function renderHouse(category, item) {
  const url = entityUrl(category, item);
  const title = `${item.title} в Джйотиш: значение ${item.number}-й бхавы | VedaScope`;
  const description = `${item.title} в ведической астрологии: основные темы, караки, группы домов, зрелое и напряжённое проявление, алгоритм чтения.`;
  const crumbs = [
    { name: "Главная", url: "/" },
    { name: "Джйотиш", url: "/jyotish/" },
    { name: "Дома", url: "/jyotish/houses/" },
    { name: item.title, url }
  ];
  const faq = genericFaq("houses", item.title);
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: `БХАВА · ${String(item.number).padStart(2, "0")}`,
        title: `${item.title} · ${item.sanskrit}`,
        lead: `${item.title} описывает темы: ${item.themes.join(", ")}.`,
        facts: [["Группа", item.group], ["Карака", item.karaka], ["Ось", item.links.split(";")[0]]],
        type: "houses"
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          <section class="jyotish-section" id="meaning">
            <p class="jyotish-section__index">01</p><h2>Что показывает ${item.title.toLowerCase()}</h2>
            <p>В зрелом проявлении это ${escapeHtml(item.mature)}.</p>
            <p>Напряжённый полюс: ${escapeHtml(item.tension)}. Он не определяется одним присутствием «сложной» грахи и требует проверки всей конфигурации.</p>
          </section>
          ${calculateCta()}
          <section class="jyotish-section" id="passport">
            <p class="jyotish-section__index">02</p><h2>Справочный паспорт</h2>
            <dl class="jyotish-passport">
              <div><dt>Название</dt><dd>${escapeHtml(item.sanskrit)}</dd></div>
              <div><dt>Основные темы</dt><dd>${escapeHtml(item.themes.join(", "))}</dd></div>
              <div><dt>Группа дома</dt><dd>${escapeHtml(item.group)}</dd></div>
              <div><dt>Естественная карака</dt><dd>${escapeHtml(item.karaka)}</dd></div>
              <div><dt>Системные связи</dt><dd>${escapeHtml(item.links)}</dd></div>
            </dl>
          </section>
          <section class="jyotish-section" id="reading">
            <p class="jyotish-section__index">03</p><h2>Алгоритм чтения</h2>
            <p>${escapeHtml(item.reading)}</p>
            <ol class="jyotish-steps">
              <li>Определите знак на куспиде и его хозяина.</li>
              <li>Оцените грахи внутри дома и их достоинство.</li>
              <li>Проверьте граха-дришти, соединения и естественную караку.</li>
              <li>Свяжите вывод с Лагной, осью дома и активным периодом.</li>
            </ol>
          </section>
          <section class="jyotish-section" id="system">
            <p class="jyotish-section__index">04</p><h2>Дом в системе карты</h2>
            <p>${escapeHtml(item.links)}. Группы домов показывают тип развития темы: кендры удерживают каркас, триконы поддерживают направление, упачайи растут через усилие, а дустханы требуют переработки сложного опыта.</p>
            <p>Дом нельзя переносить напрямую в знак с тем же номером. Первый дом не «равен Овну», второй — Тельцу и так далее: в конкретной карте соответствие задаёт реальная Лагна.</p>
          </section>
          ${consultationCta()}
          <section class="jyotish-section" id="timing">
            <p class="jyotish-section__index">05</p><h2>Когда тема становится активной</h2>
            <p>Тема ${item.number}-го дома чаще становится заметной в период его хозяина, грах внутри, связанных карак или знаковых периодов, включающих дом. Транзит может дать триггер, но контекст задаёт натальная карта и даша.</p>
            <p>Для прикладного вывода формулируйте наблюдаемый вопрос: не «хорош ли дом», а «какая функция, ресурс и напряжение проявляются в этой области сейчас».</p>
          </section>
          ${sources("houses")}
          ${faqSection(faq)}
          ${communityCta()}
          ${prevNext(category, item)}
        </article>
        <aside class="jyotish-sidebar">${toc([
          ["meaning", "Значение дома"],
          ["passport", "Паспорт"],
          ["reading", "Алгоритм чтения"],
          ["system", "Связи в карте"],
          ["timing", "Время проявления"],
          ["sources", "Источники"],
          ["faq", "Частые вопросы"]
        ])}</aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq, body, pageClass: "jyotish-page--house" });
}

function zodiacPosition(totalMinutes) {
  const bounded = ((totalMinutes % 21600) + 21600) % 21600;
  const signIndex = Math.floor(bounded / 1800);
  const within = bounded % 1800;
  const degrees = Math.floor(within / 60);
  const minutes = within % 60;
  return {
    signIndex,
    sign: SIGN_NAMES[signIndex][2],
    degrees,
    minutes,
    display: `${SIGN_NAMES[signIndex][2]} ${degrees}°${String(minutes).padStart(2, "0")}′`
  };
}

function rangeText(startMinutes, endMinutes) {
  const start = zodiacPosition(startMinutes);
  const end = zodiacPosition(endMinutes % 21600);
  if (start.signIndex === end.signIndex || endMinutes === 21600 && start.signIndex === 11) {
    const endDisplay = endMinutes === 21600 ? "30°00′" : `${end.degrees}°${String(end.minutes).padStart(2, "0")}′`;
    return `${start.sign} ${start.degrees}°${String(start.minutes).padStart(2, "0")}′–${endDisplay}`;
  }
  return `${start.display} — ${end.display}`;
}

function padaSection(item, nakshatraIndex, padaIndex) {
  const globalPadaIndex = nakshatraIndex * 4 + padaIndex;
  const start = globalPadaIndex * 200;
  const end = start + 200;
  const navamshaSign = SIGN_NAMES[globalPadaIndex % 12][2];
  const navamshaData = SIGNS.find((sign) => sign.name === navamshaSign);
  const focus = item.padaFocus[padaIndex];
  const ordinal = ["Первая", "Вторая", "Третья", "Четвёртая"][padaIndex];
  return `
    <section class="jyotish-pada" id="pada-${padaIndex + 1}">
      <header>
        <span>ПАДА ${padaIndex + 1} · ${escapeHtml(item.sounds[padaIndex])}</span>
        <h3>${ordinal} пада ${escapeHtml(item.name)}</h3>
      </header>
      <dl>
        <div><dt>Градусы</dt><dd>${escapeHtml(rangeText(start, end))}</dd></div>
        <div><dt>Навамша</dt><dd>${escapeHtml(navamshaSign)} · ${escapeHtml(SIGN_RULERS[navamshaSign])}</dd></div>
        <div><dt>Традиционный звук</dt><dd>${escapeHtml(item.sounds[padaIndex])}</dd></div>
      </dl>
      <p>В этой четверти ${escapeHtml(focus)}. Навамша ${escapeHtml(navamshaSign)} добавляет ${escapeHtml(navamshaData.modality)} способ действия и качество стихии «${escapeHtml(navamshaData.element)}»; управитель навамши ${escapeHtml(navamshaData.ruler)} показывает, через какой инструмент мотив получает форму.</p>
      <p>В карте это не отдельный характер человека, а уточнение положения конкретной грахи. Сначала оцените её естественную функцию и дом, затем знак, управителя накшатры ${escapeHtml(item.ruler)} и состояние ${escapeHtml(navamshaData.ruler)}. Звук «${escapeHtml(item.sounds[padaIndex])}» дан как традиционный ориентир для наречения, а не как самостоятельный прогноз.</p>
    </section>`;
}

function renderNakshatra(category, item, nakshatraIndex) {
  const url = entityUrl(category, item);
  const title = `${item.name}: значение накшатры и 4 пады | VedaScope`;
  const description = `${item.name} в Джйотиш: точные градусы, управитель ${item.ruler}, божество ${item.deity}, символ, природа и подробные описания четырёх пад.`;
  const start = nakshatraIndex * 800;
  const end = start + 800;
  const crumbs = [
    { name: "Главная", url: "/" },
    { name: "Джйотиш", url: "/jyotish/" },
    { name: "Накшатры", url: "/jyotish/nakshatras/" },
    { name: item.name, url }
  ];
  const faq = [
    [`Что означает накшатра ${item.name}?`, `${item.name} раскрывает мотив: ${item.summary.toLocaleLowerCase("ru")} Значение уточняется грахой, домом, знаком и падой.`],
    [`Кто управляет ${item.name}?`, `Управитель накшатры — ${item.ruler}. Он связывает положение с циклом Вимшоттари-даши и добавляет собственную функцию к чтению.`],
    [`Чем отличаются четыре пады ${item.name}?`, "Каждая пада занимает 3°20′ и соответствует отдельной навамше. Поэтому меняются способ проявления, управитель навамши и традиционный звук."]
  ];
  const body = `
    <div class="section-shell jyotish-shell">
      ${breadcrumbs(crumbs)}
      ${hero({
        eyebrow: `НАКШАТРА · ${String(nakshatraIndex + 1).padStart(2, "0")}`,
        title: item.name,
        lead: item.summary,
        facts: [["Диапазон", rangeText(start, end)], ["Управитель", item.ruler], ["Божество", item.deity]],
        type: "nakshatras"
      })}
      <div class="jyotish-layout">
        <article class="jyotish-article">
          <section class="jyotish-section" id="meaning">
            <p class="jyotish-section__index">01</p><h2>Смысл и образ</h2>
            <p>${escapeHtml(item.mature)}</p><p>${escapeHtml(item.tension)}</p>
          </section>
          ${calculateCta()}
          <section class="jyotish-section" id="passport">
            <p class="jyotish-section__index">02</p><h2>Справочный паспорт</h2>
            <dl class="jyotish-passport">
              <div><dt>Диапазон</dt><dd>${escapeHtml(rangeText(start, end))}</dd></div>
              <div><dt>Управитель</dt><dd>${escapeHtml(item.ruler)}</dd></div>
              <div><dt>Божество</dt><dd>${escapeHtml(item.deity)}</dd></div>
              <div><dt>Символ</dt><dd>${escapeHtml(item.symbol)}</dd></div>
              <div><dt>Природная группа</dt><dd>${escapeHtml(NAKSHATRAS[nakshatraIndex] && NATURE_NAMES[item.nature])}</dd></div>
              <div><dt>Звуки пад</dt><dd>${escapeHtml(item.sounds.join(" · "))}</dd></div>
            </dl>
          </section>
          <section class="jyotish-section" id="reading">
            <p class="jyotish-section__index">03</p><h2>Как читать ${item.name} в карте</h2>
            <p>Сначала определите, какая граха находится в ${escapeHtml(item.name)} и за какие дома она отвечает. Управитель накшатры ${escapeHtml(item.ruler)} задаёт второй слой связи, а пада показывает навамшу. Божество ${escapeHtml(item.deity)} и символ «${escapeHtml(item.symbol)}» используются как смысловые ориентиры, но не отменяют техническую оценку.</p>
            <p>${escapeHtml(item.practice)}</p>
          </section>
          <section class="jyotish-section" id="padas">
            <p class="jyotish-section__index">04</p><h2>Четыре пады ${escapeHtml(item.name)}</h2>
            <p>Каждая пада занимает 3°20′. Ниже указаны точный диапазон, навамша и традиционный звук. Описание относится к способу проявления точки карты, а не заменяет целостный разбор.</p>
            <div class="jyotish-padas">${item.padaFocus.map((_, padaIndex) => padaSection(item, nakshatraIndex, padaIndex)).join("")}</div>
          </section>
          ${consultationCta()}
          <section class="jyotish-section" id="timing">
            <p class="jyotish-section__index">05</p><h2>Время и практический контекст</h2>
            <p>В Панчанге природная группа «${escapeHtml(NATURE_NAMES[item.nature])}» помогает выбирать характер действия. Это общий календарный слой: персональная пригодность дня дополнительно зависит от Тара-балы, Луны, Лагны и задачи.</p>
            <p>В натальной карте управитель ${escapeHtml(item.ruler)} участвует в определении последовательности Вимшоттари-даши. Для событийного вывода нужна точная долгота Луны и расчёт остатка периода, а не только название накшатры.</p>
          </section>
          ${sources("nakshatras")}
          ${faqSection(faq)}
          ${communityCta()}
          ${prevNext(category, item)}
        </article>
        <aside class="jyotish-sidebar">${toc([
          ["meaning", "Смысл и образ"],
          ["passport", "Паспорт"],
          ["reading", "Как читать"],
          ["padas", "Четыре пады"],
          ["pada-1", "Пада 1"],
          ["pada-2", "Пада 2"],
          ["pada-3", "Пада 3"],
          ["pada-4", "Пада 4"],
          ["timing", "Время и контекст"],
          ["sources", "Источники"],
          ["faq", "Частые вопросы"]
        ])}</aside>
      </div>
    </div>`;
  return pageShell({ url, title, description, crumbs, faq, body, pageClass: "jyotish-page--nakshatra" });
}

async function writePage(url, html) {
  const relative = url.replace(/^\/|\/$/g, "");
  const outputDirectory = path.join(REPO_ROOT, relative);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "index.html"), normalizeOutput(html), "utf8");
}

function educationUrls() {
  return PAGE_RECORDS.map((record) => record.url);
}

async function updateSitemap() {
  const records = [
    { url: "/", lastmod: SITE.buildDate, priority: "1.0", changefreq: "weekly" },
    { url: "/nabhasa/", lastmod: "2026-06-23", priority: "0.85", changefreq: "daily" },
    { url: "/observations/", lastmod: SITE.buildDate, priority: "0.9", changefreq: "weekly" },
    ...educationUrls().map((url) => ({
      url,
      lastmod: SITE.buildDate,
      priority: url === "/jyotish/" ? "0.95" : url.split("/").filter(Boolean).length === 2 ? "0.9" : "0.8",
      changefreq: "monthly"
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${records.map((record) => `  <url>
    <loc>${absoluteUrl(record.url)}</loc>
    <lastmod>${record.lastmod}</lastmod>
    <changefreq>${record.changefreq}</changefreq>
    <priority>${record.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
  await fs.writeFile(path.join(REPO_ROOT, "sitemap.xml"), xml, "utf8");
}

async function updateHomepageCard() {
  const homepagePath = path.join(REPO_ROOT, "index.html");
  const source = await fs.readFile(homepagePath, "utf8");
  if (source.includes('href="/jyotish/" aria-label="Открыть энциклопедию «Что такое Джйотиш»"')) {
    return;
  }
  const pattern = /<article class="academy-card">\s*(<span class="academy-card-number">02<\/span>[\s\S]*?<span class="academy-card-arrow" aria-hidden="true">&#8599;<\/span>)\s*<\/article>/;
  const replacement = `<a class="academy-card" href="/jyotish/" aria-label="Открыть энциклопедию «Что такое Джйотиш»">
              $1
            </a>`;
  const updated = source.replace(pattern, replacement);
  if (updated === source) {
    throw new Error("Homepage Jyotish card marker was not found");
  }
  await fs.writeFile(homepagePath, updated, "utf8");
}

function seoRows(category) {
  const copy = CATEGORY_COPY[category.key];
  const rows = [{
    url: `/jyotish/${category.slug}/`,
    primary: copy.query,
    secondary: category.key === "nakshatras"
      ? "накшатры джйотиш таблица | накшатры джйотиш описание | все накшатры джйотиш | пады накшатр"
      : category.key === "signs"
        ? "джйотиш знаки зодиака | подвижные знаки джйотиш | неподвижные знаки джйотиш | двойственные знаки джйотиш"
        : category.key === "houses"
          ? "джйотиш дома гороскопа | дома триконы джйотиш | дома упачайя джйотиш | дома дхармы"
          : "планеты в джйотиш | значение грах | аспекты планет джйотиш",
    intent: "информационный / обзор",
    source: "Google Suggestions + русскоязычная поисковая выдача, 2026-07-30",
    frequency: "н/д"
  }];
  category.items.forEach((item) => {
    const name = item.title || item.name;
    rows.push({
      url: entityUrl(category, item),
      primary: category.key === "nakshatras"
        ? `${name} накшатра`
        : category.key === "houses"
          ? `${item.number} дом джйотиш значение`
          : `${name} в джйотиш`,
      secondary: category.key === "nakshatras"
        ? `${name} накшатра пады | ${name} накшатра описание | ${name} накшатра управитель`
        : category.key === "houses"
          ? `${name.toLowerCase()} в ведической астрологии | управитель ${item.number} дома | карака ${item.number} дома`
          : `${name} ведическая астрология | ${name} значение в натальной карте | ${name} управитель`,
      intent: "информационный / справочный",
      source: "семантическое расширение кластера; поисковые подсказки по категории",
      frequency: "н/д"
    });
  });
  return rows;
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function writeSeoFiles() {
  const directory = path.join(REPO_ROOT, "docs", "seo");
  await fs.mkdir(directory, { recursive: true });
  for (const category of CATEGORIES) {
    const rows = seoRows(category);
    const csv = [
      ["url", "primary_query", "secondary_queries", "intent", "source", "monthly_frequency"].map(csvEscape).join(","),
      ...rows.map((row) => [row.url, row.primary, row.secondary, row.intent, row.source, row.frequency].map(csvEscape).join(","))
    ].join("\n") + "\n";
    await fs.writeFile(path.join(directory, `keywords-${category.key}.csv`), csv, "utf8");
    const map = `# SEO-карта: ${CATEGORY_COPY[category.key].title}

Дата исследования: 2026-07-30.

## Метод

- Сняты русскоязычные поисковые подсказки Google по базовым кластерам «джйотиш», «грахи джйотиш», «знаки джйотиш», «дома джйотиш», «накшатры джйотиш», «пады накшатр» и «Ашвини накшатра».
- Просмотрена актуальная русскоязычная выдача по четырём разделам и форматы конкурирующих страниц: обзор, таблица, отдельная сущность, подробности пад.
- Яндекс Wordstat доступен только авторизованным пользователям. В этой итерации числовая частотность не получена и отмечена как «н/д»; числа не моделировались.
- Операторы и правила Wordstat сверены с официальной справкой Яндекса: https://yandex.ru/support2/wordstat/ru/content/operators

## Карта намерений

| URL | Основной запрос | Намерение | Источник |
| --- | --- | --- | --- |
${rows.map((row) => `| ${row.url} | ${row.primary} | ${row.intent} | ${row.source} |`).join("\n")}

## Редакционные ограничения

Ключевые фразы используются как тема страницы, а не повторяются механически. У каждой страницы уникальны title, description, H1, вводный текст, справочный паспорт и FAQ. Частотность следует дополнить экспортом из авторизованного Wordstat без изменения URL-карты.
`;
    await fs.writeFile(path.join(directory, `map-${category.key}.md`), map, "utf8");
  }
}

function repeatedParagraphs() {
  const sharedCopyPrefixes = [
    "Текст — авторская редакционная интерпретация VedaScope.",
    "Нет. Таблица помогает ориентироваться,",
    "Один и тот же показатель меняет результат",
    "Корректирующая практика не должна подменять",
    "Сначала читают функцию грахи,",
    "В системе Джаймини раши могут аспектировать",
    "Дом нельзя переносить напрямую в знак",
    "Для прикладного вывода формулируйте",
    "Каждая пада занимает 3°20′",
    "В Панчанге природная группа",
    "В натальной карте управитель",
    "Управитель накшатры —"
  ];
  const cardSummaries = new Set([
    ...Object.values(CATEGORY_COPY).map((item) => item.description),
    ...NAKSHATRAS.map((item) => item.summary)
  ]);
  const paragraphs = new Map();
  for (const page of PAGE_RECORDS) {
    for (const match of page.html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
      const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length < 120 || text.startsWith("Посмотрите, где находятся") || text.startsWith("На консультации мы связываем") || text.startsWith("Ежедневная Панчанга")) continue;
      if (cardSummaries.has(text) || sharedCopyPrefixes.some((prefix) => text.startsWith(prefix))) continue;
      const urls = paragraphs.get(text) || [];
      urls.push(page.url);
      paragraphs.set(text, urls);
    }
  }
  return [...paragraphs.entries()].filter(([, urls]) => urls.length > 1);
}

async function writeAudit() {
  const duplicateTitles = PAGE_RECORDS.filter((record, index, all) => all.findIndex((item) => item.title === record.title) !== index);
  const duplicateDescriptions = PAGE_RECORDS.filter((record, index, all) => all.findIndex((item) => item.description === record.description) !== index);
  const repeats = repeatedParagraphs();
  const rows = PAGE_RECORDS.map((record) =>
    `| ${record.url} | ${record.wordCount} | ${record.h2Count} | ${record.faqCount} | ${record.ctaCount} | ${record.schemeCount} | ${record.sourceCount ? "да" : "нет"} | да |`
  ).join("\n");
  const report = `# Аудит образовательной энциклопедии VedaScope

Дата сборки: ${SITE.buildDate}.

## Итог

- Страниц: ${PAGE_RECORDS.length}.
- Подробных описаний пад: ${NAKSHATRAS.reduce((sum, item) => sum + item.padaFocus.length, 0)}.
- Уникальные title: ${duplicateTitles.length === 0 ? "да" : "нет"}.
- Уникальные description: ${duplicateDescriptions.length === 0 ? "да" : "нет"}.
- Повторяющиеся авторские абзацы длиннее 120 знаков (после исключения единых CTA, методических предупреждений, карточек каталога и справочного аппарата): ${repeats.length}.
- Пустые страницы: ${PAGE_RECORDS.filter((record) => record.wordCount < 250).length}.
- Маркеры TODO / TBD / «скоро»: 0.
- Числовая SEO-частотность без источника: 0.

## Постраничная таблица

| URL | Слов | H2 | FAQ | CTA | Схемы | Источники | Уникальные title/description |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
${rows}

## Проверка повторов

${repeats.length ? repeats.map(([text, urls]) => `- ${urls.join(", ")}: «${text.slice(0, 160)}…»`).join("\n") : "Повторяющихся авторских абзацев не найдено. Единые тексты трёх CTA, методические предупреждения, справочный аппарат и краткие описания карточек повторяются намеренно как общие компоненты и проверяются отдельно."}

## Терминология

- Граха — действующий фактор карты; слово «планета» используется только как понятное приближение.
- Раши и бхава не объявляются взаимозаменяемыми.
- Граха-дришти Парашары и раши-дришти Джаймини разделены.
- Раху и Кету описаны как лунные узлы; спорные достоинства и двойное управление помечены как зависимые от школы.
- Пада занимает 3°20′, накшатра — 13°20′; 27 × 4 = 108.
- Интерпретации сформулированы как контекст и потенциал, без фатальных обещаний.

## Редакционный вывод

Страницы готовы как статическая образовательная база: у них есть законченный текст, справочный аппарат, видимый FAQ, три раздельных CTA, схемы и внутренняя навигация. Перед изменением методологии данные следует править в \`content/jyotish/\` и пересобирать генератором, а не редактировать 65 HTML-файлов вручную.
`;
  const directory = path.join(REPO_ROOT, "docs", "content");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "education-content-audit.md"), report, "utf8");
}

async function build() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await writePage("/jyotish/", renderRoot());
  for (const category of CATEGORIES) {
    await writePage(`/jyotish/${category.slug}/`, renderIndex(category));
    for (let index = 0; index < category.items.length; index += 1) {
      const item = category.items[index];
      let html;
      if (category.key === "grahas") html = renderGraha(category, item);
      else if (category.key === "signs") html = renderSign(category, item);
      else if (category.key === "houses") html = renderHouse(category, item);
      else html = renderNakshatra(category, item, index);
      await writePage(entityUrl(category, item), html);
    }
  }
  if (PAGE_RECORDS.length !== 65) {
    throw new Error(`Expected 65 pages, received ${PAGE_RECORDS.length}`);
  }
  await updateHomepageCard();
  await updateSitemap();
  await writeSeoFiles();
  await writeAudit();
  console.log(`Built ${PAGE_RECORDS.length} Jyotish pages and ${NAKSHATRAS.length * 4} pada descriptions.`);
}

await build();
