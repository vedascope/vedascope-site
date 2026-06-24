(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ZODIAC_VISUAL_OFFSET_DEG = -30;
  const GRAHA_VISUAL_RADIUS = 362;
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
    sun: { color: "#ffd35a", label: "Su", light: false, glow: true, mid: "#ff9f1f", dark: "#7a2606", accent: "#fff3a6" },
    moon: { color: "#f8f3e6", label: "Mo", light: false, glow: true, mid: "#d7dde0", dark: "#6d747a", accent: "#ffffff" },
    mars: { color: "#e24d35", label: "Ma", light: true, mid: "#a73522", dark: "#3b0b06", accent: "#ffb079" },
    mercury: { color: "#58c884", label: "Me", light: false, mid: "#2d8f79", dark: "#0c3031", accent: "#b8ffd0" },
    jupiter: { color: "#eaa052", label: "Ju", light: false, mid: "#b96b2e", dark: "#4b210a", accent: "#ffd79a" },
    venus: { color: "#d8b2e8", label: "Ve", light: false, mid: "#e2c8a4", dark: "#69526b", accent: "#fff1d8" },
    saturn: { color: "#526aa7", label: "Sa", light: true, ring: true, mid: "#263f78", dark: "#0c1432", accent: "#c9d5f2" },
    rahu: { color: "#6d5140", label: "Ra", light: true, mid: "#3f3834", dark: "#080707", accent: "#b49368" },
    ketu: { color: "#29272e", label: "Ke", light: true, mid: "#4d3934", dark: "#030304", accent: "#9b725a" }
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
  const GRAHA_VISUAL_STACK_ORDER = {
    saturn: 10,
    jupiter: 20,
    ketu: 30,
    rahu: 40,
    sun: 50,
    mars: 60,
    venus: 70,
    mercury: 80,
    moon: 90
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
    grahas3d: {
      initialized: false,
      renderer: null,
      scene: null,
      camera: null,
      plane: null,
      root: null,
      THREE: null,
      textures: new Map(),
      textureFallbacks: new Set(),
      meshes: new Map(),
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
  const GRAHA_TEXTURE_URLS = {
    sun: [
      "/assets/img/planets/sun.jpg",
      "https://threejs.org/examples/textures/planets/sun.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/sun.jpg"
    ],
    moon: [
      "/assets/img/planets/moon.jpg",
      "https://threejs.org/examples/textures/planets/moon_1024.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/moon_1024.jpg"
    ],
    mars: [
      "/assets/img/planets/mars.jpg",
      "https://threejs.org/examples/textures/planets/mars_1k_color.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/mars_1k_color.jpg"
    ],
    mercury: [
      "/assets/img/planets/mercury.jpg",
      "https://threejs.org/examples/textures/planets/mercury.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/mercury.jpg"
    ],
    jupiter: [
      "/assets/img/planets/jupiter.jpg",
      "https://threejs.org/examples/textures/planets/jupiter2_1024.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/jupiter2_1024.jpg"
    ],
    venus: [
      "/assets/img/planets/venus.jpg",
      "https://threejs.org/examples/textures/planets/venus.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/venus.jpg"
    ],
    saturn: [
      "/assets/img/planets/saturn.jpg",
      "https://threejs.org/examples/textures/planets/saturn.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/saturn.jpg"
    ],
    saturnRing: [
      "/assets/img/planets/saturn-ring.png",
      "https://threejs.org/examples/textures/planets/saturnringcolor.jpg",
      "https://unpkg.com/three@0.160.0/examples/textures/planets/saturnringcolor.jpg"
    ]
  };

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
    return `${graha.name}: ${formatDegree(graha.longitude)} · ${signName} ${formatDegree(graha.degreeInSign)} · Накшатра: ${nakshatraName} ${graha.nakshatraNumber} · Пада: ${graha.padaInNakshatra}`;
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
    if (!state.earth.viewGroup && !state.earth.sphere) return;
    if (state.earth.viewGroup) {
      const toRadians = Math.PI / 180;
      state.earth.viewGroup.rotation.set(
        state.view.rotateX * toRadians,
        state.view.rotateY * toRadians,
        state.view.rotateZ * toRadians
      );
    }
  }

  function syncGrahaViewOrientation() {
    if (!state.grahas3d.root || !state.grahas3d.camera) return;
    const toRadians = Math.PI / 180;
    state.grahas3d.root.rotation.set(
      state.view.rotateX * toRadians,
      -state.view.rotateY * toRadians,
      -(state.view.rotateZ + ZODIAC_VISUAL_OFFSET_DEG) * toRadians
    );
    state.grahas3d.camera.zoom = state.view.zoom;
    state.grahas3d.camera.updateProjectionMatrix();
  }

  function createGrahaFallbackTexture(THREE, key) {
    const width = 256;
    const height = 128;
    const data = new Uint8Array(width * height * 4);
    const style = GRAHA_STYLES[key] || GRAHA_STYLES.sun;
    const palettes = {
      sun: [[255, 220, 92], [236, 116, 22], [120, 34, 8]],
      moon: [[207, 211, 208], [140, 145, 146], [78, 82, 84]],
      mars: [[174, 69, 44], [115, 36, 25], [228, 124, 76]],
      mercury: [[100, 111, 106], [67, 78, 77], [165, 181, 168]],
      jupiter: [[222, 163, 93], [122, 59, 27], [235, 204, 151]],
      venus: [[218, 190, 145], [178, 150, 112], [246, 230, 196]],
      saturn: [[125, 134, 154], [67, 79, 108], [188, 184, 160]]
    };
    const palette = palettes[key] || [[80, 70, 64], [28, 24, 24], [174, 135, 92]];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const band = key === "jupiter" || key === "saturn" || key === "venus" ? Math.floor(y / 18) % palette.length : Math.floor((x * 0.07 + y * 0.11) % palette.length);
        const noise = (((x * 17 + y * 31 + key.length * 13) % 37) - 18) * 1.5;
        const color = palette[band];
        data[i] = Math.max(0, Math.min(255, color[0] + noise));
        data[i + 1] = Math.max(0, Math.min(255, color[1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, color[2] + noise));
        data[i + 3] = 255;
      }
    }
    const texture = new THREE.DataTexture(data, width, height);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.anisotropy = 4;
    texture.name = `${style.label || key}-fallback-texture`;
    return texture;
  }

  async function loadGrahaTexture(THREE, key) {
    try {
      return await loadTextureWithFallback(THREE, GRAHA_TEXTURE_URLS[key]);
    } catch (error) {
      state.grahas3d.textureFallbacks.add(key);
      return createGrahaFallbackTexture(THREE, key);
    }
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
    document.querySelector("[data-sky-title]").textContent = `Nabhasa · Живая карта неба Джйотиш на ${formatDisplayDate(response.input.date)}`;
    document.querySelector("[data-sky-updated]").textContent = `Обновлено: ${response.input.time}`;
  }

  function getNakshatraLabel(graha) {
    return `${NAKSHATRA_NAMES[graha.nakshatraIndex] || "Накшатра"} ${graha.nakshatraNumber}`;
  }

  function getVisibleNakshatraLabel(name) {
    return NAKSHATRA_VISIBLE_LABELS[name] || name;
  }

  function getGrahaDisplayName(graha) {
    return GRAHA_NAMES_RU[graha?.key] || graha?.name || "";
  }

  function isGrahaRetrograde(graha) {
    if (!graha || graha.key === "sun" || graha.key === "moon") return false;
    const explicit = graha.is_retrograde ?? graha.retrograde ?? graha.isRetrograde;
    if (explicit !== undefined && explicit !== null) return Boolean(explicit);
    const speed = graha.speed_deg_per_day ?? graha.speedDegPerDay ?? graha.speed;
    if (speed !== undefined && speed !== null && Number.isFinite(Number(speed))) return Number(speed) < 0;
    return graha.key === "rahu" || graha.key === "ketu";
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
    const beltInner = 280;
    const beltOuter = 420;
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
      const position = polarToCartesian(cx, cy, 298, angle);
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
      const position = polarToCartesian(cx, cy, 430, angle);
      const label = createSvgElement("text", {
        x: position.x,
        y: position.y,
        class: "sky-nak-label",
        transform: `rotate(${angle > 90 && angle < 270 ? angle + 180 : angle} ${position.x} ${position.y})`
      });
      label.textContent = `${getVisibleNakshatraLabel(NAKSHATRA_NAMES[i])} ${i + 1}`;
      svg.appendChild(label);
    }

  }

  async function initWebGLEarth() {
    if (state.earth.initialized) return;
    state.earth.initialized = true;

    try {
      while (!state.grahas3d.scene || !state.grahas3d.THREE) {
        await new Promise(function (r) { setTimeout(r, 50); });
      }
      var THREE = state.grahas3d.THREE;
      var scene = state.grahas3d.scene;

      var [earthTexture, cloudTexture] = await Promise.all([
        loadTextureWithFallback(THREE, EARTH_TEXTURE_URLS),
        loadTextureWithFallback(THREE, EARTH_CLOUD_TEXTURE_URLS)
      ]);

      var sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.82,
        metalness: 0,
        emissive: new THREE.Color(0x031421),
        emissiveIntensity: 0.035,
        depthTest: true,
        depthWrite: true
      }));
      sphere.rotation.set(0.22, -0.42, -0.08);
      sphere.renderOrder = -900;
      sphere.frustumCulled = false;
      sphere.name = "earth-sphere";
      scene.add(sphere);

      var clouds = new THREE.Mesh(new THREE.SphereGeometry(1.018, 72, 48), new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.28,
        roughness: 1,
        depthTest: true,
        depthWrite: false
      }));
      clouds.rotation.copy(sphere.rotation);
      clouds.renderOrder = -899;
      clouds.frustumCulled = false;
      clouds.name = "earth-clouds";
      scene.add(clouds);

      state.earth.renderer = state.grahas3d.renderer;
      state.earth.scene = scene;
      state.earth.camera = state.grahas3d.camera;
      state.earth.sphere = sphere;
      state.earth.clouds = clouds;
    } catch (error) {
      console.warn("Three.js Earth failed to load.", error);
    }
  }

  function makeGrahaMaterial(THREE, key) {
    const style = GRAHA_STYLES[key] || GRAHA_STYLES.sun;
    if (key === "sun") {
      return new THREE.MeshStandardMaterial({
        map: state.grahas3d.textures.get(key),
        color: 0xffe8b0,
        emissive: new THREE.Color(0xff8811),
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0,
        depthTest: true,
        depthWrite: false
      });
    }
    if (key === "rahu" || key === "ketu") {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(style.color),
        emissive: new THREE.Color(key === "rahu" ? 0x1a1410 : 0x030303),
        emissiveIntensity: 0.12,
        roughness: 0.94,
        metalness: 0.02,
        depthTest: true,
        depthWrite: false
      });
    }
    const materials = {
      moon:    { color: 0xf8f8ff, roughness: 0.7, metalness: 0, emissiveIntensity: 0.06 },
      mars:    { color: 0xffd8cc, roughness: 0.68, metalness: 0.02, emissiveIntensity: 0.05 },
      mercury: { color: 0xd8f0d8, roughness: 0.75, metalness: 0.04, emissiveIntensity: 0.04 },
      jupiter: { color: 0xffe0c0, roughness: 0.62, metalness: 0, emissiveIntensity: 0.06 },
      venus:   { color: 0xf0d8f8, roughness: 0.6, metalness: 0, emissiveIntensity: 0.05 },
      saturn:  { color: 0xd8e0f0, roughness: 0.62, metalness: 0, emissiveIntensity: 0.05 }
    };
    const mat = materials[key] || { color: 0xffffff, roughness: 0.85, metalness: 0, emissiveIntensity: 0.02 };
    return new THREE.MeshStandardMaterial({
      map: state.grahas3d.textures.get(key),
      color: mat.color,
      roughness: mat.roughness,
      metalness: mat.metalness,
      emissive: new THREE.Color(style.dark || "#061018"),
      emissiveIntensity: mat.emissiveIntensity,
      depthTest: true,
      depthWrite: false
    });
  }

  function grahaRadius(key) {
    return {
      sun: 24,
      moon: 18,
      mars: 18,
      mercury: 16,
      jupiter: 23,
      venus: 19,
      saturn: 21,
      rahu: 18,
      ketu: 18
    }[key] || 18;
  }

  function createGrahaLabelSprite(THREE, label, retrograde) {
    const canvas = document.createElement("canvas");
    canvas.width = retrograde ? 116 : 78;
    canvas.height = 38;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "700 18px Inter, system-ui, sans-serif";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(1, 3, 6, 0.9)";
    context.lineWidth = 5;
    context.fillStyle = "rgba(251, 244, 228, 0.9)";
    context.strokeText(label, 8, 19);
    context.fillText(label, 8, 19);
    if (retrograde) {
      context.font = "800 14px Inter, system-ui, sans-serif";
      context.fillStyle = "rgba(208, 160, 87, 0.95)";
      context.strokeText("R", 47, 19);
      context.fillText("R", 47, 19);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(retrograde ? 58 : 39, 19, 1);
    return sprite;
  }

  async function initGraha3D() {
    if (state.grahas3d.initialized) return;
    const viewport = document.querySelector(".sky-clock-viewport");
    if (!viewport) return;
    state.grahas3d.initialized = true;

    const plane = document.createElement("div");
    plane.className = "sky-graha-webgl-plane";
    plane.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    canvas.className = "sky-graha-webgl-canvas";
    plane.appendChild(canvas);
    viewport.appendChild(plane);
    applyViewTransform();

    try {
      const THREE = await import(THREE_CDN_URL);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-500, 500, 500, -500, -900, 900);
      camera.position.set(0, 0, 500);
      scene.add(new THREE.AmbientLight(0x9eb6c2, 1.05));
      const keyLight = new THREE.DirectionalLight(0xffefd4, 1.65);
      keyLight.position.set(-220, 180, 360);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x88d8ff, 0.55);
      rimLight.position.set(260, -160, 280);
      scene.add(rimLight);

      const textureEntries = await Promise.all(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "saturnRing"].map(async (key) => [key, await loadGrahaTexture(THREE, key)]));
      state.grahas3d.textures = new Map(textureEntries);

      const root = new THREE.Group();
      scene.add(root);

      const resize = () => {
        const rect = plane.getBoundingClientRect();
        const size = Math.max(Math.round(Math.min(rect.width, rect.height)), 1);
        renderer.setSize(size, size, false);
        camera.updateProjectionMatrix();
      };

      state.grahas3d.renderer = renderer;
      state.grahas3d.scene = scene;
      state.grahas3d.camera = camera;
      state.grahas3d.root = root;
      state.grahas3d.THREE = THREE;
      state.grahas3d.plane = plane;
      state.grahas3d.resizeObserver = new ResizeObserver(resize);
      state.grahas3d.resizeObserver.observe(plane);
      resize();
      syncGrahaViewOrientation();
      // updateGraha3D(); // disabled: Nabhasa is SVG-only
      updateGrahaRenderOrder();

      let previousTime = performance.now();
      const animate = (time) => {
        const delta = Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;

        if (state.earth.sphere) {
          state.earth.sphere.rotation.y += delta * 0.055;
          if (state.earth.clouds) state.earth.clouds.rotation.y += delta * 0.0725;
        }

        state.grahas3d.meshes.forEach((entry) => {
          entry.mesh.rotation.y += delta * entry.spin;
          if (entry.ring) entry.ring.rotation.z += delta * 0.035;
        });

        if (state.earth.sphere) {
          var canvas = renderer.domElement;
          var canvasW = canvas ? canvas.clientWidth : 1;
          var earthPixelR = canvasW * 0.126;
          var camVisibleW = (camera.right - camera.left) / (camera.zoom || 1);
          var earthScale = earthPixelR * camVisibleW / canvasW;
          state.earth.sphere.scale.setScalar(earthScale);
          if (state.earth.clouds) state.earth.clouds.scale.setScalar(earthScale * 1.018);
        }

        updateGrahaRenderOrder();
        renderer.render(scene, camera);
        state.grahas3d.frameId = window.requestAnimationFrame(animate);
      };
      state.grahas3d.frameId = window.requestAnimationFrame(animate);
    } catch (error) {
      plane.classList.add("is-unavailable");
      console.warn("Three.js grahas failed to initialize.", error);
    }
  }

  function updateGrahaRenderOrder() {
    var camera = state.grahas3d.camera;
    var THREE = state.grahas3d.THREE;
    if (!camera || !THREE || state.grahas3d.meshes.size === 0) return;
    var entries = [];
    var worldPos = new THREE.Vector3();
    var camPos = new THREE.Vector3();

    state.grahas3d.meshes.forEach(function (entry, key) {
      entry.group.getWorldPosition(worldPos);
      camPos.copy(worldPos);
      camera.worldToLocal(camPos);
      var depth = -camPos.z;
      entries.push({ key: key, entry: entry, depth: depth });
    });

    entries.sort(function (a, b) {
      if (Math.abs(a.depth - b.depth) < 0.1) {
        return (GRAHA_VISUAL_STACK_ORDER[a.key] || 50) - (GRAHA_VISUAL_STACK_ORDER[b.key] || 50);
      }
      return a.depth - b.depth;
    });
    entries.forEach(function (item, index) {
      item.entry.mesh.renderOrder = index;
      if (item.entry.ring) item.entry.ring.renderOrder = index + 0.5;
    });
  }

  function updateGraha3D() {
    const root = state.grahas3d.root;
    const scene = state.grahas3d.scene;
    const THREE = state.grahas3d.THREE;
    if (!root || !scene || !THREE) return;
    const activeKeys = new Set(state.grahas.map((graha) => graha.key));
    state.grahas3d.meshes.forEach((entry, key) => {
      if (!activeKeys.has(key)) {
        root.remove(entry.group);
        state.grahas3d.meshes.delete(key);
      }
    });

    state.grahas.forEach((graha) => {
      let entry = state.grahas3d.meshes.get(graha.key);
      const retrograde = isGrahaRetrograde(graha);
      if (!entry) {
        const radius = grahaRadius(graha.key);
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), makeGrahaMaterial(THREE, graha.key));
        mesh.rotation.set(0.18, -0.36, 0);
        mesh.frustumCulled = false;
        mesh.renderOrder = GRAHA_VISUAL_STACK_ORDER[graha.key] || 50;
        group.add(mesh);

        let ring = null;
        if (graha.key === "saturn") {
          ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 1.25, radius * 1.6, 80),
            new THREE.MeshBasicMaterial({
              map: state.grahas3d.textures.get("saturnRing"),
              color: 0xd8dff0,
              transparent: true,
              opacity: 0.2,
              side: THREE.DoubleSide,
              depthWrite: false
            })
          );
          ring.renderOrder = (GRAHA_VISUAL_STACK_ORDER[graha.key] || 50) + 0.5;
          ring.rotation.set(1.18, 0.12, -0.36);
          group.add(ring);
        }
        const label = createGrahaLabelSprite(THREE, GRAHA_STYLES[graha.key]?.label || "", retrograde);
        label.position.set(radius + 24, radius * 0.52, 18);
        group.add(label);

        root.add(group);
        entry = {
          group,
          mesh,
          ring,
          label,
          retrograde,
          spin: {
            sun: 0.18,
            moon: 0.075,
            mars: 0.095,
            mercury: 0.14,
            jupiter: 0.065,
            venus: 0.055,
            saturn: 0.05,
            rahu: 0.035,
            ketu: -0.035
          }[graha.key] || 0.07
        };
        state.grahas3d.meshes.set(graha.key, entry);
      } else if (entry.retrograde !== retrograde) {
        entry.group.remove(entry.label);
        entry.label.material.map.dispose();
        entry.label.material.dispose();
        const radius = grahaRadius(graha.key);
        entry.label = createGrahaLabelSprite(THREE, GRAHA_STYLES[graha.key]?.label || "", retrograde);
        entry.label.position.set(radius + 24, radius * 0.52, 18);
        entry.group.add(entry.label);
        entry.retrograde = retrograde;
      }
      const position = polarToCartesian(500, 500, GRAHA_VISUAL_RADIUS, longitudeToAngle(graha.longitude));
      const zLayer = 40 - (GRAHA_VISUAL_STACK_ORDER[graha.key] || 50) * 0.25;
      entry.group.position.set(position.x - 500, 500 - position.y, zLayer);
    });

    var dataCount = state.grahas.length;
    var visibleWebglCount = 0;
    state.grahas3d.meshes.forEach(function (entry) {
      if (entry.group.visible && entry.mesh && entry.mesh.visible) visibleWebglCount += 1;
    });
    var viewportEl = document.querySelector(".sky-clock-viewport");
    if (viewportEl) {
      if (visibleWebglCount >= dataCount && dataCount > 0) {
        viewportEl.classList.add("has-graha-webgl");
      } else {
        viewportEl.classList.remove("has-graha-webgl");
      }
    }
    window.__skyClockGrahaDebug = {
      dataCount: dataCount,
      webglEntriesCount: state.grahas3d.meshes.size,
      visibleWebglCount: visibleWebglCount,
      svgFallbackHidden: viewportEl ? viewportEl.classList.contains("has-graha-webgl") : false,
      lastUpdateAt: new Date().toISOString()
    };
  }


  function ensureEarthDefs(svg) {
    const defs = createSvgElement("defs", { "data-nabhasa-earth-defs": "" });
    defs.innerHTML = `
      <radialGradient id="nabhasa-earth-ocean" cx="38%" cy="34%" r="68%">
        <stop offset="0%" stop-color="#5ecdf6"/>
        <stop offset="42%" stop-color="#0d5f94"/>
        <stop offset="78%" stop-color="#052643"/>
        <stop offset="100%" stop-color="#020814"/>
      </radialGradient>

      <radialGradient id="nabhasa-earth-terminator" cx="72%" cy="30%" r="82%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="58%" stop-color="#000000" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>
      </radialGradient>

      <radialGradient id="nabhasa-earth-highlight" cx="33%" cy="27%" r="48%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
        <stop offset="52%" stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>

      <filter id="nabhasa-earth-glow" x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="5" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <clipPath id="nabhasa-earth-clip">
        <circle cx="0" cy="0" r="142"/>
      </clipPath>

      <g id="nabhasa-earth-core">
        <circle cx="0" cy="0" r="144" fill="rgba(102, 210, 255, 0.14)" filter="url(#nabhasa-earth-glow)"/>
        <circle cx="0" cy="0" r="142" fill="url(#nabhasa-earth-ocean)"/>

        <image x="-174" y="-174" width="348" height="348"
            href="/assets/img/earth/earth-globe.jpg"
            clip-path="url(#nabhasa-earth-clip)"
            preserveAspectRatio="xMidYMid slice"/>

        <g class="nabhasa-earth-clouds" clip-path="url(#nabhasa-earth-clip)">
          <ellipse cx="-54" cy="-44" rx="42" ry="10" fill="#ffffff" opacity="0.13"/>
          <ellipse cx="42" cy="-62" rx="36" ry="9" fill="#ffffff" opacity="0.11"/>
          <ellipse cx="-20" cy="42" rx="58" ry="11" fill="#ffffff" opacity="0.1"/>
          <ellipse cx="56" cy="46" rx="36" ry="9" fill="#ffffff" opacity="0.12"/>
        </g>

        <circle cx="0" cy="0" r="142" fill="url(#nabhasa-earth-highlight)"/>
        <circle cx="0" cy="0" r="142" fill="url(#nabhasa-earth-terminator)" opacity="0.34"/>
        <circle cx="0" cy="0" r="142" fill="none" stroke="rgba(198, 235, 255, 0.38)" stroke-width="1.4"/>
      </g>
    `;
    svg.appendChild(defs);
  }

  function renderCenterEarth(plane) {
    const earthGroup = createSvgElement("g", {
      class: "nabhasa-earth-core-layer",
      transform: "translate(500 500)"
    });
    earthGroup.style.pointerEvents = "none";

    earthGroup.appendChild(createSvgElement("use", {
      href: "#nabhasa-earth-core"
    }));

    plane.appendChild(earthGroup);
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


  function createSunRays(radius = 20, color = "#ffc75a") {
    const raysGroup = createSvgElement("g", {
      class: "sky-sun-rays",
      "aria-hidden": "true",
      fill: "none",
      stroke: color,
      "stroke-width": 0.82,
      "stroke-linecap": "round",
      opacity: 0.36
    });

    const rayCount = 27;
    const inner = radius + 3;

    for (let index = 0; index < rayCount; index += 1) {
      const angle = ((index * 360) / rayCount - 90) * Math.PI / 180;
      const outer = radius + (index % 3 === 0 ? 13 : index % 3 === 1 ? 9 : 6);

      raysGroup.appendChild(createSvgElement("line", {
        x1: inner * Math.cos(angle),
        y1: inner * Math.sin(angle),
        x2: outer * Math.cos(angle),
        y2: outer * Math.sin(angle)
      }));
    }

    return raysGroup;
  }


  function getMoonPhaseVisualInfo(sunLongitude, moonLongitude) {
    var sun = Number(sunLongitude);
    var moon = Number(moonLongitude);

    if (!Number.isFinite(sun)) sun = 0;
    if (!Number.isFinite(moon)) moon = 0;

    var elongation = ((moon - sun + 360) % 360 + 360) % 360;
    var illumination = (1 - Math.cos(elongation * Math.PI / 180)) / 2;
    var waxing = elongation < 180;
    var radius = 20;
    var shadowShift = (1 - Math.cos(elongation * Math.PI / 180)) * radius;

    return {
      elongation: elongation,
      illumination: illumination,
      waxing: waxing,
      shadowShift: shadowShift
    };
  }

  function appendMoonPhaseVisual(group, graha, sunLongitude, clipId) {
    var phase = getMoonPhaseVisualInfo(sunLongitude, graha.longitude);
    var radius = 20;

    group.appendChild(createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: radius,
      fill: "#070a10",
      class: "sky-moon-base"
    }));

    group.appendChild(createSvgElement("image", {
      x: -radius,
      y: -radius,
      width: radius * 2,
      height: radius * 2,
      href: "/assets/img/moon/moon-texture.svg",
      preserveAspectRatio: "xMidYMid slice",
      "clip-path": `url(#${clipId})`,
      class: "sky-moon-image"
    }));

    var shadowOffset = (1 - phase.illumination) * radius * 1.75;

    group.appendChild(createSvgElement("circle", {
      cx: phase.waxing ? -shadowOffset : shadowOffset,
      cy: 0,
      r: radius,
      fill: "#03050a",
      opacity: 0.84,
      "clip-path": `url(#${clipId})`,
      class: "sky-moon-phase-shadow"
    }));

    group.appendChild(createSvgElement("ellipse", {
      cx: -5,
      cy: -7,
      rx: 6,
      ry: 4,
      fill: "#ffffff",
      opacity: 0.12,
      class: "sky-moon-shine"
    }));

    group.appendChild(createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: radius,
      fill: "none",
      stroke: "#e7edf5",
      "stroke-opacity": 0.52,
      "stroke-width": 0.9,
      class: "sky-moon-rim"
    }));
  }

  function renderGrahas(svg, grahas) {
    const cx = 500;
    const cy = 500;
    const sunGraha = grahas.find(function (item) { return item.key === "sun"; });
    const sunLongitude = sunGraha ? sunGraha.longitude : 0;
    const sorted = [...grahas].sort(function (a, b) { return (GRAHA_VISUAL_STACK_ORDER[a.key] || 50) - (GRAHA_VISUAL_STACK_ORDER[b.key] || 50); });
    sorted.forEach((graha) => {
      const style = GRAHA_STYLES[graha.key] || GRAHA_STYLES.sun;
      const position = polarToCartesian(cx, cy, GRAHA_VISUAL_RADIUS, longitudeToAngle(graha.longitude));
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

      if (graha.key === "sun") {
        group.appendChild(createSunRays(20, style.accent || style.color));
      }

      if (graha.key === "moon") {
        appendMoonPhaseVisual(group, graha, sunLongitude, clipId);
      } else {
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
      }
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
        x: 27,
        y: -17,
        class: `sky-graha-label${style.light ? " is-light" : ""}`
      });
      text.textContent = style.label;
      group.appendChild(text);
      if (isGrahaRetrograde(graha)) {
        const retrograde = createSvgElement("text", {
          x: 45,
          y: -17,
          class: "sky-graha-retro"
        });
        retrograde.textContent = "R";
        group.appendChild(retrograde);
      }
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
    ensureEarthDefs(svg);
    const title = createSvgElement("title", { id: "sky-svg-title" });
    const description = createSvgElement("desc", { id: "sky-svg-description" });
    const plane = createSvgElement("g", {
      "data-sky-plane": "",
      transform: `rotate(${ZODIAC_VISUAL_OFFSET_DEG} 500 500)`
    });
    title.textContent = "Nabhasa — Vedic Sky Clock";
    description.textContent = "Положение грах по сидерической долготе в знаках, накшатрах и падах.";
    renderStaticGeometry(plane);
    renderCenterEarth(plane);
    renderHighlights(plane, state.grahas);
    renderGrahas(plane, state.grahas);
    svg.append(title, description, plane);
    // updateGraha3D(); // disabled: Nabhasa is SVG-only
    updateGrahaRenderOrder();
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


  function getMoonPhaseNameByElongation(elongation) {
    if (elongation < 10 || elongation > 350) return "Новолуние";
    if (elongation < 80) return "Растущий серп";
    if (elongation < 100) return "Первая четверть";
    if (elongation < 170) return "Растущая Луна";
    if (elongation < 190) return "Полнолуние";
    if (elongation < 260) return "Убывающая Луна";
    if (elongation < 280) return "Последняя четверть";
    return "Убывающий серп";
  }

  function getMoonPhaseInfo(sunLongitude, moonLongitude) {
    const sun = Number(sunLongitude);
    const moon = Number(moonLongitude);

    if (!Number.isFinite(sun) || !Number.isFinite(moon)) {
      return null;
    }

    const elongation = ((moon - sun + 360) % 360 + 360) % 360;
    const radians = elongation * Math.PI / 180;
    const illumination = (1 - Math.cos(radians)) / 2;

    return {
      elongation,
      illumination,
      waxing: elongation < 180,
      phaseName: getMoonPhaseNameByElongation(elongation),
      percent: Math.round(illumination * 100)
    };
  }

  function formatMoonPhaseCell(graha, sunLongitude) {
    if (!graha || graha.key !== "moon") return "—";

    const phase = getMoonPhaseInfo(sunLongitude, graha.longitude);
    if (!phase) return "—";

    return phase.phaseName + ", " + phase.percent + "%";
  }


  function getNabhasaMoonPhaseName(elongation) {
    if (elongation < 10 || elongation > 350) return "Новолуние";
    if (elongation < 80) return "Растущий серп";
    if (elongation < 100) return "Первая четверть";
    if (elongation < 170) return "Растущая Луна";
    if (elongation < 190) return "Полнолуние";
    if (elongation < 260) return "Убывающая Луна";
    if (elongation < 280) return "Последняя четверть";
    return "Убывающий серп";
  }

  function getNabhasaMoonPhaseInfo(sunLongitude, moonLongitude) {
    const sun = Number(sunLongitude);
    const moon = Number(moonLongitude);

    if (!Number.isFinite(sun) || !Number.isFinite(moon)) {
      return null;
    }

    const elongation = ((moon - sun + 360) % 360 + 360) % 360;
    const radians = elongation * Math.PI / 180;
    const illumination = (1 - Math.cos(radians)) / 2;

    return {
      elongation,
      illumination,
      waxing: elongation < 180,
      phaseName: getNabhasaMoonPhaseName(elongation),
      percent: Math.round(illumination * 100)
    };
  }

  function formatNabhasaMoonPhase(graha, sunLongitude) {
    if (!graha || graha.key !== "moon") return "";

    const phase = getNabhasaMoonPhaseInfo(sunLongitude, graha.longitude);
    if (!phase) return "";

    return phase.phaseName + ", " + phase.percent + "%";
  }


  function getNabhasaMoonLunarDay(sunLongitude, moonLongitude) {
    const sun = Number(sunLongitude);
    const moon = Number(moonLongitude);

    if (!Number.isFinite(sun) || !Number.isFinite(moon)) {
      return null;
    }

    const elongation = ((moon - sun + 360) % 360 + 360) % 360;
    return Math.floor(elongation / 12) + 1;
  }

  function formatNabhasaGrahaNameCell(graha, sunLongitude) {
    const name = getGrahaDisplayName(graha);

    if (!graha || graha.key !== "moon") {
      return name;
    }

    const lunarDay = getNabhasaMoonLunarDay(sunLongitude, graha.longitude);

    if (!lunarDay) {
      return name;
    }

    return name + " (" + lunarDay + " л.с.)";
  }

  function renderGrahaTable() {
    var table = document.querySelector("[data-sky-graha-table]");
    if (!table) return;

    var sunGraha = state.grahas.find(function (item) { return item.key === "sun"; });
    var sunLongitude = sunGraha ? sunGraha.longitude : null;

    var rows = state.grahas.map(function (graha) {
      var signName = SIGN_NAMES[graha.signIndex] || "—";
      var nakName = NAKSHATRA_NAMES[graha.nakshatraIndex] || ("Накшатра " + graha.nakshatraNumber);
      var pada = graha.padaInNakshatra;

      return "<tr>" +
        "<td>" + formatNabhasaGrahaNameCell(graha, sunLongitude) + "</td>" +
        "<td>" + signName + "</td>" +
        "<td>" + Number(graha.degreeInSign).toFixed(2) + "°" + "</td>" +
        "<td>" + nakName + " " + graha.nakshatraNumber + "</td>" +
        "<td>" + pada + "</td>" +
        "<td>" + Number(graha.longitude).toFixed(2) + "°" + "</td>" +
        "</tr>";
    }).join("");

    table.querySelector("tbody").innerHTML = rows || "<tr><td colspan='6'>Загрузка…</td></tr>";
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
      ${isGrahaRetrograde(graha) ? "<p>Ретроградный</p>" : ""}
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
    renderGrahaTable();
    runInitialSettleMotion();
    if (previousKey) {
      renderTooltip(state.grahas.find((graha) => graha.key === state.activeKey));
    }
    setStatus("");
  }

  function startLiveMode(form) {
    state.liveMode = true;
    window.clearInterval(state.liveTimer);
    updateClock(form, { live: true }).catch((error) => setStatus(error.message || "Не удалось загрузить Nabhasa.", true));
    state.liveTimer = window.setInterval(() => {
      if (!state.liveMode) return;
      updateClock(form, { live: true }).catch((error) => setStatus(error.message || "Не удалось обновить Nabhasa.", true));
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
    const grahaPlane = document.querySelector(".sky-graha-webgl-plane");
    if (!svg && !earthPlane && !grahaPlane) return;
    const transform = `rotateX(${state.view.rotateX}deg) rotateY(${state.view.rotateY}deg) rotateZ(${state.view.rotateZ}deg) scale(${state.view.zoom})`;
    if (svg) svg.style.transform = transform;
    if (earthPlane) earthPlane.style.transform = `scale(${state.view.zoom})`;
    if (grahaPlane) grahaPlane.style.transform = "";
    syncEarthViewOrientation();
    syncGrahaViewOrientation();
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
    const viewport = document.querySelector(".sky-clock-viewport");
    const svg = document.querySelector("[data-sky-svg]");
    const controls = document.querySelector(".sky-view-controls");
    const zoomIn = document.querySelector("[data-sky-zoom-in]");
    const zoomOut = document.querySelector("[data-sky-zoom-out]");
    const reset = document.querySelector("[data-sky-view-reset]");

    if (controls) controls.hidden = false;
    if (!viewport || !svg || !zoomIn || !zoomOut || !reset) return;

    let currentScale = state.view.zoom || 1;
    let panX = state.view.panX || 0;
    let panY = state.view.panY || 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    function getZoomLimits() {
      return window.matchMedia("(max-width: 768px)").matches
        ? { min: 0.9, max: 1.75 }
        : { min: 0.8, max: 2.2 };
    }

    function getMaxPan() {
      const rect = viewport.getBoundingClientRect();
      return {
        x: Math.max(0, rect.width * (currentScale - 1) * 0.58),
        y: Math.max(0, rect.height * (currentScale - 1) * 0.58)
      };
    }

    function clampPan() {
      const maxPan = getMaxPan();
      panX = clamp(panX, -maxPan.x, maxPan.x);
      panY = clamp(panY, -maxPan.y, maxPan.y);
    }

    function applySvgView() {
      const limits = getZoomLimits();
      currentScale = clamp(currentScale, limits.min, limits.max);

      if (currentScale <= 1.01) {
        panX = 0;
        panY = 0;
      } else {
        clampPan();
      }

      state.view.zoom = currentScale;
      state.view.panX = panX;
      state.view.panY = panY;

      svg.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
      svg.style.transformOrigin = "50% 50%";

      viewport.classList.toggle("is-zoomed", currentScale > 1.01);
    }

    zoomIn.addEventListener("click", () => {
      currentScale += 0.1;
      applySvgView();
    });

    zoomOut.addEventListener("click", () => {
      currentScale -= 0.1;
      applySvgView();
    });

    reset.addEventListener("click", () => {
      currentScale = 1;
      panX = 0;
      panY = 0;
      applySvgView();
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || currentScale <= 1.01) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isPanning = true;
      state.view.dragMoved = false;
      startX = event.clientX;
      startY = event.clientY;
      startPanX = panX;
      startPanY = panY;
      viewport.classList.add("is-panning");

      try { viewport.setPointerCapture(event.pointerId); } catch (e) {}
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!isPanning || currentScale <= 1.01) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (Math.hypot(dx, dy) > 4) {
        state.view.dragMoved = true;
      }

      panX = startPanX + dx;
      panY = startPanY + dy;
      applySvgView();

      event.preventDefault();
    });

    function finishPan(event) {
      if (!isPanning) return;
      isPanning = false;
      viewport.classList.remove("is-panning");

      try { viewport.releasePointerCapture(event.pointerId); } catch (e) {}

      window.setTimeout(() => {
        state.view.dragMoved = false;
      }, 0);
    }

    viewport.addEventListener("pointerup", finishPan);
    viewport.addEventListener("pointercancel", finishPan);

    window.addEventListener("resize", applySvgView);

    applySvgView();
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
      updateClock(form, { live: false }).catch((error) => setStatus(error.message || "Не удалось обновить Nabhasa.", true));
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
