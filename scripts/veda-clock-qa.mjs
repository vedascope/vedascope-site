#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { deriveVedaClockGraha, GRAHA_KEYS } from "../assets/js/veda-clock-state.mjs";

const TOLERANCE = 1e-6;
const DEFAULT_BASE_URL = "https://vedascope.ru";

const QA_CASES = [
  {
    name: "Moscow now",
    params: { lat: "55.7558", lon: "37.6173", timezone: "Europe/Moscow" }
  },
  {
    name: "Amsterdam now",
    params: { lat: "52.3676", lon: "4.9041", timezone: "Europe/Amsterdam" }
  },
  {
    name: "Delhi now",
    params: { lat: "28.6139", lon: "77.2090", timezone: "Asia/Kolkata" }
  },
  {
    name: "Fixed datetime with offset",
    params: {
      datetime: "2026-07-01T10:08:00+03:00",
      lat: "55.7558",
      lon: "37.6173",
      timezone: "Europe/Moscow"
    }
  },
  {
    name: "Fixed datetime without offset",
    params: {
      datetime: "2026-07-01T10:08:00",
      lat: "55.7558",
      lon: "37.6173",
      timezone: "Europe/Moscow"
    }
  }
];

const BOUNDARY_CASES = [0, 13.333333333, 30, 359.999999];

export async function runVedaClockQa(baseUrl = DEFAULT_BASE_URL, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const results = [];

  results.push(validateBoundaryCases());

  for (const qaCase of QA_CASES) {
    const url = buildStateUrl(baseUrl, qaCase.params);
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      results.push({
        name: qaCase.name,
        passed: false,
        errors: [`HTTP ${response.status}`],
        url
      });
      continue;
    }

    const state = await response.json();
    const validation = validateVedaClockStateForQa(state);
    results.push({
      name: qaCase.name,
      passed: validation.errors.length === 0,
      errors: validation.errors,
      state,
      url
    });
  }

  return results;
}

export function validateVedaClockStateForQa(state, options = {}) {
  const requireSchema = options.requireSchema !== false;
  const requireCalculationInstant = options.requireCalculationInstant !== false;
  const errors = [];

  if (!state || typeof state !== "object") {
    return { errors: ["State is not an object."] };
  }

  if (requireSchema && (typeof state.schemaVersion !== "string" || !state.schemaVersion.startsWith("veda-clock-state/"))) {
    errors.push("schemaVersion must start with veda-clock-state/.");
  }

  if (!Array.isArray(state.grahas)) {
    errors.push("grahas must be an array.");
    return { errors };
  }

  const grahasByKey = new Map(state.grahas.map((graha) => [graha?.key, graha]));
  GRAHA_KEYS.forEach((key) => {
    if (!grahasByKey.has(key)) errors.push(`Missing graha ${key}.`);
  });

  state.grahas.forEach((graha) => validateGraha(graha, errors));
  validateActiveSegments(state, errors);
  validateDateAndTime(state, errors);

  if (requireCalculationInstant && typeof state.calculationInstantUtc !== "string") {
    errors.push("calculationInstantUtc is missing.");
  }

  return { errors };
}

export function validateBoundaryCases() {
  const errors = [];
  BOUNDARY_CASES.forEach((longitude) => {
    const derived = deriveVedaClockGraha("Su", longitude);
    validateGraha(derived, errors, `boundary ${longitude}`);
  });

  const zero = deriveVedaClockGraha("Su", 0);
  const thirty = deriveVedaClockGraha("Su", 30);
  const final = deriveVedaClockGraha("Su", 359.999999);

  if (zero.rashi !== 1 || zero.nakshatra !== 1 || zero.globalPada !== 1) {
    errors.push("boundary 0 should map to rashi 1, nakshatra 1, globalPada 1.");
  }
  if (thirty.rashi !== 2) errors.push("boundary 30 should map to rashi 2.");
  if (final.rashi !== 12 || final.nakshatra !== 27 || final.globalPada !== 108) {
    errors.push("boundary 359.999999 should map to rashi 12, nakshatra 27, globalPada 108.");
  }

  return {
    name: "Boundary helper tests",
    passed: errors.length === 0,
    errors,
    boundaries: BOUNDARY_CASES.map((longitude) => deriveVedaClockGraha("Su", longitude))
  };
}

export function buildStateUrl(baseUrl, params = {}) {
  const url = new URL("/api/v1/veda-clock/state", ensureUrlBase(baseUrl));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function validateGraha(graha, errors, label = graha?.key || "graha") {
  if (!graha || typeof graha !== "object") {
    errors.push(`${label} is not an object.`);
    return;
  }

  const longitude = Number(graha.longitude);
  if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360) {
    errors.push(`${label} longitude must be 0 <= longitude < 360.`);
    return;
  }

  const expected = expectedDerived(longitude);
  if (Number(graha.rashi) !== expected.rashi) errors.push(`${label} rashi mismatch.`);
  if (!approx(Number(graha.degreeInRashi), expected.degreeInRashi)) errors.push(`${label} degreeInRashi mismatch.`);
  if (Number(graha.nakshatra) !== expected.nakshatra) errors.push(`${label} nakshatra mismatch.`);
  if (Number(graha.globalPada) !== expected.globalPada) errors.push(`${label} globalPada mismatch.`);
  if (Number(graha.pada) !== expected.pada) errors.push(`${label} pada mismatch.`);
  if (!graha.nakshatraName) errors.push(`${label} nakshatraName is missing.`);
}

function expectedDerived(longitude) {
  const globalPada = Math.floor(longitude / (360 / 108)) + 1;
  return {
    rashi: Math.floor(longitude / 30) + 1,
    degreeInRashi: longitude % 30,
    nakshatra: Math.floor(longitude / (360 / 27)) + 1,
    globalPada,
    pada: ((globalPada - 1) % 4) + 1
  };
}

function validateActiveSegments(state, errors) {
  const nakshatras = uniqueSorted(state.grahas.map((graha) => Number(graha.nakshatra)));
  const padas = uniqueSorted(state.grahas.map((graha) => Number(graha.globalPada)));

  if (!arraysEqual(uniqueSorted(state.activeNakshatras || []), nakshatras)) {
    errors.push("activeNakshatras must equal unique graha nakshatras.");
  }
  if (!arraysEqual(uniqueSorted(state.activePadas || []), padas)) {
    errors.push("activePadas must equal unique graha globalPadas.");
  }
}

function validateDateAndTime(state, errors) {
  const match = String(state.datetime || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    errors.push("datetime must include local date and time.");
    return;
  }

  const expectedDateLabel = `${match[3]}.${match[2]}.${match[1].slice(2)}`;
  if (state.dateLabel !== expectedDateLabel) errors.push("dateLabel does not match datetime local date.");

  const expectedTime = { hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6] || 0) };
  if (!state.time || Number(state.time.hour) !== expectedTime.hour || Number(state.time.minute) !== expectedTime.minute || Number(state.time.second) !== expectedTime.second) {
    errors.push("time does not match datetime local time.");
  }
}

function uniqueSorted(values) {
  return [...new Set((values || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function arraysEqual(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function approx(first, second) {
  return Math.abs(first - second) <= TOLERANCE;
}

function ensureUrlBase(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function printResult(result) {
  const status = result.passed ? "PASS" : "FAIL";
  console.log(`\n${status} ${result.name}`);
  if (result.url) console.log(`url: ${result.url}`);
  if (result.state) {
    console.log(`datetime: ${result.state.datetime}`);
    console.log(`timezone: ${result.state.timezone}`);
    console.log(`calculationInstantUtc: ${result.state.calculationInstantUtc}`);
    console.log("grahas:");
    result.state.grahas.forEach((graha) => {
      console.log(`  ${graha.key} ${graha.longitude} r${graha.rashi} ${graha.degreeInRashi}° n${graha.nakshatra} p${graha.pada} gp${graha.globalPada}`);
    });
  }
  if (result.boundaries) {
    result.boundaries.forEach((graha) => {
      console.log(`  ${graha.longitude} -> r${graha.rashi} n${graha.nakshatra} p${graha.pada} gp${graha.globalPada}`);
    });
  }
  result.errors.forEach((error) => console.log(`  error: ${error}`));
}

async function main() {
  const baseUrl = process.argv[2] || DEFAULT_BASE_URL;
  const results = await runVedaClockQa(baseUrl);
  results.forEach(printResult);

  const failed = results.filter((result) => !result.passed);
  console.log(`\n${failed.length ? "FAIL" : "PASS"} VedaClock QA: ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
