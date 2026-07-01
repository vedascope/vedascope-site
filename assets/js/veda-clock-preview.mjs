import { buildVedaClockState, GRAHA_KEYS, normalizeGrahaKey } from "./veda-clock-state.mjs?v=mvp06b";
import {
  exportVedaClockPng,
  exportVedaClockSvg,
  renderVedaClock,
  updateVedaClockHands
} from "./veda-clock-renderer.mjs?v=mvp06b";

export const CACHE_KEY = "vedaClock:lastState:v1";
export const MIN_REFRESH_MS = 10000;
export const DEFAULT_REFRESH_MS = 60000;
export const VEDA_CLOCK_STATE_PATH = "/api/v1/veda-clock/state";
export const VEDA_CLOCK_GRAHAS_PATH = "/api/grahas";

const REQUEST_PARAM_KEYS = ["lat", "lon", "timezone", "ayanamsha", "lang", "datetime"];
const SAVED_LOCATION_KEYS = [
  "vedaScope:lastLocation",
  "vedascope:lastLocation",
  "vedaScope:panchanga:lastLocation",
  "vedascope:panchanga:lastLocation",
  "panchanga:lastLocation"
];
const REQUIRED_STATE_GRAHA_FIELDS = [
  "key",
  "longitude",
  "rashi",
  "degreeInRashi",
  "nakshatra",
  "nakshatraName",
  "pada",
  "globalPada"
];

const LONGITUDE_FIELDS = [
  "longitude",
  "siderealLongitude",
  "sidereal_longitude",
  "siderealLongitudeDeg",
  "sidereal_longitude_deg",
  "longitudeDeg",
  "longitude_deg"
];

const FALLBACK_STATE = {
  datetime: "2026-07-01T10:08:00",
  timezone: "Europe/Moscow",
  dateLabel: "01.07.26",
  time: { hour: 10, minute: 8, second: 0 },
  grahas: [
    { key: "Su", longitude: 76.125, rashi: 3, degreeInRashi: 16.125, nakshatra: 6, nakshatraName: "Ardra", pada: 3, globalPada: 23 },
    { key: "Mo", longitude: 222.75, rashi: 8, degreeInRashi: 12.75, nakshatra: 17, nakshatraName: "Anuradha", pada: 3, globalPada: 67 },
    { key: "Ma", longitude: 152.4, rashi: 6, degreeInRashi: 2.4, nakshatra: 12, nakshatraName: "Uttara Phalguni", pada: 2, globalPada: 46 },
    { key: "Me", longitude: 91.2, rashi: 4, degreeInRashi: 1.2, nakshatra: 7, nakshatraName: "Punarvasu", pada: 4, globalPada: 28 },
    { key: "Ju", longitude: 105.95, rashi: 4, degreeInRashi: 15.95, nakshatra: 8, nakshatraName: "Pushya", pada: 4, globalPada: 32 },
    { key: "Ve", longitude: 58.8, rashi: 2, degreeInRashi: 28.8, nakshatra: 5, nakshatraName: "Mrigashira", pada: 2, globalPada: 18 },
    { key: "Sa", longitude: 337.1, rashi: 12, degreeInRashi: 7.1, nakshatra: 26, nakshatraName: "Uttara Bhadrapada", pada: 2, globalPada: 102 },
    { key: "Ra", longitude: 315.33, rashi: 11, degreeInRashi: 15.33, nakshatra: 24, nakshatraName: "Shatabhisha", pada: 3, globalPada: 95 },
    { key: "Ke", longitude: 135.33, rashi: 5, degreeInRashi: 15.33, nakshatra: 11, nakshatraName: "Purva Phalguni", pada: 1, globalPada: 41 }
  ],
  activeNakshatras: [5, 6, 7, 8, 11, 12, 17, 24, 26],
  activePadas: [18, 23, 28, 32, 41, 46, 67, 95, 102],
  panchanga: {
    tithi: "Pratipada",
    vara: "Wednesday",
    yoga: "Siddhi",
    karana: "Bava",
    lunarNakshatra: "Anuradha"
  }
};

let app = null;

if (typeof window !== "undefined" && typeof document !== "undefined") {
  init();
}

export function createClockTimeSource(state = {}, options = {}) {
  const loadedAtMs = Number(options.loadedAtMs ?? Date.now());
  const datetime = typeof state.datetime === "string" && hasTimezoneOffset(state.datetime)
    ? new Date(state.datetime)
    : null;
  let baseDate = datetime && !Number.isNaN(datetime.getTime()) ? datetime : null;

  if (!baseDate && state.time) {
    baseDate = new Date(loadedAtMs);
    baseDate.setHours(Number(state.time.hour || 0), Number(state.time.minute || 0), Number(state.time.second || 0), 0);
  }

  if (!baseDate) baseDate = new Date(loadedAtMs);

  const baseDateMs = baseDate.getTime();
  return {
    baseDateMs,
    loadedAtMs,
    dateLabel: state.dateLabel || "",
    currentDate(nowMs = Date.now()) {
      return new Date(baseDateMs + (Number(nowMs) - loadedAtMs));
    },
    currentMs(nowMs = Date.now()) {
      return baseDateMs + (Number(nowMs) - loadedAtMs);
    }
  };
}

export function normalizeRefreshMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REFRESH_MS;
  return Math.max(MIN_REFRESH_MS, Math.trunc(parsed));
}

export function buildVedaClockRequestParams(params = new URLSearchParams(), options = {}) {
  const searchParams = normalizeSearchParams(params);
  const storage = options.storage === undefined ? getStorage() : options.storage;
  const savedLocation = readSavedLocation(storage);
  const requestParams = new URLSearchParams();

  const lat = firstValue(searchParams.get("lat"), savedLocation?.lat);
  const lon = firstValue(searchParams.get("lon"), savedLocation?.lon);
  const timezone = firstValue(searchParams.get("timezone"), savedLocation?.timezone, resolveBrowserTimezone(options));

  if (lat !== null && Number.isFinite(Number(lat))) requestParams.set("lat", String(lat));
  if (lon !== null && Number.isFinite(Number(lon))) requestParams.set("lon", String(lon));
  if (timezone) requestParams.set("timezone", String(timezone));

  ["ayanamsha", "lang", "datetime"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) requestParams.set(key, value);
  });

  return requestParams;
}

export function buildVedaClockApiUrl(params = new URLSearchParams(), options = {}) {
  const searchParams = normalizeSearchParams(params);
  if (searchParams.get("mock") === "1") return null;

  const requestParams = buildVedaClockRequestParams(searchParams, options);
  const base = normalizeApiBase(searchParams.get("apiBase") || options.apiBase);
  const query = requestParams.toString();
  return `${base}${VEDA_CLOCK_STATE_PATH}${query ? `?${query}` : ""}`;
}

export function buildVedaClockGrahasApiUrl(params = new URLSearchParams(), options = {}) {
  const searchParams = normalizeSearchParams(params);
  if (searchParams.get("mock") === "1") return null;

  const base = normalizeApiBase(searchParams.get("apiBase") || options.apiBase);
  const query = currentGrahasQuery(searchParams, options).toString();
  return `${base}${VEDA_CLOCK_GRAHAS_PATH}${query ? `?${query}` : ""}`;
}

export function validateVedaClockApiState(state) {
  const warnings = [];
  if (!state || typeof state !== "object") {
    return { valid: false, warnings: ["VedaClock API response is not an object."] };
  }

  if (typeof state.schemaVersion !== "string" || !state.schemaVersion.startsWith("veda-clock-state/")) {
    warnings.push("schemaVersion must start with veda-clock-state/.");
  }

  if (!Array.isArray(state.grahas)) {
    warnings.push("grahas must be an array.");
    return { valid: false, warnings };
  }

  const grahasByKey = new Map(state.grahas.map((graha) => [graha?.key, graha]));
  GRAHA_KEYS.forEach((key) => {
    const graha = grahasByKey.get(key);
    if (!graha) {
      warnings.push(`Missing required graha ${key}.`);
      return;
    }
    REQUIRED_STATE_GRAHA_FIELDS.forEach((field) => {
      if (graha[field] === undefined || graha[field] === null || graha[field] === "") {
        warnings.push(`Graha ${key} is missing ${field}.`);
      }
    });
    ["longitude", "rashi", "degreeInRashi", "nakshatra", "pada", "globalPada"].forEach((field) => {
      if (!Number.isFinite(Number(graha[field]))) {
        warnings.push(`Graha ${key} has invalid ${field}.`);
      }
    });
  });

  return { valid: warnings.length === 0, warnings };
}

export function extractGrahasFromApiResponse(response, warnings = []) {
  const rawGrahas = Array.isArray(response)
    ? response
    : response?.grahas || response?.planets || response?.data?.grahas || [];
  if (!Array.isArray(rawGrahas)) return [];

  const grahas = [];
  rawGrahas.forEach((graha, index) => {
    const longitude = readLongitude(graha);
    if (longitude === null) {
      warnings.push(`Skipped graha at index ${index}: missing sidereal longitude.`);
      return;
    }
    grahas.push({ ...graha, longitude });
  });

  const keys = new Set(grahas.map((graha) => normalizeGrahaKey(graha.key || graha.short || graha.code || graha.id || graha.name)).filter(Boolean));
  const missing = GRAHA_KEYS.filter((key) => !keys.has(key));
  if (missing.length) warnings.push(`Partial graha list: missing ${missing.join(", ")}.`);
  return grahas;
}

export function readCachedState(storage = getStorage()) {
  if (!storage) return { state: null, meta: null, warning: "localStorage is unavailable." };
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return { state: null, meta: null, warning: null };
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    if (!state || !Array.isArray(state.grahas)) {
      return { state: null, meta: null, warning: "Cached VedaClock state is incomplete." };
    }
    return {
      state,
      meta: {
        source: "cache",
        loadedAt: parsed.meta?.loadedAt || new Date().toISOString(),
        warnings: parsed.meta?.warnings || []
      },
      warning: null
    };
  } catch (_error) {
    return { state: null, meta: null, warning: "Cached VedaClock state is invalid JSON." };
  }
}

export function saveCachedState(state, meta, storage = getStorage()) {
  if (!storage || !["api-state", "api-grahas"].includes(meta?.source)) return false;
  storage.setItem(CACHE_KEY, JSON.stringify({ state, meta }));
  return true;
}

export function buildGrahasBridgeState(response) {
  const warnings = [];
  const grahas = extractGrahasFromApiResponse(response, warnings);
  const state = buildVedaClockState({
    datetime: inferDateTime(response),
    timezone: inferTimezone(response),
    grahas,
    panchanga: response?.panchanga || response?.data?.panchanga || {}
  });
  return { state, warnings };
}

export async function loadVedaClockPreviewState(options = {}) {
  const mockMode = Boolean(options.mockMode);
  const params = normalizeSearchParams(options.params || new URLSearchParams());
  const fetchJsonImpl = options.fetchJsonImpl || fetchJson;
  const storage = options.storage === undefined ? getStorage() : options.storage;

  if (mockMode) {
    try {
      return withMeta(await fetchJsonImpl("/docs/veda-clock-state.sample.json"), "sample");
    } catch (error) {
      console.warn("VedaClock sample state is unavailable; using embedded fallback.", error);
      return withMeta(FALLBACK_STATE, "embedded", ["Sample state could not be loaded."]);
    }
  }

  const warnings = [];
  try {
    return await loadApiState({ params, fetchJsonImpl, storage });
  } catch (error) {
    warnings.push(`State endpoint failed: ${error.message}`);
    console.warn("VedaClock state endpoint is unavailable; trying grahas endpoint.", error);
  }

  try {
    return await loadApiGrahasState({ params, fetchJsonImpl, storage });
  } catch (error) {
    warnings.push(`Grahas endpoint failed: ${error.message}`);
    console.warn("VedaClock grahas endpoint is unavailable; trying cached state.", error);
  }

  const cached = readCachedState(storage);
  if (cached.state) {
    return { state: cached.state, meta: { ...cached.meta, warnings: [...(cached.meta?.warnings || []), ...warnings] } };
  }
  if (cached.warning) warnings.push(cached.warning);

  warnings.push("Embedded fallback is active.");
  return withMeta(FALLBACK_STATE, "embedded", warnings);
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const root = document.querySelector("[data-veda-clock-root]");
  const debug = document.querySelector("[data-veda-clock-debug]");
  const mockMode = params.get("mock") === "1";

  app = {
    params,
    root,
    debug,
    mockMode,
    state: null,
    meta: null,
    timeSource: null,
    svg: null,
    refreshTimer: null,
    handTimer: null
  };

  const loaded = await loadVedaClockPreviewState({ mockMode, params });
  applyState(loaded.state, loaded.meta);

  app.handTimer = window.setInterval(updateHands, 1000);
  if (!mockMode) {
    app.refreshTimer = window.setInterval(refreshApiState, normalizeRefreshMs(params.get("refreshMs")));
  }

  exposeExportFunctions();
}

async function refreshApiState() {
  try {
    let loaded;
    try {
      loaded = await loadApiState({ params: app.params });
    } catch (stateError) {
      console.warn("VedaClock state refresh failed; trying grahas endpoint.", stateError);
      loaded = await loadApiGrahasState({ params: app.params });
    }
    applyState(loaded.state, loaded.meta);
  } catch (error) {
    console.warn("VedaClock refresh failed; keeping current state.", error);
  }
}

async function loadApiState({ params = new URLSearchParams(), fetchJsonImpl = fetchJson, storage = getStorage() } = {}) {
  const requestUrl = buildVedaClockApiUrl(params, { storage });
  if (!requestUrl) throw new Error("State endpoint is disabled in mock mode.");

  const state = await fetchJsonImpl(requestUrl);
  const validation = validateVedaClockApiState(state);
  if (!validation.valid) throw new Error(validation.warnings.join(" "));

  const loaded = withMeta(state, "api-state", validation.warnings, { requestUrl });
  saveCachedState(loaded.state, loaded.meta, storage);
  return loaded;
}

async function loadApiGrahasState({ params = new URLSearchParams(), fetchJsonImpl = fetchJson, storage = getStorage() } = {}) {
  const requestUrl = buildVedaClockGrahasApiUrl(params, { storage });
  if (!requestUrl) throw new Error("Grahas endpoint is disabled in mock mode.");

  const response = await fetchJsonImpl(requestUrl);
  const { state, warnings } = buildGrahasBridgeState(response);
  const loaded = withMeta(state, "api-grahas", warnings, { requestUrl });
  saveCachedState(loaded.state, loaded.meta, storage);
  return loaded;
}

function applyState(nextState, nextMeta) {
  app.state = nextState;
  app.meta = nextMeta;
  app.timeSource = createClockTimeSource(nextState);
  app.svg = renderVedaClock(app.root, nextState, { now: app.timeSource.currentDate() });
  updateDebug();
}

function updateHands() {
  if (!app?.svg || !app.timeSource) return;
  updateVedaClockHands(app.svg, app.timeSource.currentDate(), app.state);
}

function updateDebug() {
  if (!app.debug || app.params.get("debug") !== "1") return;
  app.debug.hidden = false;
  app.debug.replaceChildren(
    debugLine("source", app.meta?.source),
    debugLine("loadedAt", app.meta?.loadedAt),
    debugLine("requestUrl", app.meta?.requestUrl),
    debugLine("datetime", app.state?.datetime),
    debugLine("timezone", app.state?.timezone),
    debugLine("calculationInstantUtc", app.state?.calculationInstantUtc),
    debugLine("activeNakshatras", (app.state?.activeNakshatras || []).join(", ")),
    debugLine("activePadas", (app.state?.activePadas || []).join(", ")),
    debugLine("warnings", (app.meta?.warnings || []).join(" | ") || "none"),
    debugActions()
  );
}

function debugLine(label, value) {
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  row.append(strong, document.createTextNode(value || ""));
  return row;
}

function debugActions() {
  const actions = document.createElement("div");
  actions.className = "veda-clock-debug-actions";
  const svgButton = document.createElement("button");
  svgButton.type = "button";
  svgButton.textContent = "Export SVG";
  svgButton.addEventListener("click", () => window.vedaClockExportSvg());
  const pngButton = document.createElement("button");
  pngButton.type = "button";
  pngButton.textContent = "Export PNG";
  pngButton.addEventListener("click", () => window.vedaClockExportPng());
  actions.append(svgButton, pngButton);
  return actions;
}

function exposeExportFunctions() {
  window.vedaClockExportSvg = () => {
    updateHands();
    return exportVedaClockSvg(app.svg, { dateLabel: app.state?.dateLabel, date: app.state?.datetime });
  };
  window.vedaClockExportPng = () => {
    updateHands();
    return exportVedaClockPng(app.svg, { dateLabel: app.state?.dateLabel, date: app.state?.datetime });
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function withMeta(state, source, warnings = [], extra = {}) {
  return {
    state,
    meta: {
      source,
      loadedAt: new Date().toISOString(),
      warnings,
      ...extra
    }
  };
}

function currentGrahasQuery(params = new URLSearchParams(), options = {}) {
  const searchParams = normalizeSearchParams(params);
  const requestParams = buildVedaClockRequestParams(searchParams, options);
  const datetime = parseRequestDate(searchParams.get("datetime"));
  const now = datetime || new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const grahasParams = new URLSearchParams({ date, time });

  REQUEST_PARAM_KEYS.forEach((key) => {
    const value = requestParams.get(key);
    if (value) grahasParams.set(key, value);
  });
  if (requestParams.get("timezone")) grahasParams.set("tz", requestParams.get("timezone"));

  return grahasParams;
}

function readLongitude(source) {
  if (!source || typeof source !== "object") return null;
  for (const field of LONGITUDE_FIELDS) {
    if (Number.isFinite(Number(source[field]))) return Number(source[field]);
  }
  return null;
}

function inferDateTime(response) {
  const datetime = response?.datetime || response?.input || response?.data?.datetime || {};
  if (typeof datetime === "string") return datetime;
  if (datetime.date && datetime.time) return `${datetime.date}T${normalizeTime(datetime.time)}`;
  return new Date().toISOString();
}

function inferTimezone(response) {
  return response?.datetime?.timezone
    || response?.input?.timezone
    || response?.location?.timezone
    || response?.data?.datetime?.timezone
    || response?.data?.location?.timezone
    || "Europe/Moscow";
}

function normalizeTime(value) {
  const parts = String(value || "00:00:00").split(":");
  return `${(parts[0] || "00").padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}:${(parts[2] || "00").padStart(2, "0")}`;
}

function hasTimezoneOffset(value) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function normalizeSearchParams(params) {
  if (params instanceof URLSearchParams) return params;
  return new URLSearchParams(params || "");
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function resolveBrowserTimezone(options = {}) {
  if (options.timezone) return options.timezone;
  if (options.intlTimeZone) return options.intlTimeZone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (_error) {
    return null;
  }
}

function readSavedLocation(storage = getStorage()) {
  if (!storage) return null;
  for (const key of SAVED_LOCATION_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const normalized = normalizeSavedLocation(parsed);
      if (normalized) return normalized;
    } catch (_error) {
      // Ignore stale or unrelated localStorage entries.
    }
  }
  return null;
}

function normalizeSavedLocation(value) {
  const location = value?.location || value?.activeLocation || value;
  const lat = location?.lat ?? location?.latitude;
  const lon = location?.lon ?? location?.lng ?? location?.longitude;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
  return {
    lat: String(lat),
    lon: String(lon),
    timezone: location?.timezone ? String(location.timezone) : null
  };
}

function parseRequestDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (_error) {
    return null;
  }
}
