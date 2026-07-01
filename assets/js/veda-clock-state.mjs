export const GRAHA_KEYS = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

export const NAKSHATRA_NAMES = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati"
];

const GRAHA_KEY_ALIASES = new Map([
  ["su", "Su"],
  ["sun", "Su"],
  ["surya", "Su"],
  ["mo", "Mo"],
  ["moon", "Mo"],
  ["chandra", "Mo"],
  ["ma", "Ma"],
  ["mars", "Ma"],
  ["mangala", "Ma"],
  ["me", "Me"],
  ["mercury", "Me"],
  ["budha", "Me"],
  ["ju", "Ju"],
  ["jupiter", "Ju"],
  ["guru", "Ju"],
  ["ve", "Ve"],
  ["venus", "Ve"],
  ["shukra", "Ve"],
  ["sa", "Sa"],
  ["saturn", "Sa"],
  ["shani", "Sa"],
  ["ra", "Ra"],
  ["rahu", "Ra"],
  ["ke", "Ke"],
  ["ketu", "Ke"]
]);

const LONGITUDE_FIELDS = [
  "longitude",
  "siderealLongitude",
  "sidereal_longitude",
  "siderealLongitudeDeg",
  "sidereal_longitude_deg",
  "longitudeDeg",
  "longitude_deg"
];

const EPSILON = 1e-10;
const NAKSHATRA_SIZE = 360 / 27;
const PADA_SIZE = 360 / 108;

/**
 * @typedef {"Su" | "Mo" | "Ma" | "Me" | "Ju" | "Ve" | "Sa" | "Ra" | "Ke"} GrahaKey
 *
 * @typedef {object} VedaClockGraha
 * @property {GrahaKey} key
 * @property {number} longitude 0..360 sidereal longitude
 * @property {number} rashi 1..12
 * @property {number} degreeInRashi 0..30
 * @property {number} nakshatra 1..27
 * @property {string} nakshatraName
 * @property {number} pada 1..4 inside nakshatra
 * @property {number} globalPada 1..108
 *
 * @typedef {object} VedaClockState
 * @property {string} datetime
 * @property {string} timezone
 * @property {string} dateLabel
 * @property {{ hour: number, minute: number, second: number }} time
 * @property {VedaClockGraha[]} grahas
 * @property {number[]} activeNakshatras
 * @property {number[]} activePadas
 * @property {{ tithi?: string, vara?: string, yoga?: string, karana?: string, lunarNakshatra?: string }} [panchanga]
 */

export function normalize360(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new TypeError(`Longitude must be a finite number, received ${value}`);
  }
  return roundDegree(((numberValue % 360) + 360) % 360);
}

export function deriveVedaClockGraha(key, rawLongitude) {
  const normalizedKey = normalizeGrahaKey(key);
  if (!normalizedKey) {
    throw new TypeError(`Unsupported graha key: ${key}`);
  }

  const longitude = normalize360(rawLongitude);
  const rashi = Math.floor((longitude + EPSILON) / 30) + 1;
  const nakshatra = Math.floor((longitude + EPSILON) / NAKSHATRA_SIZE) + 1;
  const globalPada = Math.floor((longitude + EPSILON) / PADA_SIZE) + 1;

  return {
    key: normalizedKey,
    longitude,
    rashi: Math.min(rashi, 12),
    degreeInRashi: roundDegree(longitude % 30),
    nakshatra: Math.min(nakshatra, 27),
    nakshatraName: NAKSHATRA_NAMES[Math.min(nakshatra, 27) - 1],
    pada: ((Math.min(globalPada, 108) - 1) % 4) + 1,
    globalPada: Math.min(globalPada, 108)
  };
}

export function buildVedaClockState(params = {}) {
  const panchanga = params.panchanga || {};
  const datetime = normalizeDatetime(params.datetime, params.date, params.time, panchanga);
  const timezone = normalizeTimezone(params.timezone, panchanga);
  const grahas = extractGrahaInputs(params, panchanga)
    .map((graha) => deriveVedaClockGraha(graha.key, graha.longitude))
    .sort((first, second) => GRAHA_KEYS.indexOf(first.key) - GRAHA_KEYS.indexOf(second.key));

  return {
    datetime,
    timezone,
    dateLabel: params.dateLabel || formatDateLabel(datetime),
    time: parseTime(datetime),
    grahas,
    activeNakshatras: uniqueNumbers(grahas.map((graha) => graha.nakshatra)),
    activePadas: uniqueNumbers(grahas.map((graha) => graha.globalPada)),
    panchanga: extractPanchangaSummary(panchanga)
  };
}

export function normalizeGrahaKey(value) {
  if (typeof value !== "string") return null;
  return GRAHA_KEY_ALIASES.get(value.trim().toLowerCase()) || null;
}

function extractGrahaInputs(params, panchanga) {
  const candidates = [
    params.grahas,
    params.grahaResponse?.grahas,
    params.grahasResponse?.grahas,
    panchanga.grahas,
    panchanga.planets
  ];
  const inputs = [];

  candidates.filter(Array.isArray).forEach((grahas) => {
    grahas.forEach((graha) => {
      const key = normalizeGrahaKey(graha.key || graha.short || graha.code || graha.id || graha.name);
      const longitude = readLongitude(graha);
      if (key && longitude !== null) inputs.push({ key, longitude });
    });
  });

  // TODO: Current audited /api/panchanga exposes Moon data but not all graha longitudes.
  // Remove this fallback after the calculation backend returns Su..Ke in panchanga or /api/grahas.
  const moonLongitude = readMoonLongitude(panchanga);
  if (moonLongitude !== null && !inputs.some((graha) => graha.key === "Mo")) {
    inputs.push({ key: "Mo", longitude: moonLongitude });
  }

  const byKey = new Map();
  inputs.forEach((graha) => {
    if (!byKey.has(graha.key)) byKey.set(graha.key, graha);
  });
  return [...byKey.values()];
}

function readLongitude(source) {
  if (!source || typeof source !== "object") return null;
  for (const field of LONGITUDE_FIELDS) {
    if (Number.isFinite(Number(source[field]))) return Number(source[field]);
  }
  return null;
}

function readMoonLongitude(panchanga) {
  const moonSources = [
    panchanga.moon,
    panchanga.moon?.data,
    panchanga.lunar,
    panchanga.lunar?.data,
    { longitude: panchanga.moon_longitude },
    { longitude: panchanga.moonLongitude },
    { longitude: panchanga.moon_sidereal_longitude },
    { longitude: panchanga.moonSiderealLongitude }
  ];
  for (const source of moonSources) {
    const longitude = readLongitude(source);
    if (longitude !== null) return longitude;
  }
  return null;
}

function normalizeDatetime(datetime, date, time, panchanga) {
  if (datetime) return String(datetime);
  const input = panchanga.input || panchanga.datetime || {};
  const dateValue = date || input.date || panchanga.date || "";
  const timeValue = time || input.time || panchanga.calculation_time_local || "00:00:00";
  if (dateValue) return `${dateValue}T${normalizeTimeString(timeValue)}`;
  return new Date().toISOString();
}

function normalizeTimezone(timezone, panchanga) {
  const value = timezone
    || panchanga.input?.timezone
    || panchanga.location?.timezone
    || panchanga.tz
    || panchanga.timezone
    || "UTC";
  return String(value);
}

function normalizeTimeString(value) {
  const parts = String(value || "00:00:00").split(":");
  const hour = parts[0] || "00";
  const minute = parts[1] || "00";
  const second = parts[2] || "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
}

function parseTime(datetime) {
  const match = String(datetime).match(/T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  return {
    hour: Number(match?.[1] || 0),
    minute: Number(match?.[2] || 0),
    second: Number(match?.[3] || 0)
  };
}

function formatDateLabel(datetime) {
  const match = String(datetime).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${match[3]}.${match[2]}.${match[1].slice(2)}`;
}

function extractPanchangaSummary(panchanga) {
  const summary = {
    tithi: readDisplayValue(panchanga.tithi),
    vara: readDisplayValue(panchanga.vara),
    yoga: readDisplayValue(panchanga.vedic_yoga || panchanga.yoga),
    karana: readDisplayValue(panchanga.karana),
    lunarNakshatra: readDisplayValue(panchanga.nakshatra || panchanga.lunarNakshatra)
  };
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value));
}

function readDisplayValue(source) {
  if (!source) return undefined;
  if (typeof source === "string") return source;
  const data = source.data || source;
  return data.display || data.ru || data.en || data.name || undefined;
}

function uniqueNumbers(values) {
  return [...new Set(values)].sort((first, second) => first - second);
}

function roundDegree(value) {
  return Number(Number(value).toFixed(12));
}
