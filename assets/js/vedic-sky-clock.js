(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ZODIAC_VISUAL_OFFSET_DEG = -30;
  const SIGN_NAMES = ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева", "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"];
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
  const NAKSHATRA_VISIBLE_LABELS = {
    "Пурва Пхалгуни": "П. Пхалгуни",
    "Уттара Пхалгуни": "У. Пхалгуни",
    "Пурва Ашадха": "П. Ашадха",
    "Уттара Ашадха": "У. Ашадха",
    "Пурва Бхадрапада": "П. Бхадрапада",
    "Уттара Бхадрапада": "У. Бхадрапада"
  };
  const LOCATION_PRESETS = {
    amsterdam: { name: "Амстердам", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
    moscow: { name: "Москва", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
    "new-york": { name: "Нью-Йорк", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
    vladivostok: { name: "Владивосток", lat: 43.1155, lon: 131.8855, tz: "Asia/Vladivostok" },
    london: { name: "Лондон", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
    delhi: { name: "Дели", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" }
  };
  const GRAHA_STYLES = {
    sun: { color: "#f3c766", label: "Su", light: false, glow: true, mid: "#f7a62f", dark: "#6f2d08", accent: "#fff1a8" },
    moon: { color: "#f7f1dc", label: "Mo", light: false, glow: true, mid: "#c8d1d6", dark: "#58636a", accent: "#ffffff" },
    mars: { color: "#d94b3d", label: "Ma", light: true, mid: "#983226", dark: "#3d0d08", accent: "#f2a06d" },
    mercury: { color: "#57b876", label: "Me", light: false, mid: "#3c8e83", dark: "#133739", accent: "#b5f0bf" },
    jupiter: { color: "#e49443", label: "Ju", light: false, mid: "#b76a2c", dark: "#47200b", accent: "#ffd08a" },
    venus: { color: "#c7a0dd", label: "Ve", light: false, mid: "#d6b890", dark: "#64505e", accent: "#fff0ce" },
    saturn: { color: "#586fa4", label: "Sa", light: true, ring: true, mid: "#2f477e", dark: "#111936", accent: "#b6c1df" },
    rahu: { color: "#8a6446", label: "Ra", light: true, mid: "#5f5143", dark: "#16120f", accent: "#c6aa78" },
    ketu: { color: "#24232a", label: "Ke", light: true, mid: "#5a423d", dark: "#030305", accent: "#a0785d" }
  };
  const GRAHA_NAMES_RU = {
    sun: "Солнце",
    moon: "Луна",
    mars: "Марс",
    mercury: "Меркурий",
    jupiter: "Юпитер",
    venus: "Венера",
    saturn: "Сатурн",
    rahu: "Раху",
    ketu: "Кету"
  };

  const state = {
    grahas: [],
    activeKey: null,
    response: null,
    liveMode: true,
    liveTimer: null,
    earth: {
      initialized: false,
      renderer: null,
      scene: null,
      camera: null,
      viewGroup: null,
      sphere: null,
      clouds: null,
      frameId: null,
      resizeObserver: null
    },
    view: {
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      zoom: 1,
      pointerId: null,
      dragMoved: false,
      pressedGrahaKey: null,
      ignoreNextClick: false,
      hasSettled: false
    }
  };
  const LIVE_REFRESH_MS = 60000;
  const THREE_CDN_URL = "https://unpkg.com/three@0.160.0/build/three.module.js";
  const EARTH_TEXTURE_URLS = [
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    "https://unpkg.com/three@0.160.0/examples/textures/planets/earth_atmos_2048.jpg"
  ];
  const EARTH_CLOUD_TEXTURE_URLS = [
    "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
    "https://unpkg.com/three@0.160.0/examples/textures/planets/earth_clouds_1024.png"
  ];

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

  async function loadTextureWithFallback(THREE, urls) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let lastError = null;
    for (const url of urls) {
      try {
        const texture = await loader.loadAsync(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Texture failed to load.");
  }

  function syncEarthViewOrientation() {
    if (!state.earth.viewGroup) return;
    const toRadians = Math.PI / 180;
    state.earth.viewGroup.rotation.set(
      state.view.rotateX * toRadians,
      state.view.rotateY * toRadians,
      state.view.rotateZ * toRadians
    );
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

  function getVisibleNakshatraLabel(name) {
    return NAKSHATRA_VISIBLE_LABELS[name] || name;
  }

  function getGrahaDisplayName(graha) {
    return GRAHA_NAMES_RU[graha?.key] || graha?.name || "";
  }

  function getApiBase() {
    return "";
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
    const grahaTerminator = createSvgElement("radialGradient", { id: "grahaTerminator", cx: "70%", cy: "74%", r: "76%" });
    grahaTerminator.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "#05070a", "stop-opacity": "0" }),
      createSvgElement("stop", { offset: "52%", "stop-color": "#05070a", "stop-opacity": "0.08" }),
      createSvgElement("stop", { offset: "78%", "stop-color": "#030406", "stop-opacity": "0.42" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "#010203", "stop-opacity": "0.78" })
    );
    const grahaOrbDepth = createSvgElement("filter", { id: "grahaOrbDepth", x: "-80%", y: "-80%", width: "260%", height: "280%" });
    grahaOrbDepth.append(
      createSvgElement("feDropShadow", { dx: "0", dy: "7", stdDeviation: "5.5", "flood-color": "#000000", "flood-opacity": "0.78" }),
      createSvgElement("feDropShadow", { dx: "-1.5", dy: "-1.5", stdDeviation: "1.8", "flood-color": "#fff4cf", "flood-opacity": "0.24" })
    );
    const glow = createSvgElement("filter", { id: "grahaGlow", x: "-90%", y: "-90%", width: "280%", height: "280%" });
    glow.append(createSvgElement("feGaussianBlur", { stdDeviation: "5", result: "blur" }), createSvgElement("feMerge"));
    glow.querySelector("feMerge").append(createSvgElement("feMergeNode", { in: "blur" }), createSvgElement("feMergeNode", { in: "SourceGraphic" }));
    Object.entries(GRAHA_STYLES).forEach(([key, style]) => {
      const gradient = createSvgElement("radialGradient", { id: `grahaGradient-${key}`, cx: "31%", cy: "26%", r: "82%", fx: "22%", fy: "18%" });
      gradient.append(
        createSvgElement("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.96" }),
        createSvgElement("stop", { offset: "15%", "stop-color": style.accent || style.color, "stop-opacity": "0.96" }),
        createSvgElement("stop", { offset: "39%", "stop-color": style.color }),
        createSvgElement("stop", { offset: "68%", "stop-color": style.mid || style.color }),
        createSvgElement("stop", { offset: "88%", "stop-color": style.dark || "#172026", "stop-opacity": "0.92" }),
        createSvgElement("stop", { offset: "100%", "stop-color": "#020306", "stop-opacity": "0.98" })
      );
      const surface = createSvgElement("radialGradient", { id: `grahaSurface-${key}`, cx: "45%", cy: "44%", r: "68%" });
      surface.append(
        createSvgElement("stop", { offset: "0%", "stop-color": style.accent || "#ffffff", "stop-opacity": "0.2" }),
        createSvgElement("stop", { offset: "42%", "stop-color": style.mid || style.color, "stop-opacity": "0.16" }),
        createSvgElement("stop", { offset: "70%", "stop-color": style.dark || "#111820", "stop-opacity": "0.08" }),
        createSvgElement("stop", { offset: "100%", "stop-color": "#000000", "stop-opacity": "0" })
      );
      defs.appendChild(gradient);
      defs.appendChild(surface);
    });
    defs.append(grahaTerminator, grahaOrbDepth, glow);
    svg.appendChild(defs);

    svg.append(
      createSvgElement("circle", { cx, cy, r: beltOuter, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: beltInner, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: nakInner, class: "sky-belt-edge" }),
      createSvgElement("circle", { cx, cy, r: padaInner, class: "sky-belt-edge" })
    );

    for (let i = 0; i < 108; i += 1) svg.appendChild(lineAt(cx, cy, padaInner, padaOuter, i * (360 / 108), "sky-grid-line"));
    for (let i = 0; i < 27; i += 1) svg.appendChild(lineAt(cx, cy, beltOuter, nakOuter, i * (360 / 27), "sky-grid-line sky-grid-line--nak"));
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
      const position = polarToCartesian(cx, cy, 421, angle);
      const label = createSvgElement("text", {
        x: position.x,
        y: position.y,
        class: "sky-nak-label",
        transform: `rotate(${angle > 90 && angle < 270 ? angle + 180 : angle} ${position.x} ${position.y})`
      });
      label.textContent = `${getVisibleNakshatraLabel(NAKSHATRA_NAMES[i])} (${i + 1})`;
      svg.appendChild(label);
    }

  }

  async function initWebGLEarth() {
    if (state.earth.initialized) return;
    const viewport = document.querySelector(".sky-clock-viewport");
    if (!viewport) return;
    state.earth.initialized = true;

    const plane = document.createElement("div");
    plane.className = "sky-earth-webgl-plane";
    plane.setAttribute("aria-hidden", "true");
    const shell = document.createElement("div");
    shell.className = "sky-earth-webgl-shell";
    const canvas = document.createElement("canvas");
    canvas.className = "sky-earth-webgl-canvas";
    shell.appendChild(canvas);
    plane.appendChild(shell);
    viewport.appendChild(plane);
    applyViewTransform();

    try {
      const THREE = await import(THREE_CDN_URL);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 4.15);
      scene.add(new THREE.AmbientLight(0x7ba2b0, 0.9));
      const sunLight = new THREE.DirectionalLight(0xffefd1, 2.35);
      sunLight.position.set(-3.2, 2.1, 4.8);
      scene.add(sunLight);
      const rimLight = new THREE.DirectionalLight(0x75d9ff, 0.85);
      rimLight.position.set(3.4, -1.6, 2.2);
      scene.add(rimLight);

      const [earthTexture, cloudTexture] = await Promise.all([
        loadTextureWithFallback(THREE, EARTH_TEXTURE_URLS),
        loadTextureWithFallback(THREE, EARTH_CLOUD_TEXTURE_URLS)
      ]);

      const viewGroup = new THREE.Group();
      scene.add(viewGroup);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.82,
        metalness: 0,
        emissive: new THREE.Color(0x031421),
        emissiveIntensity: 0.035
      }));
      sphere.rotation.set(0.22, -0.42, -0.08);
      viewGroup.add(sphere);

      const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.018, 72, 48), new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.28,
        roughness: 1,
        depthWrite: false
      }));
      clouds.rotation.copy(sphere.rotation);
      viewGroup.add(clouds);

      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.04, 72, 48), new THREE.MeshBasicMaterial({
        color: 0x78d7ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      }));
      viewGroup.add(atmosphere);

      const resize = () => {
        const rect = shell.getBoundingClientRect();
        const size = Math.max(Math.round(Math.min(rect.width, rect.height)), 1);
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      };

      state.earth.renderer = renderer;
      state.earth.scene = scene;
      state.earth.camera = camera;
      state.earth.viewGroup = viewGroup;
      state.earth.sphere = sphere;
      state.earth.clouds = clouds;
      state.earth.resizeObserver = new ResizeObserver(resize);
      state.earth.resizeObserver.observe(shell);
      resize();
      syncEarthViewOrientation();

      let previousTime = performance.now();
      const animate = (time) => {
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;
        sphere.rotation.y += delta * 0.11;
        clouds.rotation.y += delta * 0.145;
        atmosphere.rotation.y += delta * 0.035;
        renderer.render(scene, camera);
        state.earth.frameId = window.requestAnimationFrame(animate);
      };
      state.earth.frameId = window.requestAnimationFrame(animate);
    } catch (error) {
      plane.classList.add("is-unavailable");
      console.warn("Three.js Earth failed to load.", error);
    }
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
        d: describeArc(cx, cy, 451 + nakOffset, nakStart, nakEnd),
        class: "sky-nak-highlight",
        stroke: style.color,
        "stroke-width": 8
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
      const clipId = `grahaClip-${graha.key}`;
      const group = createSvgElement("g", {
        class: `sky-graha${state.activeKey === graha.key ? " is-active" : ""}`,
        transform: `translate(${position.x} ${position.y})`,
        tabindex: "0",
        role: "button",
        "aria-label": describeGrahaPosition(graha),
        "data-graha-key": graha.key
      });
      const defs = createSvgElement("defs");
      const clip = createSvgElement("clipPath", { id: clipId });
      clip.appendChild(createSvgElement("circle", { cx: 0, cy: 0, r: 20 }));
      defs.appendChild(clip);
      group.appendChild(defs);
      group.appendChild(createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 34,
        class: "sky-graha-hit"
      }));
      group.appendChild(createSvgElement("ellipse", {
        cx: 4,
        cy: 17,
        rx: 18,
        ry: 7,
        class: "sky-graha-shadow"
      }));
      group.appendChild(createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 20,
        fill: `url(#grahaGradient-${graha.key})`,
        class: "sky-graha-marker",
        filter: style.glow ? "url(#grahaGlow)" : ""
      }));
      const texture = createSvgElement("g", {
        class: `sky-graha-texture sky-graha-texture--${graha.key}`,
        "clip-path": `url(#${clipId})`
      });
      texture.append(
        createSvgElement("rect", { x: -58, y: -22, width: 116, height: 44, fill: `url(#grahaSurface-${graha.key})`, class: "sky-graha-surface" }),
        createSvgElement("ellipse", { cx: -32, cy: -5, rx: 19, ry: 4.4, class: "sky-graha-band sky-graha-band--upper" }),
        createSvgElement("ellipse", { cx: 0, cy: 4, rx: 25, ry: 5.2, class: "sky-graha-band" }),
        createSvgElement("ellipse", { cx: 33, cy: -3, rx: 19, ry: 4.2, class: "sky-graha-band sky-graha-band--upper" }),
        createSvgElement("ellipse", { cx: -25, cy: 10, rx: 12, ry: 3.2, class: "sky-graha-spot" }),
        createSvgElement("ellipse", { cx: 17, cy: -9, rx: 9, ry: 2.8, class: "sky-graha-spot sky-graha-spot--soft" }),
        createSvgElement("ellipse", { cx: 42, cy: 9, rx: 13, ry: 3.4, class: "sky-graha-spot" })
      );
      group.appendChild(texture);
      group.appendChild(createSvgElement("circle", {
        cx: -6,
        cy: -7,
        r: 5.5,
        class: "sky-graha-shine"
      }));
      group.appendChild(createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 20,
        fill: "url(#grahaTerminator)",
        class: "sky-graha-terminator"
      }));
      if (style.ring) {
        group.appendChild(createSvgElement("ellipse", {
          cx: 0,
          cy: 0,
          rx: 30,
          ry: 8,
          transform: `rotate(${longitudeToAngle(graha.longitude) + 18})`,
          class: "sky-graha-ring"
        }));
      }
      const text = createSvgElement("text", {
        x: 0,
        y: 1,
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

  function runInitialSettleMotion() {
    if (state.view.hasSettled) return;
    const surface = document.querySelector(".sky-clock-viewport");
    if (!surface) return;
    state.view.hasSettled = true;
    surface.classList.add("is-settling");
    surface.addEventListener("animationend", () => surface.classList.remove("is-settling"), { once: true });
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
      <strong>${getGrahaDisplayName(graha)}</strong>
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
    runInitialSettleMotion();
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

  function clampTilt(rotateX, rotateY) {
    const maxTilt = 68;
    const tilt = Math.hypot(rotateX, rotateY);
    if (tilt <= maxTilt) return { rotateX, rotateY };
    const scale = maxTilt / tilt;
    return {
      rotateX: rotateX * scale,
      rotateY: rotateY * scale
    };
  }

  function normalizeAngleDelta(degrees) {
    return ((degrees + 540) % 360) - 180;
  }

  function getPointerGeometry(surface, event) {
    const rect = surface.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    const distance = Math.max(Math.hypot(x, y), 1);
    return {
      x,
      y,
      distance,
      radius: Math.max(Math.min(rect.width, rect.height) / 2, 1),
      angle: Math.atan2(y, x) * 180 / Math.PI
    };
  }

  function applyViewTransform() {
    const svg = document.querySelector("[data-sky-svg]");
    const earthPlane = document.querySelector(".sky-earth-webgl-plane");
    if (!svg && !earthPlane) return;
    const transform = `rotateX(${state.view.rotateX}deg) rotateY(${state.view.rotateY}deg) rotateZ(${state.view.rotateZ}deg) scale(${state.view.zoom})`;
    if (svg) svg.style.transform = transform;
    if (earthPlane) earthPlane.style.transform = `scale(${state.view.zoom})`;
    syncEarthViewOrientation();
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
    state.view.rotateZ = 0;
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
    initWebGLEarth();
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
      state.view.startRotateZ = state.view.rotateZ;
      state.view.startPointer = getPointerGeometry(surface, event);
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
      const pointer = getPointerGeometry(surface, event);
      const startPointer = state.view.startPointer;
      const edgeY = Math.abs(startPointer.y) / startPointer.radius;
      const spinWeight = clamp(startPointer.distance / (startPointer.radius * 0.34), 0, 1);
      const spinDelta = normalizeAngleDelta(pointer.angle - startPointer.angle) * spinWeight;
      const verticalEdgeDirection = startPointer.y >= 0 ? -1 : 1;
      const tiltXDelta = deltaY * verticalEdgeDirection * (0.1 + edgeY * 0.16);
      const tiltYDelta = deltaX * 0.14;
      const tilt = clampTilt(state.view.startRotateX + tiltXDelta, state.view.startRotateY + tiltYDelta);
      state.view.rotateX = tilt.rotateX;
      state.view.rotateY = tilt.rotateY;
      state.view.rotateZ = state.view.startRotateZ + spinDelta;
      applyViewTransform();
      event.preventDefault();
    });

    const finishDrag = (event, cancelled = false) => {
      if (event.pointerId !== state.view.pointerId) return;
      const shouldSelectGraha = !cancelled && !state.view.dragMoved && state.view.pressedGrahaKey;
      state.view.ignoreNextClick = !cancelled && Boolean(state.view.dragMoved || shouldSelectGraha);
      state.view.pointerId = null;
      state.view.pressedGrahaKey = null;
      state.view.startPointer = null;
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
      state.view.startPointer = null;
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
