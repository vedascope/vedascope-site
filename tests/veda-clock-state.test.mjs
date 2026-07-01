import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVedaClockState,
  deriveVedaClockGraha,
  normalize360
} from "../assets/js/veda-clock-state.mjs";

test("longitude 0 maps to first rashi, nakshatra, global pada and pada", () => {
  const graha = deriveVedaClockGraha("Su", 0);

  assert.equal(graha.longitude, 0);
  assert.equal(graha.rashi, 1);
  assert.equal(graha.nakshatra, 1);
  assert.equal(graha.globalPada, 1);
  assert.equal(graha.pada, 1);
});

test("longitude 30 maps to second rashi", () => {
  const graha = deriveVedaClockGraha("Mo", 30);

  assert.equal(graha.rashi, 2);
  assert.equal(graha.degreeInRashi, 0);
});

test("longitude 13 degrees 20 minutes transitions to second nakshatra", () => {
  const graha = deriveVedaClockGraha("Ma", 40 / 3);

  assert.equal(graha.nakshatra, 2);
});

test("longitude 3 degrees 20 minutes transitions to second global pada", () => {
  const graha = deriveVedaClockGraha("Me", 10 / 3);

  assert.equal(graha.globalPada, 2);
  assert.equal(graha.pada, 2);
});

test("longitude 359.999 maps to final rashi, nakshatra and global pada", () => {
  const graha = deriveVedaClockGraha("Ju", 359.999);

  assert.equal(graha.rashi, 12);
  assert.equal(graha.nakshatra, 27);
  assert.equal(graha.globalPada, 108);
});

test("longitude 360 normalizes to 0", () => {
  const graha = deriveVedaClockGraha("Ve", 360);

  assert.equal(normalize360(360), 0);
  assert.equal(graha.longitude, 0);
  assert.equal(graha.rashi, 1);
  assert.equal(graha.nakshatra, 1);
  assert.equal(graha.globalPada, 1);
});

test("active nakshatras and padas are unique", () => {
  const state = buildVedaClockState({
    datetime: "2026-07-01T10:08:00",
    timezone: "Europe/Moscow",
    grahas: [
      { key: "sun", longitude: 0 },
      { key: "moon", longitude: 1 },
      { key: "mars", longitude: 40 / 3 },
      { key: "mercury", longitude: 40 / 3 }
    ]
  });

  assert.deepEqual(state.activeNakshatras, [1, 2]);
  assert.deepEqual(state.activePadas, [1, 5]);
});

test("buildVedaClockState maps panchanga summary and datetime fields", () => {
  const state = buildVedaClockState({
    datetime: "2026-07-01T10:08:00",
    timezone: "Europe/Moscow",
    grahaResponse: {
      grahas: [
        { key: "sun", longitude: 74.2 },
        { key: "moon", longitude: 230.5 }
      ]
    },
    panchanga: {
      tithi: { data: { display: "Pratipada" } },
      vara: { data: { ru: "Wednesday" } },
      vedic_yoga: { ru: "Siddhi" },
      karana: { ru: "Bava" },
      nakshatra: { data: { en: "Anuradha" } }
    }
  });

  assert.equal(state.dateLabel, "01.07.26");
  assert.deepEqual(state.time, { hour: 10, minute: 8, second: 0 });
  assert.equal(state.grahas[0].key, "Su");
  assert.equal(state.grahas[1].key, "Mo");
  assert.deepEqual(state.panchanga, {
    tithi: "Pratipada",
    vara: "Wednesday",
    yoga: "Siddhi",
    karana: "Bava",
    lunarNakshatra: "Anuradha"
  });
});
