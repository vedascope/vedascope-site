import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildExportFilename,
  createVedaClockSvg,
  getActiveNakshatras,
  getActivePadas,
  pointOnSquare,
  squareRingSegmentPath,
  updateVedaClockHands
} from "../assets/js/veda-clock-renderer.mjs";
import {
  buildVedaClockApiUrl,
  buildVedaClockGrahasApiUrl,
  buildVedaClockRequestParams,
  createClockTimeSource,
  extractGrahasFromApiResponse,
  loadVedaClockPreviewState,
  normalizeRefreshMs,
  readCachedState,
  saveCachedState,
  validateVedaClockApiState
} from "../assets/js/veda-clock-preview.mjs";
import {
  validateBoundaryCases,
  validateVedaClockStateForQa
} from "../scripts/veda-clock-qa.mjs";

test("pointOnSquare starts at the top left corner", () => {
  assert.deepEqual(pointOnSquare(0, 100), { x: 100, y: 100 });
});

test("pointOnSquare quarter points move clockwise around the square", () => {
  assert.deepEqual(pointOnSquare(0.25, 100), { x: 900, y: 100 });
  assert.deepEqual(pointOnSquare(0.5, 100), { x: 900, y: 900 });
  assert.deepEqual(pointOnSquare(0.75, 100), { x: 100, y: 900 });
});

test("squareRingSegmentPath returns a closed segment path", () => {
  const path = squareRingSegmentPath(0, 108, 94, 128);

  assert.match(path, /^M 94 94 L /);
  assert.match(path, / Z$/);
});

test("squareRingSegmentPath follows square corners instead of cutting across them", () => {
  const path = squareRingSegmentPath(6, 27, 142, 214);

  assert.match(path, /858 142/);
  assert.match(path, /786 214/);
});

test("active padas use 1-based indices from state", () => {
  const active = getActivePadas({ activePadas: [1, 108, 0, 109] });

  assert.equal(active.has(1), true);
  assert.equal(active.has(108), true);
  assert.equal(active.has(0), false);
  assert.equal(active.has(109), false);
});

test("active nakshatras use 1-based indices from state", () => {
  const active = getActiveNakshatras({ activeNakshatras: [1, 27, 0, 28] });

  assert.equal(active.has(1), true);
  assert.equal(active.has(27), true);
  assert.equal(active.has(0), false);
  assert.equal(active.has(28), false);
});

test("active padas and nakshatras can be derived from grahas", () => {
  const state = {
    grahas: [
      { nakshatra: 3, globalPada: 10 },
      { nakshatra: 3, globalPada: 10 },
      { nakshatra: 4, globalPada: 16 }
    ]
  };

  assert.deepEqual([...getActiveNakshatras(state)].sort((a, b) => a - b), [3, 4]);
  assert.deepEqual([...getActivePadas(state)].sort((a, b) => a - b), [10, 16]);
});

test("renderer creates an SVG for the sample state", async () => {
  const previousDocument = global.document;
  global.document = createFakeDocument();

  try {
    const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
    const svg = createVedaClockSvg(sample, { now: new Date("2026-07-01T10:08:00") });

    assert.equal(svg.tagName, "svg");
    assert.equal(svg.attributes.viewBox, "0 0 1000 1000");
    assert.equal(countNodes(svg, (node) => node.attributes["data-pada"]), 108);
    assert.equal(countNodes(svg, (node) => node.attributes["data-nakshatra"]), 27);
    assert.ok(countNodes(svg, (node) => node.attributes["data-clock-hand"] !== undefined) >= 3);
  } finally {
    global.document = previousDocument;
  }
});

test("active padas and nakshatras use filled segments without marker dots", async () => {
  const previousDocument = global.document;
  global.document = createFakeDocument();

  try {
    const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
    const svg = createVedaClockSvg(sample, { now: new Date("2026-07-01T10:08:00") });
    const activeSegments = findNodes(svg, (node) =>
      ["data-pada", "data-nakshatra"].some((attribute) => node.attributes[attribute])
      && node.attributes["data-active"] === "true"
    );
    const padaLayer = findNode(svg, (node) => node.attributes["data-layer"] === "padas");
    const nakshatraLayer = findNode(svg, (node) => node.attributes["data-layer"] === "nakshatras");

    assert.ok(activeSegments.length > 0);
    assert.equal(activeSegments.every((node) => !["transparent", "none"].includes(node.attributes.fill)), true);
    assert.equal(countNodes(padaLayer, (node) => node.tagName === "circle"), 0);
    assert.equal(countNodes(nakshatraLayer, (node) => node.tagName === "circle"), 0);
  } finally {
    global.document = previousDocument;
  }
});

test("renderer keeps numeric and graha labels horizontal", async () => {
  const previousDocument = global.document;
  global.document = createFakeDocument();

  try {
    const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
    const svg = createVedaClockSvg(sample, { now: new Date("2026-07-01T10:08:00") });
    const labels = findNodes(svg, (node) =>
      node.tagName === "text"
      && (
        node.attributes["data-nakshatra-label"]
        || node.attributes["data-rashi-label"]
        || node.attributes["data-graha"]
      )
    );

    assert.ok(labels.length > 0);
    assert.equal(labels.every((node) => node.attributes.transform === undefined), true);
  } finally {
    global.document = previousDocument;
  }
});

test("graha labels use configured planet colors", async () => {
  const previousDocument = global.document;
  global.document = createFakeDocument();

  try {
    const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
    const svg = createVedaClockSvg(sample, { now: new Date("2026-07-01T10:08:00") });
    const colors = new Map(findNodes(svg, (node) => node.attributes["data-graha"]).map((node) => [node.attributes["data-graha"], node.attributes.fill]));

    assert.equal(colors.get("Sa"), "#284D78");
    assert.equal(colors.get("Ma"), "#A33E34");
    assert.equal(colors.get("Me"), "#35765B");
    assert.equal(colors.get("Mo"), "#767B84");
    assert.equal(colors.get("Ve"), "#7B5A9B");
    assert.equal(colors.get("Su"), "#A77A18");
    assert.equal(colors.get("Ju"), "#C07628");
    assert.equal(colors.get("Ra"), "#7A563A");
    assert.equal(colors.get("Ke"), "#22211F");
  } finally {
    global.document = previousDocument;
  }
});

test("QA validator accepts the bundled sample state", async () => {
  const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
  const validation = validateVedaClockStateForQa(sample, { requireSchema: false, requireCalculationInstant: false });

  assert.deepEqual(validation.errors, []);
});

test("QA boundary helper validates derived-field edge cases", () => {
  const result = validateBoundaryCases();

  assert.equal(result.passed, true);
});

test("createClockTimeSource uses state.datetime with timezone offset", () => {
  const source = createClockTimeSource(
    { datetime: "2026-07-01T10:08:00+03:00", time: { hour: 2, minute: 3, second: 4 } },
    { loadedAtMs: 1000 }
  );

  assert.equal(source.currentDate(1000).toISOString(), "2026-07-01T07:08:00.000Z");
  assert.equal(source.currentDate(2500).toISOString(), "2026-07-01T07:08:01.500Z");
});

test("createClockTimeSource uses state.time fallback", () => {
  const loadedAt = Date.UTC(2026, 6, 1, 12, 0, 0);
  const source = createClockTimeSource(
    { datetime: "2026-07-01T10:08:00", time: { hour: 10, minute: 8, second: 0 } },
    { loadedAtMs: loadedAt }
  );

  const current = source.currentDate(loadedAt);
  assert.equal(current.getHours(), 10);
  assert.equal(current.getMinutes(), 8);
  assert.equal(current.getSeconds(), 0);
});

test("refreshMs below minimum becomes 10000", () => {
  assert.equal(normalizeRefreshMs(2000), 10000);
  assert.equal(normalizeRefreshMs("9000"), 10000);
  assert.equal(normalizeRefreshMs("12000"), 12000);
});

test("buildVedaClockApiUrl includes frontend params", () => {
  const params = new URLSearchParams("debug=1&lat=55.7558&lon=37.6173&timezone=Europe/Moscow&ayanamsha=lahiri&lang=ru&datetime=2026-07-01T10%3A08%3A00");
  const url = buildVedaClockApiUrl(params, { storage: null, intlTimeZone: "UTC" });

  assert.equal(
    url,
    "/api/v1/veda-clock/state?lat=55.7558&lon=37.6173&timezone=Europe%2FMoscow&ayanamsha=lahiri&lang=ru&datetime=2026-07-01T10%3A08%3A00"
  );
});

test("buildVedaClockRequestParams uses Intl timezone fallback", () => {
  const requestParams = buildVedaClockRequestParams(new URLSearchParams("lat=1&lon=2"), {
    storage: null,
    intlTimeZone: "Asia/Kolkata"
  });

  assert.equal(requestParams.get("timezone"), "Asia/Kolkata");
});

test("mock mode does not build backend URLs", () => {
  const params = new URLSearchParams("mock=1&apiBase=http://127.0.0.1:8010");

  assert.equal(buildVedaClockApiUrl(params, { storage: null, intlTimeZone: "UTC" }), null);
  assert.equal(buildVedaClockGrahasApiUrl(params, { storage: null, intlTimeZone: "UTC" }), null);
});

test("apiBase is applied only when provided", () => {
  const params = new URLSearchParams("lat=1&lon=2&timezone=UTC");

  assert.equal(buildVedaClockApiUrl(params, { storage: null }), "/api/v1/veda-clock/state?lat=1&lon=2&timezone=UTC");
  assert.equal(
    buildVedaClockApiUrl(new URLSearchParams(`${params.toString()}&apiBase=http://127.0.0.1:8010/`), { storage: null }),
    "http://127.0.0.1:8010/api/v1/veda-clock/state?lat=1&lon=2&timezone=UTC"
  );
});

test("validateVedaClockApiState rejects missing required grahas", () => {
  const state = validApiState();
  state.grahas = state.grahas.filter((graha) => graha.key !== "Ke");

  const validation = validateVedaClockApiState(state);

  assert.equal(validation.valid, false);
  assert.match(validation.warnings.join(" "), /Missing required graha Ke/);
});

test("validateVedaClockApiState rejects missing derived fields", () => {
  const state = validApiState();
  delete state.grahas[0].degreeInRashi;
  delete state.grahas[1].nakshatraName;

  const validation = validateVedaClockApiState(state);

  assert.equal(validation.valid, false);
  assert.match(validation.warnings.join(" "), /degreeInRashi/);
  assert.match(validation.warnings.join(" "), /nakshatraName/);
});

test("invalid api-state falls through the fallback chain", async () => {
  const fetchedUrls = [];
  const previousWarn = console.warn;
  console.warn = () => {};

  try {
    const loaded = await loadVedaClockPreviewState({
      params: new URLSearchParams("lat=55.7558&lon=37.6173&timezone=Europe/Moscow"),
      storage: null,
      fetchJsonImpl: async (url) => {
        fetchedUrls.push(url);
        if (String(url).includes("/api/v1/veda-clock/state")) {
          return { schemaVersion: "veda-clock-state/v1", grahas: [{ key: "Su", longitude: 0 }] };
        }
        throw new Error("grahas unavailable");
      }
    });

    assert.equal(loaded.meta.source, "embedded");
    assert.equal(fetchedUrls.length, 2);
    assert.match(loaded.meta.warnings.join(" "), /Missing required graha Mo/);
    assert.match(loaded.meta.warnings.join(" "), /Embedded fallback is active/);
  } finally {
    console.warn = previousWarn;
  }
});

test("extractGrahasFromApiResponse supports array, grahas, planets and data.grahas shapes", () => {
  const shapes = [
    [{ key: "sun", longitude: 1 }],
    { grahas: [{ key: "moon", longitude: 2 }] },
    { planets: [{ key: "mars", siderealLongitude: 3 }] },
    { data: { grahas: [{ key: "mercury", longitude_deg: 4 }] } }
  ];

  assert.deepEqual(shapes.map((shape) => extractGrahasFromApiResponse(shape).map((graha) => graha.longitude)), [[1], [2], [3], [4]]);
});

test("extractGrahasFromApiResponse skips missing longitude and warns about partial lists", () => {
  const warnings = [];
  const grahas = extractGrahasFromApiResponse({ grahas: [{ key: "sun" }, { key: "moon", longitude: 12 }] }, warnings);

  assert.equal(grahas.length, 1);
  assert.match(warnings.join(" "), /missing sidereal longitude/);
  assert.match(warnings.join(" "), /Partial graha list/);
});

test("cache helper handles invalid JSON", () => {
  const storage = {
    getItem() {
      return "{not-json";
    }
  };

  const cached = readCachedState(storage);
  assert.equal(cached.state, null);
  assert.match(cached.warning, /invalid JSON/);
});

test("cache helper saves and reads successful API states only", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
  const state = { datetime: "2026-07-01T10:08:00", grahas: [{ key: "Su", longitude: 0 }] };

  assert.equal(saveCachedState(state, { source: "embedded", loadedAt: "x", warnings: [] }, storage), false);
  assert.equal(readCachedState(storage).state, null);
  assert.equal(saveCachedState(state, { source: "api-state", loadedAt: "2026-07-01T00:00:00.000Z", warnings: [] }, storage), true);

  const cached = readCachedState(storage);
  assert.deepEqual(cached.state, state);
  assert.equal(cached.meta.source, "cache");
});

test("export filename includes date", () => {
  assert.equal(buildExportFilename("2026-07-01T10:08:00", "svg"), "vedascope-clock-2026-07-01.svg");
  assert.equal(buildExportFilename("01.07.26", "png"), "vedascope-clock-2026-07-01.png");
});

test("updateVedaClockHands does not change active segments or static layers", async () => {
  const previousDocument = global.document;
  global.document = createFakeDocument();

  try {
    const sample = JSON.parse(await readFile(new URL("../docs/veda-clock-state.sample.json", import.meta.url), "utf8"));
    const svg = createVedaClockSvg(sample, { now: new Date("2026-07-01T10:08:00") });
    const before = {
      padas: countNodes(svg, (node) => node.attributes["data-pada"]),
      activePadas: countNodes(svg, (node) => node.attributes["data-pada"] && node.attributes["data-active"] === "true"),
      nakshatras: countNodes(svg, (node) => node.attributes["data-nakshatra"]),
      activeNakshatras: countNodes(svg, (node) => node.attributes["data-nakshatra"] && node.attributes["data-active"] === "true"),
      chartNodes: countNodes(svg, (node) => node.attributes["data-layer"] === "south-chart")
    };

    assert.equal(updateVedaClockHands(svg, new Date("2026-07-01T10:09:01"), sample), true);

    assert.deepEqual({
      padas: countNodes(svg, (node) => node.attributes["data-pada"]),
      activePadas: countNodes(svg, (node) => node.attributes["data-pada"] && node.attributes["data-active"] === "true"),
      nakshatras: countNodes(svg, (node) => node.attributes["data-nakshatra"]),
      activeNakshatras: countNodes(svg, (node) => node.attributes["data-nakshatra"] && node.attributes["data-active"] === "true"),
      chartNodes: countNodes(svg, (node) => node.attributes["data-layer"] === "south-chart")
    }, before);
  } finally {
    global.document = previousDocument;
  }
});

function createFakeDocument() {
  return {
    createElementNS(_namespace, tagName) {
      return new FakeElement(tagName);
    }
  };
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.textContent = "";
  }

  setAttribute(key, value) {
    this.attributes[key] = String(value);
  }

  getAttribute(key) {
    return this.attributes[key] ?? null;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  querySelector(selector) {
    return findNode(this, (node) => matchesSelector(node, selector));
  }
}

function countNodes(node, predicate) {
  if (!node) return 0;
  const self = predicate(node) ? 1 : 0;
  return self + node.children.reduce((total, child) => total + countNodes(child, predicate), 0);
}

function findNodes(node, predicate) {
  if (!node) return [];
  const self = predicate(node) ? [node] : [];
  return node.children.reduce((items, child) => items.concat(findNodes(child, predicate)), self);
}

function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

function matchesSelector(node, selector) {
  const match = selector.match(/^\[([^=]+)="([^"]+)"\]$/);
  return Boolean(match && node.attributes[match[1]] === match[2]);
}

function validApiState() {
  const grahas = [
    ["Su", 0],
    ["Mo", 40],
    ["Ma", 80],
    ["Me", 120],
    ["Ju", 160],
    ["Ve", 200],
    ["Sa", 240],
    ["Ra", 280],
    ["Ke", 320]
  ].map(([key, longitude], index) => ({
    key,
    longitude,
    rashi: Math.floor(longitude / 30) + 1,
    degreeInRashi: longitude % 30,
    nakshatra: Math.floor(longitude / (360 / 27)) + 1,
    nakshatraName: `Nakshatra ${index + 1}`,
    pada: ((Math.floor(longitude / (360 / 108)) + 1 - 1) % 4) + 1,
    globalPada: Math.floor(longitude / (360 / 108)) + 1
  }));

  return {
    schemaVersion: "veda-clock-state/v1",
    datetime: "2026-07-01T10:08:00+03:00",
    timezone: "Europe/Moscow",
    dateLabel: "01.07.26",
    time: { hour: 10, minute: 8, second: 0 },
    calculationInstantUtc: "2026-07-01T07:08:00Z",
    grahas,
    activeNakshatras: [...new Set(grahas.map((graha) => graha.nakshatra))],
    activePadas: [...new Set(grahas.map((graha) => graha.globalPada))]
  };
}
