import { NAKSHATRA_NAMES } from "./veda-clock-state.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 1000;
const CENTER = VIEWBOX_SIZE / 2;

export const defaultTheme = {
  background: "#F8F3EA",
  surface: "#FFFDF8",
  line: "#B9924D",
  lineSoft: "#E8DCC6",
  text: "#7A6548",
  textSoft: "#B4A58A",
  activeNakshatra: "#EEE1BF",
  activePada: "#D8B15F",
  hand: "#B88A3D",
  secondHand: "#9B6E2F",
  grahas: {
    Su: "#A77A18",
    Mo: "#767B84",
    Ma: "#A33E34",
    Me: "#35765B",
    Ju: "#C07628",
    Ve: "#7B5A9B",
    Sa: "#284D78",
    Ra: "#7A563A",
    Ke: "#22211F"
  }
};

export const southIndianRashiCells = {
  12: { col: 0, row: 0 },
  1: { col: 1, row: 0 },
  2: { col: 2, row: 0 },
  3: { col: 3, row: 0 },
  11: { col: 0, row: 1 },
  4: { col: 3, row: 1 },
  10: { col: 0, row: 2 },
  5: { col: 3, row: 2 },
  9: { col: 0, row: 3 },
  8: { col: 1, row: 3 },
  7: { col: 2, row: 3 },
  6: { col: 3, row: 3 }
};

const NAKSHATRA_ABBR = [
  "Ash", "Bha", "Kri", "Roh", "Mrg", "Ard", "Pun", "Pus", "Ashl",
  "Mag", "PPh", "UPh", "Has", "Chi", "Swa", "Vis", "Anu", "Jye",
  "Mul", "PAsh", "UAsh", "Shr", "Dha", "Sha", "PBh", "UBh", "Rev"
];

export function normalizeSegmentIndex(index, count) {
  if (!Number.isFinite(Number(index)) || !Number.isFinite(Number(count)) || Number(count) <= 0) {
    throw new TypeError("Segment index and count must be finite numbers.");
  }
  return ((Math.trunc(Number(index)) % Number(count)) + Number(count)) % Number(count);
}

export function pointOnSquare(t, inset = 0) {
  const normalized = ((Number(t) % 1) + 1) % 1;
  const min = Number(inset);
  const max = VIEWBOX_SIZE - Number(inset);
  const side = max - min;
  const progress = normalized * 4;

  if (progress <= 1) return { x: min + side * progress, y: min };
  if (progress <= 2) return { x: max, y: min + side * (progress - 1) };
  if (progress <= 3) return { x: max - side * (progress - 2), y: max };
  return { x: min, y: max - side * (progress - 3) };
}

export function squareRingSegmentPath(index, count, outerInset, innerInset) {
  const current = normalizeSegmentIndex(index, count);
  const start = current / count;
  const end = (current + 1) / count;
  const outerPoints = squarePerimeterPoints(start, end, outerInset);
  const innerPoints = squarePerimeterPoints(start, end, innerInset).reverse();

  return [
    `M ${formatPoint(outerPoints[0])}`,
    ...outerPoints.slice(1).map((point) => `L ${formatPoint(point)}`),
    ...innerPoints.map((point) => `L ${formatPoint(point)}`),
    "Z"
  ].join(" ");
}

export function getActiveNakshatras(state = {}) {
  return new Set((state.activeNakshatras ?? (state.grahas || []).map((graha) => graha.nakshatra))
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 27));
}

export function getActivePadas(state = {}) {
  return new Set((state.activePadas ?? (state.grahas || []).map((graha) => graha.globalPada))
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 108));
}

export function createVedaClockSvg(state, options = {}) {
  const theme = { ...defaultTheme, ...(options.theme || {}) };
  const svg = svgEl("svg", {
    xmlns: SVG_NS,
    viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
    width: "100%",
    height: "100%",
    role: "img",
    "aria-label": "VedaScope Clock preview"
  });
  svg.dataset.vedaClockSvg = "true";

  renderBackground(svg, theme);
  renderPadaRing(svg, state, theme);
  renderNakshatraRing(svg, state, theme);
  renderSouthIndianChart(svg, state, theme);
  renderCenterClock(svg, state, theme, options);

  return svg;
}

export function renderVedaClock(containerOrSvg, state, options = {}) {
  if (!containerOrSvg) throw new TypeError("A container or SVG node is required.");
  const svg = createVedaClockSvg(state, options);

  if (typeof SVGElement !== "undefined" && containerOrSvg instanceof SVGElement && containerOrSvg.tagName.toLowerCase() === "svg") {
    containerOrSvg.replaceWith(svg);
    return svg;
  }

  containerOrSvg.replaceChildren(svg);
  return svg;
}

function renderBackground(svg, theme) {
  const defs = svgEl("defs");
  const shadow = svgEl("filter", { id: "vedaClockSoftShadow", x: "-10%", y: "-10%", width: "120%", height: "120%" });
  shadow.append(svgEl("feDropShadow", {
    dx: "0",
    dy: "18",
    stdDeviation: "18",
    "flood-color": "#8A7352",
    "flood-opacity": "0.13"
  }));
  defs.append(shadow);
  svg.append(defs);
  svg.append(svgEl("rect", { x: 0, y: 0, width: VIEWBOX_SIZE, height: VIEWBOX_SIZE, fill: theme.background }));
  svg.append(svgEl("rect", {
    x: 70,
    y: 70,
    width: 860,
    height: 860,
    rx: 22,
    fill: theme.surface,
    stroke: theme.lineSoft,
    "stroke-width": 1.5,
    filter: "url(#vedaClockSoftShadow)"
  }));
}

function renderPadaRing(svg, state, theme) {
  const group = svgEl("g", { "data-layer": "padas" });
  const activePadas = getActivePadas(state);
  for (let index = 0; index < 108; index += 1) {
    const number = index + 1;
    const isActive = activePadas.has(number);
    group.append(svgEl("path", {
      d: squareRingSegmentPath(index, 108, 94, 128),
      fill: isActive ? theme.activePada : theme.surface,
      stroke: isActive ? theme.line : theme.lineSoft,
      "stroke-width": isActive ? 1.15 : 0.45,
      opacity: isActive ? 0.72 : 0.3,
      "data-pada": String(number),
      "data-active": String(isActive)
    }));
  }
  svg.append(group);
}

function renderNakshatraRing(svg, state, theme) {
  const group = svgEl("g", { "data-layer": "nakshatras" });
  const activeNakshatras = getActiveNakshatras(state);
  for (let index = 0; index < 27; index += 1) {
    const number = index + 1;
    const isActive = activeNakshatras.has(number);
    group.append(svgEl("path", {
      d: squareRingSegmentPath(index, 27, 130, 214),
      fill: isActive ? theme.activeNakshatra : "transparent",
      stroke: isActive ? theme.line : theme.lineSoft,
      "stroke-width": isActive ? 1.1 : 0.65,
      opacity: isActive ? 0.86 : 0.52,
      "data-nakshatra": String(number),
      "data-active": String(isActive)
    }));

    const labelPoint = pointOnSquare((index + 0.5) / 27, 172);
    group.append(svgEl("text", {
      x: labelPoint.x,
      y: labelPoint.y,
      class: "veda-clock-nakshatra-label",
      fill: isActive ? theme.text : theme.textSoft,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": isActive ? 14 : 12,
      "data-nakshatra-label": NAKSHATRA_NAMES[index] || ""
    }, NAKSHATRA_ABBR[index]));
  }
  svg.append(group);
}

function renderSouthIndianChart(svg, state, theme) {
  const group = svgEl("g", { "data-layer": "south-chart" });
  const chartX = 270;
  const chartY = 270;
  const chartSize = 460;
  const cell = chartSize / 4;
  const grahasByRashi = groupGrahasByRashi(state.grahas || []);

  group.append(svgEl("rect", {
    x: chartX,
    y: chartY,
    width: chartSize,
    height: chartSize,
    fill: theme.surface,
    stroke: theme.line,
    "stroke-width": 1.4
  }));

  for (let i = 1; i < 4; i += 1) {
    group.append(svgEl("line", { x1: chartX + cell * i, y1: chartY, x2: chartX + cell * i, y2: chartY + chartSize, stroke: theme.lineSoft, "stroke-width": 1 }));
    group.append(svgEl("line", { x1: chartX, y1: chartY + cell * i, x2: chartX + chartSize, y2: chartY + cell * i, stroke: theme.lineSoft, "stroke-width": 1 }));
  }

  group.append(svgEl("rect", {
    x: chartX + cell,
    y: chartY + cell,
    width: cell * 2,
    height: cell * 2,
    fill: "#FFF9EE",
    stroke: theme.lineSoft,
    "stroke-width": 1.1
  }));

  Object.entries(southIndianRashiCells).forEach(([rashi, position]) => {
    const x = chartX + position.col * cell;
    const y = chartY + position.row * cell;
    group.append(svgEl("text", {
      x: x + 12,
      y: y + 20,
      fill: theme.textSoft,
      "font-size": 12,
      "font-family": "Inter, system-ui, sans-serif",
      "letter-spacing": "0",
      "data-rashi-label": rashi
    }, rashi));
    renderGrahasInCell(group, grahasByRashi.get(Number(rashi)) || [], x, y, cell, theme);
  });

  svg.append(group);
}

function renderGrahasInCell(group, grahas, x, y, cell, theme) {
  const slots = [
    { x: 0.5, y: 0.38 },
    { x: 0.5, y: 0.62 },
    { x: 0.28, y: 0.52 },
    { x: 0.72, y: 0.52 },
    { x: 0.28, y: 0.72 },
    { x: 0.72, y: 0.72 }
  ];

  grahas.slice(0, slots.length).forEach((graha, index) => {
    const slot = slots[index];
    const color = theme.grahas?.[graha.key] || theme.text;
    group.append(svgEl("text", {
      x: x + cell * slot.x,
      y: y + cell * slot.y,
      fill: color,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": grahas.length > 3 ? 13.5 : 16,
      "font-family": "Inter, system-ui, sans-serif",
      "font-weight": 700,
      "letter-spacing": "0",
      "data-graha": graha.key
    }, `${graha.key} ${formatDegreeMinute(graha.degreeInRashi)}`));
  });
}

function renderCenterClock(svg, state, theme, options) {
  const group = svgEl("g", { "data-layer": "analog-clock" });

  group.append(svgEl("circle", { cx: CENTER, cy: CENTER, r: 88, fill: "none", stroke: theme.lineSoft, "stroke-width": 1.2 }));
  group.append(createHandsGroup(resolveTime(state, options.now), theme));
  group.append(svgEl("text", {
    x: CENTER,
    y: CENTER + 116,
    fill: theme.text,
    "text-anchor": "middle",
    "font-size": 18,
    "font-family": "Inter, system-ui, sans-serif",
    "letter-spacing": "0"
  }, state.dateLabel || ""));
  svg.append(group);
}

export function updateVedaClockHands(svg, currentDateOrMs, state = {}, options = {}) {
  if (!svg) throw new TypeError("An SVG element is required.");
  const group = svg.querySelector?.("[data-veda-clock-dynamic=\"hands\"]");
  if (!group) return false;
  const theme = { ...defaultTheme, ...(options.theme || {}) };
  group.replaceChildren(...createHandNodes(resolveTime(state, currentDateOrMs), theme));
  return true;
}

export function exportVedaClockSvg(svgElement, options = {}) {
  const serialized = serializeSvg(svgElement);
  const filename = options.filename || buildExportFilename(options.date || options.dateLabel || new Date(), "svg");
  downloadBlob(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }), filename);
  return { filename, content: serialized };
}

export async function exportVedaClockPng(svgElement, options = {}) {
  const size = Number(options.size || 2000);
  const serialized = serializeSvg(svgElement);
  const filename = options.filename || buildExportFilename(options.date || options.dateLabel || new Date(), "png");
  const blob = await svgToPngBlob(serialized, size);
  downloadBlob(blob, filename);
  return { filename, blob };
}

export function buildExportFilename(dateLike, extension) {
  const date = filenameDate(dateLike);
  return `vedascope-clock-${date}.${extension}`;
}

function createHandsGroup(time, theme) {
  const group = svgEl("g", { "data-veda-clock-dynamic": "hands" });
  group.append(...createHandNodes(time, theme));
  return group;
}

function createHandNodes(time, theme) {
  const hourAngle = ((time.hour % 12) + time.minute / 60 + time.second / 3600) * 30;
  const minuteAngle = (time.minute + time.second / 60) * 6;
  const secondAngle = time.second * 6;
  return [
    clockHand(hourAngle, 48, theme.hand, 4.2, "hour"),
    clockHand(minuteAngle, 68, theme.hand, 2.6, "minute"),
    clockHand(secondAngle, 74, theme.secondHand, 1.25, "second"),
    svgEl("circle", { cx: CENTER, cy: CENTER, r: 4.2, fill: theme.hand, "data-clock-pivot": "" })
  ];
}

function clockHand(angle, length, color, width, handType) {
  const radians = (angle - 90) * Math.PI / 180;
  const x = CENTER + Math.cos(radians) * length;
  const y = CENTER + Math.sin(radians) * length;
  return svgEl("line", {
    x1: CENTER,
    y1: CENTER,
    x2: x,
    y2: y,
    stroke: color,
    "stroke-width": width,
    "stroke-linecap": "round",
    "data-clock-hand": handType
  });
}

function resolveTime(state, now) {
  const date = toDate(now);
  const source = date
    ? { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() }
    : state.time || {};
  return {
    hour: Number(source.hour || 0),
    minute: Number(source.minute || 0),
    second: Number(source.second || 0)
  };
}

function groupGrahasByRashi(grahas) {
  const map = new Map();
  grahas.forEach((graha) => {
    const rashi = Number(graha.rashi);
    if (!Number.isInteger(rashi) || rashi < 1 || rashi > 12) return;
    map.set(rashi, [...(map.get(rashi) || []), graha]);
  });
  return map;
}

function formatDegreeMinute(value) {
  const normalized = Number(value || 0);
  const degrees = Math.floor(normalized);
  const minutes = Math.round((normalized - degrees) * 60);
  if (minutes === 60) return `${degrees + 1}°00′`;
  return `${degrees}°${String(minutes).padStart(2, "0")}′`;
}

function formatPoint(point) {
  return `${round(point.x)} ${round(point.y)}`;
}

function squarePerimeterPoints(start, end, inset) {
  const points = [pointOnSquare(start, inset)];
  [0.25, 0.5, 0.75, 1].forEach((corner) => {
    if (corner > start && corner < end) points.push(pointOnSquare(corner, inset));
  });
  points.push(pointOnSquare(end, inset));
  return points;
}

function round(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (Number.isFinite(Number(value))) return new Date(Number(value));
  return null;
}

function serializeSvg(svgElement) {
  if (!svgElement) throw new TypeError("An SVG element is required.");
  if (!svgElement.getAttribute?.("xmlns")) svgElement.setAttribute?.("xmlns", SVG_NS);
  const serialized = new XMLSerializer().serializeToString(svgElement);
  return serialized.includes("xmlns=") ? serialized : serialized.replace("<svg", `<svg xmlns="${SVG_NS}"`);
}

async function svgToPngBlob(serialized, size) {
  const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = defaultTheme.background;
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image could not be loaded for PNG export."));
    image.src = url;
  });
}

function downloadBlob(blob, filename) {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function filenameDate(dateLike) {
  if (typeof dateLike === "string") {
    const labelMatch = dateLike.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
    if (labelMatch) {
      const year = labelMatch[3].length === 2 ? `20${labelMatch[3]}` : labelMatch[3];
      return `${year}-${labelMatch[2]}-${labelMatch[1]}`;
    }
    const isoMatch = dateLike.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const date = dateLike instanceof Date && !Number.isNaN(dateLike.getTime()) ? dateLike : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text !== undefined) node.textContent = text;
  return node;
}
