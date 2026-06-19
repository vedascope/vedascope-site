(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ZODIAC_VISUAL_OFFSET_DEG = -30;
  const SIGN_NAMES = ["Овен ♈", "Телец ♉", "Близнецы ♊", "Рак ♋", "Лев ♌", "Дева ♍", "Весы ♎", "Скорпион ♏", "Стрелец ♐", "Козерог ♑", "Водолей ♒", "Рыбы ♓"];
  const NAKSHATRA_NAMES = [
    "Ашвини",
    "Бхарани",
    "Криттика",
    "Рохини",
    "Мригашира",
    "Ардра",
    "Пунарвасу",
    "Пушья",
    "Ашлеша",
    "Магха",
    "Пурва Пхалгуни",
    "Уттара Пхалгуни",
    "Хаста",
    "Читра",
    "Свати",
    "Вишакха",
    "Анурадха",
    "Джйештха",
    "Мула",
    "Пурва Ашадха",
    "Уттара Ашадха",
    "Шравана",
    "Дхаништха",
    "Шатабхиша",
    "Пурва Бхадрапада",
    "Уттара Бхадрапада",
    "Ревати"
  ];
  const LOCATION_PRESETS = {
    amsterdam: { name: "Амстердам", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
    moscow: { name: "Москва", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
    "new-york": { name: "Нью-Йорк", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
    vladivostok: { name: "Владивосток", lat: 43.1155, lon: 131.8855, tz: "Asia/Vladivostok" },
    london: { name: "Лондон", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
    delhi: { name: "Дели", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" }
  };
  const GRAHA_STYLES = {
    sun: { color: "#f3c766", label: "Su", light: false, glow: true },
    moon: { color: "#f7f1dc", label: "Mo", light: false, glow: true },
    mars: { color: "#d94b3d", label: "Ma", light: true },
    mercury: { color: "#57b876", label: "Me", light: false },
    jupiter: { color: "#e49443", label: "Ju", light: false },
    venus: { color: "#c7a0dd", label: "Ve", light: false },
    saturn: { color: "#243f7a", label: "Sa", light: true, ring: true },
    rahu: { color: "#8a6446", label: "Ra", light: true },
    ketu: { color: "#101014", label: "Ke", light: true }
  };

  const state = {
    grahas: [],
    activeKey: null,
    response: null,
    liveMode: true,
    liveTimer: null,
    view: {
      rotateX: 0,
      rotateY: 0,
      zoom: 1,
      pointerId: null,
      dragMoved: false,
      pressedGrahaKey: null,
      ignoreNextClick: false
    }
  };
  const LIVE_REFRESH_MS = 60000;

  function longitudeToAngle(longitude) {
    return Number(longitude) % 360;
  }

  function getSignIndex(longitude) {
    return Math.floor((Number(longitude) % 360) / 30);
  }

  function getNakshatraIndex(longitude) {
    return Math.floor((Number(longitude) % 360) / (360 / 27));
  }

  function getPadaIndex(longitude) {
    return Math.floor((Number(longitude) % 360) / (360 / 108));
  }

  function polarToCartesian(cx, cy, r, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians)
    };
  }

  function describeGrahaPosition(graha) {
    const signName = SIGN_NAMES[graha.signIndex] || `Знак ${graha.signIndex + 1}`;
    const nakshatraName = NAKSHATRA_NAMES[graha.nakshatraIndex] || `Накшатра ${graha.nakshatraNumber}`;
    return `${graha.name}: ${formatDegree(graha.longitude)} · ${signName} ${formatDegree(graha.degreeInSign)} · Накшатра: ${nakshatraName} (${graha.nakshatraNumber}) · Пада: ${graha.padaInNakshatra}`;
  }

  function createSvgElement(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
    return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
  }

  function lineAt(cx, cy, innerR, outerR, angle, className) {
    const inner = polarToCartesian(cx, cy, innerR, angle);
    const outer = polarToCartesian(cx, cy, outerR, angle);
    return createSvgElement("line", {
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      class: className
    });
  }

  function formatDegree(value) {
    return `${Number(value).toFixed(2)}°`;
  }

  function formatDateTime(response) {
    if (!response?.input) return "—";
    return `${response.input.date} · ${response.input.time} · ${response.input.timezone}`;
  }

  function formatDisplayDate(dateValue) {
    const [year, month, day] = String(dateValue || "").split("-");
    if (!year || !month || !day) return "—";
    return `${day}.${month}.${year}`;
  }

  function updatePublicTime(response) {
    if (!response?.input) return;
    document.querySelector("[data-sky-title]").textContent = `Живая карта неба на ${formatDisplayDate(response.input.date)}`;
    document.querySelector("[data-sky-updated]").textContent = `Обновлено: ${response.input.time}`;
  }

  function getNakshatraLabel(graha) {
    return `${NAKSHATRA_NAMES[graha.nakshatraIndex] || "Накшатра"} (${graha.nakshatraNumber})`;
  }

  function getApiBase() {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "https://vedascope.ru"
      : "";
  }

  function setDefaultDateTime(form) {
    const now = new Date();
    form.date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    form.time.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function syncLiveDateTime(form) {
    setDefaultDateTime(form);
  }

  function applyLocation(form) {
    const preset = LOCATION_PRESETS[form.location.value] || LOCATION_PRESETS.amsterdam;
    form.lat.value = preset.lat;
    form.lon.value = preset.lon;
    form.tz.value = preset.tz;
    return preset;
  }

  async function fetchGrahas(params) {
    const query = new URLSearchParams(params);
    const response = await fetch(`${getApiBase()}/api/grahas?${query.toString()}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Не удалось получить положения грах.");
    return response.json();
  }

  function renderStaticGeometry(svg) {
    const cx = 500;
    const cy = 500;
    const beltInner = 300;
    const beltOuter = 410;
    const nakInner = 412;
    const nakOuter = 462;
    const padaInner = 464;
    const padaOuter = 496;

    const defs = createSvgElement("defs");
    const earthGradient = createSvgElement("radialGradient", { id: "earthGradient", cx: "34%", cy: "28%", r: "72%", fx: "28%", fy: "22%" });
    earthGradient.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "#edfdf5" }),
      createSvgElement("stop", { offset: "30%", "stop-color": "#6ca1a0" }),
      createSvgElement("stop", { offset: "68%", "stop-color": "#24505b" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "#061017" })
    );
    const earthHighlight = createSvgElement("radialGradient", { id: "earthHighlight", cx: "50%", cy: "50%", r: "50%" });
    earthHighlight.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.58" }),
      createSvgElement("stop", { offset: "55%", "stop-color": "#d9fff3", "stop-opacity": "0.16" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "#d9fff3", "stop-opacity": "0" })
    );
    const earthDepth = createSvgElement("filter", { id: "earthDepth", x: "-40%", y: "-40%", width: "180%", height: "190%" });
    earthDepth.append(createSvgElement("feDropShadow", { dx: "0", dy: "10", stdDeviation: "9", "flood-color": "#000000", "flood-opacity": "0.62" }));
    const earthAtmosphereGlow = createSvgElement("filter", { id: "earthAtmosphereGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    earthAtmosphereGlow.append(createSvgElement("feGaussianBlur", { stdDeviation: "5" }));
    const grahaOrbDepth = createSvgElement("filter", { id: "grahaOrbDepth", x: "-70%", y: "-70%", width: "240%", height: "260%" });
    grahaOrbDepth.append(createSvgElement("feDropShadow", { dx: "0", dy: "5", stdDeviation: "4", "flood-color": "#000000", "flood-opacity": "0.7" }));
    const glow = createSvgElement("filter", { id: "grahaGlow", x: "-70%", y: "-70%", width: "240%", height: "240%" });
    glow.append(createSvgElement("feGaussianBlur", { stdDeviation: "5", result: "blur" }), createSvgElement("feMerge"));
    glow.querySelector("feMerge").append(createSvgElement("feMergeNode", { in: "blur" }), createSvgElement("feMergeNode", { in: "SourceGraphic" }));
    Object.entries(GRAHA_STYLES).forEach(([key, style]) => {
      const gradient = createSvgElement("radialGradient", { id: `grahaGradient-${key}`, cx: "34%", cy: "28%", r: "72%", fx: "27%", fy: "22%" });
      gradient.append(
        createSvgElement("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.9" }),
        createSvgElement("stop", { offset: "24%", "stop-color": style.color }),
        createSvgElement("stop", { offset: "72%", "stop-color": style.color }),
        createSvgElement("stop", { offset: "100%", "stop-color": "#05070a", "stop-opacity": "0.82" })
      );
      defs.appendChild(gradient);
    });
    defs.append(earthGradient, earthHighlight, earthDepth, earthAtmosphereGlow, grahaOrbDepth, glow);
    svg.appendChild(defs);

    svg.append(
      createSvgElement("circle", { cx, cy, r: beltOuter, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: beltInner, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: nakInner, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: padaInner, class: "sky-belt-edge" })
    );

    for (let i = 0; i < 108; i += 1) svg.appendChild(lineAt(cx, cy, padaInner, padaOuter, i * (360 / 108), "sky-grid-line"));
    for (let i = 0; i < 27; i += 1) svg.appendChild(lineAt(cx, cy, beltOuter, nakOuter, i * (360 / 27), "sky-grid-line"));
    for (let i = 0; i < 12; i += 1) svg.appendChild(lineAt(cx, cy, beltInner, beltOuter, i * 30, "sky-grid-line sky-grid-line--sign"));

    for (let i = 0; i < SIGN_NAMES.length; i += 1) {
      const angle = (i + 0.5) * 30;
      const position = polarToCartesian(cx, cy, 328, angle);
      const label = createSvgElement("text", {
        x: position.x,
        y: position.y,
        class: "sky-sign-label",
        transform: `rotate(${angle > 90 && angle < 270 ? angle + 180 : angle} ${position.x} ${position.y})`
      });
      label.textContent = SIGN_NAMES[i];
      svg.appendChild(label);
    }

    for (let i = 0; i < NAKSHATRA_NAMES.length; i += 1) {
      const angle = (i + 0.5) * (360 / 27);
      const position = polarToCartesian(cx, cy, 435, angle);
      const label = createSvgElement("text", {
        x: position.x,
        y: position.y,
        class: "sky-nak-label",
        transform: `rotate(${angle > 90 && angle < 270 ? angle + 180 : angle} ${position.x} ${position.y})`
      });
      label.textContent = `${NAKSHATRA_NAMES[i]} (${i + 1})`;
      svg.appendChild(label);
    }

    const earth = createSvgElement("g", { "aria-hidden": "true" });
    earth.append(
      createSvgElement("ellipse", { cx, cy: cy + 84, rx: 86, ry: 22, class: "sky-earth-shadow" }),
      createSvgElement("circle", { cx, cy, r: 116, class: "sky-earth-atmosphere" }),
      createSvgElement("circle", { cx, cy, r: 108, class: "sky-earth" }),
      createSvgElement("circle", { cx: cx - 35, cy: cy - 39, r: 43, class: "sky-earth-highlight" }),
      createSvgElement("ellipse", { cx, cy, rx: 88, ry: 34, class: "sky-earth-line" }),
      createSvgElement("ellipse", { cx, cy, rx: 38, ry: 104, class: "sky-earth-line" }),
      createSvgElement("line", { x1: cx - 96, y1: cy, x2: cx + 96, y2: cy, class: "sky-earth-line" })
    );
    svg.appendChild(earth);
  }

  function renderHighlights(svg, grahas) {
    const cx = 500;
    const cy = 500;
    const nakGroups = new Map();
    const padaGroups = new Map();

    grahas.forEach((graha) => {
      const nakKey = String(graha.nakshatraIndex);
      const padaKey = String(graha.padaIndex);
      nakGroups.set(nakKey, [...(nakGroups.get(nakKey) || []), graha]);
      padaGroups.set(padaKey, [...(padaGroups.get(padaKey) || []), graha]);
    });

    grahas.forEach((graha) => {
      const style = GRAHA_STYLES[graha.key] || GRAHA_STYLES.sun;
      const nakStart = graha.nakshatraIndex * (360 / 27);
      const nakEnd = nakStart + (360 / 27);
      const padaStart = graha.padaIndex * (360 / 108);
      const padaEnd = padaStart + (360 / 108);
      const nakPeers = nakGroups.get(String(graha.nakshatraIndex)) || [];
      const padaPeers = padaGroups.get(String(graha.padaIndex)) || [];
      const nakOffset = nakPeers.findIndex((item) => item.key === graha.key) * 4;
      const padaOffset = padaPeers.findIndex((item) => item.key === graha.key) * 3;

      svg.appendChild(createSvgElement("path", {
        d: describeArc(cx, cy, 437 + nakOffset, nakStart, nakEnd),
        class: "sky-nak-highlight",
        stroke: style.color,
        "stroke-width": 12
      }));
      svg.appendChild(createSvgElement("path", {
        d: describeArc(cx, cy, 480 + padaOffset, padaStart, padaEnd),
        class: "sky-pada-highlight",
        stroke: style.color,
        "stroke-width": 9
      }));
    });
  }

  function renderGrahas(svg, grahas) {
    const cx = 500;
    const cy = 500;
    grahas.forEach((graha) => {
      const style = GRAHA_STYLES[graha.key] || GRAHA_STYLES.sun;
      const position = polarToCartesian(cx, cy, 374, longitudeToAngle(graha.longitude));
      const group = createSvgElement("g", {
        class: `sky-graha${state.activeKey === graha.key ? " is-active" : ""}`,
        tabindex: "0",
        role: "button",
        "aria-label": describeGrahaPosition(graha),
        "data-graha-key": graha.key
      });
      group.appendChild(createSvgElement("circle", {
        cx: position.x,
        cy: position.y,
        r: 34,
        class: "sky-graha-hit"
      }));
      group.appendChild(createSvgElement("ellipse", {
        cx: position.x + 4,
        cy: position.y + 17,
        rx: 18,
        ry: 7,
        class: "sky-graha-shadow"
      }));
      group.appendChild(createSvgElement("circle", {
        cx: position.x,
        cy: position.y,
        r: 20,
        fill: `url(#grahaGradient-${graha.key})`,
        class: "sky-graha-marker",
        filter: style.glow ? "url(#grahaGlow)" : ""
      }));
      group.appendChild(createSvgElement("circle", {
        cx: position.x - 6,
        cy: position.y - 7,
        r: 5.5,
        class: "sky-graha-shine"
      }));
      if (style.ring) {
        group.appendChild(createSvgElement("ellipse", {
          cx: position.x,
          cy: position.y,
          rx: 30,
          ry: 8,
          transform: `rotate(${longitudeToAngle(graha.longitude) + 18} ${position.x} ${position.y})`,
          class: "sky-graha-ring"
        }));
      }
      const text = createSvgElement("text", {
        x: position.x,
        y: position.y + 1,
        class: `sky-graha-label${style.light ? " is-light" : ""}`
      });
      text.textContent = style.label;
      group.appendChild(text);
      group.addEventListener("click", (event) => {
        if (state.view.dragMoved) return;
        event.stopPropagation();
        selectGraha(graha.key);
      });
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectGraha(graha.key);
        }
      });
      svg.appendChild(group);
    });
  }

  function renderClock() {
    const svg = document.querySelector("[data-sky-svg]");
    svg.replaceChildren();
    const title = createSvgElement("title", { id: "sky-svg-title" });
    const description = createSvgElement("desc", { id: "sky-svg-description" });
    const plane = createSvgElement("g", {
      "data-sky-plane": "",
      transform: `rotate(${ZODIAC_VISUAL_OFFSET_DEG} 500 500)`
    });
    title.textContent = "Vedic Sky Clock";
    description.textContent = "Положение грах по сидерической долготе в знаках, накшатрах и падах.";
    renderStaticGeometry(plane);
    renderHighlights(plane, state.grahas);
    renderGrahas(plane, state.grahas);
    svg.append(title, description, plane);
  }

  function selectGraha(key) {
    state.activeKey = key;
    renderClock();
    renderTooltip(state.grahas.find((graha) => graha.key === key));
  }

  function hideTooltip() {
    const tooltip = document.querySelector("[data-sky-tooltip]");
    if (!tooltip) return;
    tooltip.hidden = true;
    state.activeKey = null;
    renderClock();
  }

  function positionTooltip(graha) {
    const tooltip = document.querySelector("[data-sky-tooltip]");
    const frame = document.querySelector(".sky-clock-frame");
    const svg = document.querySelector("[data-sky-svg]");
    if (!tooltip || !frame || !svg) return;

    const frameRect = frame.getBoundingClientRect();
    const marker = [...svg.querySelectorAll("[data-graha-key]")].find((node) => node.dataset.grahaKey === graha.key);
    if (!marker) return;
    const markerRect = marker.getBoundingClientRect();
    const x = markerRect.left - frameRect.left + markerRect.width / 2;
    const y = markerRect.top - frameRect.top + markerRect.height / 2;
    const clampedX = Math.min(Math.max(x, 120), frameRect.width - 120);
    const clampedY = Math.min(Math.max(y, 112), frameRect.height - 18);

    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${clampedY}px`;
  }

  function renderTooltip(graha) {
    const tooltip = document.querySelector("[data-sky-tooltip]");
    if (!tooltip) return;
    if (!graha) {
      tooltip.hidden = true;
      return;
    }
    tooltip.innerHTML = `
      <strong>${graha.name}</strong>
      <p>${formatDegree(graha.longitude)}</p>
      <p>${SIGN_NAMES[graha.signIndex]} · ${formatDegree(graha.degreeInSign)}</p>
      <p>Накшатра: ${getNakshatraLabel(graha)}</p>
      <p>Пада: ${graha.padaInNakshatra}</p>
    `;
    tooltip.hidden = false;
    positionTooltip(graha);
  }

  function setStatus(message, isError = false) {
    const status = document.querySelector("[data-sky-status]");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  async function updateClock(form, { live = state.liveMode } = {}) {
    if (live) syncLiveDateTime(form);
    applyLocation(form);
    setStatus("Загружаю положения.");
    const previousKey = state.activeKey;
    const response = await fetchGrahas({
      date: form.date.value,
      time: form.time.value,
      lat: form.lat.value,
      lon: form.lon.value,
      tz: form.tz.value
    });
    state.response = response;
    state.grahas = response.grahas || [];
    state.activeKey = previousKey && state.grahas.some((graha) => graha.key === previousKey) ? previousKey : null;
    updatePublicTime(response);
    renderClock();
    if (previousKey) {
      renderTooltip(state.grahas.find((graha) => graha.key === state.activeKey));
    }
    setStatus("");
  }

  function startLiveMode(form) {
    state.liveMode = true;
    window.clearInterval(state.liveTimer);
    updateClock(form, { live: true }).catch((error) => setStatus(error.message || "Не удалось загрузить Sky Clock.", true));
    state.liveTimer = window.setInterval(() => {
      if (!state.liveMode) return;
      updateClock(form, { live: true }).catch((error) => setStatus(error.message || "Не удалось обновить Sky Clock.", true));
    }, LIVE_REFRESH_MS);
  }

  function enterManualMode() {
    state.liveMode = false;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function applyViewTransform() {
    const svg = document.querySelector("[data-sky-svg]");
    if (!svg) return;
    svg.style.transform = `rotateX(${state.view.rotateX}deg) rotateY(${state.view.rotateY}deg) scale(${state.view.zoom})`;
  }

  function refreshActiveTooltipPosition() {
    if (!state.activeKey) return;
    window.requestAnimationFrame(() => renderTooltip(state.grahas.find((graha) => graha.key === state.activeKey)));
  }

  function setZoom(nextZoom) {
    state.view.zoom = clamp(nextZoom, 0.75, 1.6);
    applyViewTransform();
    refreshActiveTooltipPosition();
  }

  function resetView() {
    state.view.rotateX = 0;
    state.view.rotateY = 0;
    state.view.zoom = 1;
    applyViewTransform();
    refreshActiveTooltipPosition();
  }

  function dismissTooltipDuringDrag() {
    const tooltip = document.querySelector("[data-sky-tooltip]");
    if (tooltip) tooltip.hidden = true;
    state.activeKey = null;
    document.querySelectorAll(".sky-graha.is-active").forEach((node) => node.classList.remove("is-active"));
  }

  function getGrahaKeyAtPoint(clientX, clientY) {
    let nearest = null;
    document.querySelectorAll("[data-graha-key]").forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const normalizedX = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const normalizedY = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const distance = normalizedX ** 2 + normalizedY ** 2;
      if (distance <= 1 && (!nearest || distance < nearest.distance)) {
        nearest = { key: node.dataset.grahaKey, distance };
      }
    });
    return nearest?.key || null;
  }

  function initViewControls() {
    const surface = document.querySelector(".sky-clock-viewport");
    const svg = document.querySelector("[data-sky-svg]");
    const zoomIn = document.querySelector("[data-sky-zoom-in]");
    const zoomOut = document.querySelector("[data-sky-zoom-out]");
    const reset = document.querySelector("[data-sky-view-reset]");
    if (!surface || !svg || !zoomIn || !zoomOut || !reset) return;

    applyViewTransform();
    zoomIn.addEventListener("click", () => setZoom(state.view.zoom + 0.1));
    zoomOut.addEventListener("click", () => setZoom(state.view.zoom - 0.1));
    reset.addEventListener("click", resetView);

    surface.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      state.view.ignoreNextClick = false;
      state.view.pointerId = event.pointerId;
      state.view.startX = event.clientX;
      state.view.startY = event.clientY;
      state.view.startRotateX = state.view.rotateX;
      state.view.startRotateY = state.view.rotateY;
      state.view.dragMoved = false;
      state.view.pressedGrahaKey = event.target.closest?.("[data-graha-key]")?.dataset.grahaKey
        || getGrahaKeyAtPoint(event.clientX, event.clientY);
      surface.setPointerCapture(event.pointerId);
      surface.classList.add("is-dragging");
    });

    surface.addEventListener("pointermove", (event) => {
      if (event.pointerId !== state.view.pointerId) return;
      const deltaX = event.clientX - state.view.startX;
      const deltaY = event.clientY - state.view.startY;
      if (!state.view.dragMoved && Math.hypot(deltaX, deltaY) <= 5) return;
      if (!state.view.dragMoved) dismissTooltipDuringDrag();
      state.view.dragMoved = true;
      state.view.rotateX = clamp(state.view.startRotateX + deltaY * 0.2, -65, 65);
      state.view.rotateY = clamp(state.view.startRotateY + deltaX * 0.2, -45, 45);
      applyViewTransform();
      event.preventDefault();
    });

    const finishDrag = (event, cancelled = false) => {
      if (event.pointerId !== state.view.pointerId) return;
      const shouldSelectGraha = !cancelled && !state.view.dragMoved && state.view.pressedGrahaKey;
      state.view.ignoreNextClick = !cancelled && Boolean(state.view.dragMoved || shouldSelectGraha);
      state.view.pointerId = null;
      state.view.pressedGrahaKey = null;
      surface.classList.remove("is-dragging");
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      if (shouldSelectGraha) selectGraha(shouldSelectGraha);
    };
    surface.addEventListener("pointerup", finishDrag);
    surface.addEventListener("pointercancel", (event) => {
      finishDrag(event, true);
    });
    surface.addEventListener("click", (event) => {
      if (!state.view.ignoreNextClick) return;
      state.view.ignoreNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    surface.addEventListener("lostpointercapture", () => {
      if (state.view.pointerId === null) return;
      state.view.pointerId = null;
      state.view.pressedGrahaKey = null;
      surface.classList.remove("is-dragging");
    });
  }

  function init() {
    const form = document.querySelector("[data-sky-form]");
    if (!form) return;
    setDefaultDateTime(form);
    applyLocation(form);
    ["date", "time"].forEach((fieldName) => {
      form[fieldName].addEventListener("input", enterManualMode);
    });
    form.location.addEventListener("change", () => {
      enterManualMode();
      applyLocation(form);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      enterManualMode();
      updateClock(form, { live: false }).catch((error) => setStatus(error.message || "Не удалось обновить Sky Clock.", true));
    });
    document.querySelector("[data-sky-live]").addEventListener("click", () => startLiveMode(form));
    initViewControls();
    document.addEventListener("click", (event) => {
      if (event.target.closest(".sky-graha") || event.target.closest("[data-sky-tooltip]")) return;
      if (state.activeKey) hideTooltip();
    });
    window.addEventListener("resize", () => {
      if (!state.activeKey) return;
      renderTooltip(state.grahas.find((graha) => graha.key === state.activeKey));
    });
    startLiveMode(form);
  }

  window.VedicSkyClock = {
    longitudeToAngle,
    getSignIndex,
    getNakshatraIndex,
    getPadaIndex,
    polarToCartesian,
    describeGrahaPosition
  };

  document.addEventListener("DOMContentLoaded", init);
})();
