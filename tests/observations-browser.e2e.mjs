import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const enabled = process.env.VS_RUN_BROWSER_E2E === "1";
const baseUrl = process.env.VS_OBSERVATIONS_URL || "http://127.0.0.1:8090/observations/";
const artifactDirectory =
  process.env.VS_OBSERVATIONS_ARTIFACT_DIR ||
  path.resolve(process.cwd(), "artifacts/observations");

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 }
];

test("observations route, home entry and responsive visual smoke", {
  skip: !enabled,
  timeout: 120000
}, async (t) => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.VS_PLAYWRIGHT_CHANNEL || "chrome"
  });
  t.after(async () => browser.close());
  await fs.mkdir(artifactDirectory, { recursive: true });

  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.equal(await page.locator("h1").count(), 1);
  await page.locator("footer.global-footer").waitFor();

  assert.equal(await page.locator("main img").count(), 0);
  assert.equal(await page.locator(".observations-future-list > li").count(), 3);
  assert.equal(await page.locator('a[href="#what-will-appear"]').count(), 1);
  assert.match(await page.locator(".observations-empty-note").innerText(), /Публикаций пока нет/);
  assert.equal(await page.locator(".observations-desktop-nav > a").count(), 5);
  assert.equal(await page.locator(".observations-mobile-menu nav > a").count(), 5);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(120);
    const state = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.getBoundingClientRect();
      const documentWidth = document.documentElement.scrollWidth;
      return {
        overflow: documentWidth - document.documentElement.clientWidth,
        h1: h1 && { left: h1.left, right: h1.right, top: h1.top, bottom: h1.bottom },
        headerVisible: Boolean(document.querySelector(".site-header")),
        footerVisible: Boolean(document.querySelector(".global-footer"))
      };
    });

    assert.ok(state.overflow <= 1, `${viewport.name}: horizontal overflow ${state.overflow}px`);
    assert.ok(state.headerVisible && state.footerVisible);
    assert.ok(
      state.h1.left >= 0 && state.h1.right <= viewport.width + 1,
      `${viewport.name}: h1 outside viewport (${state.h1.left}–${state.h1.right}px)`
    );
    if (viewport.width <= 819) {
      assert.equal(await page.locator(".observations-desktop-nav").isVisible(), false);
      assert.equal(await page.locator(".observations-mobile-menu").isVisible(), true);
    } else {
      assert.equal(await page.locator(".observations-desktop-nav").isVisible(), true);
    }

    await page.screenshot({
      path: path.join(artifactDirectory, `observations-${viewport.name}.png`),
      fullPage: true
    });
  }

  await page.goto(new URL("/", baseUrl).href, { waitUntil: "networkidle" });
  const homeFeature = page.locator('a.observation-feature[href="/observations/"]');
  assert.equal(await homeFeature.count(), 1);
  assert.equal(await homeFeature.locator("a").count(), 0);
  await homeFeature.focus();
  const focusStyle = await homeFeature.evaluate((node) => ({
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: getComputedStyle(node).outlineWidth
  }));
  assert.notEqual(focusStyle.outlineStyle, "none");
  assert.notEqual(focusStyle.outlineWidth, "0px");
  await Promise.all([
    page.waitForURL(/\/observations\/$/),
    homeFeature.press("Enter")
  ]);
  assert.equal(new URL(page.url()).pathname, "/observations/");
});
