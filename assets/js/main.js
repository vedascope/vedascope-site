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
    "main > .section > .section-shell, .sutra-section > .section-shell"
  );
  const cardGroups = document.querySelectorAll(".card-grid, .timeline-grid, .service-grid");
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
