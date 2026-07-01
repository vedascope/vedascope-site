#!/usr/bin/env node

import { validateVedaClockApiState } from "../assets/js/veda-clock-preview.mjs";

const REQUIRED_GRAHAS = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];
const DEFAULT_PARAMS = {
  lat: "55.7558",
  lon: "37.6173",
  timezone: "Europe/Moscow",
  ayanamsha: "lahiri",
  lang: "ru"
};

async function main() {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error("Usage: node scripts/veda-clock-smoke.mjs http://127.0.0.1:8000");
    process.exit(2);
  }

  const requestUrl = buildRequestUrl(baseUrl);
  console.log(`VedaClock smoke: ${requestUrl}`);

  const response = await fetch(requestUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Endpoint returned HTTP ${response.status}`);
  }

  const state = await response.json();
  const validation = validateVedaClockApiState(state);
  const failures = [...validation.warnings];

  if (!Array.isArray(state.activeNakshatras)) failures.push("activeNakshatras must be an array.");
  if (!Array.isArray(state.activePadas)) failures.push("activePadas must be an array.");

  const keys = new Set((state.grahas || []).map((graha) => graha.key));
  REQUIRED_GRAHAS.forEach((key) => {
    if (!keys.has(key)) failures.push(`Missing ${key}.`);
  });

  if (failures.length) {
    throw new Error(`Invalid VedaClockState:\n- ${failures.join("\n- ")}`);
  }

  console.log(`OK: ${state.grahas.length} grahas, ${state.activeNakshatras.length} nakshatras, ${state.activePadas.length} padas.`);
  console.log(`datetime: ${state.datetime}`);
  console.log(`timezone: ${state.timezone}`);
  if (state.calculationInstantUtc) console.log(`calculationInstantUtc: ${state.calculationInstantUtc}`);
}

function buildRequestUrl(baseUrl) {
  const url = new URL("/api/v1/veda-clock/state", ensureUrlBase(baseUrl));
  Object.entries(DEFAULT_PARAMS).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function ensureUrlBase(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
