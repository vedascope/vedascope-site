const eventsRoot = document.querySelector("[data-events-root]");

const loadVedascopeEvents = async () => {
  if (!eventsRoot) return [];
  try {
    const response = await fetch("data/events.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Events data request failed");
    return await response.json();
  } catch (error) {
    return Array.isArray(window.VEDASCOPE_EVENTS) ? window.VEDASCOPE_EVENTS : [];
  }
};

const initVedascopeEvents = async () => {
  const vedascopeEvents = await loadVedascopeEvents();
  if (!eventsRoot || !Array.isArray(vedascopeEvents) || !vedascopeEvents.length) return;
  const eventBackgrounds = Array.isArray(window.VEDASCOPE_EVENT_BACKGROUNDS)
    ? window.VEDASCOPE_EVENT_BACKGROUNDS
    : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parseLocalDate = (value) => new Date(`${value}T00:00:00`);
  const formatEventTitle = (title) =>
    title.replace(/^(\S*\d\S*)\s+(\S+)/, (_, ordinal, nextWord) =>
      `<span class="event-title-opening">${ordinal.replaceAll("-", "‑")}&nbsp;${nextWord}</span>`
    );
  const monthNames = [
    "Янв",
    "Фев",
    "Мар",
    "Апр",
    "Май",
    "Июн",
    "Июл",
    "Авг",
    "Сен",
    "Окт",
    "Ноя",
    "Дек",
  ];
  const monthFullNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  const filterDefinitions = [
    { id: "all", label: "Все", title: "Все события 2026", matches: () => true },
    {
      id: "conference",
      label: "Конференции",
      title: "Конференции 2026",
      matches: (item) => item.tags.includes("conference"),
    },
    { id: "seminar", label: "Семинары", title: "Семинары 2026", matches: (item) => item.tags.includes("seminar") },
    { id: "practice", label: "Практики", title: "Практики 2026", matches: (item) => item.tags.includes("practice") },
    { id: "retreat", label: "Ретриты", title: "Ретриты 2026", matches: (item) => item.tags.includes("retreat") },
    { id: "tour", label: "Туры", title: "Туры 2026", matches: (item) => item.tags.includes("tour") },
    {
      id: "online",
      label: "Онлайн",
      title: "Онлайн-события 2026",
      matches: (item) => item.tags.includes("online"),
    },
    {
      id: "offline",
      label: "Офлайн",
      title: "Офлайн-события 2026",
      matches: (item) => item.tags.includes("offline"),
    },
  ];

  const orderedEvents = [...vedascopeEvents].sort(
    (first, second) => parseLocalDate(first.startDate) - parseLocalDate(second.startDate)
  );
  const getFeaturedEvent = (events) => {
    const upcomingEvents = events
      .filter((item) => parseLocalDate(item.endDate) >= today)
      .sort((first, second) => parseLocalDate(first.startDate) - parseLocalDate(second.startDate));

    return (
      upcomingEvents[0] ||
      [...events].sort(
        (first, second) => parseLocalDate(second.endDate) - parseLocalDate(first.endDate)
      )[0] ||
      null
    );
  };

  const featuredEvent = getFeaturedEvent(orderedEvents);
  const getEventBackground = (event) => {
    if (!eventBackgrounds.length) return "";
    const eventIndex = vedascopeEvents.findIndex((item) => item.id === event.id);
    return eventBackgrounds[(eventIndex < 0 ? 0 : eventIndex) % eventBackgrounds.length];
  };
  let selectedMonth = featuredEvent ? parseLocalDate(featuredEvent.startDate).getMonth() : today.getMonth();
  let activeMode = "all";
  let selectedFilter = "all";

  const eventsByRelevance = [
    ...orderedEvents.filter((item) => parseLocalDate(item.endDate) >= today),
    ...orderedEvents
      .filter((item) => parseLocalDate(item.endDate) < today)
      .sort((first, second) => parseLocalDate(second.endDate) - parseLocalDate(first.endDate)),
  ];

  const featuredMarkup = featuredEvent
    ? `
      <article class="events-featured events-featured--${featuredEvent.type}${featuredEvent.guest ? "" : " events-featured--single"}" aria-labelledby="featured-event-title">
        <div class="events-featured-background" aria-hidden="true">
          <span class="events-featured-background-layer is-active" style="background-image: url('${getEventBackground(featuredEvent)}')"></span>
          <span class="events-featured-background-layer"></span>
        </div>
        <div class="events-featured-main">
          <span class="event-tag event-tag--${featuredEvent.type}">${featuredEvent.typeLabel}</span>
          <p class="events-featured-meta">${featuredEvent.dateLabel} · ${featuredEvent.location}</p>
          <h3 id="featured-event-title">${formatEventTitle(featuredEvent.title)}</h3>
          <p class="events-featured-description">${featuredEvent.description}</p>
          <div class="events-actions">
            ${featuredEvent.links?.details ? `<a class="button button-primary" href="${featuredEvent.links.details}">Подробнее</a>` : ""}
            <a class="button events-calendar-button" href="${featuredEvent.calendarFile}" download>Добавить в календарь</a>
          </div>
        </div>
        ${
          featuredEvent.guest
            ? `<aside class="events-guest">
                <span class="card-kicker">специальный гость</span>
                <p class="events-guest-name">${featuredEvent.guest}</p>
                <p>${featuredEvent.guestMeta}</p>
                ${featuredEvent.links?.contact ? `<a href="${featuredEvent.links.contact}">${featuredEvent.contactLabel || "Связаться"}</a>` : ""}
              </aside>`
            : ""
        }
      </article>`
    : `<div class="events-featured-empty" role="status">Скоро появятся новые события.</div>`;

  eventsRoot.innerHTML = `
    ${featuredMarkup}

    <section class="events-year" aria-labelledby="events-year-title">
      <div class="events-year-heading">
        <p class="eyebrow">год наблюдений</p>
        <h3 id="events-year-title">События 2026</h3>
        <p>События, практики и встречи сообщества vedascope.</p>
      </div>
      <div class="events-timeline-carousel">
        <button class="events-timeline-arrow events-timeline-arrow--previous" type="button" data-months-previous aria-label="Прокрутить месяцы назад">←</button>
        <div class="events-timeline-scroll" data-months-scroll tabindex="0" aria-label="Календарь мероприятий на 2026 год">
          <div class="events-timeline" data-events-months></div>
        </div>
        <button class="events-timeline-arrow events-timeline-arrow--next" type="button" data-months-next aria-label="Прокрутить месяцы вперёд">→</button>
      </div>
      <div class="events-filters" data-events-filters aria-label="Фильтры мероприятий"></div>
      <section class="events-browser" aria-labelledby="events-browser-title">
        <div class="events-browser-heading">
          <div>
            <p class="eyebrow" data-events-list-kicker>месяц</p>
            <h3 id="events-browser-title" data-events-list-title></h3>
          </div>
          <div class="events-revolver-controls" data-events-controls>
            <button type="button" data-events-previous aria-label="Предыдущее событие">←</button>
            <button type="button" data-events-next aria-label="Следующее событие">→</button>
          </div>
        </div>
        <div class="events-revolver" data-events-revolver tabindex="0" aria-live="polite"></div>
        <p class="events-empty" data-events-empty aria-live="polite" hidden>В этом месяце пока нет событий.</p>
      </section>
    </section>`;

  const monthsContainer = eventsRoot.querySelector("[data-events-months]");
  const featuredBackgroundLayers = [...eventsRoot.querySelectorAll(".events-featured-background-layer")];
  const monthsScroll = eventsRoot.querySelector("[data-months-scroll]");
  const monthsPreviousButton = eventsRoot.querySelector("[data-months-previous]");
  const monthsNextButton = eventsRoot.querySelector("[data-months-next]");
  const filtersContainer = eventsRoot.querySelector("[data-events-filters]");
  const revolver = eventsRoot.querySelector("[data-events-revolver]");
  const emptyState = eventsRoot.querySelector("[data-events-empty]");
  const listKicker = eventsRoot.querySelector("[data-events-list-kicker]");
  const listTitle = eventsRoot.querySelector("[data-events-list-title]");
  const previousButton = eventsRoot.querySelector("[data-events-previous]");
  const nextButton = eventsRoot.querySelector("[data-events-next]");

  const getMonthEvents = (month) =>
    orderedEvents.filter((item) => parseLocalDate(item.startDate).getMonth() === month);

  let activeFeaturedBackgroundLayer = 0;
  let backgroundChangeToken = 0;

  const setFeaturedBackground = (event) => {
    if (featuredBackgroundLayers.length < 2) return;
    const background = getEventBackground(event);
    const currentLayer = featuredBackgroundLayers[activeFeaturedBackgroundLayer];
    if (!background || currentLayer.dataset.background === background) return;

    const changeToken = ++backgroundChangeToken;
    const nextLayerIndex = activeFeaturedBackgroundLayer === 0 ? 1 : 0;
    const nextLayer = featuredBackgroundLayers[nextLayerIndex];
    const image = new Image();

    image.addEventListener("load", () => {
      if (changeToken !== backgroundChangeToken) return;
      nextLayer.style.backgroundImage = `url('${background}')`;
      nextLayer.dataset.background = background;
      nextLayer.classList.add("is-active");
      currentLayer.classList.remove("is-active");
      activeFeaturedBackgroundLayer = nextLayerIndex;
    });
    image.src = background;
  };

  if (featuredEvent && featuredBackgroundLayers[0]) {
    featuredBackgroundLayers[0].dataset.background = getEventBackground(featuredEvent);
  }

  const renderMonths = () => {
    monthsContainer.innerHTML = monthNames
      .map((label, month) => {
        const eventCount = getMonthEvents(month).length;
        const isActive = activeMode === "month" && month === selectedMonth;
        const isContext = activeMode !== "month" && month === selectedMonth;
        const eventCountLabel =
          eventCount === 1 ? "1 событие" : eventCount > 1 && eventCount < 5 ? `${eventCount} события` : `${eventCount} событий`;

        return `
          <button
            class="events-month${eventCount ? " has-events" : ""}${isActive ? " is-active" : ""}${isContext ? " is-context" : ""}"
            type="button"
            data-event-month="${month}"
            aria-pressed="${isActive}"
          >
            <span class="events-month-name">${label}</span>
            <span class="events-month-count">${eventCount ? eventCountLabel : "нет событий"}</span>
            <span class="events-month-marker" aria-hidden="true">${eventCount > 1 ? eventCount : ""}</span>
          </button>`;
      })
      .join("");
  };

  const renderFilters = () => {
    filtersContainer.innerHTML = filterDefinitions
      .map((filter) => {
        const count = orderedEvents.filter(filter.matches).length;
        return `
          <button
            class="events-filter${(activeMode === "all" && filter.id === "all") || (activeMode === "tag" && selectedFilter === filter.id) ? " is-active" : ""}"
            type="button"
            data-event-filter="${filter.id}"
            aria-pressed="${(activeMode === "all" && filter.id === "all") || (activeMode === "tag" && selectedFilter === filter.id)}"
          >${filter.label} <span>(${count})</span></button>`;
      })
      .join("");
  };

  const renderEvents = () => {
    const activeFilter = filterDefinitions.find((filter) => filter.id === selectedFilter);
    let visibleEvents;

    if (activeMode === "month") {
      visibleEvents = getMonthEvents(selectedMonth);
      listKicker.textContent = "месяц";
      listTitle.textContent = `${monthFullNames[selectedMonth]} 2026`;
      emptyState.textContent = "В этом месяце пока нет событий.";
    } else if (activeMode === "tag") {
      visibleEvents = orderedEvents.filter(activeFilter.matches);
      listKicker.textContent = "фильтр";
      listTitle.textContent = activeFilter.title;
      emptyState.textContent = "В 2026 году пока нет событий с этим тегом.";
    } else {
      visibleEvents = eventsByRelevance;
      listKicker.textContent = "календарь";
      listTitle.textContent = "Все события 2026";
      emptyState.textContent = "В 2026 году пока нет событий.";
    }

    emptyState.hidden = visibleEvents.length > 0;
    revolver.hidden = visibleEvents.length === 0;
    previousButton.disabled = visibleEvents.length < 2;
    nextButton.disabled = visibleEvents.length < 2;

    revolver.innerHTML = visibleEvents
      .map(
        (item) => `
          <article class="events-revolver-card events-revolver-card--${item.type}" data-event-id="${item.id}" tabindex="0">
            <div class="events-revolver-tags">
              <span class="event-tag event-tag--${item.type}">${item.typeLabel}</span>
              <span class="event-tag event-tag--${item.format}">${item.formatLabel}</span>
            </div>
            <p class="events-revolver-date">${item.dateLabel}</p>
            <p class="events-revolver-meta">${item.contextLabel || item.location}</p>
            <h4>${formatEventTitle(item.title)}</h4>
            <p class="events-revolver-description">${item.description}</p>
            ${item.guest ? `<p class="events-revolver-guest">${item.guest}<span>${item.guestMeta}</span></p>` : ""}
            ${item.venue ? `<p class="events-revolver-venue">${item.venue}</p>` : ""}
            <div class="events-revolver-actions">
              <a class="button events-details-button" href="${item.links?.details || item.links?.contact || "#community"}">${item.detailsLabel || (item.links?.contact && !item.links?.details ? "Задать вопрос" : "Подробнее")}</a>
              <a class="button events-add-button" href="${item.calendarFile}" download>Добавить в календарь</a>
            </div>
          </article>`
      )
      .join("");

    if (visibleEvents[0]) setFeaturedBackground(visibleEvents[0]);
  };

  const scrollActiveMonthIntoView = () => {
    const activeMonth = monthsContainer.querySelector(".events-month.is-active, .events-month.is-context");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeMonth?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const updateMonthScrollControls = () => {
    const maxScrollLeft = monthsScroll.scrollWidth - monthsScroll.clientWidth;
    monthsPreviousButton.disabled = monthsScroll.scrollLeft <= 2;
    monthsNextButton.disabled = monthsScroll.scrollLeft >= maxScrollLeft - 2;
  };

  const scrollMonths = (direction) => {
    monthsScroll.scrollBy({
      left: direction * Math.max(monthsScroll.clientWidth * 0.72, 280),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const updateEventsInterface = ({ scrollMonth = false } = {}) => {
    renderMonths();
    renderFilters();
    renderEvents();
    window.requestAnimationFrame(() => {
      if (scrollMonth) scrollActiveMonthIntoView();
      updateMonthScrollControls();
    });
  };

  monthsContainer.addEventListener("click", (event) => {
    const monthButton = event.target.closest("[data-event-month]");
    if (!monthButton) return;
    selectedMonth = Number(monthButton.dataset.eventMonth);
    activeMode = "month";
    selectedFilter = null;
    updateEventsInterface({ scrollMonth: true });
  });

  filtersContainer.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-event-filter]");
    if (!filterButton) return;
    selectedFilter = filterButton.dataset.eventFilter;
    activeMode = selectedFilter === "all" ? "all" : "tag";
    updateEventsInterface();
  });

  const activateEventCard = (eventCard) => {
    const selectedEvent = orderedEvents.find((item) => item.id === eventCard?.dataset.eventId);
    if (!selectedEvent) return;
    selectedMonth = parseLocalDate(selectedEvent.startDate).getMonth();
    setFeaturedBackground(selectedEvent);
    renderMonths();
    window.requestAnimationFrame(scrollActiveMonthIntoView);
  };

  revolver.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    activateEventCard(event.target.closest("[data-event-id]"));
  });

  revolver.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const eventCard = event.target.closest("[data-event-id]");
    if (!eventCard) return;
    event.preventDefault();
    activateEventCard(eventCard);
  });

  const scrollRevolver = (direction) => {
    revolver.scrollBy({ left: direction * revolver.clientWidth * 0.82, behavior: "smooth" });
  };

  let revolverScrollTimeout;
  const syncBackgroundToVisibleEvent = () => {
    window.clearTimeout(revolverScrollTimeout);
    revolverScrollTimeout = window.setTimeout(() => {
      const cards = [...revolver.querySelectorAll("[data-event-id]")];
      const nearestCard = cards.reduce((nearest, card) =>
        Math.abs(card.offsetLeft - revolver.scrollLeft) < Math.abs(nearest.offsetLeft - revolver.scrollLeft)
          ? card
          : nearest
      , cards[0]);
      const visibleEvent = orderedEvents.find((item) => item.id === nearestCard?.dataset.eventId);
      if (visibleEvent) setFeaturedBackground(visibleEvent);
    }, 120);
  };

  previousButton.addEventListener("click", () => scrollRevolver(-1));
  nextButton.addEventListener("click", () => scrollRevolver(1));
  revolver.addEventListener("scroll", syncBackgroundToVisibleEvent, { passive: true });
  monthsPreviousButton.addEventListener("click", () => scrollMonths(-1));
  monthsNextButton.addEventListener("click", () => scrollMonths(1));
  monthsScroll.addEventListener("scroll", updateMonthScrollControls, { passive: true });
  window.addEventListener("resize", updateMonthScrollControls);

  updateEventsInterface({ scrollMonth: true });
};

initVedascopeEvents();

const sutraToggle = document.querySelector("[data-sutra-toggle]");
const sutraMeaning = document.querySelector("[data-sutra-meaning]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let sutraCloseTimer;

if (sutraToggle && sutraMeaning) {
  sutraToggle.addEventListener("click", () => {
    const isOpen = sutraToggle.getAttribute("aria-expanded") === "true";

    sutraToggle.setAttribute("aria-expanded", String(!isOpen));
    sutraToggle.textContent = isOpen ? "Развернуть смысл" : "Свернуть смысл";

    if (isOpen) {
      sutraMeaning.classList.remove("is-visible");

      if (reducedMotion.matches) {
        sutraMeaning.hidden = true;
      } else {
        sutraCloseTimer = window.setTimeout(() => {
          sutraMeaning.hidden = true;
        }, 600);
      }
    } else {
      window.clearTimeout(sutraCloseTimer);
      sutraMeaning.hidden = false;

      if (reducedMotion.matches) {
        sutraMeaning.classList.add("is-visible");
      } else {
        window.requestAnimationFrame(() => {
          sutraMeaning.classList.add("is-visible");
        });
      }
    }
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const sectionTargets = document.querySelectorAll(
    "main > .section > .section-shell, .jyotish-intro > .section-shell, .sutra-section > .section-shell"
  );
  const cardGroups = document.querySelectorAll(".card-grid, .timeline-grid, .service-grid, .knowledge-grid");
  const revealTargets = [...sectionTargets];

  cardGroups.forEach((group) => {
    [...group.children].forEach((card, index) => {
      card.style.setProperty("--reveal-delay", `${index * 90}ms`);
      revealTargets.push(card);
    });
  });

  revealTargets.forEach((target) => target.classList.add("scroll-reveal"));
  document.documentElement.classList.add("reveal-ready");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8%",
      threshold: 0.08,
    }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}

const hero = document.querySelector(".hero");
const desktopViewport = window.matchMedia("(min-width: 960px)");
let parallaxFrame = 0;

const updateHeroParallax = () => {
  parallaxFrame = 0;

  if (!hero || !desktopViewport.matches || reducedMotion.matches) {
    hero?.style.removeProperty("--hero-parallax-y");
    return;
  }

  const offset = Math.min(window.scrollY * 0.04, 28);
  hero.style.setProperty("--hero-parallax-y", `${offset}px`);
};

const requestHeroParallax = () => {
  if (parallaxFrame) return;
  parallaxFrame = window.requestAnimationFrame(updateHeroParallax);
};

if (hero) {
  updateHeroParallax();
  window.addEventListener("scroll", requestHeroParallax, { passive: true });
  window.addEventListener("resize", requestHeroParallax);
  reducedMotion.addEventListener("change", requestHeroParallax);
  desktopViewport.addEventListener("change", requestHeroParallax);
}
